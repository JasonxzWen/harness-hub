import fs from 'node:fs';
import type { Dirent } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HUB_ROOT = path.resolve(__dirname, '..');

export type AgentName = 'standard';
export type LifecycleRisk = 'low' | 'medium' | 'high';
export type ReportFormat = 'text' | 'json' | 'html';
export const AGENT_READINESS_CATEGORIES = [
  'context_budget',
  'outcomes',
  'verification',
  'agent_routing',
  'automation_candidates',
  'learning_capture',
] as const;

export type AgentReadinessCategory = typeof AGENT_READINESS_CATEGORIES[number];
export type AgentReadinessState = 'detected' | 'not-detected' | 'risk' | 'candidate' | 'unknown';
export type AgentReadinessSeverity = 'info' | 'warning';
export type AgentReadinessEvidenceKind = 'path' | 'script' | 'signal';
export type AgentReadinessRecommendation = string;

export interface AgentReadinessEvidence {
  kind: AgentReadinessEvidenceKind;
  value: string;
  detail?: string;
}

export interface AgentReadinessFinding {
  id: string;
  category: AgentReadinessCategory;
  state: AgentReadinessState;
  severity: AgentReadinessSeverity;
  reason: string;
  recommendation: AgentReadinessRecommendation;
  evidence: AgentReadinessEvidence[];
}

export interface AgentReadinessReport {
  categories: AgentReadinessCategory[];
  findings: AgentReadinessFinding[];
}

export type HarnessFindingState = 'present' | 'missing' | 'managed' | 'unmanaged' | 'candidate';
export type HarnessPlanAction = 'create' | 'skip' | 'overwrite';

export interface HarnessFinding {
  id: string;
  state: HarnessFindingState;
  severity: 'info' | 'warning';
  reason: string;
  recommendation: string;
  evidence: AgentReadinessEvidence[];
}

export interface HarnessReport {
  componentId: string;
  requiredFiles: string[];
  findings: HarnessFinding[];
}

export interface PathDetectRule {
  path: string;
  agent?: AgentName;
}

export interface CapabilityComponent {
  kind: 'skill' | 'config' | 'script' | 'rule' | 'hook' | 'mcp' | string;
  path: string;
  dest?: string;
  version: string;
  source: string;
  provides: string[];
  detects: PathDetectRule[];
  agents: AgentName[];
  risk: LifecycleRisk;
  recommendation: string;
  overlapsWith?: string[];
  routing?: string;
}

export interface CapabilityIndex {
  version: string;
  generatedAt: string;
  components: Record<string, CapabilityComponent>;
}

interface ManagedComponentRename {
  to: string;
  reason: string;
}

export interface RepoSignals {
  packageJson: boolean;
  tsconfig: boolean;
  pyproject: boolean;
  cargo: boolean;
  goMod: boolean;
  skills: boolean;
  instructions: boolean;
  agents: boolean;
}

export interface CapabilityFinding {
  capability: string;
  componentId: string;
  agent: AgentName;
  state: 'detected' | 'recommended' | 'conflict' | 'unknown';
  evidence: string[];
  reason: string;
  defaultAction: 'none' | 'install' | 'skip' | 'overwrite-required';
  dest?: string;
}

export interface AnalysisResult {
  schemaVersion: 1;
  generatedAt: string;
  hubVersion: string;
  targetDir: string;
  agents: AgentName[];
  signals: RepoSignals;
  findings: CapabilityFinding[];
  agentReadiness?: AgentReadinessReport;
  harness?: HarnessReport;
}

export type ManagedFileRole = 'local-state';

export interface ManagedFileRecord {
  path: string;
  sha256: string;
  size: number;
  role?: ManagedFileRole;
}

export interface ManagedComponentRecord {
  id: string;
  version: string;
  agent: AgentName;
  kind: string;
  source: string;
  dest: string;
  files: ManagedFileRecord[];
  installedAt: string;
  updatedAt?: string;
  migratedAt?: string;
  status: 'installed' | 'skipped';
}

export interface HarnessHubLockV1 {
  schemaVersion: 1;
  generatedAt: string;
  hubVersion: string;
  agents: AgentName[];
  components: Array<{
    id: string;
    version: string;
    agent: AgentName;
    dest: string;
    status: 'installed' | 'skipped';
  }>;
}

export interface HarnessHubLockV2 {
  schemaVersion: 2;
  generatedAt: string;
  hubVersion: string;
  agents: AgentName[];
  components: ManagedComponentRecord[];
}

export type HarnessHubLock = HarnessHubLockV1 | HarnessHubLockV2;

export type StatusState =
  | 'current'
  | 'missing'
  | 'modified'
  | 'update-available'
  | 'skipped'
  | 'unknown-component';

export interface StatusRow {
  id: string;
  version: string;
  latestVersion: string | null;
  agent: AgentName;
  dest: string;
  state: StatusState;
  evidence: string[];
  reason: string;
  exists: boolean;
  status?: 'installed' | 'skipped';
}

export interface RemovePlanItem {
  id: string;
  agent: AgentName;
  dest: string;
  files: string[];
  state: 'remove' | 'skip' | 'block';
  reason: string;
}

export interface RemoveResult {
  exitCode: number;
  targetDir: string;
  removed: string[];
  skipped: RemovePlanItem[];
  blocked: RemovePlanItem[];
  reason: string;
}

export interface UpdateResultItem {
  id: string;
  agent: AgentName;
  dest: string;
  previousVersion: string;
  version: string;
  files: string[];
  forced: boolean;
}

export interface UpdatePlan {
  targetDir: string;
  selectedComponents: string[];
  updates: StatusRow[];
  blockers: StatusRow[];
  forceOverridable: StatusRow[];
  skipped: StatusRow[];
  unchanged: StatusRow[];
}

export interface UpdateResult extends UpdatePlan {
  exitCode: number;
  updated: UpdateResultItem[];
  forced: UpdateResultItem[];
  lock: LockReadResult | null;
  reason: string;
}

export interface LockMigrationResult {
  exitCode: number;
  targetDir: string;
  migratable: StatusRow[];
  migrated: UpdateResultItem[];
  blockers: StatusRow[];
  skipped: StatusRow[];
  lock: LockReadResult | null;
  reason: string;
}

interface HtmlRow {
  id: string;
  agent?: AgentName | string;
  state: string;
  dest?: string;
  version?: string;
  latestVersion?: string | null;
}

interface AnalyzeTargetOptions {
  hubRoot?: string;
  targetDir?: string;
  index?: CapabilityIndex;
  agents?: AgentName[];
  agentReadiness?: boolean;
  harness?: boolean;
}

export interface InstallItem {
  componentId: string;
  componentVersion: string;
  agent: AgentName;
  kind: string;
  source: string;
  dest: string;
  exists: boolean;
}

export interface SkippedInstallItem extends InstallItem {
  reason: string;
}

export interface InstallPlan {
  generatedAt: string;
  hubVersion: string;
  installSetName: 'all-skills';
  agents: AgentName[];
  targetDir: string;
  signals: RepoSignals;
  items: InstallItem[];
}

export interface LockReadResult {
  path: string;
  data: HarnessHubLock;
}

export interface InstallResult {
  installed: InstallItem[];
  skipped: SkippedInstallItem[];
  lock: LockReadResult;
  report: string;
}

export interface HarnessPlanItem {
  componentId: string;
  componentVersion: string;
  kind: string;
  source: string;
  sourceFile: string;
  dest: string;
  relativePath: string;
  exists: boolean;
  managed: boolean;
  action: HarnessPlanAction;
  reason: string;
}

export interface HarnessInitPlan {
  generatedAt: string;
  hubVersion: string;
  targetDir: string;
  componentId: string;
  componentVersion: string;
  componentKind: string;
  source: string;
  force: boolean;
  items: HarnessPlanItem[];
}

export interface HarnessInitResult {
  exitCode: number;
  targetDir: string;
  installed: HarnessPlanItem[];
  skipped: HarnessPlanItem[];
  lock: LockReadResult | null;
  reason: string;
}

export interface HarnessValidationResult {
  schemaVersion: 1;
  generatedAt: string;
  exitCode: number;
  targetDir: string;
  componentId: string;
  requiredFiles: string[];
  present: string[];
  missing: string[];
  managed: string[];
  checks: HarnessValidationCheck[];
  assessment: HarnessAssessment;
  benchmark: HarnessBenchmark;
  reason: string;
}

export type HarnessSubsystemName = 'instructions' | 'state' | 'verification' | 'scope' | 'lifecycle';

export interface HarnessAssessmentCheck {
  pass: boolean;
  message: string;
  evidence: string[];
}

export interface HarnessSubsystemAssessment {
  score: number;
  passed: number;
  total: number;
  checks: HarnessAssessmentCheck[];
}

export interface HarnessProjectDetection {
  stack: string;
  packageManager: string | null;
  verificationCommands: string[];
  evidence: string[];
}

export interface HarnessAssessment {
  overall: number;
  bottleneck: HarnessSubsystemName;
  project: HarnessProjectDetection;
  subsystems: Record<HarnessSubsystemName, HarnessSubsystemAssessment>;
}

export interface HarnessBenchmarkCheck {
  pass: boolean;
  message: string;
}

export interface HarnessBenchmark {
  score: number;
  passed: number;
  total: number;
  checks: HarnessBenchmarkCheck[];
  recommendation: string;
}

export type HarnessBlockerCode = 'dirty-worktree' | 'existing-file' | 'non-codex-platform-file' | 'unsafe-path';

export interface HarnessBlocker {
  code: HarnessBlockerCode;
  path: string;
  reason: string;
  status?: string;
}

export interface HarnessFilePlan {
  relativePath: string;
  source: string;
  dest: string;
  exists: boolean;
  size: number;
  sizeLimit?: number;
}

export interface DirtyWorktreePath {
  path: string;
  status: string;
}

export interface DevBootstrapPlan {
  schemaVersion: 1;
  generatedAt: string;
  hubVersion: string;
  targetDir: string;
  agents: AgentName[];
  install: InstallPlan;
  harnessComponentId: string;
  harnessVersion: string;
  harnessFiles: HarnessFilePlan[];
  dirtyWorktree: DirtyWorktreePath[];
  blockers: HarnessBlocker[];
  validationCommand: string;
}

export interface HarnessValidationCheck {
  code:
    | 'required-file'
    | 'codex-only'
    | 'file-size'
    | 'required-content'
    | 'structured-content'
    | 'qa-boundary'
    | 'agent-architecture'
    | 'trigger-hygiene';
  state: 'pass' | 'fail';
  path: string;
  reason: string;
  size?: number;
  limit?: number;
  evidence?: string[];
}

export interface DevBootstrapResult extends DevBootstrapPlan {
  exitCode: number;
  installed: InstallItem[];
  skipped: SkippedInstallItem[];
  harnessFilesWritten: string[];
  lock: LockReadResult | null;
  report: string | null;
  validation: HarnessValidationResult | null;
  reason: string;
}

export interface InsightSource {
  id: string;
  title: string;
  url: string;
  type: string;
  accessedAt: string;
  excerpt?: string;
  notes?: string;
}

export type InsightClaimKind = 'fact' | 'inference' | 'assumption' | 'project-judgment';

export interface InsightSourceClaim {
  id: string;
  sourceId: string;
  statement: string;
  kind: InsightClaimKind;
}

export interface InsightViewpoint {
  id: string;
  statement: string;
  sourceClaimIds: string[];
}

export interface InsightProjectMapping {
  area: string;
  impact: string;
  action: string;
}

export interface InsightIterationRecord {
  changed: string[];
  confirmed: string[];
  open: string[];
  watch: string[];
}

export interface InsightActionBoundary {
  now: string[];
  observe: string[];
  notNow: string[];
}

export interface InsightPostInput {
  title: string;
  date: string;
  summary: string;
  slug?: string;
  sources: InsightSource[];
  sourceClaims: InsightSourceClaim[];
  viewpoints: InsightViewpoint[];
  integration: string[];
  projectMapping: InsightProjectMapping[];
  iterationRecord: InsightIterationRecord;
  actionBoundary: InsightActionBoundary;
  assumptions?: string[];
}

export type InsightValidationCode =
  | 'required-field'
  | 'utf8'
  | 'source-link'
  | 'source-size'
  | 'source-attribution'
  | 'fact-inference-separation'
  | 'source-reference'
  | 'post-file'
  | 'site-index'
  | 'public-artifact-boundary'
  | 'workflow'
  | 'pages-output'
  | 'branch'
  | 'worktree';

export interface InsightValidationCheck {
  code: InsightValidationCode;
  state: 'pass' | 'fail';
  path: string;
  reason: string;
  evidence?: string[];
  size?: number;
  limit?: number;
}

export interface InsightValidationResult {
  schemaVersion: 1;
  generatedAt: string;
  targetDir: string;
  exitCode: number;
  checks: InsightValidationCheck[];
  reason: string;
}

export interface InsightPostResult {
  schemaVersion: 1;
  generatedAt: string;
  repoRoot: string;
  slug: string;
  postDir: string;
  postJsonPath: string;
  sourceLedgerPath: string;
  effectiveInteractInputPath: string;
  htmlPath: string;
  validation: InsightValidationResult;
  reason: string;
}

export interface InsightBuildResult {
  schemaVersion: 1;
  generatedAt: string;
  repoRoot: string;
  siteDir: string;
  posts: Array<{ slug: string; title: string; date: string; summary: string; href: string }>;
  files: string[];
  validation: InsightValidationResult;
  exitCode: number;
  reason: string;
}

export interface InsightPreflightResult {
  schemaVersion: 1;
  generatedAt: string;
  repoRoot: string;
  mode: 'dry-run' | 'publish';
  exitCode: number;
  checks: InsightValidationCheck[];
  reason: string;
}

export interface HarnessHubStatus {
  targetDir: string;
  lock: LockReadResult | null;
  current: StatusRow[];
  missing: StatusRow[];
  updates: StatusRow[];
  modified: StatusRow[];
  skipped: StatusRow[];
  unknown: StatusRow[];
  rows: StatusRow[];
}

interface CliOptions {
  command: string;
  targetDir: string | null;
  agents: AgentName[];
  dryRun: boolean;
  yes: boolean;
  overwrite: boolean;
  html: boolean;
  json: boolean;
  output: string | null;
  force: boolean;
  agentReadiness: boolean;
  harness: boolean;
  componentIds: string[];
  input: string | null;
  slug: string | null;
  allowDirty: boolean;
}

interface PlanInstallOptions {
  hubRoot?: string;
  targetDir?: string;
  index?: CapabilityIndex;
  agents?: AgentName[];
}

interface StatusOptions {
  hubRoot?: string;
  targetDir?: string;
  index?: CapabilityIndex;
}

interface UpdatePlanOptions extends StatusOptions {
  components?: string[];
  force?: boolean;
}

interface UpdateApplyOptions extends UpdatePlanOptions {
  dryRun?: boolean;
  yes?: boolean;
}

interface MigrateLockOptions extends StatusOptions {
  dryRun?: boolean;
  yes?: boolean;
}

interface HarnessPlanOptions extends StatusOptions {
  force?: boolean;
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

export const AGENT_SKILL_DIRS = Object.freeze({
  standard: 'skills',
} satisfies Record<AgentName, string>);

const MANAGED_COMPONENT_RENAMES: Readonly<Record<string, ManagedComponentRename>> = Object.freeze({
  'skill:html-work-reports': {
    to: 'skill:effective-interact',
    reason: 'Component was renamed from skill:html-work-reports to skill:effective-interact.',
  },
});

const VALID_RISKS = new Set<LifecycleRisk>(['low', 'medium', 'high']);
const GLOB_CHARS = /[*?[\]{}]/;
const MINIMAL_HARNESS_COMPONENT_ID = 'harness:minimal';
const HARNESS_COMPONENT_ID = MINIMAL_HARNESS_COMPONENT_ID;
const HARNESS_TEMPLATE_KINDS = new Set(['harness-template', 'harness-pack']);
const HARNESS_DEST = '.';
const HARNESS_SUBSYSTEMS: HarnessSubsystemName[] = ['instructions', 'state', 'verification', 'scope', 'lifecycle'];
const HARNESS_STATE_FILES = Object.freeze([
  '.harness-hub/state/current-task.md',
  '.harness-hub/state/decisions.md',
  '.harness-hub/state/progress.md',
  '.harness-hub/state/session-handoff.md',
]);
const HARNESS_STATE_FILE_SET = new Set<string>(HARNESS_STATE_FILES);
const LEGACY_HARNESS_STATE_MIGRATIONS = Object.freeze({
  'tasks/current-task.md': '.harness-hub/state/current-task.md',
  'decisions.md': '.harness-hub/state/decisions.md',
  'decision-log.md': '.harness-hub/state/decisions.md',
  'progress.md': '.harness-hub/state/progress.md',
  'session-handoff.md': '.harness-hub/state/session-handoff.md',
} satisfies Record<string, string>);
const HARNESS_TEMPLATE_DESTINATIONS = Object.freeze({
  'state-templates/gitignore': '.harness-hub/.gitignore',
  'state-templates/current-task.md': '.harness-hub/state/current-task.md',
  'state-templates/decisions.md': '.harness-hub/state/decisions.md',
  'state-templates/progress.md': '.harness-hub/state/progress.md',
  'state-templates/session-handoff.md': '.harness-hub/state/session-handoff.md',
} satisfies Record<string, string>);
const HARNESS_SIZE_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  'AGENTS.md': 32 * 1024,
  '.harness-hub/state/decisions.md': 16 * 1024,
  '.harness-hub/state/progress.md': 16 * 1024,
  '.harness-hub/state/session-handoff.md': 16 * 1024,
  '.harness-hub/state/current-task.md': 16 * 1024,
});
const NON_CODEX_PLATFORM_FILES = ['CLAUDE.md'];
const INSIGHT_SITE_ROOT = 'site';
const INSIGHT_POSTS_ROOT = 'site/insights/posts';
const INSIGHT_SOURCE_EXCERPT_WORD_LIMIT = 220;
const INSIGHT_WORKFLOW_PATH = '.github/workflows/publish-insights.yml';

export function readCapabilityIndex(hubRoot = HUB_ROOT): CapabilityIndex {
  const indexPath = path.join(hubRoot, 'capabilities', 'index.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as CapabilityIndex;
}

export function listComponents(index = readCapabilityIndex()): Array<{ id: string } & CapabilityComponent> {
  return Object.entries(index.components).map(([id, component]) => ({ id, ...component }));
}

function listInstallableSkillComponents(index: CapabilityIndex): Array<{ id: string } & CapabilityComponent> {
  return listComponents(index)
    .filter((component) => component.kind === 'skill')
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function validateCapabilityIndex(index: CapabilityIndex): string[] {
  const errors: string[] = [];

  for (const [id, component] of Object.entries(index.components)) {
    if (!component.kind) {
      errors.push(`${id}: missing kind`);
    }

    if (!component.path) {
      errors.push(`${id}: missing path`);
    }

    if (!component.version) {
      errors.push(`${id}: missing version`);
    }

    if (!component.source) {
      errors.push(`${id}: missing source`);
    }

    if (!Array.isArray(component.provides) || component.provides.length === 0) {
      errors.push(`${id}: missing provides`);
    }

    if (!Array.isArray(component.detects) || component.detects.length === 0) {
      errors.push(`${id}: missing detects`);
    } else {
      for (const rule of component.detects) {
        errors.push(...validateDetectRule(id, rule));
      }
    }

    if (!Array.isArray(component.agents) || component.agents.length === 0) {
      errors.push(`${id}: missing agents`);
    } else {
      for (const agent of component.agents) {
        if (!AGENT_SKILL_DIRS[agent]) {
          errors.push(`${id}: unsupported agent '${agent}'`);
        }
      }
    }

    if (!VALID_RISKS.has(component.risk)) {
      errors.push(`${id}: missing or invalid risk`);
    }

    if (!component.recommendation || component.recommendation.trim().length === 0) {
      errors.push(`${id}: missing recommendation`);
    }

  }

  return errors;
}

function validateDetectRule(componentId: string, rule: PathDetectRule): string[] {
  const errors: string[] = [];
  const rulePath = rule.path || '';

  if (!rulePath.trim()) {
    errors.push(`${componentId}: empty detect path`);
    return errors;
  }

  const normalized = normalizePortablePath(rulePath);
  if (isAbsolutePortablePath(normalized)) {
    errors.push(`${componentId}: absolute detect path '${rule.path}'`);
  }

  if (normalized.split('/').includes('..')) {
    errors.push(`${componentId}: traversal detect path '${rule.path}'`);
  }

  if (GLOB_CHARS.test(normalized)) {
    errors.push(`${componentId}: glob detect path '${rule.path}'`);
  }

  if (rule.agent && !AGENT_SKILL_DIRS[rule.agent]) {
    errors.push(`${componentId}: unsupported detect agent '${rule.agent}'`);
  }

  return errors;
}

function normalizePortablePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function isAbsolutePortablePath(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value) || value.startsWith('/');
}

export function detectRepoSignals(targetDir: string): RepoSignals {
  const checks = {
    packageJson: 'package.json',
    tsconfig: 'tsconfig.json',
    pyproject: 'pyproject.toml',
    cargo: 'Cargo.toml',
    goMod: 'go.mod',
    skills: 'skills',
    instructions: 'AGENTS.md',
    agents: '.agents',
  };

  return Object.fromEntries(
    Object.entries(checks).map(([key, relativePath]) => [
      key,
      fs.existsSync(path.join(targetDir, relativePath)),
    ]),
  ) as unknown as RepoSignals;
}

export function resolveAgents(agentNames: AgentName[]): AgentName[] {
  const agents: AgentName[] = agentNames.length > 0 ? agentNames : ['standard'];
  for (const agent of agents) {
    if (!AGENT_SKILL_DIRS[agent]) {
      throw new Error(`Unsupported agent '${agent}'. Available: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}`);
    }
  }
  return agents;
}

export function analyzeTarget(options: AnalyzeTargetOptions = {}): AnalysisResult {
  const hubRoot = options.hubRoot || HUB_ROOT;
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(hubRoot);
  const agents = resolveAgents(options.agents || []);
  const findings: CapabilityFinding[] = [];

  for (const component of listInstallableSkillComponents(index)) {
    for (const agent of installAgentsForComponent(component, agents)) {
      findings.push(analyzeComponentForAgent(targetDir, component.id, component, agent));
    }
  }

  findings.sort((left, right) => (
    left.capability.localeCompare(right.capability)
    || left.componentId.localeCompare(right.componentId)
    || left.agent.localeCompare(right.agent)
    || (left.dest || '').localeCompare(right.dest || '')
  ));

  const result: AnalysisResult = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: index.version,
    targetDir,
    agents,
    signals: detectRepoSignals(targetDir),
    findings,
  };

  if (options.agentReadiness) {
    result.agentReadiness = analyzeAgentReadiness(targetDir);
  }

  if (options.harness) {
    result.harness = analyzeHarness(targetDir, { hubRoot, index, readiness: result.agentReadiness });
  }

  return result;
}

function analyzeComponentForAgent(
  targetDir: string,
  componentId: string,
  component: CapabilityComponent,
  agent: AgentName,
): CapabilityFinding {
  const dest = resolveComponentDest(component, agent);
  const evidence = detectExistingCapability(targetDir, component, agent);
  const capability = component.provides[0] || componentId;
  const reason = component.recommendation || component.routing || `Adds ${capability}.`;

  if (evidence.length > 0) {
    return {
      capability,
      componentId,
      agent,
      state: 'detected',
      evidence,
      reason: `Existing capability detected: ${evidence.join(', ')}`,
      defaultAction: 'none',
      dest,
    };
  }

  if (fs.existsSync(path.join(targetDir, dest))) {
    return {
      capability,
      componentId,
      agent,
      state: 'conflict',
      evidence: [dest],
      reason: `Destination already exists and will be overwritten by confirmed install: ${dest}`,
      defaultAction: 'install',
      dest,
    };
  }

  return {
    capability,
    componentId,
    agent,
    state: 'recommended',
    evidence: [],
    reason,
    defaultAction: 'install',
    dest,
  };
}

function installAgentsForComponent(component: CapabilityComponent, agents: AgentName[]): AgentName[] {
  return agents.filter((agent) => component.agents.includes(agent));
}

function resolveComponentDest(component: CapabilityComponent, agent: AgentName): string {
  if (component.dest) {
    return normalizePortablePath(component.dest);
  }
  if (component.kind === 'harness-template') {
    return HARNESS_DEST;
  }
  const skillName = path.basename(component.path);
  return toPortablePath(path.join(AGENT_SKILL_DIRS[agent], skillName));
}

function detectExistingCapability(
  targetDir: string,
  component: CapabilityComponent,
  agent: AgentName,
): string[] {
  const evidence: string[] = [];

  for (const rule of component.detects) {
    if (rule.agent && rule.agent !== agent) {
      continue;
    }

    const errors = validateDetectRule(component.path, rule);
    if (errors.length > 0) {
      continue;
    }

    const portablePath = normalizePortablePath(rule.path);
    if (fs.existsSync(path.join(targetDir, portablePath))) {
      evidence.push(portablePath);
    }
  }

  return evidence.sort();
}

function toPortablePath(value: string): string {
  return value.replaceAll(path.sep, '/').replaceAll('\\', '/');
}

const AGENT_READINESS_CATEGORY_ORDER = new Map(
  AGENT_READINESS_CATEGORIES.map((category, index) => [category, index]),
);

const VERIFICATION_SCRIPT_NAMES = new Set([
  'build',
  'check',
  'ci',
  'e2e',
  'lint',
  'test',
  'test:e2e',
  'typecheck',
  'validate',
]);

export function analyzeAgentReadiness(targetDirInput: string): AgentReadinessReport {
  const targetDir = path.resolve(targetDirInput);
  const contextEvidence = detectContextSurfaceEvidence(targetDir);
  const outcomeEvidence = detectOutcomeEvidence(targetDir);
  const verificationEvidence = detectVerificationEvidence(targetDir);
  const routingEvidence = detectRoutingEvidence(targetDir);
  const learningEvidence = detectLearningCaptureEvidence(targetDir);
  const findings = [
    buildContextBudgetFinding(contextEvidence),
    buildOutcomeFinding(outcomeEvidence),
    buildVerificationFinding(verificationEvidence),
    buildRoutingFinding(routingEvidence),
    ...buildAutomationCandidateFindings(targetDir, verificationEvidence, outcomeEvidence),
    buildLearningCaptureFinding(learningEvidence),
  ].sort(sortReadinessFindings);

  return {
    categories: [...AGENT_READINESS_CATEGORIES],
    findings,
  };
}

function buildContextBudgetFinding(evidence: AgentReadinessEvidence[]): AgentReadinessFinding {
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'context_budget.no_context_surfaces',
      category: 'context_budget',
      state: 'unknown',
      severity: 'info',
      reason: 'No recognized agent instruction surface was detected.',
      recommendation: 'Add one explicit repo instruction surface before increasing agent autonomy.',
      evidence,
    });
  }

  if (evidence.length > 1) {
    return makeReadinessFinding({
      id: 'context_budget.duplicated_instruction_surfaces',
      category: 'context_budget',
      state: 'risk',
      severity: 'warning',
      reason: 'Multiple always-loaded instruction surfaces may duplicate context for the same work.',
      recommendation: 'Consolidate shared guidance and keep agent-specific files narrow.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'context_budget.context_surfaces',
    category: 'context_budget',
    state: 'detected',
    severity: 'info',
    reason: 'A recognized agent instruction surface was detected.',
    recommendation: 'Keep always-loaded instructions short and move conditional guidance into skills or docs.',
    evidence,
  });
}

function buildOutcomeFinding(evidence: AgentReadinessEvidence[]): AgentReadinessFinding {
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'outcomes.no_outcome_artifacts',
      category: 'outcomes',
      state: 'not-detected',
      severity: 'warning',
      reason: 'No explicit success criteria, OpenSpec tasks, PR template, or Definition of Done artifact was detected.',
      recommendation: 'Add reviewable success criteria before delegating broader autonomous work.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'outcomes.outcome_artifacts',
    category: 'outcomes',
    state: 'detected',
    severity: 'info',
    reason: 'Outcome-like artifacts are available for agents to work toward.',
    recommendation: 'Keep acceptance criteria close to the work item and update them as scope changes.',
    evidence,
  });
}

function buildVerificationFinding(evidence: AgentReadinessEvidence[]): AgentReadinessFinding {
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'verification.no_verification_gates',
      category: 'verification',
      state: 'not-detected',
      severity: 'warning',
      reason: 'No package script, test directory, CI config, or known validation path was detected.',
      recommendation: 'Add at least one reproducible verification command before routine or multi-agent execution.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'verification.verification_gates',
    category: 'verification',
    state: 'detected',
    severity: 'info',
    reason: 'Verification gates are discoverable from scripts or project files.',
    recommendation: 'Document which checks are required before declaring agent work complete.',
    evidence,
  });
}

function buildRoutingFinding(evidence: AgentReadinessEvidence[]): AgentReadinessFinding {
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'agent_routing.no_routing_assets',
      category: 'agent_routing',
      state: 'not-detected',
      severity: 'warning',
      reason: 'No skill routing docs, agent roles, OpenSpec changes, or equivalent routing assets were detected.',
      recommendation: 'Start with one or two narrow agent workflows before broad autonomous execution.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'agent_routing.routing_assets',
    category: 'agent_routing',
    state: 'detected',
    severity: 'info',
    reason: 'Routing assets exist for decomposing work into narrower responsibilities.',
    recommendation: 'Use routing docs to keep implementation, review, and verification responsibilities separate.',
    evidence,
  });
}

function buildAutomationCandidateFindings(
  targetDir: string,
  verificationEvidence: AgentReadinessEvidence[],
  outcomeEvidence: AgentReadinessEvidence[],
): AgentReadinessFinding[] {
  if (verificationEvidence.length === 0) {
    return [
      makeReadinessFinding({
        id: 'automation_candidates.verification_required',
        category: 'automation_candidates',
        state: 'not-detected',
        severity: 'warning',
        reason: 'Routine-style execution should remain manual until a checkable verification gate exists.',
        recommendation: 'Add a repeatable test, lint, typecheck, build, or validate gate before creating routines.',
        evidence: [],
      }),
    ];
  }

  const findings: AgentReadinessFinding[] = [];
  const ciEvidence = verificationEvidence.filter((item) => item.kind === 'path' && item.value.startsWith('.github/workflows'));
  if (ciEvidence.length > 0) {
    findings.push(makeReadinessFinding({
      id: 'automation_candidates.ci_failure_triage',
      category: 'automation_candidates',
      state: 'candidate',
      severity: 'info',
      reason: 'CI workflow files create a reviewable candidate for read-only failure triage.',
      recommendation: 'Consider a read-only CI failure triage routine that summarizes failing checks and likely owners.',
      evidence: ciEvidence,
    }));
  }

  const validationEvidence = verificationEvidence.filter((item) => (
    item.kind === 'script'
    && /#scripts\.(build|check|ci|e2e|lint|test|test:e2e|typecheck|validate)$/.test(item.value)
  ));
  if (validationEvidence.length > 0) {
    findings.push(makeReadinessFinding({
      id: 'automation_candidates.nightly_validation',
      category: 'automation_candidates',
      state: 'candidate',
      severity: 'info',
      reason: 'Reusable verification scripts create a candidate for scheduled validation reports.',
      recommendation: 'Consider a read-only nightly validation routine that reports command results without changing files.',
      evidence: validationEvidence,
    }));
  }

  const reviewEvidence = outcomeEvidence.filter((item) => (
    item.value.includes('pull_request_template')
    || item.value.toLowerCase().includes('definition-of-done')
  ));
  if (reviewEvidence.length > 0) {
    findings.push(makeReadinessFinding({
      id: 'automation_candidates.review_preparation',
      category: 'automation_candidates',
      state: 'candidate',
      severity: 'info',
      reason: 'Review and Definition of Done artifacts can guide read-only review preparation.',
      recommendation: 'Consider a pre-review routine that checks changed work against the documented criteria.',
      evidence: reviewEvidence,
    }));
  }

  if (safeRelativePathExists(targetDir, 'docs')) {
    findings.push(makeReadinessFinding({
      id: 'automation_candidates.docs_freshness',
      category: 'automation_candidates',
      state: 'candidate',
      severity: 'info',
      reason: 'A docs directory creates a candidate for read-only documentation freshness checks.',
      recommendation: 'Consider a routine that reports stale docs and missing source references for human review.',
      evidence: [{ kind: 'path', value: 'docs' }],
    }));
  }

  if (findings.length === 0) {
    findings.push(makeReadinessFinding({
      id: 'automation_candidates.manual_candidates',
      category: 'automation_candidates',
      state: 'candidate',
      severity: 'info',
      reason: 'Verification exists, but no CI, review, or docs routine candidate was detected.',
      recommendation: 'Keep routine candidates as reviewable plans until a concrete recurring workflow is chosen.',
      evidence: verificationEvidence,
    }));
  }

  return findings;
}

function buildLearningCaptureFinding(evidence: AgentReadinessEvidence[]): AgentReadinessFinding {
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'learning_capture.no_capture_location',
      category: 'learning_capture',
      state: 'unknown',
      severity: 'info',
      reason: 'No durable docs, changelog, retrospective, or skill location was detected for lessons learned.',
      recommendation: 'Choose a reviewable repo location for lessons before relying on external memory.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'learning_capture.capture_locations',
    category: 'learning_capture',
    state: 'detected',
    severity: 'info',
    reason: 'Durable repo locations exist for reviewable learning capture.',
    recommendation: 'Capture lessons as docs, changelog entries, skill gotchas, or memory-note proposals after review.',
    evidence,
  });
}

function detectContextSurfaceEvidence(targetDir: string): AgentReadinessEvidence[] {
  const evidence: AgentReadinessEvidence[] = [];
  pushPathEvidenceIfExists(targetDir, evidence, 'AGENTS.md');
  pushPathEvidenceIfExists(targetDir, evidence, 'skills');

  return sortEvidence(evidence);
}

function detectOutcomeEvidence(targetDir: string): AgentReadinessEvidence[] {
  const evidence = evidenceForExistingPaths(targetDir, [
    '.github/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'RELEASE_CHECKLIST.md',
    'docs/acceptance-criteria.md',
    'docs/definition-of-done.md',
    'docs/Definition-of-Done.md',
    'docs/release-checklist.md',
  ]);

  evidence.push(...findRelativeFiles(targetDir, 'openspec/changes')
    .filter((relativePath) => path.posix.basename(relativePath) === 'tasks.md')
    .map((value) => ({ kind: 'path' as const, value })));

  return sortEvidence(evidence);
}

function detectVerificationEvidence(targetDir: string): AgentReadinessEvidence[] {
  const evidence = [
    ...detectPackageScriptEvidence(targetDir),
    ...evidenceForExistingPaths(targetDir, [
      '.github/workflows',
      'Makefile',
      'biome.json',
      'e2e',
      'eslint.config.js',
      'jest.config.js',
      'playwright.config.ts',
      'scripts/validate-skills.ps1',
      'scripts/validate.ts',
      'test',
      'tests',
      'tsconfig.json',
      'vitest.config.ts',
    ]),
  ];

  return sortEvidence(evidence);
}

function detectRoutingEvidence(targetDir: string): AgentReadinessEvidence[] {
  return sortEvidence([
    ...evidenceForExistingPaths(targetDir, [
      'skills',
      'docs/skill-routing.md',
      'openspec/changes',
    ]),
  ]);
}

function detectLearningCaptureEvidence(targetDir: string): AgentReadinessEvidence[] {
  return evidenceForExistingPaths(targetDir, [
    'skills',
    'CHANGELOG.md',
    'changelog.md',
    'docs',
    'docs/lessons-learned.md',
    'docs/retrospective.md',
    'docs/skill-quality-guide.md',
  ]);
}

function detectPackageScriptEvidence(targetDir: string): AgentReadinessEvidence[] {
  const packagePath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return [];
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
      scripts?: Record<string, unknown>;
    };
    return Object.entries(packageJson.scripts || {})
      .filter(([name, command]) => VERIFICATION_SCRIPT_NAMES.has(name) && typeof command === 'string')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, command]) => ({
        kind: 'script' as const,
        value: `package.json#scripts.${name}`,
        detail: command as string,
      }));
  } catch {
    return [];
  }
}

function evidenceForExistingPaths(targetDir: string, relativePaths: string[]): AgentReadinessEvidence[] {
  const evidence: AgentReadinessEvidence[] = [];
  for (const relativePath of relativePaths) {
    pushPathEvidenceIfExists(targetDir, evidence, relativePath);
  }
  return sortEvidence(evidence);
}

function pushPathEvidenceIfExists(
  targetDir: string,
  evidence: AgentReadinessEvidence[],
  relativePath: string,
): void {
  if (safeRelativePathExists(targetDir, relativePath)) {
    evidence.push({ kind: 'path', value: normalizePortablePath(relativePath) });
  }
}

function findRelativeFiles(targetDir: string, rootRelativePath: string): string[] {
  if (!safeRelativePathExists(targetDir, rootRelativePath)) {
    return [];
  }

  const rootPath = assertSafeRelativePath(targetDir, rootRelativePath);
  return listFilesRecursive(rootPath)
    .map((filePath) => toPortablePath(path.relative(targetDir, filePath)))
    .sort((left, right) => left.localeCompare(right));
}

function makeReadinessFinding(input: AgentReadinessFinding): AgentReadinessFinding {
  return {
    ...input,
    evidence: sortEvidence(input.evidence),
  };
}

function sortEvidence(evidence: AgentReadinessEvidence[]): AgentReadinessEvidence[] {
  const byKey = new Map<string, AgentReadinessEvidence>();
  for (const item of evidence) {
    byKey.set(`${item.kind}\0${item.value}\0${item.detail || ''}`, item);
  }

  return [...byKey.values()].sort((left, right) => (
    left.value.localeCompare(right.value)
    || left.kind.localeCompare(right.kind)
    || (left.detail || '').localeCompare(right.detail || '')
  ));
}

function sortReadinessFindings(left: AgentReadinessFinding, right: AgentReadinessFinding): number {
  return (
    (AGENT_READINESS_CATEGORY_ORDER.get(left.category) || 0)
    - (AGENT_READINESS_CATEGORY_ORDER.get(right.category) || 0)
    || left.id.localeCompare(right.id)
    || left.recommendation.localeCompare(right.recommendation)
  );
}

export function analyzeHarness(
  targetDirInput: string,
  options: { hubRoot?: string; index?: CapabilityIndex; readiness?: AgentReadinessReport } = {},
): HarnessReport {
  const targetDir = path.resolve(targetDirInput);
  const hubRoot = options.hubRoot || HUB_ROOT;
  const index = options.index || readCapabilityIndex(hubRoot);
  const { id, component } = getMinimalHarnessComponent(index);
  const requiredFiles = listHarnessTemplateFiles(hubRoot, component).map((file) => file.relativePath);
  const lock = readLock(targetDir);
  const managedFiles = getManagedFilePaths(lock, id);
  const findings = requiredFiles.map((relativePath) => {
    const exists = safeRelativePathExists(targetDir, relativePath);
    const managed = managedFiles.has(relativePath);
    return makeHarnessFinding({
      id: `harness_file.${findingIdForPath(relativePath)}`,
      state: exists ? (managed ? 'managed' : 'present') : 'missing',
      severity: exists ? 'info' : 'warning',
      reason: exists
        ? `${relativePath} is present${managed ? ' and lock-managed' : ''}.`
        : `${relativePath} is missing from the target harness.`,
      recommendation: exists
        ? 'Keep the file current with project workflow changes.'
        : 'Run init-harness after reviewing the dry-run plan.',
      evidence: exists ? [{ kind: 'path', value: relativePath }] : [],
    });
  });

  const warningEvidence = (options.readiness?.findings || [])
    .filter((finding) => finding.severity === 'warning')
    .map((finding) => ({ kind: 'signal' as const, value: finding.id, detail: finding.reason }));
  if (warningEvidence.length > 0) {
    findings.push(makeHarnessFinding({
      id: 'harness.readiness_warnings',
      state: 'candidate',
      severity: 'warning',
      reason: 'Agent-readiness warnings can inform the root harness initialization plan.',
      recommendation: 'Review readiness warnings before confirming init-harness.',
      evidence: warningEvidence,
    }));
  }

  return {
    componentId: id,
    requiredFiles,
    findings: findings.sort(sortHarnessFindings),
  };
}

export function planHarnessInit(options: HarnessPlanOptions = {}): HarnessInitPlan {
  const hubRoot = options.hubRoot || HUB_ROOT;
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(hubRoot);
  const { id, component } = getMinimalHarnessComponent(index);
  const source = componentSourcePath(hubRoot, component);
  if (!fs.existsSync(source)) {
    throw new Error(`Harness source does not exist: ${component.path}`);
  }
  const managedFiles = getManagedFilePaths(readLock(targetDir), id);
  const force = options.force ?? false;
  const items = listHarnessTemplateFiles(hubRoot, component).map((file) => {
    const dest = assertSafeRelativePath(targetDir, file.relativePath);
    const exists = fs.existsSync(dest);
    const managed = managedFiles.has(file.relativePath);
    const localState = harnessFileRole(file.relativePath) === 'local-state';
    const action: HarnessPlanAction = exists
      ? (localState ? 'skip' : (force ? 'overwrite' : 'skip'))
      : 'create';
    return {
      componentId: id,
      componentVersion: component.version,
      kind: component.kind,
      source,
      sourceFile: file.sourceFile,
      dest,
      relativePath: file.relativePath,
      exists,
      managed,
      action,
      reason: harnessPlanReason(action, exists, managed, localState),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    hubVersion: index.version,
    targetDir,
    componentId: id,
    componentVersion: component.version,
    componentKind: component.kind,
    source,
    force,
    items,
  };
}

export function applyHarnessInit(plan: HarnessInitPlan): HarnessInitResult {
  const installed = plan.items.filter((item) => item.action === 'create' || item.action === 'overwrite');
  const lockRecorded = plan.items.filter((item) => (
    item.action === 'create'
    || item.action === 'overwrite'
    || (item.action === 'skip' && item.exists && harnessFileRole(item.relativePath) === 'local-state')
  ));
  const skipped = plan.items.filter((item) => item.action === 'skip');

  assertCanWriteHarnessLock(plan, installed);

  for (const item of installed) {
    fs.mkdirSync(path.dirname(item.dest), { recursive: true });
    fs.copyFileSync(item.sourceFile, item.dest);
  }

  const lock = lockRecorded.length > 0 ? writeHarnessLock(plan, lockRecorded) : readLock(plan.targetDir);
  return {
    exitCode: 0,
    targetDir: plan.targetDir,
    installed,
    skipped,
    lock,
    reason: `${installed.length} harness files installed, ${skipped.length} skipped.`,
  };
}

function assertCanWriteHarnessLock(plan: HarnessInitPlan, installed: HarnessPlanItem[]): void {
  if (installed.length === 0) {
    return;
  }
  const currentLock = readLock(plan.targetDir);
  if (currentLock && currentLock.data.schemaVersion !== 2) {
    throw new Error('Existing schema version 1 lock cannot record harness files; run migrate-lock first.');
  }
}

function getMinimalHarnessComponent(index: CapabilityIndex): { id: string; component: CapabilityComponent } {
  const component = index.components[MINIMAL_HARNESS_COMPONENT_ID];
  if (!component) {
    throw new Error(`${MINIMAL_HARNESS_COMPONENT_ID} is not present in the capability index.`);
  }
  if (!HARNESS_TEMPLATE_KINDS.has(component.kind)) {
    throw new Error(`${MINIMAL_HARNESS_COMPONENT_ID} must be a harness template component.`);
  }
  return { id: MINIMAL_HARNESS_COMPONENT_ID, component };
}

function listHarnessTemplateFiles(
  hubRoot: string,
  component: CapabilityComponent,
): Array<{ sourceFile: string; relativePath: string }> {
  const source = componentSourcePath(hubRoot, component);
  if (!fs.existsSync(source)) {
    throw new Error(`Harness source does not exist: ${component.path}`);
  }
  return listFilesRecursive(source)
    .map((sourceFile) => {
      const sourceRelative = toPortablePath(path.relative(source, sourceFile));
      return {
        sourceFile,
        sourceRelative,
        relativePath: HARNESS_TEMPLATE_DESTINATIONS[sourceRelative as keyof typeof HARNESS_TEMPLATE_DESTINATIONS] || sourceRelative,
      };
    })
    .filter((file) => !file.sourceRelative.startsWith('.'))
    .map(({ sourceRelative: _sourceRelative, ...file }) => file)
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function writeHarnessLock(plan: HarnessInitPlan, installed: HarnessPlanItem[]): LockReadResult {
  const currentLock = readLock(plan.targetDir);
  assertCanWriteHarnessLock(plan, installed);

  const installedAt = new Date().toISOString();
  const existingComponents = currentLock?.data.schemaVersion === 2
    ? currentLock.data.components.filter((component) => component.id !== plan.componentId)
    : [];
  const harnessRecord: ManagedComponentRecord = {
    id: plan.componentId,
    version: plan.componentVersion,
    agent: 'standard',
    kind: plan.componentKind,
    source: toPortablePath(path.relative(HUB_ROOT, plan.source)),
    dest: '.',
    files: installed.map((item) => digestManagedFile(plan.targetDir, item.relativePath)).sort((left, right) => (
      left.path.localeCompare(right.path)
    )),
    installedAt,
    status: 'installed',
  };
  const lock: HarnessHubLockV2 = {
    schemaVersion: 2,
    generatedAt: installedAt,
    hubVersion: plan.hubVersion,
    agents: currentLock?.data.agents?.length ? currentLock.data.agents : ['standard'],
    components: [...existingComponents, harnessRecord]
      .sort((left, right) => left.id.localeCompare(right.id) || left.dest.localeCompare(right.dest)),
  };

  return writeLockData(plan.targetDir, lock);
}

function getManagedFilePaths(lock: LockReadResult | null, componentId?: string): Set<string> {
  const paths = new Set<string>();
  if (!lock || lock.data.schemaVersion !== 2) {
    return paths;
  }
  for (const component of lock.data.components) {
    if (componentId && component.id !== componentId) {
      continue;
    }
    for (const file of component.files) {
      paths.add(file.path);
    }
  }
  return paths;
}

function digestManagedFile(targetDir: string, relativePath: string): ManagedFileRecord {
  const filePath = assertSafeRelativePath(targetDir, relativePath);
  const bytes = fs.readFileSync(filePath);
  const normalized = normalizePortablePath(relativePath);
  const role = harnessFileRole(normalized);
  return {
    path: normalized,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
    ...(role ? { role } : {}),
  };
}

function harnessFileRole(relativePath: string): ManagedFileRole | undefined {
  return HARNESS_STATE_FILE_SET.has(normalizePortablePath(relativePath)) ? 'local-state' : undefined;
}

function isHarnessStateFileRecord(file: ManagedFileRecord): boolean {
  const normalized = normalizePortablePath(file.path);
  return file.role === 'local-state'
    || HARNESS_STATE_FILE_SET.has(normalized)
    || Object.prototype.hasOwnProperty.call(LEGACY_HARNESS_STATE_MIGRATIONS, normalized);
}

function collectManagedFilesFromSource(targetDir: string, dest: string, source: string): ManagedFileRecord[] {
  const sourceStat = fs.statSync(source);
  const sourceRoot = sourceStat.isDirectory() ? source : path.dirname(source);
  const destRoot = relativeDestRoot(targetDir, dest);
  return listFilesRecursive(source)
    .map((sourceFile) => {
      const sourceRelative = toPortablePath(path.relative(sourceRoot, sourceFile));
      const targetRelative = destRoot === '.'
        ? sourceRelative
        : toPortablePath(path.posix.join(destRoot, sourceRelative));
      return digestManagedFile(targetDir, targetRelative);
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function isHarnessComponentKind(kind: string): boolean {
  return HARNESS_TEMPLATE_KINDS.has(kind);
}

function relativeDestRoot(targetDir: string, dest: string): string {
  return normalizePortablePath(path.isAbsolute(dest) ? path.relative(targetDir, dest) || '.' : dest);
}

function updateHarnessComponentFiles(
  targetDir: string,
  hubRoot: string,
  latest: CapabilityComponent,
  component: ManagedComponentRecord,
): ManagedFileRecord[] {
  const latestFiles = listHarnessTemplateFiles(hubRoot, latest);
  const latestPathSet = new Set(latestFiles.map((file) => normalizePortablePath(file.relativePath)));
  const previouslyManaged = new Set(component.files.map((file) => normalizePortablePath(file.path)));
  const recordPaths = new Set<string>();

  migrateLegacyHarnessStateFiles(targetDir);

  for (const file of component.files) {
    const oldPath = normalizePortablePath(file.path);
    if (isHarnessStateFileRecord(file)) {
      continue;
    }
    if (!latestPathSet.has(oldPath)) {
      const filePath = assertSafeRelativePath(targetDir, oldPath);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
        pruneEmptyParents(targetDir, path.dirname(filePath));
      }
    }
  }

  for (const file of latestFiles) {
    const relativePath = normalizePortablePath(file.relativePath);
    const dest = assertSafeRelativePath(targetDir, relativePath);
    const exists = fs.existsSync(dest);
    const role = harnessFileRole(relativePath);
    if (role === 'local-state') {
      if (!exists) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file.sourceFile, dest);
      }
      recordPaths.add(relativePath);
      continue;
    }

    if (!previouslyManaged.has(relativePath) && exists) {
      continue;
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file.sourceFile, dest);
    recordPaths.add(relativePath);
  }

  for (const [oldPath, nextPath] of Object.entries(LEGACY_HARNESS_STATE_MIGRATIONS)) {
    const legacyPath = assertSafeRelativePath(targetDir, oldPath);
    const statePath = assertSafeRelativePath(targetDir, nextPath);
    if (fs.existsSync(legacyPath) && fs.existsSync(statePath)) {
      fs.rmSync(legacyPath);
      pruneEmptyParents(targetDir, path.dirname(legacyPath));
    }
  }

  return [...recordPaths]
    .filter((relativePath) => fs.existsSync(assertSafeRelativePath(targetDir, relativePath)))
    .map((relativePath) => digestManagedFile(targetDir, relativePath))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function migrateLegacyHarnessStateFiles(targetDir: string): void {
  for (const [oldPath, nextPath] of Object.entries(LEGACY_HARNESS_STATE_MIGRATIONS)) {
    const legacyPath = assertSafeRelativePath(targetDir, oldPath);
    const statePath = assertSafeRelativePath(targetDir, nextPath);
    if (fs.existsSync(legacyPath) && !fs.existsSync(statePath)) {
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.copyFileSync(legacyPath, statePath);
    }
  }
}

function copyComponentSourceAndCollectManagedFiles(
  targetDir: string,
  dest: string,
  source: string,
): ManagedFileRecord[] {
  copyRecursive(source, dest);
  return collectManagedFilesFromSource(targetDir, dest, source);
}

function harnessPlanReason(action: HarnessPlanAction, exists: boolean, managed: boolean, localState = false): string {
  if (action === 'create') {
    return 'Harness file is missing and will be created.';
  }
  if (action === 'overwrite') {
    return managed
      ? 'Existing lock-managed harness file will be overwritten because --force was provided.'
      : 'Existing unmanaged harness file will be overwritten because --force was provided.';
  }
  if (exists && localState) {
    return 'Existing worktree-local state file will be preserved.';
  }
  return exists
    ? 'Existing target file is skipped by default.'
    : 'Harness file is skipped.';
}

function makeHarnessFinding(input: HarnessFinding): HarnessFinding {
  return {
    ...input,
    evidence: sortEvidence(input.evidence),
  };
}

function sortHarnessFindings(left: HarnessFinding, right: HarnessFinding): number {
  return left.id.localeCompare(right.id) || left.state.localeCompare(right.state);
}

function findingIdForPath(relativePath: string): string {
  return normalizePortablePath(relativePath).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

export function planInstall(options: PlanInstallOptions = {}): InstallPlan {
  const hubRoot = options.hubRoot || HUB_ROOT;
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(hubRoot);
  const agents = resolveAgents(options.agents || []);
  const analysis = analyzeTarget({ hubRoot, targetDir, index, agents });
  const components = listInstallableSkillComponents(index);

  const items = [];
  for (const component of components) {
    const source = path.join(hubRoot, component.path);
    if (!fs.existsSync(source)) {
      throw new Error(`Component source does not exist: ${component.path}`);
    }

    for (const agent of installAgentsForComponent(component, agents)) {
      const dest = assertSafeRelativePath(targetDir, resolveComponentDest(component, agent));
      const finding = analysis.findings.find((item) => item.componentId === component.id && item.agent === agent);
      items.push({
        componentId: component.id,
        componentVersion: component.version,
        agent,
        kind: component.kind,
        source,
        dest,
        exists: fs.existsSync(dest) || finding?.defaultAction === 'none' || finding?.defaultAction === 'skip',
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    hubVersion: index.version,
    installSetName: 'all-skills',
    agents,
    targetDir,
    signals: detectRepoSignals(targetDir),
    items,
  };
}

export function planDevBootstrap(options: PlanInstallOptions = {}): DevBootstrapPlan {
  const hubRoot = options.hubRoot || HUB_ROOT;
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(hubRoot);
  const install = planInstall({ ...options, hubRoot, targetDir, index });
  const harnessComponent = index.components[HARNESS_COMPONENT_ID];
  if (!harnessComponent) {
    throw new Error(`Missing harness component metadata: ${HARNESS_COMPONENT_ID}`);
  }
  if (harnessComponent.kind !== 'harness-template') {
    throw new Error(`${HARNESS_COMPONENT_ID} must be kind harness-template.`);
  }

  const sourceRoot = componentSourcePath(hubRoot, harnessComponent);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Harness template source does not exist: ${harnessComponent.path}`);
  }

  const harnessFiles = listHarnessTemplateFiles(hubRoot, harnessComponent)
    .map((file) => {
      const dest = assertSafeRelativePath(targetDir, file.relativePath);
      const size = fs.statSync(file.sourceFile).size;
      return {
        relativePath: file.relativePath,
        source: file.sourceFile,
        dest,
        exists: fs.existsSync(dest),
        size,
        sizeLimit: HARNESS_SIZE_LIMITS[file.relativePath],
      };
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const dirtyWorktree = detectDirtyWorktree(targetDir);
  const blockers = collectHarnessBlockers(targetDir, harnessFiles, dirtyWorktree);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: index.version,
    targetDir,
    agents: install.agents,
    install,
    harnessComponentId: HARNESS_COMPONENT_ID,
    harnessVersion: harnessComponent.version,
    harnessFiles,
    dirtyWorktree,
    blockers,
    validationCommand: 'node scripts/harness-validate.mjs',
  };
}

export function applyDevBootstrap(
  plan: DevBootstrapPlan,
  options: { yes?: boolean; force?: boolean; overwrite?: boolean } = {},
): DevBootstrapResult {
  if (!options.yes) {
    return makeDevBootstrapResult(plan, {
      exitCode: 2,
      installed: [],
      skipped: [],
      harnessFilesWritten: [],
      lock: null,
      report: null,
      validation: null,
      reason: 'Use --yes to confirm non-interactive dev bootstrap or --dry-run to preview.',
    });
  }

  const refreshedPlan = refreshDevBootstrapPlan(plan);
  const forceOverridable = new Set<HarnessBlockerCode>(['dirty-worktree', 'existing-file']);
  const blockers = options.force
    ? refreshedPlan.blockers.filter((blocker) => !forceOverridable.has(blocker.code))
    : refreshedPlan.blockers;
  if (blockers.length > 0) {
    return makeDevBootstrapResult({ ...refreshedPlan, blockers }, {
      exitCode: 3,
      installed: [],
      skipped: [],
      harnessFilesWritten: [],
      lock: null,
      report: null,
      validation: null,
      reason: 'Dev bootstrap blocked by dirty worktree or existing harness files.',
    });
  }

  const installResult = applyInstall(refreshedPlan.install, { overwrite: options.overwrite });
  const harnessFilesWritten: string[] = [];
  for (const file of refreshedPlan.harnessFiles) {
    const localState = harnessFileRole(file.relativePath) === 'local-state';
    if (!(localState && fs.existsSync(file.dest))) {
      fs.mkdirSync(path.dirname(file.dest), { recursive: true });
      fs.copyFileSync(file.source, file.dest);
    }
    harnessFilesWritten.push(file.relativePath);
  }

  const lock = readLock(refreshedPlan.targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('Expected schema version 2 lock after skill installation.');
  }

  const index = readCapabilityIndex();
  const harnessComponent = index.components[refreshedPlan.harnessComponentId];
  if (!harnessComponent) {
    throw new Error(`Missing harness component metadata: ${refreshedPlan.harnessComponentId}`);
  }
  const installedAt = new Date().toISOString();
  const harnessRecord: ManagedComponentRecord = {
    id: refreshedPlan.harnessComponentId,
    version: harnessComponent.version,
    agent: 'standard',
    kind: harnessComponent.kind,
    source: harnessComponent.path,
    dest: HARNESS_DEST,
    files: collectManagedFilesForRelativePaths(refreshedPlan.targetDir, harnessFilesWritten),
    installedAt,
    status: 'installed',
  };
  const nextLock: HarnessHubLockV2 = {
    ...lock.data,
    generatedAt: installedAt,
    hubVersion: refreshedPlan.hubVersion,
    components: [
      ...lock.data.components.filter((component) => component.id !== refreshedPlan.harnessComponentId),
      harnessRecord,
    ].sort((left, right) => left.id.localeCompare(right.id) || left.dest.localeCompare(right.dest)),
  };
  const writtenLock = writeLockData(refreshedPlan.targetDir, nextLock);
  const validation = validateHarness(refreshedPlan.targetDir);

  return makeDevBootstrapResult(refreshedPlan, {
    exitCode: validation.exitCode,
    installed: installResult.installed,
    skipped: installResult.skipped,
    harnessFilesWritten,
    lock: writtenLock,
    report: installResult.report,
    validation,
    reason: validation.exitCode === 0
      ? 'Dev bootstrap completed and harness validation passed.'
      : 'Dev bootstrap completed but harness validation failed.',
  });
}

function refreshDevBootstrapPlan(plan: DevBootstrapPlan): DevBootstrapPlan {
  const harnessFiles = plan.harnessFiles.map((file) => ({
    ...file,
    exists: fs.existsSync(file.dest),
  }));
  const dirtyWorktree = detectDirtyWorktree(plan.targetDir);
  return {
    ...plan,
    harnessFiles,
    dirtyWorktree,
    blockers: collectHarnessBlockers(plan.targetDir, harnessFiles, dirtyWorktree),
  };
}

function collectHarnessBlockers(
  targetDir: string,
  harnessFiles: HarnessFilePlan[],
  dirtyWorktree: DirtyWorktreePath[],
): HarnessBlocker[] {
  return [
    ...dirtyWorktree.map((entry) => ({
      code: 'dirty-worktree' as const,
      path: entry.path,
      status: entry.status,
      reason: `Target git worktree has uncommitted changes at ${entry.path}.`,
    })),
    ...harnessFiles
      .filter((file) => file.exists && harnessFileRole(file.relativePath) !== 'local-state')
      .map((file) => ({
        code: 'existing-file' as const,
        path: file.relativePath,
        reason: `Harness destination already exists: ${file.relativePath}.`,
      })),
    ...NON_CODEX_PLATFORM_FILES
      .filter((relativePath) => fs.existsSync(path.join(targetDir, relativePath)))
      .map((relativePath) => ({
        code: 'non-codex-platform-file' as const,
        path: relativePath,
        reason: `Non-Codex platform instruction file already exists: ${relativePath}.`,
      })),
  ].sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
}

function makeDevBootstrapResult(
  plan: DevBootstrapPlan,
  result: Pick<DevBootstrapResult, 'exitCode' | 'installed' | 'skipped' | 'harnessFilesWritten' | 'lock' | 'report' | 'validation' | 'reason'>,
): DevBootstrapResult {
  return { ...plan, ...result };
}

function collectManagedFilesForRelativePaths(targetDir: string, relativePaths: string[]): ManagedFileRecord[] {
  return relativePaths
    .map((relativePath) => {
      const filePath = assertSafeRelativePath(targetDir, relativePath);
      const bytes = fs.readFileSync(filePath);
      const normalized = normalizePortablePath(relativePath);
      const role = harnessFileRole(normalized);
      return {
        path: normalized,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        size: bytes.byteLength,
        ...(role ? { role } : {}),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function detectDirtyWorktree(targetDir: string): DirtyWorktreePath[] {
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }

  const output = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: targetDir,
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const cleanPath = rawPath.includes(' -> ')
        ? rawPath.split(' -> ').at(-1) || rawPath
        : rawPath;
      return { status, path: normalizePortablePath(cleanPath.replace(/^"|"$/g, '')) };
    })
    .filter((entry) => !(entry.status === '??' && isUntrackedHarnessRuntimePath(entry.path)))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function isUntrackedHarnessRuntimePath(relativePath: string): boolean {
  const normalized = normalizePortablePath(relativePath);
  return normalized.startsWith('.harness-hub/state/')
    || normalized.startsWith('.harness-hub/reports/');
}

export function validateHarness(targetDirInput: string): HarnessValidationResult {
  const targetDir = path.resolve(targetDirInput);
  const index = readCapabilityIndex();
  const { id, component } = getMinimalHarnessComponent(index);
  const requiredFiles = listHarnessTemplateFiles(HUB_ROOT, component).map((file) => file.relativePath);
  const managedFiles = getManagedFilePaths(readLock(targetDir), id);
  const present = requiredFiles.filter((relativePath) => safeRelativePathExists(targetDir, relativePath)).sort();
  const missing = requiredFiles.filter((relativePath) => !present.includes(relativePath)).sort();
  const managed = present.filter((relativePath) => managedFiles.has(relativePath)).sort();
  const checks: HarnessValidationCheck[] = [];

  for (const relativePath of requiredFiles) {
    const exists = fs.existsSync(path.join(targetDir, relativePath));
    checks.push({
      code: 'required-file',
      state: exists ? 'pass' : 'fail',
      path: relativePath,
      reason: exists ? 'Required harness file exists.' : 'Required harness file is missing.',
    });
  }

  for (const relativePath of NON_CODEX_PLATFORM_FILES) {
    const exists = fs.existsSync(path.join(targetDir, relativePath));
    checks.push({
      code: 'codex-only',
      state: exists ? 'fail' : 'pass',
      path: relativePath,
      reason: exists ? 'Non-Codex platform instruction file is present.' : 'No non-Codex platform instruction file detected.',
    });
  }

  for (const [relativePath, limit] of Object.entries(HARNESS_SIZE_LIMITS)) {
    const filePath = path.join(targetDir, relativePath);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const size = fs.statSync(filePath).size;
    checks.push({
      code: 'file-size',
      state: size <= limit ? 'pass' : 'fail',
      path: relativePath,
      size,
      limit,
      reason: size <= limit
        ? 'Current-state file is within the configured size limit.'
        : 'Current-state file exceeds the configured size limit and should be summarized or archived.',
    });
  }

  checks.push(...validateRequiredContent(targetDir));
  const failures = checks.filter((check) => check.state === 'fail');
  const assessment = assessHarness(targetDir);
  const benchmark = benchmarkHarness({
    assessment,
    checks,
    managed,
    requiredFiles,
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    targetDir,
    exitCode: failures.length > 0 ? 3 : 0,
    componentId: id,
    requiredFiles,
    present,
    missing,
    managed,
    checks,
    assessment,
    benchmark,
    reason: failures.length > 0
      ? `${failures.length} harness validation checks failed.`
      : 'Harness validation passed.',
  };
}

function assessHarness(targetDir: string): HarnessAssessment {
  const files = loadHarnessAssessmentFiles(targetDir);
  const project = detectHarnessProject(targetDir, files);
  const text = (relativePath: string): string => files.get(relativePath) || '';
  const agents = text('AGENTS.md') || text('CLAUDE.md');
  const featureList = text('feature_list.json') || text('feature-list.json');
  const decisions = text('.harness-hub/state/decisions.md');
  const progress = text('.harness-hub/state/progress.md');
  const handoff = text('.harness-hub/state/session-handoff.md');
  const currentTask = text('.harness-hub/state/current-task.md');
  const validationScript = text('scripts/harness-validate.mjs') || text('init.sh');
  const definitionOfDone = text('definition-of-done.md');
  const cleanState = text('clean-state-checklist.md');
  const allText = [...files.entries()].map(([relativePath, content]) => `${relativePath}\n${content}`).join('\n\n');

  const subsystemChecks: Record<HarnessSubsystemName, HarnessAssessmentCheck[]> = {
    instructions: [
      assessmentFileCheck(files, ['AGENTS.md', 'CLAUDE.md'], 'Agent instruction file exists'),
      assessmentTextCheck(agents, ['Operating Rules', 'Startup Workflow', 'Before writing code', 'Start from'], 'Startup or operating workflow is documented'),
      assessmentTextCheck(agents + definitionOfDone, ['Required Handoff', 'Definition of Done', 'done only when', 'handoff'], 'Completion or handoff gate is documented'),
      assessmentTextCheck(agents + currentTask, ['harness-validate.mjs', 'Validation commands', 'test', 'verify'], 'Verification command is discoverable'),
      assessmentTextCheck(agents, ['feature_list.json', '.harness-hub/state/progress.md', '.harness-hub/state/decisions.md', '.harness-hub/state/session-handoff.md', '.harness-hub/state/current-task.md'], 'State artifacts are routed from instructions'),
    ],
    state: [
      assessmentFileCheck(files, ['feature_list.json', 'feature-list.json'], 'Feature tracker exists'),
      assessmentFeatureListCheck(featureList, 'Feature tracker is valid and has required structure'),
      assessmentFileCheck(files, ['.harness-hub/state/decisions.md'], 'Decision log exists'),
      assessmentTextCheck(decisions, ['Active Decisions', 'Resolved Decisions', 'Decision', 'Rationale', 'Status', 'Follow-up'], 'Decision log captures rationale and status'),
      assessmentFileCheck(files, ['.harness-hub/state/progress.md'], 'Progress log exists'),
      assessmentTextCheck(progress, ['Current State', 'Recent Validation', 'Blockers', 'Next'], 'Progress log supports restart'),
      assessmentTextCheck(handoff, ['Current Status', 'Changed Files', 'Validation Evidence', 'Blockers', 'Next Action'], 'Handoff captures status, files, evidence, blockers, and next action'),
    ],
    verification: [
      assessmentFileCheck(files, ['scripts/harness-validate.mjs', 'init.sh'], 'Verification entrypoint exists'),
      assessmentTextCheck(agents + currentTask, ['harness-validate.mjs', 'Validation commands'], 'Verification entrypoint is referenced by the harness'),
      assessmentTextCheck(validationScript, ['process.exit', 'set -e', 'failures'], 'Verification entrypoint can fail the run'),
      assessmentTextCheck(progress + handoff + currentTask, ['Validation Evidence', 'Recent Validation', 'command', 'output'], 'Validation evidence has a durable place to be recorded'),
      assessmentCheck(project.verificationCommands.length > 0, 'Project verification command is detected', project.verificationCommands),
    ],
    scope: [
      assessmentTextCheck(agents + currentTask, ['one git worktree', 'one feature', 'Allowed paths', 'Forbidden paths'], 'Work is scoped to a task, branch, worktree, or allowed paths'),
      assessmentTextCheck(currentTask, ['Allowed paths', 'Forbidden paths'], 'Allowed and forbidden paths are explicit'),
      assessmentTextCheck(currentTask + definitionOfDone, ['Acceptance criteria', 'Definition of Done'], 'Acceptance or done criteria are explicit'),
      assessmentTextCheck(decisions + currentTask, ['Decision log', 'decision-level', 'Rationale', 'Status'], 'Decision boundary is documented'),
      assessmentTextCheck(agents + currentTask + featureList, ['Parallel writes', 'parallel_write_policy', 'non-overlapping'], 'Parallel write boundary is documented'),
      assessmentCheck(files.has('feature_list.json') || files.has('feature-list.json'), 'Feature state provides a scope inventory', ['feature_list.json']),
    ],
    lifecycle: [
      assessmentTextCheck(agents + currentTask, ['Start from', 'Current Task', '.harness-hub/state/current-task.md'], 'Startup path points to the active task'),
      assessmentFileCheck(files, ['.harness-hub/state/session-handoff.md'], 'Session handoff template exists'),
      assessmentTextCheck(progress + decisions + handoff, ['Current Status', 'Current State', 'Next Action', 'Recommended Next Step', 'Active Decisions'], 'Session restart markers exist'),
      assessmentFileCheck(files, ['clean-state-checklist.md', 'definition-of-done.md'], 'Clean state and done guidance exists'),
      assessmentTextCheck(agents + currentTask, ['Update `.harness-hub/state/progress.md`', 'Update `.harness-hub/state/decisions.md`', 'Update `.harness-hub/state/session-handoff.md`', 'handoff'], 'End-of-session update routine is explicit'),
    ],
  };

  const subsystems = {} as Record<HarnessSubsystemName, HarnessSubsystemAssessment>;
  for (const name of HARNESS_SUBSYSTEMS) {
    const checks = subsystemChecks[name];
    const passed = checks.filter((check) => check.pass).length;
    subsystems[name] = {
      score: Math.max(1, Math.round((passed / checks.length) * 5)),
      passed,
      total: checks.length,
      checks,
    };
  }

  const total = HARNESS_SUBSYSTEMS.reduce((sum, name) => sum + subsystems[name].score, 0);
  const bottleneck = [...HARNESS_SUBSYSTEMS].sort((left, right) => subsystems[left].score - subsystems[right].score)[0];
  return {
    overall: Math.round((total / (HARNESS_SUBSYSTEMS.length * 5)) * 100),
    bottleneck,
    project,
    subsystems,
  };
}

function benchmarkHarness({
  assessment,
  checks,
  managed,
  requiredFiles,
}: {
  assessment: HarnessAssessment;
  checks: HarnessValidationCheck[];
  managed: string[];
  requiredFiles: string[];
}): HarnessBenchmark {
  const failedChecks = checks.filter((check) => check.state === 'fail');
  const benchmarkChecks: HarnessBenchmarkCheck[] = [
    {
      pass: failedChecks.length === 0,
      message: 'Minimal harness validation passes',
    },
    {
      pass: assessment.overall >= 70,
      message: 'Five-subsystem assessment reaches the 70/100 structural threshold',
    },
    {
      pass: HARNESS_SUBSYSTEMS.every((name) => assessment.subsystems[name].score >= 3),
      message: 'No subsystem scores below 3/5',
    },
    {
      pass: managed.length >= requiredFiles.length,
      message: 'All required harness files are lock-managed',
    },
    {
      pass: assessment.project.verificationCommands.length > 0,
      message: 'Project verification command is detected',
    },
    {
      pass: !checks.some((check) => check.code === 'codex-only' && check.state === 'fail'),
      message: 'No non-Codex platform instruction file conflicts with this harness',
    },
    {
      pass: !checks.some((check) => check.code === 'file-size' && check.state === 'fail'),
      message: 'Current-state files stay within configured size limits',
    },
    {
      pass: checks.some((check) => check.code === 'structured-content' && check.state === 'pass'),
      message: 'Feature state JSON is structurally valid',
    },
    {
      pass: checks.some((check) => check.path === '.harness-hub/state/current-task.md' && check.state === 'pass'),
      message: 'Goal-ready current task markers are present',
    },
    {
      pass: HARNESS_SUBSYSTEMS.every((name) => assessment.subsystems[name].checks.length > 0),
      message: 'Report covers all five harness subsystems',
    },
  ];
  const passed = benchmarkChecks.filter((check) => check.pass).length;
  const score = Math.round((passed / benchmarkChecks.length) * 100);
  return {
    score,
    passed,
    total: benchmarkChecks.length,
    checks: benchmarkChecks,
    recommendation: recommendHarnessBenchmark(assessment, score, failedChecks),
  };
}

function recommendHarnessBenchmark(
  assessment: HarnessAssessment,
  benchmarkScore: number,
  failedChecks: HarnessValidationCheck[],
): string {
  if (failedChecks.length > 0) {
    return 'Fix failing minimal validation checks before treating the harness as ready.';
  }
  if (assessment.overall >= 85 && benchmarkScore >= 90) {
    return 'Ready for realistic before/after agent-session benchmarking.';
  }
  if (assessment.overall < 70) {
    return `Improve the ${assessment.bottleneck} subsystem before benchmarking agent behavior.`;
  }
  return 'Usable, with structural gaps worth tightening after first real sessions.';
}

function loadHarnessAssessmentFiles(targetDir: string): Map<string, string> {
  const candidates = [
    'AGENTS.md',
    'CLAUDE.md',
    'feature_list.json',
    'feature-list.json',
    '.harness-hub/.gitignore',
    '.harness-hub/state/decisions.md',
    '.harness-hub/state/progress.md',
    '.harness-hub/state/session-handoff.md',
    'clean-state-checklist.md',
    'definition-of-done.md',
    '.harness-hub/state/current-task.md',
    'scripts/harness-validate.mjs',
    'init.sh',
  ];
  const files = new Map<string, string>();
  for (const relativePath of candidates) {
    const filePath = path.join(targetDir, relativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      files.set(relativePath, fs.readFileSync(filePath, 'utf8'));
    }
  }
  return files;
}

function assessmentFileCheck(files: Map<string, string>, names: string[], message: string): HarnessAssessmentCheck {
  return assessmentCheck(names.some((name) => files.has(name)), message, names);
}

function assessmentTextCheck(text: string, needles: string[], message: string): HarnessAssessmentCheck {
  const lower = text.toLowerCase();
  return assessmentCheck(
    needles.some((needle) => lower.includes(needle.toLowerCase())),
    message,
    needles,
  );
}

function assessmentFeatureListCheck(text: string, message: string): HarnessAssessmentCheck {
  try {
    const parsed = JSON.parse(text) as unknown;
    const pass = isRecord(parsed)
      && Array.isArray(parsed.features)
      && isRecord(parsed.parallel_write_policy);
    return assessmentCheck(pass, message, ['features array', 'parallel_write_policy object']);
  } catch {
    return assessmentCheck(false, message, ['valid JSON']);
  }
}

function assessmentCheck(pass: boolean, message: string, evidence: string[] = []): HarnessAssessmentCheck {
  return { pass, message, evidence };
}

function detectHarnessProject(targetDir: string, harnessFiles: Map<string, string>): HarnessProjectDetection {
  const files = listProjectFilesBounded(targetDir, 800);
  const has = (name: string): boolean => files.some((file) => file === name || file.endsWith(`/${name}`));
  const hasPrefix = (prefix: string): boolean => files.some((file) => file.startsWith(prefix));
  const packageJson = readPackageJsonForDetection(targetDir);
  const packageManager = detectPackageManagerForHarness(targetDir, packageJson !== null);
  const evidence: string[] = [];
  let stack = 'generic';

  if (packageJson) {
    evidence.push('package.json');
    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };
    if ('react' in deps || hasPrefix('src/renderer')) {
      stack = 'typescript-react';
    } else if ('typescript' in deps || has('tsconfig.json')) {
      stack = 'typescript';
    } else {
      stack = 'node';
    }
  } else if (has('pyproject.toml') || has('requirements.txt')) {
    stack = 'python';
    evidence.push(has('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt');
  } else if (has('go.mod')) {
    stack = 'go';
    evidence.push('go.mod');
  } else if (has('Cargo.toml')) {
    stack = 'rust';
    evidence.push('Cargo.toml');
  } else if (has('pom.xml')) {
    stack = 'java-maven';
    evidence.push('pom.xml');
  } else if (has('build.gradle') || has('build.gradle.kts')) {
    stack = 'java-gradle';
    evidence.push(has('build.gradle') ? 'build.gradle' : 'build.gradle.kts');
  } else if (files.some((file) => file.endsWith('.csproj') || file.endsWith('.sln'))) {
    stack = 'dotnet';
    evidence.push(files.find((file) => file.endsWith('.csproj') || file.endsWith('.sln')) || '.NET project');
  }

  if (harnessFiles.has('scripts/harness-validate.mjs')) {
    evidence.push('scripts/harness-validate.mjs');
  }

  return {
    stack,
    packageManager,
    verificationCommands: verificationCommandsForHarnessProject(stack, packageJson, packageManager, harnessFiles),
    evidence,
  };
}

function readPackageJsonForDetection(targetDir: string): {
  scripts?: Record<string, string>;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
} | null {
  const packagePath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
  } catch {
    return null;
  }
}

function detectPackageManagerForHarness(targetDir: string, hasPackageJson: boolean): string | null {
  if (fs.existsSync(path.join(targetDir, 'bun.lockb')) || fs.existsSync(path.join(targetDir, 'bun.lock'))) {
    return 'bun';
  }
  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (hasPackageJson) {
    return 'npm';
  }
  return null;
}

function verificationCommandsForHarnessProject(
  stack: string,
  packageJson: { scripts?: Record<string, string> } | null,
  packageManager: string | null,
  harnessFiles: Map<string, string>,
): string[] {
  if (stack === 'python') {
    return ['python -m pytest', 'python -m compileall .'];
  }
  if (stack === 'go') {
    return ['go test ./...'];
  }
  if (stack === 'rust') {
    return ['cargo test'];
  }
  if (stack === 'java-maven') {
    return ['mvn test'];
  }
  if (stack === 'java-gradle') {
    return ['./gradlew test'];
  }
  if (stack === 'dotnet') {
    return ['dotnet test'];
  }
  if (packageJson) {
    const pm = packageManager || 'npm';
    const scripts = packageJson.scripts || {};
    const run = (script: string): string => {
      if (pm === 'npm') {
        return script === 'test' ? 'npm test' : `npm run ${script}`;
      }
      if (pm === 'yarn') {
        return `yarn ${script}`;
      }
      return `${pm} run ${script}`;
    };
    const install = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn install' : `${pm} install`;
    return dedupe([
      install,
      scripts.check ? run('check') : null,
      scripts.typecheck ? run('typecheck') : null,
      scripts['type-check'] ? run('type-check') : null,
      scripts.lint ? run('lint') : null,
      scripts.test ? run('test') : null,
      scripts.build ? run('build') : null,
      scripts.validate ? run('validate') : null,
    ].filter((command): command is string => Boolean(command)));
  }
  if (harnessFiles.has('scripts/harness-validate.mjs')) {
    return ['node scripts/harness-validate.mjs'];
  }
  return [];
}

function listProjectFilesBounded(targetDir: string, maxFiles: number): string[] {
  const ignored = new Set([
    '.git',
    '.skill-hub',
    '.codex',
    '.claude-plugin',
    'skills',
    'node_modules',
    'dist',
    'build',
    '.next',
    '.venv',
    'venv',
    '__pycache__',
  ]);
  const files: string[] = [];
  const walk = (current: string, relative: string): void => {
    if (files.length >= maxFiles) {
      return;
    }
    let entries: Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles || ignored.has(entry.name)) {
        continue;
      }
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, rel);
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
  };
  walk(targetDir, '');
  return files.sort();
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function validateRequiredContent(targetDir: string): HarnessValidationCheck[] {
  const checks: HarnessValidationCheck[] = [];
  checks.push(validateFileContains(targetDir, 'AGENTS.md', ['Codex', 'worktree', 'decisions.md', 'session-handoff']));
  checks.push(validateFileContains(targetDir, '.harness-hub/.gitignore', ['state/', 'reports/']));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/decisions.md', [
    'Active Decisions',
    'Resolved Decisions',
    'Decision',
    'Rationale',
    'Status',
    'Follow-up',
  ]));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/current-task.md', [
    'Goal',
    'Allowed paths',
    'Forbidden paths',
    'Validation commands',
    'Spec updates',
    'Decision log',
    'Parallel writes',
    'Handoff requirements',
  ]));
  checks.push(validateFeatureListJson(targetDir));
  checks.push(validateQaBoundary(targetDir));
  checks.push(validateAgentArchitectureBoundary(targetDir));
  checks.push(validateSkillTriggerHygiene(targetDir));
  return checks;
}

function validateQaBoundary(targetDir: string): HarnessValidationCheck {
  const relativePath = '.harness-hub/state/current-task.md';
  const markers = [
    'Goal',
    'Assumptions',
    'Non-goals',
    'Allowed paths',
    'Forbidden paths',
    'Acceptance criteria',
    'Validation commands',
    'Handoff requirements',
  ];
  return validateFileContainsWithCode(
    targetDir,
    relativePath,
    markers,
    'qa-boundary',
    'Task QA boundary markers are present.',
    'Missing task QA boundary markers',
  );
}

function validateAgentArchitectureBoundary(targetDir: string): HarnessValidationCheck {
  const markers = [
    'worktree_policy',
    'parallel_write_policy',
    'read_only_parallel_work',
    'single integration review point',
    'non-overlapping',
  ];
  const sources = ['AGENTS.md', '.harness-hub/state/current-task.md', 'feature_list.json'];
  const content = sources
    .map((relativePath) => {
      const filePath = path.join(targetDir, relativePath);
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    })
    .join('\n');
  const missing = markers.filter((marker) => !content.includes(marker));
  return {
    code: 'agent-architecture',
    state: missing.length === 0 ? 'pass' : 'fail',
    path: 'AGENTS.md',
    reason: missing.length === 0
      ? 'Agent architecture and parallel-work boundaries are documented.'
      : `Missing agent architecture boundary markers: ${missing.join(', ')}.`,
    evidence: markers,
  };
}

function validateSkillTriggerHygiene(targetDir: string): HarnessValidationCheck {
  const skillsDir = path.join(targetDir, 'skills');
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return {
      code: 'trigger-hygiene',
      state: 'pass',
      path: 'skills',
      reason: 'No installed skill tree found; trigger hygiene has no skill descriptions to audit.',
      evidence: ['description frontmatter'],
    };
  }

  const issues: string[] = [];
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const skillName of skillDirs) {
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      continue;
    }
    const description = parseSkillDescription(fs.readFileSync(skillPath, 'utf8'));
    if (!description) {
      issues.push(`${skillName}: missing description`);
      continue;
    }
    if (!/(load when|use when|when|asks|needs|requests|trigger)/i.test(description)) {
      issues.push(`${skillName}: description lacks an activation condition`);
    }
    if (/(always use|every request|all requests|all tasks|any task|whenever possible)/i.test(description)) {
      issues.push(`${skillName}: description uses broad activation wording`);
    }
  }

  return {
    code: 'trigger-hygiene',
    state: issues.length === 0 ? 'pass' : 'fail',
    path: 'skills',
    reason: issues.length === 0
      ? 'Installed skill descriptions have bounded activation conditions.'
      : `Skill trigger hygiene issues detected: ${issues.slice(0, 8).join('; ')}${issues.length > 8 ? `; +${issues.length - 8} more` : ''}.`,
    evidence: issues.length === 0 ? [`${skillDirs.length} skills scanned`] : issues.slice(0, 8),
  };
}

function parseSkillDescription(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }
  const descriptionMatch = match[1].match(/^description:\s*(.+)$/m);
  return descriptionMatch ? descriptionMatch[1].replace(/^['"]|['"]$/g, '').trim() : null;
}

function validateFeatureListJson(targetDir: string): HarnessValidationCheck {
  const relativePath = 'feature_list.json';
  const filePath = path.join(targetDir, relativePath);
  const evidence = ['features array', 'parallel_write_policy object'];
  if (!fs.existsSync(filePath)) {
    return {
      code: 'structured-content',
      state: 'fail',
      path: relativePath,
      reason: 'Feature state JSON could not be checked because the file is missing.',
      evidence,
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {
      code: 'structured-content',
      state: 'fail',
      path: relativePath,
      reason: 'Feature state must be valid JSON.',
      evidence,
    };
  }

  const missing: string[] = [];
  if (!isRecord(data) || !Array.isArray(data.features)) {
    missing.push('features array');
  }
  if (!isRecord(data) || !isRecord(data.parallel_write_policy)) {
    missing.push('parallel_write_policy object');
  }

  return {
    code: 'structured-content',
    state: missing.length === 0 ? 'pass' : 'fail',
    path: relativePath,
    reason: missing.length === 0
      ? 'Feature state JSON has the required structure.'
      : `Feature state JSON is missing required structure: ${missing.join(', ')}.`,
    evidence,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFileContains(targetDir: string, relativePath: string, markers: string[]): HarnessValidationCheck {
  return validateFileContainsWithCode(
    targetDir,
    relativePath,
    markers,
    'required-content',
    'Required harness guidance markers are present.',
    'Missing required harness guidance markers',
  );
}

function validateFileContainsWithCode(
  targetDir: string,
  relativePath: string,
  markers: string[],
  code: HarnessValidationCheck['code'],
  passReason: string,
  failReasonPrefix: string,
): HarnessValidationCheck {
  const filePath = path.join(targetDir, relativePath);
  if (!fs.existsSync(filePath)) {
    return {
      code,
      state: 'fail',
      path: relativePath,
      reason: 'Required content could not be checked because the file is missing.',
      evidence: markers,
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const missing = markers.filter((marker) => !content.includes(marker));
  return {
    code,
    state: missing.length === 0 ? 'pass' : 'fail',
    path: relativePath,
    reason: missing.length === 0
      ? passReason
      : `${failReasonPrefix}: ${missing.join(', ')}.`,
    evidence: markers,
  };
}

export function createInsightPost(
  input: InsightPostInput,
  options: { repoRoot?: string; slug?: string; writeInvalid?: boolean } = {},
): InsightPostResult {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const slug = resolveInsightSlug(input, options.slug);
  const postDir = assertSafeRelativePath(repoRoot, path.posix.join(INSIGHT_POSTS_ROOT, slug));
  const postJsonPath = path.join(postDir, 'post.json');
  const sourceLedgerPath = path.join(postDir, 'source-ledger.json');
  const effectiveInteractInputPath = path.join(postDir, 'effective-interact.input.json');
  const htmlPath = path.join(postDir, 'index.html');
  const validation = validateInsightPostInput(input, repoRoot);
  const generatedAt = new Date().toISOString();

  if (validation.exitCode !== 0) {
    return {
      schemaVersion: 1,
      generatedAt,
      repoRoot,
      slug,
      postDir,
      postJsonPath,
      sourceLedgerPath,
      effectiveInteractInputPath,
      htmlPath,
      validation,
      reason: 'Insight post generation skipped because source validation failed.',
    };
  }

  fs.mkdirSync(postDir, { recursive: true });
  const post = { ...input, slug };
  writeJsonFile(postJsonPath, post);
  writeJsonFile(sourceLedgerPath, buildInsightSourceLedger(post, slug, generatedAt));
  writeJsonFile(effectiveInteractInputPath, adaptInsightToEffectiveInteract(post, slug, generatedAt));

  execFileSync(process.execPath, [
    path.join(HUB_ROOT, 'skills', 'effective-interact', 'scripts', 'create-interaction.mjs'),
    '--input',
    effectiveInteractInputPath,
    '--out-dir',
    postDir,
    '--slug',
    'index',
    '--json',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return {
    schemaVersion: 1,
    generatedAt,
    repoRoot,
    slug,
    postDir,
    postJsonPath,
    sourceLedgerPath,
    effectiveInteractInputPath,
    htmlPath,
    validation,
    reason: 'Insight post generated from structured source truth.',
  };
}

export function buildInsightSite(options: { repoRoot?: string } = {}): InsightBuildResult {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const siteDir = assertSafeRelativePath(repoRoot, INSIGHT_SITE_ROOT);
  const insightsDir = assertSafeRelativePath(repoRoot, 'site/insights');
  const posts = collectInsightPostSummaries(repoRoot);
  const files = [
    path.join(siteDir, 'index.html'),
    path.join(insightsDir, 'index.html'),
    path.join(insightsDir, 'index.json'),
  ];

  fs.mkdirSync(insightsDir, { recursive: true });
  writeJsonFile(path.join(insightsDir, 'index.json'), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    posts,
  });
  fs.writeFileSync(path.join(insightsDir, 'index.html'), renderInsightsIndexHtml(posts), 'utf8');
  fs.writeFileSync(path.join(siteDir, 'index.html'), renderSiteHomeHtml(posts), 'utf8');

  const validation = validateInsightSite({ repoRoot });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repoRoot,
    siteDir,
    posts,
    files,
    validation,
    exitCode: validation.exitCode,
    reason: validation.exitCode === 0
      ? 'Insight site indexes are ready for GitHub Pages.'
      : 'Insight site indexes were written, but validation failed.',
  };
}

export function validateInsightSite(options: { repoRoot?: string } = {}): InsightValidationResult {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const siteDir = path.join(repoRoot, INSIGHT_SITE_ROOT);
  const checks: InsightValidationCheck[] = [];
  const requiredIndexes = ['site/index.html', 'site/insights/index.html', 'site/insights/index.json'];

  for (const relativePath of requiredIndexes) {
    const filePath = path.join(repoRoot, relativePath);
    checks.push({
      code: 'site-index',
      state: fs.existsSync(filePath) ? 'pass' : 'fail',
      path: relativePath,
      reason: fs.existsSync(filePath)
        ? 'Public site index file exists.'
        : 'Public site index file is missing; run insight-build first.',
    });
  }

  checks.push(validatePublicArtifactBoundary(repoRoot));

  for (const postDir of listInsightPostDirs(repoRoot)) {
    const slug = path.basename(postDir);
    const postJsonPath = path.join(postDir, 'post.json');
    const sourceLedgerPath = path.join(postDir, 'source-ledger.json');
    const effectiveInteractInputPath = path.join(postDir, 'effective-interact.input.json');
    const htmlPath = path.join(postDir, 'index.html');
    const requiredPostFiles = [
      postJsonPath,
      sourceLedgerPath,
      effectiveInteractInputPath,
      htmlPath,
    ];

    for (const filePath of requiredPostFiles) {
      const relativePath = toPortablePath(path.relative(repoRoot, filePath));
      checks.push({
        code: 'post-file',
        state: fs.existsSync(filePath) ? 'pass' : 'fail',
        path: relativePath,
        reason: fs.existsSync(filePath)
          ? 'Required insight post file exists.'
          : `Required insight post file is missing for ${slug}.`,
      });
    }

    if (!fs.existsSync(postJsonPath)) {
      continue;
    }

    try {
      const post = readJsonFile<InsightPostInput>(postJsonPath);
      checks.push(...validateInsightPostInput(post, repoRoot).checks);
    } catch {
      checks.push({
        code: 'post-file',
        state: 'fail',
        path: toPortablePath(path.relative(repoRoot, postJsonPath)),
        reason: 'Insight post source JSON is not valid JSON.',
      });
    }

    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      checks.push({
        code: 'utf8',
        state: html.includes('<meta charset="utf-8">') ? 'pass' : 'fail',
        path: toPortablePath(path.relative(repoRoot, htmlPath)),
        reason: html.includes('<meta charset="utf-8">')
          ? 'Generated HTML declares UTF-8.'
          : 'Generated HTML must declare UTF-8.',
      });
    }
  }

  return makeInsightValidationResult(repoRoot, checks, 'Insight site validation');
}

export function publishInsightPreflight(
  options: { repoRoot?: string; dryRun?: boolean; allowDirty?: boolean } = {},
): InsightPreflightResult {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const mode: InsightPreflightResult['mode'] = options.dryRun === false ? 'publish' : 'dry-run';
  const checks: InsightValidationCheck[] = [];
  const siteValidation = validateInsightSite({ repoRoot });

  checks.push({
    code: 'workflow',
    state: fs.existsSync(path.join(repoRoot, INSIGHT_WORKFLOW_PATH)) ? 'pass' : 'fail',
    path: INSIGHT_WORKFLOW_PATH,
    reason: fs.existsSync(path.join(repoRoot, INSIGHT_WORKFLOW_PATH))
      ? 'GitHub Pages workflow exists.'
      : 'GitHub Pages workflow is missing.',
  });

  for (const relativePath of ['site/index.html', 'site/insights/index.html', 'site/insights/index.json']) {
    const filePath = path.join(repoRoot, relativePath);
    checks.push({
      code: 'pages-output',
      state: fs.existsSync(filePath) ? 'pass' : 'fail',
      path: relativePath,
      reason: fs.existsSync(filePath)
        ? 'GitHub Pages output file exists.'
        : 'GitHub Pages output file is missing; run insight-build first.',
    });
  }

  checks.push(...siteValidation.checks);
  checks.push(checkGitBranch(repoRoot));
  checks.push(checkInsightWorktree(repoRoot, options.allowDirty === true));

  const failures = checks.filter((check) => check.state === 'fail');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repoRoot,
    mode,
    exitCode: failures.length > 0 ? 3 : 0,
    checks,
    reason: failures.length > 0
      ? `${failures.length} insight publish preflight checks failed.`
      : 'Insight publish preflight passed.',
  };
}

function validateInsightPostInput(input: InsightPostInput, targetDir: string): InsightValidationResult {
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const sourceClaims = Array.isArray(input.sourceClaims) ? input.sourceClaims : [];
  const viewpoints = Array.isArray(input.viewpoints) ? input.viewpoints : [];
  const integration = Array.isArray(input.integration) ? input.integration : [];
  const projectMapping = Array.isArray(input.projectMapping) ? input.projectMapping : [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const claimIds = new Set(sourceClaims.map((claim) => claim.id));
  const checks: InsightValidationCheck[] = [];

  const requiredFieldsPresent = Boolean(
    input.title
    && input.date
    && input.summary
    && Array.isArray(input.sources)
    && Array.isArray(input.sourceClaims)
    && Array.isArray(input.viewpoints)
    && Array.isArray(input.integration)
    && Array.isArray(input.projectMapping)
    && isRecord(input.iterationRecord)
    && isRecord(input.actionBoundary),
  );
  checks.push({
    code: 'required-field',
    state: requiredFieldsPresent ? 'pass' : 'fail',
    path: 'post.json',
    reason: requiredFieldsPresent
      ? 'Required insight post fields are present.'
      : 'Insight post source is missing required fields.',
  });

  checks.push({
    code: 'utf8',
    state: hasLikelyMojibake(JSON.stringify(input)) ? 'fail' : 'pass',
    path: 'post.json',
    reason: hasLikelyMojibake(JSON.stringify(input))
      ? 'Insight post source contains likely mojibake; write files as UTF-8.'
      : 'Insight post source has no likely mojibake markers.',
  });

  const sourceAttributionOk = Array.isArray(input.sources)
    && sources.length > 0
    && sources.every((source) => Boolean(source.id && source.title && source.url && source.type && source.accessedAt));
  checks.push({
    code: 'source-attribution',
    state: sourceAttributionOk ? 'pass' : 'fail',
    path: 'sources',
    reason: sourceAttributionOk
      ? 'Every source has attribution metadata.'
      : 'Every post needs at least one source with id, title, url, type, and accessedAt.',
  });

  const unsafeLinks = sources.filter((source) => !isSafeHttpUrl(source.url));
  checks.push({
    code: 'source-link',
    state: unsafeLinks.length === 0 ? 'pass' : 'fail',
    path: 'sources[].url',
    reason: unsafeLinks.length === 0
      ? 'All source links use http or https.'
      : `Unsafe source links detected: ${unsafeLinks.map((source) => source.id || source.url).join(', ')}.`,
    evidence: unsafeLinks.map((source) => source.url),
  });

  const oversizedSources = sources
    .map((source) => ({ source, words: countWords(source.excerpt || '') }))
    .filter((entry) => entry.words > INSIGHT_SOURCE_EXCERPT_WORD_LIMIT);
  checks.push({
    code: 'source-size',
    state: oversizedSources.length === 0 ? 'pass' : 'fail',
    path: 'sources[].excerpt',
    reason: oversizedSources.length === 0
      ? 'Source excerpts stay within copyright-safe size limits.'
      : `Source excerpts exceed ${INSIGHT_SOURCE_EXCERPT_WORD_LIMIT} words: ${oversizedSources.map((entry) => entry.source.id).join(', ')}.`,
    size: oversizedSources[0]?.words,
    limit: INSIGHT_SOURCE_EXCERPT_WORD_LIMIT,
  });

  const validClaimKinds = new Set<InsightClaimKind>(['fact', 'inference', 'assumption', 'project-judgment']);
  const factInferenceOk = sourceClaims.length > 0
    && viewpoints.length > 0
    && sourceClaims.every((claim) => validClaimKinds.has(claim.kind));
  checks.push({
    code: 'fact-inference-separation',
    state: factInferenceOk ? 'pass' : 'fail',
    path: 'sourceClaims',
    reason: factInferenceOk
      ? 'Source claims and viewpoints keep explicit claim kinds and trace links.'
      : 'Insight posts must separate source-backed claims from viewpoint extraction with explicit claim kinds.',
  });

  const invalidClaimRefs = sourceClaims.filter((claim) => !sourceIds.has(claim.sourceId));
  const invalidViewpointRefs = viewpoints.flatMap((viewpoint) => (
    (viewpoint.sourceClaimIds || [])
      .filter((claimId) => !claimIds.has(claimId))
      .map((claimId) => `${viewpoint.id}:${claimId}`)
  ));
  checks.push({
    code: 'source-reference',
    state: invalidClaimRefs.length === 0 && invalidViewpointRefs.length === 0 ? 'pass' : 'fail',
    path: 'sourceClaims/viewpoints',
    reason: invalidClaimRefs.length === 0 && invalidViewpointRefs.length === 0
      ? 'Claims and viewpoints resolve to known sources.'
      : 'Claims or viewpoints reference missing source metadata.',
    evidence: [
      ...invalidClaimRefs.map((claim) => claim.id),
      ...invalidViewpointRefs,
    ],
  });

  if (requiredFieldsPresent && (integration.length === 0 || projectMapping.length === 0)) {
    checks.push({
      code: 'required-field',
      state: 'fail',
      path: 'integration/projectMapping',
      reason: 'Insight post source needs project integration and project mapping entries.',
    });
  }

  return makeInsightValidationResult(path.resolve(targetDir), checks, 'Insight post validation');
}

function makeInsightValidationResult(targetDir: string, checks: InsightValidationCheck[], label: string): InsightValidationResult {
  const failures = checks.filter((check) => check.state === 'fail');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    targetDir: path.resolve(targetDir),
    exitCode: failures.length > 0 ? 3 : 0,
    checks,
    reason: failures.length > 0 ? `${failures.length} ${label} checks failed.` : `${label} passed.`,
  };
}

function buildInsightSourceLedger(input: InsightPostInput, slug: string, generatedAt: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    slug,
    generatedAt,
    sourceOfTruth: 'post.json',
    excerptWordLimit: INSIGHT_SOURCE_EXCERPT_WORD_LIMIT,
    copyrightBoundary: 'Use short excerpts and project-specific analysis; do not archive or rewrite source articles.',
    sources: input.sources,
    sourceClaims: input.sourceClaims,
    viewpoints: input.viewpoints,
  };
}

function adaptInsightToEffectiveInteract(input: InsightPostInput, slug: string, generatedAt: string): Record<string, unknown> {
  return {
    title: input.title,
    summary: input.summary,
    status: 'draft',
    generatedAt,
    template: 'research-explainer',
    renderMode: 'fallback-only',
    intent: {
      audience: 'Harness Hub maintainer',
      primaryQuestion: 'How should external material change Harness Hub iteration?',
      decision: 'Publish source-backed project insight and iteration records.',
      artifactKind: 'research',
      successCriteria: [
        'Facts and inferences are separated.',
        'Every public claim links back to source metadata.',
        'Project actions are bounded to the current iteration.',
      ],
    },
    sections: [
      {
        type: 'markdown',
        title: 'Source Claims',
        group: 'evidence',
        status: 'info',
        content: formatSourceClaimsMarkdown(input),
      },
      {
        type: 'markdown',
        title: 'Viewpoint Extraction',
        group: 'main',
        status: 'info',
        content: formatViewpointsMarkdown(input),
      },
      {
        type: 'markdown',
        title: 'Project Mapping',
        group: 'impact',
        status: 'ready',
        content: formatProjectMappingMarkdown(input),
      },
      {
        type: 'markdown',
        title: 'Iteration Record',
        group: 'changes',
        status: 'ready',
        content: formatIterationRecordMarkdown(input.iterationRecord),
      },
      {
        type: 'markdown',
        title: 'Action Boundary',
        group: 'next',
        status: 'ready',
        content: formatActionBoundaryMarkdown(input.actionBoundary),
      },
    ],
    evidence: input.sources.map((source) => ({
      id: source.id,
      kind: 'source',
      label: source.title,
      value: source.notes || source.excerpt || source.title,
      status: 'info',
      sourceUrl: source.url,
      sourceTitle: source.title,
      sourceType: source.type,
      accessedAt: source.accessedAt,
      trustLevel: 'mixed-trust',
      knownLimits: [
        'Source text is used for attribution and bounded excerpts only.',
        `Canonical post slug: ${slug}`,
      ],
    })),
    claims: input.sourceClaims.map((claim) => ({
      id: claim.id,
      statement: `[${claim.kind}] ${claim.statement}`,
      kind: mapInsightClaimKind(claim.kind),
      evidenceIds: [claim.sourceId],
      confidence: claim.kind === 'fact' ? 'high' : 'medium',
      knownLimits: [`Original claim kind: ${claim.kind}`],
    })),
    nextActions: input.actionBoundary.now,
  };
}

function mapInsightClaimKind(kind: InsightClaimKind): string {
  if (kind === 'fact') return 'conclusion';
  if (kind === 'assumption') return 'assumption';
  if (kind === 'inference') return 'recommendation';
  return 'recommendation';
}

function formatSourceClaimsMarkdown(input: InsightPostInput): string {
  return input.sourceClaims
    .map((claim) => {
      const source = input.sources.find((item) => item.id === claim.sourceId);
      return `- **${claim.kind}** \`${claim.id}\`: ${claim.statement} Source: ${source ? `[${source.title}](${source.url})` : claim.sourceId}.`;
    })
    .join('\n');
}

function formatViewpointsMarkdown(input: InsightPostInput): string {
  const viewpoints = input.viewpoints.map((viewpoint) => (
    `- \`${viewpoint.id}\`: ${viewpoint.statement} Trace: ${viewpoint.sourceClaimIds.map((id) => `\`${id}\``).join(', ')}.`
  ));
  const assumptions = (input.assumptions || []).map((item) => `- Assumption: ${item}`);
  return [...viewpoints, ...assumptions].join('\n');
}

function formatProjectMappingMarkdown(input: InsightPostInput): string {
  return [
    ...input.integration.map((item) => `- Integration: ${item}`),
    ...input.projectMapping.map((item) => `- **${item.area}**: ${item.impact} Action: ${item.action}`),
  ].join('\n');
}

function formatIterationRecordMarkdown(record: InsightIterationRecord): string {
  return [
    `### Changed\n${formatMarkdownList(record.changed)}`,
    `### Confirmed\n${formatMarkdownList(record.confirmed)}`,
    `### Open\n${formatMarkdownList(record.open)}`,
    `### Watch\n${formatMarkdownList(record.watch)}`,
  ].join('\n\n');
}

function formatActionBoundaryMarkdown(boundary: InsightActionBoundary): string {
  return [
    `### Now\n${formatMarkdownList(boundary.now)}`,
    `### Observe\n${formatMarkdownList(boundary.observe)}`,
    `### Not Now\n${formatMarkdownList(boundary.notNow)}`,
  ].join('\n\n');
}

function formatMarkdownList(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None.';
}

function collectInsightPostSummaries(repoRoot: string): InsightBuildResult['posts'] {
  return listInsightPostDirs(repoRoot)
    .flatMap((postDir) => {
      const postJsonPath = path.join(postDir, 'post.json');
      if (!fs.existsSync(postJsonPath)) {
        return [];
      }
      const slug = path.basename(postDir);
      let post: InsightPostInput;
      try {
        post = readJsonFile<InsightPostInput>(postJsonPath);
      } catch {
        return [];
      }
      return [{
        slug,
        title: post.title,
        date: post.date,
        summary: post.summary,
        href: `posts/${slug}/`,
      }];
    })
    .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title));
}

function listInsightPostDirs(repoRoot: string): string[] {
  const postsDir = path.join(repoRoot, INSIGHT_POSTS_ROOT);
  if (!fs.existsSync(postsDir)) {
    return [];
  }
  return fs.readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(postsDir, entry.name))
    .sort();
}

function renderInsightsIndexHtml(posts: InsightBuildResult['posts']): string {
  const postItems = posts.length > 0
    ? posts.map((post) => `<li><a href="${escapeAttr(post.href)}">${escapeHtml(post.title)}</a><span>${escapeHtml(post.date)}</span><p>${escapeHtml(post.summary)}</p></li>`).join('\n')
    : '<li>No insight posts yet.</li>';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harness Hub Insights</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: #172033; background: #f7f8fb; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-size: 2rem; margin-bottom: 0.35rem; }
    ul { list-style: none; padding: 0; display: grid; gap: 14px; }
    li { background: #fff; border: 1px solid #d9deea; border-radius: 8px; padding: 16px; }
    a { color: #155eef; font-weight: 700; text-decoration: none; }
    span { display: block; margin-top: 6px; color: #5b6578; font-size: 0.92rem; }
    p { margin-bottom: 0; line-height: 1.55; }
  </style>
</head>
<body>
  <main>
    <h1>Harness Hub Insights</h1>
    <p>Source-backed project thinking and iteration notes.</p>
    <ul>
      ${postItems}
    </ul>
  </main>
</body>
</html>
`;
}

function renderSiteHomeHtml(posts: InsightBuildResult['posts']): string {
  const latest = posts[0];
  const latestHtml = latest
    ? `<p>Latest: <a href="insights/${escapeAttr(latest.href)}">${escapeHtml(latest.title)}</a></p>`
    : '<p>No insight posts yet.</p>';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harness Hub</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: #172033; background: #ffffff; }
    main { max-width: 760px; margin: 0 auto; padding: 40px 20px; }
    a { color: #155eef; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Harness Hub</h1>
    <p><a href="insights/">Insights</a></p>
    ${latestHtml}
  </main>
</body>
</html>
`;
}

function validatePublicArtifactBoundary(repoRoot: string): InsightValidationCheck {
  const siteDir = path.join(repoRoot, INSIGHT_SITE_ROOT);
  const leaked = fs.existsSync(siteDir)
    ? listFilesRecursive(siteDir)
      .map((file) => toPortablePath(path.relative(repoRoot, file)))
      .filter((relativePath) => (
        relativePath.includes('.harness-hub/reports/')
        || relativePath.includes('skills/effective-interact/artifacts/')
        || relativePath.startsWith('reports/')
      ))
    : [];
  return {
    code: 'public-artifact-boundary',
    state: leaked.length === 0 ? 'pass' : 'fail',
    path: INSIGHT_SITE_ROOT,
    reason: leaked.length === 0
      ? 'Public site does not reuse ignored local artifact directories.'
      : 'Public site contains files from ignored local artifact directories.',
    evidence: leaked,
  };
}

function checkGitBranch(repoRoot: string): InsightValidationCheck {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const namedBranch = branch.length > 0 && branch !== 'HEAD';
    return {
      code: 'branch',
      state: namedBranch ? 'pass' : 'fail',
      path: '.git',
      reason: namedBranch
        ? `Git branch is available: ${branch}.`
        : 'Publishing should run from a named branch, not detached HEAD.',
      evidence: branch ? [branch] : [],
    };
  } catch {
    return {
      code: 'branch',
      state: 'fail',
      path: '.git',
      reason: 'Publishing requires a git worktree and a named branch.',
    };
  }
}

function checkInsightWorktree(repoRoot: string, allowDirty: boolean): InsightValidationCheck {
  const dirty = detectDirtyWorktree(repoRoot);
  return {
    code: 'worktree',
    state: dirty.length === 0 || allowDirty ? 'pass' : 'fail',
    path: '.',
    reason: dirty.length === 0
      ? 'Git worktree is clean.'
      : allowDirty
        ? 'Git worktree has local changes, accepted by --allow-dirty for dry-run.'
        : 'Git worktree has local changes; commit or stash before publishing.',
    evidence: dirty.map((entry) => `${entry.status} ${entry.path}`),
  };
}

function resolveInsightSlug(input: InsightPostInput, explicitSlug?: string): string {
  if (explicitSlug || input.slug) {
    return slugifyForUrl(explicitSlug || input.slug || '');
  }
  return slugifyForUrl(`${input.date}-${slugifyForUrl(input.title)}`);
}

function slugifyForUrl(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (ascii) {
    return ascii.slice(0, 96).replace(/-+$/g, '');
  }
  return `post-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 8)}`;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function countWords(value: string): number {
  return value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
}

function hasLikelyMojibake(value: string): boolean {
  return /�|ï¿½|\?{4,}/.test(value);
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function readJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content) as T;
}

export function copyRecursive(source: string, dest: string): void {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyRecursive(path.join(source, entry.name), path.join(dest, entry.name));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

function collectManagedFiles(targetDir: string, dest: string): ManagedFileRecord[] {
  if (!fs.existsSync(dest)) {
    return [];
  }

  const files: ManagedFileRecord[] = [];
  for (const filePath of listFilesRecursive(dest)) {
    const relativePath = toPortablePath(path.relative(targetDir, filePath));
    assertSafeRelativePath(targetDir, relativePath);
    const bytes = fs.readFileSync(filePath);
    const role = harnessFileRole(relativePath);
    files.push({
      path: relativePath,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      size: bytes.byteLength,
      ...(role ? { role } : {}),
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function listFilesRecursive(root: string): string[] {
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) {
    return [root];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function inspectManagedFiles(targetDir: string, component: ManagedComponentRecord): {
  missing: string[];
  modified: string[];
} {
  const missing: string[] = [];
  const modified: string[] = [];

  for (const file of component.files) {
    const filePath = assertSafeRelativePath(targetDir, file.path);
    if (!fs.existsSync(filePath)) {
      missing.push(file.path);
      continue;
    }

    if (!isHarnessStateFileRecord(file)) {
      const bytes = fs.readFileSync(filePath);
      const currentHash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (currentHash !== file.sha256) {
        modified.push(file.path);
      }
    }
  }

  return { missing, modified };
}

function assertSafeRelativePath(targetDir: string, relativePath: string): string {
  const normalized = normalizePortablePath(relativePath);
  if (!normalized || isAbsolutePortablePath(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe target path '${relativePath}'`);
  }

  const targetRoot = path.resolve(targetDir);
  const resolved = path.resolve(targetRoot, normalized);
  const relative = path.relative(targetRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe target path '${relativePath}'`);
  }

  return resolved;
}

function safeRelativePathExists(targetDir: string, relativePath: string): boolean {
  try {
    return fs.existsSync(assertSafeRelativePath(targetDir, relativePath));
  } catch {
    return false;
  }
}

export function applyInstall(plan: InstallPlan, options: { overwrite?: boolean } = {}): InstallResult {
  const overwrite = options.overwrite ?? true;
  const installed: InstallItem[] = [];
  const skipped: SkippedInstallItem[] = [];

  for (const item of plan.items) {
    if (item.exists && !overwrite) {
      skipped.push({ ...item, reason: 'exists' });
      continue;
    }

    if (item.exists && overwrite) {
      fs.rmSync(item.dest, { recursive: true, force: true });
    }

    copyRecursive(item.source, item.dest);
    installed.push(item);
  }

  const lock = writeLock(plan, { installed, skipped });
  const report = writeHtmlReport(plan, { installed, skipped });

  return { installed, skipped, lock, report };
}

export function writeLock(
  plan: InstallPlan,
  result: Pick<InstallResult, 'installed' | 'skipped'>,
): LockReadResult {
  const harnessHubDir = path.join(plan.targetDir, '.harness-hub');
  fs.mkdirSync(harnessHubDir, { recursive: true });
  const lockPath = path.join(harnessHubDir, 'lock.json');
  const installedAt = new Date().toISOString();
  const incomingIds = new Set([...result.installed, ...result.skipped].map((item) => item.componentId));
  const currentLock = readLock(plan.targetDir);
  const preservedComponents = currentLock?.data.schemaVersion === 2
    ? currentLock.data.components.filter((component) => component.kind !== 'skill' && !incomingIds.has(component.id))
    : [];
  const installedComponents: ManagedComponentRecord[] = [...result.installed, ...result.skipped].map((item) => ({
    id: item.componentId,
    version: item.componentVersion,
    agent: item.agent,
    kind: item.kind,
    source: toPortablePath(path.relative(HUB_ROOT, item.source)),
    dest: path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/'),
    files: 'reason' in item ? [] : collectManagedFilesFromSource(plan.targetDir, item.dest, item.source),
    installedAt,
    status: 'reason' in item ? 'skipped' : 'installed',
  }));
  const lock: HarnessHubLockV2 = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: plan.hubVersion,
    agents: plan.agents,
    components: [...preservedComponents, ...installedComponents]
      .sort((left, right) => left.id.localeCompare(right.id) || left.dest.localeCompare(right.dest)),
  };

  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return { path: lockPath, data: lock };
}

export function readLock(targetDir: string): LockReadResult | null {
  const lockPath = path.join(path.resolve(targetDir), '.harness-hub', 'lock.json');
  if (!fs.existsSync(lockPath)) {
    return null;
  }
  return {
    path: lockPath,
    data: JSON.parse(fs.readFileSync(lockPath, 'utf8')) as HarnessHubLock,
  };
}

function writeLockData(targetDir: string, lock: HarnessHubLock): LockReadResult {
  const harnessHubDir = path.join(path.resolve(targetDir), '.harness-hub');
  fs.mkdirSync(harnessHubDir, { recursive: true });
  const lockPath = path.join(harnessHubDir, 'lock.json');
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return { path: lockPath, data: lock };
}

export function getStatus(options: StatusOptions = {}): HarnessHubStatus {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(options.hubRoot || HUB_ROOT);
  const lock = readLock(targetDir);
  if (!lock) {
    return { targetDir, lock: null, current: [], missing: [], updates: [], modified: [], skipped: [], unknown: [], rows: [] };
  }

  const current: StatusRow[] = [];
  const missing: StatusRow[] = [];
  const updates: StatusRow[] = [];
  const modified: StatusRow[] = [];
  const skipped: StatusRow[] = [];
  const unknown: StatusRow[] = [];

  for (const installed of lock.data.components) {
    const latestRef = resolveManagedComponentLatest(index, installed);
    const component = latestRef.component;
    const exists = safeRelativePathExists(targetDir, installed.dest);
    const baseRow: Omit<StatusRow, 'state' | 'reason' | 'evidence'> = {
      id: installed.id,
      version: installed.version,
      agent: installed.agent,
      dest: installed.dest,
      status: installed.status,
      exists,
      latestVersion: component?.version || null,
    };
    const updateReason = latestRef.rename?.reason || 'Component version differs from the current capability index.';
    const updateEvidence = latestRef.rename && component
      ? [installed.dest, resolveComponentDest(component, installed.agent)]
      : [installed.dest];

    let row: StatusRow;
    if (installed.status === 'skipped') {
      row = { ...baseRow, state: 'skipped', evidence: [installed.dest], reason: 'Component was skipped during install.' };
      skipped.push(row);
    } else if (!component) {
      row = { ...baseRow, state: 'unknown-component', evidence: [installed.id], reason: 'Component is not present in the current capability index.' };
      unknown.push(row);
    } else if (lock.data.schemaVersion === 1) {
      if (!exists) {
        row = { ...baseRow, state: 'missing', evidence: [installed.dest], reason: 'Managed destination is missing.' };
        missing.push(row);
      } else if (latestRef.rename || component.version !== installed.version) {
        row = { ...baseRow, state: 'update-available', evidence: updateEvidence, reason: updateReason };
        updates.push(row);
      } else {
        row = { ...baseRow, state: 'current', evidence: [installed.dest], reason: 'Component destination exists; schema version 1 lock has no hashes, so content was not verified.' };
        current.push(row);
      }
    } else {
      let fileStatus: ReturnType<typeof inspectManagedFiles>;
      try {
        fileStatus = inspectManagedFiles(targetDir, installed as ManagedComponentRecord);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        row = { ...baseRow, state: 'modified', evidence: [installed.dest], reason: `Lock contains an unsafe managed path: ${message}` };
        modified.push(row);
        continue;
      }
      if (fileStatus.missing.length > 0) {
        row = { ...baseRow, state: 'missing', evidence: fileStatus.missing, reason: 'One or more managed files are missing.' };
        missing.push(row);
      } else if (fileStatus.modified.length > 0) {
        row = { ...baseRow, state: 'modified', evidence: fileStatus.modified, reason: 'One or more managed files differ from the recorded hash.' };
        modified.push(row);
      } else if (latestRef.rename || component.version !== installed.version) {
        row = { ...baseRow, state: 'update-available', evidence: updateEvidence, reason: updateReason };
        updates.push(row);
      } else {
        row = { ...baseRow, state: 'current', evidence: (installed as ManagedComponentRecord).files.map((file) => file.path), reason: 'All managed files match the lock.' };
        current.push(row);
      }
    }
  }

  return {
    targetDir,
    lock,
    current,
    missing,
    updates,
    modified,
    skipped,
    unknown,
    rows: [...current, ...updates, ...modified, ...missing, ...skipped, ...unknown],
  };
}

export function getRemovePlan(targetDirInput: string, options: { force?: boolean } = {}): RemoveResult {
  const targetDir = path.resolve(targetDirInput);
  const lock = readLock(targetDir);
  if (!lock) {
    return {
      exitCode: 0,
      targetDir,
      removed: [],
      skipped: [],
      blocked: [],
      reason: 'No Harness Hub lock found.',
    };
  }

  const removed: string[] = [];
  const skipped: RemovePlanItem[] = [];
  const blocked: RemovePlanItem[] = [];

  for (const component of lock.data.components) {
    if (component.status === 'skipped') {
      skipped.push({
        id: component.id,
        agent: component.agent,
        dest: component.dest,
        files: [],
        state: 'skip',
        reason: 'Component was skipped during install.',
      });
      continue;
    }

    if (lock.data.schemaVersion === 1) {
      blocked.push({
        id: component.id,
        agent: component.agent,
        dest: component.dest,
        files: [],
        state: 'block',
        reason: 'Schema version 1 lock has no file hashes; removal is blocked.',
      });
      continue;
    }

    let fileStatus: ReturnType<typeof inspectManagedFiles>;
    try {
      fileStatus = inspectManagedFiles(targetDir, component as ManagedComponentRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blocked.push({
        id: component.id,
        agent: component.agent,
        dest: component.dest,
        files: [],
        state: 'block',
        reason: `Lock contains an unsafe managed path: ${message}`,
      });
      continue;
    }
    if (fileStatus.modified.length > 0 && !options.force) {
      blocked.push({
        id: component.id,
        agent: component.agent,
        dest: component.dest,
        files: fileStatus.modified,
        state: 'block',
        reason: 'Managed files were modified; use --force to remove them.',
      });
      continue;
    }

    removed.push(...(component as ManagedComponentRecord).files.map((file) => file.path));
  }

  return {
    exitCode: blocked.length > 0 ? 3 : 0,
    targetDir,
    removed: removed.sort(),
    skipped,
    blocked,
    reason: blocked.length > 0 ? 'Removal blocked by safety checks.' : 'Removal plan is safe.',
  };
}

export function removeManaged(
  targetDirInput: string,
  options: { dryRun?: boolean; yes?: boolean; force?: boolean } = {},
): RemoveResult {
  if (!options.dryRun && !options.yes) {
    return {
      exitCode: 2,
      targetDir: path.resolve(targetDirInput),
      removed: [],
      skipped: [],
      blocked: [],
      reason: 'Use --yes to confirm non-interactive removal or --dry-run to preview.',
    };
  }

  const plan = getRemovePlan(targetDirInput, { force: options.force });
  if (options.dryRun || plan.exitCode !== 0) {
    return plan;
  }

  const targetDir = path.resolve(targetDirInput);
  for (const relativePath of plan.removed) {
    const filePath = assertSafeRelativePath(targetDir, relativePath);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      pruneEmptyParents(targetDir, path.dirname(filePath));
    }
  }

  const lockPath = path.join(targetDir, '.harness-hub', 'lock.json');
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath);
    pruneEmptyParents(targetDir, path.dirname(lockPath));
  }

  return plan;
}

function pruneEmptyParents(targetDir: string, startDir: string): void {
  const targetRoot = path.resolve(targetDir);
  let current = path.resolve(startDir);

  while (current !== targetRoot && current.startsWith(targetRoot)) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    if (fs.readdirSync(current).length > 0) {
      return;
    }

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function uniqueComponentIds(componentIds: string[] = []): string[] {
  return [...new Set(componentIds.filter((id) => id.trim().length > 0))];
}

function validateSelectedComponents(lock: LockReadResult | null, selectedComponents: string[]): void {
  if (selectedComponents.length === 0) {
    return;
  }
  if (!lock) {
    throw new Error(`Selected component '${selectedComponents[0]}' is not managed because no Harness Hub lock was found.`);
  }
  const managed = new Set(lock.data.components.flatMap((component) => managedSelectionIds(component.id)));
  for (const componentId of selectedComponents) {
    if (!managed.has(componentId)) {
      throw new Error(`Selected component '${componentId}' is not managed by this lock.`);
    }
  }
}

function componentSourcePath(hubRoot: string, component: CapabilityComponent): string {
  return path.join(hubRoot, component.path);
}

function makeStatusRow(
  targetDir: string,
  component: HarnessHubLock['components'][number],
  latest: CapabilityComponent | undefined,
  state: StatusState,
  reason: string,
  evidence: string[],
): StatusRow {
  return {
    id: component.id,
    version: component.version,
    latestVersion: latest?.version || null,
    agent: component.agent,
    dest: component.dest,
    state,
    evidence,
    reason,
    exists: safeRelativePathExists(targetDir, component.dest),
    status: component.status,
  };
}

function resolveManagedComponentLatest(
  index: CapabilityIndex,
  component: HarnessHubLock['components'][number],
): { id: string; component?: CapabilityComponent; rename?: ManagedComponentRename } {
  const current = index.components[component.id];
  if (current) {
    return { id: component.id, component: current };
  }

  const rename = MANAGED_COMPONENT_RENAMES[component.id];
  if (!rename) {
    return { id: component.id };
  }

  const replacement = index.components[rename.to];
  return replacement
    ? { id: rename.to, component: replacement, rename }
    : { id: rename.to, rename };
}

function managedSelectionIds(componentId: string): string[] {
  const rename = MANAGED_COMPONENT_RENAMES[componentId];
  return rename ? [componentId, rename.to] : [componentId];
}

function shouldIncludeManagedComponent(
  component: HarnessHubLock['components'][number],
  selectedComponents: string[],
): boolean {
  if (selectedComponents.length === 0) {
    return true;
  }

  return managedSelectionIds(component.id).some((id) => selectedComponents.includes(id));
}

export function getUpdatePlan(options: UpdatePlanOptions = {}): UpdatePlan {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(options.hubRoot || HUB_ROOT);
  const lock = readLock(targetDir);
  const selectedComponents = uniqueComponentIds(options.components || []);
  const updates: StatusRow[] = [];
  const blockers: StatusRow[] = [];
  const forceOverridable: StatusRow[] = [];
  const skipped: StatusRow[] = [];
  const unchanged: StatusRow[] = [];

  validateSelectedComponents(lock, selectedComponents);
  if (!lock) {
    return { targetDir, selectedComponents, updates, blockers, forceOverridable, skipped, unchanged };
  }

  for (const component of lock.data.components) {
    if (!shouldIncludeManagedComponent(component, selectedComponents)) {
      continue;
    }

    const latestRef = resolveManagedComponentLatest(index, component);
    const latest = latestRef.component;
    if (component.status === 'skipped') {
      const row = makeStatusRow(
        targetDir,
        component,
        latest,
        'skipped',
        'Component was skipped during install and cannot be updated.',
        [component.dest],
      );
      skipped.push(row);
      if (latest && (latestRef.rename || latest.version !== component.version)) {
        blockers.push(row);
      }
      continue;
    }

    if (!latest) {
      blockers.push(makeStatusRow(
        targetDir,
        component,
        undefined,
        'unknown-component',
        'Component is not present in the current capability index; update is blocked.',
        [component.id],
      ));
      continue;
    }

    if (!latestRef.rename && latest.version === component.version) {
      unchanged.push(makeStatusRow(
        targetDir,
        component,
        latest,
        'current',
        'Component version matches the current capability index.',
        [component.dest],
      ));
      continue;
    }

    const updateRow = makeStatusRow(
      targetDir,
      component,
      latest,
      'update-available',
      latestRef.rename?.reason || 'Component version differs from the current capability index.',
      latestRef.rename ? [component.dest, resolveComponentDest(latest, component.agent)] : [component.dest],
    );
    updates.push(updateRow);

    if (lock.data.schemaVersion === 1) {
      blockers.push({
        ...updateRow,
        state: 'unknown-component',
        reason: 'Schema version 1 lock has no file hashes; run migrate-lock before updating.',
      });
    } else {
      let fileStatus: ReturnType<typeof inspectManagedFiles>;
      try {
        fileStatus = inspectManagedFiles(targetDir, component as ManagedComponentRecord);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        blockers.push({
          ...updateRow,
          state: 'modified',
          evidence: [component.dest],
          reason: `Lock contains an unsafe managed path: ${message}`,
        });
        continue;
      }
      if (fileStatus.missing.length > 0) {
        const row = {
          ...updateRow,
          state: 'missing' as const,
          evidence: fileStatus.missing,
          reason: options.force
            ? 'Managed files are missing; force update will restore them.'
            : 'Managed files are missing; use --force --yes to restore them.',
        };
        if (options.force) {
          forceOverridable.push(row);
        } else {
          blockers.push(row);
        }
      }
      if (fileStatus.modified.length > 0) {
        const row = {
          ...updateRow,
          state: 'modified',
          evidence: fileStatus.modified,
          reason: options.force
            ? 'Managed files were modified; force update will overwrite them.'
            : 'Managed files were modified; use --force --yes to overwrite them.',
        } as StatusRow;
        if (options.force) {
          forceOverridable.push(row);
        } else {
          blockers.push(row);
        }
      }
    }
  }

  return { targetDir, selectedComponents, updates, blockers, forceOverridable, skipped, unchanged };
}

export function updateManaged(
  targetDirInput: string,
  options: UpdateApplyOptions = {},
): UpdateResult {
  const targetDir = path.resolve(targetDirInput);
  if (!options.dryRun && !options.yes) {
    return {
      targetDir,
      selectedComponents: uniqueComponentIds(options.components || []),
      updates: [],
      blockers: [],
      forceOverridable: [],
      skipped: [],
      unchanged: [],
      exitCode: 2,
      updated: [],
      forced: [],
      lock: readLock(targetDir),
      reason: 'Use --yes to confirm non-interactive update or --dry-run to preview.',
    };
  }

  const hubRoot = options.hubRoot || HUB_ROOT;
  const index = options.index || readCapabilityIndex(hubRoot);
  const plan = getUpdatePlan({
    hubRoot,
    targetDir,
    index,
    components: options.components,
    force: options.force,
  });

  if (options.dryRun) {
    return {
      ...plan,
      exitCode: 0,
      updated: [],
      forced: [],
      lock: readLock(targetDir),
      reason: 'Update preview is side-effect free.',
    };
  }

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    return {
      ...plan,
      exitCode: plan.blockers.length > 0 ? 3 : 0,
      updated: [],
      forced: [],
      lock,
      reason: plan.blockers.length > 0 ? 'Update blocked by safety checks.' : 'No Harness Hub lock found.',
    };
  }

  if (plan.blockers.length > 0) {
    return {
      ...plan,
      exitCode: 3,
      updated: [],
      forced: [],
      lock,
      reason: 'Update blocked by safety checks.',
    };
  }

  if (plan.updates.length === 0) {
    return {
      ...plan,
      exitCode: 0,
      updated: [],
      forced: [],
      lock,
      reason: 'No managed component updates available.',
    };
  }

  const updatedAt = new Date().toISOString();
  const updateIds = new Set(plan.updates.map((row) => row.id));
  const forcedIds = new Set(plan.forceOverridable.map((row) => row.id));
  const nextLock: HarnessHubLockV2 = {
    ...JSON.parse(JSON.stringify(lock.data)) as HarnessHubLockV2,
    generatedAt: updatedAt,
    hubVersion: index.version,
    components: (JSON.parse(JSON.stringify(lock.data.components)) as ManagedComponentRecord[]).map((component) => ({ ...component })),
  };
  const updated: UpdateResultItem[] = [];
  const forced: UpdateResultItem[] = [];

  for (const component of nextLock.components) {
    if (!updateIds.has(component.id)) {
      continue;
    }
    const latestRef = resolveManagedComponentLatest(index, component);
    const latest = latestRef.component;
    if (!latest) {
      continue;
    }

    const oldFiles = [...component.files];
    const source = componentSourcePath(hubRoot, latest);
    const nextDest = latestRef.rename ? resolveComponentDest(latest, component.agent) : component.dest;
    const updatesOwnedFilesOnly = isHarnessComponentKind(component.kind) || isHarnessComponentKind(latest.kind);
    if (!updatesOwnedFilesOnly) {
      for (const file of oldFiles) {
        const filePath = assertSafeRelativePath(targetDir, file.path);
        if (fs.existsSync(filePath)) {
          fs.rmSync(filePath);
          pruneEmptyParents(targetDir, path.dirname(filePath));
        }
      }
    }

    const dest = assertSafeRelativePath(targetDir, nextDest);
    if (!updatesOwnedFilesOnly && latestRef.rename && fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    const files = updatesOwnedFilesOnly
      ? updateHarnessComponentFiles(targetDir, hubRoot, latest, component)
      : copyComponentSourceAndCollectManagedFiles(targetDir, dest, source);
    const nextComponentId = latestRef.id;
    const previousVersion = component.version;
    const isForced = forcedIds.has(component.id);
    component.id = nextComponentId;
    component.version = latest.version;
    component.kind = latest.kind;
    component.source = toPortablePath(path.relative(hubRoot, source));
    component.dest = nextDest;
    component.files = files;
    component.updatedAt = updatedAt;
    component.status = 'installed';

    const item: UpdateResultItem = {
      id: component.id,
      agent: component.agent,
      dest: component.dest,
      previousVersion,
      version: component.version,
      files: files.map((file) => file.path),
      forced: isForced,
    };
    updated.push(item);
    if (isForced) {
      forced.push(item);
    }
  }

  const writtenLock = writeLockData(targetDir, nextLock);
  return {
    ...plan,
    exitCode: 0,
    updated,
    forced,
    lock: writtenLock,
    reason: `${updated.length} managed components updated.`,
  };
}

function fileDigest(filePath: string): { sha256: string; size: number } {
  const bytes = fs.readFileSync(filePath);
  return {
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
  };
}

function collectRelativeFileDigests(root: string): Map<string, { sha256: string; size: number }> {
  const stat = fs.statSync(root);
  const base = stat.isDirectory() ? root : path.dirname(root);
  const files = listFilesRecursive(root);
  const digests = new Map<string, { sha256: string; size: number }>();
  for (const filePath of files) {
    digests.set(toPortablePath(path.relative(base, filePath)), fileDigest(filePath));
  }
  return digests;
}

function compareSourceAndDestination(source: string, dest: string): { matches: boolean; evidence: string[]; reason: string } {
  if (!fs.existsSync(source)) {
    return { matches: false, evidence: [source], reason: 'Component source does not exist.' };
  }
  if (!fs.existsSync(dest)) {
    return { matches: false, evidence: [dest], reason: 'Managed destination is missing.' };
  }

  const sourceFiles = collectRelativeFileDigests(source);
  const destFiles = collectRelativeFileDigests(dest);
  const sourceKeys = [...sourceFiles.keys()].sort();
  const destKeys = [...destFiles.keys()].sort();
  if (sourceKeys.join('\0') !== destKeys.join('\0')) {
    return {
      matches: false,
      evidence: [...new Set([...sourceKeys, ...destKeys])].sort(),
      reason: 'Destination file list differs from current Harness Hub component assets.',
    };
  }

  for (const key of sourceKeys) {
    if (sourceFiles.get(key)?.sha256 !== destFiles.get(key)?.sha256) {
      return { matches: false, evidence: [key], reason: 'Destination file content differs from current Harness Hub component assets.' };
    }
  }

  return { matches: true, evidence: sourceKeys, reason: 'Destination exactly matches current Harness Hub component assets.' };
}

export function migrateLock(
  targetDirInput: string,
  options: MigrateLockOptions = {},
): LockMigrationResult {
  const targetDir = path.resolve(targetDirInput);
  const lock = readLock(targetDir);
  const migratable: StatusRow[] = [];
  const migrated: UpdateResultItem[] = [];
  const blockers: StatusRow[] = [];
  const skipped: StatusRow[] = [];

  if (!options.dryRun && !options.yes) {
    return {
      exitCode: 2,
      targetDir,
      migratable,
      migrated,
      blockers,
      skipped,
      lock,
      reason: 'Use --yes to confirm non-interactive lock migration or --dry-run to preview.',
    };
  }

  if (!lock) {
    return {
      exitCode: 0,
      targetDir,
      migratable,
      migrated,
      blockers,
      skipped,
      lock: null,
      reason: 'No Harness Hub lock found.',
    };
  }

  if (lock.data.schemaVersion === 2) {
    return {
      exitCode: 0,
      targetDir,
      migratable,
      migrated,
      blockers,
      skipped,
      lock,
      reason: 'Lock is already schema version 2.',
    };
  }

  const hubRoot = options.hubRoot || HUB_ROOT;
  const index = options.index || readCapabilityIndex(hubRoot);
  const migratedAt = new Date().toISOString();
  const nextComponents: ManagedComponentRecord[] = [];

  for (const component of lock.data.components) {
    const latestRef = resolveManagedComponentLatest(index, component);
    const latest = latestRef.component;
    if (component.status === 'skipped') {
      const row = makeStatusRow(targetDir, component, latest, 'skipped', 'Skipped schema version 1 records cannot be migrated safely.', [component.dest]);
      skipped.push(row);
      blockers.push(row);
      continue;
    }
    if (!latest) {
      blockers.push(makeStatusRow(targetDir, component, undefined, 'unknown-component', 'Component is not present in the current capability index; migration is blocked.', [component.id]));
      continue;
    }

    let dest: string;
    try {
      dest = assertSafeRelativePath(targetDir, component.dest);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blockers.push(makeStatusRow(targetDir, component, latest, 'modified', `Lock contains an unsafe managed path: ${message}`, [component.dest]));
      continue;
    }

    const source = componentSourcePath(hubRoot, latest);
    const comparison = compareSourceAndDestination(source, dest);
    if (!comparison.matches) {
      blockers.push(makeStatusRow(targetDir, component, latest, safeRelativePathExists(targetDir, component.dest) ? 'modified' : 'missing', comparison.reason, comparison.evidence));
      continue;
    }

    migratable.push(makeStatusRow(targetDir, component, latest, 'current', comparison.reason, comparison.evidence));
    nextComponents.push({
      id: latestRef.id,
      version: latest.version,
      agent: component.agent,
      kind: latest.kind,
      source: toPortablePath(path.relative(hubRoot, source)),
      dest: component.dest,
      files: collectManagedFiles(targetDir, dest),
      installedAt: migratedAt,
      migratedAt,
      status: 'installed',
    });
  }

  if (options.dryRun || blockers.length > 0) {
    return {
      exitCode: blockers.length > 0 ? 3 : 0,
      targetDir,
      migratable,
      migrated,
      blockers,
      skipped,
      lock,
      reason: blockers.length > 0 ? 'Lock migration blocked by safety checks.' : 'Lock migration preview is side-effect free.',
    };
  }

  const nextLock: HarnessHubLockV2 = {
    schemaVersion: 2,
    generatedAt: migratedAt,
    hubVersion: index.version,
    agents: lock.data.agents,
    components: nextComponents,
  };
  const writtenLock = writeLockData(targetDir, nextLock);
  for (const component of nextComponents) {
    migrated.push({
      id: component.id,
      agent: component.agent,
      dest: component.dest,
      previousVersion: lock.data.components.find((entry) => entry.id === component.id)?.version || component.version,
      version: component.version,
      files: component.files.map((file) => file.path),
      forced: false,
    });
  }

  return {
    exitCode: 0,
    targetDir,
    migratable,
    migrated,
    blockers,
    skipped,
    lock: writtenLock,
    reason: `${migrated.length} schema version 1 records migrated.`,
  };
}

export function writeStatusReport(status: HarnessHubStatus, hubVersion: string): string {
  const reportDir = path.join(status.targetDir, '.harness-hub', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const filePath = path.join(reportDir, `status-${timestampForFile()}.html`);
  fs.writeFileSync(filePath, renderHtml({
    title: 'Harness Hub Status Report',
    summary: status.lock
      ? `${status.current.length} current, ${status.updates.length} updates, ${status.missing.length} missing.`
      : 'No Harness Hub lock file found.',
    rows: [
      ...status.current.map((row) => ({ ...row, state: 'current' })),
      ...status.updates.map((row) => ({ ...row, state: 'update available' })),
      ...status.missing.map((row) => ({ ...row, state: 'missing' })),
    ],
    hubVersion,
  }));
  return filePath;
}

export function writeHtmlReport(
  plan: InstallPlan,
  result: Pick<InstallResult, 'installed' | 'skipped'>,
): string {
  const reportDir = path.join(plan.targetDir, '.harness-hub', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const filePath = path.join(reportDir, `install-${timestampForFile()}.html`);
  const rows = [
    ...result.installed.map((item) => ({
      id: item.componentId,
      agent: item.agent,
      dest: path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/'),
      state: 'installed',
    })),
    ...result.skipped.map((item) => ({
      id: item.componentId,
      agent: item.agent,
      dest: path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/'),
      state: item.reason,
    })),
  ];

  fs.writeFileSync(filePath, renderHtml({
    title: 'Harness Hub Install Report',
    summary: `${result.installed.length} installed, ${result.skipped.length} skipped.`,
    rows,
    hubVersion: plan.hubVersion,
  }));
  return filePath;
}

function renderHtml({
  title,
  summary,
  rows,
  hubVersion,
}: {
  title: string;
  summary: string;
  rows: HtmlRow[];
  hubVersion: string;
}): string {
  const escapedRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.agent || '')}</td>
      <td>${escapeHtml(row.state)}</td>
      <td><code>${escapeHtml(row.dest || '')}</code></td>
      <td>${escapeHtml(row.version || '')}</td>
      <td>${escapeHtml(row.latestVersion || '')}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: #172033; background: #f7f8fb; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px; }
    .summary { background: #ffffff; border-left: 4px solid #2563eb; padding: 16px 18px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #d9deea; text-align: left; vertical-align: top; }
    th { background: #edf1f8; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.9em; }
    @media (max-width: 720px) { main { padding: 16px; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated ${escapeHtml(new Date().toISOString())}. Hub version ${escapeHtml(hubVersion)}.</p>
    <section class="summary">${escapeHtml(summary)}</section>
    <table>
      <thead><tr><th>Component</th><th>Agent</th><th>Status</th><th>Path</th><th>Installed</th><th>Latest</th></tr></thead>
      <tbody>${escapedRows}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: argv[0] || 'help',
    targetDir: null,
    agents: [],
    dryRun: false,
    yes: false,
    overwrite: true,
    html: false,
    json: false,
    output: null,
    force: false,
    agentReadiness: false,
    harness: false,
    componentIds: [],
    input: null,
    slug: null,
    allowDirty: false,
  };
  const positional: string[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--agent' || arg === '--target' || arg === '-a') {
      options.agents.push(parseAgentName(readOptionValue(argv, ++index, arg)));
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--overwrite') {
      options.overwrite = true;
    } else if (arg === '--html') {
      options.html = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--output') {
      options.output = readOptionValue(argv, ++index, arg);
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--component') {
      options.componentIds.push(readOptionValue(argv, ++index, arg));
    } else if (arg === '--agent-readiness') {
      options.agentReadiness = true;
    } else if (arg === '--harness') {
      options.harness = true;
    } else if (arg === '--input') {
      options.input = readOptionValue(argv, ++index, arg);
    } else if (arg === '--slug') {
      options.slug = readOptionValue(argv, ++index, arg);
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true;
    } else if (arg.startsWith('-')) {
      throw new CliError(`Unsupported option '${arg}'`, 2);
    } else {
      positional.push(arg);
    }
  }

  options.targetDir = positional[0] || process.cwd();
  return options;
}

function readOptionValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new CliError(`Missing value for ${flag}`, 2);
  }
  return value;
}

function parseAgentName(value: string): AgentName {
  if (value === 'standard') {
    return value;
  }
  throw new Error(`Unsupported agent '${value}'. Available: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}`);
}

export async function runCli(argv: string[]): Promise<number> {
  try {
    return await runCliInner(argv);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`harness-hub: ${error.message}`);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = /Unsupported agent|Unknown command|Missing value|Selected component/.test(message) ? 2 : 1;
    console.error(`harness-hub: ${message}`);
    return exitCode;
  }
}

async function runCliInner(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  if (options.command === 'help' || options.command === '--help' || options.command === '-h') {
    printHelp();
    return 0;
  }

  if (options.agentReadiness && options.command !== 'analyze') {
    throw new CliError(`Unsupported option '--agent-readiness' for command '${options.command}'`, 2);
  }
  if (options.harness && options.command !== 'analyze') {
    throw new CliError(`Unsupported option '--harness' for command '${options.command}'`, 2);
  }

  if (options.command === 'components') {
    for (const component of listComponents()) {
      console.log(`${component.id}\t${component.kind}\t${component.path}`);
    }
    return 0;
  }

  if (options.command === 'analyze') {
    const analysis = analyzeTarget({
      targetDir: options.targetDir || undefined,
      agents: options.agents,
      agentReadiness: options.agentReadiness,
      harness: options.harness,
    });
    emitReport(renderLifecycleReport('Harness Hub Analysis Report', analysis, options), options);
    return 0;
  }

  if (options.command === 'init-harness' || options.command === 'bootstrap-dev') {
    if (!options.dryRun && !options.yes) {
      throw new CliError('Use --yes to confirm non-interactive dev bootstrap or --dry-run to preview.', 2);
    }
    const plan = planDevBootstrap({
      ...options,
      targetDir: options.targetDir || undefined,
    });
    if (options.dryRun) {
      emitReport(renderLifecycleReport('Harness Hub Dev Bootstrap Plan', plan, options), options);
      return 0;
    }
    const result = applyDevBootstrap(plan, {
      yes: options.yes,
      force: options.force,
      overwrite: options.overwrite,
    });
    emitReport(renderLifecycleReport('Harness Hub Dev Bootstrap Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'validate-harness') {
    const result = validateHarness(options.targetDir || process.cwd());
    emitReport(renderLifecycleReport('Harness Hub Harness Validation Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'insight-generate') {
    if (!options.input) {
      throw new CliError("Use --input <file> with insight-generate.", 2);
    }
    const inputPath = path.resolve(options.input);
    const input = readJsonFile<InsightPostInput>(inputPath);
    const result = createInsightPost(input, {
      repoRoot: options.targetDir || undefined,
      slug: options.slug || undefined,
    });
    emitReport(renderLifecycleReport('Harness Hub Insight Generation Report', result, options), options);
    return result.validation.exitCode;
  }

  if (options.command === 'insight-build') {
    const result = buildInsightSite({ repoRoot: options.targetDir || undefined });
    emitReport(renderLifecycleReport('Harness Hub Insight Build Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'insight-validate') {
    const result = validateInsightSite({ repoRoot: options.targetDir || undefined });
    emitReport(renderLifecycleReport('Harness Hub Insight Validation Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'insight-publish') {
    if (!options.dryRun) {
      throw new CliError('Use --dry-run for local insight publish preflight. GitHub Actions performs the actual Pages deploy.', 2);
    }
    const result = publishInsightPreflight({
      repoRoot: options.targetDir || undefined,
      dryRun: true,
      allowDirty: options.allowDirty,
    });
    emitReport(renderLifecycleReport('Harness Hub Insight Publish Preflight Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'init' || options.command === 'install') {
    if (!options.dryRun && !options.yes) {
      throw new CliError('Use --yes to confirm non-interactive install or --dry-run to preview.', 2);
    }
    const plan = planInstall({
      ...options,
      targetDir: options.targetDir || undefined,
    });
    if (options.dryRun) {
      if (options.json || options.html || options.output) {
        emitReport(renderLifecycleReport('Harness Hub Install Plan', plan, options), options);
      } else {
        printPlan(plan);
      }
      return 0;
    }
    const result = applyInstall(plan, options);
    if (options.json || options.html || options.output) {
      emitReport(renderLifecycleReport('Harness Hub Install Report', result, options), options);
    } else {
      console.log(`Installed: ${result.installed.length}`);
      console.log(`Skipped: ${result.skipped.length}`);
      console.log(`Lock: ${path.relative(process.cwd(), result.lock.path)}`);
      console.log(`Report: ${path.relative(process.cwd(), result.report)}`);
    }
    return 0;
  }

  if (options.command === 'status') {
    const index = readCapabilityIndex();
    const status = getStatus({ targetDir: options.targetDir || undefined, index });
    emitReport(renderLifecycleReport('Harness Hub Status Report', status, options), options);
    return 0;
  }

  if (options.command === 'remove') {
    const result = removeManaged(options.targetDir || process.cwd(), {
      dryRun: options.dryRun,
      yes: options.yes,
      force: options.force,
    });
    emitReport(renderLifecycleReport('Harness Hub Remove Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'update') {
    if (options.dryRun) {
      const index = readCapabilityIndex();
      const updatePlan = getUpdatePlan({
        targetDir: options.targetDir || undefined,
        index,
        components: options.componentIds,
        force: options.force,
      });
      emitReport(renderLifecycleReport('Harness Hub Update Report', updatePlan, options), options);
      return 0;
    }
    const updateResult = updateManaged(options.targetDir || process.cwd(), {
      yes: options.yes,
      force: options.force,
      components: options.componentIds,
    });
    emitReport(renderLifecycleReport('Harness Hub Update Report', updateResult, options), options);
    return updateResult.exitCode;
  }

  if (options.command === 'migrate-lock') {
    const migration = migrateLock(options.targetDir || process.cwd(), {
      dryRun: options.dryRun,
      yes: options.yes,
    });
    emitReport(renderLifecycleReport('Harness Hub Lock Migration Report', migration, options), options);
    return migration.exitCode;
  }

  throw new CliError(`Unknown command '${options.command}'`, 2);
}

function renderLifecycleReport(
  title: string,
  data: AnalysisResult | InstallPlan | InstallResult | DevBootstrapPlan | DevBootstrapResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult | InsightPostResult | InsightBuildResult | InsightValidationResult | InsightPreflightResult | HarnessHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult,
  options: CliOptions,
): string {
  if (options.json) {
    return `${JSON.stringify(data, null, 2)}\n`;
  }

  if (options.html) {
    const rows = rowsForLifecycleData(data);
    return renderHtml({
      title,
      summary: summaryForLifecycleData(data),
      rows,
      hubVersion: 'hubVersion' in data ? data.hubVersion : readCapabilityIndex().version,
    });
  }

  return `${summaryForLifecycleData(data)}\n`;
}

function rowsForLifecycleData(
  data: AnalysisResult | InstallPlan | InstallResult | DevBootstrapPlan | DevBootstrapResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult | InsightPostResult | InsightBuildResult | InsightValidationResult | InsightPreflightResult | HarnessHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult,
): HtmlRow[] {
  if ('checks' in data && 'assessment' in data) {
    return [
      {
        id: 'assessment.overall',
        state: `${data.assessment.overall}/100`,
        dest: `Bottleneck: ${data.assessment.bottleneck}. Stack: ${data.assessment.project.stack}.`,
        version: 'five-subsystem',
        latestVersion: data.assessment.project.verificationCommands.join(', '),
      },
      ...HARNESS_SUBSYSTEMS.map((name) => {
        const subsystem = data.assessment.subsystems[name];
        return {
          id: `assessment.${name}`,
          state: `${subsystem.score}/5`,
          dest: `${subsystem.passed}/${subsystem.total} checks passed`,
          version: 'subsystem',
          latestVersion: subsystem.checks
            .filter((check) => !check.pass)
            .map((check) => check.message)
            .join('; '),
        };
      }),
      {
        id: 'benchmark.structural',
        state: `${data.benchmark.score}/100`,
        dest: `${data.benchmark.passed}/${data.benchmark.total} checks passed`,
        version: 'benchmark',
        latestVersion: data.benchmark.recommendation,
      },
      ...data.checks.map((check) => ({
        id: check.path,
        state: check.state,
        dest: check.reason,
        version: check.code,
        latestVersion: check.limit ? `${check.size || 0}/${check.limit}` : '',
      })),
    ];
  }

  if ('checks' in data) {
    return data.checks.map((check) => ({
      id: check.path,
      state: check.state,
      dest: check.reason,
      version: check.code,
      latestVersion: 'limit' in check && check.limit ? `${check.size || 0}/${check.limit}` : '',
    }));
  }

  if ('postJsonPath' in data) {
    return [
      data.postJsonPath,
      data.sourceLedgerPath,
      data.effectiveInteractInputPath,
      data.htmlPath,
    ].map((filePath) => ({
      id: data.slug,
      dest: path.relative(data.repoRoot, filePath).replaceAll(path.sep, '/'),
      state: fs.existsSync(filePath) ? 'written' : 'missing',
    }));
  }

  if ('siteDir' in data) {
    return [
      ...data.files.map((filePath) => ({
        id: 'site',
        dest: path.relative(data.repoRoot, filePath).replaceAll(path.sep, '/'),
        state: fs.existsSync(filePath) ? 'written' : 'missing',
      })),
      ...data.posts.map((post) => ({
        id: post.slug,
        dest: post.href,
        state: 'indexed',
        version: post.date,
      })),
    ];
  }

  if ('harnessComponentId' in data) {
    const written = 'harnessFilesWritten' in data ? new Set(data.harnessFilesWritten) : new Set<string>();
    return [
      ...data.harnessFiles.map((file) => ({
        id: data.harnessComponentId,
        agent: 'standard',
        dest: file.relativePath,
        state: written.has(file.relativePath) ? 'written' : file.exists ? 'exists' : 'planned',
        version: data.harnessVersion,
      })),
      ...data.blockers.map((blocker) => ({
        id: data.harnessComponentId,
        agent: 'standard',
        dest: blocker.path,
        state: blocker.code,
        latestVersion: blocker.reason,
      })),
    ];
  }

  if ('findings' in data) {
    if (data.harness) {
      return data.harness.findings.map((finding) => ({
        id: finding.id,
        agent: data.harness?.componentId,
        dest: finding.evidence.map((item) => item.value).join(', '),
        state: finding.state,
        version: finding.severity,
        latestVersion: finding.recommendation,
      }));
    }

    if (data.agentReadiness) {
      return data.agentReadiness.findings.map((finding) => ({
        id: finding.id,
        agent: finding.category,
        dest: finding.evidence.map((item) => item.value).join(', '),
        state: finding.state,
        version: finding.severity,
        latestVersion: finding.recommendation,
      }));
    }

    return data.findings.map((finding) => ({
      id: finding.componentId,
      agent: finding.agent,
      dest: finding.dest,
      state: finding.state,
      latestVersion: finding.capability,
    }));
  }

  if ('componentKind' in data) {
    return data.items.map((item) => ({
      id: item.relativePath,
      agent: data.componentId,
      dest: item.relativePath,
      state: item.action,
      version: item.componentVersion,
    }));
  }

  if ('items' in data) {
    return data.items.map((item) => ({
      id: item.componentId,
      agent: item.agent,
      dest: item.dest,
      state: item.exists ? 'skipped' : 'install',
      version: item.componentVersion,
    }));
  }

  if ('installed' in data && 'targetDir' in data) {
    return [
      ...data.installed.map((item) => ({
        id: item.relativePath,
        agent: item.componentId,
        dest: item.relativePath,
        state: item.action === 'overwrite' ? 'overwritten' : 'installed',
        version: item.componentVersion,
      })),
      ...data.skipped.map((item) => ({
        id: item.relativePath,
        agent: item.componentId,
        dest: item.relativePath,
        state: 'skipped',
        version: item.componentVersion,
      })),
    ];
  }

  if ('installed' in data) {
    return [
      ...data.installed.map((item) => ({
        id: item.componentId,
        agent: item.agent,
        dest: item.dest,
        state: 'installed',
        version: item.componentVersion,
      })),
      ...data.skipped.map((item) => ({
        id: item.componentId,
        agent: item.agent,
        dest: item.dest,
        state: 'skipped',
        version: item.componentVersion,
      })),
    ];
  }

  if ('rows' in data) {
    return data.rows.map((row) => ({ ...row, state: row.state }));
  }

  if ('removed' in data) {
    return [
      ...data.removed.map((file) => ({ id: file, state: 'remove' })),
      ...data.blocked.map((item) => ({ id: item.id, agent: item.agent, dest: item.dest, state: item.state })),
      ...data.skipped.map((item) => ({ id: item.id, agent: item.agent, dest: item.dest, state: item.state })),
    ];
  }

  if ('migratable' in data) {
    return [
      ...data.migrated.map((row) => ({
        id: row.id,
        agent: row.agent,
        dest: row.dest,
        state: 'migrated',
        version: row.previousVersion,
        latestVersion: row.version,
      })),
      ...data.migratable.map((row) => ({ ...row, state: 'migratable' })),
      ...data.blockers.map((row) => ({ ...row, state: row.state })),
      ...data.skipped.map((row) => ({ ...row, state: 'skipped' })),
    ];
  }

  if ('updated' in data) {
    return [
      ...data.updated.map((row) => ({
        id: row.id,
        agent: row.agent,
        dest: row.dest,
        state: row.forced ? 'force-updated' : 'updated',
        version: row.previousVersion,
        latestVersion: row.version,
      })),
      ...data.blockers.map((row) => ({ ...row, state: row.state })),
      ...data.forceOverridable.map((row) => ({ ...row, state: 'force-overridable' })),
      ...data.skipped.map((row) => ({ ...row, state: 'skipped' })),
      ...data.unchanged.map((row) => ({ ...row, state: 'unchanged' })),
    ];
  }

  return [
    ...data.updates.map((row) => ({ ...row, state: 'update-available' })),
    ...data.blockers.map((row) => ({ ...row, state: row.state })),
    ...data.forceOverridable.map((row) => ({ ...row, state: 'force-overridable' })),
    ...data.skipped.map((row) => ({ ...row, state: 'skipped' })),
    ...data.unchanged.map((row) => ({ ...row, state: 'unchanged' })),
  ];
}

function summaryForLifecycleData(
  data: AnalysisResult | InstallPlan | InstallResult | DevBootstrapPlan | DevBootstrapResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult | InsightPostResult | InsightBuildResult | InsightValidationResult | InsightPreflightResult | HarnessHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult,
): string {
  if ('checks' in data && 'assessment' in data) {
    const failed = data.checks.filter((check) => check.state === 'fail').length;
    return `${data.checks.length - failed} passed, ${failed} failed. Assessment ${data.assessment.overall}/100, bottleneck ${data.assessment.bottleneck}. Benchmark ${data.benchmark.score}/100. ${data.reason}`;
  }

  if ('checks' in data) {
    const failed = data.checks.filter((check) => check.state === 'fail').length;
    return `${data.checks.length - failed} passed, ${failed} failed. ${data.reason}`;
  }

  if ('postJsonPath' in data) {
    return `${data.slug}: ${data.reason}`;
  }

  if ('siteDir' in data) {
    return `${data.posts.length} insight posts indexed. ${data.reason}`;
  }

  if ('harnessComponentId' in data) {
    const installPlanned = data.install.items.filter((item) => !item.exists).length;
    if ('harnessFilesWritten' in data) {
      return `${data.installed.length} skills installed, ${data.harnessFilesWritten.length} harness files written, ${data.blockers.length} blockers. ${data.reason}`;
    }
    return `${installPlanned} skills planned, ${data.harnessFiles.length} harness files planned, ${data.blockers.length} blockers.`;
  }

  if ('findings' in data) {
    if (data.harness) {
      const missing = data.harness.findings.filter((finding) => finding.state === 'missing').length;
      const managed = data.harness.findings.filter((finding) => finding.state === 'managed').length;
      return `${missing} harness files missing, ${managed} lock-managed.`;
    }

    if (data.agentReadiness) {
      return summaryForReadinessAnalysis(data);
    }

    const recommended = data.findings.filter((finding) => finding.state === 'recommended').length;
    const detected = data.findings.filter((finding) => finding.state === 'detected').length;
    const conflicts = data.findings.filter((finding) => finding.state === 'conflict').length;
    return `${recommended} recommended, ${detected} detected, ${conflicts} conflicts.`;
  }

  if ('componentKind' in data) {
    const create = data.items.filter((item) => item.action === 'create').length;
    const overwrite = data.items.filter((item) => item.action === 'overwrite').length;
    const skipped = data.items.filter((item) => item.action === 'skip').length;
    return `${create} harness files planned, ${overwrite} overwrites, ${skipped} skipped.`;
  }

  if ('items' in data) {
    const planned = data.items.filter((item) => !item.exists).length;
    const skipped = data.items.length - planned;
    return `${planned} planned, ${skipped} skipped.`;
  }

  if ('installed' in data) {
    return `${data.installed.length} installed, ${data.skipped.length} skipped.`;
  }

  if ('rows' in data) {
    return data.lock
      ? `${data.current.length} current, ${data.updates.length} updates, ${data.modified.length} modified, ${data.missing.length} missing.`
      : 'No Harness Hub lock found.';
  }

  if ('removed' in data) {
    return `${data.removed.length} managed files planned, ${data.blocked.length} blockers, ${data.skipped.length} skipped. ${data.reason}`;
  }

  if ('migratable' in data) {
    return `${data.migrated.length} migrated, ${data.migratable.length} migratable, ${data.blockers.length} blockers. ${data.reason}`;
  }

  if ('updated' in data) {
    return `${data.updated.length} updated, ${data.forced.length} forced, ${data.blockers.length} blockers, ${data.unchanged.length} unchanged. ${data.reason}`;
  }

  return `${data.updates.length} updates, ${data.blockers.length} blockers, ${data.forceOverridable.length} force-overridable, ${data.unchanged.length} unchanged.`;
}

function summaryForReadinessAnalysis(data: AnalysisResult): string {
  const recommended = data.findings.filter((finding) => finding.state === 'recommended').length;
  const detected = data.findings.filter((finding) => finding.state === 'detected').length;
  const conflicts = data.findings.filter((finding) => finding.state === 'conflict').length;
  const readiness = data.agentReadiness;
  if (!readiness) {
    return `${recommended} recommended, ${detected} detected, ${conflicts} conflicts.`;
  }

  const warnings = readiness.findings.filter((finding) => finding.severity === 'warning');
  const topFindings = (warnings.length > 0 ? warnings : readiness.findings)
    .slice(0, 3)
    .map((finding) => `- ${finding.category}: ${finding.reason} Recommendation: ${finding.recommendation}`)
    .join('\n');

  return [
    `${recommended} recommended, ${detected} detected, ${conflicts} conflicts.`,
    `Agent readiness: ${warnings.length} warnings across ${readiness.categories.length} categories.`,
    topFindings,
  ].filter(Boolean).join('\n');
}

function emitReport(content: string, options: CliOptions): void {
  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content);
    return;
  }

  console.log(content.trimEnd());
}

function printPlan(plan: InstallPlan): void {
  console.log(`Target: ${plan.targetDir}`);
  console.log(`Install targets: ${plan.agents.join(', ')}`);
  for (const item of plan.items) {
    const relDest = path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/');
    console.log(`- ${item.componentId} -> ${item.agent}:${relDest}${item.exists ? ' (exists)' : ''}`);
  }
}

function printHelp() {
  console.log(`Harness Hub

Usage:
  harness-hub analyze [target] [--target standard] [--agent-readiness] [--harness] [--json|--html] [--output file]
  harness-hub init-harness [target] [--dry-run|--yes] [--force] [--json|--html] [--output file]
  harness-hub validate-harness [target] [--json|--html] [--output file]
  harness-hub install [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub init [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub insight-generate [target] --input file [--slug slug] [--json|--html] [--output file]
  harness-hub insight-build [target] [--json|--html] [--output file]
  harness-hub insight-validate [target] [--json|--html] [--output file]
  harness-hub insight-publish [target] --dry-run [--allow-dirty] [--json|--html] [--output file]
  harness-hub status [target] [--json|--html] [--output file]
  harness-hub update [target] [--dry-run|--yes] [--component id] [--force] [--json|--html]
  harness-hub migrate-lock [target] [--dry-run|--yes] [--json|--html]
  harness-hub remove [target] [--dry-run|--yes] [--force] [--json|--html]
  harness-hub components

Supported install targets: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}
Install selects every standard skill component and overwrites same-name skill directories by default.
Use init-harness for Codex-only dev bootstrap: standard skills plus root harness files.
validate-harness includes minimal checks, five-subsystem assessment, and a structural benchmark.
Use insight-* for structured source-to-blog generation and GitHub Pages preflight.
`);
}
