/*
 * app.js · 状态、事件与装配（瘦身版）
 * 渲染逻辑在 js/ui/*.js（format / popups / almanac / personal / learn），本文件只管：
 * state、localStorage、事件委托、表单、初始化。
 */
;(function () {
  'use strict'

  var E = window.Engine, A = window.Analyze
  var UI = window.UI, F = UI.fmt, P = UI.popups
  var STORAGE_KEY = 'huaji.birth'

  var state = {
    birth: load(),
    chart: null, st: null, yong: null, zw: null,
    sel: F.assign({}, F.TODAY),
    cal: { year: F.TODAY.year, month: F.TODAY.month }
  }

  function save(b) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)) } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch (e) { return null } }
  function wipe() { try { localStorage.removeItem(STORAGE_KEY) } catch (e) {} }

  function refreshChart() {
    state.chart = state.st = state.yong = state.zw = null
    if (!state.birth) return
    try {
      state.chart = E.buildChart(state.birth)
      state.st = A.strength(state.chart)
      state.yong = A.yongShen(state.chart, state.st)
    } catch (e) {
      // 生辰数据损坏/旧格式 → 清掉，避免整站启动崩溃
      state.chart = state.st = state.yong = null
      state.birth = null; wipe()
    }
    // 紫微盘（辅）——排盘失败不拖累八字主线
    try { if (state.birth && window.Ziwei) state.zw = window.Ziwei.buildFromBirth(state.birth) } catch (e2) { state.zw = null }
  }

  function renderAll() {
    UI.dashboard.renderDashboard(state)
    UI.almanac.renderAlmanac(state)
    UI.personal.renderPersonal(state)
    if (UI.ziwei) UI.ziwei.renderZiwei(state)
    if (UI.btc) UI.btc.renderBTC(state)
  }

  // 「今天」跨夜刷新：页面开过午夜或次日回到前台时，F.TODAY 与各卡片跟着换日
  function tickToday() {
    var now = new Date()
    if (now.getFullYear() === F.TODAY.year && now.getMonth() + 1 === F.TODAY.month && now.getDate() === F.TODAY.day) return
    var wasToday = F.same(state.sel, F.TODAY)
    F.assign(F.TODAY, { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
    if (wasToday) {
      state.sel = F.assign({}, F.TODAY)
      state.cal = { year: F.TODAY.year, month: F.TODAY.month }
    }
    renderAll()
  }
  setInterval(tickToday, 60000)
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tickToday() })

  // ======== 录入区 ========
  function renderIntake() {
    var form = document.getElementById('birth-form')
    var sum = document.getElementById('intake-summary')
    if (state.birth) {
      var b = state.birth
      form.hidden = true
      sum.hidden = false
      sum.innerHTML =
        '<span class="who">' + F.ymd(b) + ' ' + F.pad2(b.hour) + ':' + F.pad2(b.minute) + ' · ' + (b.gender === 1 ? '男' : '女') + '</span>' +
        '<button class="link-btn" data-action="reedit">重新输入</button>' +
        '<button class="link-btn" data-action="clear">清除数据</button>'
    } else {
      form.hidden = false
      sum.hidden = true
    }
  }

  // ======== 事件 ========
  // 选中格墨晕微互动（重渲染后在新 .sel 格上荡开一圈石青水波）
  function rippleSel() {
    var cell = document.querySelector('.cal-cell.sel')
    if (!cell) return
    var r = document.createElement('span')
    r.className = 'ripple'
    r.addEventListener('animationend', function () { r.remove() })
    cell.appendChild(r)
  }
  // 方向键选日（←→ ±1 天，↑↓ ±7 天，可跨月）
  function moveSel(delta) {
    var d = new Date(state.sel.year, state.sel.month - 1, state.sel.day + delta)
    state.sel = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
    state.cal = { year: state.sel.year, month: state.sel.month }
    renderAll()
    var cell = document.querySelector('.cal-cell.sel')
    if (cell) cell.focus({ preventScroll: true })
    rippleSel()
  }
  function handleAction(action, ds) {
    if (action === 'selectDay') {
      state.sel = { year: state.cal.year, month: state.cal.month, day: Number(ds.day) }
      renderAll()
      rippleSel()
    } else if (action === 'prevMonth' || action === 'nextMonth') {
      var m = state.cal.month + (action === 'nextMonth' ? 1 : -1), y = state.cal.year
      if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
      state.cal = { year: y, month: m }
      UI.almanac.renderAlmanac(state)
    } else if (action === 'today') {
      state.cal = { year: F.TODAY.year, month: F.TODAY.month }
      state.sel = F.assign({}, F.TODAY)
      renderAll()
    } else if (action === 'reedit') {
      var b = state.birth
      if (b) {
        document.getElementById('f-date').value = F.ymd(b)
        document.getElementById('f-time').value = F.pad2(b.hour) + ':' + F.pad2(b.minute)
        var r = document.querySelector('input[name=gender][value="' + b.gender + '"]'); if (r) r.checked = true
      }
      state.birth = null; refreshChart(); renderIntake(); renderAll()
      document.getElementById('intake').scrollIntoView({ behavior: 'smooth' })
    } else if (action === 'clear') {
      wipe(); state.birth = null; refreshChart(); renderIntake(); renderAll()
    } else if (action === 'gotoIntake') {
      location.hash = '#/personal'
      requestAnimationFrame(function () { document.getElementById('intake').scrollIntoView({ behavior: 'smooth' }) })
    } else if (action === 'closePop') {
      P.closeTerm()
    } else if (action === 'zwPrev' || action === 'zwNext') {
      // 紫微日期条翻日：与万年历共用选定日
      var keep = document.getElementById('ziwei')
      var top = keep ? keep.getBoundingClientRect().top : null
      moveSel(action === 'zwPrev' ? -1 : 1)
      if (top !== null) { var el2 = document.getElementById('ziwei'); if (el2) window.scrollBy(0, el2.getBoundingClientRect().top - top) }
    } else if (action === 'zwLayer') {
      if (UI.ziwei) { UI.ziwei.setLayer(ds.layer); UI.ziwei.renderZiwei(state) }
    } else if (action === 'hideGuide') {
      var g = document.getElementById('guide')
      if (g) g.hidden = true
      try { localStorage.setItem('huaji.guide', 'hidden') } catch (e3) {}
    }
  }

  document.addEventListener('click', function (e) {
    var arc = e.target.closest && e.target.closest('.rel-arc')
    if (arc) { var La = UI.personal.relLayersAt(arc.dataset.rel); if (La) P.showPop(P.relPopHTML(La), e.clientX, e.clientY); P.hideTip(); e.stopPropagation(); return }
    var t = e.target.closest('.term')
    if (t) { P.openTerm(t.dataset.kind, t.dataset.key, e.clientX, e.clientY); e.stopPropagation(); return }
    var hd = e.target.closest('[data-hint], [data-gz]')
    if (hd) { var x = hintOf(hd); if (x) P.showPop(P.hintPopHTML(x.h, x.title), e.clientX, e.clientY); P.hideTip(); e.stopPropagation(); return }
    var zc = e.target.closest('.zw-cell')
    if (zc && zc.dataset.zhi !== undefined && UI.ziwei) {
      P.showPop(UI.ziwei.onPalaceClick(Number(zc.dataset.zhi)), e.clientX, e.clientY)
      P.hideTip(); e.stopPropagation(); return
    }
    var a = e.target.closest('[data-action]')
    if (a) { e.preventDefault(); handleAction(a.dataset.action, a.dataset); return }
    if (!e.target.closest('#pop')) P.closeTerm()
    P.hideTip()
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { P.closeTerm(); P.hideTip(); return }
    // 焦点在日历格上时，方向键巡日（可跨月）
    if (e.target && e.target.classList && e.target.classList.contains('cal-cell')) {
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
      if (step) { e.preventDefault(); moveSel(step) }
    }
  })
  // 万年历 年/月 快跳
  document.addEventListener('change', function (e) {
    if (e.target.id === 'cal-y' || e.target.id === 'cal-m') {
      var ys = document.getElementById('cal-y'), ms = document.getElementById('cal-m')
      if (ys && ms) { state.cal = { year: Number(ys.value), month: Number(ms.value) }; UI.almanac.renderAlmanac(state) }
    }
  })

  // 悬停贴士：关系连线看 L1/L2；专业名词（.term / [data-hint]）看「通义 + 于你·臣曰」
  function hintCtx() { return { chart: state.chart, st: state.st, yong: state.yong } }
  function hintOf(el) {
    if (!window.Daily) return null
    var kind, key, title
    if (el.dataset.gz) { kind = 'gzwx'; key = el.dataset.gz; title = key + ' · 五行' }
    else if (el.dataset.hint) { kind = 'hint'; key = el.dataset.hint; title = key }
    else { kind = el.dataset.kind; key = el.dataset.key; title = key }
    var h = window.Daily.termHint(kind, key, hintCtx())
    return h ? { h: h, title: title } : null
  }
  document.addEventListener('mouseover', function (e) {
    if (!e.target.closest) return
    var g = e.target.closest('.rel-arc')
    if (g) { var L = UI.personal.relLayersAt(g.dataset.rel); if (L) P.showTip(P.tipShortHTML(L), e); return }
    var t = e.target.closest('.term, [data-hint], [data-gz]')
    if (t) { var x = hintOf(t); if (x) P.showTip(P.hintTipHTML(x.h, x.title), e) }
  })
  document.addEventListener('mousemove', function (e) {
    if (P.tipShowing()) { if (e.target.closest && e.target.closest('.rel-arc, .term, [data-hint], [data-gz]')) P.positionTip(e); else P.hideTip() }
  })

  document.getElementById('birth-form').addEventListener('submit', function (e) {
    e.preventDefault()
    var dv = document.getElementById('f-date').value
    var tv = document.getElementById('f-time').value || '12:00'
    if (!dv) return
    var dp = dv.split('-').map(Number), tp = tv.split(':').map(Number)
    var g = document.querySelector('input[name=gender]:checked')
    state.birth = { year: dp[0], month: dp[1], day: dp[2], hour: tp[0], minute: tp[1] || 0, gender: g ? Number(g.value) : 1 }
    save(state.birth)
    refreshChart()
    renderIntake(); renderAll()
    location.hash = '#/dashboard'
    window.scrollTo(0, 0)
  })

  // ======== 视图路由（#/board 一板一页；旧锚点自动映射） ========
  var VIEWS = { dashboard: 1, almanac: 1, personal: 1, ziwei: 1, btc: 1, learn: 1 }
  var VIEW_ALIAS = { yixue: 'learn', intake: 'personal', guide: 'dashboard', today: 'dashboard' }
  function viewFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '')
    if (VIEWS[h]) return h
    if (VIEW_ALIAS[h]) return VIEW_ALIAS[h]
    return 'dashboard'
  }
  function setView(v) {
    document.body.setAttribute('data-view', v)
    var links = document.querySelectorAll('.topnav a')
    for (var i = 0; i < links.length; i++) links[i].classList.toggle('on', links[i].getAttribute('href') === '#/' + v)
    window.scrollTo(0, 0)
    P.closeTerm(); P.hideTip()
    if (F.animateScores) F.animateScores()
  }
  window.addEventListener('hashchange', function () { setView(viewFromHash()) })

  // ======== 初始化 ========
  refreshChart()
  UI.learn.renderLearn()
  UI.learn.renderYixue()
  renderIntake()
  renderAll()
  setView(viewFromHash())
  // 导览卡：收起状态记本机
  try {
    if (localStorage.getItem('huaji.guide') === 'hidden') {
      var gd = document.getElementById('guide')
      if (gd) gd.hidden = true
    }
  } catch (e4) {}
})()
