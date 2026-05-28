import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export interface ManagedFileRecord {
  path: string;
  sha256: string;
  size: number;
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

export interface SkillHubLockV1 {
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

export interface SkillHubLockV2 {
  schemaVersion: 2;
  generatedAt: string;
  hubVersion: string;
  agents: AgentName[];
  components: ManagedComponentRecord[];
}

export type SkillHubLock = SkillHubLockV1 | SkillHubLockV2;

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
  data: SkillHubLock;
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
  exitCode: number;
  targetDir: string;
  componentId: string;
  requiredFiles: string[];
  present: string[];
  missing: string[];
  managed: string[];
  reason: string;
}

export interface SkillHubStatus {
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
const HARNESS_TEMPLATE_KINDS = new Set(['harness-template', 'harness-pack']);
const MINIMAL_HARNESS_REQUIRED_FILES = [
  'AGENTS.md',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'scripts/harness-validate.mjs',
];

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
    const action: HarnessPlanAction = exists ? (force ? 'overwrite' : 'skip') : 'create';
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
      reason: harnessPlanReason(action, exists, managed),
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
  const skipped = plan.items.filter((item) => item.action === 'skip');

  assertCanWriteHarnessLock(plan, installed);

  for (const item of installed) {
    fs.mkdirSync(path.dirname(item.dest), { recursive: true });
    fs.copyFileSync(item.sourceFile, item.dest);
  }

  const lock = installed.length > 0 ? writeHarnessLock(plan, installed) : readLock(plan.targetDir);
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

export function validateHarness(targetDirInput: string, options: StatusOptions = {}): HarnessValidationResult {
  const targetDir = path.resolve(targetDirInput);
  const index = options.index || readCapabilityIndex(options.hubRoot || HUB_ROOT);
  const { id, component } = getMinimalHarnessComponent(index);
  const requiredFiles = listHarnessTemplateFiles(options.hubRoot || HUB_ROOT, component).map((file) => file.relativePath);
  const managedFiles = getManagedFilePaths(readLock(targetDir), id);
  const present = requiredFiles.filter((relativePath) => safeRelativePathExists(targetDir, relativePath)).sort();
  const missing = requiredFiles.filter((relativePath) => !present.includes(relativePath)).sort();
  const managed = present.filter((relativePath) => managedFiles.has(relativePath)).sort();

  return {
    exitCode: missing.length > 0 ? 3 : 0,
    targetDir,
    componentId: id,
    requiredFiles,
    present,
    missing,
    managed,
    reason: missing.length > 0
      ? `${missing.length} required harness files are missing.`
      : 'Minimal harness files are present.',
  };
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
    .map((sourceFile) => ({
      sourceFile,
      relativePath: toPortablePath(path.relative(source, sourceFile)),
    }))
    .filter((file) => !file.relativePath.startsWith('.'))
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
  const lock: SkillHubLockV2 = {
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
  return {
    path: normalizePortablePath(relativePath),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
  };
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

function joinDestRelativePath(destRoot: string, sourceRelative: string): string {
  return destRoot === '.'
    ? sourceRelative
    : toPortablePath(path.posix.join(destRoot, sourceRelative));
}

function managedFileSourceRelativePath(targetDir: string, dest: string, managedPath: string): string {
  const destRoot = relativeDestRoot(targetDir, dest);
  const normalized = normalizePortablePath(managedPath);
  if (destRoot === '.') {
    return normalized;
  }
  if (!normalized.startsWith(`${destRoot}/`)) {
    throw new Error(`Managed file '${managedPath}' is outside destination '${destRoot}'.`);
  }
  return normalized.slice(destRoot.length + 1);
}

function planManagedFileCopies(
  targetDir: string,
  currentDest: string,
  nextDest: string,
  source: string,
  managedFiles: ManagedFileRecord[],
): Array<{ sourceFile: string; targetRelative: string; targetFile: string }> {
  const nextDestRoot = relativeDestRoot(targetDir, nextDest);
  return managedFiles.map((file) => {
    const sourceRelative = managedFileSourceRelativePath(targetDir, currentDest, file.path);
    const sourceFile = path.join(source, ...sourceRelative.split('/'));
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Component source file does not exist: ${sourceRelative}`);
    }
    const targetRelative = joinDestRelativePath(nextDestRoot, sourceRelative);
    return {
      sourceFile,
      targetRelative,
      targetFile: assertSafeRelativePath(targetDir, targetRelative),
    };
  });
}

function copyManagedFilesFromSource(
  targetDir: string,
  copies: Array<{ sourceFile: string; targetRelative: string; targetFile: string }>,
): ManagedFileRecord[] {
  for (const copy of copies) {
    fs.mkdirSync(path.dirname(copy.targetFile), { recursive: true });
    fs.copyFileSync(copy.sourceFile, copy.targetFile);
  }
  return copies
    .map((copy) => digestManagedFile(targetDir, copy.targetRelative))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function copyComponentSourceAndCollectManagedFiles(
  targetDir: string,
  dest: string,
  source: string,
): ManagedFileRecord[] {
  copyRecursive(source, dest);
  return collectManagedFilesFromSource(targetDir, dest, source);
}

function harnessPlanReason(action: HarnessPlanAction, exists: boolean, managed: boolean): string {
  if (action === 'create') {
    return 'Harness file is missing and will be created.';
  }
  if (action === 'overwrite') {
    return managed
      ? 'Existing lock-managed harness file will be overwritten because --force was provided.'
      : 'Existing unmanaged harness file will be overwritten because --force was provided.';
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
    files.push({
      path: relativePath,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      size: bytes.byteLength,
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

    const bytes = fs.readFileSync(filePath);
    const currentHash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (currentHash !== file.sha256) {
      modified.push(file.path);
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
  const skillHubDir = path.join(plan.targetDir, '.skill-hub');
  fs.mkdirSync(skillHubDir, { recursive: true });
  const lockPath = path.join(skillHubDir, 'lock.json');
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
  const lock: SkillHubLockV2 = {
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
  const lockPath = path.join(path.resolve(targetDir), '.skill-hub', 'lock.json');
  if (!fs.existsSync(lockPath)) {
    return null;
  }
  return {
    path: lockPath,
    data: JSON.parse(fs.readFileSync(lockPath, 'utf8')) as SkillHubLock,
  };
}

function writeLockData(targetDir: string, lock: SkillHubLock): LockReadResult {
  const skillHubDir = path.join(path.resolve(targetDir), '.skill-hub');
  fs.mkdirSync(skillHubDir, { recursive: true });
  const lockPath = path.join(skillHubDir, 'lock.json');
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return { path: lockPath, data: lock };
}

export function getStatus(options: StatusOptions = {}): SkillHubStatus {
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
      reason: 'No Skill Hub lock found.',
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

  const lockPath = path.join(targetDir, '.skill-hub', 'lock.json');
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
    throw new Error(`Selected component '${selectedComponents[0]}' is not managed because no Skill Hub lock was found.`);
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
  component: SkillHubLock['components'][number],
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
  component: SkillHubLock['components'][number],
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
  component: SkillHubLock['components'][number],
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
      reason: plan.blockers.length > 0 ? 'Update blocked by safety checks.' : 'No Skill Hub lock found.',
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
  const nextLock: SkillHubLockV2 = {
    ...JSON.parse(JSON.stringify(lock.data)) as SkillHubLockV2,
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
    const ownedFileCopies = updatesOwnedFilesOnly
      ? planManagedFileCopies(targetDir, component.dest, nextDest, source, oldFiles)
      : [];
    for (const file of oldFiles) {
      const filePath = assertSafeRelativePath(targetDir, file.path);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
        pruneEmptyParents(targetDir, path.dirname(filePath));
      }
    }

    const dest = assertSafeRelativePath(targetDir, nextDest);
    if (!updatesOwnedFilesOnly && latestRef.rename && fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    const files = updatesOwnedFilesOnly
      ? copyManagedFilesFromSource(targetDir, ownedFileCopies)
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
      reason: 'Destination file list differs from current Skill Hub component assets.',
    };
  }

  for (const key of sourceKeys) {
    if (sourceFiles.get(key)?.sha256 !== destFiles.get(key)?.sha256) {
      return { matches: false, evidence: [key], reason: 'Destination file content differs from current Skill Hub component assets.' };
    }
  }

  return { matches: true, evidence: sourceKeys, reason: 'Destination exactly matches current Skill Hub component assets.' };
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
      reason: 'No Skill Hub lock found.',
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

  const nextLock: SkillHubLockV2 = {
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

export function writeStatusReport(status: SkillHubStatus, hubVersion: string): string {
  const reportDir = path.join(status.targetDir, '.skill-hub', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const filePath = path.join(reportDir, `status-${timestampForFile()}.html`);
  fs.writeFileSync(filePath, renderHtml({
    title: 'Skill Hub Status Report',
    summary: status.lock
      ? `${status.current.length} current, ${status.updates.length} updates, ${status.missing.length} missing.`
      : 'No Skill Hub lock file found.',
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
  const reportDir = path.join(plan.targetDir, '.skill-hub', 'reports');
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
    title: 'Skill Hub Install Report',
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
      console.error(`skill-hub: ${error.message}`);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = /Unsupported agent|Unknown command|Missing value|Selected component/.test(message) ? 2 : 1;
    console.error(`skill-hub: ${message}`);
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

  if (options.command === 'init-harness') {
    if (!options.dryRun && !options.yes) {
      throw new CliError('Use --yes to confirm non-interactive harness initialization or --dry-run to preview.', 2);
    }
    const plan = planHarnessInit({
      targetDir: options.targetDir || undefined,
      force: options.force,
    });
    if (options.dryRun) {
      emitReport(renderLifecycleReport('Harness Hub Init Plan', plan, options), options);
      return 0;
    }
    const result = applyHarnessInit(plan);
    emitReport(renderLifecycleReport('Harness Hub Init Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'validate-harness') {
    const result = validateHarness(options.targetDir || process.cwd());
    emitReport(renderLifecycleReport('Harness Hub Validation Report', result, options), options);
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
        emitReport(renderLifecycleReport('Skill Hub Install Plan', plan, options), options);
      } else {
        printPlan(plan);
      }
      return 0;
    }
    const result = applyInstall(plan, options);
    if (options.json || options.html || options.output) {
      emitReport(renderLifecycleReport('Skill Hub Install Report', result, options), options);
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
    emitReport(renderLifecycleReport('Skill Hub Status Report', status, options), options);
    return 0;
  }

  if (options.command === 'remove') {
    const result = removeManaged(options.targetDir || process.cwd(), {
      dryRun: options.dryRun,
      yes: options.yes,
      force: options.force,
    });
    emitReport(renderLifecycleReport('Skill Hub Remove Report', result, options), options);
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
      emitReport(renderLifecycleReport('Skill Hub Update Report', updatePlan, options), options);
      return 0;
    }
    const updateResult = updateManaged(options.targetDir || process.cwd(), {
      yes: options.yes,
      force: options.force,
      components: options.componentIds,
    });
    emitReport(renderLifecycleReport('Skill Hub Update Report', updateResult, options), options);
    return updateResult.exitCode;
  }

  if (options.command === 'migrate-lock') {
    const migration = migrateLock(options.targetDir || process.cwd(), {
      dryRun: options.dryRun,
      yes: options.yes,
    });
    emitReport(renderLifecycleReport('Skill Hub Lock Migration Report', migration, options), options);
    return migration.exitCode;
  }

  throw new CliError(`Unknown command '${options.command}'`, 2);
}

function renderLifecycleReport(
  title: string,
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult,
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
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult,
): HtmlRow[] {
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

  if ('requiredFiles' in data) {
    return [
      ...data.present.map((file) => ({ id: file, state: data.managed.includes(file) ? 'managed' : 'present' })),
      ...data.missing.map((file) => ({ id: file, state: 'missing' })),
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
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan | UpdateResult | LockMigrationResult | HarnessInitPlan | HarnessInitResult | HarnessValidationResult,
): string {
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

  if ('requiredFiles' in data) {
    return `${data.present.length} present, ${data.missing.length} missing. ${data.reason}`;
  }

  if ('rows' in data) {
    return data.lock
      ? `${data.current.length} current, ${data.updates.length} updates, ${data.modified.length} modified, ${data.missing.length} missing.`
      : 'No Skill Hub lock found.';
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

Compatible commands: harness-hub, skill-hub

Usage:
  harness-hub analyze [target] [--target standard] [--agent-readiness] [--harness] [--json|--html] [--output file]
  harness-hub init-harness [target] [--dry-run|--yes] [--force] [--json|--html] [--output file]
  harness-hub validate-harness [target] [--json|--html] [--output file]
  harness-hub install [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub init [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub status [target] [--json|--html] [--output file]
  harness-hub update [target] [--dry-run|--yes] [--component id] [--force] [--json|--html]
  harness-hub migrate-lock [target] [--dry-run|--yes] [--json|--html]
  harness-hub remove [target] [--dry-run|--yes] [--force] [--json|--html]
  harness-hub components

Skill Hub compatibility examples:
  skill-hub analyze [target] [--target standard] [--agent-readiness] [--harness] [--json|--html] [--output file]
  skill-hub init-harness [target] [--dry-run|--yes] [--force] [--json|--html] [--output file]
  skill-hub validate-harness [target] [--json|--html] [--output file]
  skill-hub install [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  skill-hub init [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  skill-hub status [target] [--json|--html] [--output file]
  skill-hub update [target] [--dry-run|--yes] [--component id] [--force] [--json|--html]
  skill-hub migrate-lock [target] [--dry-run|--yes] [--json|--html]
  skill-hub remove [target] [--dry-run|--yes] [--force] [--json|--html]
  skill-hub components

Supported install targets: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}
Install selects every standard skill component and overwrites same-name skill directories by default.
Root harness files are written only by init-harness.
`);
}
