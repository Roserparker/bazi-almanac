/*
 * ui/popups.js · 术语浮层 #pop 与连线悬停浮层 #tip
 * 依赖 window.Knowledge。挂 window.UI.popups。
 */
;(function () {
  'use strict'
  var K = window.Knowledge
  var UI = (window.UI = window.UI || {})

  function termHTML(kind, key) {
    var x = '<button class="pop-x" data-action="closePop">×</button>'
    if (kind === 'shishen' && K.shishen[key]) {
      var s = K.shishen[key]
      return x + '<h4>' + key + '</h4>' +
        '<p class="one">' + s.oneLine + '</p><p>' + s.full + '</p>' +
        '<div class="tp good"><b>助力</b>' + s.fortune + '</div>' +
        '<div class="tp care"><b>留意</b>' + s.caution + '</div>' +
        '<div class="tp"><b>顺势</b>' + s.use + '</div>' +
        '<div class="dao">「' + s.dao + '」</div>'
    }
    if (kind === 'relations' && K.relations[key]) {
      var r = K.relations[key]
      return x + '<h4>' + key + '</h4><p class="one">' + r.oneLine + '</p><p>' + r.body + '</p>'
    }
    if (kind === 'wuxing' && K.wuxing[key]) {
      var w = K.wuxing[key]
      return x + '<h4>' + key + '<span class="t-se">' + w.se + '</span></h4>' +
        '<p class="one">' + w.oneLine + '</p>' +
        '<div class="tp"><b>体</b>' + w.ti + '</div>' +
        '<div class="tp"><b>性</b>' + w.xing + '</div>' +
        '<div class="tp"><b>配属</b>' + w.attrs + '</div>' +
        '<p>' + w.body + '</p>' +
        '<div class="dao">「' + w.classic + '」——《五行大义》</div>'
    }
    if (kind === 'bagua' && K.bagua[key]) {
      var bg = K.bagua[key]
      return x + '<h4>' + key + '<span class="t-se">' + bg.symbol + ' ' + bg.nature + '</span></h4>' +
        '<p class="one">' + bg.oneLine + '</p>' +
        '<div class="tp"><b>五行</b>' + bg.wuxing + '　<b>方位</b>' + bg.dir + '　<b>八节</b>' + bg.jie + '</div>' +
        '<div class="tp"><b>爻象</b>' + bg.yao + '　<b>家人</b>' + bg.family + '　<b>八风</b>' + bg.wind + '</div>' +
        '<p>' + bg.body + '</p>'
    }
    if (kind === 'terms' && K.terms[key]) {
      return x + '<h4>' + key + '</h4><p>' + K.terms[key] + '</p>'
    }
    return x + '<h4>' + key + '</h4><p>暂无解释。</p>'
  }

  function showPop(html, cx, cy) {
    var pop = document.getElementById('pop'); pop.innerHTML = html; pop.hidden = false
    var w = pop.offsetWidth, h = pop.offsetHeight
    var x = Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12)
    var y = cy + 16; if (y + h > window.innerHeight - 12) y = Math.max(12, cy - h - 16)
    pop.style.left = x + 'px'; pop.style.top = y + 'px'
  }
  function openTerm(kind, key, cx, cy) { showPop(termHTML(kind, key), cx, cy) }
  function closeTerm() { document.getElementById('pop').hidden = true }

  // 关系分层浮层内容（L1/L2 悬停短版；点按全展开）
  function tipShortHTML(L) {
    var h = '<div class="tip-t">' + L.title + '</div>'
    L.layers.slice(0, 2).forEach(function (x) { h += '<div class="tip-l"><b>' + x.tag + '</b>' + x.text + '</div>' })
    if (L.layers.length > 2) h += '<div class="tip-more">点按看「对日主 / 暗机」▾</div>'
    return h
  }
  function relPopHTML(L) {
    var h = '<button class="pop-x" data-action="closePop">×</button><h4>' + L.title + '</h4>'
    L.layers.forEach(function (x) { h += '<div class="tp"><b>' + x.tag + '</b>' + x.text + '</div>' })
    return h
  }

  var tipEl
  function showTip(html, e) {
    if (!tipEl) tipEl = document.getElementById('tip'); if (!tipEl) return
    tipEl.innerHTML = html; tipEl.hidden = false
    positionTip(e)
    // 下一帧再加 .show，让 opacity/transform 过渡生效（优雅浮现）
    requestAnimationFrame(function () { tipEl.classList.add('show') })
  }
  function positionTip(e) { if (!tipEl || tipEl.hidden) return; var w = tipEl.offsetWidth, h = tipEl.offsetHeight; var x = Math.min(Math.max(10, e.clientX - w / 2), window.innerWidth - w - 10); var yy = e.clientY - h - 14; if (yy < 10) yy = e.clientY + 20; tipEl.style.left = x + 'px'; tipEl.style.top = yy + 'px' }
  function hideTip() { if (tipEl) { tipEl.classList.remove('show'); tipEl.hidden = true } }
  function tipShowing() { return !!(tipEl && !tipEl.hidden) }

  // 名词悬停贴士（两段式：通义 + 于你·臣曰）——内容由 Daily.termHint 组装
  function hintTipHTML(h, title) {
    var s = '<div class="tip-t">' + title + '</div>' + '<div class="tip-what">' + h.what + '</div>'
    if (h.you) s += '<div class="tip-you">' + h.you + '</div>'
    if (h.chen) s += '<div class="tip-chen">' + h.chen + '</div>'
    return s
  }
  function hintPopHTML(h, title) {
    var s = '<button class="pop-x" data-action="closePop">×</button><h4>' + title + '</h4><p>' + h.what + '</p>'
    if (h.you) s += '<div class="tp"><b>于你</b>' + h.you.replace(/^于你[:：]/, '') + '</div>'
    if (h.chen) s += '<div class="dao">' + h.chen + '</div>'
    return s
  }

  UI.popups = {
    termHTML: termHTML, openTerm: openTerm, closeTerm: closeTerm, showPop: showPop,
    tipShortHTML: tipShortHTML, relPopHTML: relPopHTML,
    hintTipHTML: hintTipHTML, hintPopHTML: hintPopHTML,
    showTip: showTip, positionTip: positionTip, hideTip: hideTip, tipShowing: tipShowing
  }
})()
