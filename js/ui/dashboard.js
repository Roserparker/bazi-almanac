/*
 * ui/dashboard.js · 首屏「今日」仪表盘
 * 录入生辰后：主题句 + 柔和顺逆刻度 + 宜/忌 + 谶言（丞相奏对）+ 经典引句 + 迷你时间层 + 折叠版通用老黄历。
 * 未录入：客观干支 + 录入 CTA。
 * 依赖 Engine / Interpret / Daily / UI.fmt / UI.almanac。挂 window.UI.dashboard。
 */
;(function () {
  'use strict'
  var E = window.Engine, D = window.Daily
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var HIT_ORDER = ['tiaohou', 'xi', 'ping', 'ji']
  var HIT_LABEL = { tiaohou: '调候', xi: '顺', ping: '平', ji: '留意' }
  var HIT_KEY = { tiaohou: '调候日', xi: '顺', ping: '平', ji: '留意' }
  function gauge(hit) {
    return '<span class="gauge">' + HIT_ORDER.map(function (h) {
      return '<span class="gp gp-' + h + (h === hit ? ' on' : '') + '" data-hint="' + HIT_KEY[h] + '">' + HIT_LABEL[h] + '</span>'
    }).join('') + '</span>'
  }

  function renderDashboard(state) {
    var folkFold = UI.almanac.folkFold
    var host = document.getElementById('dashboard')
    if (!host) return
    // 仪表盘永远说「今天」；浏览任意日请用万年历（选定日面板 + 详解卡跟随选择）
    var d = E.buildDay(F.TODAY)
    var dateLine =
      '<div class="dash-date"><b>' + d.solarYmd + '</b> ' + d.weekday + ' · 今天' +
      '<span class="dash-lunar">' + d.lunarStr + ' · 属' + d.shengXiao + (d.jieQi ? ' <span class="dp-jq">【' + d.jieQi + '】</span>' : '') + '</span>' + F.festChips(d.festivals) + '</div>'
    var gzLine =
      '<div class="dash-gz">' +
        '<span><span class="g">流年</span>' + F.gzTok(d.liunian) + '</span>' +
        '<span><span class="g">流月</span>' + F.gzTok(d.liuyue) + '</span>' +
        '<span class="dash-day"><span class="g">流日</span>' + F.gzTok(d.liuri) + '</span>' +
      '</div>'

    if (!state.chart) {
      host.innerHTML =
        '<h2 class="sect-title">今日</h2>' +
        dateLine + gzLine +
        '<div class="dash-cta"><button class="btn" data-action="gotoIntake">录入生辰 · 解锁你的每日顺逆</button>' +
        '<span class="hint">生辰只存本机，不上传</span></div>' +
        folkFold(d)
      return
    }

    var t = D.dailyText(state.chart, state.st, state.yong, d)
    var mini = UI.almanac.timeStackHTML(state.chart, state.yong, d)
    var ix = D.dayIndex ? D.dayIndex(state.chart, state.st, state.yong, d, { zw: state.zw }) : null
    var ixChip = ix ? '<span class="dash-idxchip" data-hint="化机指数">指数 <b>' + ix.score + '</b> · ' + ix.band + '</span>' : ''

    host.innerHTML =
      '<h2 class="sect-title">今日 · 化机</h2>' +
      dateLine + gzLine +
      '<div class="dash-theme">' + t.theme + '</div>' +
      '<div class="dash-hit">' + gauge(t.hit) + ixChip +
        '<span class="dash-ss">流日 ' + F.tok(d.liuriGan, E.GAN_WUXING[d.liuriGan]) + ' 为你的 ' + F.term(t.ss, 'shishen', t.ss) + '</span></div>' +
      '<div class="dash-hittext">' + t.hitText + '</div>' +
      '<div class="dash-yiji">' +
        '<div class="dy-row good"><span class="dy-k">宜</span>' + t.yi + '</div>' +
        '<div class="dy-row care"><span class="dy-k">忌</span>' + t.ji + '</div>' +
      '</div>' +
      '<blockquote class="zhen">' +
        '<div class="zhen-chen">' + t.zhen.chen.join('；') + '。</div>' +
        '<div class="zhen-zou">' + t.zhen.zou + '</div>' +
        '<div class="zhen-note">谶以取象，奏以进言——非断言，乃参谋，圣裁在君。</div>' +
      '</blockquote>' +
      '<div class="dash-quote">「' + t.quote.t + '」<span class="q-src">——《' + t.quote.s + '》</span></div>' +
      mini +
      '<div class="dash-more"><a href="#personal" class="link-btn">看今日详解与本命盘 ↓</a></div>' +
      folkFold(d)
  }

  UI.dashboard = { renderDashboard: renderDashboard }
})()
