# Harness Hub

Harness Hub 通过仓库 URL 为 Claude Code / Codex 项目提供确定性的全量 Harness 迁移。

它只有一个面向目标项目的能力：`migrate`。Git 仓库及其 commit 是唯一分发和版本来源；不发布 npm 包，不提供分步安装、独立更新/删除、兼容入口、通用 Agent Runtime 或第二套 registry。

Claude Code 和 Codex 是唯一主 Agent 执行层，负责需求对齐、Subagent 派发、并行执行、结果汇总和用户汇报。Harness Hub 只分发项目契约、Host 资源、原子 Skills 和 OKF，不重复实现 Host 已有的编排能力。

## 一键全量迁移

在目标仓库外克隆本仓库，然后运行唯一公开命令：

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git C:\temp\harness-hub
cd C:\temp\harness-hub
node bin/harness-hub.mjs migrate C:\path\to\target --host codex --yes
```

支持三种模式：

```text
--host claude
--host codex
--host both --primary claude
--host both --primary codex
```

`both` 的 primary 只决定首次 OKF 初始化使用哪个 CLI；通用资源和两个 Host surface 都由 Node 迁移器确定性复制。

`--force` 也只能替换 Harness Hub manifest 已管理的通用资源。每次迁移都会清理旧 manifest 仍拥有、但已不属于当前分发的 stale resource；目标项目自有 Skills、`knowledge/**`、Evals、产品文件、凭据、浏览器状态和其他信息始终受保护。

源仓库和目标仓库都必须是具有 `HEAD` 的干净、独立 Git worktree，所有分发源文件必须与 source `HEAD` tree 逐字节一致。迁移拒绝 collision、路径逃逸、符号链接、junction、不安全 Git 状态和不完整输出；不会提交、推送、发布、合并、修改凭据、修改 Host trust 或修改用户/全局配置。

## 迁移结果

通用资源：

- `AGENTS.md`：原生主 Agent、开发交付、原子 Skill、OKF、Eval、授权和安全边界；
- `CLAUDE.md`：严格等于 `@AGENTS.md`；
- `.harness-hub/manifest.json`：无版本号的受管文件所有权；
- `.harness-hub/okf-validate.mjs`：独立、确定性的 Google OKF v0.1 validator；
- `.harness-hub/safety-hook.mjs`：只在 PreTool 阶段执行的确定性安全 Hook，不路由、不写状态、不派发 Agent；
- 首次迁移时由 primary CLI 扫描目标仓库并生成的项目自有 `knowledge/`。

Claude Code 获得 `.claude/skills/**` 和 `.claude/settings.json`。

Codex 获得 `.agents/skills/**`、Codex-only 的 `decision-ui` 和 `.codex/hooks.json`。

Codex 项目 Hook 只有在用户已信任目标仓库时运行，迁移器不会改变 trust。

Harness Hub 自身的 `knowledge/`、来源记录、文档、测试、任务状态和仓库历史永不迁移。

## 原子 Skills 与 Report / Retro

原生主 Agent直接选择有独立领域价值的 Skills，例如 Ponytail、effective-interact、grill-me、quick-learn、source-post、Agent Reach、Decision UI、验证、安全审查和 Agent interaction audit。

- 复杂交付、方案比较和重要 handoff 使用 `effective-interact`；简单结果直接返回纯文本。
- 失败、长任务、高成本、工具异常或显式复盘使用 `agent-interaction-audit`；缺少耗时、token 或 cost 证据时显示 `unknown`，不估算。
- `decision-ui` 只分发到 Codex；原生结构化输入不可用时诚实回退文本。
- Agent Reach 只作为安全的提示词能力分发。它先检查用户是否已安装 CLI，不自动安装依赖、不配置账号、不写 `~/.agent-reach`、不复制 Cookie 或凭据。

## OKF / LLM-Wiki

首次迁移只有在目标既没有旧 manifest、也没有 `knowledge/` 时，才调用 primary CLI 一次，基于真实目标源码生成来源可追溯的 Google OKF v0.1 Wiki。

该 CLI 进程使用一次性隔离的用户/配置目录，只接收所选 Host 的 API Key 环境变量（Codex 使用 `OPENAI_API_KEY`，Claude Code 使用 `ANTHROPIC_API_KEY`）以及网络/TLS 进程配置。它不复用日常 Host profile、钥匙串、浏览器状态、无关凭据或用户配置；进程退出后临时目录即删除。

后续 normal 和 force：

- 不调用 Host CLI 维护知识；
- 只运行独立 validator；
- 逐路径、逐字节保护完整项目知识；
- 如果已有 manifest 但知识库缺失，直接失败。

日常知识维护由目标项目的原生主 Agent按项目契约完成：优先更新已有 canonical owner，保持来源、index、log 和相关链接同步；没有稳定新事实时保持 no-op。

## 失败与 Eval 边界

迁移器保留确定性 ownership、stale cleanup、Git control snapshot、受保护路径验证和 rollback。若无关 ignored 内容或源仓库在迁移期间发生变化导致无法精确恢复，迁移器保留不属于它的修改并返回 `rolledBack: false`，不得伪造回滚成功。

真实任务卡、会话、审计、知识和 Eval 结果只保存在各目标项目中，Harness Hub 不保存其他项目案例。

主指标：真实任务一次成功率。

护栏：人工介入、Agent/CLI 调用次数、耗时、token、成本、迁移安全和项目知识保护。

## 本仓库开发

```powershell
bun install --frozen-lockfile
bun run sync:agent-skills
bun run validate
```

`.agents/skills/` 与 `.claude/skills/` 只是 ignored dogfood 缓存；唯一 canonical Skill 源是 `skills/<name>/`，`capabilities/index.json` 是单一无版本分发清单。
