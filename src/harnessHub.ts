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
  'external_tools',
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

export type CodexActivationAction = 'sync' | 'remove-stale' | 'block';

export interface CodexActivationItem {
  skillName: string;
  source: string | null;
  dest: string;
  action: CodexActivationAction;
  reason: string;
  exists: boolean;
  managed: boolean;
}

export interface CodexActivationPlan {
  schemaVersion: 1;
  generatedAt: string;
  targetDir: string;
  sourceSkillsRoot: string;
  codexSkillsRoot: string;
  dryRun: boolean;
  items: CodexActivationItem[];
  blockers: CodexActivationItem[];
}

export interface CodexActivationResult extends CodexActivationPlan {
  exitCode: 0 | 1;
  synced: CodexActivationItem[];
  staleRemoved: CodexActivationItem[];
  skipped: CodexActivationItem[];
  reason: string;
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
    | 'loop-policy'
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
  effectiveInteractSummaryPath: string;
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

export type HarnessHubCheckState =
  | 'current'
  | 'update-available'
  | 'not-managed'
  | 'attention-required'
  | 'unavailable';

export interface HarnessHubCliCheck {
  state: Exclude<HarnessHubCheckState, 'not-managed' | 'attention-required'>;
  packageName: string;
  currentVersion: string;
  latestVersion: string | null;
  installMethod: 'npm' | 'source' | 'unknown';
  registryUrl: string;
  checkedAt: string;
  message: string;
  recommendedCommand: string | null;
  evidence: string[];
}

export interface HarnessHubTargetCheck {
  state: HarnessHubCheckState;
  targetDir: string;
  lockPath: string | null;
  current: StatusRow[];
  updates: StatusRow[];
  blockers: StatusRow[];
  forceOverridable: StatusRow[];
  modified: StatusRow[];
  missing: StatusRow[];
  skipped: StatusRow[];
  unknown: StatusRow[];
  recommendedCommand: string | null;
  message: string;
  evidence: string[];
}

export type ExternalToolSuggestionState = 'configured' | 'installed' | 'recommended';
export type ExternalToolSuggestionId = 'codegraph' | 'headroom';

export interface ExternalToolSuggestion {
  id: ExternalToolSuggestionId;
  name: string;
  source: string;
  state: ExternalToolSuggestionState;
  installed: boolean;
  configured: boolean;
  targetInitialized: boolean | null;
  risk: LifecycleRisk;
  message: string;
  recommendation: string;
  recommendedCommands: string[];
  evidence: string[];
}

export interface HarnessHubCheckResult {
  schemaVersion: 1;
  generatedAt: string;
  exitCode: 0;
  hubVersion: string;
  cli: HarnessHubCliCheck;
  target: HarnessHubTargetCheck;
  externalTools: ExternalToolSuggestion[];
  reason: string;
}

export type SelfCheckState = 'pass' | 'warn' | 'fail' | 'skipped';

export interface SelfCheckFinding {
  id: string;
  severity: 'advisory' | 'failure';
  message: string;
  evidence: string[];
  recommendedCommand: string | null;
}

export interface SelfCheckHarnessValidation {
  state: SelfCheckState;
  strict: boolean;
  attempted: boolean;
  initialized: boolean;
  exitCode: number | null;
  validation: HarnessValidationResult | null;
  reason: string;
  evidence: string[];
}

export interface HarnessHubSelfCheckResult {
  schemaVersion: 1;
  generatedAt: string;
  exitCode: 0 | 1;
  hubVersion: string;
  targetDir: string;
  check: HarnessHubCheckResult;
  harnessValidation: SelfCheckHarnessValidation;
  hardFailures: SelfCheckFinding[];
  advisories: SelfCheckFinding[];
  reason: string;
}

interface LatestPackageVersionResult {
  ok: boolean;
  latestVersion: string | null;
  registryUrl: string;
  reason: string;
}

type InsightCliAction = 'generate' | 'build' | 'validate' | 'publish';
type LoopCliAction = 'evaluate' | 'schedule';
export type LoopDecision = 'continue' | 'interrupt';
export type LoopDecisionConfidence = 'high' | 'medium';

export interface LoopActionIntent {
  schemaVersion?: number;
  id?: string;
  summary?: string;
  capabilityInvocation?: string;
  action?: string;
  sideEffects?: string[];
  riskSignals?: string[];
  requiredEvidence?: string[];
  targetPaths?: string[];
  validation?: {
    command?: string;
    status?: string;
    evidence?: string[];
  };
}

export interface LoopDecisionResult {
  schemaVersion: 1;
  generatedAt: string;
  targetDir: string;
  policyVersion: string;
  actionId: string;
  summary: string;
  capabilityInvocation: string;
  decision: LoopDecision;
  confidence: LoopDecisionConfidence;
  reason: string;
  sideEffects: string[];
  riskSignals: string[];
  requiredEvidence: string[];
  interruptReasons: string[];
  continueReasons: string[];
  ledgerPath: string;
  recorded: boolean;
  exitCode: 0 | 3;
}

export interface LoopScheduleResult {
  schemaVersion: 1;
  generatedAt: string;
  targetDir: string;
  runId: string;
  inputPath: string;
  decisions: LoopDecisionResult[];
  nextActionId: string | null;
  interruptedActionIds: string[];
  ledgerPath: string;
  recorded: boolean;
  exitCode: 0 | 3;
  reason: string;
}

interface CliOptions {
  command: string;
  insightAction: InsightCliAction | null;
  loopAction: LoopCliAction | null;
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
  validateHarness: boolean;
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

interface CheckOptions extends StatusOptions {
  packageName?: string;
  currentVersion?: string;
  registryBaseUrl?: string;
  pathEnv?: string;
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
  latestVersionResolver?: (packageName: string, registryBaseUrl: string) => Promise<LatestPackageVersionResult>;
}

interface SelfCheckOptions extends CheckOptions {
  validateHarness?: boolean;
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

const CODEX_SKILLS_RELATIVE_DIR = '.codex/skills';
const CODEX_MANAGED_MARKER = '.harness-hub-managed';
const CODEX_PRESERVED_LOCAL_DIRS = new Set(['artifacts']);

const MANAGED_COMPONENT_RENAMES: Readonly<Record<string, ManagedComponentRename>> = Object.freeze({
  'skill:html-work-reports': {
    to: 'skill:effective-interact',
    reason: 'Component was renamed from skill:html-work-reports to skill:effective-interact.',
  },
});

const VALID_RISKS = new Set<LifecycleRisk>(['low', 'medium', 'high']);
const GLOB_CHARS = /[*?[\]{}]/;
const MINIMAL_HARNESS_COMPONENT_ID = 'harness:minimal';
const LOOP_POLICY_VERSION = 'interrupt-policy:v1';
const LOOP_INTERRUPT_DECISION_LEDGER = '.harness-hub/state/interrupt-decisions.jsonl';
const LOOP_RUN_LEDGER = '.harness-hub/state/loop-runs.jsonl';
const LOOP_ALLOWED_SIDE_EFFECTS = new Set([
  'read-only',
  'local-files',
  'local-state',
  'test-run',
  'validation-run',
  'report-only',
  'generated-local-report',
]);
const LOOP_INTERRUPT_SIDE_EFFECTS = new Set([
  'remote-write',
  'external-write',
  'publish',
  'deploy',
  'push',
  'merge',
  'release',
  'tag',
  'global-state',
  'global-install',
  'credential-change',
  'permission-change',
  'secret-access',
  'destructive',
  'data-delete',
  'schedule',
  'webhook',
]);
const LOOP_INTERRUPT_RISK_SIGNALS = new Set([
  'approval-required',
  'canonical-rule-change',
  'credential-change',
  'data-loss',
  'destructive-change',
  'external-side-effect',
  'global-state-change',
  'human-review-needed',
  'no-fabrication-risk',
  'permission-change',
  'publication-boundary',
  'remote-side-effect',
  'scope-drift',
  'secret-risk',
  'security-risk',
  'unclear-causality',
  'unclear-ownership',
  'validation-failed',
  'verification-missing',
]);
const HARNESS_COMPONENT_ID = MINIMAL_HARNESS_COMPONENT_ID;
const HARNESS_TEMPLATE_KINDS = new Set(['harness-template', 'harness-pack']);
const HARNESS_DEST = '.';
const HARNESS_SUBSYSTEMS: HarnessSubsystemName[] = ['instructions', 'state', 'verification', 'scope', 'lifecycle'];
const HARNESS_STATE_FILES = Object.freeze([
  '.harness-hub/state/current-task.md',
  '.harness-hub/state/decisions.md',
  '.harness-hub/state/progress.md',
  '.harness-hub/state/session-handoff.md',
  '.harness-hub/state/loop-runs.jsonl',
  '.harness-hub/state/interrupt-decisions.jsonl',
  '.harness-hub/state/capability-events.jsonl',
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
  'state-templates/loop-runs.jsonl': '.harness-hub/state/loop-runs.jsonl',
  'state-templates/interrupt-decisions.jsonl': '.harness-hub/state/interrupt-decisions.jsonl',
  'state-templates/capability-events.jsonl': '.harness-hub/state/capability-events.jsonl',
  'loop-templates/policies/interrupt-policy.md': '.harness-hub/loop/policies/interrupt-policy.md',
  'loop-templates/policies/action-audit-schema.md': '.harness-hub/loop/policies/action-audit-schema.md',
  'loop-templates/evals/interrupt-policy/good-cases.jsonl': '.harness-hub/loop/evals/interrupt-policy/good-cases.jsonl',
  'loop-templates/evals/interrupt-policy/bad-cases.jsonl': '.harness-hub/loop/evals/interrupt-policy/bad-cases.jsonl',
  'loop-templates/evals/interrupt-policy/regression-cases.jsonl': '.harness-hub/loop/evals/interrupt-policy/regression-cases.jsonl',
} satisfies Record<string, string>);
const HARNESS_SIZE_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  'AGENTS.md': 32 * 1024,
  '.harness-hub/state/decisions.md': 16 * 1024,
  '.harness-hub/state/progress.md': 16 * 1024,
  '.harness-hub/state/session-handoff.md': 16 * 1024,
  '.harness-hub/state/current-task.md': 16 * 1024,
  '.harness-hub/state/loop-runs.jsonl': 64 * 1024,
  '.harness-hub/state/interrupt-decisions.jsonl': 64 * 1024,
  '.harness-hub/state/capability-events.jsonl': 64 * 1024,
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
    buildExternalToolsFinding(targetDir),
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

function buildExternalToolsFinding(targetDir: string): AgentReadinessFinding {
  const evidence = detectExternalToolTargetEvidence(targetDir);
  if (evidence.length === 0) {
    return makeReadinessFinding({
      id: 'external_tools.no_external_tool_markers',
      category: 'external_tools',
      state: 'not-detected',
      severity: 'info',
      reason: 'No CodeGraph index or Headroom project marker was detected.',
      recommendation: 'Use harness-hub check for host install/config advice; consider CodeGraph for structural code intelligence and Headroom for explicit context-compression/proxy workflows.',
      evidence,
    });
  }

  return makeReadinessFinding({
    id: 'external_tools.external_tool_markers',
    category: 'external_tools',
    state: 'detected',
    severity: 'info',
    reason: 'External tool project markers were detected.',
    recommendation: 'Keep external tools explicit and review their generated config before relying on them in default agent workflows.',
    evidence,
  });
}

function detectExternalToolTargetEvidence(targetDir: string): AgentReadinessEvidence[] {
  const evidence: AgentReadinessEvidence[] = [];
  if (safeRelativePathExists(targetDir, '.codegraph')) {
    evidence.push({
      kind: 'path',
      value: '.codegraph',
      detail: 'CodeGraph project index marker',
    });
  }
  if (safeRelativePathExists(targetDir, '.headroom')) {
    evidence.push({
      kind: 'path',
      value: '.headroom',
      detail: 'Headroom project-local state marker',
    });
  }
  return evidence;
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
  const interruptPolicy = text('.harness-hub/loop/policies/interrupt-policy.md');
  const actionAuditSchema = text('.harness-hub/loop/policies/action-audit-schema.md');
  const interruptGoodCases = text('.harness-hub/loop/evals/interrupt-policy/good-cases.jsonl');
  const interruptBadCases = text('.harness-hub/loop/evals/interrupt-policy/bad-cases.jsonl');
  const interruptRegressionCases = text('.harness-hub/loop/evals/interrupt-policy/regression-cases.jsonl');
  const validationScript = text('scripts/harness-validate.mjs') || text('init.sh');
  const definitionOfDone = text('definition-of-done.md');
  const cleanState = text('clean-state-checklist.md');
  const evaluatorRubric = text('evaluator-rubric.md');
  const qualityDocument = text('quality-document.md');
  const allText = [...files.entries()].map(([relativePath, content]) => `${relativePath}\n${content}`).join('\n\n');

  const subsystemChecks: Record<HarnessSubsystemName, HarnessAssessmentCheck[]> = {
    instructions: [
      assessmentFileCheck(files, ['AGENTS.md', 'CLAUDE.md'], 'Agent instruction file exists'),
      assessmentTextCheck(agents, ['Initialization Gate', 'Operating Rules', 'Startup Workflow', 'Before writing code', 'Start from'], 'Startup or operating workflow is documented'),
      assessmentTextCheck(agents + definitionOfDone, ['Required Handoff', 'Definition of Done', 'done only when', 'handoff'], 'Completion or handoff gate is documented'),
      assessmentTextCheck(agents + currentTask, ['harness-validate.mjs', 'Validation commands', 'test', 'verify'], 'Verification command is discoverable'),
      assessmentTextCheck(agents, ['feature_list.json', '.harness-hub/state/progress.md', '.harness-hub/state/decisions.md', '.harness-hub/state/session-handoff.md', '.harness-hub/state/current-task.md', 'quality-document.md', 'evaluator-rubric.md'], 'State artifacts are routed from instructions'),
      assessmentTextCheck(agents + currentTask, ['P0/P1/P2', 'agent-run browser', 'Web browser acceptance'], 'Validation priority and browser acceptance rules are discoverable'),
      assessmentTextCheck(agents + currentTask + definitionOfDone, ['PR status', 'mergeability', 'CI/check-run'], 'PR closeout gate is documented'),
    ],
    state: [
      assessmentFileCheck(files, ['feature_list.json', 'feature-list.json'], 'Feature tracker exists'),
      assessmentFeatureListCheck(featureList, 'Feature tracker is valid and has required structure'),
      assessmentFileCheck(files, ['.harness-hub/state/decisions.md'], 'Decision log exists'),
      assessmentTextCheck(decisions, ['Active Decisions', 'Resolved Decisions', 'Decision', 'Rationale', 'Status', 'Follow-up'], 'Decision log captures rationale and status'),
      assessmentFileCheck(files, ['.harness-hub/state/progress.md'], 'Progress log exists'),
      assessmentTextCheck(progress, ['Current State', 'Recent Validation', 'Validation Records', 'Runtime Signals', 'Web browser acceptance', 'PR Status', 'Review Feedback To Rules', 'Blockers', 'Next'], 'Progress log supports restart'),
      assessmentTextCheck(handoff, ['Current Status', 'Changed Files', 'Validation Evidence', 'Validation Records', 'Runtime Signals', 'Web browser acceptance', 'PR Status', 'Review Feedback To Rules', 'Blockers', 'Next Action'], 'Handoff captures status, files, evidence, blockers, and next action'),
      assessmentFileCheck(files, ['.harness-hub/state/loop-runs.jsonl', '.harness-hub/state/interrupt-decisions.jsonl', '.harness-hub/state/capability-events.jsonl'], 'Loop runtime ledgers exist as target-local state'),
      assessmentTextCheck(actionAuditSchema, ['interrupt-decisions.jsonl', 'capability-events.jsonl', 'loop-runs.jsonl', 'continue|interrupt'], 'Loop audit ledger schema is documented'),
      assessmentFileCheck(files, ['quality-document.md'], 'Quality snapshot exists'),
      assessmentTextCheck(qualityDocument, ['Quality Snapshot', 'Product Areas', 'P0/P1/P2 validation status', 'Browser acceptance status', 'Architecture Layers', 'Change History'], 'Quality snapshot captures areas, browser acceptance, layers, and history'),
    ],
    verification: [
      assessmentFileCheck(files, ['scripts/harness-validate.mjs', 'init.sh'], 'Verification entrypoint exists'),
      assessmentTextCheck(agents + currentTask, ['harness-validate.mjs', 'Validation commands'], 'Verification entrypoint is referenced by the harness'),
      assessmentTextCheck(validationScript, ['process.exit', 'set -e', 'failures'], 'Verification entrypoint can fail the run'),
      assessmentTextCheck(progress + handoff + currentTask, ['Validation Evidence', 'Recent Validation', 'Command', 'Status', 'Passed', 'Failed', 'Evidence', 'Commit'], 'Validation evidence has a durable place to be recorded'),
      assessmentTextCheck(currentTask + progress + handoff, ['Validation tiers', 'P0', 'P1', 'P2', 'Static', 'Runtime', 'User flow', 'Web browser acceptance', 'Runtime Signals', 'Standard startup path', 'PR Status', 'Mergeability', 'CI/check'], 'Static, runtime, startup, user-flow, priority, and PR closeout tiers are represented'),
      assessmentTextCheck(interruptGoodCases + interruptBadCases + interruptRegressionCases, ['expectedDecision', 'continue', 'interrupt', 'riskSignals'], 'Interrupt policy eval cases are present and machine-readable'),
      assessmentFileCheck(files, ['evaluator-rubric.md'], 'Evaluator rubric exists'),
      assessmentTextCheck(evaluatorRubric, ['Correctness', 'Verification', 'Scope discipline', 'Runtime reliability', 'Browser acceptance', 'Handoff readiness', 'Verdict'], 'Evaluator rubric covers correctness, evidence, scope, reliability, browser acceptance, and handoff readiness'),
      assessmentCheck(project.verificationCommands.length > 0, 'Project verification command is detected', project.verificationCommands),
    ],
    scope: [
      assessmentTextCheck(agents + currentTask, ['one git worktree', 'one feature', 'Allowed paths', 'Forbidden paths', 'Checkpoint policy'], 'Work is scoped to a task, branch, worktree, or allowed paths'),
      assessmentTextCheck(currentTask, ['Allowed paths', 'Forbidden paths'], 'Allowed and forbidden paths are explicit'),
      assessmentTextCheck(currentTask + definitionOfDone, ['Acceptance criteria', 'Definition of Done', 'end-to-end', 'Standard startup path'], 'Acceptance or done criteria are explicit'),
      assessmentTextCheck(decisions + currentTask, ['Decision log', 'decision-level', 'Rationale', 'Status'], 'Decision boundary is documented'),
      assessmentTextCheck(agents + currentTask + featureList, ['Parallel writes', 'parallel_write_policy', 'non-overlapping'], 'Parallel write boundary is documented'),
      assessmentCheck(files.has('feature_list.json') || files.has('feature-list.json'), 'Feature state provides a scope inventory', ['feature_list.json']),
    ],
    lifecycle: [
      assessmentTextCheck(agents + currentTask, ['Start from', 'Current Task', '.harness-hub/state/current-task.md'], 'Startup path points to the active task'),
      assessmentFileCheck(files, ['.harness-hub/state/session-handoff.md'], 'Session handoff template exists'),
      assessmentTextCheck(progress + decisions + handoff, ['Current Status', 'Current State', 'Next Action', 'Recommended Next Step', 'Active Decisions', 'Runtime Signals'], 'Session restart markers exist'),
      assessmentFileCheck(files, ['.harness-hub/loop/policies/interrupt-policy.md', '.harness-hub/loop/policies/action-audit-schema.md'], 'Loop control-plane policies exist'),
      assessmentTextCheck(agents + featureList + interruptPolicy, ['Loop Control Plane', 'Interrupt Policy', 'standalone', 'composable', 'loop-participant'], 'Loop control-plane boundary is documented'),
      assessmentFileCheck(files, ['clean-state-checklist.md', 'definition-of-done.md', 'quality-document.md', 'evaluator-rubric.md'], 'Clean state, quality, review, and done guidance exists'),
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
    '.harness-hub/state/loop-runs.jsonl',
    '.harness-hub/state/interrupt-decisions.jsonl',
    '.harness-hub/state/capability-events.jsonl',
    '.harness-hub/loop/policies/interrupt-policy.md',
    '.harness-hub/loop/policies/action-audit-schema.md',
    '.harness-hub/loop/evals/interrupt-policy/good-cases.jsonl',
    '.harness-hub/loop/evals/interrupt-policy/bad-cases.jsonl',
    '.harness-hub/loop/evals/interrupt-policy/regression-cases.jsonl',
    'clean-state-checklist.md',
    'definition-of-done.md',
    'evaluator-rubric.md',
    'quality-document.md',
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
      && isRecord(parsed.feature_state_policy)
      && isRecord(parsed.validation_priority_policy)
      && isRecord(parsed.web_acceptance_policy)
      && isRecord(parsed.pr_closeout_policy)
      && isRecord(parsed.loop_control_policy)
      && isRecord(parsed.parallel_write_policy);
    return assessmentCheck(pass, message, ['features array', 'feature_state_policy object', 'validation_priority_policy object', 'web_acceptance_policy object', 'pr_closeout_policy object', 'loop_control_policy object', 'parallel_write_policy object']);
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
  checks.push(validateFileContains(targetDir, 'AGENTS.md', [
    'Codex',
    'Initialization Gate',
    'Loop Control Plane',
    'Interrupt Policy',
    'harness-validate.mjs',
    'harness-hub check',
    'current-task.md',
    'checkpoint commit',
    'quality snapshot',
    'worktree',
    'decisions.md',
    'session-handoff',
    'P0/P1/P2',
    'agent-run browser',
    'PR status',
    'mergeability',
    'CI/check-run',
  ]));
  checks.push(validateFileContains(targetDir, '.harness-hub/.gitignore', ['state/', 'reports/']));
  checks.push(validateFileContains(targetDir, '.harness-hub/loop/policies/interrupt-policy.md', [
    'Interrupt Policy',
    'standalone',
    'composable',
    'loop-participant',
    'Continue By Default',
    'Interrupt',
    'Audit Requirement',
  ]));
  checks.push(validateFileContains(targetDir, '.harness-hub/loop/policies/action-audit-schema.md', [
    'Runtime Ledgers',
    'loop-runs.jsonl',
    'interrupt-decisions.jsonl',
    'capability-events.jsonl',
    'continue|interrupt',
  ]));
  checks.push(...validateInterruptPolicyEvals(targetDir));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/decisions.md', [
    'Active Decisions',
    'Resolved Decisions',
    'Decision',
    'Rationale',
    'Status',
    'Follow-up',
  ]));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/progress.md', [
    'Recent Validation',
    'Validation Records',
    'Command',
    'Status',
    'Exit code',
    'Passed',
    'Failed',
    'Evidence',
    'Commit',
    'Runtime Signals',
    'Web browser acceptance',
    'PR Status',
    'Mergeability',
    'CI/check runs',
    'Review Feedback To Rules',
  ]));
  checks.push(validateJsonlFile(targetDir, '.harness-hub/state/loop-runs.jsonl', 'loop-policy'));
  checks.push(validateJsonlFile(targetDir, '.harness-hub/state/interrupt-decisions.jsonl', 'loop-policy'));
  checks.push(validateJsonlFile(targetDir, '.harness-hub/state/capability-events.jsonl', 'loop-policy'));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/session-handoff.md', [
    'Validation Evidence',
    'Validation Records',
    'Command',
    'Status',
    'Exit code',
    'Passed',
    'Failed',
    'Evidence',
    'Commit',
    'Runtime Signals',
    'Web browser acceptance',
    'PR Status',
    'Mergeability',
    'CI/check runs',
    'Review Feedback To Rules',
  ]));
  checks.push(validateFileContains(targetDir, '.harness-hub/state/current-task.md', [
    'Goal',
    'Assumptions',
    'Non-goals',
    'Allowed paths',
    'Forbidden paths',
    'Acceptance criteria',
    'Standard startup path',
    'harness-hub check',
    'Validation commands',
    'Validation tiers',
    'P0',
    'P1',
    'P2',
    'Web browser acceptance',
    'agent-run browser',
    'Runtime signals',
    'PR closeout',
    'Mergeability',
    'CI/check-run status',
    'Checkpoint policy',
    'Spec updates',
    'Decision log',
    'Parallel writes',
    'Handoff requirements',
  ]));
  checks.push(validateFileContains(targetDir, 'clean-state-checklist.md', [
    'Standard startup path',
    'harness-hub check',
    'Runtime signals',
    'P0',
    'P1',
    'P2',
    'Web browser acceptance',
    'PR status',
    'mergeability',
    'CI/check-run',
    'Review Feedback',
    'evaluator-rubric.md',
    'quality-document.md',
  ]));
  checks.push(validateFileContains(targetDir, 'definition-of-done.md', [
    'Static checks',
    'runtime checks',
    'end-to-end',
    'P0',
    'P1',
    'P2',
    'agent-run browser',
    'Standard startup path',
    'harness-hub check',
    'Runtime logs',
    'PR status',
    'mergeability',
    'CI/check-run',
    'evaluator rubric',
    'quality snapshot',
  ]));
  checks.push(validateFileContains(targetDir, 'evaluator-rubric.md', [
    'Correctness',
    'Verification',
    'Scope discipline',
    'Runtime reliability',
    'Browser acceptance',
    'Handoff readiness',
    'Verdict',
  ]));
  checks.push(validateFileContains(targetDir, 'quality-document.md', [
    'Quality Snapshot',
    'Rating Standard',
    'Product Areas',
    'P0/P1/P2 validation status',
    'Browser acceptance status',
    'Architecture Layers',
    'Change History',
  ]));
  checks.push(validateFeatureListJson(targetDir));
  checks.push(validateQaBoundary(targetDir));
  checks.push(validateAgentArchitectureBoundary(targetDir));
  checks.push(validateSkillTriggerHygiene(targetDir));
  return checks;
}

function validateJsonlFile(
  targetDir: string,
  relativePath: string,
  code: HarnessValidationCheck['code'] = 'structured-content',
): HarnessValidationCheck {
  const filePath = path.join(targetDir, relativePath);
  if (!fs.existsSync(filePath)) {
    return {
      code,
      state: 'fail',
      path: relativePath,
      reason: 'JSONL file is missing.',
      evidence: ['valid JSON per non-empty line'],
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const invalid: string[] = [];
  lines.forEach((line, index) => {
    try {
      JSON.parse(line);
    } catch {
      invalid.push(`line ${index + 1}`);
    }
  });

  return {
    code,
    state: invalid.length === 0 ? 'pass' : 'fail',
    path: relativePath,
    reason: invalid.length === 0
      ? 'JSONL file is parseable.'
      : `JSONL file has invalid JSON on ${invalid.join(', ')}.`,
    evidence: invalid.length === 0 ? [`${lines.length} records`] : invalid,
  };
}

function validateInterruptPolicyEvals(targetDir: string): HarnessValidationCheck[] {
  return [
    validateInterruptPolicyEvalFile(targetDir, '.harness-hub/loop/evals/interrupt-policy/good-cases.jsonl', 'continue'),
    validateInterruptPolicyEvalFile(targetDir, '.harness-hub/loop/evals/interrupt-policy/bad-cases.jsonl', 'interrupt'),
    validateInterruptPolicyEvalFile(targetDir, '.harness-hub/loop/evals/interrupt-policy/regression-cases.jsonl'),
  ];
}

function validateInterruptPolicyEvalFile(
  targetDir: string,
  relativePath: string,
  requiredDecision?: 'continue' | 'interrupt',
): HarnessValidationCheck {
  const parseCheck = validateJsonlFile(targetDir, relativePath, 'loop-policy');
  if (parseCheck.state === 'fail') {
    return parseCheck;
  }

  const records = fs.readFileSync(path.join(targetDir, relativePath), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
  const issues: string[] = [];
  if (records.length === 0) {
    issues.push('file must contain at least one eval case');
  }
  for (const [index, record] of records.entries()) {
    const prefix = `line ${index + 1}`;
    if (!isRecord(record)) {
      issues.push(`${prefix}: record must be an object`);
      continue;
    }
    if (typeof record.id !== 'string' || record.id.trim().length === 0) {
      issues.push(`${prefix}: missing id`);
    }
    if (typeof record.summary !== 'string' || record.summary.trim().length === 0) {
      issues.push(`${prefix}: missing summary`);
    }
    if (record.expectedDecision !== 'continue' && record.expectedDecision !== 'interrupt') {
      issues.push(`${prefix}: expectedDecision must be continue or interrupt`);
    }
    if (requiredDecision && record.expectedDecision !== requiredDecision) {
      issues.push(`${prefix}: expectedDecision must be ${requiredDecision}`);
    }
    if (!Array.isArray(record.riskSignals) || record.riskSignals.length === 0) {
      issues.push(`${prefix}: missing riskSignals`);
    }
    if (!Array.isArray(record.requiredEvidence) || record.requiredEvidence.length === 0) {
      issues.push(`${prefix}: missing requiredEvidence`);
    }
  }

  return {
    code: 'loop-policy',
    state: issues.length === 0 ? 'pass' : 'fail',
    path: relativePath,
    reason: issues.length === 0
      ? 'Interrupt policy eval cases are machine-readable and semantically valid.'
      : `Interrupt policy eval issues: ${issues.slice(0, 6).join('; ')}${issues.length > 6 ? `; +${issues.length - 6} more` : ''}.`,
    evidence: issues.length === 0 ? [`${records.length} cases`] : issues.slice(0, 6),
  };
}

export function evaluateLoopAction(
  targetDir: string,
  intent: LoopActionIntent,
  options: { record?: boolean; generatedAt?: string; actionIndex?: number } = {},
): LoopDecisionResult {
  const resolvedTarget = path.resolve(targetDir);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const normalized = normalizeLoopActionIntent(intent, options.actionIndex);
  const inferredRiskSignals = inferLoopRiskSignals(normalized);
  const riskSignals = uniqueStrings([...normalized.riskSignals, ...inferredRiskSignals]);
  const sideEffects = normalized.sideEffects;
  const interruptReasons = buildLoopInterruptReasons(normalized, riskSignals, sideEffects);
  const decision: LoopDecision = interruptReasons.length > 0 ? 'interrupt' : 'continue';
  const requiredEvidence = buildLoopRequiredEvidence(normalized.requiredEvidence, interruptReasons);
  const continueReasons = decision === 'continue'
    ? buildLoopContinueReasons(normalized, sideEffects, riskSignals)
    : [];
  const result: LoopDecisionResult = {
    schemaVersion: 1,
    generatedAt,
    targetDir: resolvedTarget,
    policyVersion: LOOP_POLICY_VERSION,
    actionId: normalized.id,
    summary: normalized.summary,
    capabilityInvocation: normalized.capabilityInvocation,
    decision,
    confidence: interruptReasons.length > 0 || continueReasons.length > 1 ? 'high' : 'medium',
    reason: decision === 'interrupt'
      ? `Human checkpoint required: ${interruptReasons.join('; ')}.`
      : 'No interrupting risk signals matched; action can continue under the Loop policy.',
    sideEffects,
    riskSignals,
    requiredEvidence,
    interruptReasons,
    continueReasons,
    ledgerPath: path.join(resolvedTarget, LOOP_INTERRUPT_DECISION_LEDGER),
    recorded: false,
    exitCode: decision === 'interrupt' ? 3 : 0,
  };

  return options.record ? recordLoopDecision(result) : result;
}

export function scheduleLoopActions(
  targetDir: string,
  inputPath: string,
  intents: LoopActionIntent[],
  options: { record?: boolean; generatedAt?: string } = {},
): LoopScheduleResult {
  const resolvedTarget = path.resolve(targetDir);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const decisions = intents.map((intent, index) => evaluateLoopAction(resolvedTarget, intent, {
    generatedAt,
    actionIndex: index,
    record: false,
  }));
  const nextAction = decisions.find((decision) => decision.decision === 'continue') || null;
  const result: LoopScheduleResult = {
    schemaVersion: 1,
    generatedAt,
    targetDir: resolvedTarget,
    runId: `loop-run-${hashText(`${inputPath}:${generatedAt}:${decisions.map((item) => item.actionId).join(',')}`).slice(0, 12)}`,
    inputPath: path.resolve(inputPath),
    decisions,
    nextActionId: nextAction?.actionId || null,
    interruptedActionIds: decisions
      .filter((decision) => decision.decision === 'interrupt')
      .map((decision) => decision.actionId),
    ledgerPath: path.join(resolvedTarget, LOOP_RUN_LEDGER),
    recorded: false,
    exitCode: nextAction ? 0 : 3,
    reason: nextAction
      ? `Next action: ${nextAction.actionId}. ${decisions.length} actions evaluated.`
      : `No action can continue without a human checkpoint. ${decisions.length} actions evaluated.`,
  };

  return options.record ? recordLoopSchedule(result) : result;
}

function normalizeLoopActionIntent(intent: LoopActionIntent, actionIndex = 0): Required<Pick<LoopActionIntent, 'id' | 'summary' | 'capabilityInvocation' | 'action' | 'sideEffects' | 'riskSignals' | 'requiredEvidence' | 'targetPaths'>> & {
  validation: NonNullable<LoopActionIntent['validation']>;
} {
  if (!isRecord(intent)) {
    throw new CliError('Loop action input must be a JSON object.', 2);
  }
  const action = typeof intent.action === 'string' && intent.action.trim().length > 0
    ? intent.action.trim()
    : typeof intent.summary === 'string' && intent.summary.trim().length > 0
      ? intent.summary.trim()
      : 'unspecified action';
  const summary = typeof intent.summary === 'string' && intent.summary.trim().length > 0
    ? intent.summary.trim()
    : action;
  const id = typeof intent.id === 'string' && intent.id.trim().length > 0
    ? intent.id.trim()
    : `loop-action-${actionIndex + 1}-${hashText(`${summary}:${actionIndex}`).slice(0, 8)}`;

  return {
    id,
    summary,
    capabilityInvocation: typeof intent.capabilityInvocation === 'string' && intent.capabilityInvocation.trim().length > 0
      ? normalizeToken(intent.capabilityInvocation)
      : 'standalone',
    action,
    sideEffects: normalizeTokenArray(intent.sideEffects),
    riskSignals: normalizeTokenArray(intent.riskSignals),
    requiredEvidence: normalizeStringArray(intent.requiredEvidence),
    targetPaths: normalizeStringArray(intent.targetPaths),
    validation: isRecord(intent.validation) ? {
      command: typeof intent.validation.command === 'string' ? intent.validation.command : undefined,
      status: typeof intent.validation.status === 'string' ? normalizeToken(intent.validation.status) : undefined,
      evidence: normalizeStringArray(intent.validation.evidence),
    } : {},
  };
}

function inferLoopRiskSignals(intent: ReturnType<typeof normalizeLoopActionIntent>): string[] {
  const signals: string[] = [];
  const actionText = `${intent.action} ${intent.summary}`.toLowerCase();
  const joinedPaths = intent.targetPaths.join(' ').toLowerCase();
  const validationStatus = intent.validation.status || '';

  if (/publish|deploy|push|merge|release|tag|github pages|npm publish|remote/.test(actionText)) {
    signals.push('remote-side-effect');
  }
  if (/delete|remove|rm -rf|reset --hard|drop table|wipe/.test(actionText)) {
    signals.push('destructive-change');
  }
  if (/\b(credential|secret|token|permission|auth)\b/.test(actionText)) {
    signals.push('credential-change');
  }
  if (/agents\.md|claude\.md|policy|rule|governance/.test(actionText) || /agents\.md|claude\.md|\.harness-hub\/loop\/policies/.test(joinedPaths)) {
    signals.push('canonical-rule-change');
  }
  if (validationStatus === 'fail' || validationStatus === 'failed' || validationStatus === 'error') {
    signals.push('validation-failed');
  }

  return signals;
}

function buildLoopInterruptReasons(
  intent: ReturnType<typeof normalizeLoopActionIntent>,
  riskSignals: string[],
  sideEffects: string[],
): string[] {
  const reasons: string[] = [];
  for (const signal of riskSignals) {
    if (LOOP_INTERRUPT_RISK_SIGNALS.has(signal)) {
      reasons.push(`risk signal '${signal}'`);
    }
  }

  for (const sideEffect of sideEffects) {
    if (LOOP_INTERRUPT_SIDE_EFFECTS.has(sideEffect)) {
      reasons.push(`side effect '${sideEffect}'`);
      continue;
    }
    if (!LOOP_ALLOWED_SIDE_EFFECTS.has(sideEffect)) {
      reasons.push(`unknown side effect '${sideEffect}'`);
    }
  }

  if (intent.capabilityInvocation !== 'standalone'
    && intent.capabilityInvocation !== 'composable'
    && intent.capabilityInvocation !== 'loop-participant') {
    reasons.push(`unknown capability invocation '${intent.capabilityInvocation}'`);
  }

  return uniqueStrings(reasons);
}

function buildLoopContinueReasons(
  intent: ReturnType<typeof normalizeLoopActionIntent>,
  sideEffects: string[],
  riskSignals: string[],
): string[] {
  const reasons = ['no interrupting risk signal matched'];
  if (sideEffects.length === 0 || sideEffects.every((sideEffect) => LOOP_ALLOWED_SIDE_EFFECTS.has(sideEffect))) {
    reasons.push('side effects are local, read-only, or validation-only');
  }
  if (intent.validation.status === 'pass' || intent.validation.status === 'passed') {
    reasons.push('validation evidence is passing');
  }
  if (riskSignals.length > 0) {
    reasons.push(`non-interrupting signals: ${riskSignals.join(', ')}`);
  }
  return uniqueStrings(reasons);
}

function buildLoopRequiredEvidence(provided: string[], interruptReasons: string[]): string[] {
  const evidence = [...provided];
  if (interruptReasons.some((reason) => /remote|publish|release|push|merge|deploy/.test(reason))) {
    evidence.push('human approval record', 'publish or remote-action draft');
  }
  if (interruptReasons.some((reason) => /canonical-rule-change|governance|policy/.test(reason))) {
    evidence.push('proposed governance diff', 'reason for durable rule change');
  }
  if (interruptReasons.some((reason) => /validation-failed|verification-missing|unclear-causality/.test(reason))) {
    evidence.push('validation command and result', 'failure analysis');
  }
  if (interruptReasons.some((reason) => /credential|permission|secret|security/.test(reason))) {
    evidence.push('security review note', 'credential or permission owner approval');
  }
  if (evidence.length === 0) {
    evidence.push('action summary', 'affected paths', 'validation plan');
  }
  return uniqueStrings(evidence);
}

function recordLoopDecision(result: LoopDecisionResult): LoopDecisionResult {
  if (!fs.existsSync(result.ledgerPath)) {
    throw new CliError(`Loop decision ledger is missing at ${path.relative(result.targetDir, result.ledgerPath)}. Run init-harness first.`, 3);
  }
  const record = {
    schemaVersion: 1,
    event: 'interrupt_decision',
    generatedAt: result.generatedAt,
    policyVersion: result.policyVersion,
    actionId: result.actionId,
    summary: result.summary,
    capabilityInvocation: result.capabilityInvocation,
    decision: result.decision,
    confidence: result.confidence,
    sideEffects: result.sideEffects,
    riskSignals: result.riskSignals,
    requiredEvidence: result.requiredEvidence,
    interruptReasons: result.interruptReasons,
    continueReasons: result.continueReasons,
    reason: result.reason,
  };
  fs.appendFileSync(result.ledgerPath, `${JSON.stringify(record)}\n`, 'utf8');
  return { ...result, recorded: true };
}

function recordLoopSchedule(result: LoopScheduleResult): LoopScheduleResult {
  if (!fs.existsSync(result.ledgerPath)) {
    throw new CliError(`Loop run ledger is missing at ${path.relative(result.targetDir, result.ledgerPath)}. Run init-harness first.`, 3);
  }
  const recordedDecisions = result.decisions.map((decision) => recordLoopDecision(decision));
  const record = {
    schemaVersion: 1,
    event: 'loop_run',
    generatedAt: result.generatedAt,
    runId: result.runId,
    inputPath: result.inputPath,
    policyVersion: LOOP_POLICY_VERSION,
    status: result.nextActionId ? 'running' : 'interrupted',
    nextActionId: result.nextActionId,
    interruptedActionIds: result.interruptedActionIds,
    evaluatedActionIds: recordedDecisions.map((decision) => decision.actionId),
    reason: result.reason,
  };
  fs.appendFileSync(result.ledgerPath, `${JSON.stringify(record)}\n`, 'utf8');
  return {
    ...result,
    decisions: recordedDecisions,
    recorded: true,
  };
}

function readLoopActionIntent(inputPath: string): LoopActionIntent {
  const input = readJsonFile<unknown>(inputPath);
  if (!isRecord(input)) {
    throw new CliError('Loop evaluate input must be a JSON object.', 2);
  }
  return input as LoopActionIntent;
}

function readLoopScheduleIntents(inputPath: string): LoopActionIntent[] {
  const content = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '').trim();
  if (content.length === 0) {
    throw new CliError('Loop schedule input must not be empty.', 2);
  }
  const records = content.startsWith('[')
    ? JSON.parse(content) as unknown
    : content.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown);
  if (!Array.isArray(records) || records.length === 0 || records.some((record) => !isRecord(record))) {
    throw new CliError('Loop schedule input must be a JSON array or JSONL file of action objects.', 2);
  }
  return records as LoopActionIntent[];
}

function normalizeTokenArray(value: unknown): string[] {
  return normalizeStringArray(value).map(normalizeToken).filter(Boolean);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function hashText(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
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
    'Standard startup path',
    'Validation commands',
    'Validation tiers',
    'Runtime signals',
    'Checkpoint policy',
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
  const evidence = ['features array', 'feature_state_policy object', 'validation_priority_policy object', 'web_acceptance_policy object', 'pr_closeout_policy object', 'loop_control_policy object', 'parallel_write_policy object'];
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
  if (!isRecord(data) || !isRecord(data.feature_state_policy)) {
    missing.push('feature_state_policy object');
  }
  if (!isRecord(data) || !isRecord(data.validation_priority_policy)) {
    missing.push('validation_priority_policy object');
  }
  if (!isRecord(data) || !isRecord(data.web_acceptance_policy)) {
    missing.push('web_acceptance_policy object');
  }
  if (!isRecord(data) || !isRecord(data.pr_closeout_policy)) {
    missing.push('pr_closeout_policy object');
  }
  if (!isRecord(data) || !isRecord(data.loop_control_policy)) {
    missing.push('loop_control_policy object');
  }
  if (!isRecord(data) || !isRecord(data.parallel_write_policy)) {
    missing.push('parallel_write_policy object');
  }
  if (isRecord(data) && Array.isArray(data.features)) {
    const invalidFeatures = data.features
      .map((feature, index) => ({ feature, index }))
      .filter(({ feature }) => !isValidFeatureRecord(feature))
      .map(({ index }) => `features[${index}]`);
    if (invalidFeatures.length > 0) {
      missing.push(`valid feature records ${invalidFeatures.join(', ')}`);
    }
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

function isValidFeatureRecord(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string'
    && value.id.trim().length > 0
    && typeof value.behavior === 'string'
    && value.behavior.trim().length > 0
    && typeof value.status === 'string'
    && Object.prototype.hasOwnProperty.call(value, 'acceptance')
    && Object.prototype.hasOwnProperty.call(value, 'validation')
    && Object.prototype.hasOwnProperty.call(value, 'evidence');
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
  const effectiveInteractSummaryPath = path.join(postDir, 'effective-interact-summary.html');
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
      effectiveInteractSummaryPath,
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
    'effective-interact-summary',
    '--json',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  fs.writeFileSync(htmlPath, renderInsightArticleHtml(post, slug, generatedAt), 'utf8');

  return {
    schemaVersion: 1,
    generatedAt,
    repoRoot,
    slug,
    postDir,
    postJsonPath,
    sourceLedgerPath,
    effectiveInteractInputPath,
    effectiveInteractSummaryPath,
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
        : 'Public site index file is missing; run harness-hub insight build first.',
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
        : 'GitHub Pages output file is missing; run harness-hub insight build first.',
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

function renderInsightArticleHtml(input: InsightPostInput, slug: string, generatedAt: string): string {
  const dictionaryInsight = isAiCodingDictionaryInsight(input);
  const sourceGuide = dictionaryInsight
    ? renderAiDictionarySourceGuide(input)
    : renderDefaultInsightSourceGuide(input);
  const localChanges = input.projectMapping.map((item) => `
        <li>
          <strong>${escapeHtml(item.area)}</strong>
          <p>${escapeHtml(item.impact)}</p>
          <p class="action">${escapeHtml(item.action)}</p>
        </li>`).join('');
  const sources = input.sources.slice(0, 6).map((source) => `
        <li><a href="${escapeAttr(source.url)}">${escapeHtml(source.title)}</a><span>${escapeHtml(source.type)} · ${escapeHtml(source.accessedAt)}</span></li>`).join('');

  return `<!doctype html>
<html lang="zh-CN" data-insight-blog data-source-to-insight-blog>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(trimInsightPrefix(input.summary))}">
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #faf9f6;
      --paper: #ffffff;
      --ink: #232320;
      --muted: #68635b;
      --line: #ded8ce;
      --accent: #0f6f72;
      --accent-soft: #e5f3f1;
      --warn: #9b5c00;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.72;
    }
    main {
      width: min(940px, calc(100% - 32px));
      margin: 0 auto;
      padding: 44px 0 56px;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .eyebrow {
      margin: 0 0 10px;
      color: var(--accent);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      max-width: 780px;
      font-size: clamp(32px, 5vw, 56px);
      line-height: 1.08;
      letter-spacing: 0;
    }
    .summary {
      max-width: 760px;
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 18px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 22px 0 0;
    }
    nav a {
      color: var(--accent);
      background: var(--accent-soft);
      border-radius: 999px;
      padding: 6px 12px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 650;
    }
    section {
      padding: 28px 0;
      border-bottom: 1px solid var(--line);
    }
    h2 {
      margin: 0 0 14px;
      font-size: 26px;
      line-height: 1.25;
      letter-spacing: 0;
    }
    h3 {
      margin: 22px 0 8px;
      font-size: 18px;
      letter-spacing: 0;
    }
    p { margin: 0 0 12px; }
    ul { margin: 10px 0 0; padding-left: 22px; }
    li { margin: 8px 0; }
    a { color: var(--accent); }
    pre {
      margin: 16px 0;
      padding: 18px;
      overflow-x: auto;
      background: #f0eee8;
      border: 1px solid var(--line);
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.55;
    }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .lead {
      font-size: 19px;
      color: #34332f;
    }
    .change-list, .source-list {
      list-style: none;
      padding: 0;
    }
    .change-list li, .verdict {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .change-list strong, .verdict strong {
      display: block;
      margin-bottom: 6px;
    }
    .action {
      color: var(--muted);
      margin-bottom: 0;
    }
    .verdicts {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }
    .verdict.warn { border-left: 4px solid var(--warn); }
    .verdict.next { border-left: 4px solid var(--accent); }
    .validation {
      color: var(--muted);
      font-size: 14px;
    }
    .source-list li {
      display: grid;
      gap: 2px;
      margin: 10px 0;
    }
    .source-list span {
      color: var(--muted);
      font-size: 13px;
    }
    footer {
      padding-top: 24px;
      color: var(--muted);
      font-size: 14px;
    }
    @media (max-width: 640px) {
      main { width: min(100% - 24px, 940px); padding-top: 28px; }
      h1 { font-size: 34px; }
      .summary, .lead { font-size: 17px; }
      pre { font-size: 13px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Source-backed insight · ${escapeHtml(input.date)}</p>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="summary">${escapeHtml(trimInsightPrefix(input.summary))}</p>
      <nav aria-label="文章结构">
        <a href="#source-guide">原仓库导读</a>
        <a href="#local-changes">本地变更</a>
        <a href="#reflection">反思结论</a>
      </nav>
    </header>

    <section id="source-guide">
      <h2>1. 原仓库导读</h2>
      ${sourceGuide}
    </section>

    <section id="local-changes">
      <h2>2. 本地变更</h2>
      <p class="lead">这些变更的共同点是：借上游字典的结构启发，收紧 Harness Hub 自己的术语边界和发布边界，而不是复制上游词条。</p>
      <ul class="change-list">${localChanges}</ul>
    </section>

    <section id="reflection">
      <h2>3. 反思结论</h2>
      <div class="verdicts">
        <article class="verdict">
          <strong>部分有效</strong>
          <p>effective-interact 的生成和验证链路有价值：它能把来源、判断、验证材料组织成可检查产物。但它不适合直接承担 blog 正文；上一版的问题正是公开页面太像交互报告，读者需要先理解组件和证据结构，才看得到结论。</p>
        </article>
        <article class="verdict warn">
          <strong>冗余风险</strong>
          <p>继续扩成完整中文 glossary、CMS，或把正文写成 source-ledger 式审计页，都不值得。上游授权不明，本项目也没有高频维护双语词典的证据；扩写只会增加维护面和阅读成本。</p>
        </article>
        <article class="verdict next">
          <strong>下一步优化</strong>
          <p>保留术语边界和验证链路。公开文章只保留“原仓库导读、本地变更、反思结论”。除非上游补充授权，或本项目出现高频术语维护需求，否则不继续扩写。</p>
        </article>
      </div>
    </section>

    <section id="sources">
      <h2>来源与验证</h2>
      <p class="validation">这部分只保留审计入口，不作为正文展开。事实、推断、项目判断仍在机器可读文件中保留。</p>
      <ul class="source-list">${sources}</ul>
      <p class="validation">
        验证链路：
        <a href="post.json">post.json</a> ·
        <a href="source-ledger.json">source-ledger.json</a> ·
        <a href="effective-interact.input.json">effective-interact.input.json</a> ·
        <a href="effective-interact-summary.html">effective-interact-summary.html</a>
      </p>
    </section>

    <footer>
      Generated ${escapeHtml(generatedAt)} from <code>post.json</code>. Canonical slug: <code>${escapeHtml(slug)}</code>.
    </footer>
  </main>
</body>
</html>
`;
}

function renderAiDictionarySourceGuide(input: InsightPostInput): string {
  const purpose = firstMatchingInsightStatement(input, ['术语不透明', '白话解释'])
    || '它把 AI coding 中容易混淆的基础术语整理成读者能快速建立边界的词典。';
  const boundary = firstMatchingInsightStatement(input, ['LICENSE', '全文翻译', 'reference-only'])
    || '当前没有足够授权证据，所以本文只做结构导读和项目反思，不发布完整中文词条。';

  return `
      <h3>一分钟结论</h3>
      <p class="lead">${escapeHtml(trimInsightPrefix(input.summary))}</p>
      <p>${escapeHtml(purpose)}</p>
      <p>${escapeHtml(boundary)}</p>
      <h3>原仓库内容树</h3>
      <pre><code>${escapeHtml(buildAiDictionaryTreeText())}</code></pre>
      <h3>核心读法</h3>
      <ul>
        <li><strong>model 不是 agent。</strong>model 负责生成；agent 是 model 加上下文、工具、权限和运行环境。</li>
        <li><strong>context 是预算。</strong>context window、attention budget、compaction 和 handoff 都在处理模型一次能看多少、能忠实处理多少。</li>
        <li><strong>tool 是边界。</strong>tool call、MCP、sandbox、permission 决定 agent 能否触碰文件、终端和外部系统。</li>
        <li><strong>失败模式要转成动作。</strong>幻觉、迎合、知识截止和注意力衰减分别对应查证、反驳、加载新材料、清理或交接上下文。</li>
      </ul>`;
}

function renderDefaultInsightSourceGuide(input: InsightPostInput): string {
  return `
      <h3>一分钟结论</h3>
      <p class="lead">${escapeHtml(trimInsightPrefix(input.summary))}</p>
      <p>${escapeHtml(input.viewpoints[0]?.statement || input.integration[0] || '这篇文章只保留读者理解项目判断所需的来源结构和本地影响。')}</p>
      <h3>来源结构</h3>
      <ul>${input.sources.slice(0, 6).map((source) => `<li>${escapeHtml(source.title)}：${escapeHtml(source.notes || source.excerpt || source.type)}</li>`).join('')}</ul>`;
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
  const dictionaryInsight = isAiCodingDictionaryInsight(input);
  return {
    title: input.title,
    summary: input.summary,
    status: 'complete',
    generatedAt,
    template: 'research-explainer',
    renderMode: 'pre-rendered',
    intent: {
      audience: '中文读者与 Harness Hub maintainer',
      primaryQuestion: dictionaryInsight
        ? '原仓库讲了什么，本地改了什么，改得值不值？'
        : '读者如何快速理解这篇译注和本项目迭代？',
      decision: dictionaryInsight
        ? '原仓库是 62 个术语的 7 层词典；本地只该借结构、边界和验证语言。'
        : '只借结构，不复制正文；把术语边界落到本地迭代。',
      artifactKind: 'research',
      successCriteria: dictionaryInsight
        ? [
          '简单概括原仓库核心思想，并用树形结构组织内容。',
          '梳理本地已根据该仓库做出的变更。',
          '反思变更是否有效、冗余，以及下一步优化。',
        ]
        : [
          '首屏先给结论、边界和项目落点。',
          '用表格和时间线降低读者组装成本。',
          '事实、推断和项目判断仍能追溯到来源 metadata。',
        ],
    },
    sections: dictionaryInsight ? buildAiCodingDictionarySections(input) : buildDefaultInsightSections(input),
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
    nextActions: input.actionBoundary.now,
  };
}

function buildDefaultInsightSections(input: InsightPostInput): Array<Record<string, unknown>> {
  return [
    {
      type: 'summary-cards',
      title: '先读这三点',
      group: 'summary',
      status: 'complete',
      summary: '先回答读者最关心的结论、边界、项目落点和验证方式。',
      cards: buildInsightSummaryCards(input),
    },
    {
      type: 'data-table',
      title: '阅读路径',
      group: 'main',
      status: 'info',
      summary: '按这个顺序读，不需要先进入来源审计细节。',
      columns: [
        { key: 'order', label: '顺序', width: '12ch' },
        { key: 'question', label: '读者问题', width: '24ch' },
        { key: 'answer', label: '答案' },
      ],
      rows: buildInsightReadingPathRows(input),
    },
    {
      type: 'data-table',
      title: '授权与发布边界',
      group: 'decision',
      status: 'ready',
      summary: '先把能做、不能做、为什么能公开讲清楚。',
      columns: [
        { key: 'issue', label: '问题', width: '18ch' },
        { key: 'judgment', label: '判断', width: '28ch' },
        { key: 'impact', label: '对本文的影响' },
      ],
      rows: buildInsightBoundaryRows(input),
    },
    {
      type: 'data-table',
      title: '术语地图',
      group: 'diagrams',
      status: 'ready',
      summary: '把上游字典的价值翻译成工程阅读地图，而不是逐条搬运词条。',
      columns: [
        { key: 'layer', label: '层', width: '16ch' },
        { key: 'readerTranslation', label: '中文读法', width: '34ch' },
        { key: 'why', label: '为什么重要' },
      ],
      rows: buildInsightConceptMapRows(input),
    },
    {
      type: 'data-table',
      title: '项目映射',
      group: 'impact',
      status: 'ready',
      summary: '每个落点都对应一个本项目已有文件或发布链路。',
      columns: [
        { key: 'area', label: '位置', width: '24ch' },
        { key: 'impact', label: '读者应理解' },
        { key: 'action', label: '本项目动作' },
      ],
      rows: buildInsightProjectRows(input),
    },
    {
      type: 'timeline',
      title: 'Harness Hub 已做的迭代',
      group: 'changes',
      status: 'ready',
      summary: '把“之前根据这个项目做过什么”放到时间线上读。',
      items: buildInsightIterationTimeline(input.iterationRecord),
    },
    {
      type: 'tabs',
      title: '读者可怎么用',
      group: 'next',
      status: 'ready',
      summary: '不同读者直接看自己关心的行动面。',
      tabs: buildInsightReaderTabs(input),
    },
    {
      type: 'markdown',
      title: '来源声明',
      group: 'evidence',
      status: 'info',
      content: formatSourceClaimsMarkdown(input),
    },
  ];
}

function buildAiCodingDictionarySections(input: InsightPostInput): Array<Record<string, unknown>> {
  return [
    {
      type: 'markdown',
      title: '一分钟读完',
      group: 'summary',
      status: 'complete',
      summary: '先用正常文章语言回答：它是什么，为什么值得看，本项目为什么要管它。',
      content: buildAiDictionaryIntroMarkdown(input),
    },
    {
      type: 'code',
      title: '原仓库内容树',
      group: 'main',
      status: 'ready',
      summary: '树只保留读者需要的骨架，完整词条留给上游 README。',
      language: 'text',
      content: buildAiDictionaryTreeText(),
    },
    {
      type: 'markdown',
      title: '核心思想',
      group: 'main',
      status: 'ready',
      summary: '把词典翻成一个读者能带走的判断框架。',
      content: buildAiDictionaryCoreMarkdown(),
    },
    {
      type: 'markdown',
      title: '本地已做的变更',
      group: 'changes',
      status: 'ready',
      summary: '只列和 dictionary-of-ai-coding 直接相关的本地变化。',
      content: buildAiDictionaryLocalChangesMarkdown(input),
    },
    {
      type: 'data-table',
      title: '反思结果',
      group: 'decision',
      status: 'review',
      summary: '直接回答：有效吗、冗余吗、下一步怎么收敛。',
      columns: [
        { key: 'item', label: '对象', width: '24ch' },
        { key: 'assessment', label: '结论' },
        { key: 'redundancy', label: '冗余判断' },
        { key: 'next', label: '下一步' },
      ],
      rows: buildAiDictionaryReflectionRows(),
    },
    {
      type: 'markdown',
      title: '下一步优化',
      group: 'next',
      status: 'ready',
      summary: '优化方向不是继续加内容，而是删掉读者不需要先看的复杂度。',
      content: buildAiDictionaryNextMarkdown(input),
    },
    {
      type: 'markdown',
      title: '来源声明',
      group: 'evidence',
      status: 'info',
      content: formatSourceClaimsMarkdown(input),
    },
  ];
}

function buildAiDictionaryIntroMarkdown(input: InsightPostInput): string {
  return [
    `**结论：${trimInsightPrefix(input.summary)}**`,
    '',
    '原仓库 `mattpocock/dictionary-of-ai-coding` 不是一个可安装工具，也不是一套工作流。它是一份 AI coding 术语词典：把初学者经常听到、但很难定位的词，按实际使用场景分组解释。',
    '',
    '这篇文章只回答三个问题：',
    '',
    '- 原仓库到底讲了什么：62 个术语，分成 7 个层次。',
    '- 本项目根据它做了什么：补了本地术语边界、来源策略、解释器约束和发布记录。',
    '- 这些改动值不值：大部分有效，但展示层已经显得过重，应该收敛。',
  ].join('\n');
}

function buildAiDictionaryTreeText(): string {
  return [
    'AI Coding Dictionary',
    '|',
    '|-- 1. The Model',
    '|   `-- 模型、参数、训练、推理、token、provider、harness、缓存与成本',
    '|',
    '|-- 2. Sessions, Context Windows & Turns',
    '|   `-- context、context window、agent、system prompt、session、turn',
    '|',
    '|-- 3. Tools & Environment',
    '|   `-- environment、filesystem、tool call/result、MCP、permission、sandbox',
    '|',
    '|-- 4. Failure Modes',
    '|   `-- sycophancy、hallucination、knowledge cutoff、attention budget/degradation',
    '|',
    '|-- 5. Handoffs',
    '|   `-- clearing、handoff、handoff artifact、spec、ticket、compaction',
    '|',
    '|-- 6. Memory and Steering',
    '|   `-- memory system、AGENTS.md、progressive disclosure、context pointer、skill、subagent',
    '|',
    '`-- 7. Patterns of Work',
    '    `-- human-in-the-loop、AFK、automated check/review、human review、vibe coding、grilling',
  ].join('\n');
}

function buildAiDictionaryCoreMarkdown(): string {
  return [
    '读者不用背词条，先抓住这几条线：',
    '',
    '- **model 不是 agent**：model 只生成文本；agent 是 model 加上上下文、工具、权限和运行环境。',
    '- **context 是预算**：上下文窗口、attention budget、compaction、handoff 都是在处理“模型一次能看多少、能忠实处理多少”。',
    '- **tool 是边界**：tool call、MCP、sandbox、permission 决定 agent 能不能碰文件、终端和外部系统。',
    '- **失败模式要转成动作**：幻觉、迎合、知识截止、注意力衰减，分别对应查证、反驳、加载新文档、清理或交接上下文。',
    '- **自动化检查和人审不能混用**：test/typecheck 是 deterministic check；agent review 是判断；human review 是人看真实 diff 或产物。',
  ].join('\n');
}

function buildAiDictionaryLocalChangesMarkdown(input: InsightPostInput): string {
  const rows = input.projectMapping.length > 0 ? input.projectMapping : [
    {
      area: 'docs/harness-vocabulary.md',
      impact: '把外部术语启发改成本项目自己的边界语言。',
      action: '保留本地原创定义。',
    },
  ];

  return rows.map((item) => (
    `- **${item.area}**：${item.impact}`
  )).join('\n');
}

function buildAiDictionaryReflectionRows(): Array<Record<string, string>> {
  return [
    {
      item: 'source-projects reference-only 记录',
      assessment: '有效。它把授权不明和用途边界写清楚，避免误复制上游正文。',
      redundancy: '低。它是后续所有使用的约束入口。',
      next: '保留；若上游许可证变化，再重新评估能否扩大引用方式。',
    },
    {
      item: 'docs/harness-vocabulary.md',
      assessment: '有效。它解决本项目最容易混淆的术语：model、agent、harness、skill、tool、review。',
      redundancy: '中。若继续扩写成完整 glossary，就会重复上游词典。',
      next: '只在影响 routing、safety、validation 或 handoff 时新增术语。',
    },
    {
      item: 'effective-interact 解释器和 fixture',
      assessment: '部分有效。它把术语解释变成可验证产物，但展示层容易过度。',
      redundancy: '中高。上一版 blog 的问题就是交互组件多于读者问题。',
      next: '保留结构化生成和验证；公开文章优先导读、变更、反思。',
    },
    {
      item: 'skill-quality-guide 术语治理',
      assessment: '有效。它防止为了统一风格去改 imported skill body。',
      redundancy: '低。它是维护政策，不是正文内容。',
      next: '继续作为审查规则；不要把它扩成第二套词典。',
    },
    {
      item: 'Pages insight post',
      assessment: '当前版本需要收敛。发布链路有效，但文章结构必须服务读者。',
      redundancy: '中。若每篇都生成 source-ledger 式报告，会不像 blog。',
      next: '固定本文三段式：原仓库导读、本地变更、有效性反思。',
    },
  ];
}

function buildAiDictionaryNextMarkdown(input: InsightPostInput): string {
  return [
    '**现在该做：**',
    ...input.actionBoundary.now.map((action) => `- ${action}`),
    '',
    '**继续观察：**',
    ...input.actionBoundary.observe.map((action) => `- ${action}`),
    '',
    '**暂时不做：**',
    ...input.actionBoundary.notNow.map((action) => `- ${action}`),
  ].join('\n');
}

function buildInsightSummaryCards(input: InsightPostInput): Array<Record<string, string>> {
  const landing = input.projectMapping
    .map((item) => item.area)
    .slice(0, 3)
    .join(' / ');
  return [
    { label: '结论', value: trimInsightPrefix(input.summary) },
    { label: '边界', value: input.actionBoundary.notNow[0] || '不复制来源正文，保留来源追溯。' },
    { label: '落点', value: landing || '项目映射见下方表格。' },
    { label: '验证', value: `${input.sources.length} 个来源 / ${input.sourceClaims.length} 条 claim / source-ledger 可审计` },
  ];
}

function buildInsightReadingPathRows(input: InsightPostInput): Array<Record<string, string>> {
  return [
    {
      order: '1',
      question: '这篇到底说什么？',
      answer: trimInsightPrefix(input.summary),
    },
    {
      order: '2',
      question: '这是全文翻译吗？',
      answer: input.actionBoundary.notNow[0] || '不是。本文只做本地原创解释和项目映射。',
    },
    {
      order: '3',
      question: '上游值得借什么？',
      answer: firstMatchingInsightStatement(input, ['层译法', '术语', 'taxonomy'])
        || '借术语分层和概念边界，不复制条目正文。',
    },
    {
      order: '4',
      question: '本项目改了什么？',
      answer: input.iterationRecord.changed[0] || '改动见项目映射和迭代时间线。',
    },
  ];
}

function buildInsightBoundaryRows(input: InsightPostInput): Array<Record<string, string>> {
  return [
    {
      issue: '上游授权',
      judgment: firstMatchingInsightStatement(input, ['无许可证', 'reference-only'])
        || '未确认可再分发授权前，按 reference-only 来源处理。',
      impact: '不发布全文翻译，也不逐条复制上游 entry。',
    },
    {
      issue: '公开内容',
      judgment: '发布本地原创中文译注、项目映射和迭代记录。',
      impact: '读者拿到的是工程判断，不是上游正文镜像。',
    },
    {
      issue: '证据追溯',
      judgment: 'post.json、source-ledger.json 和 generated HTML 一起保留。',
      impact: '事实、推断和项目判断可以回查到来源 metadata。',
    },
    {
      issue: '后续触发',
      judgment: input.iterationRecord.open[0] || '上游授权或项目需求变化后再评估扩展范围。',
      impact: '避免为了完整性提前引入 glossary、CMS 或新发布框架。',
    },
  ];
}

function buildInsightConceptMapRows(input: InsightPostInput): Array<Record<string, string>> {
  if (!isAiCodingDictionaryInsight(input)) {
    return input.projectMapping.map((item) => ({
      layer: item.area,
      readerTranslation: item.impact,
      why: item.action,
    }));
  }

  return [
    {
      layer: '模型层',
      readerTranslation: 'model / provider / token / latency / cost / temperature / embedding',
      why: '解释生成边界：成本、非确定性、供应商差异。不要把 model 误写成 agent。',
    },
    {
      layer: '会话层',
      readerTranslation: 'context window / turn / session / attention budget',
      why: '解释长会话为什么会衰减，何时压缩、清空或交接。',
    },
    {
      layer: '工具层',
      readerTranslation: 'tool call / tool result / MCP / sandbox / permission',
      why: '说明 agent 如何接触仓库、终端和外部系统，以及权限边界。',
    },
    {
      layer: '失败模式',
      readerTranslation: 'hallucination / sycophancy / knowledge cutoff / context rot',
      why: '把“看起来对”拆成事实、上下文忠实度和时效性。',
    },
    {
      layer: '交接层',
      readerTranslation: 'handoff / compaction / ticket / spec / acceptance criteria',
      why: '让跨会话续作有依据，不靠重新解释整段历史。',
    },
    {
      layer: '记忆与引导',
      readerTranslation: 'AGENTS / skill / context pointer / progressive disclosure',
      why: '把长期规则、局部技能和可加载证据分层。',
    },
    {
      layer: '工作模式',
      readerTranslation: 'automated check / automated review / human review / vibe coding',
      why: '区分确定性检查、模型判断和人审，不夸大自动化结论。',
    },
  ];
}

function buildInsightProjectRows(input: InsightPostInput): Array<Record<string, string>> {
  return input.projectMapping.map((item) => ({
    area: item.area,
    impact: item.impact,
    action: item.action,
  }));
}

function buildInsightIterationTimeline(record: InsightIterationRecord): Array<Record<string, string>> {
  const changed = record.changed.length > 0 ? record.changed : record.confirmed;
  return changed.map((item, index) => {
    const match = item.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    return {
      label: match ? match[1] : `迭代 ${index + 1}`,
      detail: match ? match[2] : item,
    };
  });
}

function buildInsightReaderTabs(input: InsightPostInput): Array<Record<string, string>> {
  return [
    {
      label: '快速读者',
      content: [
        '- 先看“先读这三点”和“阅读路径”。',
        `- 结论：${trimInsightPrefix(input.summary)}`,
        `- 重点边界：${input.actionBoundary.notNow[0] || '不复制来源正文。'}`,
      ].join('\n'),
    },
    {
      label: '维护者',
      content: [
        ...input.projectMapping.slice(0, 4).map((item) => `- **${item.area}**：${item.action}`),
      ].join('\n'),
    },
    {
      label: '审阅者',
      content: [
        '- 核对 source-ledger.json 是否覆盖事实、推断和项目判断。',
        `- 核对“不做”边界：${input.actionBoundary.notNow.join('；') || '无'}`,
        `- 核对后续开放项：${input.iterationRecord.open.join('；') || '无'}`,
      ].join('\n'),
    },
  ];
}

function isAiCodingDictionaryInsight(input: InsightPostInput): boolean {
  const haystack = [
    input.title,
    ...input.sources.map((source) => `${source.title} ${source.url}`),
  ].join(' ').toLowerCase();
  return haystack.includes('dictionary-of-ai-coding') || haystack.includes('ai coding dictionary');
}

function firstMatchingInsightStatement(input: InsightPostInput, needles: string[]): string {
  const statements = [
    ...input.viewpoints.map((item) => item.statement),
    ...input.sourceClaims.map((item) => item.statement),
    ...input.integration,
  ];
  const lowerNeedles = needles.map((needle) => needle.toLowerCase());
  return statements.find((statement) => lowerNeedles.some((needle) => statement.toLowerCase().includes(needle))) || '';
}

function trimInsightPrefix(value: string): string {
  return value.replace(/^(?:结论|判断)[:：]\s*/, '');
}

function formatInsightClaimKindLabel(kind: InsightClaimKind): string {
  if (kind === 'fact') return '事实';
  if (kind === 'inference') return '推断';
  if (kind === 'assumption') return '假设';
  return '项目判断';
}

function formatSourceClaimsMarkdown(input: InsightPostInput): string {
  return input.sourceClaims
    .map((claim) => {
      const source = input.sources.find((item) => item.id === claim.sourceId);
      return `- **${formatInsightClaimKindLabel(claim.kind)}** \`${claim.id}\`: ${claim.statement}\n  - 来源：${source ? `[${source.title}](${source.url})` : claim.sourceId}`;
    })
    .join('\n');
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
    ? `<p><a href="insights/${escapeAttr(latest.href)}">${escapeHtml(latest.title)}</a></p>`
    : '<p>No insight posts yet.</p>';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harness Hub</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #5b6472;
      --line: #d7dce5;
      --soft: #f6f8fb;
      --accent: #155eef;
      --accent-strong: #0f3fa8;
      --warn-bg: #fff7e8;
      --warn-line: #f1cf92;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #ffffff;
      line-height: 1.6;
    }
    main {
      max-width: 960px;
      margin: 0 auto;
      padding: 48px 20px 56px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 {
      margin-bottom: 12px;
      font-size: 4.2rem;
      line-height: 0.96;
      letter-spacing: 0;
    }
    h2 {
      margin-bottom: 14px;
      font-size: 1.35rem;
      line-height: 1.25;
      letter-spacing: 0;
    }
    h3 {
      margin-bottom: 8px;
      font-size: 1rem;
      line-height: 1.3;
      letter-spacing: 0;
    }
    a { color: var(--accent); font-weight: 700; text-decoration-thickness: 0.08em; text-underline-offset: 0.2em; }
    code {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 0.12rem 0.32rem;
      background: var(--soft);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.92em;
    }
    pre {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #0f172a;
      color: #f8fafc;
      line-height: 1.45;
    }
    pre code {
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
    }
    .eyebrow {
      margin-bottom: 16px;
      color: var(--accent-strong);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .lead {
      max-width: 760px;
      margin-bottom: 24px;
      color: var(--muted);
      font-size: 1.12rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0 0 40px;
      padding: 0;
      list-style: none;
    }
    .actions a {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--ink);
      background: #ffffff;
      text-decoration: none;
    }
    .actions a.primary {
      border-color: var(--accent);
      color: #ffffff;
      background: var(--accent);
    }
    .section {
      border-top: 1px solid var(--line);
      padding: 28px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
    }
    .panel p,
    .note,
    .latest p {
      margin-bottom: 0;
      color: var(--muted);
    }
    .steps {
      margin: 0 0 18px;
      padding-left: 1.35rem;
    }
    .steps li + li { margin-top: 8px; }
    .note {
      border: 1px solid var(--warn-line);
      border-radius: 8px;
      padding: 12px 14px;
      background: var(--warn-bg);
    }
    .latest {
      border-top: 1px solid var(--line);
      padding-top: 24px;
    }
    @media (max-width: 720px) {
      main { padding-top: 32px; }
      h1 { font-size: 2.6rem; }
      .grid { grid-template-columns: 1fr; }
      .actions a { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Repo-local agent harness toolkit</p>
    <h1>Harness Hub</h1>
    <p class="lead">让 agent 在不同仓库里使用同一套可重复、可验证、可交接的工作方式。它负责技能安装、standard 目标 harness 初始化、验证和托管文件生命周期安全。</p>

    <ul class="actions" aria-label="Primary links">
      <li><a class="primary" href="https://github.com/JasonxzWen/harness-hub/blob/main/README.zh-CN.md">阅读中文 README</a></li>
      <li><a href="https://github.com/JasonxzWen/harness-hub/blob/main/README.md">English README</a></li>
      <li><a href="insights/">Insights</a></li>
    </ul>

    <section class="section" aria-labelledby="first-use">
      <h2 id="first-use">首次理解</h2>
      <div class="grid">
        <article class="panel">
          <h3>先看状态</h3>
          <p><code>check</code> 和 <code>analyze</code> 是只读入口，用来判断目标仓库是否已经准备好。</p>
        </article>
        <article class="panel">
          <h3>再初始化 harness</h3>
          <p><code>init-harness --target standard</code> 只在你明确确认后创建 standard 目标 harness 文件。</p>
        </article>
        <article class="panel">
          <h3>只装技能时分开做</h3>
          <p><code>install</code> 只安装标准 skill set，不创建根级 harness 文件。</p>
        </article>
      </div>
    </section>

    <section class="section" aria-labelledby="safe-start">
      <h2 id="safe-start">安全起步</h2>
      <ol class="steps">
        <li>在目标仓库外先运行 dry-run，检查计划写入的文件。</li>
        <li>确认目标仓库的现有规则、锁文件和本地 state 不会被误覆盖。</li>
        <li>只有看懂计划后再把命令切换到 <code>--yes</code>。</li>
      </ol>
      <pre><code>npx @jasonwen/harness-hub init-harness D:\\path\\to\\target --target standard --dry-run --json</code></pre>
      <p class="note">Harness Hub 不会自动创建定时任务、webhook、commit、push、全局 skill 安装或远程服务改动，除非某条命令明确声明这类副作用。</p>
    </section>

    <section class="latest" aria-labelledby="latest">
      <h2 id="latest">最新内容</h2>
      ${latestHtml}
    </section>
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

function isSkillSourceDir(entry: Dirent, skillsRoot: string): boolean {
  return entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md'));
}

function readSkillSourceNames(skillsRoot: string): string[] {
  if (!fs.existsSync(skillsRoot)) {
    throw new Error(`Missing source skill root: ${skillsRoot}`);
  }

  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => isSkillSourceDir(entry, skillsRoot))
    .map((entry) => entry.name)
    .sort();
}

function hasCodexManagedMarker(targetDir: string): boolean {
  return fs.existsSync(path.join(targetDir, CODEX_MANAGED_MARKER));
}

function removeCodexManagedEntries(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (CODEX_PRESERVED_LOCAL_DIRS.has(entry.name)) {
      continue;
    }

    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
  }
}

function copySkillSourceForCodex(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (CODEX_PRESERVED_LOCAL_DIRS.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copySkillSourceForCodex(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeCodexManagedMarker(targetDir: string, skillName: string): void {
  fs.writeFileSync(
    path.join(targetDir, CODEX_MANAGED_MARKER),
    [
      'Generated by harness-hub activate-codex.',
      `Source: skills/${skillName}`,
      'Do not edit this copy; edit the source skill instead.',
      '',
    ].join('\n'),
    'utf8',
  );
}

export function planCodexActivation(options: { targetDir?: string; dryRun?: boolean } = {}): CodexActivationPlan {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const sourceSkillsRoot = assertSafeRelativePath(targetDir, AGENT_SKILL_DIRS.standard);
  const codexSkillsRoot = assertSafeRelativePath(targetDir, CODEX_SKILLS_RELATIVE_DIR);
  const sourceSkillNames = readSkillSourceNames(sourceSkillsRoot);
  const sourceSkillSet = new Set(sourceSkillNames);
  const items: CodexActivationItem[] = [];

  for (const skillName of sourceSkillNames) {
    const source = path.join(sourceSkillsRoot, skillName);
    const dest = path.join(codexSkillsRoot, skillName);
    const exists = fs.existsSync(dest);
    const managed = exists && hasCodexManagedMarker(dest);
    items.push({
      skillName,
      source,
      dest,
      action: exists && !managed ? 'block' : 'sync',
      reason: exists && !managed
        ? 'Existing Codex skill directory is not marked as Harness Hub managed.'
        : 'Sync source skill into project-local Codex activation cache.',
      exists,
      managed,
    });
  }

  const existingTargetEntries = fs.existsSync(codexSkillsRoot)
    ? fs.readdirSync(codexSkillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];
  for (const entry of existingTargetEntries) {
    if (sourceSkillSet.has(entry.name)) {
      continue;
    }
    const dest = path.join(codexSkillsRoot, entry.name);
    if (!hasCodexManagedMarker(dest)) {
      continue;
    }
    items.push({
      skillName: entry.name,
      source: null,
      dest,
      action: 'remove-stale',
      reason: 'Remove stale Harness Hub managed Codex activation cache entry.',
      exists: true,
      managed: true,
    });
  }

  const blockers = items.filter((item) => item.action === 'block');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    targetDir,
    sourceSkillsRoot,
    codexSkillsRoot,
    dryRun: options.dryRun === true,
    items: items.sort((left, right) => left.skillName.localeCompare(right.skillName) || left.action.localeCompare(right.action)),
    blockers,
  };
}

export function activateCodex(options: { targetDir?: string; dryRun?: boolean } = {}): CodexActivationResult {
  const plan = planCodexActivation(options);
  const synced = plan.items.filter((item) => item.action === 'sync');
  const staleRemoved = plan.items.filter((item) => item.action === 'remove-stale');
  const skipped = plan.items.filter((item) => item.action === 'block');

  if (!plan.dryRun && plan.blockers.length === 0) {
    fs.mkdirSync(plan.codexSkillsRoot, { recursive: true });
    for (const item of staleRemoved) {
      fs.rmSync(item.dest, { recursive: true, force: true });
    }
    for (const item of synced) {
      if (!item.source) {
        throw new Error(`Missing source for Codex activation item: ${item.skillName}`);
      }
      removeCodexManagedEntries(item.dest);
      copySkillSourceForCodex(item.source, item.dest);
      writeCodexManagedMarker(item.dest, item.skillName);
    }
  }

  const exitCode: CodexActivationResult['exitCode'] = plan.blockers.length > 0 ? 1 : 0;
  const plannedLabel = plan.dryRun ? 'planned' : 'synced';
  return {
    ...plan,
    exitCode,
    synced,
    staleRemoved,
    skipped,
    reason: plan.blockers.length > 0
      ? `${plan.blockers.length} Codex activation blocker${plan.blockers.length === 1 ? '' : 's'} found.`
      : `${synced.length} Codex skill activation cache entr${synced.length === 1 ? 'y' : 'ies'} ${plannedLabel}, ${staleRemoved.length} stale entr${staleRemoved.length === 1 ? 'y' : 'ies'} ${plan.dryRun ? 'planned for removal' : 'removed'}.`,
  };
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

export async function checkHarnessHub(options: CheckOptions = {}): Promise<HarnessHubCheckResult> {
  const generatedAt = new Date().toISOString();
  const hubRoot = options.hubRoot || HUB_ROOT;
  const index = options.index || readCapabilityIndex(hubRoot);
  const packageJson = readHarnessHubPackageJson(hubRoot);
  const packageName = options.packageName || packageJson.name || '@jasonwen/harness-hub';
  const currentVersion = options.currentVersion || packageJson.version || '0.0.0';
  const registryBaseUrl = options.registryBaseUrl || 'https://registry.npmjs.org';
  const latestVersionResult = await resolveLatestPackageVersion(packageName, registryBaseUrl, options.latestVersionResolver);
  const cli = buildCliCheck({
    packageName,
    currentVersion,
    latestVersionResult,
    hubRoot,
    checkedAt: generatedAt,
  });
  const target = buildTargetCheck({
    targetDir: options.targetDir || process.cwd(),
    index,
  });
  const externalTools = buildExternalToolSuggestions({
    targetDir: target.targetDir,
    pathEnv: options.pathEnv,
    platform: options.platform,
    env: options.env,
  });
  const reason = [
    `CLI ${cli.state}: ${cli.message}`,
    `Target ${target.state}: ${target.message}`,
    `External tools: ${externalToolSummary(externalTools)}`,
  ].join(' ');

  return {
    schemaVersion: 1,
    generatedAt,
    exitCode: 0,
    hubVersion: index.version,
    cli,
    target,
    externalTools,
    reason,
  };
}

export async function selfCheckHarnessHub(options: SelfCheckOptions = {}): Promise<HarnessHubSelfCheckResult> {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const check = await checkHarnessHub({
    ...options,
    targetDir,
  });
  const initialized = isMinimalHarnessInitialized(targetDir);
  const strict = options.validateHarness === true;
  const harnessValidation = strict || initialized
    ? runSelfCheckHarnessValidation(targetDir, { strict, initialized })
    : skipSelfCheckHarnessValidation(targetDir);
  const hardFailures = buildSelfCheckHardFailures(check, harnessValidation);
  const advisories = buildSelfCheckAdvisories(check, harnessValidation);
  const exitCode: HarnessHubSelfCheckResult['exitCode'] = hardFailures.length > 0 ? 1 : 0;
  const reason = [
    hardFailures.length > 0
      ? `${hardFailures.length} hard self-check failure${hardFailures.length === 1 ? '' : 's'}.`
      : 'No hard self-check failures.',
    advisories.length > 0
      ? `${advisories.length} advisory item${advisories.length === 1 ? '' : 's'}.`
      : 'No advisory items.',
    `Harness validation ${harnessValidation.state}: ${harnessValidation.reason}`,
  ].join(' ');

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    exitCode,
    hubVersion: check.hubVersion,
    targetDir,
    check,
    harnessValidation,
    hardFailures,
    advisories,
    reason,
  };
}

function isMinimalHarnessInitialized(targetDir: string): boolean {
  const lock = readLock(targetDir);
  if (!lock) {
    return false;
  }
  return lock.data.components.some((component) => (
    component.id === HARNESS_COMPONENT_ID
    && component.status === 'installed'
  ));
}

function runSelfCheckHarnessValidation(
  targetDir: string,
  options: { strict: boolean; initialized: boolean },
): SelfCheckHarnessValidation {
  const validation = validateHarness(targetDir);
  return {
    state: validation.exitCode === 0 ? 'pass' : 'fail',
    strict: options.strict,
    attempted: true,
    initialized: options.initialized,
    exitCode: validation.exitCode,
    validation,
    reason: validation.reason,
    evidence: validation.exitCode === 0
      ? ['validate-harness passed']
      : validation.checks
        .filter((check) => check.state === 'fail')
        .slice(0, 8)
        .map((check) => `${check.path}: ${check.reason}`),
  };
}

function skipSelfCheckHarnessValidation(targetDir: string): SelfCheckHarnessValidation {
  return {
    state: 'skipped',
    strict: false,
    attempted: false,
    initialized: false,
    exitCode: null,
    validation: null,
    reason: 'Target is not initialized with harness:minimal; strict harness validation is skipped by default.',
    evidence: [
      path.join(targetDir, '.harness-hub', 'lock.json'),
      HARNESS_COMPONENT_ID,
    ],
  };
}

function buildSelfCheckHardFailures(
  check: HarnessHubCheckResult,
  harnessValidation: SelfCheckHarnessValidation,
): SelfCheckFinding[] {
  const failures: SelfCheckFinding[] = [];
  if (check.target.state === 'attention-required') {
    failures.push({
      id: 'target.attention-required',
      severity: 'failure',
      message: check.target.message,
      evidence: [
        ...check.target.modified.map((row) => `modified:${row.id}`),
        ...check.target.missing.map((row) => `missing:${row.id}`),
        ...check.target.unknown.map((row) => `unknown:${row.id}`),
        ...check.target.blockers.map((row) => `blocker:${row.id}`),
      ],
      recommendedCommand: check.target.recommendedCommand,
    });
  }
  if (harnessValidation.state === 'fail') {
    failures.push({
      id: 'harness-validation.failed',
      severity: 'failure',
      message: harnessValidation.reason,
      evidence: harnessValidation.evidence,
      recommendedCommand: `harness-hub validate-harness "${check.target.targetDir}" --json`,
    });
  }
  return failures;
}

function buildSelfCheckAdvisories(
  check: HarnessHubCheckResult,
  harnessValidation: SelfCheckHarnessValidation,
): SelfCheckFinding[] {
  const advisories: SelfCheckFinding[] = [];
  if (check.cli.state !== 'current') {
    advisories.push({
      id: `cli.${check.cli.state}`,
      severity: 'advisory',
      message: check.cli.message,
      evidence: check.cli.evidence,
      recommendedCommand: check.cli.recommendedCommand,
    });
  }
  if (check.target.state === 'not-managed' || check.target.state === 'update-available') {
    advisories.push({
      id: `target.${check.target.state}`,
      severity: 'advisory',
      message: check.target.message,
      evidence: check.target.evidence,
      recommendedCommand: check.target.recommendedCommand,
    });
  }
  if (check.target.state === 'current' && check.target.recommendedCommand?.includes('activate-codex')) {
    advisories.push({
      id: 'target.codex-activation-missing',
      severity: 'advisory',
      message: check.target.message,
      evidence: check.target.evidence,
      recommendedCommand: check.target.recommendedCommand,
    });
  }
  for (const tool of check.externalTools) {
    if (tool.state === 'configured') {
      continue;
    }
    advisories.push({
      id: `external-tool.${tool.id}.${tool.state}`,
      severity: 'advisory',
      message: tool.message,
      evidence: tool.evidence,
      recommendedCommand: tool.recommendedCommands[0] || null,
    });
  }
  if (harnessValidation.state === 'skipped') {
    advisories.push({
      id: 'harness-validation.skipped',
      severity: 'advisory',
      message: harnessValidation.reason,
      evidence: harnessValidation.evidence,
      recommendedCommand: `harness-hub self-check "${check.target.targetDir}" --validate-harness --json`,
    });
  }
  return advisories;
}

function readHarnessHubPackageJson(hubRoot: string): { name?: string; version?: string } {
  const packagePath = path.join(hubRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { name?: unknown; version?: unknown };
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      version: typeof parsed.version === 'string' ? parsed.version : undefined,
    };
  } catch {
    return {};
  }
}

async function resolveLatestPackageVersion(
  packageName: string,
  registryBaseUrl: string,
  resolver: CheckOptions['latestVersionResolver'],
): Promise<LatestPackageVersionResult> {
  if (resolver) {
    try {
      return await resolver(packageName, registryBaseUrl);
    } catch (error) {
      return {
        ok: false,
        latestVersion: null,
        registryUrl: npmLatestRegistryUrl(packageName, registryBaseUrl),
        reason: `Registry check failed: ${errorMessage(error)}.`,
      };
    }
  }

  return fetchLatestPackageVersion(packageName, registryBaseUrl);
}

async function fetchLatestPackageVersion(packageName: string, registryBaseUrl: string): Promise<LatestPackageVersionResult> {
  const registryUrl = npmLatestRegistryUrl(packageName, registryBaseUrl);
  if (typeof fetch !== 'function') {
    return {
      ok: false,
      latestVersion: null,
      registryUrl,
      reason: 'Global fetch is unavailable in this Node runtime.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(registryUrl, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        latestVersion: null,
        registryUrl,
        reason: `Registry returned HTTP ${response.status}.`,
      };
    }
    const payload = await response.json() as { version?: unknown };
    if (typeof payload.version !== 'string' || payload.version.trim().length === 0) {
      return {
        ok: false,
        latestVersion: null,
        registryUrl,
        reason: 'Registry response did not include a package version.',
      };
    }
    return {
      ok: true,
      latestVersion: payload.version,
      registryUrl,
      reason: 'Registry latest version resolved.',
    };
  } catch (error) {
    return {
      ok: false,
      latestVersion: null,
      registryUrl,
      reason: `Registry check failed: ${errorMessage(error)}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function npmLatestRegistryUrl(packageName: string, registryBaseUrl: string): string {
  const packagePath = encodeURIComponent(packageName).replace(/^%40/, '@');
  return `${registryBaseUrl.replace(/\/+$/, '')}/${packagePath}/latest`;
}

function buildCliCheck({
  packageName,
  currentVersion,
  latestVersionResult,
  hubRoot,
  checkedAt,
}: {
  packageName: string;
  currentVersion: string;
  latestVersionResult: LatestPackageVersionResult;
  hubRoot: string;
  checkedAt: string;
}): HarnessHubCliCheck {
  const installMethod = detectHarnessHubInstallMethod(hubRoot);
  if (!latestVersionResult.ok || !latestVersionResult.latestVersion) {
    return {
      state: 'unavailable',
      packageName,
      currentVersion,
      latestVersion: null,
      installMethod,
      registryUrl: latestVersionResult.registryUrl,
      checkedAt,
      message: latestVersionResult.reason,
      recommendedCommand: null,
      evidence: [latestVersionResult.registryUrl],
    };
  }

  const latestVersion = latestVersionResult.latestVersion;
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  return {
    state: updateAvailable ? 'update-available' : 'current',
    packageName,
    currentVersion,
    latestVersion,
    installMethod,
    registryUrl: latestVersionResult.registryUrl,
    checkedAt,
    message: updateAvailable
      ? `${packageName} ${currentVersion} -> ${latestVersion} available.`
      : `${packageName} ${currentVersion} is current against npm latest ${latestVersion}.`,
    recommendedCommand: updateAvailable
      ? recommendedCliUpdateCommand(packageName, latestVersion, installMethod)
      : null,
    evidence: [latestVersionResult.registryUrl],
  };
}

function detectHarnessHubInstallMethod(hubRoot: string): HarnessHubCliCheck['installMethod'] {
  const normalized = path.resolve(hubRoot).toLowerCase();
  if (normalized.includes(`${path.sep}node_modules${path.sep}`.toLowerCase())) {
    return 'npm';
  }
  if (fs.existsSync(path.join(hubRoot, '.git'))) {
    return 'source';
  }
  return 'unknown';
}

function recommendedCliUpdateCommand(
  packageName: string,
  latestVersion: string,
  installMethod: HarnessHubCliCheck['installMethod'],
): string {
  if (installMethod === 'source') {
    return 'git pull && bun install && bun run build';
  }
  return `npm install -g ${packageName}@${latestVersion}`;
}

function buildTargetCheck({
  targetDir,
  index,
}: {
  targetDir: string;
  index: CapabilityIndex;
}): HarnessHubTargetCheck {
  const resolvedTarget = path.resolve(targetDir);
  const status = getStatus({ targetDir: resolvedTarget, index });
  if (!status.lock) {
    return {
      state: 'not-managed',
      targetDir: resolvedTarget,
      lockPath: null,
      current: [],
      updates: [],
      blockers: [],
      forceOverridable: [],
      modified: [],
      missing: [],
      skipped: [],
      unknown: [],
      recommendedCommand: `harness-hub init-harness "${resolvedTarget}" --dry-run --json`,
      message: 'No Harness Hub lock found for this target.',
      evidence: ['.harness-hub/lock.json'],
    };
  }

  let updatePlan: UpdatePlan;
  try {
    updatePlan = getUpdatePlan({ targetDir: resolvedTarget, index });
  } catch (error) {
    return {
      state: 'attention-required',
      targetDir: resolvedTarget,
      lockPath: status.lock.path,
      current: status.current,
      updates: status.updates,
      blockers: [{
        id: 'target',
        version: status.lock.data.schemaVersion === 2 ? status.lock.data.hubVersion : status.lock.data.hubVersion,
        latestVersion: null,
        agent: 'standard',
        dest: '.harness-hub/lock.json',
        state: 'unknown-component',
        evidence: ['.harness-hub/lock.json'],
        reason: errorMessage(error),
        exists: true,
      }],
      forceOverridable: [],
      modified: status.modified,
      missing: status.missing,
      skipped: status.skipped,
      unknown: status.unknown,
      recommendedCommand: `harness-hub status "${resolvedTarget}" --json`,
      message: `Target status requires attention: ${errorMessage(error)}.`,
      evidence: [status.lock.path],
    };
  }

  const hasDrift = status.modified.length > 0 || status.missing.length > 0 || status.unknown.length > 0;
  const hasUpdateBlockers = updatePlan.blockers.length > 0;
  const hasUpdates = updatePlan.updates.length > 0;
  const state: HarnessHubTargetCheck['state'] = hasDrift || hasUpdateBlockers
    ? 'attention-required'
    : hasUpdates
      ? 'update-available'
      : 'current';
  const codexActivationMissing = state === 'current' && isCodexActivationMissing(resolvedTarget, status);
  const message = [
    targetCheckMessage({ state, status, updatePlan }),
    codexActivationMissing
      ? 'Project-local Codex skill activation is missing; sync .codex/skills before relying on automatic skill triggers.'
      : '',
  ].filter(Boolean).join(' ');

  return {
    state,
    targetDir: resolvedTarget,
    lockPath: status.lock.path,
    current: status.current,
    updates: updatePlan.updates,
    blockers: updatePlan.blockers,
    forceOverridable: updatePlan.forceOverridable,
    modified: status.modified,
    missing: status.missing,
    skipped: status.skipped,
    unknown: status.unknown,
    recommendedCommand: codexActivationMissing
      ? `harness-hub activate-codex "${resolvedTarget}" --dry-run --json`
      : targetRecommendedCommand(state, resolvedTarget),
    message,
    evidence: codexActivationMissing
      ? [status.lock.path, `${CODEX_SKILLS_RELATIVE_DIR}/workflow-router/SKILL.md`, `${CODEX_SKILLS_RELATIVE_DIR}/package-release-sniffer/SKILL.md`]
      : [status.lock.path],
  };
}

function targetCheckMessage({
  state,
  status,
  updatePlan,
}: {
  state: HarnessHubTargetCheck['state'];
  status: HarnessHubStatus;
  updatePlan: UpdatePlan;
}): string {
  if (state === 'attention-required') {
    const drift = [
      status.modified.length > 0 ? `${status.modified.length} modified` : '',
      status.missing.length > 0 ? `${status.missing.length} missing` : '',
      status.unknown.length > 0 ? `${status.unknown.length} unknown` : '',
      updatePlan.blockers.length > 0 ? `${updatePlan.blockers.length} update blockers` : '',
    ].filter(Boolean).join(', ');
    return `Target managed components require attention: ${drift}.`;
  }
  if (state === 'update-available') {
    return `${updatePlan.updates.length} target managed component updates available.`;
  }
  return `${status.current.length} target managed components are current.`;
}

function targetRecommendedCommand(state: HarnessHubTargetCheck['state'], targetDir: string): string | null {
  if (state === 'update-available') {
    return `harness-hub update "${targetDir}" --dry-run --json`;
  }
  if (state === 'attention-required') {
    return `harness-hub status "${targetDir}" --json`;
  }
  return null;
}

function isCodexActivationMissing(targetDir: string, status: HarnessHubStatus): boolean {
  const hasActivationSource = status.rows.some((row) => (
    row.id === 'skill:workflow-router'
    || row.id === 'skill:package-release-sniffer'
  ));
  if (!hasActivationSource) {
    return false;
  }

  return [
    path.join(targetDir, CODEX_SKILLS_RELATIVE_DIR, 'workflow-router', 'SKILL.md'),
    path.join(targetDir, CODEX_SKILLS_RELATIVE_DIR, 'package-release-sniffer', 'SKILL.md'),
  ].some((filePath) => !fs.existsSync(filePath));
}

function buildExternalToolSuggestions({
  targetDir,
  pathEnv,
  platform,
  env,
}: {
  targetDir: string;
  pathEnv?: string;
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
}): ExternalToolSuggestion[] {
  const resolvedTarget = path.resolve(targetDir);
  const environment = env || process.env;
  const effectivePath = pathEnv ?? readPathEnv(environment);
  const effectivePlatform = platform || process.platform;
  return [
    buildCodeGraphSuggestion(resolvedTarget, effectivePath, effectivePlatform),
    buildHeadroomSuggestion(resolvedTarget, effectivePath, effectivePlatform, environment),
  ];
}

function buildCodeGraphSuggestion(
  targetDir: string,
  pathEnv: string,
  platform: NodeJS.Platform,
): ExternalToolSuggestion {
  const installed = commandExistsOnPath('codegraph', pathEnv, platform);
  const targetInitialized = safeRelativePathExists(targetDir, '.codegraph');
  const evidence = [
    installed ? 'PATH:codegraph' : 'PATH:codegraph missing',
    targetInitialized ? '.codegraph' : '.codegraph missing',
  ];
  const recommendedCommands = installed
    ? [
      'codegraph install --print-config codex',
      'codegraph init -i',
    ]
    : [
      'npm install -g @colbymchenry/codegraph',
      'codegraph install --print-config codex',
      'codegraph init -i',
    ];
  const state: ExternalToolSuggestionState = installed && targetInitialized
    ? 'configured'
    : installed
      ? 'installed'
      : 'recommended';
  const message = installed && targetInitialized
    ? 'CodeGraph CLI is on PATH and this target has a .codegraph index marker.'
    : installed
      ? 'CodeGraph CLI is on PATH; initialize this target before expecting CodeGraph MCP context.'
      : 'CodeGraph CLI is not on PATH; install it before wiring MCP config or initializing target indexes.';

  return {
    id: 'codegraph',
    name: 'CodeGraph',
    source: 'colbymchenry/codegraph',
    state,
    installed,
    configured: installed && targetInitialized,
    targetInitialized,
    risk: 'medium',
    message,
    recommendation: 'Use CodeGraph as an explicit local MCP/code-indexing layer for structural code questions; keep global agent config changes manual or reviewed.',
    recommendedCommands,
    evidence,
  };
}

function buildHeadroomSuggestion(
  targetDir: string,
  pathEnv: string,
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
): ExternalToolSuggestion {
  const installed = commandExistsOnPath('headroom', pathEnv, platform);
  const envEvidence = [
    'HEADROOM_BASE_URL',
    'HEADROOM_PORT',
    'HEADROOM_WORKSPACE_DIR',
    'HEADROOM_CONFIG_DIR',
  ].filter((key) => Boolean(env[key]));
  const projectMarker = safeRelativePathExists(targetDir, '.headroom');
  const configured = installed && (envEvidence.length > 0 || projectMarker);
  const evidence = [
    installed ? 'PATH:headroom' : 'PATH:headroom missing',
    ...envEvidence.map((key) => `env:${key}`),
    projectMarker ? '.headroom' : '.headroom missing',
  ];
  const recommendedCommands = installed
    ? [
      'headroom init -g codex',
      'headroom proxy --port 8787',
    ]
    : [
      'pipx install --python python3.13 "headroom-ai[all]"',
      'headroom init -g codex',
      'headroom proxy --port 8787',
    ];
  const state: ExternalToolSuggestionState = configured
    ? 'configured'
    : installed
      ? 'installed'
      : 'recommended';
  const message = configured
    ? 'Headroom CLI/config evidence is present; keep proxy and hook usage explicit.'
    : installed
      ? 'Headroom CLI is on PATH; configure it only when a target workflow needs context compression, proxying, or shared memory.'
      : 'Headroom CLI is not on PATH; install it only for explicit context-compression, proxy, or cross-agent memory workflows.';

  return {
    id: 'headroom',
    name: 'Headroom',
    source: 'chopratejas/headroom',
    state,
    installed,
    configured,
    targetInitialized: projectMarker,
    risk: 'high',
    message,
    recommendation: 'Use Headroom as an explicit opt-in runtime layer; review proxy, hook, provider-routing, telemetry, and memory behavior before enabling it.',
    recommendedCommands,
    evidence,
  };
}

function externalToolSummary(tools: ExternalToolSuggestion[]): string {
  const configured = tools.filter((tool) => tool.state === 'configured').length;
  const installed = tools.filter((tool) => tool.state === 'installed').length;
  const recommended = tools.filter((tool) => tool.state === 'recommended').length;
  return `${configured} configured, ${installed} installed, ${recommended} recommended.`;
}

function readPathEnv(env: Record<string, string | undefined>): string {
  return env.PATH || env.Path || env.path || '';
}

function commandExistsOnPath(command: string, pathEnv: string, platform: NodeJS.Platform): boolean {
  if (!pathEnv.trim()) {
    return false;
  }

  const pathEntries = pathEnv.split(path.delimiter).filter((entry) => entry.trim().length > 0);
  const extensions = platform === 'win32'
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
      .split(';')
      .filter((extension) => extension.trim().length > 0)
    : [''];
  const commandHasExtension = path.extname(command).length > 0;

  for (const entry of pathEntries) {
    const directory = entry.replace(/^"|"$/g, '');
    const candidates = commandHasExtension
      ? [path.join(directory, command)]
      : extensions.map((extension) => path.join(directory, `${command}${extension}`));
    for (const candidate of candidates) {
      try {
        if (fs.statSync(candidate).isFile()) {
          return true;
        }
      } catch {
        // Continue scanning PATH.
      }
    }
  }

  return false;
}

function compareVersions(left: string, right: string): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return left.localeCompare(right);
}

function parseVersionParts(version: string): number[] {
  return version
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
    insightAction: null,
    loopAction: null,
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
    validateHarness: false,
  };
  const positional: string[] = [];
  let firstOptionIndex = 1;

  if (options.command === 'insight') {
    const action = argv[1];
    if (!action || action.startsWith('-')) {
      throw new CliError('Use "harness-hub insight <generate|build|validate|publish>".', 2);
    }
    options.insightAction = parseInsightAction(action);
    firstOptionIndex = 2;
  }

  if (options.command === 'loop') {
    const action = argv[1];
    if (!action || action.startsWith('-')) {
      throw new CliError('Use "harness-hub loop <evaluate|schedule>".', 2);
    }
    options.loopAction = parseLoopAction(action);
    firstOptionIndex = 2;
  }

  for (let index = firstOptionIndex; index < argv.length; index += 1) {
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
    } else if (arg === '--validate-harness') {
      options.validateHarness = true;
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

function parseInsightAction(value: string): InsightCliAction {
  if (value === 'generate' || value === 'build' || value === 'validate' || value === 'publish') {
    return value;
  }
  throw new CliError(`Unknown insight action '${value}'. Available: generate, build, validate, publish`, 2);
}

function parseLoopAction(value: string): LoopCliAction {
  if (value === 'evaluate' || value === 'schedule') {
    return value;
  }
  throw new CliError(`Unknown loop action '${value}'. Available: evaluate, schedule`, 2);
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
  if (options.validateHarness && options.command !== 'self-check') {
    throw new CliError(`Unsupported option '--validate-harness' for command '${options.command}'`, 2);
  }

  if (options.command === 'components') {
    for (const component of listComponents()) {
      console.log(`${component.id}\t${component.kind}\t${component.path}`);
    }
    return 0;
  }

  if (options.command === 'check') {
    const result = await checkHarnessHub({
      targetDir: options.targetDir || undefined,
    });
    emitReport(renderLifecycleReport('Harness Hub Check Report', result, options), options);
    return result.exitCode;
  }

  if (options.command === 'self-check') {
    const result = await selfCheckHarnessHub({
      targetDir: options.targetDir || undefined,
      validateHarness: options.validateHarness,
    });
    emitReport(renderLifecycleReport('Harness Hub Self-Check Report', result, options), options);
    return result.exitCode;
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

  if (options.command === 'activate-codex') {
    if (!options.dryRun && !options.yes) {
      throw new CliError('Use --yes to sync project-local Codex skill activation or --dry-run to preview.', 2);
    }
    const result = activateCodex({
      targetDir: options.targetDir || undefined,
      dryRun: options.dryRun,
    });
    emitReport(renderLifecycleReport(
      options.dryRun ? 'Harness Hub Codex Activation Plan' : 'Harness Hub Codex Activation Report',
      result,
      options,
    ), options);
    return result.exitCode;
  }

  if (options.command === 'insight') {
    if (options.insightAction === 'generate') {
      if (!options.input) {
        throw new CliError('Use --input <file> with "harness-hub insight generate".', 2);
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

    if (options.insightAction === 'build') {
      const result = buildInsightSite({ repoRoot: options.targetDir || undefined });
      emitReport(renderLifecycleReport('Harness Hub Insight Build Report', result, options), options);
      return result.exitCode;
    }

    if (options.insightAction === 'validate') {
      const result = validateInsightSite({ repoRoot: options.targetDir || undefined });
      emitReport(renderLifecycleReport('Harness Hub Insight Validation Report', result, options), options);
      return result.exitCode;
    }

    if (options.insightAction === 'publish') {
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
  }

  if (options.command === 'loop') {
    if (!options.input) {
      throw new CliError('Use --input <file> with "harness-hub loop evaluate" or "harness-hub loop schedule".', 2);
    }
    const inputPath = path.resolve(options.input);
    if (options.loopAction === 'evaluate') {
      const intent = readLoopActionIntent(inputPath);
      const result = evaluateLoopAction(options.targetDir || process.cwd(), intent, {
        record: options.yes,
      });
      emitReport(renderLifecycleReport('Harness Hub Loop Decision Report', result, options), options);
      return result.exitCode;
    }
    if (options.loopAction === 'schedule') {
      const intents = readLoopScheduleIntents(inputPath);
      const result = scheduleLoopActions(options.targetDir || process.cwd(), inputPath, intents, {
        record: options.yes,
      });
      emitReport(renderLifecycleReport('Harness Hub Loop Schedule Report', result, options), options);
      return result.exitCode;
    }
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

type LifecycleReportData =
  | AnalysisResult
  | CodexActivationPlan
  | CodexActivationResult
  | InstallPlan
  | InstallResult
  | DevBootstrapPlan
  | DevBootstrapResult
  | HarnessInitPlan
  | HarnessInitResult
  | HarnessValidationResult
  | InsightPostResult
  | InsightBuildResult
  | InsightValidationResult
  | InsightPreflightResult
  | LoopDecisionResult
  | LoopScheduleResult
  | HarnessHubStatus
  | HarnessHubCheckResult
  | HarnessHubSelfCheckResult
  | RemoveResult
  | UpdatePlan
  | UpdateResult
  | LockMigrationResult;

function renderLifecycleReport(
  title: string,
  data: LifecycleReportData,
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
  data: LifecycleReportData,
): HtmlRow[] {
  if ('check' in data && 'harnessValidation' in data) {
    return [
      {
        id: 'self-check',
        state: data.exitCode === 0 ? 'pass' : 'fail',
        dest: data.reason,
        version: data.generatedAt,
      },
      {
        id: 'cli',
        state: data.check.cli.state,
        dest: data.check.cli.message,
        version: data.check.cli.currentVersion,
        latestVersion: data.check.cli.latestVersion,
      },
      {
        id: 'target',
        state: data.check.target.state,
        dest: data.check.target.message,
        version: data.check.target.lockPath || '',
        latestVersion: data.check.target.recommendedCommand,
      },
      {
        id: 'harness-validation',
        state: data.harnessValidation.state,
        dest: data.harnessValidation.reason,
        version: data.harnessValidation.strict ? 'strict' : 'conditional',
        latestVersion: data.harnessValidation.exitCode === null ? 'not-run' : String(data.harnessValidation.exitCode),
      },
      ...data.hardFailures.map((finding) => ({
        id: finding.id,
        state: finding.severity,
        dest: finding.message,
        version: finding.evidence.join(', '),
        latestVersion: finding.recommendedCommand,
      })),
      ...data.advisories.map((finding) => ({
        id: finding.id,
        state: finding.severity,
        dest: finding.message,
        version: finding.evidence.join(', '),
        latestVersion: finding.recommendedCommand,
      })),
    ];
  }

  if ('cli' in data && 'target' in data) {
    return [
      {
        id: data.cli.packageName,
        state: data.cli.state,
        dest: data.cli.message,
        version: data.cli.currentVersion,
        latestVersion: data.cli.latestVersion,
      },
      {
        id: 'target',
        state: data.target.state,
        dest: data.target.message,
        version: data.target.lockPath || '',
        latestVersion: data.target.recommendedCommand,
      },
      ...data.externalTools.map((tool) => ({
        id: `external:${tool.id}`,
        state: tool.state,
        dest: tool.message,
        version: tool.installed ? 'installed' : 'not-installed',
        latestVersion: tool.recommendedCommands.join(' | '),
      })),
      ...data.target.updates.map((row) => ({ ...row, state: 'update-available' })),
      ...data.target.blockers.map((row) => ({ ...row, state: row.state })),
    ];
  }

  if ('decision' in data) {
    return [
      {
        id: data.actionId,
        state: data.decision,
        dest: data.reason,
        version: data.policyVersion,
        latestVersion: data.recorded ? 'recorded' : 'not-recorded',
      },
      ...data.riskSignals.map((signal) => ({
        id: signal,
        state: LOOP_INTERRUPT_RISK_SIGNALS.has(signal) ? 'interrupt-risk' : 'signal',
        dest: data.requiredEvidence.join(', '),
        version: 'risk-signal',
      })),
      ...data.sideEffects.map((sideEffect) => ({
        id: sideEffect,
        state: LOOP_ALLOWED_SIDE_EFFECTS.has(sideEffect) ? 'allowed' : 'interrupt-risk',
        dest: data.actionId,
        version: 'side-effect',
      })),
    ];
  }

  if ('decisions' in data && 'nextActionId' in data) {
    return [
      {
        id: data.runId,
        state: data.nextActionId ? 'scheduled' : 'interrupted',
        dest: data.reason,
        version: data.recorded ? 'recorded' : 'not-recorded',
        latestVersion: data.nextActionId,
      },
      ...data.decisions.map((decision) => ({
        id: decision.actionId,
        state: decision.decision,
        dest: decision.reason,
        version: decision.policyVersion,
        latestVersion: decision.recorded ? 'recorded' : 'not-recorded',
      })),
    ];
  }

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

  if ('codexSkillsRoot' in data) {
    return data.items.map((item) => ({
      id: item.skillName,
      agent: 'codex',
      dest: path.relative(data.targetDir, item.dest).replaceAll(path.sep, '/'),
      state: item.action,
      version: item.managed ? 'managed' : item.exists ? 'unmanaged' : 'missing',
      latestVersion: item.reason,
    }));
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
  data: LifecycleReportData,
): string {
  if ('check' in data && 'harnessValidation' in data) {
    return data.reason;
  }

  if ('cli' in data && 'target' in data) {
    return data.reason;
  }

  if ('decision' in data) {
    return `${data.actionId}: ${data.decision}. ${data.recorded ? 'Recorded.' : 'Not recorded.'} ${data.reason}`;
  }

  if ('decisions' in data && 'nextActionId' in data) {
    return `${data.decisions.length} loop actions evaluated, next action ${data.nextActionId || 'none'}, ${data.interruptedActionIds.length} interrupted. ${data.recorded ? 'Recorded.' : 'Not recorded.'} ${data.reason}`;
  }

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

  if ('codexSkillsRoot' in data) {
    const sync = data.items.filter((item) => item.action === 'sync').length;
    const stale = data.items.filter((item) => item.action === 'remove-stale').length;
    const blockers = data.items.filter((item) => item.action === 'block').length;
    if ('reason' in data) {
      return data.reason;
    }
    return `${sync} Codex skill activation cache entries planned, ${stale} stale planned for removal, ${blockers} blockers.`;
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
  harness-hub check [target] [--json|--html] [--output file]
  harness-hub self-check [target] [--validate-harness] [--json|--html] [--output file]
  harness-hub analyze [target] [--target standard] [--agent-readiness] [--harness] [--json|--html] [--output file]
  harness-hub init-harness [target] [--dry-run|--yes] [--force] [--json|--html] [--output file]
  harness-hub validate-harness [target] [--json|--html] [--output file]
  harness-hub activate-codex [target] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub install [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub init [target] [--target standard] [--dry-run|--yes] [--json|--html] [--output file]
  harness-hub insight generate [target] --input file [--slug slug] [--json|--html] [--output file]
  harness-hub insight build [target] [--json|--html] [--output file]
  harness-hub insight validate [target] [--json|--html] [--output file]
  harness-hub insight publish [target] --dry-run [--allow-dirty] [--json|--html] [--output file]
  harness-hub loop evaluate [target] --input action.json [--yes] [--json|--html] [--output file]
  harness-hub loop schedule [target] --input actions.jsonl [--yes] [--json|--html] [--output file]
  harness-hub status [target] [--json|--html] [--output file]
  harness-hub update [target] [--dry-run|--yes] [--component id] [--force] [--json|--html]
  harness-hub migrate-lock [target] [--dry-run|--yes] [--json|--html]
  harness-hub remove [target] [--dry-run|--yes] [--force] [--json|--html]
  harness-hub components

Supported install targets: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}
Use check for read-only startup version checks: CLI package status and target managed-component status are reported separately.
Use self-check for read-only aggregate status checks; strict harness validation runs only for initialized harness targets unless --validate-harness is provided.
Install selects every standard skill component and overwrites same-name skill directories by default.
Use init-harness for Codex-only dev bootstrap: standard skills plus root harness files.
Use activate-codex to sync installed project-local skills into ignored .codex/skills without global installation.
validate-harness includes standard harness checks, five-subsystem assessment, and a structural benchmark.
Use insight for structured source-to-blog generation and GitHub Pages preflight.
Use loop evaluate/schedule to decide continue vs interrupt and optionally append local Loop ledgers with --yes.
`);
}
