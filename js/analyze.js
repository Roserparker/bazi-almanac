/*
 * analyze.js · 身强弱（旺衰量化）+ 用神（扶抑为主 + 穷通宝鉴调候提示）
 * 依《滴天髓》中和扶抑、旺相休囚死；《穷通宝鉴》调候。一切标「参考」。
 * 依赖 window.Engine。
 */
;(function (root) {
  'use strict'
  var E = root.Engine

  var MONTH_RULER = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' }
  var GEN_OF = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }   // 生我（印）
  var SHENG_OF = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' } // 我生（食伤）
  var KE_OF = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }    // 我克（财）
  var KEW_OF = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }   // 克我（官杀）

  // 日主元素 dm 在「当令元素 w」下的旺相休囚死
  function wangShuai(dm, w) {
    if (dm === w) return '旺'
    if (E.generates(w, dm)) return '相' // 当令生我
    if (E.generates(dm, w)) return '休' // 我生当令
    if (E.controls(dm, w)) return '囚'  // 我克当令
    if (E.controls(w, dm)) return '死'  // 当令克我
    return ''
  }
  // other 相对 dm 是 帮（印/比劫）还是 耗（食伤/财/官杀）
  function group(dm, other) {
    if (other === dm) return '比劫'
    if (E.generates(other, dm)) return '印'
    if (E.generates(dm, other)) return '食伤'
    if (E.controls(dm, other)) return '财'
    if (E.controls(other, dm)) return '官杀'
    return ''
  }
  var IS_HELP = { 比劫: 1, 印: 1 }

  // 身强弱：量化帮身 vs 耗身（月令权重最大）
  function strength(chart) {
    var dm = chart.dayMaster.wuxing
    var p = chart.pillars
    var ruler = MONTH_RULER[p.month.zhi]
    var ws = wangShuai(dm, ruler)
    var helps = 0, drains = 0
    var wsScore = { 旺: 3, 相: 1.5, 休: -1, 囚: -2, 死: -2.5 }[ws] || 0
    if (wsScore >= 0) helps += wsScore; else drains += -wsScore

    var slots = [
      { el: E.GAN_WUXING[p.year.gan], w: 1 },
      { el: E.GAN_WUXING[p.month.gan], w: 1.2 },
      { el: E.GAN_WUXING[p.time.gan], w: 1 },
      { el: E.ZHI_WUXING[p.year.zhi], w: 1.2 },
      { el: E.ZHI_WUXING[p.month.zhi], w: 2.5 }, // 月支最重
      { el: E.ZHI_WUXING[p.day.zhi], w: 2 },     // 日支（坐下）
      { el: E.ZHI_WUXING[p.time.zhi], w: 1.2 }
    ]
    slots.forEach(function (s) {
      if (IS_HELP[group(dm, s.el)]) helps += s.w; else drains += s.w
    })
    var total = helps + drains
    var ratio = total ? helps / total : 0.5
    var label = ratio >= 0.58 ? '身强' : ratio >= 0.52 ? '偏强' : ratio >= 0.46 ? '中和' : ratio >= 0.4 ? '偏弱' : '身弱'
    return {
      dm: dm, ws: ws, ruler: ruler, deLing: ws === '旺' || ws === '相',
      helps: Math.round(helps * 10) / 10, drains: Math.round(drains * 10) / 10,
      ratio: ratio, label: label
    }
  }

  // 用神：扶抑（依身强弱）为主 + 穷通宝鉴调候提示
  function yongShen(chart, st) {
    var dm = chart.dayMaster.wuxing
    var strong = st.ratio >= 0.5
    var fav, avoid
    if (strong) { fav = [SHENG_OF[dm], KE_OF[dm], KEW_OF[dm]]; avoid = [GEN_OF[dm], dm] }
    else { fav = [GEN_OF[dm], dm]; avoid = [SHENG_OF[dm], KE_OF[dm], KEW_OF[dm]] }

    var mz = chart.pillars.month.zhi, th = ''
    if ('亥子丑'.indexOf(mz) >= 0) th = '生于冬月、天寒，调候喜火暖局'
    else if ('巳午未'.indexOf(mz) >= 0) th = '生于夏月、火炎，调候喜水润局'
    else if ('寅卯'.indexOf(mz) >= 0) th = '初春余寒，调候喜丙火向阳'
    else if ('申酉戌'.indexOf(mz) >= 0) th = '秋月金旺，调候多喜火炼或水润（视燥湿）'
    else th = '辰戌丑未月土旺，视寒暖燥湿酌定调候'

    return {
      strong: strong, favorable: fav, unfavorable: avoid,
      method: '扶抑（依身强弱）', tiaohou: th,
      note: '用神判定有流派分歧，此为「扶抑 + 调候」的粗估，仅供参考；穷通宝鉴全本调候表为二期精修。'
    }
  }

  var Analyze = { strength: strength, yongShen: yongShen, wangShuai: wangShuai, group: group }
  root.Analyze = Analyze
  if (typeof module !== 'undefined' && module.exports) module.exports = Analyze
})(typeof window !== 'undefined' ? window : globalThis)
