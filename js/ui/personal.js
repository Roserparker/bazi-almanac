/*
 * ui/personal.js · 个人化区：今日详解卡（关系连线图）+ 本命盘卡（命盘表 / 五行环 / 旺衰用神 / 大运）
 * 依赖 Engine / Interpret / UI.fmt。挂 window.UI.personal。渲染函数接收 app 的 state。
 */
;(function () {
  'use strict'
  var E = window.Engine, I = window.Interpret
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var relReg = [] // 关系连线注册表：data-rel 索引 → { rel, positions }
  function relColor(t) { return F.REL_COLOR[t] || F.REL_COLOR['合'] }
  function legend() {
    return ['合', '冲', '刑', '害', '破'].map(function (t) { return '<span class="lg"><span class="sw" style="border-color:' + F.REL_COLOR[t] + '"></span>' + t + '</span>' }).join('')
  }
  function relLayersAt(idx) { var d = relReg[idx]; return d ? I.relationLayers(d.rel, d.positions) : null }

  // ======== 五行流转环 ========
  function ringSVG(count, hi) {
    var order = ['木', '火', '土', '金', '水']
    var cx = 130, cy = 122, R = 80
    var rad = order.map(function (w) { return 13 + Math.min(count[w] || 0, 6) * 2.6 })
    var pos = order.map(function (_, i) {
      var a = (-90 + i * 72) * Math.PI / 180
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
    })
    function seg(i, j, padExtra) {
      var a = pos[i], b = pos[j], dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy)
      var ux = dx / L, uy = dy / L
      return {
        x1: a.x + ux * (rad[i] + 3), y1: a.y + uy * (rad[i] + 3),
        x2: b.x - ux * (rad[j] + 6 + padExtra), y2: b.y - uy * (rad[j] + 6 + padExtra)
      }
    }
    var sheng = '', ke = ''
    for (var i = 0; i < 5; i++) {
      var s = seg(i, (i + 1) % 5, 0)
      sheng += '<line x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '" stroke="#7aa980" stroke-width="2" marker-end="url(#ar-s)"/>'
      var k = seg(i, (i + 2) % 5, 0)
      ke += '<line x1="' + k.x1 + '" y1="' + k.y1 + '" x2="' + k.x2 + '" y2="' + k.y2 + '" stroke="#cf9b8e" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#ar-k)"/>'
    }
    var nodes = order.map(function (w, i) {
      var ring = w === hi ? '<circle cx="' + pos[i].x + '" cy="' + pos[i].y + '" r="' + (rad[i] + 5) + '" fill="none" stroke="#caa62e" stroke-width="2"/>' : ''
      return ring +
        '<circle cx="' + pos[i].x + '" cy="' + pos[i].y + '" r="' + rad[i] + '" fill="' + F.ELC[w] + '"/>' +
        '<text x="' + pos[i].x + '" y="' + pos[i].y + '" class="ring-w">' + w + '</text>' +
        '<text x="' + pos[i].x + '" y="' + (pos[i].y + rad[i] + 12) + '" class="ring-n">' + (count[w] || 0) + '</text>'
    }).join('')
    var defs =
      '<defs>' +
      '<marker id="ar-s" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7aa980"/></marker>' +
      '<marker id="ar-k" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#cf9b8e"/></marker>' +
      '</defs>'
    return '<svg viewBox="0 0 260 250" class="ring">' + defs + ke + sheng + nodes + '</svg>'
  }

  // ======== 关系连线图（年月日时 + 流日）========
  function relationsSVG(positions, rels) {
    var n = positions.length, colW = 500 / n
    var cx = positions.map(function (_, i) { return colW * (i + 0.5) })
    var baseY = 86, head = ''
    positions.forEach(function (p, i) {
      head +=
        '<text x="' + cx[i] + '" y="18" class="rs-label">' + p.label + '</text>' +
        '<text x="' + cx[i] + '" y="50" class="rs-gan" fill="' + F.ELC[E.GAN_WUXING[p.gan]] + '">' + p.gan + '</text>' +
        '<text x="' + cx[i] + '" y="78" class="rs-zhi" fill="' + F.ELC[E.ZHI_WUXING[p.zhi]] + '">' + p.zhi + '</text>'
    })
    var keys = positions.map(function (p) { return p.key })
    // 同型关系共用一条泳道（合并去重后通常 ≤5 层），比每条一层紧凑得多
    var typeOrder = []
    rels.forEach(function (r) { if (typeOrder.indexOf(r.type) < 0) typeOrder.push(r.type) })
    var arcs = '', laneUsed = 0
    relReg = []
    rels.forEach(function (r) {
      var idx = r.members.map(function (k) { return keys.indexOf(k) }).filter(function (x) { return x >= 0 }).sort(function (a, b) { return a - b })
      if (idx.length < 2) return
      var lane = typeOrder.indexOf(r.type)
      laneUsed = Math.max(laneUsed, lane)
      var depth = 24 + lane * 18, col = relColor(r.type), tag = r.type + (r.element ? '·' + r.element : '')
      var ri = relReg.length
      relReg.push({ rel: r, positions: positions })
      if (idx.length === 2) {
        var x1 = cx[idx[0]], x2 = cx[idx[1]], mx = (x1 + x2) / 2
        var d2 = 'M' + x1 + ' ' + baseY + ' Q' + mx + ' ' + (baseY + depth) + ' ' + x2 + ' ' + baseY
        arcs += '<g class="rel-arc" data-rel="' + ri + '">' +
          '<path d="' + d2 + '" fill="none" stroke="transparent" stroke-width="16"/>' +
          '<path d="' + d2 + '" fill="none" stroke="' + col + '" stroke-width="1.7"/>' +
          '<text x="' + mx + '" y="' + (baseY + depth + 12) + '" class="rs-tag" fill="' + col + '">' + tag + '</text>' +
          '</g>'
      } else {
        var xa = cx[idx[0]], xb = cx[idx[idx.length - 1]], y = baseY + depth, mc = (xa + xb) / 2
        var seg = '<path d="M' + xa + ' ' + y + ' L' + xb + ' ' + y + '" stroke="' + col + '" stroke-width="1.7" fill="none"/>'
        idx.forEach(function (ii) { seg += '<path d="M' + cx[ii] + ' ' + baseY + ' L' + cx[ii] + ' ' + y + '" stroke="' + col + '" stroke-width="1.2" fill="none"/>' })
        arcs += '<g class="rel-arc" data-rel="' + ri + '">' +
          '<path d="M' + xa + ' ' + y + ' L' + xb + ' ' + y + '" stroke="transparent" stroke-width="16" fill="none"/>' +
          seg +
          '<text x="' + mc + '" y="' + (y + 12) + '" class="rs-tag" fill="' + col + '">' + tag + '</text>' +
          '</g>'
      }
    })
    var H
    if (!relReg.length) { arcs = '<text x="250" y="' + (baseY + 26) + '" class="rs-none">本日与命局之间，暂无显著的合冲刑害</text>'; H = baseY + 46 }
    else H = baseY + (24 + laneUsed * 18) + 22
    return '<svg viewBox="0 0 500 ' + H + '" class="rsvg" preserveAspectRatio="xMidYMid meet">' + head + arcs + '</svg>'
  }

  // ======== 今日/选定日 详解卡 ========
  function renderToday(state, chart, d, reading) {
    var cur = E.currentDaYun(chart, d.year)
    var curStr = F.daYunNote(chart, d.year)
    if (cur) curStr = F.gzTok(cur.ganZhi) + '运（' + cur.startAge + '岁起 · 大运天干为你的 ' + F.term(E.shiShen(chart.dayMaster.gan, cur.ganZhi[0]), 'shishen', E.shiShen(chart.dayMaster.gan, cur.ganZhi[0])) + '）'

    // 关系图：年月日时 + 流日 一起画（同型同字合并后再画）
    var positions = ['year', 'month', 'day', 'time'].map(function (k) {
      return { key: k, label: I.LABEL[k], gan: chart.pillars[k].gan, zhi: chart.pillars[k].zhi }
    })
    positions.push({ key: 'liuri', label: '流日', gan: d.liuriGan, zhi: d.liuriZhi })
    var rels = I.mergeRelations(I.findRelations(positions))
    var md = I.mergedDayRelations(chart, d)
    var relList = md.relations.map(function (r) {
      return '<li>' + F.term(r.type, 'relations', r.type) + ' · ' + (r.rich || r.desc) + '</li>'
    }).join('')
    if (relList && md.tail) relList += '<li class="rel-tail">' + md.tail + '</li>'
    var gn = window.Daily && window.Daily.GAN_NOTE[d.liuriGan]

    var title = (F.same(state.sel, F.TODAY) ? '今日详解' : d.solarYmd + ' · 详解') + ' — 能量化学反应'
    return (
      '<section class="card today-card">' +
        '<h2 class="sect-title">' + title + '</h2>' +
        '<div class="today-head">' +
          '<div class="t-gz"><span><span class="g">流年</span>' + F.gzTok(d.liunian) + '</span><span><span class="g">流月</span>' + F.gzTok(d.liuyue) + '</span><span><span class="g">流日</span>' + F.gzTok(d.liuri) + '</span></div>' +
          '<div class="t-dayun">当前大运：' + curStr + '</div>' +
        '</div>' +
        '<div class="reaction">' +
          '<div class="r-theme">今日天干 ' + F.tok(d.liuriGan, reading.liuriGanWx) + ' 是你的 ' + F.term(reading.shiShen, 'shishen', reading.shiShen) + '，点亮「' + reading.domain.name + '」</div>' +
          (gn ? '<div class="r-line"><span class="r-key">流日体性</span>「' + gn.shi + '」（滴天髓）—— ' + gn.su + '</div>' : '') +
          '<div class="r-line"><span class="r-key">五行关系</span>' + reading.relation.desc + '（' + reading.relation.tag + '）</div>' +
          '<div class="r-line"><span class="r-key">今日基调</span>' + reading.tone + '</div>' +
        '</div>' +
        '<div class="rel-block">' +
          '<div class="rel-cap">能量流转 · 今日流日与你命局的合冲刑害（点标签看含义）</div>' +
          relationsSVG(positions, rels) +
          '<div class="rel-legend">' + legend() + '</div>' +
          (relList ? '<ul class="rel-list">' + relList + '</ul>' : '') +
        '</div>' +
        '<div class="disclaimer">以上基于《滴天髓》《三命通会》传统模型 + 《道德经》「福祸相依」之怀，描述能量倾向，非吉凶断言。</div>' +
      '</section>'
    )
  }

  // ======== 本命盘 ========
  function diagText(diag) {
    return diag.excess + '最旺' + (diag.lack && diag.lack.length ? '、缺' + diag.lack.join('') : '') + '，气候偏' + diag.climate
  }
  function strengthHTML(st, yong) {
    var pct = Math.round(st.ratio * 100)
    var stHint = /强/.test(st.label) ? '身强' : /弱/.test(st.label) ? '身弱' : '中和'
    return '<div class="strength-block">' +
      '<div class="sb-head"><span class="sb-tag">身强弱</span><b data-hint="' + stHint + '">' + st.label + '</b>' +
        '<span class="sb-sub">月令' + st.ruler + '当令 → 日主' + st.dm + st.ws + '（' + (st.deLing ? '得令' : '失令') + '）</span></div>' +
      '<div class="sb-meter"><div class="sb-fill" style="width:' + pct + '%"></div><span class="sb-mid"></span></div>' +
      '<div class="sb-mini">帮身 ' + st.helps + ' · 耗身 ' + st.drains + '　<span class="sb-ref">仅供参考</span></div>' +
      '<div class="sb-head"><span class="sb-tag">用神</span>' + (yong.favorable.length ? '喜 ' + yong.favorable.map(F.wxChip).join('') + '　忌 ' + yong.unfavorable.map(F.wxChip).join('') : '<span class="sb-balanced">命局中和 · 贵在流通，无显著喜忌</span>') + '<span class="sb-sub">' + yong.method + '</span></div>' +
      '<div class="sb-head"><span class="sb-tag">调候</span>用神 ' + (yong.tiaohouYong.length ? yong.tiaohouYong.map(function (g) { return F.tok(g, E.GAN_WUXING[g]) }).join('') : '—') + '<span class="sb-sub">穷通宝鉴 · ' + yong.seasonHint + '</span></div>' +
      '<div class="sb-diag">命局诊断 · ' + diagText(yong.diag) + '</div>' +
      '<div class="sb-reconcile">' + yong.reconcile + '</div>' +
      '<div class="sb-note">' + yong.note + '</div>' +
    '</div>'
  }
  function renderChart(state, chart, hiEl, st, yong) {
    var cols = ['year', 'month', 'day', 'time'], head = ['年柱', '月柱', '日柱', '时柱']
    function rowF(label, fn) {
      return '<tr><th>' + label + '</th>' + cols.map(function (k) { return '<td>' + fn(chart.pillars[k]) + '</td>' }).join('') + '</tr>'
    }
    var table =
      '<table class="mingpan">' +
      '<tr class="cols"><th></th>' + head.map(function (h) { return '<td>' + h + '</td>' }).join('') + '</tr>' +
      rowF('主星', function (p) { return p.ganShiShen === '日元' ? '<span class="ss">日元</span>' : '<span class="ss">' + F.term(p.ganShiShen, 'shishen', p.ganShiShen) + '</span>' }) +
      rowF('天干', function (p) { return F.tok(p.gan, p.ganWuxing) }) +
      rowF('地支', function (p) { return F.tok(p.zhi, p.zhiWuxing) }) +
      rowF('藏干', function (p) { return '<span class="cang">' + p.hideGan.join(' ') + '</span>' }) +
      rowF('副星', function (p) { return '<span class="ss sub">' + p.zhiShiShen.map(function (s) { return F.term(s, 'shishen', s) }).join(' ') + '</span>' }) +
      rowF('纳音', function (p) { return '<span class="nayin">' + p.naYin + '</span>' }) +
      '</table>'

    var wxbar = chart.wuxingOrder.map(function (w) {
      return '<span class="it"><span class="dot dot-' + F.WX[w] + '"></span>' + F.term(w, 'wuxing', w) + ' <b>' + (chart.wuxingCount[w] || 0) + '</b></span>'
    }).join('')

    var dayun = chart.yun.daYun.filter(function (x) { return x.ganZhi }).map(function (x) {
      var c = F.TODAY.year >= x.startYear && F.TODAY.year <= x.startYear + 9 ? ' current' : ''
      return '<div class="dayun' + c + '"><div class="dy-gz">' + F.gzTok(x.ganZhi) + '</div><div class="dy-age">' + x.startAge + '岁</div><div class="dy-year">' + x.startYear + '</div></div>'
    }).join('')

    var dm = chart.dayMaster
    return (
      '<section class="card chart-card">' +
        '<h2 class="sect-title">本命盘</h2>' +
        '<div class="meta">公历 ' + chart.solar + '　·　' + chart.lunar + '</div>' +
        '<div class="daymaster">' + F.term('日主', 'terms', '日主') + ' ' + F.tok(dm.gan, dm.wuxing) + '　（' + dm.yinyang + dm.wuxing + '）</div>' +
        table +
        '<div class="ring-wrap">' +
          ringSVG(chart.wuxingCount, hiEl) +
          '<div class="ring-side">五行流转 ·《五行大义》「递相负载，运用不休」（圈大小＝该五行多寡，亮圈＝今日之气）' +
            '<div class="leg"><span><span class="ln-s"></span>' + F.term('相生', 'relations', '生') + '</span><span><span class="ln-k"></span>' + F.term('相克', 'relations', '克') + '</span></div>' +
            '<div class="wxbar">' + wxbar + '</div>' +
          '</div>' +
        '</div>' +
        strengthHTML(st, yong) +
        '<div class="yun-line">' + F.term('大运', 'terms', '大运') + '：' + chart.yun.startDesc + (chart.yun.startSolar ? '（约 ' + chart.yun.startSolar + ' 起）' : '') + '</div>' +
        '<div class="dayun-strip">' + dayun + '</div>' +
      '</section>'
    )
  }

  function renderPersonal(state) {
    var host = document.getElementById('personal')
    if (!state.chart) {
      // 未录生辰也给落点：导航「八字盘」跳来不再是一片空白
      host.innerHTML =
        '<section class="card"><h2 class="sect-title">八字命盘 · 今日详解</h2>' +
        '<div class="dash-cta"><button class="btn" data-action="gotoIntake">录入生辰 · 解锁命盘与每日详解</button>' +
        '<span class="hint">生辰只存本机，不上传</span></div></section>'
      return
    }
    var chart = state.chart, st = state.st, yong = state.yong
    var d = E.buildDay(state.sel)
    var reading = I.dayReading(chart, d, yong)
    host.innerHTML = renderToday(state, chart, d, reading) + renderChart(state, chart, reading.liuriGanWx, st, yong)
  }

  UI.personal = {
    renderPersonal: renderPersonal, renderToday: renderToday, renderChart: renderChart,
    ringSVG: ringSVG, relationsSVG: relationsSVG, strengthHTML: strengthHTML,
    relLayersAt: relLayersAt, legend: legend, relColor: relColor
  }
})()
