## Why

`html-work-reports` 已经扩大了触发范围并补入模板、组件和富文本 runtime，但仍缺少真正稳定的生成闭环：自包含产物、预渲染优先、运行时依赖边界、安全规则和自动验证还没有被规格化。

现在需要把这套迭代方案沉淀为可实现的能力合同，避免后续继续靠手写 HTML 和人工检查来保证报告质量。

## What Changes

- 为 HTML work report 增加可实施的生成能力：从结构化输入生成单文件 HTML 报告。
- 明确默认策略：关键阅读内容优先预渲染，保证在 Codex、本地浏览器或其他常见环境中可靠打开；仅在需要 live editing 或 post-load conversion 时使用 pinned runtime 增强。
- 增加模板/组件选择规则，覆盖 implementation handoff、review findings、research explainer、decision matrix 等高频场景，并允许按需新增模板。
- 增加安全边界：Markdown sanitization、Mermaid security level、代码/文件路径 escaping、外链协议限制和 source fallback。
- 增加自动验证：检查非空、窄屏布局、交互控件、富文本实际渲染、证据存在和离线/外部依赖声明。
- 明确非目标：不把该 skill 变成生产 UI builder、slide deck 系统、React/Tailwind bundle 生成器，或对第三方资源执行发布/修改操作的工具。

## Capabilities

### New Capabilities

- `html-work-report-generation`: 定义 HTML work report 的生成、富文本渲染、安全边界、模板选择、交互行为和验证要求。

### Modified Capabilities

- None.

## Impact

- `.agents/skills/html-work-reports/`: 更新 skill 契约、references、templates、components 和可能新增的生成脚本。
- `tests/htmlWorkReportsSkill.test.ts`: 从资产存在性检查扩展到生成/渲染/验证行为检查。
- `docs/skill-routing.md`, `docs/capability-map.md`, `docs/codex-skill-feature-inventory.md`, `README.md`: 同步能力边界和使用场景。
- 生成器和验证器作为 `html-work-reports` 内部资产，不在本次变更中升级为 installable capability。
- 可能新增开发依赖或脚本依赖；若引入 runtime 库，必须 pin 版本并说明 CDN/内联/预渲染取舍。
