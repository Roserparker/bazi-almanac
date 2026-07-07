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
require(resolve(root, 'js/ziwei.js'))
require(resolve(root, 'js/liuyao.js'))
require(resolve(root, 'js/qimen.js'))
require(resolve(root, 'js/daily.js'))
require(resolve(root, 'js/btc.js'))

const { Engine, Interpret, Analyze, Daily, Ziwei, Liuyao, Qimen, BTC } = globalThis
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

console.log('\n=== 调候表完整性（10 干 × 12 支）===')
{
  const A = require(resolve(root, 'js/analyze.js'))
  const ZHIS = '子丑寅卯辰巳午未申酉戌亥'.split('')
  '甲乙丙丁戊己庚辛壬癸'.split('').forEach((g) => {
    ZHIS.forEach((z) => {
      const th = A.tiaoHou(g, z)
      assert(th.chars.length >= 1, `调候表缺格: ${g}×${z}`)
      th.chars.forEach((c) => assert('甲乙丙丁戊己庚辛壬癸'.indexOf(c) >= 0, `调候表非法字: ${g}×${z}=${c}`))
    })
  })
  console.log('  ✓ 调候 120 格齐备，字符皆天干')
}

console.log('\n=== 紫微斗数引擎 ===')
{
  // 1) 安紫微公式（全书标准表 spot check）
  const zp = (ju, day) => '子丑寅卯辰巳午未申酉戌亥'[Ziwei.ziweiPos(ju, day)]
  assert(zp(2, 1) === '丑' && zp(2, 2) === '寅' && zp(2, 3) === '寅' && zp(2, 4) === '卯' && zp(2, 5) === '卯', '水二局安紫微不符')
  assert(zp(6, 1) === '酉' && zp(6, 2) === '午', '火六局安紫微不符')
  assert(zp(3, 3) === '寅' && zp(4, 4) === '寅' && zp(5, 5) === '寅', '各局「日数=局数」应在寅')
  // 2) 纳音公式 spot check
  assert(Ziwei.naYinElement(0, 0) === '金' && Ziwei.naYinElement(2, 2) === '火' && Ziwei.naYinElement(8, 8) === '金', '纳音公式不符')
  // 3) BTC 创世紫微盘（锁定回归）
  const bzw = Ziwei.buildFromBirth({ year: 2009, month: 1, day: 4, hour: 2, minute: 15, gender: 1 })
  assert(bzw.mingZhi === '子' && bzw.juName === '金四局' && bzw.mingZhu === '贪狼' && bzw.shenZhu === '火星', 'BTC 紫微盘回归: ' + bzw.mingZhi + bzw.juName)
  // 4) 十四主星必然齐备且各安一宫
  const cnt = {}
  for (let z = 0; z < 12; z++) (bzw.starsByZhi[z] || []).forEach((s) => { if (s.major) cnt[s.name] = (cnt[s.name] || 0) + 1 })
  assert(Object.keys(cnt).length === 14 && Object.values(cnt).every((v) => v === 1), '十四主星应各安一宫')
  // 5) 流曜四化：分数界内、四星俱列
  const fs = Ziwei.flowSiHua(bzw, '辛')
  assert(fs && fs.list.length === 4 && fs.score >= -1 && fs.score <= 1, '流曜四化异常')
  // 6) iztro 交叉验证（devDependency，缺席则跳过；身主午年为流派差异豁免）
  let iz = null
  try { iz = require('iztro') } catch (e) { console.log('  · iztro 未安装，跳过交叉验证') }
  if (iz) {
    const HOUR_OF = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
    const CASES = [[2000, 8, 16, 2], [1990, 6, 15, 7], [1985, 1, 30, 0], [2009, 1, 4, 1], [1977, 11, 8, 10], [1996, 3, 3, 5], [2003, 12, 25, 11], [1988, 2, 17, 4], [2015, 7, 1, 9], [1962, 10, 5, 6]]
    const STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军', '左辅', '右弼', '文昌', '文曲', '禄存', '天马', '擎羊', '陀罗', '天魁', '天钺', '火星', '铃星', '地空', '地劫', '红鸾', '天喜']
    for (const [y, m, d, t] of CASES) {
      const mine = Ziwei.buildFromBirth({ year: y, month: m, day: d, hour: HOUR_OF[t], minute: 30, gender: 1 })
      const theirs = iz.astro.bySolar(`${y}-${m}-${d}`, t, '男', false, 'zh-CN')
      const tMap = {}
      theirs.palaces.forEach((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].forEach((s) => { tMap[s.name] = p.earthlyBranch }))
      const mMap = {}
      for (let z = 0; z < 12; z++) (mine.starsByZhi[z] || []).forEach((s) => { mMap[s.name] = Ziwei.ZHI[z] })
      STARS.forEach((s) => { if (tMap[s]) assert(mMap[s] === tMap[s], `${y}-${m}-${d} ${s}: 我${mMap[s]} 彼${tMap[s]}`) })
      assert(mine.mingZhi === theirs.palaces.find((p) => p.name === '命宫').earthlyBranch, `${y}-${m}-${d} 命宫不符`)
      assert(mine.shenZhi === theirs.palaces.find((p) => p.isBodyPalace).earthlyBranch, `${y}-${m}-${d} 身宫不符`)
      assert(mine.juName === theirs.fiveElementsClass, `${y}-${m}-${d} 五行局不符`)
      assert(mine.mingZhu === theirs.soul, `${y}-${m}-${d} 命主不符`)
      const tHua = {}
      theirs.palaces.forEach((p) => [...p.majorStars, ...p.minorStars].forEach((s) => { if (s.mutagen) tHua[s.name] = '化' + s.mutagen }))
      for (let z = 0; z < 12; z++) (mine.starsByZhi[z] || []).forEach((s) => { if (s.hua) assert(tHua[s.name] === s.hua, `${y}-${m}-${d} 四化不符: ${s.name}`) })
    }
    console.log('  ✓ iztro 交叉验证 10 组生辰：30 星落宫 / 命身宫 / 五行局 / 命主 / 生年四化 全合')
  }
  console.log('  ✓ 紫微：安星公式 / 纳音 / BTC 盘锁定 / 十四主星唯一 / 流曜界内')

  // 7) 流层推宫（斗君法）与当日建议
  {
    // 恒等式：正月生子时 → 斗君 = 流年宫（全书诀自明）
    const zw1 = Ziwei.buildFromLunar(0, 0, 1, 15, 0)
    const fl1 = Ziwei.flowLayers(zw1, { year: 2026, month: 7, day: 6 })
    assert(fl1.douJun === fl1.nian.gong, '正月子时生人斗君应即太岁宫')
    const zw2 = Ziwei.buildFromBirth(birth)
    const fl2 = Ziwei.flowLayers(zw2, { year: 2026, month: 7, day: 6 })
    assert(fl2.yue.gan + fl2.yue.zhi === '甲午', '2026 农历五月流月干支应为甲午(五虎遁): ' + fl2.yue.gan + fl2.yue.zhi)
    assert(fl2.ri.gan + fl2.ri.zhi === '辛巳', '流日干支应同日柱')
    // 流日宫逐日顺行
    let prevG = null, okSeq = true
    for (let dd = 6; dd <= 10; dd++) {
      const f = Ziwei.flowLayers(zw2, { year: 2026, month: 7, day: dd })
      if (prevG !== null && f.ri.gong !== (prevG + 1) % 12) okSeq = false
      prevG = f.ri.gong
    }
    assert(okSeq, '流日宫应逐日顺行一宫')
    const ad = Ziwei.dayAdvice(zw2, { year: 2026, month: 7, day: 6 })
    assert(ad.theme.includes('流日入'), '建议主题缺失')
    assert(ad.starLines.length >= 1 && ad.starLines.every((s) => s.yi && s.ji), '星性宜忌缺失')
    assert(ad.huaLines.length === 4 && ad.huaLines.every((h) => h.text), '四化建议应四条俱全')
    assert(ad.chen.startsWith('臣观星垣'), '臣曰收束缺失')
    const ad2 = Ziwei.dayAdvice(zw2, { year: 2026, month: 7, day: 6 })
    assert(JSON.stringify(ad) === JSON.stringify(ad2), '当日建议应确定')
    console.log('  ✓ 流层推宫：斗君恒等式 / 五虎遁流月干 / 流日顺行 / 当日建议四化俱全且确定')
  }
}

console.log('\n=== 五行能量谱 + 化机指数 v2 ===')
{
  const d0 = Engine.buildDay({ year: 2026, month: 7, day: 6 })
  const en = Daily.energyProfile(d0, yong)
  const sum = ['木', '火', '土', '金', '水'].reduce((a, w) => a + en.pct[w], 0)
  assert(Math.abs(sum - 100) < 0.5, '能量谱之和应≈100，实得 ' + sum)
  assert(en.proj >= -1 && en.proj <= 1, '能量投影越界')
  assert(en.ruler === Engine.ZHI_WUXING[d0.liuyueZhi], '月令五行不符')
  // 午月火旺：喜火之命投影应为正、忌火之命应为负
  const yF = { favorable: ['火'], unfavorable: ['水'], tiaohouYong: [] }
  const yW = { favorable: ['水'], unfavorable: ['火'], tiaohouYong: [] }
  assert(Daily.energyProfile(d0, yF).proj > 0 && Daily.energyProfile(d0, yW).proj < 0, '能量投影方向错误')
  // 指数 v2：无紫微时 ziwei 为 null；带紫微时为数；层运细分齐备
  const ixA = Daily.dayIndex(chart, st, yong, d0)
  assert(ixA.parts.ziwei === null && 'energy' in ixA.parts && ixA.parts.layerDetail && 'liunian' in ixA.parts.layerDetail, '指数 v2 部件缺失')
  const zw = Ziwei.buildFromBirth(birth)
  const ixB = Daily.dayIndex(chart, st, yong, d0, { zw })
  assert(typeof ixB.parts.ziwei === 'number' && ixB.parts.ziwei >= -1 && ixB.parts.ziwei <= 1, '紫微因子异常')
  assert(ixB.score >= 6 && ixB.score <= 97 && ixB.score === Daily.dayIndex(chart, st, yong, d0, { zw }).score, '指数界内且同日稳定')
  // 时代层替代（epochGz）
  const ixC = Daily.dayIndex(chart, st, yong, d0, { epochGz: '丙午' })
  assert(ixC.parts.layerDetail.dayun !== null, 'epochGz 未生效')
  assert(Daily.termHint('hint', '化机指数', { chart, st, yong }).what.includes('五行能量'), '化机指数贴士未更新')
  assert(Daily.termHint('hint', '五行能量', {}) && Daily.termHint('hint', '紫微流曜', {}), '新因子贴士缺失')
  assert(Daily.termHint('hint', '紫微', {}) && Daily.termHint('hint', '命宫', {}), '紫微星曜/宫位贴士回落失效')
  console.log('  ✓ 能量谱归一/投影方向/指数 v2 部件/紫微因子/epochGz/贴士')

  // 化机分维 + 今日事项（黄历并入）
  {
    const zw2 = Ziwei.buildFromBirth(birth)
    const dd = Daily.dayDims(chart, st, yong, d0, { zw: zw2 })
    assert(dd && dd.ix && dd.ix.score === Daily.dayIndex(chart, st, yong, d0, { zw: zw2 }).score, '分维应内嵌同一总指数')
    const keys = ['cai', 'shiye', 'qinggan', 'chuxing', 'xueyang']
    keys.forEach((k) => {
      const v = dd.dims[k]
      assert(v && v.score >= 5 && v.score <= 98 && ['顺', '平', '缓'].includes(v.label), '分维越界: ' + k)
    })
    assert(dd.dimOrder.length === 5, '分维应五维')
    assert(dd.yi.length <= 3 && dd.huan.length <= 3, '事项应各≤3')
    dd.yi.concat(dd.huan).forEach((t) => assert(typeof t === 'string' && t.length >= 2 && t.length <= 6, '事项文案异常: ' + t))
    const dd2 = Daily.dayDims(chart, st, yong, d0, { zw: zw2 })
    assert(JSON.stringify(dd.dims) === JSON.stringify(dd2.dims) && JSON.stringify(dd.yi) === JSON.stringify(dd2.yi), '分维应同日稳定')
    // 30 天内分维应有分化（非恒等）
    let varied = false
    for (let i = 0; i < 30 && !varied; i++) {
      const dt = new Date(2026, 6, 7 + i)
      const dx = Daily.dayDims(chart, st, yong, Engine.buildDay({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() }), { zw: zw2 })
      const vals = keys.map((k) => dx.dims[k].score)
      if (Math.max(...vals) - Math.min(...vals) >= 10) varied = true
    }
    assert(varied, '30 天内分维应出现 ≥10 分的分化')
    assert(Daily.termHint('hint', '化机分维', {}), '化机分维贴士缺失')
    console.log('  ✓ 化机分维：五维界内/事项≤3/同日稳定/30天有分化/贴士')
  }
}

console.log('\n=== BTC 观象台 ===')
{
  const c = BTC.ensure()
  const p = c.chart.pillars
  const gz = ['year', 'month', 'day', 'time'].map((k) => p[k].gan + p[k].zhi).join(' ')
  assert(gz === '戊子 甲子 己酉 乙丑', 'BTC 创世八字回归: ' + gz)
  assert(c.chart.dayMaster.gan === '己' && c.st.label === '身弱', 'BTC 日元/身弱回归')
  assert(c.yong.favorable.join('') === '火土' && c.yong.unfavorable.join('') === '金水木', 'BTC 喜忌回归')
  assert(BTC.EPOCH.gz === '丙午' && BTC.EPOCH.name.includes('九紫离火'), '九运映射')
  const d0 = Engine.buildDay({ year: 2026, month: 7, day: 6 })
  const ix = BTC.indexOf(d0)
  assert(ix && ix.score >= 6 && ix.score <= 97 && typeof ix.parts.ziwei === 'number', 'BTC 指数异常')
  const wk = BTC.weekSeries({ year: 2026, month: 7, day: 6 })
  assert(wk.length === 7 && wk[0].isToday && wk.every((s) => s.score >= 6 && s.score <= 97), '周序列异常')
  const wk2 = BTC.weekSeries({ year: 2026, month: 7, day: 6 })
  assert(JSON.stringify(wk) === JSON.stringify(wk2), '周序列应确定')
  assert(typeof BTC.weekComment(wk) === 'string' && BTC.weekComment(wk).length > 10, '周评缺失')
  assert(BTC.COPY.disclaimer.includes('非投资建议'), '免责声明缺失')
  console.log('  ✓ BTC：创世盘锁定 / 喜忌 / 九运 / 指数 / 周序列确定性 / 免责')
}

console.log('\n=== 六爻引擎 ===')
{
  const gm = Liuyao.buildGongMap()
  assert(Object.keys(gm).length === 64, '八宫映射应覆盖 64 卦')
  assert(gm['乾乾'].gong === '乾' && gm['乾乾'].shi === 6, '乾为天应世6')
  assert(gm['乾巽'].gong === '乾' && gm['乾巽'].shi === 1, '天风姤应乾宫一世')
  assert(gm['离乾'].gong === '乾' && gm['离乾'].kind === '归魂' && gm['离乾'].shi === 3, '火天大有应乾宫归魂世3')
  assert(Object.keys(Liuyao.HEX64).length === 64, '64 卦数据应齐')
  Object.keys(Liuyao.HEX64).forEach((k) => { const h = Liuyao.HEX64[k]; assert(h.n && h.ci && h.su, '卦数据缺字段: ' + k) })
  const d0 = Engine.buildDay({ year: 2026, month: 7, day: 6 })
  const g1 = Liuyao.dailyGua(d0, 'BTC'), g2 = Liuyao.dailyGua(d0, 'BTC')
  assert(JSON.stringify(g1.raw) === JSON.stringify(g2.raw), '同日成卦应稳定')
  assert(g1.raw.every((v) => v >= 6 && v <= 9), '铜钱和应在 6..9')
  g1.moving.forEach((pos) => assert(g1.ben.lines[pos - 1].yang !== g1.bian.lines[pos - 1].yang, '动爻应翻转'))
  for (let i = 1; i <= 6; i++) { if (g1.moving.indexOf(i) < 0) assert(g1.ben.lines[i - 1].yang === g1.bian.lines[i - 1].yang, '静爻不应变') }
  assert(((g1.ben.shi - 1 + 3) % 6) + 1 === g1.ben.ying, '世应应相隔三位')
  // 乾为天装卦经典对照：初爻甲子水·子孙（乾宫金，金生水）
  const qian = Liuyao.zhuangGua([1, 1, 1, 1, 1, 1], '甲')
  assert(qian.lines[0].gan === '甲' && qian.lines[0].zhi === '子' && qian.lines[0].qin === '子孙', '乾初爻应甲子水子孙')
  assert(qian.lines[5].gan === '壬' && qian.lines[5].zhi === '戌' && qian.lines[5].qin === '父母', '乾上爻应壬戌土父母')
  assert(qian.lines[0].shen === '青龙', '甲日六神应自青龙起')
  assert(g1.judge && ['偏扬', '震荡', '偏抑'].includes(g1.judge.tendency) && g1.judge.reasons.length, '断卦输出异常')
  // 30 天内卦象应有变化（种子有效）
  const names = new Set()
  for (let i = 0; i < 30; i++) {
    const dt = new Date(2026, 6, 6 + i)
    const dd = Engine.buildDay({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
    names.add(Liuyao.dailyGua(dd, 'BTC').ben.hex.info.n)
  }
  assert(names.size >= 10, '30 天卦象种类过少: ' + names.size)
  console.log('  ✓ 六爻：八宫64 / 世应 / 纳甲经典对照 / 动爻翻转 / 确定性 / 30天出', names.size, '种卦')
}

console.log('\n=== 奇门遁甲引擎 ===')
{
  Object.keys(Qimen.JU).forEach((k) => {
    const s = Qimen.JU[k]
    assert(s.ju.length === 3 && s.ju.every((j) => j >= 1 && j <= 9), '局数表非法: ' + k)
  })
  assert(Object.keys(Qimen.JU).length === 24, '节气局数表应 24 节气')
  // 已知盘：2026-07-06 午时 → 夏至上元 阴遁九局，地盘 1乙…9戊，值符天心、值使开门
  const q = Qimen.build({ year: 2026, month: 7, day: 6 })
  assert(q.jieQi === '夏至' && q.yuan === '上元' && q.juName === '阴遁九局', '定局回归: ' + q.jieQi + q.yuan + q.juName)
  assert(q.dipan[9] === '戊' && q.dipan[1] === '乙' && q.dipan[5] === '壬', '阴遁九局地盘不符')
  assert(q.zhiFu.star === '天心' && q.zhiShi.door === '开门', '值符值使回归')
  // 阳遁样例：2026-12-26 → 冬至下元 阳遁四局
  const q2 = Qimen.build({ year: 2026, month: 12, day: 26 })
  assert(q2.juName === '阳遁四局' && q2.yuan === '下元', '冬至下元回归: ' + q2.juName)
  assert(q2.dipan[4] === '戊' && q2.dipan[5] === '己' && q2.dipan[3] === '乙', '阳遁四局地盘不符')
  // 八宫星/门/神各一不重（中五除外）
  for (const qq of [q, q2]) {
    const pals = [1, 2, 3, 4, 6, 7, 8, 9]
    assert(new Set(pals.map((p) => qq.tianStar[p])).size === 8, '天盘星应八宫各异')
    assert(new Set(pals.map((p) => qq.doors[p])).size === 8, '八门应各居一宫')
    assert(new Set(pals.map((p) => qq.gods[p])).size === 8, '八神应各居一宫')
    assert(qq.shengPal >= 1 && qq.shengPal <= 9 && qq.reading.bullets.length >= 2, '读盘输出异常')
  }
  console.log('  ✓ 奇门：局数表24 / 阴阳遁定局 / 地盘 / 值符值使 / 星门神唯一 / 读盘')
}

console.log('\nLOGIC OK')
