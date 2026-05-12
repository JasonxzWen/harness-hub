import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HUB_ROOT = path.resolve(__dirname, '..');

export type AgentName = 'codex' | 'opencode' | 'claude-code';
export type LifecycleRisk = 'low' | 'medium' | 'high';
export type ReportFormat = 'text' | 'json' | 'html';

export interface PathDetectRule {
  path: string;
  agent?: AgentName;
}

export interface CapabilityProfile {
  description: string;
  components: string[];
}

export interface CapabilityComponent {
  kind: 'skill' | 'config' | 'script' | 'rule' | 'hook' | 'mcp' | string;
  path: string;
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
  defaults: {
    profile: string;
    agents: AgentName[];
  };
  profiles: Record<string, CapabilityProfile>;
  components: Record<string, CapabilityComponent>;
}

export interface RepoSignals {
  packageJson: boolean;
  tsconfig: boolean;
  pyproject: boolean;
  cargo: boolean;
  goMod: boolean;
  codex: boolean;
  claude: boolean;
  agents: boolean;
  opencode: boolean;
}

export interface CapabilityFinding {
  capability: string;
  componentId: string;
  agent: AgentName;
  state: 'detected' | 'recommended' | 'conflict' | 'already-managed' | 'unknown';
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
  profile: string;
  agents: AgentName[];
  signals: RepoSignals;
  findings: CapabilityFinding[];
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
  status: 'installed' | 'skipped';
}

export interface SkillHubLockV1 {
  schemaVersion: 1;
  generatedAt: string;
  hubVersion: string;
  profile: string;
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
  profile: string;
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

export interface UpdatePlan {
  targetDir: string;
  updates: StatusRow[];
  blockers: StatusRow[];
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
  profile?: string | null;
  agents?: AgentName[];
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
  profileName: string;
  profile: CapabilityProfile;
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
  profile: string | null;
  dryRun: boolean;
  yes: boolean;
  overwrite: boolean;
  html: boolean;
  json: boolean;
  output: string | null;
  force: boolean;
}

interface PlanInstallOptions {
  hubRoot?: string;
  targetDir?: string;
  index?: CapabilityIndex;
  profile?: string | null;
  agents?: AgentName[];
}

interface StatusOptions {
  hubRoot?: string;
  targetDir?: string;
  index?: CapabilityIndex;
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
  codex: '.agents/skills',
  opencode: '.agents/skills',
  'claude-code': '.claude/skills',
} satisfies Record<AgentName, string>);

const VALID_RISKS = new Set<LifecycleRisk>(['low', 'medium', 'high']);
const GLOB_CHARS = /[*?[\]{}]/;

export function readCapabilityIndex(hubRoot = HUB_ROOT): CapabilityIndex {
  const indexPath = path.join(hubRoot, 'capabilities', 'index.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as CapabilityIndex;
}

export function listProfiles(index = readCapabilityIndex()): Array<{ id: string } & CapabilityProfile> {
  return Object.entries(index.profiles).map(([id, profile]) => ({ id, ...profile }));
}

export function listComponents(index = readCapabilityIndex()): Array<{ id: string } & CapabilityComponent> {
  return Object.entries(index.components).map(([id, component]) => ({ id, ...component }));
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
    codex: '.codex',
    claude: '.claude',
    agents: '.agents',
    opencode: '.opencode',
  };

  return Object.fromEntries(
    Object.entries(checks).map(([key, relativePath]) => [
      key,
      fs.existsSync(path.join(targetDir, relativePath)),
    ]),
  ) as unknown as RepoSignals;
}

export function resolveProfile(index: CapabilityIndex, profileName: string): CapabilityProfile {
  const profile = index.profiles[profileName];
  if (!profile) {
    throw new Error(`Unknown profile '${profileName}'. Available: ${Object.keys(index.profiles).join(', ')}`);
  }
  return profile;
}

export function resolveAgents(agentNames: AgentName[]): AgentName[] {
  const agents: AgentName[] = agentNames.length > 0 ? agentNames : ['codex'];
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
  const profileName = options.profile || index.defaults.profile;
  const profile = resolveProfile(index, profileName);
  const agents = resolveAgents(options.agents || index.defaults.agents || []);
  const findings: CapabilityFinding[] = [];

  for (const componentId of profile.components) {
    const component = index.components[componentId];
    if (!component) {
      throw new Error(`Profile '${profileName}' references missing component '${componentId}'`);
    }

    if (component.kind !== 'skill') {
      continue;
    }

    for (const agent of agents) {
      if (component.agents.length > 0 && !component.agents.includes(agent)) {
        continue;
      }

      findings.push(analyzeComponentForAgent(targetDir, componentId, component, agent));
    }
  }

  findings.sort((left, right) => (
    left.capability.localeCompare(right.capability)
    || left.componentId.localeCompare(right.componentId)
    || left.agent.localeCompare(right.agent)
    || (left.dest || '').localeCompare(right.dest || '')
  ));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: index.version,
    targetDir,
    profile: profileName,
    agents,
    signals: detectRepoSignals(targetDir),
    findings,
  };
}

function analyzeComponentForAgent(
  targetDir: string,
  componentId: string,
  component: CapabilityComponent,
  agent: AgentName,
): CapabilityFinding {
  const skillName = path.basename(component.path);
  const dest = toPortablePath(path.join(AGENT_SKILL_DIRS[agent], skillName));
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
      reason: `Destination already exists and will be skipped by default: ${dest}`,
      defaultAction: 'skip',
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

export function planInstall(options: PlanInstallOptions = {}): InstallPlan {
  const hubRoot = options.hubRoot || HUB_ROOT;
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(hubRoot);
  const profileName = options.profile || index.defaults.profile;
  const profile = resolveProfile(index, profileName);
  const agents = resolveAgents(options.agents || []);
  const analysis = analyzeTarget({ hubRoot, targetDir, index, profile: profileName, agents });
  const components = profile.components.map((id) => {
    const component = index.components[id];
    if (!component) {
      throw new Error(`Profile '${profileName}' references missing component '${id}'`);
    }
    return { id, ...component };
  });

  const items = [];
  for (const component of components) {
    if (component.kind !== 'skill') {
      continue;
    }

    const source = path.join(hubRoot, component.path);
    if (!fs.existsSync(source)) {
      throw new Error(`Component source does not exist: ${component.path}`);
    }

    for (const agent of agents) {
      const dest = path.join(targetDir, AGENT_SKILL_DIRS[agent], path.basename(component.path));
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
    profileName,
    profile,
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
  const overwrite = Boolean(options.overwrite);
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
  const lock: SkillHubLock = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: plan.hubVersion,
    profile: plan.profileName,
    agents: plan.agents,
    components: [...result.installed, ...result.skipped].map((item) => ({
      id: item.componentId,
      version: item.componentVersion,
      agent: item.agent,
      kind: item.kind,
      source: toPortablePath(path.relative(HUB_ROOT, item.source)),
      dest: path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/'),
      files: 'reason' in item ? [] : collectManagedFiles(plan.targetDir, item.dest),
      installedAt,
      status: 'reason' in item ? 'skipped' : 'installed',
    })),
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
    const component = index.components[installed.id];
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
      } else if (component.version !== installed.version) {
        row = { ...baseRow, state: 'update-available', evidence: [installed.dest], reason: 'Component version differs from the current capability index.' };
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
      } else if (component.version !== installed.version) {
        row = { ...baseRow, state: 'update-available', evidence: [installed.dest], reason: 'Component version differs from the current capability index.' };
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

export function getUpdatePlan(options: StatusOptions = {}): UpdatePlan {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const index = options.index || readCapabilityIndex(options.hubRoot || HUB_ROOT);
  const lock = readLock(targetDir);
  const updates: StatusRow[] = [];
  const blockers: StatusRow[] = [];

  if (!lock) {
    return { targetDir, updates, blockers };
  }

  for (const component of lock.data.components) {
    const latest = index.components[component.id];
    if (!latest || latest.version === component.version) {
      continue;
    }

    const baseRow: StatusRow = {
      id: component.id,
      version: component.version,
      latestVersion: latest.version,
      agent: component.agent,
      dest: component.dest,
      state: 'update-available',
      evidence: [component.dest],
      reason: 'Component version differs from the current capability index.',
      exists: safeRelativePathExists(targetDir, component.dest),
      status: component.status,
    };
    updates.push(baseRow);

    if (lock.data.schemaVersion === 1) {
      blockers.push({
        ...baseRow,
        state: 'unknown-component',
        reason: 'Schema version 1 lock has no file hashes; update is blocked.',
      });
    } else {
      let fileStatus: ReturnType<typeof inspectManagedFiles>;
      try {
        fileStatus = inspectManagedFiles(targetDir, component as ManagedComponentRecord);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        blockers.push({
          ...baseRow,
          state: 'modified',
          evidence: [component.dest],
          reason: `Lock contains an unsafe managed path: ${message}`,
        });
        continue;
      }
      if (fileStatus.modified.length > 0) {
        blockers.push({
          ...baseRow,
          state: 'modified',
          evidence: fileStatus.modified,
          reason: 'Managed files were modified; update is blocked.',
        });
      }
    }
  }

  return { targetDir, updates, blockers };
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
    summary: `${result.installed.length} installed, ${result.skipped.length} skipped for profile '${plan.profileName}'.`,
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
    profile: null,
    dryRun: false,
    yes: false,
    overwrite: false,
    html: false,
    json: false,
    output: null,
    force: false,
  };
  const positional: string[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--agent' || arg === '-a') {
      options.agents.push(parseAgentName(readOptionValue(argv, ++index, arg)));
    } else if (arg === '--profile' || arg === '-p') {
      options.profile = readOptionValue(argv, ++index, arg);
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
  if (value === 'codex' || value === 'opencode' || value === 'claude-code') {
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
    const exitCode = /Unknown profile|Unsupported agent|Unknown command|Missing value/.test(message) ? 2 : 1;
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

  if (options.command === 'profiles') {
    for (const profile of listProfiles()) {
      console.log(`${profile.id}\t${profile.description}`);
    }
    return 0;
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
      profile: options.profile || undefined,
      agents: options.agents,
    });
    emitReport(renderLifecycleReport('Skill Hub Analysis Report', analysis, options), options);
    return 0;
  }

  if (options.command === 'init' || options.command === 'install') {
    if (!options.dryRun && !options.yes) {
      throw new CliError('Use --yes to confirm non-interactive install or --dry-run to preview.', 2);
    }
    const plan = planInstall({
      ...options,
      targetDir: options.targetDir || undefined,
      profile: options.profile || undefined,
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
    if (!options.dryRun) {
      throw new CliError('Mutating update is deferred in the first release. Use --dry-run to preview updates.', 2);
    }
    const index = readCapabilityIndex();
    const updatePlan = getUpdatePlan({ targetDir: options.targetDir || undefined, index });
    emitReport(renderLifecycleReport('Skill Hub Update Report', updatePlan, options), options);
    return 0;
  }

  throw new CliError(`Unknown command '${options.command}'`, 2);
}

function renderLifecycleReport(
  title: string,
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan,
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
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan,
): HtmlRow[] {
  if ('findings' in data) {
    return data.findings.map((finding) => ({
      id: finding.componentId,
      agent: finding.agent,
      dest: finding.dest,
      state: finding.state,
      latestVersion: finding.capability,
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

  return [
    ...data.updates.map((row) => ({ ...row, state: 'update-available' })),
    ...data.blockers.map((row) => ({ ...row, state: row.state })),
  ];
}

function summaryForLifecycleData(
  data: AnalysisResult | InstallPlan | InstallResult | SkillHubStatus | RemoveResult | UpdatePlan,
): string {
  if ('findings' in data) {
    const recommended = data.findings.filter((finding) => finding.state === 'recommended').length;
    const detected = data.findings.filter((finding) => finding.state === 'detected').length;
    const conflicts = data.findings.filter((finding) => finding.state === 'conflict').length;
    return `${recommended} recommended, ${detected} detected, ${conflicts} conflicts.`;
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
      : 'No Skill Hub lock found.';
  }

  if ('removed' in data) {
    return `${data.removed.length} managed files planned, ${data.blocked.length} blockers, ${data.skipped.length} skipped. ${data.reason}`;
  }

  return `${data.updates.length} updates, ${data.blockers.length} blockers.`;
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
  console.log(`Profile: ${plan.profileName}`);
  console.log(`Agents: ${plan.agents.join(', ')}`);
  for (const item of plan.items) {
    const relDest = path.relative(plan.targetDir, item.dest).replaceAll(path.sep, '/');
    console.log(`- ${item.componentId} -> ${item.agent}:${relDest}${item.exists ? ' (exists)' : ''}`);
  }
}

function printHelp() {
  console.log(`skill-hub

Usage:
  skill-hub analyze [target] [--profile minimal] [--agent codex] [--json|--html] [--output file]
  skill-hub install [target] [--profile minimal] [--agent codex] [--dry-run|--yes] [--overwrite] [--json|--html] [--output file]
  skill-hub init [target] [--profile minimal] [--agent codex] [--dry-run|--yes] [--overwrite] [--json|--html] [--output file]
  skill-hub status [target] [--json|--html] [--output file]
  skill-hub update [target] --dry-run [--json|--html]
  skill-hub remove [target] [--dry-run|--yes] [--force] [--json|--html]
  skill-hub profiles
  skill-hub components

Supported agents: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}
`);
}
