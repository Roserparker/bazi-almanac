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

const { Engine, Interpret, Analyze } = globalThis

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

console.log('\nLOGIC OK')
