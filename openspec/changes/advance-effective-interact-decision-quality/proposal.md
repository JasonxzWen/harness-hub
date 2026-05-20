## Why

`effective-interact` 宸茬粡鍏峰 JSON 杈撳叆銆佺敓鎴愬櫒銆佹ā鏉裤€乺untime 娓叉煋鍜屾祻瑙堝櫒鏍￠獙锛屼絾瀹冪殑鏍稿績鍚堝悓浠嶅亸鍚戔€滅粍浠惰兘娓叉煋鈥濄€備笅涓€闃舵闇€瑕佹妸璐ㄩ噺閲嶅績鎻愬崌鍒扳€滆鑰呰兘鏇村揩鍋氬垽鏂€佽拷婧瘉鎹€佺悊瑙ｉ闄╁苟缁х画琛屽姩鈥濓紝鍚﹀垯 HTML 鍙細鍙樻垚鏇存紓浜殑闀挎枃妗ｃ€?
杩欐鍙樻洿鎵挎帴瀵?HTML 姹囨姤銆佸彲瑙嗗寲銆侀潤鎬?HTML銆佸畨鍏ㄤ笌 skill 缁勭粐鐨勮皟鐮旓細HTML 鐨勪环鍊间笉鏄楗帮紝鑰屾槸鎶?agent 杈撳嚭鍙樻垚鍙壂鎻忋€佸彲姣旇緝銆佸彲瀹¤銆佸彲浜や簰鐨勮交閲忓伐浣滅晫闈€?
## What Changes

- 寮曞叆 artifact intent 鍚堝悓锛氱敓鎴愯緭鍏ラ渶瑕佽〃杈捐鑰呫€佷富瑕侀棶棰樸€佸喅绛栫洰鏍囥€佹椂闂撮绠椼€佹垚鍔熸爣鍑嗗拰 artifact 绫诲瀷锛岀敓鎴愬櫒鎹閫夋嫨妯℃澘鍜屼俊鎭灦鏋勩€?- 寮曞叆 claim/evidence 鍚堝悓锛氬叧閿粨璁恒€佹暟瀛椼€佽秼鍔裤€侀闄╁拰寤鸿闇€瑕佺粦瀹氳瘉鎹€佹潵婧愩€佺疆淇″害銆佹椂闂寸獥鍙ｅ拰宸茬煡闄愬埗銆?- 鎵╁睍鍙鍖栧悎鍚岋細鏂板鍙楅檺 chart spec锛岀敤浜庣敓鎴?bar銆乴ine銆乻parkline銆乥ullet銆乻lope銆乵atrix 绛夊父瑙侀潤鎬佸浘锛涙瘡涓浘蹇呴』鏈夋枃鏈粨璁恒€佹暟鎹〃鏇夸唬鍜屾潵婧愪俊鎭€?- 寮哄寲 accessibility 鍚堝悓锛氬浘琛ㄣ€佹帶浠躲€佸鑸拰瀵屽唴瀹瑰繀椤绘弧瓒抽敭鐩樺彲杈俱€佸彲瑙?focus銆侀潪棰滆壊鍞竴缂栫爜銆乭eading 椤哄簭銆佹枃鏈浛浠ｅ拰鍩烘湰瀵规瘮搴﹂棬妲涖€?- 寮哄寲 runtime-cdn 瀹夊叏鍚堝悓锛欳DN runtime 渚濊禆闇€瑕?pinned version銆佸彲瀹¤ manifest锛屽苟浼樺厛鍔犲叆 SRI 鏍￠獙锛涢珮淇′换鎴栧綊妗ｅ満鏅繚鐣?`pre-rendered` 璺嚎銆?- 寮哄寲 trust model锛氭姤鍛婂唴瀹规寜 trusted generated銆乵ixed-trust銆乽ntrusted 鍖哄垎锛岀敓鎴愬櫒鍜?runtime 蹇呴』鍦ㄦ纭笂涓嬫枃涓?escape/sanitize銆?- 澧炲姞涓诲姩闃呰妯″紡锛氱爺绌惰В閲婂拰鍐崇瓥鎶ュ憡鍙寘鍚?assumption controls銆乻cenario table銆乵odel inspector 绛夎交閲忎氦浜掞紝浣嗛潤鎬佺粨璁轰粛蹇呴』涓嶄緷璧栦氦浜掑嵆鍙悊瑙ｃ€?- 鏇存柊 `effective-interact` skill 鏂囨。銆乻chema銆乫ixtures銆佺敓鎴愬櫒銆侀獙璇佸櫒鍜岄」鐩鏄庯紝浣垮悗缁疄鐜颁互娴嬭瘯鍜?AI 鑷姩楠屾敹椹卞姩銆?- Non-goals:
  - 涓嶆妸 `effective-interact` 鎵╂垚閫氱敤 frontend builder銆?  - 涓嶉粯璁ゅ紩鍏?React銆乀ailwind銆乂ite 鎴栭暱鏈熻繍琛岀殑 app runtime銆?  - 涓嶈鎵€鏈夋€荤粨閮藉彉鎴?HTML锛涚煭绛斻€佷竴娆℃€у懡浠よ緭鍑哄拰鏉冮檺鏆傚仠浠嶈蛋鐩存帴鑱婂ぉ銆?  - 涓嶅湪鏈彉鏇翠腑鍙戝竷銆佹帹閫佹垨鏀瑰彉绗笁鏂硅祫婧愩€?
## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `effective-interact-generation`: 鎶婃姤鍛婄敓鎴愬悎鍚屼粠鈥滃彲闈犳覆鏌?HTML鈥濇墿灞曚负鈥滄剰鍥鹃┍鍔ㄣ€佽瘉鎹粦瀹氥€佸彲瑙嗗寲鍙闂€佸畨鍏ㄥ彲瀹¤銆佸彲鑷姩楠屾敹鐨?HTML 宸ヤ綔姹囨姤鈥濄€?
## Impact

- Affected skill assets:
  - `skills/effective-interact/SKILL.md`
  - `skills/effective-interact/references/interaction-patterns.md`
  - `skills/effective-interact/references/interaction-input-schema.json`
  - `skills/effective-interact/assets/fixtures/*.json`
  - `skills/effective-interact/assets/components/*.css`
  - `skills/effective-interact/assets/components/*.js`
  - `skills/effective-interact/scripts/create-interaction.mjs`
  - `skills/effective-interact/scripts/validate-interaction.mjs`
- Affected docs:
  - `docs/effective-interact-decision-quality.md`
  - `docs/skill-routing.md` only if routing wording changes.
  - `docs/skill-feature-inventory.md` only if the user-facing capability summary changes.
- Affected tests:
  - `tests/effectiveInteractSkill.test.ts`
  - `tests/fixtures/skill-routing-cases.json` only if trigger wording changes.
- External sources considered:
  - Thariq Shihipar's HTML effectiveness examples, referenced but not copied.
  - Public visualization, accessibility, JSON Schema, SRI, and XSS guidance; implementation should cite or summarize concepts in docs, not vendor large text into skill bodies.
- Validation expectation:
  - `openspec validate advance-effective-interact-decision-quality`
  - focused `effective-interact` tests
  - generated fixture validation with browser-required checks where available
  - `scripts/validate-skills.ps1 -SkipExternal`
  - `bun run validate`
