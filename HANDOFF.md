# HANDOFF · 给接手这个项目的 AI（或未来的我）

> 目的：让你 5 分钟内接上手——知道这是什么、做到哪、半成品在哪、怎么继续。
> 先读本文件 →`设计备忘录.md`→`教学设计备忘.md`→`TODO.md`。

## 一、这是什么
**化机历**：一个**零构建纯静态网页**的「每日顺逆仪表盘 + 八字流日万年历 + 易学学习汇聚点」。
路径：`/Users/garfield/Desktop/Claude projet/bazi-almanac/`
用户输入生辰 → 浏览器**本地**排八字 → 首屏仪表盘 3 秒给出今天的主题/顺逆/宜忌/谶言；万年历整月打顺逆点看大势；详解卡看流日与命局的合冲刑害。

## 二、不可违背的硬约束
1. **网页优先、零构建**：`index.html` + `styles.css` + `js/**.js`，双击或静态服务即可，**不要引入打包工具**。
2. **大陆可直连**：lunar-javascript 已 vendor 到 `vendor/lunar.js`（**绝不走 CDN**）；**不用 Google Fonts**，只用系统中文字体；不接被墙服务。
3. **隐私**：生辰只存 localStorage（key `huaji.birth`），不联网不上传。
4. **美学**：素静文人风 + 五行矿物釉色；反珠光宝气。「忌/留意」一律软化标（赭色空心），**不用红底白字恐吓**。
5. **教学立场**：去恐吓化、福祸相依；说「顺/留意」不说「吉/凶」；谶言是「丞相奏对」不是判词。

## 三、文件地图（v4 · 2026-07-02 改版后）
- `index.html` — 骨架：masthead → 置顶锚点导航 → `#dashboard` 今日仪表盘 → `#almanac` 万年历 → `#personal` 详解+命盘 → `#intake` 录入 → `#learn`/`#yixue` → footer。脚本按 `vendor/lunar → engine → interpret → knowledge → analyze → daily → ui/format → ui/popups → ui/almanac → ui/dashboard → ui/personal → ui/learn → app` 顺序加载。
- `js/engine.js` — 排盘封装（lunar 全局对象 → 干净数据）：`buildChart/buildDay/monthDays/currentDaYun/shiShen`。`window.Engine`，node 可测。
- `js/analyze.js` — 身强弱（旺相休囚死+藏干通根量化）+ 用神（扶抑+**调候表已对穷通原文 120 格逐格精校**，2026-07-02，修正 18 格；裁决记录见 skill `qiongtong-baojian-perspective/references/调候表-原文对照.md`）+ 病药诊断。`window.Analyze`。
- `js/interpret.js` — 关系内核：`findRelations/mergeRelations`（**同型同字合并**，如年午+月午与流日丑相害→一条）/`mergedDayRelations`（含一次性宫位尾注）/`relationLayers`（L1–L4 分层，合并感知）/`dayReading`（legacy）。`window.Interpret`。
- `js/daily.js` — **每日文案引擎（本轮心脏）**：`SHISHEN_DAY` 十神×顺逆×身强弱矩阵（语料自三命通会/滴天髓/穷通/道德经，出处内嵌）、`QUOTES` 引句池（按日轮换）、`GAN_NOTE` 十干体性诗、`SS_VERSE/ZOU_VERSE` **谶言·丞相奏对**、`dayHit`（干0.6/支0.4 双计，**调候按用神字精确命中**）、`dayScore`（万年历打点）、`dailyText`、**`termHint` 名词悬停贴士组装**（两段式：通义 + 于你·臣曰；调候日/顺/平/留意/身强弱 + 十神五行个性化）。`window.Daily`，node 可测。
- `js/knowledge.js` — 教学知识库（纯数据）：intro/wuxing/shishen/relations/terms/bagua/yixue。
- `js/ui/format.js` — `UI.fmt`：tok/gzTok/term/色表（ELC/REL_COLOR）/TODAY 等公共件。
- `js/ui/popups.js` — `UI.popups`：术语浮层 #pop、悬停浮层 #tip（淡入过渡）。**名词悬停贴士**：所有 `.term` 与 `[data-hint]` 元素划过即现（`hintTipHTML` 两段式），点击落成持久浮层（`hintPopHTML`，兼顾移动端）；挂点在 app.js 的 mouseover/click 委托。
- `js/ui/almanac.js` — `UI.almanac`：万年历（年月快跳 select + **顺逆点 + 本月大势摘要**）、选定日面板（时间层叠加软化版 + **流年/流月与命局关系速记** + 折叠版通用老黄历 `folkFold`）。
- `js/ui/dashboard.js` — `UI.dashboard`：**今日仪表盘**（永远显示今天）：主题句/柔和顺逆刻度/宜忌/谶言/引句/迷你时间层/折叠老黄历；未录生辰时是 CTA。
- `js/ui/personal.js` — `UI.personal`：今日详解卡（体性诗行 + 关系连线图**按类型共道** + 合并列表+尾注）、本命盘卡（命盘表/五行环/旺衰用神/大运条）。
- `js/ui/learn.js` — `UI.learn`：学堂 + 后天八卦图（viewBox 已修裁切）。
- `js/app.js` — 瘦身版：state、localStorage、事件委托、表单、初始化。
- `js/srs.js` / `js/cards.js`（**暂存，未接**）— Anki SM-2 引擎 + 记忆卡数据，等 M7。
- `scripts/test-logic.mjs` — **无浏览器全管线验证**（排盘/关系/万年历 + **Daily 断言**：矩阵完整/顺逆判定/同日稳定/合并去重/打点合法）。`node scripts/test-logic.mjs`。
- `scripts/smoke.mjs` / `vendor.mjs` — 冒烟 / 重新 vendor 命理库。

## 四、当前精确状态（v4 已完成）
- ✅ 仪表盘首屏（主题/顺逆刻度/宜忌/**谶言奏对**/引句/时间层）
- ✅ 万年历顺逆点 + 本月大势 + 年月快跳（1901–2099 select）
- ✅ 每日文案引擎（告别 5 行 DOMAIN 模板；十神×顺逆×强弱矩阵 + 经典引句按日轮换）
- ✅ 关系合并去重 + 尾注一次化 + 连线图按类型共道 + 标签白描边
- ✅ 调候表 120 格对穷通原文精校（修正 18 格）
- ✅ 修复：录入后表单不隐藏（`[hidden]` 兜底）/ 八卦图裁切 / 图例连线色漂移 / relKey 死代码
- ✅ 「忌」软化为「留意」空心章；时间层顺逆干支双计
- ✅ 名词悬停贴士（两段式：通义 + 于你·臣曰）：`.term` / `[data-hint]` / `[data-gz]` 划过即现，点击持久
- ✅ 五行状态徽记（时间层）：阳实心/阴空心元素图形 + 阴阳水/金火组成字；顺逆章=点+字
- ✅ 万年历微互动：点击墨晕/选中弹性/面板浮入/悬停浮起/调候金点呼吸/方向键巡日（prefers-reduced-motion 全豁免）
- ⏳ 移动端：≤430px 断点已写（命盘表/关系图横向滚动容器），**待真机验收**
- ⏳ 谶言/文案语料一期（每神 2 组取象、每态 2 条奏对）——可持续扩池

## 四点五、部署(2026-07-06 起)
- **线上**:https://roserparker.github.io/bazi-almanac/ (GitHub Pages,仓库 Roserparker/bazi-almanac 公开,main 分支根目录)
- **发布方式**:`git push` 即自动重新部署(约 1 分钟生效);无构建步骤
- **本地离线**:双击 index.html 即可(零构建的红利)
- 注意:github.io 大陆访问不稳定——将来面向大陆用户仍按 M9 计划迁国内 OSS/CDN;生辰数据按域名隔离,换域名需重录一次

## 五、怎么跑 / 怎么验证
- 本地预览：`python3 -m http.server 5500 --directory "<项目路径>"`，开 `http://localhost:5500/`。也可直接双击 index.html。
- 验证逻辑（必做）：`node scripts/test-logic.mjs`，末行 LOGIC OK 才算过。
- 改 JS 后先 `node --check js/<file>.js`。
- 浏览器验收注意**强刷**（cmd+shift+R），http.server 无缓存头但 Chrome 会缓存旧 JS。

## 六、相关 skill（~/.claude/skills/，均含本地一手全本语料）
- `qiongtong-baojian-perspective` —《穷通宝鉴》调候（**调候表精校对照就在这里**）
- `ditiansui-perspective` —《滴天髓》理法 + 十干体性诗 + 李涵辰对照
- `sanming-tonghui-perspective` —《三命通会》十神百科（daily 矩阵主语料）
- `wuxing-dayi-perspective` —《五行大义》体性/八卦（配色与教学依据）
- `ziping-mingli-perspective` — 流派总纲/对比

## 七、下一步（按序）
1. 真机手机验收 ≤430px 断点；微调。
2. 谶言与文案扩池（每神取象 2→4 组，奏对 2→4 条；十神矩阵按用户反馈打磨措辞）。
3. M7 教育板块（`教学设计备忘.md` 已有 spec，**待用户确认后**做：分层悬停已具雏形、记忆卡 UI 接 srs/cards、工作坊 W0–W6）。
4. M8 ②历法本源（七十二候）③对照之镜（星座/旬星）。
5. M9：洛书九宫图、部署、产品名拍板。
