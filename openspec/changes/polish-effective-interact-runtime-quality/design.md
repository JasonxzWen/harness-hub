## Context

`effective-interact` 鐨勪笂涓€杞兘鍔涘凡缁忔妸鈥滄墜鍐欐姤鍛娾€濇帹杩涘埌鈥淛SON 杈撳叆 + 鐢熸垚鍣?+ 楠岃瘉鍣?+ 妯℃澘璧勪骇鈥濈殑闃舵锛屼絾褰撳墠鍚堝悓浠嶇劧鍋忓悜闈欐€佽嚜鍖呭惈杈撳嚭锛氶粯璁ゆā寮忚姹?Markdown銆丮ermaid 鍜屼唬鐮佸湪浜や粯鍓嶉娓叉煋锛屽苟涓斾笉渚濊禆 CDN 灞曠ず涓昏闃呰鍐呭銆傝繖涓悎鍚岃兘淇濊瘉绂荤嚎鍙锛屼絾瀹冧篃鎶婅川閲忓帇鍔涘帇鍒颁簡鏈湴鎵嬪啓娓叉煋鍣ㄤ笂銆?
褰撳墠璐ㄩ噺闂闆嗕腑鍦ㄤ笁涓眰闈細

- 瀵屽唴瀹规覆鏌撲笉澶熺湡瀹烇細浠ｇ爜楂樹寒鐢卞皯閲忔鍒欏疄鐜帮紝Mermaid 鍦ㄦ湭鍚敤娴忚鍣ㄦ覆鏌撴椂浼氶€€鍖栦负 deterministic fallback SVG锛孧arkdown 娓叉煋鑳藉姏鏈夐檺銆?- 鎶ュ憡淇℃伅鏋舵瀯涓嶅绯荤粺锛氱洰褰曟槸骞抽摵 sticky nav锛岄暱鎶ュ憡浼氬爢鍙狅紱鍐呭娌℃湁鏄庣‘鐨?Overview/Diagrams/Code/Evidence/Verification/Actions 鍒嗗尯锛涗富浣撻槄璇绘祦鍜岃瘉鎹尯娣锋潅銆?- 楠岃瘉鍣ㄥお娴咃細褰撳墠妫€鏌ヤ富瑕佺‘璁?HTML 涓瓨鍦ㄦ爣璁般€乫allback銆佹帶浠跺拰涓€涓獎灞忓熀鏈姞杞界粨鏋滐紝涓嶈兘鎹曡幏 Mermaid 瀛椾綋瓒呮銆佺粍浠朵簰鐩歌鐩栥€佷綆瀵规瘮搴︺€佷唬鐮?token 涓嶈冻銆佺洰褰曟尋鍘嬨€佹í鍚戞孩鍑虹瓑鐪熷疄瑙嗚閫€鍖栥€?
鐢ㄦ埛宸叉槑纭厑璁搁潤鎬?HTML 椤甸潰寮曠敤澶栭儴搴擄紝鍙姹傝兘鍦?local browser 鍐呮煡鐪嬨€傚洜姝ゆ湰璁捐灏嗛粯璁よ川閲忚矾寰勬敼涓?`runtime-cdn`锛氬崟鏂囦欢 HTML 浠嶇劧鐢辩敓鎴愬櫒浜у嚭锛屼絾椤甸潰鍏佽寮曠敤 pinned browser libraries 鏉ュ畬鎴?Mermaid銆丮arkdown 鍜屼唬鐮侀珮浜紱楠岃瘉鍣ㄥ繀椤诲湪鐪熷疄娴忚鍣ㄤ腑绛夊緟 runtime 瀹屾垚锛屽苟鎶婅瑙夎川閲忎綔涓哄畬鎴愰棬妲涖€?
## Goals / Non-Goals

**Goals:**

- 璁╅粯璁ょ敓鎴愭姤鍛婂湪 local browser 鍐呮墦寮€鏃剁湡瀹炴覆鏌?Mermaid銆丮arkdown 鍜屼唬鐮侀珮浜紝鑰屼笉鏄緷璧栧急 fallback 鎴栧皯閲忔鍒欍€?- 灏?`runtime-cdn` 瀹氫箟涓轰竴绛?render mode锛屽苟淇濈暀 `pre-rendered` 浣滀负鏄惧紡绂荤嚎/鍙楅檺鐜妯″紡銆?- 寤虹珛鎶ュ憡绾т俊鎭灦鏋勶細缁撹浼樺厛銆佸垎缁勭洰褰曘€佷富浣撻槄璇绘祦銆佽瘉鎹€侀獙璇併€佷笅涓€姝ャ€?- 寤虹珛瑙嗚璐ㄩ噺鍚堝悓锛岃鐩栧瓧閲嶃€佽璺濄€佸姣斿害銆佷唬鐮?token銆丮ermaid 瀹瑰櫒銆佺洰褰曞竷灞€銆佸搷搴斿紡琛屼负鍜岀粍浠堕噸鍙犮€?- 寤虹珛 stress fixture锛屽厛澶嶇幇鈥滈毦鐪?閿欎綅/瓒呮鈥濈殑鎯呭喌锛屽啀璁╁疄鐜板拰楠岃瘉鍣ㄥ洿缁?fixture 鏀舵暃銆?- 灏嗘祻瑙堝櫒绾ч獙璇佸崌绾т负鎶ュ憡瀹屾垚闂ㄦ锛屽挨鍏舵槸 `validate-interaction.mjs --require-browser` 瀵?runtime-cdn 鎶ュ憡蹇呴』鑳芥鏌ユ覆鏌撶姸鎬佸拰甯冨眬璐ㄩ噺銆?- 缁х画淇濇寔 skill progressive loading锛歚SKILL.md` 鍙啓璺敱鍜屾牳蹇冨悎鍚岋紝缁嗚妭鐣欏湪 `references/`銆乣assets/`銆乣scripts/`銆?
**Non-Goals:**

- 涓嶅仛閫氱敤浜у搧 UI builder锛涚敓浜х綉椤点€佸簲鐢ㄩ〉闈㈠拰澶嶆潅浜や簰浠嶈矾鐢卞埌 `frontend-design` 鎴?`web-artifacts-builder`銆?- 涓嶅紩鍏?React銆乂ite銆乀ailwind銆乻hadcn 鎴栭暱鏈熻繍琛岀殑鍓嶇鏋勫缓閾俱€?- 涓嶈姹傜敓鎴愭姤鍛婂畬鍏ㄧ绾垮彲鐢紱绂荤嚎鏄?`pre-rendered` 鏄惧紡妯″紡锛屼笉鍐嶆槸榛樿鎴愬姛鏍囧噯銆?- 涓嶆妸 `create-interaction.mjs` 鎴?`validate-interaction.mjs` 鏆撮湶涓虹嫭绔?installable capability銆?- 涓嶆敼鍙?`effective-interact` 鐨勯珮灞傝Е鍙戣竟鐣岋紝闄ら潪瀹炵幇涓彂鐜扮幇鏈夋弿杩颁細璇 agent 鐢熸垚閿欒妯″紡銆?- 涓嶅湪鏈彉鏇翠腑瀹炵幇鎴浘 diff 鍩虹嚎绠＄悊锛涙湰杞彧瑕佹眰娴忚鍣?DOM/layout 妫€鏌ュ拰鍙€夋埅鍥句骇鐗┿€?
## Decisions

### Decision 1: 榛樿妯″紡鍒囨崲涓?`runtime-cdn`

鐢熸垚鍣ㄦ柊澧炲苟榛樿浣跨敤 `renderMode: "runtime-cdn"`銆傝妯″紡杈撳嚭鍗曚釜 HTML 鏂囦欢锛屼絾鍏佽鍦ㄩ〉闈㈠唴寮曠敤 pinned CDN 搴擄細

- `Mermaid`锛氭覆鏌?Mermaid 婧愮爜涓?SVG銆?- `Marked`锛氳В鏋?Markdown銆?- `DOMPurify`锛氭竻娲?Markdown 杈撳嚭銆?- `highlight.js`锛氭覆鏌撲唬鐮?token銆?
`pre-rendered` 淇濈暀锛屼絾鎴愪负鏄惧紡閫夋嫨锛岀敤浜庣绾裤€丆DN 涓嶅彲鐢ㄣ€佹垨鐢ㄦ埛鏄庣‘瑕佹眰鑷寘鍚富鍐呭鐨勬姤鍛娿€傛棫鐨?`runtime` 鍛藉悕搴旇縼绉讳负 `runtime-cdn` 鎴栦綔涓哄吋瀹?alias 鐭湡鎺ュ彈锛屾渶缁堟枃妗ｄ腑鍙帹鑽?`runtime-cdn`銆?
Rationale: 褰撳墠寮遍珮浜拰 fallback Mermaid 璇佹槑鈥滄棤澶栭儴搴撻粯璁ら珮璐ㄩ噺鈥濅笉鐜板疄銆傛棦鐒剁敤鎴峰厑璁?local browser 鍐呮煡鐪嬩紭鍏堬紝灏卞簲璇ヨ娴忚鍣ㄤ娇鐢ㄦ垚鐔熷簱瀹屾垚瀹冩搮闀跨殑娓叉煋宸ヤ綔锛屽悓鏃剁敤 fallback 鍜岄獙璇佸櫒绾︽潫澶辫触杈圭晫銆?
Alternative considered: 淇濇寔 `pre-rendered` 榛樿锛屽苟浠呭己鍖栨湰鍦伴珮浜?娴忚鍣ㄩ娓叉煋銆傝鏂规鑳戒繚鐣欑绾夸紭鍔匡紝浣嗕細缁х画寮曞叆澶ч噺鏈湴娓叉煋澶嶆潅搴︼紝灏ゅ叾鏄?Mermaid 澶氬浘绫诲瀷銆佷唬鐮佽瑷€瑕嗙洊鍜?Markdown 鎵╁睍璇箟銆?
### Decision 2: Runtime 渚濊禆蹇呴』 pinned 涓斿湪椤甸潰涓樉寮忓０鏄?
鐢熸垚鍣ㄥ繀椤诲湪 HTML metadata銆乺untime dependency panel 鎴栫瓑浠风粨鏋勪腑澹版槑锛?
- 搴撳悕銆?- 鐗堟湰銆?- 鍔犺浇 URL銆?- 鐢ㄩ€斻€?- 褰撳墠鍔犺浇/娓叉煋鐘舵€併€?
姣忎釜 runtime section 蹇呴』鏈夌嫭绔嬬姸鎬侊細`pending`銆乣ready`銆乣degraded`銆乣failed`銆傞〉闈㈤《灞備篃蹇呴』鏈?aggregate 鐘舵€侊紝渚夸簬楠岃瘉鍣ㄥ拰鐢ㄦ埛蹇€熷垽鏂瘜鍐呭鏄惁鐪熷疄娓叉煋銆?
Rationale: 鍏佽澶栭儴搴撲笉绛変簬鍏佽涓嶅彲杩借釜鐨勫閮ㄨ涓恒€俻inned 鐗堟湰鍜岀姸鎬侀潰鏉胯鎶ュ憡鍙璁★紝涔熻楠岃瘉鍣ㄨ兘鏄庣‘鍖哄垎鈥滃凡娓叉煋鈥濆拰鈥滈€€鍖栧彲璇烩€濄€?
Alternative considered: 鍙湪婧愮爜涓紩鐢?CDN锛屼笉鍦?UI 涓樉绀轰緷璧栥€傝鏂规椤甸潰鏇村共鍑€锛屼絾褰?local browser 鎴栫綉缁滅幆澧冩嫤鎴剼鏈椂锛岀敤鎴锋棤娉曠悊瑙ｄ负浠€涔堝浘琛?浠ｇ爜閫€鍖栥€?
### Decision 3: Markdown 鐢?Marked + DOMPurify锛屼笉鍏佽瑁告彃鍏?
Markdown 娓叉煋娴佺▼锛?
1. 浠?inert source container 璇诲彇 Markdown 鏂囨湰銆?2. 浣跨敤 Marked 瑙ｆ瀽涓?HTML銆?3. 浣跨敤 DOMPurify 鎴栫瓑浠?sanitizer 娓呮礂杈撳嚭銆?4. 鎻掑叆 `.rendered-markdown` 瀹瑰櫒銆?5. 娓叉煋瀹屾垚鍚庢洿鏂?section 鐘舵€併€?
濡傛灉 DOMPurify 涓嶅彲鐢紝闄ら潪璇?section 琚敓鎴愬櫒鏍囪涓?trusted generated content锛屽惁鍒?Markdown 涓嶅緱娓叉煋涓?HTML锛涘繀椤讳繚鐣欐簮鐮佸苟鏄剧ず degraded/failed銆?
Rationale: Marked 鏂囨。鏄庣‘涓嶉粯璁?sanitize銆傛姤鍛婂唴瀹圭粡甯稿寘鍚爺绌舵潗鏂欍€佹棩蹇椼€佷唬鐮佺墖娈靛拰澶栭儴寮曠敤锛屼笉鑳芥妸 Markdown 褰撳彲淇?HTML銆?
Alternative considered: 鐢熸垚鍣ㄤ晶棰勬竻娲?Markdown 鍚庡啀 runtime 娓叉煋銆傝鏂规浠嶆棤娉曡鐩?runtime parse 杈撳嚭涓殑 HTML 缁撴瀯鍙樺寲锛屼笖浼氳瀹夊叏杈圭晫鍒嗘暎銆?
### Decision 4: Mermaid 姣忓浘鐙珛娓叉煋銆佺嫭绔嬪け璐ャ€佺嫭绔?fallback

Mermaid section 涓嶅啀鍏变韩涓€涓叏灞€ status銆傛瘡涓浘搴旀嫢鏈夛細

- 鍞竴 diagram id銆?- 婧愮爜瀹瑰櫒銆?- 娓叉煋鐩爣瀹瑰櫒銆?- 鐘舵€?chip銆?- 鎶樺彔婧愮爜 fallback銆?- 娓叉煋閿欒鏂囨湰銆?
Mermaid 鍒濆鍖栦娇鐢?`startOnLoad: false`锛屽苟浣跨敤 strict security 閰嶇疆銆傛覆鏌撳彲閫?`mermaid.run({ nodes })` 鎴?`mermaid.render(id, source)`锛屼絾瀹炵幇蹇呴』淇濊瘉涓€涓浘澶辫触涓嶄細闃诲鍏朵粬鍥俱€?
娓叉煋鍚庣殑 SVG wrapper 蹇呴』闄愬埗甯冨眬锛?
- 瀹瑰櫒 `overflow: auto`銆?- SVG `max-width: 100%`锛屽繀瑕佹椂鍏佽妯悜婊氬姩銆?- 璁剧疆鍚堢悊 `max-height`锛岄伩鍏嶉暱鍥惧悶娌￠〉闈€?- Mermaid 鏂囨湰鍜?foreignObject 涓嶅緱瑕嗙洊鐩搁偦 section銆?
Rationale: 褰撳墠鍏ㄥ眬 Mermaid 鐘舵€佹棤娉曡〃杈锯€滅 2 涓浘澶辫触浣嗙 1 涓浘鎴愬姛鈥濄€傚鏉傛姤鍛婁腑灞€閮ㄥけ璐ュ簲璇ュ彲瀹¤锛岃€屼笉鏄嫋鍨暣涓〉闈€?
Alternative considered: 缁х画鐢ㄥ叏灞€ `mermaid.run` 鍜屼竴涓姸鎬?chip銆傝鏂规浠ｇ爜鏇寸煭锛屼絾涓嶉€傚悎澶氬浘鎶ュ憡鍜岃瑙夐獙璇併€?
### Decision 5: 浠ｇ爜楂樹寒浜ょ粰 highlight.js锛岃鍙峰拰 hot line 鐢辨湰鍦?wrapper 璐熻矗

鐢熸垚鍣ㄨ緭鍑烘爣鍑嗙粨鏋勶細

```html
<pre data-line-numbered data-start-line="42">
  <code class="language-typescript">...</code>
</pre>
```

Runtime 浣跨敤 highlight.js 澶勭悊 token锛涙湰鍦拌剼鏈湪楂樹寒鍓嶅悗璐熻矗锛?
- 淇濈暀琛屽彿銆?- 搴旂敤 `highlightLines`銆?- 淇濈暀 copy button銆?- 闃叉瀹戒唬鐮佹拺鐮撮〉闈€?- 鏍囪 `data-code-highlight-state`銆?
涓嶅啀鎵╁睍鎵嬪啓 `highlightLine()` 姝ｅ垯浣滀负榛樿璐ㄩ噺璺緞銆傝鍑芥暟鍙互淇濈暀缁?`pre-rendered` 鎴?fallback-only 妯″紡锛屼絾 runtime-cdn 鎴愬姛鏍囧噯蹇呴』鍩轰簬鐪熷疄 `.hljs-*` token銆?
Rationale: 浠ｇ爜楂樹寒璐ㄩ噺鏄敤鎴锋槑纭寚鍑虹殑闂銆傜户缁墜鍐?token 瑙勫垯浼氳繀閫熷彉鎴愪笉瀹屾暣璇█瑙ｆ瀽鍣ㄣ€?
Alternative considered: 浣跨敤 Shiki銆係hiki 鐨勮壊褰╄川閲忔洿寮猴紝浣嗕綋绉拰鍔犺浇澶嶆潅搴︽洿楂樸€傛湰杞紭鍏堜娇鐢?highlight.js锛屽洜涓哄綋鍓?repo 宸茬粡鏈夌浉鍏?runtime pins 鍜屾祴璇曞熀纭€銆?
### Decision 6: 鐩綍浠庡钩閾?sticky bar 鏀逛负鍒嗙粍瀵艰埅

鎶ュ憡蹇呴』浜х敓缁撴瀯鍖?section index銆傚缓璁?schema 鏀寔锛?
- `section.group`: `overview`銆乣diagrams`銆乣code`銆乣evidence`銆乣verification`銆乣actions` 鎴栬嚜瀹氫箟鐭爣绛俱€?- `section.priority`: 鐢ㄤ簬缁勫唴鎺掑簭銆?- `section.summary`: 鐢ㄤ簬鐩綍鎴?section header 鎽樿銆?- `section.status`: `ready`銆乣warn`銆乣failed`銆乣info` 绛夈€?
妗岄潰甯冨眬锛?
- 宸︿晶 sticky rail 鎴栦富鍐呭鍓嶇殑鍒嗙粍鐩綍銆?- 褰撳墠 section 鍙€氳繃 IntersectionObserver 鎴?anchor focus 鏍囪銆?- 鐩綍涓嶅緱瑕嗙洊姝ｆ枃銆?
绉诲姩甯冨眬锛?
- 鎶樺彔鐩綍鎴栧彲妯悜婊氬姩鐨勭揣鍑戝垎缁勬帶浠躲€?- 闀挎爣棰樺繀椤绘崲琛屾垨鎴柇浣嗕繚鐣?tooltip/title銆?
Rationale: 鐩綍鍫嗗彔鐩存帴褰卞搷鎶ュ憡绗竴灞忚川閲忋€傛姤鍛婅秺绯荤粺锛岃秺涓嶈兘璁╁鑸垚涓烘渶澶ц瑙夊櫔闊炽€?
Alternative considered: 浠呭帇缂╁綋鍓?nav 鐨勫瓧浣撳拰闂磋窛銆傝鏂规鏃犳硶瑙ｅ喅 20+ sections 鏃剁殑缁撴瀯闂銆?
### Decision 7: 瑙嗚 token 浣滀负涓€绛夎川閲忓悎鍚?
`interaction-ui.css` 搴斿畾涔夋槑纭?token锛?
- Typography: body銆乭eading銆乵etadata銆乧ode 鐨勫瓧鍙?琛岄珮/瀛楅噸銆?- Color: ink銆乵uted銆乴ine銆乸anel銆乤ccent銆乻uccess銆亀arning銆乨anger銆乮nfo銆乧ode tokens銆?- Spacing: section gap銆乧ard padding銆乼oolbar gap銆乧ode padding銆?- Radius: 淇濇寔宸ョ▼鎶ュ憡鍏嬪埗锛屽崱鐗?8px 鎴栨洿灏忋€?- Layout: `min-width: 0`銆乷verflow strategy銆乺esponsive breakpoints銆?
绂佹渚濊禆 hover transform 鏀瑰彉甯冨眬銆俬over/focus 鍙互鏀瑰彉 border銆乷utline銆乥ackground銆乻hadow锛屼絾涓嶅緱瀵艰嚧閭昏繎缁勪欢閲嶅彔鎴栧彲瑙佽烦鍔ㄣ€?
Rationale: 鐢ㄦ埛鎸囧嚭鈥滆闂磋窛杩囧ぇ銆佸瓧浣撳お缁嗐€佸姣斿害浣庛€佺粍浠惰鐩栤€濓紝杩欎簺涓嶆槸鏌愪竴澶勬牱寮?bug锛岃€屾槸缂哄皯瑙嗚 token 鍜屽竷灞€绾︽潫銆?
Alternative considered: 閽堝褰撳墠 showcase 鍗曠嫭淇?CSS銆傝鏂规浼氳涓嬩竴涓敓鎴愭姤鍛婄户缁€€鍖栥€?
### Decision 8: 楠岃瘉鍣ㄥ崌绾т负 static + browser 鍙屽眰

Static checks:

- HTML root銆乺ender mode銆乵etadata銆?- runtime dependency pins銆?- source fallback銆?- unsafe protocol/event handler銆?- schema-driven section markers銆?- code/diagram/markdown section 鐨?fallback 鍜岀姸鎬佺粨鏋勩€?
Browser checks:

- 鎵撳紑 file URL銆?- 绛夊緟 runtime libraries ready 鎴?timeout 鍚庤褰?degraded銆?- 鍦?390銆?68銆?440 瑙嗗彛妫€鏌ャ€?- 妫€鏌?body 妯悜婧㈠嚭銆?- 妫€鏌ュ叧閿尯鍩?bounding boxes 鏄惁閲嶅彔銆?- 妫€鏌ョ洰褰曚笌姝ｆ枃涓嶈鐩栥€?- 妫€鏌?Mermaid SVG 瀛樺湪銆侀潪绌猴紝骞朵笖鏂囨湰 bbox 涓嶆槑鏄捐秺鐣屻€?- 妫€鏌ヤ唬鐮佸嚭鐜?`.hljs-*` token銆?- 妫€鏌?hot line 鍜岃鍙锋病鏈夌牬鍧忎唬鐮佸竷灞€銆?- 妫€鏌ヨ嚦灏戜竴涓?filter銆乼ab銆乧opy control 鍙搷浣溿€?- 杈撳嚭 JSON锛屽寘鍚瘡涓鍙ｇ殑缁撴灉鍜屽け璐ュ師鍥犮€?
`--require-browser` 瀵?runtime-cdn 鎶ュ憡搴旀垚涓哄疄鐜板畬鎴愰棬妲涳紱濡傛灉娴忚鍣ㄤ笉鍙敤锛岃鍛戒护蹇呴』澶辫触銆傞潪 require 妯″紡浠嶅彲鏄惧紡 degraded銆?
Rationale: 鐪熷疄闂鍙戠敓鍦ㄦ祻瑙堝櫒娓叉煋鍚庯紝瀛楃涓叉鏌ュ彧鑳借瘉鏄庘€滄爣璁板瓨鍦ㄢ€濓紝涓嶈兘璇佹槑鈥滄姤鍛婂ソ鐪嬨€佸彲璇汇€佹病閲嶅彔鈥濄€?
Alternative considered: 寮曞叆鎴浘鍍忕礌 diff銆傝鏂规鏇村己锛屼絾闇€瑕佸熀绾跨鐞嗗拰鐜绋冲畾鎬э紝鏈疆鍏堜笉鍋氥€?
## Risks / Trade-offs

- [Risk] CDN 鍦ㄦ煇浜涚幆澧冨姞杞藉け璐?-> Mitigation: pinned dependency panel銆乻ection-level degraded 鐘舵€併€佹簮鐮?fallback銆侀潪 runtime 鍏抽敭缁撹鍜岃瘉鎹粛鍙銆?- [Risk] 榛樿 runtime-cdn 鎵撶牬鏃х殑绂荤嚎榛樿鍚堝悓 -> Mitigation: proposal 鏍囪 BREAKING锛屼繚鐣?`pre-rendered` 鏄惧紡妯″紡锛屽苟鍦ㄦ枃妗ｄ腑璇存槑浣跨敤杈圭晫銆?- [Risk] Mermaid SVG 鏂囨湰杈圭晫妫€娴嬪湪涓嶅悓鍥剧被鍨嬩笂涓嶅畬鍏ㄥ噯纭?-> Mitigation: 鍏堣鐩?flowchart銆乻equenceDiagram銆乧lassDiagram 鐨?stress fixtures锛涙娴嬩互鈥滄槑鏄捐秺鐣?绌哄浘/瑕嗙洊鈥濅负绗竴闃舵闂ㄦ銆?- [Risk] highlight.js 鑷姩楂樹寒鍙兘璇垽璇█ -> Mitigation: schema 瑕佹眰 code section 灏介噺鎻愪緵 `language`锛涢獙璇佸櫒妫€鏌?`language-*` 鍜?token 杈撳嚭锛屼笉鎶?auto-detect 浣滀负涓昏璺緞銆?- [Risk] DOMPurify 鍔犺浇澶辫触浼氬鑷?Markdown 涓嶆覆鏌?-> Mitigation: 涓嶉檷绾т负瑁?`innerHTML`锛涙樉绀?degraded 骞朵繚鐣欐簮鐮併€?- [Risk] 瑙嗚 validator 鍙兘鍦ㄦ湰鍦?Chrome/Playwright 宸紓涓嬩笉绋冲畾 -> Mitigation: 妫€鏌ョ粨鏋勬€у竷灞€闂锛屼笉渚濊禆鎴浘鍍忕礌锛涘け璐ヨ緭鍑哄叿浣?selector 鍜?viewport銆?- [Risk] schema 鎵╁睍杩囧揩瀵艰嚧 agent 闅剧敤 -> Mitigation: 鏂板瓧娈靛彲閫夛紝鐢熸垚鍣ㄦ彁渚涢粯璁?group/priority 鎺ㄦ柇锛涙枃妗ｇ粰鏈€灏忚緭鍏ョず渚嬨€?- [Risk] 澶栭儴搴撹鍙瘉鎴栫増鏈紓绉?-> Mitigation: 鍦?reference 涓褰曞簱銆佺増鏈€佹潵婧愬拰鐢ㄩ€旓紱鍗囩骇 runtime pins 蹇呴』鍚屾娴嬭瘯 fixture銆?
## Migration Plan

1. 鏂板 stress fixture锛屼笉鏀瑰彉鐢熸垚鍣ㄩ粯璁よ涓猴紱鐢ㄦ祴璇曞厛鍥哄畾褰撳墠缂哄彛銆?2. 鎵╁睍 schema锛屽姞鍏?`runtime-cdn`銆乻ection grouping 鍜?section status/summary 瀛楁锛涗繚鐣欐棫 `runtime` 杈撳叆浣滀负鍏煎 alias銆?3. 閲嶅啓 runtime dependency injection 鍜?`rich-render-runtime`锛屽疄鐜?section-level Markdown/Mermaid/code 鐘舵€併€?4. 閲嶅仛 `interaction-ui.css` 鐨勪俊鎭灦鏋勫拰瑙嗚 token锛屾浛鎹㈠钩閾?sticky nav銆?5. 鍗囩骇 `validate-interaction.mjs`锛屽鍔?browser viewport銆乷verlap銆乷verflow銆乺untime state 鍜?token 妫€鏌ャ€?6. 鏇存柊 `SKILL.md`銆乣interaction-patterns.md`銆乫ixtures銆乻howcase 鍜?tests銆?7. 杩愯 focused test銆丱penSpec validation銆乣bun run validate`銆?
Rollback:

- 淇濈暀 `pre-rendered` 璺緞浣滀负鍥為€€銆?- 濡傛灉 runtime-cdn 瀹炵幇涓嶇ǔ瀹氾紝鍙殏鏃舵妸榛樿鎭㈠涓?`pre-rendered`锛屼絾淇濈暀 stress fixture 鍜?validator 鏀硅繘銆?- 鏂板 schema 瀛楁鍧囦负鍙€夛紝鏃?fixtures 鍙€氳繃 alias 鎴栭粯璁ゆ帹鏂縼绉汇€?
## Open Questions

- 鏄惁闇€瑕佸湪 generated HTML 涓唴鑱斾竴浠芥渶灏?fallback highlight theme锛岄伩鍏?highlight.js CSS 鍔犺浇澶辫触鏃跺畬鍏ㄦ棤灞傛锛熷缓璁疄鐜版椂榛樿鍐呰仈鏈€灏?fallback銆?- 鏄惁闇€瑕佸厑璁哥敤鎴烽€夋嫨 CDN provider锛屼緥濡?jsDelivr vs cdnjs锛熸湰杞缓璁笉鍋氾紝鍏堝浐瀹氫竴涓?provider 鍜?pinned 鐗堟湰銆?- 鏄惁闇€瑕佹妸 browser validation 鎴浘淇濆瓨鍒?`reports/` 鎴栦复鏃剁洰褰曪紵鏈疆鍙綔涓?debug 杈撳嚭锛屼笉浣滀负蹇呴渶 artifact銆?- 鏄惁闇€瑕佹敮鎸?CSP meta锛熸湰杞敱浜庣洿鎺ュ紩鐢?CDN script锛屼弗鏍?CSP 涓嶆槸榛樿鐩爣锛涘悗缁瑕佸彂甯冨埌鍙楅檺鐜鍐嶅崟鐙璁°€?
## Addendum: Content-First Correction

鐢ㄦ埛瀵圭敓鎴愭姤鍛婄殑鍐嶆瀹￠槄鏆撮湶浜嗘洿涓婂眰鐨勯棶棰橈細鎴戜滑鎶娾€滆兘娓叉煋 Mermaid銆佷唬鐮併€侀珮浜€佽瘉鎹崱銆佽繍琛屾椂鐘舵€佲€濊褰撴垚鎶ュ憡璐ㄩ噺鏈韩锛屽鑷寸洰褰曟寜缁勪欢鍫嗗彔锛屾鏂囪 source/status/evidence 鍣煶绋€閲娿€備慨姝ｅ悗鐨勯粯璁よ矾寰勫繀椤诲厛闂€滆繖浠芥眹鎶ユ渶鐭渶瑕佽浠€涔堚€濓紝鍐嶅喅瀹氭槸鍚﹀姞鍏ョ粍浠躲€?
Design updates:

- Evidence, verification, next actions, code, Mermaid, tabs, filters, and dependency panels are optional modules. They render only when input contains meaningful content or the user explicitly asks to show them.
- Runtime dependency data remains machine-readable for validation, but is hidden by default because most readers do not need to see implementation plumbing.
- Navigation groups should reflect the report argument, using labels such as 鎽樿銆佸彉鏇淬€佸奖鍝嶃€侀闄┿€侀獙璇併€佷笅涓€姝ャ€佺粏鑺? Component groups such as 鍥捐〃銆佷唬鐮併€佽瘉鎹?appear only when they genuinely help the reader.
- The skill guidance now assumes an impatient reader: one sentence beats two when information is unchanged, and rich components are justified only when they reduce reading effort.
