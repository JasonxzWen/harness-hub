# Harness Hub

Harness Hub 通过仓库 URL 为 Claude Code / Codex 项目分发完整、可执行的 Agent 工作流。

它只有一个面向目标项目的能力：全量迁移。Git 仓库及其 commit 是唯一分发和版本来源；不发布 npm 包，不提供分步安装、独立更新/删除、兼容入口或第二套 Loop runtime。

```text
skill（可选原子能力）
  -> small loop（可独立执行，可编排 skill）
  -> workflow（大 loop，只编排 small loop）
```

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

`both` 的 primary CLI 负责通用资源和首次 OKF 初始化，secondary 只负责自己的 Host 目录。每次迁移都会删除旧 manifest 仍归 Harness Hub 所有、但已不属于当前 Host/全量分发的资源；`--force` 也只能接管 Harness Hub 管理的通用资源，不能改写目标项目自有的 skill、command、`knowledge/**`、Eval、产品文件或其他信息。

源仓库和目标仓库都必须是具有 `HEAD` 的干净 Git worktree，且所有分发源文件必须与 `HEAD` tree 逐字节一致。迁移不会提交、推送、发布、合并、修改凭据或修改用户/全局配置。

## 迁移结果

通用资源：

- `AGENTS.md`：开发规范、迭代规范、Loop Engineering Workflow、通用偏好、OKF、Eval、授权和交付边界；
- `CLAUDE.md`：严格等于 `@AGENTS.md`；
- `.harness-hub/.gitignore` 和无版本号的受管文件 manifest；
- 首次迁移时由 primary CLI 扫描目标仓库并生成的项目自有 `knowledge/`。

Claude Code：`.claude/skills/**` 和 `.claude/settings.json`。

Codex：`.agents/skills/**` 和 `.codex/hooks.json`。

Codex 只从 `.agents/skills/` 发现仓库级 skills；项目 hooks 仅在 Codex 已信任目标仓库时运行，迁移不会修改信任状态或用户/全局配置。

Harness Hub 自身的 `knowledge/`、来源记录、测试、文档、OpenSpec 和历史信息永不迁移。

## 真正可执行的 Loop

唯一 runtime 位于 `skills/workflow-router/scripts/loop-runtime.mjs`。它会真实调用 Claude Code 或 Codex CLI，捕获结构化进程证据，执行 Producer / Verifier / 必要时的只读 Arbiter，处理有界重试、用户问答暂停恢复、路径租约、确定性验证和精简 handoff。迁移 Loop 中 Host 只能执行一次精确的内部 `copy-slice`；运行时联合核验进程 trace、回执、source commit、target HEAD、角色和分发字节。

首批 Loop：requirements、spec、test、implementation-review、delivery、report、retro、knowledge-init、knowledge-maintain。Workflow 只定义这些 Loop 的顺序和分支，不复制内部实现。

复杂决策、方案比较和 handoff 由 `report-loop` 确定性调用 `effective-interact`，不依赖用户是否说出“可视化”关键词。

## OKF / LLM-Wiki

首次迁移生成最小、真实、可追溯的 Google OKF v0.1 项目知识库：`knowledge/index.md`、`knowledge/log.md` 和至少一个引用迁移前目标 `HEAD` 中、且不属于 Harness Hub 托管路径的真实项目文件的概念页。生成的知识文件不得被 Git 忽略。后续迁移和 `--force` 都只验证并逐字节保护它；日常维护由项目自己的 `knowledge-maintain-loop` 完成。

## 评估指标

真实任务 Eval 和会话材料只保存在各目标项目中。主指标是真实任务一次成功率；人工介入次数和总成本是次级护栏。不得通过弱化确定性门禁、隐藏重试或把工作转嫁给用户来优化主指标。

## 本仓库开发

```powershell
bun install --frozen-lockfile
bun run sync:agent-skills
bun run validate
```

`.agents/skills/` 与 `.claude/skills/` 只是本地 ignored dogfood 缓存；唯一 canonical skill 源是 `skills/<name>/`。
