/*
 * btc.js · BTC 观象台数据层
 * 「资产即生命」：给 BTC 排创世八字（师承匿名博士 Chris_Defi 的通行锚点——
 * 创世块 2009-01-03 18:15:05 UTC，换算北京时间 2009-01-04 02:15 丑时），
 * 得 戊子 甲子 己酉 乙丑：日元己土（田园之土），子月身弱财旺，喜火土、忌金水木。
 * 时代层不用个人大运（顺逆凭性别，于资产无义），改用三元九运：九紫离火运 2024–2043，
 * 火为己土之印——「火运生身」是长期底色；入模以「丙午」作九运的干支象征映射。
 * 输出：今日指数（复用 dayIndex v2，含 BTC 自己的紫微盘流曜）+ 未来七日走向 + 免责。
 * 一切是文化模型的参考视角——非投资建议、非吉凶断言。依赖 Engine/Analyze/Daily/(Ziwei)。
 */
;(function (root) {
  'use strict'

  var BIRTH = { year: 2009, month: 1, day: 4, hour: 2, minute: 15, gender: 1 }
  var EPOCH = {
    gz: '丙午', name: '九紫离火运', years: '2024–2043',
    note: '三元九运之九运，离火当令——火正是 BTC 己土日元的印星，火运生身；虚拟经济属火，与其气相合（师承匿名博士框架）。'
  }
  var cache = null

  function ensure() {
    if (cache) return cache
    var E = root.Engine, A = root.Analyze
    var chart = E.buildChart(BIRTH)
    var st = A.strength(chart)
    var yong = A.yongShen(chart, st)
    var zw = null
    try { if (root.Ziwei) zw = root.Ziwei.buildFromBirth(BIRTH) } catch (e) { zw = null }
    cache = { chart: chart, st: st, yong: yong, zw: zw }
    return cache
  }

  // 某日的 BTC 化机指数（dayIndex v2：时代层用九运丙午，紫微流曜用 BTC 创世紫微盘）
  function indexOf(day) {
    var c = ensure()
    return root.Daily.dayIndex(c.chart, c.st, c.yong, day, { zw: c.zw, epochGz: EPOCH.gz })
  }

  // 未来 7 日（含今天）指数序列
  function weekSeries(from) {
    var E = root.Engine
    var out = []
    var base = from ? new Date(from.year, from.month - 1, from.day) : new Date()
    for (var i = 0; i < 7; i++) {
      var dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
      var day = E.buildDay({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
      var ix = indexOf(day)
      out.push({
        ymd: day.solarYmd, weekday: day.weekday, gz: day.liuri,
        score: ix.score, band: ix.band, isToday: i === 0
      })
    }
    return out
  }

  // 一句周评：节奏 + 峰谷（克制表述，非预测承诺）
  function weekComment(series) {
    var n = series.length
    var head = 0, tail = 0
    for (var i = 0; i < n; i++) { if (i < n / 2) head += series[i].score; else tail += series[i].score }
    head /= Math.ceil(n / 2); tail /= Math.floor(n / 2)
    var max = series[0], min = series[0]
    series.forEach(function (s) { if (s.score > max.score) max = s; if (s.score < min.score) min = s })
    var shape = tail - head > 6 ? '先抑后扬' : head - tail > 6 ? '先扬后抑' : '大体持平'
    var avg = series.reduce(function (a, s) { return a + s.score }, 0) / n
    var level = avg >= 58 ? '整体偏顺' : avg <= 43 ? '整体偏敛' : '整体平稳'
    return level + '、节奏' + shape + '：' + max.weekday + '（' + max.gz + '）气最扬，' + min.weekday + '（' + min.gz + '）宜守敛。'
  }

  // 今日与 BTC 命局的合冲刑害（不带个人宫位尾注——宫位义为人设）
  function relationsOf(day) {
    var c = ensure()
    return root.Interpret.mergedDayRelations(c.chart, day).relations
  }

  var COPY = {
    lineage: '排盘锚点师承匿名博士 @Chris_Defi：创世块 2009-01-03 18:15:05 UTC，取北京时间 2009-01-04 02:15 丑时——「出生时刻」的选取本有主观性，换锚点结论会变。',
    wuxing: 'BTC 五行属性：本站以日元论——己土（田园之土，蓄藏生养）；民间亦有「数字黄金属金」之说，两说并存，此处从日元。',
    disclaimer: '以上全部为传统玄学模型的文化推演，用于观照周期与心态——非投资建议，不构成任何交易依据。玄学定频率，盈亏比在人。'
  }

  var BTC = { BIRTH: BIRTH, EPOCH: EPOCH, ensure: ensure, indexOf: indexOf, weekSeries: weekSeries, weekComment: weekComment, relationsOf: relationsOf, COPY: COPY }
  root.BTC = BTC
  if (typeof module !== 'undefined' && module.exports) module.exports = BTC
})(typeof window !== 'undefined' ? window : globalThis)
