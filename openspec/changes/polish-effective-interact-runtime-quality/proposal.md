## Why

`effective-interact` 宸茬粡鍏峰鐢熸垚鍣ㄣ€佹ā鏉裤€乺untime 缁勪欢鍜岄獙璇佸櫒闆忓舰锛屼絾褰撳墠浜у嚭鐨勬姤鍛婁粛鐒跺湪鐪熷疄闃呰璐ㄩ噺涓婁笉杈炬爣锛歁ermaid 鍙兘鍙槸 fallback SVG锛屼唬鐮侀珮浜?token 澶皯锛岀洰褰曞爢鍙狅紝琛岃窛鍜屽姣斿害澶辫　锛岀獎灞忓竷灞€鍜岀粍浠堕噸鍙犱篃娌℃湁琚獙璇佸櫒绯荤粺鎹曡幏銆?
鏈鍙樻洿鎶婄洰鏍囦粠鈥滃敖閲忚嚜鍖呭惈鐨勯潤鎬?HTML鈥濊皟鏁翠负鈥滃湪 local browser 鍐呭彲鐩存帴鏌ョ湅銆佸瘜鍐呭鐪熷疄娓叉煋銆佽瑙夌ǔ瀹氥€佸け璐ュ彲瀹¤鐨勫崟鏂囦欢 HTML 鎶ュ憡鈥濄€傜敤鎴峰凡鏄庣‘鍏佽鍦ㄩ潤鎬?HTML 椤甸潰鍐呭紩鐢ㄥ閮ㄥ簱娓叉煋锛屽洜姝ゅ簲鎶?CDN runtime 浣滀负鍙楁帶鑳藉姏锛岃€屼笉鏄緥澶栬ˉ涓併€?
## What Changes

- **BREAKING**: 榛樿鎶ュ憡璐ㄩ噺绛栫暐浠庘€滈粯璁や笉渚濊禆 CDN 灞曠ず涓昏闃呰鍐呭鈥濊皟鏁翠负鈥滈粯璁ゅ彲浣跨敤 pinned CDN runtime 娓叉煋 Mermaid銆丮arkdown 鍜屼唬鐮侀珮浜紝骞朵互 local browser 鍐呭彲瑙嗛獙璇佷负楠屾敹闂ㄦ鈥濄€傚畬鍏ㄧ绾?棰勬覆鏌撹兘鍔涗繚鐣欎负鏄惧紡妯″紡锛岃€屼笉鏄粯璁ゆ垚鍔熸爣鍑嗐€?- 寮曞叆 `runtime-cdn` 娓叉煋妯″紡锛屽厑璁告姤鍛婂紩鐢?pinned `Mermaid`, `highlight.js`, `Marked`, `DOMPurify` 绛夋祻瑙堝櫒搴撱€?- 閲嶆柊瀹氫箟 runtime 澶辫触杈圭晫锛氬簱鍔犺浇澶辫触銆佹覆鏌撳け璐ユ垨瀹夊叏娓呮礂澶辫触鏃讹紝鐩稿叧 section 蹇呴』鏄剧ず degraded/failed 鐘舵€侊紝骞朵繚鐣欏彲瀹¤婧愮爜 fallback銆?- 閲嶆瀯鎶ュ憡淇℃伅鏋舵瀯锛氱粨璁轰紭鍏堛€佸垎缁勭洰褰曘€佷富浣撳唴瀹广€佽瘉鎹€侀獙璇併€佷笅涓€姝ワ紝涓嶅啀鎶婃墍鏈夌洰褰曢」骞抽摵鍫嗗彔鍦ㄤ竴涓?sticky bar銆?- 寤虹珛瑙嗚璐ㄩ噺鍚堝悓锛氬瓧浣撱€佽璺濄€佸瓧閲嶃€佷唬鐮佽壊褰┿€佺姸鎬佽壊銆佸姣斿害銆丮ermaid 瀹瑰櫒銆佹í鍚戞孩鍑恒€佺粍浠堕噸鍙犮€佺Щ鍔ㄧ甯冨眬閮借繘鍏ュ彲楠岃瘉鑼冨洿銆?- 寮哄寲瀵屽唴瀹规覆鏌撳悎鍚岋細
  - Markdown 浣跨敤 Marked 瑙ｆ瀽鍚庡繀椤荤粡 DOMPurify 鎴栫瓑浠?sanitizer 娓呮礂銆?  - Mermaid 浣跨敤 `startOnLoad: false`銆乻trict security 閰嶇疆鍜屽彈鎺ф覆鏌撳鍣ㄣ€?  - 浠ｇ爜楂樹寒浣跨敤 highlight.js 鎴栫瓑浠烽珮浜櫒锛岃€屼笉鏄户缁緷璧栦綆瑕嗙洊鐜囨墜鍐欐鍒欍€?- 澧炲姞 stress fixtures锛岃鐩栭暱涓枃/鑻辨枃鏍囬銆侀暱鐩綍銆佸鏉?Mermaid銆佸浠ｇ爜銆侀暱璺緞銆佸祵濂?JSON銆乨iff銆佺Щ鍔ㄧ鍜屽缁勪欢杩炵画甯冨眬銆?- 鍗囩骇楠岃瘉鍣紝浠庡瓧绗︿覆瀛樺湪妫€鏌ユ墿灞曞埌娴忚鍣ㄧ骇瑙嗚妫€鏌ワ細runtime 瀹屾垚鐘舵€併€佽鍙ｆ孩鍑恒€佸叧閿粍浠堕噸鍙犮€丮ermaid SVG 闈炵┖鍜屾枃鏈竟鐣屻€佷唬鐮?token銆侀珮瀵规瘮搴﹀熀纭€闂ㄦ銆佺洰褰曞彲鐢ㄦ€с€?- 鏇存柊 `effective-interact` skill 鏂囨。銆佹ā寮忓弬鑰冦€乻chema銆乫ixtures 鍜屾祴璇曪紝浣?agent 鍚庣画鐢熸垚鎶ュ憡鏃堕粯璁よ蛋璐ㄩ噺鍙楁帶鐨?runtime-cdn 璺嚎銆?
## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `effective-interact-generation`: 淇敼鎶ュ憡鐢熸垚銆乺untime 娓叉煋銆佸瘜鍐呭瀹夊叏銆佽瑙夊竷灞€鍜岄獙璇佽姹傦紱鍏佽 pinned CDN runtime 浣滀负榛樿 local browser 鍙鎶ュ憡璺緞锛屽苟灏嗘祻瑙堝櫒绾ц瑙夐獙璇佹彁鍗囦负瀹屾垚闂ㄦ銆?
## Impact

- Affected skill assets:
  - `skills/effective-interact/SKILL.md`
  - `skills/effective-interact/references/interaction-patterns.md`
  - `skills/effective-interact/references/interaction-input-schema.json`
  - `skills/effective-interact/assets/components/interaction-ui.css`
  - `skills/effective-interact/assets/components/interaction-ui.js`
  - `skills/effective-interact/assets/components/rich-render-runtime.css`
  - `skills/effective-interact/assets/components/rich-render-runtime.js`
  - `skills/effective-interact/assets/fixtures/*.json`
  - `skills/effective-interact/scripts/create-interaction.mjs`
  - `skills/effective-interact/scripts/validate-interaction.mjs`
- Affected tests:
  - `tests/effectiveInteractSkill.test.ts`
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
  - `validate-interaction.mjs --require-browser` becomes the expected quality gate for runtime-cdn reports.
  - Browser validation may use browser automation-compatible automation or Playwright/Chrome where available.
  - `bun run validate` remains the repo-level final gate after implementation.
