# 化机历 · 八字流日万年历

一个**零构建、纯静态**的八字 / 五行 / 易学学习网站：输入生辰 → 浏览器**本地**排八字 → 看流日 / 流月 / 流年 / 大运与本命盘的「能量化学反应」；同时是一本万年历，与一个学五行 / 八卦 / 命理的**去恐吓化**教学站。

## 怎么打开
- **直接双击 `index.html`** 即可（零依赖、离线可用）。
- 或本地起服务：`python3 -m http.server 5500 --directory .` → 打开 <http://localhost:5500/>

## 硬约束
- **大陆可直连**：命理库 `lunar-javascript` 已本地 vendor 到 `vendor/lunar.js`（零 CDN）；只用系统中文字体（无 Google Fonts）；不接任何被墙服务。
- **隐私**：生辰只存浏览器 `localStorage`，不联网、不上传、可随时清除。

## 结构
- `index.html` / `styles.css` — 页面与样式（釉色矿物配色 + 十天干各象）
- `js/engine.js` 排盘 · `js/analyze.js` 身强弱+用神 · `js/interpret.js` 关系与解读 · `js/knowledge.js` 教学知识库 · `js/app.js` UI · `js/srs.js`+`js/cards.js` 记忆卡（待接 UI）
- `vendor/lunar.js` 命理库（唯一第三方，已本地化）
- `scripts/test-logic.mjs` 无浏览器验证排盘 / 关系 / 万年历：`node scripts/test-logic.mjs`

## 文档
- `HANDOFF.md` — 接手必读（5 分钟上手）
- `设计备忘录.md` / `教学设计备忘.md` / `天人之学设计.md` — 设计与教学法
- `TODO.md` — 进度与待办

> 立场：传统模型 + 文化意象的现代表达，描述能量倾向、不作宿命断言——福祸相依，顺势而为。
