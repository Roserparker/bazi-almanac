// 在 node 里验证 engine.js + interpret.js 的整条管线（无需浏览器）。
// 运行：node scripts/test-logic.mjs
import LunarLib from 'lunar-javascript'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const L = LunarLib.default ?? LunarLib
Object.assign(globalThis, L) // Solar / Lunar / EightChar … 作为全局
globalThis.window = globalThis // 让 IIFE 把 Engine / Interpret 挂到 globalThis

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
require(resolve(root, 'js/engine.js'))
require(resolve(root, 'js/interpret.js'))
require(resolve(root, 'js/analyze.js'))
require(resolve(root, 'js/daily.js'))

const { Engine, Interpret, Analyze, Daily } = globalThis
function assert(cond, msg) { if (!cond) { console.error('✗ ASSERT FAIL:', msg); process.exit(1) } }

const birth = { year: 1990, month: 6, day: 15, hour: 14, minute: 30, gender: 1 }
const chart = Engine.buildChart(birth)

console.log('日主:', chart.dayMaster.gan, chart.dayMaster.yinyang + chart.dayMaster.wuxing)
console.log(
  '四柱:',
  chart.pillars.year.gan + chart.pillars.year.zhi,
  chart.pillars.month.gan + chart.pillars.month.zhi,
  chart.pillars.day.gan + chart.pillars.day.zhi,
  chart.pillars.time.gan + chart.pillars.time.zhi
)
console.log('五行分布:', JSON.stringify(chart.wuxingCount))

const st = Analyze.strength(chart)
console.log(
  '\n身强弱:', st.label,
  '| 月令', st.ruler + '当令→日主' + st.dm + st.ws, '(' + (st.deLing ? '得令' : '失令') + ')',
  '| 帮', st.helps, '耗', st.drains, '| 比', st.ratio.toFixed(2)
)
const yong = Analyze.yongShen(chart, st)
console.log('用神:', yong.balanced ? '中和·贵流通' : yong.strong ? '身强→喜泄克耗' : '身弱→喜生扶', '| 喜', yong.favorable.join('') || '—', '| 忌', yong.unfavorable.join('') || '—')
console.log('调候用神(穷通):', yong.tiaohouYong.join('') || '—', '(' + yong.tiaohouEl.join('') + ') ·', yong.seasonHint)
console.log('命局诊断:', yong.diag.excess + '最旺' + (yong.diag.lack.length ? '、缺' + yong.diag.lack.join('') : ''), '· 气候偏' + yong.diag.climate)
console.log('取舍:', yong.reconcile)
const todayY = Interpret.dayReading(chart, Engine.buildDay(null), yong)
console.log('今日喜忌:', todayY.yong ? todayY.yong.hit + '：' + todayY.yong.text : '—')

console.log('\n本命盘内部关系（期望：庚乙五合金、午未六合×2、午午自刑）:')
Interpret.chartRelations(chart).forEach((r) =>
  console.log('  -', r.type, '[' + r.members.join('/') + ']', r.chars.join(''), '·', r.desc)
)

const day = Engine.buildDay(null)
console.log('\n今日 vs 本命盘 关系:')
const dr = Interpret.dayRelations(chart, day)
console.log(dr.length ? dr.map((r) => '  - ' + r.type + ' ' + r.desc).join('\n') : '  （无显著关系）')

const r = Interpret.dayReading(chart, day)
console.log('\n今日解读:')
console.log('  主星:', r.shiShen, '→', r.domain.name, '| 五行:', r.relation.tag, '| 基调:', r.tone)

console.log('\n今日万年历:')
console.log('  ', day.solarYmd, day.weekday, day.lunarStr, '属' + day.shengXiao, day.jieQi ? '【' + day.jieQi + '】' : '')
console.log('   干支:', day.liunian, day.liuyue, day.liuri, '| 纳音:', day.dayNaYin)
console.log('   冲:', day.chong, '| 煞:', day.sha, '| 值:', day.zhiXing)
console.log('   宜:', day.yi.slice(0, 6).join(' '))
console.log('   忌:', day.ji.slice(0, 6).join(' '))

console.log('\n2026年6月 · 节气日（期望 芒种≈6/5、夏至≈6/21）:')
Engine.monthDays(2026, 6)
  .filter((d) => d.jieQi)
  .forEach((d) => console.log('  ', d.solarYmd, d.jieQi, d.ganZhiDay))
console.log('6月1–3日示例:')
Engine.monthDays(2026, 6)
  .slice(0, 3)
  .forEach((d) => console.log('  ', d.solarYmd, d.lunarMonthCn + '月' + d.lunarDayCn, d.ganZhiDay))

console.log('\n=== 关系富文本验证（未来 60 天内首个有流日关系的日子）===')
{
  const base = new Date()
  let found = false
  for (let i = 0; i < 60 && !found; i++) {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    const dd = Engine.buildDay({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
    const rr = Interpret.dayReading(chart, dd)
    if (rr.relations.length) {
      found = true
      console.log(dd.solarYmd, '流日', dd.liuri)
      rr.relations.forEach((x) => console.log('  [' + x.type + '] ' + x.rich))
    }
  }
  if (!found) console.log('  （60 天内该命例无流日关系，属正常）')
}

console.log('\n=== Daily 文案引擎断言 ===')
{
  // 1) 矩阵完整：10 神 × xi/ji/ping 无空格；xi/ji 各含 s/w 两套
  const SS = ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印']
  SS.forEach((s) => {
    const m = Daily.M[s]
    assert(m && m.xi && m.ji && m.ping, s + ' 矩阵缺层')
    ;['xi', 'ji'].forEach((h) => {
      assert(m[h].theme && m[h].s && m[h].w && m[h].s.yi && m[h].s.ji && m[h].w.yi && m[h].w.ji, s + '.' + h + ' 缺文案')
      assert(m[h].s.yi !== m[h].w.yi, s + '.' + h + ' 强弱宜文案未区分')
    })
    assert(m.ping.theme && m.ping.yi && m.ping.ji, s + '.ping 缺文案')
    assert(Daily.QUOTES[s] && Daily.QUOTES[s].length >= 2, s + ' 引句池不足')
    assert(Daily.SS_VERSE[s] && Daily.SS_VERSE[s].length >= 2, s + ' 谶言取象不足')
  })
  ;['tiaohou', 'xi', 'ping', 'ji'].forEach((h) => assert(Daily.ZOU_VERSE[h] && Daily.ZOU_VERSE[h].length >= 2, h + ' 奏对池不足'))
  '甲乙丙丁戊己庚辛壬癸'.split('').forEach((g) => assert(Daily.GAN_NOTE[g] && Daily.GAN_NOTE[g].shi, g + ' 体性诗缺'))
  console.log('  ✓ 矩阵 10神×3态×强弱 全满 · 引句/谶言/奏对/体性诗池完整')

  // 2) 干支双计：干喜支忌 → 弱顺；干忌支平 → 留意
  const y2 = { favorable: ['金'], unfavorable: ['火'], tiaohouYong: [] }
  assert(Daily.dayHit(y2, '金', '火', '庚').hit === 'xi', '干喜支忌应为弱顺')
  assert(Daily.dayHit(y2, '火', '土', '丙').hit === 'ji', '干忌应为留意')
  assert(Daily.dayHit(y2, '土', '火', '戊').hit === 'ji', '支忌应拉低为留意')
  // 调候按「用神字」精确命中，且优先于忌；同五行异字不算
  const y3 = { favorable: [], unfavorable: ['木'], tiaohouYong: ['甲'] }
  assert(Daily.dayHit(y3, '木', '木', '甲').hit === 'tiaohou', '调候字命中应优先于忌')
  assert(Daily.dayHit(y3, '木', '木', '乙').hit === 'ji', '同五行异字不应算调候')
  console.log('  ✓ 顺逆判定：干0.6/支0.4 双计 · 调候按字命中且优先')

  // 3) 同日稳定、隔日轮换
  const d1 = { year: 2026, month: 7, day: 2 }, d2 = { year: 2026, month: 7, day: 3 }
  assert(Daily.pickQuote('七杀', d1).t === Daily.pickQuote('七杀', d1).t, '同日引句应稳定')
  const t1 = Daily.dailyText(chart, st, yong, Engine.buildDay(d1))
  const t1b = Daily.dailyText(chart, st, yong, Engine.buildDay(d1))
  assert(t1.quote.t === t1b.quote.t && t1.zhen.zou === t1b.zhen.zou, '同日全量输出应稳定')
  console.log('  ✓ 同日稳定；示例谶言：', t1.zhen.chen.join('，'), '/', t1.zhen.zou.slice(0, 18) + '…')

  // 4) 文案随日变化（60 天内至少出现 3 种不同主题）
  const themes = new Set()
  for (let i = 0; i < 60; i++) {
    const dt = new Date(2026, 6, 2 + i)
    const dd = Engine.buildDay({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
    themes.add(Daily.dailyText(chart, st, yong, dd).theme)
  }
  assert(themes.size >= 6, '60 天主题种类过少: ' + themes.size)
  console.log('  ✓ 60 天出现', themes.size, '种主题')

  // 5) 关系合并去重：同型同字只出现一条，且富文本不再逐条带尾巴
  const dd0 = Engine.buildDay({ year: 2026, month: 7, day: 2 }) // 丁丑日：年午/月午 与 丑 相害 ×2 → 应并 1 条
  const md = Interpret.mergedDayRelations(chart, dd0)
  const haiCount = md.relations.filter((x) => x.type === '害').length
  assert(haiCount === 1, '午丑相害应合并为 1 条，实得 ' + haiCount)
  const boiler = '流日只主一天'
  assert(md.relations.every((x) => x.rich.indexOf(boiler) < 0), '富文本不应逐条带尾巴')
  assert(md.tail.indexOf(boiler) >= 0, '尾注应集中出现一次')
  console.log('  ✓ 关系合并：害×2 → 1 条；尾注一次化')
  md.relations.forEach((x) => console.log('    [' + x.type + '] ' + x.rich))
  console.log('    尾注:', md.tail.slice(0, 60) + '…')

  // 6) dayScore 打点分类与 dayHit 一致
  assert(['tiaohou', 'xi', 'ping', 'ji'].indexOf(Daily.dayScore(dd0.liuriGan, dd0.liuriZhi, yong)) >= 0, 'dayScore 分类非法')
  console.log('  ✓ dayScore 分类合法')

  // 7) 悬停贴士 termHint：两段式（通义 + 于你/臣曰）
  require(resolve(root, 'js/knowledge.js'))
  const ctx = { chart, st, yong }
  const h1 = Daily.termHint('hint', '调候日', ctx)
  assert(h1 && h1.what.includes('穷通宝鉴') && h1.you.includes(yong.tiaohouYong.join('')) && h1.chen.includes('臣'), '调候日贴士不完整')
  const h2 = Daily.termHint('shishen', '七杀', ctx)
  assert(h2 && h2.what && h2.you.includes('日主' + chart.dayMaster.gan) && h2.chen.startsWith('臣曰'), '七杀个性化贴士不完整')
  const h3 = Daily.termHint('wuxing', '火', ctx)
  assert(h3 && h3.you.includes('忌神'), '五行贴士应标出火=忌神')
  ;['顺', '平', '留意', '身强', '身弱', '中和'].forEach((k) => assert(Daily.termHint('hint', k, ctx), k + ' 贴士缺失'))
  console.log('  ✓ 悬停贴士：调候日/顺逆/身强弱 + 十神五行个性化（含臣曰）')
  console.log('    示例·七杀贴士:', h2.you, h2.chen)

  // 8) 化机指数：界内、分档、部件齐全、同日稳定、忌日低于中平
  {
    const dJi = Engine.buildDay({ year: 2026, month: 7, day: 2 }) // 丁丑 · 忌日
    const ix = Daily.dayIndex(chart, st, yong, dJi)
    assert(ix && ix.score >= 6 && ix.score <= 97, '指数越界')
    assert(['昂扬', '顺畅', '平稳', '收敛', '蛰养'].includes(ix.band), '分档名非法')
    assert('fit' in ix.parts && 'layers' in ix.parts && 'motion' in ix.parts, '指数部件缺失')
    assert(ix.score < 50, '忌日指数应低于中平，实得 ' + ix.score)
    const ix2 = Daily.dayIndex(chart, st, yong, dJi)
    assert(ix2.score === ix.score, '同日指数应稳定')
    assert(Daily.termHint('hint', '化机指数', ctx), '化机指数贴士缺失')
    console.log('  ✓ 化机指数：', ix.score, ix.band, JSON.stringify(ix.parts))
  }

  // 9) 节日：库节日（含浮动）+ 自建美国节日表
  {
    const f = (y, m, d) => Engine.buildDay({ year: y, month: m, day: d }).festivals.map((x) => x.kind + ':' + x.name).join('|')
    assert(f(2026, 10, 1).includes('cn:国庆节'), '国庆节缺失')
    assert(f(2026, 2, 17).includes('cn:春节'), '春节缺失')
    assert(f(2026, 6, 19).includes('cn:端午节'), '端午节缺失')
    assert(f(2026, 11, 26).includes('west:感恩节'), '感恩节缺失(4th Thu)')
    assert(f(2026, 5, 10).includes('west:母亲节'), '母亲节缺失(2nd Sun)')
    assert(f(2026, 7, 4).includes('west:美国独立日'), '独立日缺失')
    assert(f(2026, 1, 19).includes('west:马丁路德金日'), 'MLK日缺失(3rd Mon)')
    assert(f(2026, 5, 25).includes('west:阵亡将士日'), '阵亡将士日缺失(last Mon)')
    assert(f(2026, 9, 7).includes('west:美国劳工节'), '美国劳工节缺失(1st Mon)')
    assert(f(2026, 12, 25).includes('west:圣诞节'), '圣诞节缺失')
    assert(!f(2026, 5, 18) || !f(2026, 5, 18).includes('阵亡将士'), '非末周一不应有阵亡将士日')
    const md = Engine.monthDays(2026, 7).find((x) => x.day === 4)
    assert(md.fest && md.fest.name === '美国独立日', 'monthDays 未带节日')
    console.log('  ✓ 节日：国庆/春节/端午 + 感恩/母亲/独立/MLK/阵亡将士/劳工/圣诞（含浮动规则）')
  }
}

console.log('\nLOGIC OK')
