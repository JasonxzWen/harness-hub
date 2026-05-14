## Why

`html-work-reports` 已经具备生成器、模板、runtime 组件和验证器雏形，但当前产出的报告仍然在真实阅读质量上不达标：Mermaid 可能只是 fallback SVG，代码高亮 token 太少，目录堆叠，行距和对比度失衡，窄屏布局和组件重叠也没有被验证器系统捕获。

本次变更把目标从“尽量自包含的静态 HTML”调整为“在 Codex 内可直接查看、富内容真实渲染、视觉稳定、失败可审计的单文件 HTML 报告”。用户已明确允许在静态 HTML 页面内引用外部库渲染，因此应把 CDN runtime 作为受控能力，而不是例外补丁。

## What Changes

- **BREAKING**: 默认报告质量策略从“默认不依赖 CDN 展示主要阅读内容”调整为“默认可使用 pinned CDN runtime 渲染 Mermaid、Markdown 和代码高亮，并以 Codex 内可视验证为验收门槛”。完全离线/预渲染能力保留为显式模式，而不是默认成功标准。
- 引入 `runtime-cdn` 渲染模式，允许报告引用 pinned `Mermaid`, `highlight.js`, `Marked`, `DOMPurify` 等浏览器库。
- 重新定义 runtime 失败边界：库加载失败、渲染失败或安全清洗失败时，相关 section 必须显示 degraded/failed 状态，并保留可审计源码 fallback。
- 重构报告信息架构：结论优先、分组目录、主体内容、证据、验证、下一步，不再把所有目录项平铺堆叠在一个 sticky bar。
- 建立视觉质量合同：字体、行距、字重、代码色彩、状态色、对比度、Mermaid 容器、横向溢出、组件重叠、移动端布局都进入可验证范围。
- 强化富内容渲染合同：
  - Markdown 使用 Marked 解析后必须经 DOMPurify 或等价 sanitizer 清洗。
  - Mermaid 使用 `startOnLoad: false`、strict security 配置和受控渲染容器。
  - 代码高亮使用 highlight.js 或等价高亮器，而不是继续依赖低覆盖率手写正则。
- 增加 stress fixtures，覆盖长中文/英文标题、长目录、复杂 Mermaid、宽代码、长路径、嵌套 JSON、diff、移动端和多组件连续布局。
- 升级验证器，从字符串存在检查扩展到浏览器级视觉检查：runtime 完成状态、视口溢出、关键组件重叠、Mermaid SVG 非空和文本边界、代码 token、高对比度基础门槛、目录可用性。
- 更新 `html-work-reports` skill 文档、模式参考、schema、fixtures 和测试，使 agent 后续生成报告时默认走质量受控的 runtime-cdn 路线。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `html-work-report-generation`: 修改报告生成、runtime 渲染、富内容安全、视觉布局和验证要求；允许 pinned CDN runtime 作为默认 Codex 可视报告路径，并将浏览器级视觉验证提升为完成门槛。

## Impact

- Affected skill assets:
  - `.agents/skills/html-work-reports/SKILL.md`
  - `.agents/skills/html-work-reports/references/html-report-patterns.md`
  - `.agents/skills/html-work-reports/references/report-input-schema.json`
  - `.agents/skills/html-work-reports/assets/components/report-ui.css`
  - `.agents/skills/html-work-reports/assets/components/report-ui.js`
  - `.agents/skills/html-work-reports/assets/components/rich-render-runtime.css`
  - `.agents/skills/html-work-reports/assets/components/rich-render-runtime.js`
  - `.agents/skills/html-work-reports/assets/fixtures/*.json`
  - `.agents/skills/html-work-reports/scripts/create-report.mjs`
  - `.agents/skills/html-work-reports/scripts/validate-html-report.mjs`
- Affected tests:
  - `tests/htmlWorkReportsSkill.test.ts`
  - routing/quality tests only if skill trigger text changes; this change should avoid broad routing trigger changes unless required.
- Runtime dependencies referenced from generated HTML:
  - `Mermaid` for diagrams.
  - `highlight.js` for code highlighting.
  - `Marked` for Markdown parsing.
  - `DOMPurify` for sanitizing rendered Markdown.
- Security considerations:
  - Runtime libraries must be pinned by version in generated HTML.
  - Markdown output must be sanitized before insertion.
  - Mermaid source, code snippets, file paths, and report data remain inert by default.
  - Unsupported protocols such as `javascript:` remain blocked.
  - External library loading failure must not hide primary conclusions, evidence, or source fallback.
- Validation and tooling:
  - `validate-html-report.mjs --require-browser` becomes the expected quality gate for runtime-cdn reports.
  - Browser validation may use Codex/browser-compatible automation or Playwright/Chrome where available.
  - `bun run validate` remains the repo-level final gate after implementation.
