# Harness Hub

## Current Standard Surface

- `standard` is the only user-facing target path.
- `init-harness --target standard` installs standard skills, root harness files, Loop policy/runtime ledgers, and the LLM Wiki context pack.
- The LLM Wiki entry is `.harness-hub/context/wiki/index.md`; schema and update rules live under `.harness-hub/context/`.
- Public source-backed posts use `source-post`, not the old public `insight` CLI.

简体中文 | [English](README.md)

Harness Hub 是一个个人仓库 harness 工具箱，用来让 agent 在多个项目中的工作方式可重复、可验证、可交接。它会安装完整的标准 skill/路由集合，在明确请求时初始化 `standard` 目标 harness，验证结果，并通过 lock-backed lifecycle 命令安全维护托管文件。

Imported skills 可以保留上游风格；Harness Hub 主要负责路由、source records、harness 模板和 lifecycle safety。

agent 执行规则放在 [AGENTS.md](AGENTS.md)。面向人的开发流程说明放在 [Development Workflow](docs/development-workflow.md)。

## 首次理解

Harness Hub 只做四类有边界的事：

- `check` 和 `analyze` 只读检查目标仓库。
- `init-harness --target standard` 只在你显式确认后创建根级 harness。
- `install` 只安装标准 skill set，不创建根级 harness 文件。
- `loop evaluate` 和 `loop schedule` 判断 continue/interrupt，并且只在 `--yes` 后追加本地 Loop ledger。
- `insight` 创建、构建、验证并预检 source-backed insight posts。

第一次处理目标仓库时，先 dry-run：

```powershell
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --dry-run --json
```

看懂计划文件后再加 `--yes`。Harness Hub 不会替你创建定时任务、webhook、commit、push、全局 skill 安装或远程服务改动，除非某条命令明确声明这类副作用。

## 可视化导航

```mermaid
flowchart TD
  Start["我有一个仓库"] --> Analyze["分析准备度"]
  Analyze --> Init["初始化 standard 目标 harness"]
  Init --> Work["执行 SDD + TDD 开发"]
  Work --> Validate["验证并交接"]

  Start --> Skills["只安装标准 skills"]
  Start --> Maintain["维护 Harness Hub 本身"]
  Start --> Loop["执行 Loop runtime 决策"]
  Start --> Insight["发布 source-backed insight"]

  Analyze --> A1["harness-hub analyze --agent-readiness --harness"]
  Init --> I1["harness-hub init-harness --target standard"]
  Skills --> S1["harness-hub install --target standard"]
  Work --> W1["workflow-router -> sdd-workflow -> tdd-workflow"]
  Validate --> V1["validate-harness / bun run validate"]
  Maintain --> M1["hub-maintenance-workflow"]
  Loop --> L1["loop evaluate -> loop schedule"]
  Insight --> P1["insight generate -> insight build -> insight validate"]
```

## 选择入口

| 我想要... | 从这里开始 | 得到什么 |
|---|---|---|
| 让另一个仓库适合 Codex 驱动开发 | `init-harness --target standard` | 标准 skills、根级 harness 文件、本地 state 模板、验证脚本、lock ownership。 |
| 只安装 skills，不写根级 harness 文件 | `install --target standard` | 完整标准 skill 树，写到 `skills/<name>/`。 |
| 写文件前先检查目标仓库 | `analyze --agent-readiness --harness --json` | 只读 readiness、harness 缺口和建议。 |
| 执行例行状态自检 | `self-check --json` | 只读聚合状态、自检 advisory/failure 分流和条件化 harness 验证。 |
| 让已安装 skills 被本地 Codex 看见 | `activate-codex --yes` | 把项目内 `skills/<name>` 同步到 `.codex/skills`，不做全局安装。 |
| 验证已初始化的仓库 | `validate-harness --json` | 必需文件、state、QA 边界、trigger hygiene 和结构评分。 |
| 评估 Loop 风险 | `loop evaluate --input action.json --json` | continue/interrupt 决策、risk signals、evidence needs；加 `--yes` 后写入 ledger。 |
| 维护 Harness Hub 自身 | `workflow-router` 再进入 `hub-maintenance-workflow` | source records、routing、capability metadata、docs、templates、lifecycle safety。 |
| 创建公开 source-backed insight post | `insight generate` | source ledger、Effective Interact adaptation、Pages 输出和发布预检。 |

Harness Hub 只有一个面向用户的目标路径：`standard`。没有 named skill install variants、harness pack levels 或 bundle selectors。`harness:minimal` 只是根级 harness 文件的内部组件/模板 ID。确认执行 `install` 会覆盖同名 skill 目录；如果目标仓库可能已有本地 skills，先用 `--dry-run` 检查。

## 一步初始化目标仓库

在干净的目标 git worktree 中运行：

```powershell
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --yes
```

如果目标已经有根级 harness 文件，先检查计划：

```powershell
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --dry-run --json
```

### Link-only agent bootstrap

如果你是在另一个仓库工作的 agent，只拿到了这个 Harness Hub 仓库链接，不要把这个 checkout 复制到目标仓库。把这个链接当作文档和 CLI 来源。

这条路径使用 [Bootstrap A Target Repository](BOOTSTRAP-TARGET.md) 作为 copy-safe contract。

优先使用已发布 CLI：

```powershell
npx @jasonwen/harness-hub@latest init-harness D:\path\to\target --target standard --dry-run --json
npx @jasonwen/harness-hub@latest init-harness D:\path\to\target --target standard --yes
```

如果必须从源码运行，把本仓 clone 到目标 worktree 外部，只把它当 CLI runner：

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git
cd harness-hub
bun install
bun run build
node bin\harness-hub.mjs init-harness D:\path\to\target --target standard --dry-run --json
node bin\harness-hub.mjs init-harness D:\path\to\target --target standard --yes
```

不要把 `.claude-plugin/`、root `openspec/`、`docs/`、`config/`、`capabilities/`、`harness/`、`package.json`、README 文件、源码、测试或其他 Harness Hub 源仓库材料复制到目标仓库。如果 npm CLI 和源码 CLI 都无法运行，报告 bootstrap blocker，不要手动复制目录。

从源码运行：

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git
cd harness-hub
bun install
bun run build
node bin\harness-hub.mjs init-harness D:\path\to\target --target standard --yes
```

## 核心命令

```powershell
bun install
bun run validate
bun run bootstrap:codex-skills

npx @jasonwen/harness-hub analyze D:\path\to\target --agent-readiness --harness --json
npx @jasonwen/harness-hub check D:\path\to\target --json
npx @jasonwen/harness-hub self-check D:\path\to\target --json
npx @jasonwen/harness-hub activate-codex D:\path\to\target --dry-run --json
npx @jasonwen/harness-hub activate-codex D:\path\to\target --yes
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --dry-run --json
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --yes
npx @jasonwen/harness-hub validate-harness D:\path\to\target --json
npx @jasonwen/harness-hub loop evaluate D:\path\to\target --input action.json --json
npx @jasonwen/harness-hub loop schedule D:\path\to\target --input actions.jsonl --yes --json
npx @jasonwen/harness-hub install D:\path\to\target --target standard --dry-run
npx @jasonwen/harness-hub install D:\path\to\target --target standard --yes
npx @jasonwen/harness-hub status D:\path\to\target --json
npx @jasonwen/harness-hub update D:\path\to\target --dry-run --json
npx @jasonwen/harness-hub remove D:\path\to\target --dry-run --json
```

Insight publishing：

```powershell
npx @jasonwen/harness-hub insight generate . --input input.json --json
npx @jasonwen/harness-hub insight build . --json
npx @jasonwen/harness-hub insight validate . --json
npx @jasonwen/harness-hub insight publish . --dry-run --json
```

`check` 是只读启动检查。它在 `cli` 报告 npm 上的 CLI 包状态，在 `target` 报告目标仓库 lock 托管组件状态，并在 `externalTools` 给出 CodeGraph 和 Headroom 的显式配置/安装建议；更新可用、registry 失败、缺少 lock、缺少项目本地 Codex 激活、外部工具建议都只是 advisory，不会安装工具、改写目标仓库或阻塞 agent 启动路径。

`activate-codex` 是显式的 Codex 项目本地激活步骤。它把已经安装在目标仓库里的 `skills/<name>` 复制到 `.codex/skills/<name>`，让 Codex 能索引 skill metadata，包括 `package-release-sniffer` 这类 helper 触发。它只写目标仓库本地 `.codex/skills` 缓存，用 Harness Hub marker 避免覆盖未标记的本地 Codex skill，不写全局 skill 目录，也不写 `.harness-hub/lock.json`。

`self-check` 是例行健康自检聚合命令。它包装 `check`，把硬失败和 advisory 分开，并且只有在目标已有 `harness:minimal` 安装 lock 记录时默认运行严格 `validate-harness`；如果要强制验证未初始化目标，需要显式加 `--validate-harness`。本地每天 21:30 的 runner 可以调用：

```powershell
npx @jasonwen/harness-hub self-check D:\path\to\target --json
```

Harness Hub 不会为这条命令创建定时任务、webhook、commit、push、工具安装或目标 setup。

## 包含能力

| 领域 | 包含内容 |
|---|---|
| 路由与生命周期 | `workflow-router`、owner workflow skills、SDD-first 变更流、delivery closeout。 |
| 计划与实现 | `grill-me`、`product-capability`、`tdd-workflow`、`karpathy-guidelines`、`verification-loop`。 |
| 诊断与评审 | `diagnosis-workflow`、`diagnose`、`review-workflow`、`compound-code-review`、`security-review`。 |
| 沟通与交接 | `effective-interact`、`handoff`、`doc-coauthoring`、`internal-comms`、`documentation-lookup`。 |
| Web 与 artifacts | `frontend-design`、`design-taste-frontend`、`webapp-testing`、`e2e-testing`、`web-artifacts-builder`、`frontend-slides`、`theme-factory`。 |
| 平台扩展 | `claude-api`、`mcp-builder`、`skill-creator`、source records、capability metadata。 |
| 外部工具建议 | `check.externalTools` 和 `analyze --agent-readiness` 会给出显式 CodeGraph 与 Headroom 配置建议。 |
| Harness lifecycle | `check`、`self-check`、`analyze`、`init-harness`、`validate-harness`、`loop evaluate`、`loop schedule`、`install`、`status`、`update`、`remove`。 |

## Source Layout

这是 Harness Hub 源码仓库布局，不是 target 初始化输出。Target 初始化不会把 `.claude-plugin/`、root `openspec/`、`docs/`、`config/`、`package.json`、本仓库 README 或本仓库源码树复制到目标根目录；它只写 lock-managed `skills/<name>/` 条目和显式 standard 目标 harness 文件。

```text
skills/
  <skill-name>/
    SKILL.md
    references/   # optional
    scripts/      # optional
    assets/       # optional
harness/
  minimal/          # standard 目标 harness 的内部模板
  website-cloner/  # 显式授权的网站克隆 smoke scaffold
.claude-plugin/
  plugin.json
  marketplace.json
```

## 项目地图

| 路径 | 用途 |
|---|---|
| `README.md` / `README.zh-CN.md` | 面向人的入口和可视化导航。 |
| `AGENTS.md` | 面向 agent 的仓库规则和执行工作流。 |
| `skills/` | 平台中立的 skill source of truth。 |
| `harness/` | Standard 目标 harness 模板和 explicit-only smoke scaffolds。 |
| `capabilities/index.json` | Skill 与 harness component metadata。 |
| `docs/development-workflow.md` | SDD+TDD 工作流指南和 state-file 职责。 |
| `docs/skill-routing.md` | Skill 重叠边界和路由规则。 |
| `docs/personal-workflow-distribution.md` | 个人分发策略。 |
| `docs/standard-target-boundary.md` | 单一目标/安装边界和来源引入规则。 |
| `docs/source-projects.md` | 上游来源和决策日志。 |
| `src/harnessHub.ts` | CLI 实现。 |
| `config/artifact-policy.json` | Git/npm artifact inclusion policy。 |

生成报告、worktree-local harness state、interaction artifacts 和 Codex dogfood copies 保持本地：`reports/`、`.harness-hub/reports/`、`.harness-hub/state/`、`skills/effective-interact/artifacts/` 和 `.codex/` 被忽略。`site/` 是 Git-only Pages 输出，并且有意排除在 npm package 之外。

## 验证

```powershell
bun run typecheck
bun test ./tests
bun run validate:artifact-policy
bun run validate:skills
bun run validate
git diff --check
```

Release 验证：

```powershell
bun run validate:release
```
