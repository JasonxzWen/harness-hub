## Context

`effective-interact` 褰撳墠宸茬粡瀹屾垚绗竴闃舵宸ョ▼鍖栵細瀹冧笉鏄墜鍐?HTML 鎶€宸э紝鑰屾槸鐢?`SKILL.md` 璺敱銆乣interaction-input-schema.json` 杈撳叆銆乣create-interaction.mjs` 鐢熸垚銆乣validate-interaction.mjs` 鏍￠獙銆佹ā鏉?缁勪欢/fixtures 鏀拺鐨勫崟鏂囦欢 HTML 姹囨姤鑳藉姏銆?
涓婁竴杞?`polish-effective-interact-runtime-quality` 宸茬粡鎶婇噸鐐规斁鍦?runtime-cdn銆佸瘜鍐呭娓叉煋銆佸垎缁勫鑸€佹祻瑙堝櫒鏍￠獙鍜岃瘖鏂劚鏁忎笂銆傛湰杞笉閲嶅杩欎簺宸ヤ綔锛岃€屾槸琛ヤ笂鏇翠笂灞傜殑浜у搧鍚堝悓锛氭眹鎶ュ簲璇ュ厛鏈嶅姟璇昏€呭垽鏂紝鍐嶅喅瀹氭槸鍚﹂渶瑕佸浘琛ㄣ€佷唬鐮併€丮ermaid銆乼abs 鎴栦氦浜掋€?
璋冪爺杈撳叆鏉ヨ嚜涓夌被璧勬枡锛?
- HTML artifact 鎬濊矾锛歍hariq Shihipar 鐨?HTML effectiveness examples 寮鸿皟 HTML 鍙互鎵胯浇姣旇緝銆佽鍒掋€丳R review銆佽В閲娿€佺姸鎬佹眹鎶ュ拰灏忓瀷缂栬緫鐣岄潰銆?- 鍙鍖栧拰璁ょ煡鍘熷垯锛氫紭鍏堜娇鐢ㄨ鑰呯啛鎮夌殑 bar/line/table 绛夊舰寮忥紱鍥捐〃鍙兘鎵胯浇涓€涓富瑕佷俊鎭紱棰滆壊涓嶈兘鏄敮涓€缂栫爜锛涙牳蹇冪粨璁轰笉鑳戒緷璧?hover 鎴栫偣鍑汇€?- 闈欐€?HTML 宸ョ▼绾︽潫锛氬崟鏂囦欢 artifact銆乻chema 椹卞姩銆佷笂涓嬫枃 escape/sanitize銆乺untime dependency pinning銆丼RI銆乥rowser validation銆佸彲璁块棶鎬у拰鍙璁?fallback銆?
## Goals / Non-Goals

**Goals:**

- 璁?artifact input 鏄惧紡琛ㄨ揪璇昏€呫€佷换鍔°€侀棶棰樸€佸喅绛栥€佹椂闂撮绠楀拰鎴愬姛鏍囧噯銆?- 璁╁叧閿粨璁恒€佹暟瀛椼€佽秼鍔裤€侀闄╁拰寤鸿鍙拷婧埌 evidence/source锛岃€屼笉鏄彧闈犺瑙夋潈濞佹劅銆?- 涓哄父瑙佸彲瑙嗗寲鎻愪緵鍙楅檺銆佸彲鏍￠獙銆佸彲璁块棶鐨?chart spec锛岄伩鍏嶄换鎰忔墜鍐?SVG 鎴愪负榛樿璺緞銆?- 鎶婂彲璁块棶鎬с€佸畨鍏ㄥ拰 trust model 鍐欏叆鐢熸垚涓庨獙璇佸悎鍚岋紝鑰屼笉鏄潬浜哄伐瀹￠槄琛ユ晳銆?- 璁?AI 鑷姩楠屾敹鍙互浠?tasks/spec 鎺ㄥ锛氱敓鎴?fixtures銆佽繍琛?validator銆佹鏌ユ姤鍛婄粨鏋勩€佸鏌?diff銆佺粰鍑?pass/fail銆?- 淇濇寔 skill progressive loading锛歚SKILL.md` 鍙繚鐣欒Е鍙戣竟鐣屽拰鏍稿績 workflow锛屽鏉傝鍒欐斁鍒?`references/`銆乣assets/`銆乣scripts/`銆?
**Non-Goals:**

- 涓嶅疄鐜伴€氱敤 dashboard 浜у搧锛屼篃涓嶆妸 `effective-interact` 鏀归€犳垚 `frontend-design` 鎴?`web-artifacts-builder` 鐨勬浛浠ｅ搧銆?- 涓嶉粯璁ゅ紩鍏?React銆乀ailwind銆乂ite銆乻hadcn 鎴栭暱鏈熻繍琛岀殑 app runtime銆?- 涓嶈姹傛墍鏈?chat 鎬荤粨鐢熸垚 HTML锛涘彧鏈夊綋 HTML 鏄庢樉闄嶄綆闃呰銆佹瘮杈冦€佸鏌ユ垨缁х画琛屽姩鎴愭湰鏃舵墠浣跨敤銆?- 涓嶅湪鏈鍒掗樁娈典慨鏀瑰疄鐜颁唬鐮侊紱瀹炵幇闇€瑕佸悗缁槑纭惎鍔?OpenSpec apply銆?- 涓嶅鍒跺閮ㄦ枃绔犳垨鎸囧崡鐨勫ぇ娈靛唴瀹硅繘 skill锛涘彧鎻愮偧瑙勫垯骞朵繚鐣欐潵婧愰摼鎺ャ€?
## Decisions

### Decision 1: 澧炲姞 artifact intent锛岃€屼笉鏄彧鎵╁睍 section types

鏂板椤跺眰 artifact intent 瀛楁锛屽缓璁寘鎷細

- `audience`: 璇昏€呰鑹叉垨棰勬湡鎶€鏈儗鏅€?- `primaryQuestion`: 杩欎唤鎶ュ憡瑕佸洖绛旂殑涓€涓富闂銆?- `decision`: 璇昏€呯湅瀹屽悗瑕佸仛鐨勫垽鏂垨鍔ㄤ綔銆?- `timeBudget`: 渚嬪 `30s`銆乣3m`銆乣8m`锛岀敤浜庣害鏉熷瘑搴︺€?- `artifactKind`: `handoff`銆乣review`銆乣status`銆乣research`銆乣decision`銆乣explainer`銆乣editor` 绛夈€?- `successCriteria`: 璇昏€呭垽瀹氭姤鍛婃湁鏁堢殑鏉′欢銆?
Rationale: 绗竴鎬у師鐞嗕笂锛屾眹鎶ョ殑浠峰€兼槸闄嶄綆鍒ゆ柇鎴愭湰銆傚厛瀹氫箟璇昏€呬换鍔★紝鎵嶈兘鍐冲畾璇ョ敤涓€鍙ヨ瘽銆佽〃鏍笺€佸浘琛ㄣ€佷唬鐮佽瘉鎹繕鏄氦浜掓帶浠躲€?
Alternative considered: 缁х画澧炲姞 `summary-cards`銆乣chart`銆乣tabs` 绛夌粍浠剁被鍨嬨€傝繖涓柟鍚戜細璁╃粍浠跺簱鍙樹赴瀵岋紝浣嗕笉浼氫繚璇佹姤鍛婃洿濂借銆?
### Decision 2: 澧炲姞 claim/evidence 妯″瀷

鏂板 `claims[]`锛屾瘡涓?claim 寤鸿鍖呭惈锛?
- `id`
- `statement`
- `kind`: `conclusion`銆乣risk`銆乣metric`銆乣trend`銆乣recommendation`銆乣assumption`
- `evidenceIds`
- `confidence`
- `dateRange`
- `knownLimits`

鎵╁睍 `evidence[]`锛屾敮鎸?`sourceUrl`銆乣sourceTitle`銆乣sourceType`銆乣accessedAt`銆乣command`銆乣filePath`銆乣line`銆乣extractDate`銆乣trustLevel`銆?
Rationale: HTML 寰堝鏄撳埗閫犫€滅湅璧锋潵鍙俊鈥濈殑閿欒銆傝瘉鎹粦瀹氭妸鎶ュ憡浠庤瑙夐檲杩版彁鍗囦负鍙璁″垽鏂€?
Alternative considered: 鍙湪 Markdown 姝ｆ枃閲屽啓寮曠敤閾炬帴銆傝繖鏍锋洿杞伙紝浣嗕笉鍒╀簬 validator 鍜?AI 鑷姩楠屾敹纭鍏抽敭缁撹鏄惁鏈夋敮鎾戙€?
### Decision 3: 鍥捐〃浣跨敤鍙楅檺 chart spec锛屽苟鑷姩鐢熸垚鏇夸唬琛ㄦ牸

鏂板 `chart` section锛屼絾闄愬畾鍦ㄥ皬鍨嬭В閲婃€у浘琛細

- bar: 绫诲埆姣旇緝銆?- line: 鏃堕棿瓒嬪娍銆?- sparkline: 绱у噾瓒嬪娍鎻愮ず銆?- bullet: 褰撳墠鍊笺€佺洰鏍囧拰鍖洪棿銆?- slope: 涓ょ偣鍙樺寲銆?- matrix: 椋庨櫓銆佷紭鍏堢骇鎴栭€夐」姣旇緝銆?
姣忎釜 chart 蹇呴』鍖呭惈锛?
- `title`
- `takeaway`
- `data`
- `encoding`
- `source`
- `altText`
- `tableFallback`

Rationale: 瀵规眹鎶ュ満鏅紝甯歌鍥捐〃鍔犳槑纭粨璁烘瘮澶嶆潅鍙帰绱㈠浘鏇寸ǔ瀹氥€傚彈闄?spec 鍙祴璇曘€佸彲璁块棶銆佸彲闄嶇骇銆?
Alternative considered: 榛樿寮曞叆 Vega-Lite runtime銆俈ega-Lite 寰堥€傚悎浣滀负 grammar 鍙傝€冿紝浣嗛粯璁?runtime 浼氬鍔犱緷璧栧拰瀹夊叏闈紱鏈疆鍏堝疄鐜板彈闄愰潤鎬?SVG/HTML 鍥捐〃銆?
### Decision 4: 鍙闂€ф槸鐢熸垚鍚堝悓锛屼笉鏄檮鍔犳鏌?
鐢熸垚鍣ㄥ拰 validator 闇€瑕佽鐩栵細

- heading 椤哄簭鍜?landmark銆?- 鎵€鏈変氦浜掓帶浠舵湁鏂囨湰鎴?`aria-label`銆?- 閿洏鍙?focus銆乫ocus ring 鍙銆乼ab 椤哄簭涓嶆贩涔便€?- 鍥捐〃鏈?`altText`銆佹枃鏈?takeaways 鍜岃〃鏍兼浛浠ｃ€?- 涓嶇敤棰滆壊浣滀负鍞竴鐘舵€佺紪鐮併€?- 鍩烘湰棰滆壊瀵规瘮搴︽鏌ャ€?- `prefers-reduced-motion` 瑕嗙洊鍔ㄧ敾/transform銆?
Rationale: 姹囨姤閫氬父浼氳鍒嗕韩銆佸鏌ャ€佸瓨妗ｃ€傚彲璁块棶鎬у悓鏃朵篃鏄彲鐢ㄦ€э紝灏ゅ叾瀵瑰瘑闆嗗伐绋嬫姤鍛婂拰灏忓睆闃呰銆?
Alternative considered: 鍙仛瑙嗚鎴浘浜哄伐妫€鏌ャ€備汉宸ユ鏌ュ鏄撴紡鎺?keyboard銆乻creen reader 鍜岄鑹茬紪鐮侀棶棰橈紝涔熶笉閫傚悎 AI 鑷姩楠屾敹銆?
### Decision 5: runtime-cdn 缁х画鍏佽锛屼絾鍗囩骇涓轰緵搴旈摼鍙璁?
runtime-cdn 渚濊禆蹇呴』锛?
- 鍥哄畾搴撳悕鍜岀増鏈€?- 澹版槑 URL銆佺敤閫斿拰鍔犺浇鐘舵€併€?- 浼樺厛甯?`integrity` 鍜?`crossorigin="anonymous"`銆?- 鍦?validator 涓鏌ョ己澶辩殑 integrity 鎴栬褰曟槑纭眮鍏嶃€?
`pre-rendered` 缁х画浣滀负楂樹俊浠汇€佺绾裤€佸綊妗ｆ垨鍙楅檺缃戠粶鍦烘櫙鐨勬樉寮忔ā寮忋€?
Rationale: 鍏佽 CDN 鏄疄鐢ㄩ€夋嫨锛屼絾涓嶈兘璁╃涓夋柟鑴氭湰鎴愪负涓嶅彲杩借釜鐨勯殣鎬т緷璧栥€係RI 鏄祻瑙堝櫒鍘熺敓渚涘簲閾炬牎楠屾柟寮忋€?
Alternative considered: 瀹屽叏绂佹 CDN銆傝繖鏍锋洿瀹夊叏浣嗕細闄嶄綆 local browser 鍐呭嵆鏃跺瘜娓叉煋璐ㄩ噺锛屽苟鍥炲埌鎵嬪啓娓叉煋鍣ㄥ鏉傚害銆?
### Decision 6: 寮曞叆 trust model锛岄伩鍏嶆妸鎵€鏈夎緭鍏ュ綋浣滃悓绛夊彲淇?
鎶ュ憡杈撳叆鍜?section 鍙互鏍囨敞锛?
- `trusted-generated`: 鐢辨湰鍦扮敓鎴愬櫒鎴栧彈鎺у父閲忎骇鐢熴€?- `mixed-trust`: agent 姹囨€汇€佸懡浠よ緭鍑恒€佸閮ㄥ紩鐢ㄣ€佺敤鎴锋彁渚?Markdown銆?- `untrusted`: 鏃ュ織銆乮ssue 鍐呭銆佺綉椤垫憳褰曘€佺涓夋柟鏂囨湰銆?
涓嶅悓 trust level 杩涘叆涓嶅悓 sink 鏃跺繀椤讳娇鐢ㄤ笉鍚?escape/sanitize 绛栫暐銆倂alidator 闇€瑕佹鏌ュ嵄闄╁崗璁€佷簨浠跺睘鎬с€乺aw script銆乽nsafe `innerHTML` 鐢ㄦ硶鍜岃瘖鏂硠婕忋€?
Rationale: OWASP XSS 闃叉姢鐨勬牳蹇冩槸鎸夎緭鍑轰笂涓嬫枃澶勭悊鏁版嵁锛岃€屼笉鏄叏灞€杩囨护涓€娆°€?
Alternative considered: 鍏ㄩ儴缁熶竴 DOMPurify銆侱OMPurify 寰堥噸瑕侊紝浣嗕笉鑳芥浛浠?HTML attribute銆乁RL銆丣S銆丆SS 绛変笉鍚屼笂涓嬫枃鐨勭紪鐮佽竟鐣屻€?
### Decision 7: 涓诲姩闃呰妯″紡蹇呴』鏈夐潤鎬佺粨璁?
鐮旂┒瑙ｉ噴銆佸喅绛栫煩闃靛拰 scenario 鎶ュ憡鍙互澧炲姞锛?
- assumption controls
- scenario table
- model inspector
- copyable decision brief

浣嗘姤鍛婂繀椤诲湪涓嶄氦浜掓椂浠嶈兘璇绘噦涓荤粨璁恒€侀粯璁ゅ亣璁惧拰鎺ㄨ崘鍔ㄤ綔銆?
Rationale: 濂界殑 explorable explanation 鏄璇昏€呴獙璇佸拰璋冩暣鍋囪锛屼笉鏄妸璇昏€呬涪杩涗竴涓病鏈夊彊浜嬬殑娌欑洅銆?
Alternative considered: 鎶婂鏉傚唴瀹归兘鍋氭垚浜や簰 editor銆俥ditor 鏈変环鍊硷紝浣嗕細鎻愰珮瀹炵幇銆侀獙璇佸拰鍙闂€ф垚鏈紝涓嶉€傚悎浣滀负鏅€氭眹鎶ラ粯璁ゅ舰鎬併€?
### Decision 8: AI 鑷姩楠屾敹浣跨敤 fixture-driven acceptance

鏈彉鏇村疄鐜版椂搴旀柊澧炶嚦灏戜笁绫?fixture锛?
- concise handoff: 楠岃瘉娌℃湁涓嶅繀瑕佺粍浠跺櫔闊炽€?- decision report: 楠岃瘉 intent銆乧laims銆乪vidence銆乨ecision matrix銆乤ctions銆?- chart/accessibility stress: 楠岃瘉 chart銆乤lt/table fallback銆乲eyboard銆乧ontrast銆乻ource data銆?
AI 鑷姩楠屾敹鎻愮ず璇嶅簲瑕佹眰鎵ц锛?
- 璇诲彇 OpenSpec change 鍜?docs銆?- 瀹炵幇鍓嶅厛杩愯 baseline focused tests銆?- 鎸?tasks 椤哄簭灏忔瀹炵幇骞跺嬀閫夈€?- 鐢熸垚鎶ュ憡 fixture銆?- 杩愯 validator 鍜?browser-required check銆?- 杩愯 repo-level validation銆?- 鍋?diff review锛岀‘璁ゆ病鏈夋墿澶?skill 璺敱鎴栧紩鍏?product UI builder 琛屼负銆?
## Risks / Trade-offs

- [Risk] schema 鍙樺鏉傚鑷?agent 杈撳叆鎴愭湰涓婂崌 -> Mitigation: intent/claims 瀛楁鍏堝彲閫夛紝鎻愪緵鏈€灏忕ず渚嬪拰鑷姩鎺ㄦ柇榛樿鍊笺€?- [Risk] chart spec 杩囨棭娉涘寲 -> Mitigation: 鍙敮鎸佸皯閲忓父瑙佸浘琛紝绂佹榛樿浠绘剰 SVG/Canvas銆?- [Risk] accessibility validator 璇姤鎴栬鐩栦笉瓒?-> Mitigation: 鍏堝仛缁撴瀯鎬ф鏌ュ拰鍏抽敭瑙勫垯锛屽鏉?a11y 宸ュ叿浣滀负鍚庣画鍙€夊寮恒€?- [Risk] SRI hash 缁存姢鎴愭湰澧炲姞 -> Mitigation: runtime 渚濊禆闆嗕腑澹版槑锛屽崌绾х増鏈椂娴嬭瘯鍜?hash 涓€璧锋洿鏂般€?- [Risk] 鏂板 trust model 涓庣幇鏈?sanitizer 閲嶅彔 -> Mitigation: 鏂囨。鏄庣‘ sanitizer 鏄竴绉?sink 绛栫暐锛屼笉鏄敮涓€瀹夊叏杈圭晫銆?- [Risk] 褰撳墠杩樻湁涓€涓?complete 浣嗘湭褰掓。鐨?effective-interact change -> Mitigation: 鏈彉鏇村彧娣诲姞鍚庣画 delta锛屼笉淇敼鏃㈡湁 complete change锛涘疄鐜板墠搴旈噸鏂版鏌?active changes銆?
## Migration Plan

1. 鍒涘缓 OpenSpec proposal銆乨esign銆乻pec delta銆乼asks 鍜岄」鐩鏄庢枃妗ｃ€?2. 鍚庣画瀹炵幇鍓嶅厛纭 `polish-effective-interact-runtime-quality` 鏄惁闇€瑕佸綊妗ｆ垨淇濇寔骞惰銆?3. 瀹炵幇闃舵鍏堝姞 failing/expected tests 鍜?fixtures锛屼笉鍏堟敼鐢熸垚鍣ㄣ€?4. 鎵╁睍 schema 涓?generator 鐨勯粯璁ゆ帹鏂紝淇濇寔鏃ц緭鍏ュ吋瀹广€?5. 澧炲姞 chart rendering銆乧laim/evidence rendering銆乤11y/security validation銆?6. 鏇存柊 `SKILL.md` 涓?`interaction-patterns.md`锛屾妸璇︾粏瑙勫垯鏀惧叆 references銆?7. 杩愯 focused tests銆丱penSpec validation銆乻kill validation銆乺epo validation銆?
Rollback strategy:

- 鏂板瓧娈典繚鎸佸彲閫夛紱鏃?fixtures 鍜屾棫鎶ュ憡杈撳叆缁х画鐢熸垚銆?- 鑻?chart generator 涓嶇ǔ瀹氾紝淇濈暀 schema 鍜?docs锛屾殏鏃剁鐢?chart section 娓叉煋骞惰繑鍥?degraded fallback銆?- 鑻?SRI 鑾峰彇鎴?CDN 鍝嶅簲涓嶇ǔ瀹氾紝validator 鍙厛璁板綍 warning锛屼絾 runtime manifest 浠嶅繀椤诲瓨鍦ㄣ€?
## Open Questions

- 鏄惁鍦ㄦ湰杞疄鐜颁腑寮曞叆 `axe-core`锛岃繕鏄厛淇濇寔杞婚噺鑷爺 a11y checks锛?- chart SVG 鏄惁鍏ㄩ儴鐢辨湰鍦扮敓鎴愬櫒闈欐€佽緭鍑猴紝杩樻槸鍏佽 runtime-cdn enhancement锛熼粯璁ゅ缓璁厛闈欐€佽緭鍑恒€?- SRI hash 鏄惁鐢辫剼鏈嚜鍔ㄦ姄鍙栧拰鏇存柊锛岃繕鏄墜宸ョ淮鎶ゅ湪 runtime dependency 甯搁噺涓紵榛樿寤鸿鑴氭湰杈呭姪銆佸父閲忚惤搴撱€?- 鏄惁闇€瑕佸湪 generated HTML 涓彁渚涒€滃鍑?Markdown brief鈥濈粺涓€鎸夐挳锛熻繖瀵规眹鎶ュ鐢ㄦ湁浠峰€硷紝浣嗕笉搴旈樆濉?P0銆?