import fs from 'node:fs';
import path from 'node:path';

const SKILL_ROOTS = ['.agents/skills', '.codex/skills'] as const;
const SPOKE_NAMES = ['references', 'scripts', 'assets'] as const;
const TARGET_DESCRIPTION_WORDS = 50;
const LARGE_BODY_BYTES = 12_000;

export type SkillQualityInventory = {
  roots: string[];
  thresholds: {
    targetDescriptionWords: number;
    largeBodyBytes: number;
  };
  summary: {
    qualityGate: 'report-only';
    scannedSkillCount: number;
    descriptionOverTargetCount: number;
    descriptionMissingLoadWhenCount: number;
    nameMismatchCount: number;
    largeBodyWithoutSpokesCount: number;
    importedOrAdaptedCount: number;
    importedOrAdaptedMissingMetadataCount: number;
    reportOnlyWarningCount: number;
  };
  skills: SkillQualityEntry[];
};

export type SkillQualityEntry = {
  root: string;
  directoryName: string;
  relativePath: string;
  skillPath: string;
  name: string;
  description: string;
  descriptionWordCount: number;
  descriptionStartsWithLoadWhen: boolean;
  nameMatchesDirectory: boolean;
  bodyBytes: number;
  bodyWordCount: number;
  isLargeBody: boolean;
  spokes: Record<(typeof SPOKE_NAMES)[number], boolean>;
  hasProgressiveSpokes: boolean;
  largeBodyHasProgressiveSpokes: boolean;
  isImportedOrAdapted: boolean;
  sourceMetadata: {
    frontmatterLicense: boolean;
    frontmatterSource: boolean;
    capabilitySource: string | null;
  };
  warnings: string[];
};

type CapabilityComponent = {
  path?: string;
  source?: string;
};

type ParsedSkill = {
  frontmatter: string;
  body: string;
};

export function buildSkillQualityInventory(rootDir: string): SkillQualityInventory {
  const capabilities = readCapabilities(rootDir);
  const skills: SkillQualityEntry[] = [];

  for (const root of SKILL_ROOTS) {
    const absoluteRoot = path.join(rootDir, root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }

    const skillDirs = fs
      .readdirSync(absoluteRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((directoryName) => fs.existsSync(path.join(absoluteRoot, directoryName, 'SKILL.md')))
      .sort((a, b) => a.localeCompare(b));

    for (const directoryName of skillDirs) {
      const relativePath = normalizePath(path.join(root, directoryName));
      const skillPath = normalizePath(path.join(relativePath, 'SKILL.md'));
      const contents = fs.readFileSync(path.join(rootDir, skillPath), 'utf8');
      const parsed = splitFrontmatter(contents);
      const name = readFrontmatterScalar(parsed.frontmatter, 'name');
      const description = readFrontmatterScalar(parsed.frontmatter, 'description');
      const descriptionWordCount = countWords(description);
      const descriptionStartsWithLoadWhen = description.startsWith('Load when');
      const spokes = readSpokes(path.join(rootDir, relativePath));
      const capability = capabilities.get(relativePath) || capabilities.get(`skill:${directoryName}`) || null;
      const frontmatterLicense = Boolean(readFrontmatterScalar(parsed.frontmatter, 'license'));
      const frontmatterSource = hasSourceMetadata(parsed.frontmatter);
      const capabilitySource = capability?.source || null;
      const isImportedOrAdapted =
        Boolean(capabilitySource && capabilitySource !== 'local') ||
        frontmatterLicense ||
        frontmatterSource ||
        contents.includes('Codex adaptation');
      const hasProgressiveSpokes = Object.values(spokes).some(Boolean);
      const bodyBytes = Buffer.byteLength(parsed.body, 'utf8');
      const isLargeBody = bodyBytes > LARGE_BODY_BYTES;
      const warnings = buildWarnings({
        description,
        descriptionWordCount,
        descriptionStartsWithLoadWhen,
        nameMatchesDirectory: name === directoryName,
        isLargeBody,
        hasProgressiveSpokes,
        isImportedOrAdapted,
        frontmatterLicense,
        frontmatterSource,
        capabilitySource,
      });

      skills.push({
        root,
        directoryName,
        relativePath,
        skillPath,
        name,
        description,
        descriptionWordCount,
        descriptionStartsWithLoadWhen,
        nameMatchesDirectory: name === directoryName,
        bodyBytes,
        bodyWordCount: countWords(parsed.body),
        isLargeBody,
        spokes,
        hasProgressiveSpokes,
        largeBodyHasProgressiveSpokes: !isLargeBody || hasProgressiveSpokes,
        isImportedOrAdapted,
        sourceMetadata: {
          frontmatterLicense,
          frontmatterSource,
          capabilitySource,
        },
        warnings,
      });
    }
  }

  return {
    roots: [...SKILL_ROOTS],
    thresholds: {
      targetDescriptionWords: TARGET_DESCRIPTION_WORDS,
      largeBodyBytes: LARGE_BODY_BYTES,
    },
    summary: {
      qualityGate: 'report-only',
      scannedSkillCount: skills.length,
      descriptionOverTargetCount: skills.filter(
        (skill) => skill.descriptionWordCount > TARGET_DESCRIPTION_WORDS,
      ).length,
      descriptionMissingLoadWhenCount: skills.filter((skill) => !skill.descriptionStartsWithLoadWhen).length,
      nameMismatchCount: skills.filter((skill) => !skill.nameMatchesDirectory).length,
      largeBodyWithoutSpokesCount: skills.filter((skill) => skill.isLargeBody && !skill.hasProgressiveSpokes)
        .length,
      importedOrAdaptedCount: skills.filter((skill) => skill.isImportedOrAdapted).length,
      importedOrAdaptedMissingMetadataCount: skills.filter((skill) =>
        skill.warnings.some(
          (warning) => warning === 'missing-frontmatter-license' || warning === 'missing-source-metadata',
        ),
      ).length,
      reportOnlyWarningCount: skills.reduce((total, skill) => total + skill.warnings.length, 0),
    },
    skills,
  };
}

function readCapabilities(rootDir: string): Map<string, CapabilityComponent> {
  const indexPath = path.join(rootDir, 'capabilities', 'index.json');
  const capabilities = new Map<string, CapabilityComponent>();

  if (!fs.existsSync(indexPath)) {
    return capabilities;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
    components?: Record<string, CapabilityComponent>;
  };

  for (const [id, component] of Object.entries(index.components || {})) {
    capabilities.set(id, component);
    if (component.path) {
      capabilities.set(normalizePath(component.path), component);
    }
  }

  return capabilities;
}

function splitFrontmatter(contents: string): ParsedSkill {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: '', body: contents };
  }

  return {
    frontmatter: match[1],
    body: contents.slice(match[0].length),
  };
}

function readFrontmatterScalar(frontmatter: string, key: string): string {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return unquote(match?.[1] || '');
}

function hasSourceMetadata(frontmatter: string): boolean {
  return /^source:\s*.+$/m.test(frontmatter) || /^\s+source:\s*.+$/m.test(frontmatter);
}

function readSpokes(skillDir: string): Record<(typeof SPOKE_NAMES)[number], boolean> {
  return Object.fromEntries(
    SPOKE_NAMES.map((spoke) => {
      const spokePath = path.join(skillDir, spoke);
      const hasFiles = fs.existsSync(spokePath) && fs.readdirSync(spokePath).length > 0;
      return [spoke, hasFiles];
    }),
  ) as Record<(typeof SPOKE_NAMES)[number], boolean>;
}

function buildWarnings(input: {
  description: string;
  descriptionWordCount: number;
  descriptionStartsWithLoadWhen: boolean;
  nameMatchesDirectory: boolean;
  isLargeBody: boolean;
  hasProgressiveSpokes: boolean;
  isImportedOrAdapted: boolean;
  frontmatterLicense: boolean;
  frontmatterSource: boolean;
  capabilitySource: string | null;
}): string[] {
  const warnings: string[] = [];

  if (!input.description) {
    warnings.push('missing-description');
  }
  if (input.descriptionWordCount > TARGET_DESCRIPTION_WORDS) {
    warnings.push('description-over-50-words');
  }
  if (!input.descriptionStartsWithLoadWhen) {
    warnings.push('description-missing-load-when');
  }
  if (!input.nameMatchesDirectory) {
    warnings.push('name-directory-mismatch');
  }
  if (input.isLargeBody && !input.hasProgressiveSpokes) {
    warnings.push('large-body-without-progressive-spokes');
  }
  if (input.isImportedOrAdapted && !input.frontmatterLicense) {
    warnings.push('missing-frontmatter-license');
  }
  if (input.isImportedOrAdapted && !input.frontmatterSource && !input.capabilitySource) {
    warnings.push('missing-source-metadata');
  }

  return warnings;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

if (import.meta.main) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  process.stdout.write(`${JSON.stringify(buildSkillQualityInventory(rootDir), null, 2)}\n`);
}
