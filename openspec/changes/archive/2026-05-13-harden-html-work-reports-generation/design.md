## Context

`html-work-reports` 当前已经具备触发规则、模板资产、共享 UI 组件、富文本 runtime 组件，以及一份展示 Markdown/Mermaid/code highlight 的示例 HTML。这个状态证明方向可行，但还不是一个稳定生产能力：

- 报告仍主要靠 agent 手工拼装 HTML。
- “自包含”与 CDN runtime 的边界没有工具化。
- Markdown、Mermaid、代码高亮和文件证据的安全/渲染规则仍是文档约束。
- 测试主要覆盖资产存在性，缺少生成结果和浏览器行为验证。

本设计将该 skill 从“模板和规则集合”推进到“可生成、可验证、可审计的 HTML work report 能力”。

## Goals / Non-Goals

**Goals:**

- 提供一个可复用的报告生成入口，将结构化报告输入转换为单文件 `.html`。
- 默认生成可靠可打开的报告：关键阅读内容预渲染并内联到 HTML 中，runtime 只作为可选增强。
- 保留 runtime 渲染作为显式模式，用于需要 live editing、source toggle 或 post-load conversion 的报告。
- 建立模板选择和报告 schema，减少每次手写 HTML 的漂移。
- 增加自动验证，覆盖富文本渲染、交互控件、证据锚点、窄屏布局和外部依赖声明。
- 保持 skill 主体短小，把生成器、模板、组件、验证细节放在 `scripts/`、`assets/` 和 `references/`。

**Non-Goals:**

- 不实现通用生产 UI builder；产品界面仍路由到 `frontend-design`。
- 不实现 slide deck 或 PPT/PPTX 工作流；演示文稿仍路由到 `frontend-slides`。
- 不引入 React/Tailwind/shadcn bundle；复杂 web artifact 仍路由到 `web-artifacts-builder`。
- 不自动发布、上传、推送、提交或修改第三方资源。
- 不把所有报告强制改成 HTML；短答案、权限审批暂停和普通聊天继续保持直接回复。

## Decisions

### Decision 1: 增加脚本化生成器，而不是继续让 agent 手写 HTML

新增 `scripts/create-report.mjs` 或同等脚本，输入一个结构化 JSON 文件，输出 `reports/<slug>.html`。JSON 作为首选格式，因为它稳定、可 fixture 化、便于跨 agent 生成和测试；JS/TS builder API 可以后续作为薄封装，但不是首批目标。输入模型至少包含：

- `title`, `summary`, `status`, `generatedAt`
- `sections[]`：markdown、mermaid、code、timeline、evidence、decision-matrix、actions 等类型
- `template`：`implementation-handoff`, `review-findings`, `research-explainer`, `decision-matrix`
- `renderMode`：`pre-rendered` 或 `runtime`
- `evidence[]`：文件路径、命令、来源、验证状态

理由：生成器把高风险重复逻辑从 agent 输出里移到可测试脚本里，符合 Skill Hub 的“脚本/资产 progressive loading”原则。

替代方案：继续只维护 HTML 模板。该方案短期便宜，但无法稳定保证 self-contained、escaping 和验证。

### Decision 2: 关键内容预渲染，runtime 变成显式增强

默认路径：

- Markdown 预渲染为 semantic HTML，并对输出做 sanitization。
- Mermaid 预渲染为 inline SVG。
- 代码预渲染为带高亮 span/class 的 HTML。
- 关键 CSS/JS 内联到最终 HTML。

runtime 模式仅在报告需要编辑源文本、切换源码、或浏览器端重新渲染时启用，并必须：

- pin `marked`, `DOMPurify`, `mermaid`, `highlight.js` 或对应内联 bundle 版本。
- 在页面中声明外部 runtime 依赖。
- 保留 source fallback。

理由：用户不严格要求完全离线，但报告在 Codex 或其他常见环境中点开时必须足够可靠。关键内容预渲染能保证 CDN 被拦截、网络较慢或 runtime 初始化失败时，报告仍可读；runtime 只负责增强 live editing/source toggle。

替代方案：全部使用 CDN runtime。该方案模板开发快，但在 Codex、本地 file URL、受限网络和离线环境中不够可靠。

### Decision 3: 用小型报告 schema 驱动模板选择

生成器不接受任意 HTML 作为主输入，而是接受有限 section type。初始 section type：

- `summary-cards`
- `markdown`
- `mermaid`
- `code`
- `timeline`
- `evidence`
- `decision-matrix`
- `actions`
- `tabs`
- `filterable-cards`

模板根据 section type 组合页面。若 agent 需要特殊布局，可以手写 HTML，但仍应使用 shared components 和验证脚本。

理由：有限 schema 使验证可行，也能避免报告退化成长段落 HTML。

替代方案：完全自由模板。该方案灵活，但难以测试和治理。

### Decision 4: 验证脚本成为完成门槛，并优先使用 browser-assisted rendering

新增 `scripts/validate-html-report.mjs` 或等价测试 helper，至少检查：

- HTML 文件存在且非空。
- 无明显 raw Markdown 作为主阅读面。
- Mermaid section 已出现 SVG，或 runtime/fallback 声明完整。
- code section 已有高亮标记或 runtime/fallback 声明完整。
- 关键交互控件存在并能在浏览器/DOM 层通过基本检查。
- 页面包含 evidence/source/verification 区域。
- 若使用 CDN/runtime，页面清楚标出依赖版本。
- 窄屏 viewport 不出现主要内容重叠。

浏览器验证和 Mermaid 预渲染优先使用 browser-assisted rendering，也就是本机 Chrome/Playwright 路径；如果本地浏览器不可用，验证脚本应给出明确降级结果，而不是静默通过。

理由：这个 skill 的价值在可视化和交互质量，不能只靠文本断言。

### Decision 5: 安全策略集中在生成器和 reference 中

生成器必须默认 escape 用户可控文本，并只允许有限 HTML 输出进入最终页面。规则：

- Markdown 输出必须经 sanitizer，除非显式标记为 trusted generated content。
- Mermaid 使用 strict security level；渲染失败时不得只交付 raw Mermaid。
- 文件路径作为文本/chip 处理，不作为可执行链接。
- 外链协议限制为 `http`, `https`, `mailto`；禁止 `javascript:`。
- 代码块作为文本处理，不执行。

理由：报告经常承载代码、日志、路径和研究来源，必须默认不可执行。

### Decision 6: Showcase 作为保留资产，生成器/验证器作为内部资产

当前 `reports/html-work-reports-feature-showcase.html` 的能力展示应保留，但应逐步转成生成器 fixture 或示例输入生成的产物，避免长期手工维护。

生成器和验证器本次作为 `html-work-reports` skill 内部资产，不升级为 `capabilities/index.json` 中的独立 installable capability。只有当后续明确需要目标仓库安装这些脚本时，再扩展 capability metadata。

## Risks / Trade-offs

- [Risk] 预渲染 Mermaid 需要本地依赖或浏览器渲染环境 → 按建议先实现 browser-assisted rendering；不可用时生成明确失败/降级报告。
- [Risk] 生成器 schema 过窄会限制报告表达 → 保留 custom HTML escape hatch，但 custom 模式仍要跑验证。
- [Risk] runtime 库版本会漂移 → 版本 pin 放在 reference/test 中，升级必须修改测试期望。
- [Risk] HTML 资产体积增加 → 保持 SKILL.md 短小，重内容留在 `assets/` 和 `scripts/`。
- [Risk] 当前工作区已有并行改动 → 实现时必须只触碰 html-work-reports 相关文件和 OpenSpec change 文件，不回滚其他变更。

## Migration Plan

1. 保留现有模板和 runtime 组件，不做破坏性删除。
2. 添加生成器和验证器，作为 `html-work-reports` 内部资产先服务本地报告，不改变 CLI install 行为。
3. 保留 showcase，并用示例输入重新生成或校验该报告，再以浏览器/DOM 测试验证。
4. 更新 skill 文档，把“手工拼 HTML”降级为例外路径。
5. 若生成器成为目标 repo 可安装资产，再更新 `capabilities/index.json` 和生命周期测试。

Rollback 策略：生成器和验证器均为新增资产；若失败，可保留现有模板/组件路径，撤回脚本和相关测试即可。

## Confirmed Calibration

- 默认不严格要求完全离线，但关键阅读内容必须预渲染，保证在 Codex、本地浏览器和常见受限环境中可靠打开。
- 生成器首选 JSON 输入格式；后续可按需提供 JS/TS builder API。
- Mermaid 预渲染采用 browser-assisted rendering 路径。
- showcase HTML 保留，并逐步转成 fixture 或示例输入生成产物。
- 首批模板包括 `implementation-handoff`、`review-findings`、`research-explainer`、`decision-matrix`，后续可按实际报告场景新增。
- 生成器/验证器作为内部资产，不作为本次 installable capability。
- 当前安全边界足够作为第一版实现约束。
- 不增加硬触发阈值，继续使用 non-trivial completed task 的判断。
