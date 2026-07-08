/*
 * ui/format.js · UI 公共小工具与色表
 * 依赖 window.Engine（五行表）。挂 window.UI.fmt。
 */
;(function () {
  'use strict'
  var E = window.Engine
  var UI = (window.UI = window.UI || {})

  var WX = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' }
  var ELC = { 木: '#1c8551', 火: '#cf3a28', 土: '#a96a2e', 金: '#c2a13a', 水: '#1d68a6' }
  // 关系功能色（连线与图例共用同一张表）
  var REL_COLOR = { 合: '#1c8551', 三合: '#1c8551', 三会: '#1c8551', 五合: '#1c8551', 冲: '#cf3a28', 刑: '#d98a2e', 害: '#7b51c0', 破: '#9a7b50' }
  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']
  var GANSET = '甲乙丙丁戊己庚辛壬癸'

  var now = new Date()
  var TODAY = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }

  function assign(t, s) { for (var k in s) t[k] = s[k]; return t }
  function pad2(n) { return (n < 10 ? '0' : '') + n }
  function pad4(n) { return ('000' + n).slice(-4) }
  function ymd(o) { return pad4(o.year) + '-' + pad2(o.month) + '-' + pad2(o.day) }
  function same(a, b) { return a.year === b.year && a.month === b.month && a.day === b.day }
  function tok(ch, wx) {
    if (GANSET.indexOf(ch) >= 0) return '<span class="tok tok-g-' + ch + '">' + ch + '</span>'
    return '<span class="tok tok-' + WX[wx] + '">' + ch + '</span>'
  }
  function gzTok(s) { return tok(s[0], E.GAN_WUXING[s[0]]) + tok(s[1], E.ZHI_WUXING[s[1]]) }
  function term(text, kind, key) { return '<span class="term" data-kind="' + kind + '" data-key="' + key + '">' + text + '</span>' }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  function wxChip(w) { return '<span class="wx-chip wx-' + WX[w] + '">' + w + '</span>' }

  // ———— 五行状态徽记：阳=实心、阴=空心描边 ————
  // 图形：木=叶 火=焰 土=山 金=璞玉 水=滴
  var EL_PATH = {
    木: 'M10 2 C14 6.5 14 12.5 10 18 C6 12.5 6 6.5 10 2 Z',
    火: 'M10 2 C11 6 14.2 7.6 14.2 11.6 A4.6 4.6 0 0 1 5.8 11.6 C5.8 7.6 9 6 10 2 Z',
    土: 'M10 4.5 L17 15.5 H3 Z M4 17.5 H16',
    金: 'M10 2.6 L16.4 7.4 L13.8 16.8 H6.2 L3.6 7.4 Z',
    水: 'M10 3.5 C12.8 8 14.8 9.8 14.8 13 A4.8 4.8 0 0 1 5.2 13 C5.2 9.8 7.2 8 10 3.5 Z'
  }
  function elIcon(el, yy) {
    var c = ELC[el]
    var solid = yy === '阳'
    return '<svg class="wxi" viewBox="0 0 20 20" aria-label="' + yy + el + '">' +
      '<path d="' + EL_PATH[el] + '" fill="' + (solid ? c : 'none') + '" stroke="' + c + '" stroke-width="' + (solid ? 1 : 1.7) + '" stroke-linejoin="round" stroke-linecap="round"' + (solid ? ' fill-opacity="0.88"' : '') + '/></svg>'
  }
  // 一柱干支的五行组成徽记：如 壬子=阴阳水、庚午=金火、甲午=木火（支以主气藏干论阴阳）
  function wxBadge(gz) {
    var gan = gz[0], zhi = gz[1]
    var zm = E.ZHI_MAIN[zhi]
    var ge = E.GAN_WUXING[gan], ze = E.GAN_WUXING[zm]
    var gy = E.GAN_YINYANG[gan], zy = E.GAN_YINYANG[zm]
    var label
    if (ge === ze) {
      var pre = gy !== zy ? '阴阳' : gy === '阳' ? '双阳' : '双阴'
      label = '<i style="color:' + ELC[ge] + '">' + pre + ge + '</i>'
    } else {
      label = '<i><b style="color:' + ELC[ge] + '">' + ge + '</b><b style="color:' + ELC[ze] + '">' + ze + '</b></i>'
    }
    return '<span class="wxb" data-gz="' + gz + '">' + elIcon(ge, gy) + elIcon(ze, zy) + label + '</span>'
  }
  // 节日小签（cn=朱 west=黛）
  function festChips(list) {
    if (!list || !list.length) return ''
    return list.map(function (f) { return '<span class="dp-fest f-' + f.kind + '">' + f.name + '</span>' }).join('')
  }
  function daYunNote(chart, year) {
    var first = chart.yun.daYun.filter(function (x) { return x.ganZhi })[0]
    return first && year < first.startYear ? '尚未起运（童限）' : '已过排定大运范围'
  }

  // 指数数字滚动（微互动）：渲染后对 .idx-score 从低处滚到目标值
  function animateScores() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var els = document.querySelectorAll('.idx-score')
    for (var i = 0; i < els.length; i++) {
      ;(function (el) {
        var target = parseInt(el.textContent, 10)
        if (!target || el.dataset.rolled === String(target)) return
        el.dataset.rolled = String(target)
        var start = Math.max(0, target - 16), t0 = null
        function step(ts) {
          if (!t0) t0 = ts
          var p = Math.min(1, (ts - t0) / 400)
          el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)))
          if (p < 1) requestAnimationFrame(step)
          else el.textContent = target
        }
        requestAnimationFrame(step)
      })(els[i])
    }
  }

  UI.fmt = {
    WX: WX, ELC: ELC, REL_COLOR: REL_COLOR, WEEK_CN: WEEK_CN, GANSET: GANSET, TODAY: TODAY,
    assign: assign, pad2: pad2, pad4: pad4, ymd: ymd, same: same,
    tok: tok, gzTok: gzTok, term: term, esc: esc, wxChip: wxChip, daYunNote: daYunNote,
    elIcon: elIcon, wxBadge: wxBadge, festChips: festChips, animateScores: animateScores
  }
})()
