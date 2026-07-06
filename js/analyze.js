/*
 * analyze.js · 身强弱(旺相休囚死 + 藏干通根量化) + 用神(扶抑 + 穷通宝鉴调候表) + 命局病药诊断
 * 依《滴天髓》中和扶抑旺衰、《穷通宝鉴/造化元钥》调候用神、病药说。一切标「参考」。
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
  // 地支藏干（本气·中气·余气）
  var HIDE = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' }

  // 调候用神表（日干 × 月支 → 用神天干，主用在前）· 依《穷通宝鉴》本地全本 120 格逐格精校（2026-07-02）
  // 裁决原则：取判词开篇主次序（先X後Y/专用X次取Y），「或支成X局…」条件神不入表。
  // 逐格原文依据见 skill qiongtong-baojian-perspective/references/调候表-原文对照.md
  var TIAOHOU = {
    甲: { 寅: '丙癸', 卯: '庚戊丁', 辰: '庚壬', 巳: '癸丁庚', 午: '癸丁庚', 未: '丁庚癸', 申: '丁庚', 酉: '丁丙庚', 戌: '庚丁壬癸', 亥: '庚丁丙戊', 子: '丁庚丙', 丑: '庚丁' },
    乙: { 寅: '丙癸', 卯: '丙癸', 辰: '癸丙戊', 巳: '癸', 午: '癸丙', 未: '癸丙', 申: '丙癸己', 酉: '癸丙丁', 戌: '癸辛', 亥: '丙戊', 子: '丙', 丑: '丙' },
    丙: { 寅: '壬庚', 卯: '壬己', 辰: '壬甲', 巳: '壬庚癸', 午: '壬庚', 未: '壬庚', 申: '壬戊', 酉: '壬癸', 戌: '甲壬', 亥: '甲戊庚壬', 子: '壬戊己', 丑: '壬甲' },
    丁: { 寅: '甲庚', 卯: '庚甲', 辰: '甲庚', 巳: '甲庚', 午: '壬庚癸', 未: '甲壬庚', 申: '甲庚丙戊', 酉: '甲庚丙戊', 戌: '甲庚戊', 亥: '甲庚', 子: '甲庚', 丑: '甲庚' },
    戊: { 寅: '丙甲癸', 卯: '丙甲癸', 辰: '甲丙癸', 巳: '甲丙癸', 午: '壬甲丙', 未: '癸丙甲', 申: '丙癸甲', 酉: '丙癸', 戌: '甲癸丙', 亥: '甲丙', 子: '丙甲', 丑: '丙甲' },
    己: { 寅: '丙庚甲', 卯: '甲癸丙', 辰: '丙癸甲', 巳: '癸丙', 午: '癸丙', 未: '癸丙', 申: '癸丙', 酉: '癸丙辛', 戌: '甲癸丙', 亥: '丙甲戊', 子: '丙甲戊', 丑: '丙甲戊' },
    庚: { 寅: '丙甲', 卯: '丁甲庚丙', 辰: '甲丁', 巳: '壬戊丙', 午: '壬癸', 未: '丁甲', 申: '丁甲', 酉: '丁甲丙', 戌: '甲壬', 亥: '丁丙', 子: '丁甲丙', 丑: '丙丁甲' },
    辛: { 寅: '己壬庚', 卯: '壬甲', 辰: '壬甲', 巳: '壬甲癸', 午: '壬己癸', 未: '壬庚甲', 申: '壬甲戊', 酉: '壬甲', 戌: '壬甲', 亥: '壬丙', 子: '丙戊壬甲', 丑: '丙壬戊己' },
    壬: { 寅: '庚丙戊', 卯: '戊辛庚', 辰: '甲庚', 巳: '壬辛庚', 午: '癸庚辛', 未: '辛甲癸', 申: '戊丁', 酉: '甲庚', 戌: '甲丙', 亥: '戊丙庚', 子: '戊丙', 丑: '丙丁甲' },
    癸: { 寅: '辛丙', 卯: '庚辛', 辰: '丙辛甲', 巳: '辛', 午: '庚辛壬', 未: '庚辛壬癸', 申: '丁', 酉: '辛丙', 戌: '辛甲壬癸', 亥: '庚辛', 子: '丙辛', 丑: '丙丁' }
  }

  function wangShuai(dm, w) {
    if (dm === w) return '旺'
    if (E.generates(w, dm)) return '相'
    if (E.generates(dm, w)) return '休'
    if (E.controls(dm, w)) return '囚'
    if (E.controls(w, dm)) return '死'
    return ''
  }
  function group(dm, other) {
    if (other === dm) return '比劫'
    if (E.generates(other, dm)) return '印'
    if (E.generates(dm, other)) return '食伤'
    if (E.controls(dm, other)) return '财'
    if (E.controls(other, dm)) return '官杀'
    return ''
  }
  var IS_HELP = { 比劫: 1, 印: 1 }

  // 身强弱：月令(旺相休囚死) + 天干 + 地支藏干(本气重·中余气轻)量化帮/耗
  function strength(chart) {
    var dm = chart.dayMaster.wuxing
    var p = chart.pillars
    var ruler = MONTH_RULER[p.month.zhi]
    var ws = wangShuai(dm, ruler)
    var helps = 0, drains = 0
    var wsScore = { 旺: 3, 相: 1.5, 休: -1, 囚: -2, 死: -2.5 }[ws] || 0
    if (wsScore >= 0) helps += wsScore; else drains += -wsScore

    var ganW = { year: 1, month: 1.2, time: 1 } // 日干为自身不计
    ;['year', 'month', 'time'].forEach(function (k) {
      var el = E.GAN_WUXING[p[k].gan]
      if (IS_HELP[group(dm, el)]) helps += ganW[k]; else drains += ganW[k]
    })
    var zhiW = { year: 1.2, month: 2.5, day: 2, time: 1.2 } // 月支当令最重、日支坐下次之
    var canW = [1, 0.5, 0.3] // 藏干 本气 / 中气 / 余气
    ;['year', 'month', 'day', 'time'].forEach(function (k) {
      var hide = (p[k].hideGan && p[k].hideGan.length) ? p[k].hideGan : (HIDE[p[k].zhi] || '').split('')
      hide.forEach(function (g, i) {
        var el = E.GAN_WUXING[g]
        var w = zhiW[k] * (canW[i] || 0.3)
        if (IS_HELP[group(dm, el)]) helps += w; else drains += w
      })
    })
    var total = helps + drains
    var ratio = total ? helps / total : 0.5
    var label = ratio >= 0.6 ? '身强' : ratio >= 0.54 ? '偏强' : ratio >= 0.46 ? '中和' : ratio >= 0.4 ? '偏弱' : '身弱'
    return {
      dm: dm, ws: ws, ruler: ruler, deLing: ws === '旺' || ws === '相',
      helps: Math.round(helps * 10) / 10, drains: Math.round(drains * 10) / 10,
      ratio: ratio, label: label
    }
  }

  // 调候用神（穷通宝鉴）：日干 × 月支
  function tiaoHou(dayGan, monthZhi) {
    var s = (TIAOHOU[dayGan] || {})[monthZhi] || ''
    var chars = s.split('')
    var els = []
    chars.forEach(function (g) { var e = E.GAN_WUXING[g]; if (els.indexOf(e) < 0) els.push(e) })
    return { chars: chars, elements: els }
  }

  // 命局病药诊断：五行太过/不及 + 寒燥
  function diagnose(chart) {
    var c = chart.wuxingCount, order = chart.wuxingOrder
    var max = order[0], min = order[0]
    order.forEach(function (w) { if (c[w] > c[max]) max = w; if (c[w] < c[min]) min = w })
    var mz = chart.pillars.month.zhi
    var climate = '亥子丑'.indexOf(mz) >= 0 ? '寒' : '巳午未'.indexOf(mz) >= 0 ? '燥暖' : '申酉戌'.indexOf(mz) >= 0 ? '凉燥' : '温'
    var lacks = order.filter(function (w) { return c[w] === 0 })
    return { excess: max, lack: lacks, climate: climate, count: c }
  }

  function yongShen(chart, st) {
    var dm = chart.dayMaster.wuxing
    var fav, avoid, balanced = false
    if (st.ratio >= 0.54) { fav = [SHENG_OF[dm], KE_OF[dm], KEW_OF[dm]]; avoid = [GEN_OF[dm], dm] }
    else if (st.ratio <= 0.46) { fav = [GEN_OF[dm], dm]; avoid = [SHENG_OF[dm], KE_OF[dm], KEW_OF[dm]] }
    else { fav = []; avoid = []; balanced = true }

    var th = tiaoHou(chart.dayMaster.gan, chart.pillars.month.zhi)
    var diag = diagnose(chart)

    var thInFav = !balanced && th.elements.some(function (e) { return fav.indexOf(e) >= 0 })
    var thInAvoid = !balanced && th.elements.some(function (e) { return avoid.indexOf(e) >= 0 })
    var reconcile = balanced
      ? '命局中和，贵在流通；以调候之神「' + th.chars.join('') + '」润泽点缀即可。'
      : (thInFav && !thInAvoid)
        ? '调候与扶抑一致——「' + th.chars.join('') + '」既调候又扶抑，最为得力。'
        : thInAvoid
          ? '调候与扶抑相左：穷通宝鉴「调候为急」，先取调候「' + th.chars.join('') + '」救偏' + diag.climate + '，再论扶抑。'
          : '调候「' + th.chars.join('') + '」与扶抑各管一路，并用为宜。'

    var mz = chart.pillars.month.zhi
    var seasonHint = '亥子丑'.indexOf(mz) >= 0 ? '冬月天寒，喜火暖局' : '巳午未'.indexOf(mz) >= 0 ? '夏月火炎，喜水润局' : '寅卯'.indexOf(mz) >= 0 ? '初春余寒，喜丙火向阳' : '申酉戌'.indexOf(mz) >= 0 ? '秋月金旺，喜火炼或水润' : '土旺之月，视寒暖燥湿酌定'

    return {
      strong: st.ratio >= 0.54, balanced: balanced,
      favorable: fav, unfavorable: avoid,
      tiaohouYong: th.chars, tiaohouEl: th.elements,
      diag: diag, reconcile: reconcile, seasonHint: seasonHint,
      method: balanced ? '中和 · 贵流通' : '扶抑 + 调候',
      tiaohou: seasonHint,
      note: '身强弱 / 扶抑 / 调候 / 病药各一把尺，判定有流派分歧，仅供参考。'
    }
  }

  var Analyze = { strength: strength, yongShen: yongShen, tiaoHou: tiaoHou, diagnose: diagnose, wangShuai: wangShuai, group: group }
  root.Analyze = Analyze
  if (typeof module !== 'undefined' && module.exports) module.exports = Analyze
})(typeof window !== 'undefined' ? window : globalThis)
