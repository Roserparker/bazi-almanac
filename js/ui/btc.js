/*
 * ui/btc.js · 观象台 · BTC（无需录入生辰即可看）
 * ① BTC 命片（创世八字/喜忌/九运）② 今日走向（化机指数 v2 + 流日关系）
 * ③ 本周走向（七日曲线 + 周评）④ 每日一卦·六爻 ⑤ 奇门午时盘 ⑥ 三法合参 + 免责
 * 依赖 BTC / Liuyao / Qimen / Daily / Engine / UI.fmt / UI.almanac。挂 window.UI.btc。
 */
;(function () {
  'use strict'
  var E = window.Engine
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var BAND_COLOR = { 昂扬: '#8a6d14', 顺畅: '#0f5c36', 平稳: '#6d6353', 收敛: '#8a4d20', 蛰养: '#1f5f86' }
  var TEND_CLS = { 偏扬: 'up', 震荡: 'mid', 偏抑: 'dn' }

  // ———— 观象手记（云端 routine 每日写入 data/observatory-notes.json；缺席则静默不显）————
  var NOTE = { forDate: null, note: null }
  function paintNote() {
    var el = document.getElementById('btc-note')
    if (!el) return
    var n = NOTE.note
    if (!n) { el.innerHTML = ''; return }
    var today = F.ymd(F.TODAY)
    // 手记日期早于今天=旧记；晚于今天（时区先行）则只标日期不另注
    var tag = n.date < today ? ' <span class="btc-note-old">（今日手记未至 · 示最近一记）</span>' : ''
    el.innerHTML =
      '<div class="btc-note">' +
        '<div class="btc-note-cap">观象手记 · ' + n.date + tag + '</div>' +
        '<div class="btc-note-text">' + F.esc(n.text) + '</div>' +
        '<div class="btc-note-src">云端观星官每日一记 · 依站内模型而作，不引外闻 · 缺勤则只看盘面</div>' +
      '</div>'
  }
  function fetchNote() {
    var today = F.ymd(F.TODAY)
    if (NOTE.forDate === today) { paintNote(); return }
    if (typeof fetch !== 'function') return // file:// 双击离线场景：静默降级
    try {
      fetch('data/observatory-notes.json?v=' + today.replace(/-/g, ''))
        .then(function (r) { return r.ok ? r.json() : null })
        .then(function (j) {
          NOTE.forDate = today
          NOTE.note = j && j.notes && j.notes.length ? j.notes[0] : null
          paintNote()
        })
        .catch(function () { NOTE.forDate = today; NOTE.note = null; paintNote() })
    } catch (e) { /* 静默 */ }
  }

  // ———— 本周走向 sparkline ————
  function weekSVG(series) {
    var W = 560, H = 130, x0 = 34, dx = (W - x0 - 18) / 6
    function xy(i, s) { return { x: x0 + i * dx, y: 118 - s.score } }
    var pts = series.map(function (s, i) { return xy(i, s) })
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y }).join(' ')
    var mid = 118 - 50
    var svg = '<line x1="' + (x0 - 10) + '" y1="' + mid + '" x2="' + (W - 10) + '" y2="' + mid + '" class="wk-mid"/>' +
      '<text x="' + (x0 - 14) + '" y="' + (mid + 4) + '" class="wk-midlab">50</text>'
    svg += '<path d="' + line + '" class="wk-line"/>'
    series.forEach(function (s, i) {
      var p = pts[i], c = BAND_COLOR[s.band]
      if (s.isToday) svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="8.5" fill="none" stroke="' + c + '" stroke-width="1.2" opacity="0.55"/>'
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + c + '"/>' +
        '<text x="' + p.x + '" y="' + (p.y - 9) + '" class="wk-score" fill="' + c + '">' + s.score + '</text>' +
        '<text x="' + p.x + '" y="127" class="wk-day">' + s.weekday.slice(1) + (s.isToday ? '·今' : '') + '</text>'
    })
    return '<svg viewBox="0 0 ' + W + ' 138" class="wk-svg" preserveAspectRatio="xMidYMid meet">' + svg + '</svg>'
  }

  // ———— 六爻卦画 ————
  function yaoBar(l, movingMark) {
    var bar = l.yang
      ? '<span class="ly-bar ly-yang"></span>'
      : '<span class="ly-bar ly-yin"><i></i><i></i></span>'
    return bar + (movingMark ? '<span class="ly-mv">' + movingMark + '</span>' : '<span class="ly-mv"></span>')
  }
  function guaHTML(g, cast, isBen) {
    var rows = ''
    for (var i = 5; i >= 0; i--) {
      var l = g.lines[i]
      var mv = ''
      if (isBen && cast.moving.indexOf(i + 1) >= 0) mv = cast.raw[i] === 9 ? '○' : '×'
      rows += '<div class="ly-row">' +
        (isBen ? '<span class="ly-shen">' + l.shen + '</span>' : '') +
        '<span class="ly-qin">' + l.qin + '</span>' +
        '<span class="ly-gz">' + l.gan + l.zhi + '</span>' +
        yaoBar(l, mv) +
        '<span class="ly-sy">' + (l.shi ? '世' : l.ying ? '应' : '') + '</span>' +
      '</div>'
    }
    return '<div class="ly-gua">' +
      '<div class="ly-name">' + window.Liuyao.TRI_SYM[g.hex.upper] + window.Liuyao.TRI_SYM[g.hex.lower] + ' ' + g.hex.info.n +
        '<span class="ly-gong">' + g.gong + '宫' + g.kind + ' · 世' + g.shi + '应' + g.ying + '</span></div>' +
      rows +
    '</div>'
  }

  function liuyaoHTML(day) {
    var LY = window.Liuyao
    if (!LY) return ''
    var cast = LY.dailyGua(day, 'BTC')
    var j = cast.judge
    var change = cast.moving.length
      ? '<div class="ly-arrow">' + cast.moving.length + ' 爻动 →</div>' + guaHTML(cast.bian, cast, false)
      : ''
    return '<div class="obs-block">' +
      '<div class="obs-cap">每日一卦 · 六爻观澜 <span class="obs-sub">以日为种，三钱成卦 · 问财以妻财爻为用神</span></div>' +
      '<div class="ly-wrap">' + guaHTML(cast.ben, cast, true) + change + '</div>' +
      '<div class="ly-ci">「' + cast.ben.hex.info.ci + '」<span class="ly-su">' + cast.ben.hex.info.su + '</span></div>' +
      (cast.moving.length ? '<div class="ly-yao">动爻 · ' + cast.yaoNote + '</div>' : '<div class="ly-yao">' + cast.yaoNote + '</div>') +
      '<div class="ly-judge"><span class="obs-tend obs-' + TEND_CLS[j.tendency] + '">' + j.tendency + '</span>' +
        '<span class="ly-js">' + (j.score > 0 ? '+' : '') + j.score + '</span></div>' +
      '<ul class="obs-list">' + j.reasons.map(function (r) { return '<li>' + r + '</li>' }).join('') + '</ul>' +
    '</div>'
  }

  // ———— 奇门九宫 ————
  function qimenHTML(day) {
    var Q = window.Qimen
    if (!Q) return ''
    var q = Q.build({ year: day.year, month: day.month, day: day.day })
    if (!q) return ''
    var cells = ''
    q.grid.forEach(function (row) {
      row.forEach(function (p) {
        if (p === 5) {
          cells += '<div class="qm-cell qm-center"><span class="qm-god">中宫</span><span class="qm-gan">' + (q.dipan[5] || '') + '</span><span class="qm-door">寄坤</span></div>'
          return
        }
        var hot = p === q.shengPal ? ' qm-sheng' : ''
        cells += '<div class="qm-cell' + hot + '">' +
          '<span class="qm-god">' + (q.gods[p] || '') + '</span>' +
          '<span class="qm-star">' + (q.tianStar[p] || '') + '<b>' + (q.tianGan[p] || '') + '</b></span>' +
          '<span class="qm-di">' + (q.dipan[p] || '') + '</span>' +
          '<span class="qm-door">' + (q.doors[p] || '') + '</span>' +
          '<span class="qm-dir">' + q.PAL_DIR[p].slice(0, q.PAL_DIR[p].indexOf(' ')) + p + '</span>' +
        '</div>'
      })
    })
    var r = q.reading
    return '<div class="obs-block">' +
      '<div class="obs-cap">奇门遁甲 · 午时盘 <span class="obs-sub">时家转盘 · 拆补法 · 问财观生门与戊</span></div>' +
      '<div class="qm-meta">' + q.jieQi + q.yuan + ' · <b>' + q.juName + '</b> · ' + q.dayGz + '日 ' + q.shiGz + '时 · 值符<b>' + q.zhiFu.star + '</b>落' + q.zhiFu.palace + '宫 · 值使<b>' + q.zhiShi.door + '</b>落' + q.zhiShi.palace + '宫</div>' +
      '<div class="qm-grid">' + cells + '</div>' +
      '<div class="ly-judge"><span class="obs-tend obs-' + TEND_CLS[r.tendency] + '">' + r.tendency + '</span><span class="ly-js">' + (r.score > 0 ? '+' : '') + r.score + '</span></div>' +
      '<ul class="obs-list">' + r.bullets.map(function (b) { return '<li>' + b + '</li>' }).join('') + '</ul>' +
    '</div>'
  }

  // ———— 主渲染 ————
  function renderBTC() {
    var host = document.getElementById('btc')
    if (!host || !window.BTC || !window.Daily) return
    var B = window.BTC
    var c = B.ensure()
    var d = E.buildDay(F.TODAY)
    var ix = B.indexOf(d)
    var chart = c.chart, yong = c.yong

    // 命片
    var pillars = ['year', 'month', 'day', 'time'].map(function (k) {
      return '<span class="btc-p"><span class="g">' + { year: '年', month: '月', day: '日', time: '时' }[k] + '</span>' + F.gzTok(chart.pillars[k].gan + chart.pillars[k].zhi) + '</span>'
    }).join('')
    var mingCard =
      '<div class="btc-ming">' +
        '<div class="btc-gz">' + pillars + '</div>' +
        '<div class="btc-traits">' +
          '<span>日元 ' + F.tok('己', '土') + ' 田园之土</span>' +
          '<span>子月 · <b data-hint="身弱">身弱</b>财旺</span>' +
          '<span>喜 ' + yong.favorable.map(F.wxChip).join('') + '</span>' +
          '<span>忌 ' + yong.unfavorable.map(F.wxChip).join('') + '</span>' +
          '<span>调候 ' + yong.tiaohouYong.map(function (g) { return F.tok(g, E.GAN_WUXING[g]) }).join('') + '</span>' +
        '</div>' +
        '<div class="btc-epoch"><span class="btc-ep-name">' + B.EPOCH.name + ' ' + B.EPOCH.years + '</span>' + B.EPOCH.note + '</div>' +
        '<div class="btc-lineage">' + B.COPY.lineage + '　' + B.COPY.wuxing + '</div>' +
      '</div>'

    // 今日走向
    var rels = B.relationsOf(d)
    var relLine = rels.length
      ? '<ul class="obs-list btc-rels">' + rels.map(function (r) { return '<li><b class="btc-rt">' + r.type + '</b>' + (r.rich || r.desc) + '</li>' }).join('') + '</ul>'
      : '<div class="btc-norel">今日与 BTC 命局之间无显著合冲刑害——气象平直。</div>'
    var todayBlock =
      '<div class="obs-block">' +
        '<div class="obs-cap">今日走向 · ' + d.solarYmd + ' ' + d.weekday + ' <span class="obs-sub">流日 ' + F.gzTok(d.liuri) + ' × BTC 创世盘</span></div>' +
        (UI.almanac.idxBlockHTML ? UI.almanac.idxBlockHTML(ix, { dayunLabel: '九运' }) : '') +
        relLine +
      '</div>'

    // 本周走向
    var wk = B.weekSeries(F.TODAY)
    var weekBlock =
      '<div class="obs-block">' +
        '<div class="obs-cap">本周走向 · 七日之势 <span class="obs-sub">同一模型逐日推演</span></div>' +
        weekSVG(wk) +
        '<div class="btc-wkcmt">' + B.weekComment(wk) + '</div>' +
      '</div>'

    // 六爻 + 奇门
    var lyBlock = liuyaoHTML(d)
    var qmBlock = qimenHTML(d)

    // 三法合参
    var lyT = window.Liuyao ? window.Liuyao.dailyGua(d, 'BTC').judge.tendency : null
    var qmObj = window.Qimen ? window.Qimen.build(F.TODAY) : null
    var bandT = ix.score >= 58 ? '偏扬' : ix.score <= 43 ? '偏抑' : '震荡'
    var confl =
      '<div class="btc-heji"><span class="obs-cap-mini">三法合参</span>' +
        '<span class="obs-tend obs-' + TEND_CLS[bandT] + '">八字指数 ' + ix.score + ' · ' + bandT + '</span>' +
        (lyT ? '<span class="obs-tend obs-' + TEND_CLS[lyT] + '">六爻 ' + lyT + '</span>' : '') +
        (qmObj ? '<span class="obs-tend obs-' + TEND_CLS[qmObj.reading.tendency] + '">奇门 ' + qmObj.reading.tendency + '</span>' : '') +
        '<span class="btc-heji-note">三把尺子各有所本，参差本是常态——重叠处才值得认真看。</span>' +
      '</div>'

    host.innerHTML =
      '<h2 class="sect-title">观象台 · BTC <span class="sect-sub">玄学金融 · 文化推演</span></h2>' +
      mingCard + '<div id="btc-note"></div>' + todayBlock + weekBlock + lyBlock + qmBlock + confl +
      '<div class="disclaimer btc-disc">' + B.COPY.disclaimer + '</div>'
    fetchNote()
  }

  UI.btc = { renderBTC: renderBTC, weekSVG: weekSVG }
})()
