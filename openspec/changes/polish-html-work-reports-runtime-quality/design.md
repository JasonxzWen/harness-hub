## Context

`html-work-reports` 的上一轮能力已经把“手写报告”推进到“JSON 输入 + 生成器 + 验证器 + 模板资产”的阶段，但当前合同仍然偏向静态自包含输出：默认模式要求 Markdown、Mermaid 和代码在交付前预渲染，并且不依赖 CDN 展示主要阅读内容。这个合同能保证离线可读，但它也把质量压力压到了本地手写渲染器上。

当前质量问题集中在三个层面：

- 富内容渲染不够真实：代码高亮由少量正则实现，Mermaid 在未启用浏览器渲染时会退化为 deterministic fallback SVG，Markdown 渲染能力有限。
- 报告信息架构不够系统：目录是平铺 sticky nav，长报告会堆叠；内容没有明确的 Overview/Diagrams/Code/Evidence/Verification/Actions 分区；主体阅读流和证据区混杂。
- 验证器太浅：当前检查主要确认 HTML 中存在标记、fallback、控件和一个窄屏基本加载结果，不能捕获 Mermaid 字体超框、组件互相覆盖、低对比度、代码 token 不足、目录挤压、横向溢出等真实视觉退化。

用户已明确允许静态 HTML 页面引用外部库，只要求能在 Codex 内查看。因此本设计将默认质量路径改为 `runtime-cdn`：单文件 HTML 仍然由生成器产出，但页面允许引用 pinned browser libraries 来完成 Mermaid、Markdown 和代码高亮；验证器必须在真实浏览器中等待 runtime 完成，并把视觉质量作为完成门槛。

## Goals / Non-Goals

**Goals:**

- 让默认生成报告在 Codex 内打开时真实渲染 Mermaid、Markdown 和代码高亮，而不是依赖弱 fallback 或少量正则。
- 将 `runtime-cdn` 定义为一等 render mode，并保留 `pre-rendered` 作为显式离线/受限环境模式。
- 建立报告级信息架构：结论优先、分组目录、主体阅读流、证据、验证、下一步。
- 建立视觉质量合同，覆盖字重、行距、对比度、代码 token、Mermaid 容器、目录布局、响应式行为和组件重叠。
- 建立 stress fixture，先复现“难看/错位/超框”的情况，再让实现和验证器围绕 fixture 收敛。
- 将浏览器级验证升级为报告完成门槛，尤其是 `validate-html-report.mjs --require-browser` 对 runtime-cdn 报告必须能检查渲染状态和布局质量。
- 继续保持 skill progressive loading：`SKILL.md` 只写路由和核心合同，细节留在 `references/`、`assets/`、`scripts/`。

**Non-Goals:**

- 不做通用产品 UI builder；生产网页、应用页面和复杂交互仍路由到 `frontend-design` 或 `web-artifacts-builder`。
- 不引入 React、Vite、Tailwind、shadcn 或长期运行的前端构建链。
- 不要求生成报告完全离线可用；离线是 `pre-rendered` 显式模式，不再是默认成功标准。
- 不把 `create-report.mjs` 或 `validate-html-report.mjs` 暴露为独立 installable capability。
- 不改变 `html-work-reports` 的高层触发边界，除非实现中发现现有描述会误导 agent 生成错误模式。
- 不在本变更中实现截图 diff 基线管理；本轮只要求浏览器 DOM/layout 检查和可选截图产物。

## Decisions

### Decision 1: 默认模式切换为 `runtime-cdn`

生成器新增并默认使用 `renderMode: "runtime-cdn"`。该模式输出单个 HTML 文件，但允许在页面内引用 pinned CDN 库：

- `Mermaid`：渲染 Mermaid 源码为 SVG。
- `Marked`：解析 Markdown。
- `DOMPurify`：清洗 Markdown 输出。
- `highlight.js`：渲染代码 token。

`pre-rendered` 保留，但成为显式选择，用于离线、CDN 不可用、或用户明确要求自包含主内容的报告。旧的 `runtime` 命名应迁移为 `runtime-cdn` 或作为兼容 alias 短期接受，最终文档中只推荐 `runtime-cdn`。

Rationale: 当前弱高亮和 fallback Mermaid 证明“无外部库默认高质量”不现实。既然用户允许 Codex 内查看优先，就应该让浏览器使用成熟库完成它擅长的渲染工作，同时用 fallback 和验证器约束失败边界。

Alternative considered: 保持 `pre-rendered` 默认，并仅强化本地高亮/浏览器预渲染。该方案能保留离线优势，但会继续引入大量本地渲染复杂度，尤其是 Mermaid 多图类型、代码语言覆盖和 Markdown 扩展语义。

### Decision 2: Runtime 依赖必须 pinned 且在页面中显式声明

生成器必须在 HTML metadata、runtime dependency panel 或等价结构中声明：

- 库名。
- 版本。
- 加载 URL。
- 用途。
- 当前加载/渲染状态。

每个 runtime section 必须有独立状态：`pending`、`ready`、`degraded`、`failed`。页面顶层也必须有 aggregate 状态，便于验证器和用户快速判断富内容是否真实渲染。

Rationale: 允许外部库不等于允许不可追踪的外部行为。pinned 版本和状态面板让报告可审计，也让验证器能明确区分“已渲染”和“退化可读”。

Alternative considered: 只在源码中引用 CDN，不在 UI 中显示依赖。该方案页面更干净，但当 Codex 或网络环境拦截脚本时，用户无法理解为什么图表/代码退化。

### Decision 3: Markdown 用 Marked + DOMPurify，不允许裸插入

Markdown 渲染流程：

1. 从 inert source container 读取 Markdown 文本。
2. 使用 Marked 解析为 HTML。
3. 使用 DOMPurify 或等价 sanitizer 清洗输出。
4. 插入 `.rendered-markdown` 容器。
5. 渲染完成后更新 section 状态。

如果 DOMPurify 不可用，除非该 section 被生成器标记为 trusted generated content，否则 Markdown 不得渲染为 HTML；必须保留源码并显示 degraded/failed。

Rationale: Marked 文档明确不默认 sanitize。报告内容经常包含研究材料、日志、代码片段和外部引用，不能把 Markdown 当可信 HTML。

Alternative considered: 生成器侧预清洗 Markdown 后再 runtime 渲染。该方案仍无法覆盖 runtime parse 输出中的 HTML 结构变化，且会让安全边界分散。

### Decision 4: Mermaid 每图独立渲染、独立失败、独立 fallback

Mermaid section 不再共享一个全局 status。每个图应拥有：

- 唯一 diagram id。
- 源码容器。
- 渲染目标容器。
- 状态 chip。
- 折叠源码 fallback。
- 渲染错误文本。

Mermaid 初始化使用 `startOnLoad: false`，并使用 strict security 配置。渲染可选 `mermaid.run({ nodes })` 或 `mermaid.render(id, source)`，但实现必须保证一个图失败不会阻塞其他图。

渲染后的 SVG wrapper 必须限制布局：

- 容器 `overflow: auto`。
- SVG `max-width: 100%`，必要时允许横向滚动。
- 设置合理 `max-height`，避免长图吞没页面。
- Mermaid 文本和 foreignObject 不得覆盖相邻 section。

Rationale: 当前全局 Mermaid 状态无法表达“第 2 个图失败但第 1 个图成功”。复杂报告中局部失败应该可审计，而不是拖垮整个页面。

Alternative considered: 继续用全局 `mermaid.run` 和一个状态 chip。该方案代码更短，但不适合多图报告和视觉验证。

### Decision 5: 代码高亮交给 highlight.js，行号和 hot line 由本地 wrapper 负责

生成器输出标准结构：

```html
<pre data-line-numbered data-start-line="42">
  <code class="language-typescript">...</code>
</pre>
```

Runtime 使用 highlight.js 处理 token；本地脚本在高亮前后负责：

- 保留行号。
- 应用 `highlightLines`。
- 保留 copy button。
- 防止宽代码撑破页面。
- 标记 `data-code-highlight-state`。

不再扩展手写 `highlightLine()` 正则作为默认质量路径。该函数可以保留给 `pre-rendered` 或 fallback-only 模式，但 runtime-cdn 成功标准必须基于真实 `.hljs-*` token。

Rationale: 代码高亮质量是用户明确指出的问题。继续手写 token 规则会迅速变成不完整语言解析器。

Alternative considered: 使用 Shiki。Shiki 的色彩质量更强，但体积和加载复杂度更高。本轮优先使用 highlight.js，因为当前 repo 已经有相关 runtime pins 和测试基础。

### Decision 6: 目录从平铺 sticky bar 改为分组导航

报告必须产生结构化 section index。建议 schema 支持：

- `section.group`: `overview`、`diagrams`、`code`、`evidence`、`verification`、`actions` 或自定义短标签。
- `section.priority`: 用于组内排序。
- `section.summary`: 用于目录或 section header 摘要。
- `section.status`: `ready`、`warn`、`failed`、`info` 等。

桌面布局：

- 左侧 sticky rail 或主内容前的分组目录。
- 当前 section 可通过 IntersectionObserver 或 anchor focus 标记。
- 目录不得覆盖正文。

移动布局：

- 折叠目录或可横向滚动的紧凑分组控件。
- 长标题必须换行或截断但保留 tooltip/title。

Rationale: 目录堆叠直接影响报告第一屏质量。报告越系统，越不能让导航成为最大视觉噪音。

Alternative considered: 仅压缩当前 nav 的字体和间距。该方案无法解决 20+ sections 时的结构问题。

### Decision 7: 视觉 token 作为一等质量合同

`report-ui.css` 应定义明确 token：

- Typography: body、heading、metadata、code 的字号/行高/字重。
- Color: ink、muted、line、panel、accent、success、warning、danger、info、code tokens。
- Spacing: section gap、card padding、toolbar gap、code padding。
- Radius: 保持工程报告克制，卡片 8px 或更小。
- Layout: `min-width: 0`、overflow strategy、responsive breakpoints。

禁止依赖 hover transform 改变布局。hover/focus 可以改变 border、outline、background、shadow，但不得导致邻近组件重叠或可见跳动。

Rationale: 用户指出“行间距过大、字体太细、对比度低、组件覆盖”，这些不是某一处样式 bug，而是缺少视觉 token 和布局约束。

Alternative considered: 针对当前 showcase 单独修 CSS。该方案会让下一个生成报告继续退化。

### Decision 8: 验证器升级为 static + browser 双层

Static checks:

- HTML root、render mode、metadata。
- runtime dependency pins。
- source fallback。
- unsafe protocol/event handler。
- schema-driven section markers。
- code/diagram/markdown section 的 fallback 和状态结构。

Browser checks:

- 打开 file URL。
- 等待 runtime libraries ready 或 timeout 后记录 degraded。
- 在 390、768、1440 视口检查。
- 检查 body 横向溢出。
- 检查关键区域 bounding boxes 是否重叠。
- 检查目录与正文不覆盖。
- 检查 Mermaid SVG 存在、非空，并且文本 bbox 不明显越界。
- 检查代码出现 `.hljs-*` token。
- 检查 hot line 和行号没有破坏代码布局。
- 检查至少一个 filter、tab、copy control 可操作。
- 输出 JSON，包含每个视口的结果和失败原因。

`--require-browser` 对 runtime-cdn 报告应成为实现完成门槛；如果浏览器不可用，该命令必须失败。非 require 模式仍可显式 degraded。

Rationale: 真实问题发生在浏览器渲染后，字符串检查只能证明“标记存在”，不能证明“报告好看、可读、没重叠”。

Alternative considered: 引入截图像素 diff。该方案更强，但需要基线管理和环境稳定性，本轮先不做。

## Risks / Trade-offs

- [Risk] CDN 在某些环境加载失败 -> Mitigation: pinned dependency panel、section-level degraded 状态、源码 fallback、非 runtime 关键结论和证据仍可读。
- [Risk] 默认 runtime-cdn 打破旧的离线默认合同 -> Mitigation: proposal 标记 BREAKING，保留 `pre-rendered` 显式模式，并在文档中说明使用边界。
- [Risk] Mermaid SVG 文本边界检测在不同图类型上不完全准确 -> Mitigation: 先覆盖 flowchart、sequenceDiagram、classDiagram 的 stress fixtures；检测以“明显越界/空图/覆盖”为第一阶段门槛。
- [Risk] highlight.js 自动高亮可能误判语言 -> Mitigation: schema 要求 code section 尽量提供 `language`；验证器检查 `language-*` 和 token 输出，不把 auto-detect 作为主要路径。
- [Risk] DOMPurify 加载失败会导致 Markdown 不渲染 -> Mitigation: 不降级为裸 `innerHTML`；显示 degraded 并保留源码。
- [Risk] 视觉 validator 可能在本地 Chrome/Playwright 差异下不稳定 -> Mitigation: 检查结构性布局问题，不依赖截图像素；失败输出具体 selector 和 viewport。
- [Risk] schema 扩展过快导致 agent 难用 -> Mitigation: 新字段可选，生成器提供默认 group/priority 推断；文档给最小输入示例。
- [Risk] 外部库许可证或版本漂移 -> Mitigation: 在 reference 中记录库、版本、来源和用途；升级 runtime pins 必须同步测试 fixture。

## Migration Plan

1. 新增 stress fixture，不改变生成器默认行为；用测试先固定当前缺口。
2. 扩展 schema，加入 `runtime-cdn`、section grouping 和 section status/summary 字段；保留旧 `runtime` 输入作为兼容 alias。
3. 重写 runtime dependency injection 和 `rich-render-runtime`，实现 section-level Markdown/Mermaid/code 状态。
4. 重做 `report-ui.css` 的信息架构和视觉 token，替换平铺 sticky nav。
5. 升级 `validate-html-report.mjs`，增加 browser viewport、overlap、overflow、runtime state 和 token 检查。
6. 更新 `SKILL.md`、`html-report-patterns.md`、fixtures、showcase 和 tests。
7. 运行 focused test、OpenSpec validation、`bun run validate`。

Rollback:

- 保留 `pre-rendered` 路径作为回退。
- 如果 runtime-cdn 实现不稳定，可暂时把默认恢复为 `pre-rendered`，但保留 stress fixture 和 validator 改进。
- 新增 schema 字段均为可选，旧 fixtures 可通过 alias 或默认推断迁移。

## Open Questions

- 是否需要在 generated HTML 中内联一份最小 fallback highlight theme，避免 highlight.js CSS 加载失败时完全无层次？建议实现时默认内联最小 fallback。
- 是否需要允许用户选择 CDN provider，例如 jsDelivr vs cdnjs？本轮建议不做，先固定一个 provider 和 pinned 版本。
- 是否需要把 browser validation 截图保存到 `reports/` 或临时目录？本轮可作为 debug 输出，不作为必需 artifact。
- 是否需要支持 CSP meta？本轮由于直接引用 CDN script，严格 CSP 不是默认目标；后续如要发布到受限环境再单独设计。

## Addendum: Content-First Correction

用户对生成报告的再次审阅暴露了更上层的问题：我们把“能渲染 Mermaid、代码、高亮、证据卡、运行时状态”误当成报告质量本身，导致目录按组件堆叠，正文被 source/status/evidence 噪音稀释。修正后的默认路径必须先问“这份汇报最短需要讲什么”，再决定是否加入组件。

Design updates:

- Evidence, verification, next actions, code, Mermaid, tabs, filters, and dependency panels are optional modules. They render only when input contains meaningful content or the user explicitly asks to show them.
- Runtime dependency data remains machine-readable for validation, but is hidden by default because most readers do not need to see implementation plumbing.
- Navigation groups should reflect the report argument, using labels such as 摘要、变更、影响、风险、验证、下一步、细节. Component groups such as 图表、代码、证据 appear only when they genuinely help the reader.
- The skill guidance now assumes an impatient reader: one sentence beats two when information is unchanged, and rich components are justified only when they reduce reading effort.
