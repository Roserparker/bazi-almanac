# HANDOFF · 给接手这个项目的 AI（或未来的我）

> 目的：让你 5 分钟内接上手——知道这是什么、做到哪、半成品在哪、怎么继续。
> 先读本文件 →`教学设计备忘.md`→`设计备忘录.md`→`TODO.md`。

## 一、这是什么
**化机历**：一个**零构建纯静态网页**的「八字流日万年历 + 易学学习汇聚点」。
路径：`/Users/garfield/Desktop/Claude projet/bazi-almanac/`
用户输入生辰 → 浏览器**本地**排八字 → 看流日/流月/流年/大运与本命盘的"能量化学反应"；同时是学五行/八卦/八字的教学站。

## 二、不可违背的硬约束
1. **网页优先、零构建**：直接 `index.html` + `styles.css` + `js/*.js`，双击或静态服务即可，**不要引入打包工具**。
2. **大陆可直连**：命理库 lunar-javascript 已本地 vendor 到 `vendor/lunar.js`（**绝不走 CDN**）；**不用 Google Fonts**，只用系统中文字体；不接任何被墙服务。
3. **隐私**：生辰只存 localStorage，不联网不上传。
4. **美学**：素静文人风（宣纸底/墨字/留白）+ 五行功能色（依《五行大义》五正色"青赤黄白黑"调候：金=缟素古银、水=玄黛）。反珠光宝气。
5. **教学立场**：去恐吓化、福祸相依；个人盘只作偶发活例、不做命运断言（用户明确要"淡化我的存在、抛砖引玉学新知"）。

## 三、文件地图
- `index.html` — 页面骨架；末尾按序加载 `vendor/lunar.js → js/engine.js → interpret.js → knowledge.js → app.js`（srs.js/cards.js **尚未加入**）。
- `styles.css` — 全部样式（含 :root 五行变量、命盘、关系连线 .rsvg、五行环 .ring、八卦 .bagua、浮层 .pop）。
- `js/engine.js` — 排盘封装（包 lunar 全局对象）：`buildChart` / `buildDay`(含万年历日信息) / `monthDays` / `currentDaYun` / `shiShen` / 五行生克表。挂 `window.Engine`，并 `module.exports`（可 node 测）。
- `js/interpret.js` — 关系内核 + 解读：`findRelations` / `chartRelations` / `dayRelations` / `dayReading` / **`explainRelation(rel, positions)`**（把任意两/三位关系展开成"具体到这两个字"的话，供悬停+列表）。`window.Interpret`。
- `js/knowledge.js` — 纯数据知识库：`intro` / `wuxing`(含体性配属+萧吉原话) / `shishen`(十神两面性+道德经) / `relations` / `terms` / `bagua` / `yixue`。`window.Knowledge`。
- `js/app.js` — UI 与交互：渲染万年历、命盘、五行环 `ringSVG`、关系图 `relationsSVG`、八卦图 `baguaSVG`、术语浮层 `termHTML/openTerm`、表单/localStorage。单一 document 点击委托 + 术语点击。
- `js/srs.js`（**暂存，未接**）— Anki SM-2 间隔重复引擎：`rate/preview/queue/stats/fmtDays/reset`，进度存 `localStorage['huaji.srs']`。
- `js/cards.js`（**暂存，未接**）— 记忆卡数据（自包含）：天干地支五行阴阳/藏干/生克/三合/六冲/墓库/各干墓/概念。`window.Cards`。
- `scripts/test-logic.mjs` — **无浏览器**验证 engine+interpret 全管线（排盘/关系/万年历/关系富文本）。`node scripts/test-logic.mjs`。
- `scripts/smoke.mjs` / `vendor.mjs` — 冒烟 / 重新 vendor 命理库。
- `设计备忘录.md` / `教学设计备忘.md` / `TODO.md` — 设计、教学法、任务。

## 四、当前精确状态（做到哪）
- **v3 可用**：万年历、命盘、五行流转环、关系连线图、八卦方位图、教学浮层都在线且数值经 node 实测正确。
- **进行中 1 · 悬停连线解释**：`explainRelation` 已写好并接入关系列表；`relationsSVG` 已把每条线包成 `<g class="rel-arc" data-tip="...">`（含透明加宽 hit 区）。**还差**（这是下一步最小收尾）：
  - index.html 加 `<div id="tip" class="tip" hidden></div>`；
  - app.js 加 `showTip/positionTip/hideTip` + `mouseover`/`mousemove` 监听 + 点击 `.rel-arc` 分支（触摸）；
  - styles.css 加 `.tip{position:fixed;pointer-events:none;…}` 和 `.rel-arc{cursor:help}`。
- **进行中 2 · 记忆卡**：srs.js + cards.js 写好但 index.html 未引入、无 UI。
- **进行中 3 · 教育板块**：`教学设计备忘.md` 已出（分层悬停 / 明暗克 / 读盘5步 / 工作坊 W0–W6 / 卡片）；**正等用户评审确认**，确认前不要实现 M7。

## 五、怎么跑 / 怎么验证
- 本地预览：`python3 -m http.server 5500 --directory "<项目路径>"`，开 `http://localhost:5500/`。也可直接双击 index.html。
- 验证逻辑（必做，无浏览器即可）：`node scripts/test-logic.mjs`，看四柱/关系/节气/富文本是否正确。
- 改 JS 后先 `node --check js/<file>.js` 排语法。
- 注意：无浏览器自动化，SVG/DOM 渲染靠 node 验证数据 + 让用户肉眼看；改完用 `open http://localhost:5500/` 让用户刷新查看。

## 六、相关 skill
- `wuxing-dayi-perspective`（在 `~/.claude/skills/`）：从《五行大义》全本蒸馏的"五行+八卦"设计/教学顾问。配色与教学的经典依据在此。

## 七、下一步（按序）
1. 收尾悬停连线浮层（见四·进行中1，最小改动）。
2. 待用户确认 `教学设计备忘.md` → 实现 M7（分层悬停 → 记忆卡 UI + 天干档案卡 → 导航/工作坊 → 读盘5步）。
3. M6 身强弱/用神（读盘5步与"顺逆"可信度都依赖它）。
