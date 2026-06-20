/*
 * app.js · 万年历 + 个人化解读 + 教学浮层（浏览器）
 */
;(function () {
  'use strict'

  var E = window.Engine, I = window.Interpret, K = window.Knowledge, A = window.Analyze
  var STORAGE_KEY = 'huaji.birth'
  var WX = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' }
  var ELC = { 木: '#1c8551', 火: '#cf3a28', 土: '#a96a2e', 金: '#c2a13a', 水: '#1d68a6' }
  var relReg = [] // 关系连线注册表：data-rel 索引 → { rel, positions }
  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

  var now = new Date()
  var TODAY = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  var state = {
    birth: load(),
    chart: null, st: null, yong: null,
    sel: assign({}, TODAY),
    cal: { year: TODAY.year, month: TODAY.month }
  }

  // —— 小工具 ——
  function assign(t, s) { for (var k in s) t[k] = s[k]; return t }
  function pad2(n) { return (n < 10 ? '0' : '') + n }
  function pad4(n) { return ('000' + n).slice(-4) }
  function ymd(o) { return pad4(o.year) + '-' + pad2(o.month) + '-' + pad2(o.day) }
  function same(a, b) { return a.year === b.year && a.month === b.month && a.day === b.day }
  var GANSET = '甲乙丙丁戊己庚辛壬癸'
  function tok(ch, wx) {
    if (GANSET.indexOf(ch) >= 0) return '<span class="tok tok-g-' + ch + '">' + ch + '</span>'
    return '<span class="tok tok-' + WX[wx] + '">' + ch + '</span>'
  }
  function gzTok(s) { return tok(s[0], E.GAN_WUXING[s[0]]) + tok(s[1], E.ZHI_WUXING[s[1]]) }
  function refreshChart() {
    state.chart = state.st = state.yong = null
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
  }
  function term(text, kind, key) { return '<span class="term" data-kind="' + kind + '" data-key="' + key + '">' + text + '</span>' }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

  function save(b) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)) } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch (e) { return null } }
  function wipe() { try { localStorage.removeItem(STORAGE_KEY) } catch (e) {} }

  // ======== 万年历 ========
  function renderAlmanac() {
    var el = document.getElementById('almanac')
    var y = state.cal.year, m = state.cal.month
    var days = E.monthDays(y, m)
    var firstWeek = days[0].week

    var grid = ''
    WEEK_CN.forEach(function (w, i) {
      grid += '<div class="cal-wk' + (i === 0 || i === 6 ? ' wend' : '') + '">' + w + '</div>'
    })
    for (var i = 0; i < firstWeek; i++) grid += '<div class="cal-cell empty"></div>'
    days.forEach(function (d) {
      var solY = pad4(y) + '-' + pad2(m) + '-' + pad2(d.day)
      var isToday = solY === ymd(TODAY)
      var isSel = same({ year: y, month: m, day: d.day }, state.sel)
      var sub = d.jieQi ? d.jieQi : d.lunarDayCn === '初一' ? d.lunarMonthCn + '月' : d.lunarDayCn
      grid +=
        '<button class="cal-cell' + (isToday ? ' today' : '') + (isSel ? ' sel' : '') + '" data-action="selectDay" data-day="' + d.day + '">' +
          '<span class="c-num">' + d.day + '</span>' +
          '<span class="c-sub' + (d.jieQi ? ' jq' : '') + '">' + sub + '</span>' +
        '</button>'
    })

    el.innerHTML =
      '<h2 class="sect-title">万年历</h2>' +
      '<div class="cal-head">' +
        '<button class="cal-nav" data-action="prevMonth">‹</button>' +
        '<div class="cal-title">' + y + '年 ' + m + '月</div>' +
        '<button class="cal-nav" data-action="nextMonth">›</button>' +
        '<button class="cal-today" data-action="today">今天</button>' +
      '</div>' +
      '<div class="cal-grid">' + grid + '</div>' +
      renderDayPanel(state.sel)
  }

  // 时间层叠加（大运 / 流年 / 流月 / 流日 × 十神 × 喜忌）
  function favTag(el, yong) {
    if (!yong) return ''
    if (yong.favorable.indexOf(el) >= 0) return '<span class="ft ft-xi">喜</span>'
    if (yong.unfavorable.indexOf(el) >= 0) return '<span class="ft ft-ji">忌</span>'
    return '<span class="ft ft-ping">平</span>'
  }
  function tlRow(label, gz, dm, yong, extra) {
    if (!gz) return ''
    var gan = gz[0], el = E.GAN_WUXING[gan], ss = E.shiShen(dm, gan)
    return '<div class="tl-row"><span class="tl-label">' + label + '</span>' +
      '<span class="tl-gz">' + gzTok(gz) + '</span>' +
      '<span class="tl-ss">' + term(ss, 'shishen', ss) + '</span>' +
      favTag(el, yong) + (extra || '') + '</div>'
  }
  function daYunNote(chart, year) {
    var first = chart.yun.daYun.filter(function (x) { return x.ganZhi })[0]
    return first && year < first.startYear ? '尚未起运（童限）' : '已过排定大运范围'
  }
  function timeStackHTML(chart, yong, d) {
    var dm = chart.dayMaster.gan
    var cur = E.currentDaYun(chart, d.year)
    var rows = cur
      ? tlRow('大运', cur.ganZhi, dm, yong, '<span class="tl-x">' + cur.startAge + '岁起</span>')
      : '<div class="tl-row"><span class="tl-label">大运</span><span class="tl-none">' + daYunNote(chart, d.year) + '</span></div>'
    rows += tlRow('流年', d.liunian, dm, yong)
    rows += tlRow('流月', d.liuyue, dm, yong)
    rows += tlRow('流日', d.liuri, dm, yong)
    var els = [d.liunianGan, d.liuyueGan, d.liuriGan]
    if (cur && cur.ganZhi) els.push(cur.ganZhi[0])
    var xi = 0, ji = 0
    els.forEach(function (g) { var e = E.GAN_WUXING[g]; if (yong.favorable.indexOf(e) >= 0) xi++; else if (yong.unfavorable.indexOf(e) >= 0) ji++ })
    var tone = xi > ji ? '整体偏顺 —— 多层之气落在你的喜用，宜进取' : ji > xi ? '整体偏逆 —— 多层之气落在忌神，宜守、宜缓' : '顺逆参半 —— 平稳，照常即可'
    return '<div class="timestack">' +
      '<div class="ts-cap">时间层叠加 · 大运 → 流年 → 流月 → 流日（日主 ' + dm + '）</div>' +
      rows + '<div class="ts-tone">' + tone + '</div></div>'
  }

  function renderDayPanel(sel) {
    var d = E.buildDay(sel)
    var yi = d.yi.map(function (x) { return '<span class="chip">' + x + '</span>' }).join('')
    var ji = d.ji.map(function (x) { return '<span class="chip">' + x + '</span>' }).join('')
    return (
      '<div class="day-panel">' +
        '<div class="dp-top">' +
          '<span class="dp-date">' + d.solarYmd + ' ' + d.weekday + (same(sel, TODAY) ? ' · 今天' : '') + '</span>' +
          '<span class="dp-lunar">' + d.lunarStr + ' · 属' + d.shengXiao + (d.jieQi ? ' <span class="dp-jq">【' + d.jieQi + '】</span>' : '') + '</span>' +
        '</div>' +
        (state.chart
          ? timeStackHTML(state.chart, state.yong, d)
          : '<div class="dp-gz">' +
              '<span><span class="g">流年</span>' + gzTok(d.liunian) + '</span>' +
              '<span><span class="g">流月</span>' + gzTok(d.liuyue) + '</span>' +
              '<span><span class="g">' + term('流日', 'terms', '流日') + '</span>' + gzTok(d.liuri) + '</span>' +
            '</div>') +
        '<div class="dp-meta">' +
          '<span>纳音 ' + d.dayNaYin + '</span><span>冲 ' + d.chong + '</span><span>煞 ' + d.sha + '</span><span>值 ' + d.zhiXing + '</span>' +
        '</div>' +
        '<div class="yiji">' +
          '<div class="col"><span class="lab yi">宜</span>' + (yi || '<span class="chip">诸事可为</span>') + '</div>' +
          '<div class="col"><span class="lab ji">忌</span>' + (ji || '<span class="chip">无</span>') + '</div>' +
        '</div>' +
      '</div>'
    )
  }

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
        '<circle cx="' + pos[i].x + '" cy="' + pos[i].y + '" r="' + rad[i] + '" fill="' + ELC[w] + '"/>' +
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
  function relColor(t) {
    if (t === '冲') return '#cf3a28' // 朱砂
    if (t === '刑') return '#d98a2e' // 琥珀
    if (t === '害') return '#7b51c0' // 紫
    if (t === '破') return '#9a7b50' // 褐
    return '#1c8551' // 合 / 三合 / 三会 / 五合 · 石绿
  }
  function relationsSVG(positions, rels) {
    var n = positions.length, colW = 500 / n
    var cx = positions.map(function (_, i) { return colW * (i + 0.5) })
    var baseY = 86, head = ''
    positions.forEach(function (p, i) {
      head +=
        '<text x="' + cx[i] + '" y="18" class="rs-label">' + p.label + '</text>' +
        '<text x="' + cx[i] + '" y="50" class="rs-gan" fill="' + ELC[E.GAN_WUXING[p.gan]] + '">' + p.gan + '</text>' +
        '<text x="' + cx[i] + '" y="78" class="rs-zhi" fill="' + ELC[E.ZHI_WUXING[p.zhi]] + '">' + p.zhi + '</text>'
    })
    var keys = positions.map(function (p) { return p.key })
    var arcs = '', lane = 0
    relReg = []
    rels.forEach(function (r) {
      var idx = r.members.map(function (k) { return keys.indexOf(k) }).filter(function (x) { return x >= 0 }).sort(function (a, b) { return a - b })
      if (idx.length < 2) return
      var depth = 26 + lane * 22, col = relColor(r.type), tag = r.type + (r.element ? '·' + r.element : '')
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
      lane++
    })
    var H
    if (lane === 0) { arcs = '<text x="250" y="' + (baseY + 26) + '" class="rs-none">本日与命局之间，暂无显著的合冲刑害</text>'; H = baseY + 46 }
    else H = baseY + (26 + (lane - 1) * 22) + 22
    return '<svg viewBox="0 0 500 ' + H + '" class="rsvg" preserveAspectRatio="xMidYMid meet">' + head + arcs + '</svg>'
  }

  // ======== 个人化：选定日解读 + 本命盘 ========
  function renderPersonal() {
    var host = document.getElementById('personal')
    if (!state.chart) { host.innerHTML = ''; return }
    var chart = state.chart, st = state.st, yong = state.yong
    var d = E.buildDay(state.sel)
    var reading = I.dayReading(chart, d, yong)
    host.innerHTML = renderToday(chart, d, reading) + renderChart(chart, reading.liuriGanWx, st, yong)
  }

  function renderToday(chart, d, reading) {
    var cur = E.currentDaYun(chart, d.year)
    var curStr = daYunNote(chart, d.year)
    if (cur) curStr = gzTok(cur.ganZhi) + '运（' + cur.startAge + '岁起 · 大运天干为你的 ' + term(E.shiShen(chart.dayMaster.gan, cur.ganZhi[0]), 'shishen', E.shiShen(chart.dayMaster.gan, cur.ganZhi[0])) + '）'

    // 关系图：年月日时 + 流日 一起画
    var positions = ['year', 'month', 'day', 'time'].map(function (k) {
      return { key: k, label: I.LABEL[k], gan: chart.pillars[k].gan, zhi: chart.pillars[k].zhi }
    })
    positions.push({ key: 'liuri', label: '流日', gan: d.liuriGan, zhi: d.liuriZhi })
    var rels = I.findRelations(positions)
    var relList = reading.relations.map(function (r) {
      return '<li>' + term(r.type, 'relations', r.type) + ' · ' + (r.rich || r.desc) + '</li>'
    }).join('')

    var title = (same(state.sel, TODAY) ? '今日' : d.solarYmd) + ' · 能量化学反应'
    return (
      '<section class="card today-card">' +
        '<h2 class="sect-title">' + title + '</h2>' +
        '<div class="today-head">' +
          '<div class="t-gz"><span><span class="g">流年</span>' + gzTok(d.liunian) + '</span><span><span class="g">流月</span>' + gzTok(d.liuyue) + '</span><span><span class="g">流日</span>' + gzTok(d.liuri) + '</span></div>' +
          '<div class="t-dayun">当前大运：' + curStr + '</div>' +
        '</div>' +
        '<div class="reaction">' +
          '<div class="r-theme">今日天干 ' + tok(d.liuriGan, reading.liuriGanWx) + ' 是你的 ' + term(reading.shiShen, 'shishen', reading.shiShen) + '，点亮「' + reading.domain.name + '」</div>' +
          (reading.yong ? '<div class="r-line r-yong yong-' + reading.yong.hit + '"><span class="r-key">今日顺逆</span>' + reading.yong.text + '</div>' : '') +
          '<div class="r-line"><span class="r-key">五行关系</span>' + reading.relation.desc + '（' + reading.relation.tag + '）</div>' +
          '<div class="r-line"><span class="r-key">今日基调</span>' + reading.tone + '</div>' +
          '<div class="r-line good"><span class="r-key">宜</span>' + reading.domain.good + '</div>' +
          '<div class="r-line care"><span class="r-key">留意</span>' + reading.domain.care + '</div>' +
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

  function relKey(t) { return t === '三合' || t === '三会' || t === '五合' ? t : t } // 关系库已含这些键
  function legend() {
    var items = [['合', '#2e8b57'], ['冲', '#cf4332'], ['刑', '#e07b39'], ['害', '#8a5cd1'], ['破', '#9a7b50']]
    return items.map(function (it) { return '<span class="lg"><span class="sw" style="border-color:' + it[1] + '"></span>' + it[0] + '</span>' }).join('')
  }

  function wxChip(w) { return '<span class="wx-chip wx-' + WX[w] + '">' + w + '</span>' }
  function strengthHTML(st, yong) {
    var pct = Math.round(st.ratio * 100)
    return '<div class="strength-block">' +
      '<div class="sb-head"><span class="sb-tag">身强弱</span><b>' + st.label + '</b>' +
        '<span class="sb-sub">月令' + st.ruler + '当令 → 日主' + st.dm + st.ws + '（' + (st.deLing ? '得令' : '失令') + '）</span></div>' +
      '<div class="sb-meter"><div class="sb-fill" style="width:' + pct + '%"></div><span class="sb-mid"></span></div>' +
      '<div class="sb-mini">帮身 ' + st.helps + ' · 耗身 ' + st.drains + '　<span class="sb-ref">仅供参考</span></div>' +
      '<div class="sb-head"><span class="sb-tag">用神</span>' + (yong.favorable.length ? '喜 ' + yong.favorable.map(wxChip).join('') + '　忌 ' + yong.unfavorable.map(wxChip).join('') : '<span class="sb-balanced">命局中和 · 贵在流通，无显著喜忌</span>') + '<span class="sb-sub">' + yong.method + '</span></div>' +
      '<div class="sb-tiaohou">调候 ·《穷通宝鉴》：' + yong.tiaohou + '</div>' +
      '<div class="sb-note">' + yong.note + '</div>' +
    '</div>'
  }
  function renderChart(chart, hiEl, st, yong) {
    var cols = ['year', 'month', 'day', 'time'], head = ['年柱', '月柱', '日柱', '时柱']
    function rowF(label, fn) {
      return '<tr><th>' + label + '</th>' + cols.map(function (k) { return '<td>' + fn(chart.pillars[k]) + '</td>' }).join('') + '</tr>'
    }
    var table =
      '<table class="mingpan">' +
      '<tr class="cols"><th></th>' + head.map(function (h) { return '<td>' + h + '</td>' }).join('') + '</tr>' +
      rowF('主星', function (p) { return p.ganShiShen === '日元' ? '<span class="ss">日元</span>' : '<span class="ss">' + term(p.ganShiShen, 'shishen', p.ganShiShen) + '</span>' }) +
      rowF('天干', function (p) { return tok(p.gan, p.ganWuxing) }) +
      rowF('地支', function (p) { return tok(p.zhi, p.zhiWuxing) }) +
      rowF('藏干', function (p) { return '<span class="cang">' + p.hideGan.join(' ') + '</span>' }) +
      rowF('副星', function (p) { return '<span class="ss sub">' + p.zhiShiShen.map(function (s) { return term(s, 'shishen', s) }).join(' ') + '</span>' }) +
      rowF('纳音', function (p) { return '<span class="nayin">' + p.naYin + '</span>' }) +
      '</table>'

    var wxbar = chart.wuxingOrder.map(function (w) {
      return '<span class="it"><span class="dot dot-' + WX[w] + '"></span>' + term(w, 'wuxing', w) + ' <b>' + (chart.wuxingCount[w] || 0) + '</b></span>'
    }).join('')

    var dayun = chart.yun.daYun.filter(function (x) { return x.ganZhi }).map(function (x) {
      var c = TODAY.year >= x.startYear && TODAY.year <= x.startYear + 9 ? ' current' : ''
      return '<div class="dayun' + c + '"><div class="dy-gz">' + gzTok(x.ganZhi) + '</div><div class="dy-age">' + x.startAge + '岁</div><div class="dy-year">' + x.startYear + '</div></div>'
    }).join('')

    var dm = chart.dayMaster
    return (
      '<section class="card chart-card">' +
        '<h2 class="sect-title">本命盘</h2>' +
        '<div class="meta">公历 ' + chart.solar + '　·　' + chart.lunar + '</div>' +
        '<div class="daymaster">' + term('日主', 'terms', '日主') + ' ' + tok(dm.gan, dm.wuxing) + '　（' + dm.yinyang + dm.wuxing + '）</div>' +
        table +
        '<div class="ring-wrap">' +
          ringSVG(chart.wuxingCount, hiEl) +
          '<div class="ring-side">五行流转 ·《五行大义》「递相负载，运用不休」（圈大小＝该五行多寡，亮圈＝今日之气）' +
            '<div class="leg"><span><span class="ln-s"></span>' + term('相生', 'relations', '生') + '</span><span><span class="ln-k"></span>' + term('相克', 'relations', '克') + '</span></div>' +
            '<div class="wxbar">' + wxbar + '</div>' +
          '</div>' +
        '</div>' +
        strengthHTML(st, yong) +
        '<div class="yun-line">' + term('大运', 'terms', '大运') + '：' + chart.yun.startDesc + (chart.yun.startSolar ? '（约 ' + chart.yun.startSolar + ' 起）' : '') + '</div>' +
        '<div class="dayun-strip">' + dayun + '</div>' +
      '</section>'
    )
  }

  // ======== 录入区 ========
  function renderIntake() {
    var form = document.getElementById('birth-form')
    var sum = document.getElementById('intake-summary')
    if (state.birth) {
      var b = state.birth
      form.hidden = true
      sum.hidden = false
      sum.innerHTML =
        '<span class="who">' + ymd(b) + ' ' + pad2(b.hour) + ':' + pad2(b.minute) + ' · ' + (b.gender === 1 ? '男' : '女') + '</span>' +
        '<button class="link-btn" data-action="reedit">重新输入</button>' +
        '<button class="link-btn" data-action="clear">清除数据</button>'
    } else {
      form.hidden = false
      sum.hidden = true
    }
  }

  // ======== 教学区 ========
  function renderLearn() {
    var ps = K.intro.paragraphs.map(function (p) { return '<p>' + p + '</p>' }).join('')
    var st = K.intro.stance.map(function (s) { return '<li>' + s + '</li>' }).join('')
    var ss = Object.keys(K.shishen).map(function (k) { return term(k, 'shishen', k) }).join('、')
    var rl = Object.keys(K.relations).map(function (k) { return term(k, 'relations', k) }).join('、')
    var wx = Object.keys(K.wuxing).map(function (k) { return term(k, 'wuxing', k) }).join('、')
    document.getElementById('learn').innerHTML =
      '<h2 class="sect-title">八字怎么运作 · 点开每个词都能学</h2>' +
      '<div class="intro"><h3 class="intro-title">' + K.intro.title + '</h3>' + ps + '</div>' +
      '<ul class="stance">' + st + '</ul>' +
      '<div class="gloss">' +
        '<div><span class="gl-k">五行</span>' + wx + '</div>' +
        '<div><span class="gl-k">十神</span>' + ss + '</div>' +
        '<div><span class="gl-k">关系</span>' + rl + '</div>' +
        '<div class="gl-hint">↑ 点任意词，看它的「两面」与如何顺势用好 —— 别一看到劫财、七杀就吓跑。</div>' +
      '</div>'
  }

  // ======== 易学 · 后天八卦方位图 ========
  function hexA(h, a) {
    var n = parseInt(h.slice(1), 16)
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
  }
  function baguaSVG() {
    var B = K.bagua
    var order = ['離', '坤', '兌', '乾', '坎', '艮', '震', '巽'] // 上南起，顺时针
    var cx = 160, cy = 160, R = 118, out = ''
    order.forEach(function (name, i) {
      var ang = (-90 + i * 45) * Math.PI / 180
      var x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang)
      var b = B[name], col = ELC[b.wuxing]
      out +=
        '<g class="bg-node term" data-kind="bagua" data-key="' + name + '" transform="translate(' + x + ',' + y + ')">' +
          '<circle r="30" fill="' + hexA(col, 0.12) + '" stroke="' + col + '" stroke-width="1.3"/>' +
          '<text class="bg-sym" y="-7" fill="' + col + '">' + b.symbol + '</text>' +
          '<text class="bg-name" y="8" fill="' + col + '">' + name + '</text>' +
          '<text class="bg-jie" y="20">' + b.jie + '</text>' +
        '</g>'
    })
    out +=
      '<g transform="translate(' + cx + ',' + cy + ')">' +
        '<circle r="26" fill="' + hexA(ELC['土'], 0.14) + '" stroke="' + ELC['土'] + '" stroke-width="1.3"/>' +
        '<text class="bg-name" y="-3" fill="' + ELC['土'] + '">中宫</text>' +
        '<text class="bg-dir2" y="11" fill="' + ELC['土'] + '">土·五</text>' +
      '</g>'
    out +=
      '<text class="bg-edge" x="160" y="13">南</text>' +
      '<text class="bg-edge" x="160" y="313">北</text>' +
      '<text class="bg-edge" x="9" y="164">东</text>' +
      '<text class="bg-edge" x="311" y="164">西</text>'
    return '<svg viewBox="0 0 320 320" class="bagua-svg">' + out + '</svg>'
  }
  function renderYixue() {
    var y = K.yixue
    var ps = y.paragraphs.map(function (p) { return '<p>' + p + '</p>' }).join('')
    var chips = Object.keys(K.bagua).map(function (k) { return term(K.bagua[k].symbol + ' ' + k, 'bagua', k) }).join('　')
    document.getElementById('yixue').innerHTML =
      '<h2 class="sect-title">易学 · 八卦五行（五行的能量运转）</h2>' +
      '<div class="intro"><h3 class="intro-title">' + y.title + '</h3>' + ps + '</div>' +
      '<div class="bagua-wrap">' + baguaSVG() +
        '<div class="bagua-side">后天八卦方位图 · 上南下北 / 左东右西。四正：震东春分（木）、离南夏至（火）、兑西秋分（金）、坎北冬至（水）；四隅守巽艮坤乾，土寄中宫。' +
          '<div class="bagua-chips">' + chips + '</div>' +
          '<div class="gl-hint">↑ 点任意卦，看它的象 / 五行 / 方位 / 八节 / 爻象（依《五行大义·论八卦八风》）</div>' +
        '</div>' +
      '</div>'
  }

  // ======== 术语浮层 ========
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
  function openTerm(kind, key, cx, cy) {
    var pop = document.getElementById('pop')
    pop.innerHTML = termHTML(kind, key)
    pop.hidden = false
    var w = pop.offsetWidth, h = pop.offsetHeight
    var x = Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12)
    var y = cy + 16
    if (y + h > window.innerHeight - 12) y = Math.max(12, cy - h - 16)
    pop.style.left = x + 'px'
    pop.style.top = y + 'px'
  }
  function closeTerm() { document.getElementById('pop').hidden = true }

  // ======== 事件 ========
  function handleAction(action, ds) {
    if (action === 'selectDay') {
      state.sel = { year: state.cal.year, month: state.cal.month, day: Number(ds.day) }
      renderAlmanac(); renderPersonal()
    } else if (action === 'prevMonth' || action === 'nextMonth') {
      var m = state.cal.month + (action === 'nextMonth' ? 1 : -1), y = state.cal.year
      if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
      state.cal = { year: y, month: m }
      renderAlmanac()
    } else if (action === 'today') {
      state.cal = { year: TODAY.year, month: TODAY.month }
      state.sel = assign({}, TODAY)
      renderAlmanac(); renderPersonal()
    } else if (action === 'reedit') {
      var b = state.birth
      if (b) {
        document.getElementById('f-date').value = ymd(b)
        document.getElementById('f-time').value = pad2(b.hour) + ':' + pad2(b.minute)
        var r = document.querySelector('input[name=gender][value="' + b.gender + '"]'); if (r) r.checked = true
      }
      state.birth = null; refreshChart(); renderIntake(); renderAlmanac(); renderPersonal()
      document.getElementById('intake').scrollIntoView({ behavior: 'smooth' })
    } else if (action === 'clear') {
      wipe(); state.birth = null; refreshChart(); renderIntake(); renderAlmanac(); renderPersonal()
    } else if (action === 'closePop') {
      closeTerm()
    }
  }

  document.addEventListener('click', function (e) {
    var arc = e.target.closest && e.target.closest('.rel-arc')
    if (arc) { var La = relLayersAt(arc.dataset.rel); if (La) showPop(relPopHTML(La), e.clientX, e.clientY); hideTip(); e.stopPropagation(); return }
    var t = e.target.closest('.term')
    if (t) { openTerm(t.dataset.kind, t.dataset.key, e.clientX, e.clientY); e.stopPropagation(); return }
    var a = e.target.closest('[data-action]')
    if (a) { e.preventDefault(); handleAction(a.dataset.action, a.dataset); return }
    if (!e.target.closest('#pop')) closeTerm()
    hideTip()
  })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeTerm(); hideTip() } })

  // —— 关系连线：悬停看 L1/L2，点按看全部 L1–L4 ——
  var tipEl
  function relLayersAt(idx) { var d = relReg[idx]; return d ? I.relationLayers(d.rel, d.positions) : null }
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
  function showPop(html, cx, cy) {
    var pop = document.getElementById('pop'); pop.innerHTML = html; pop.hidden = false
    var w = pop.offsetWidth, h = pop.offsetHeight
    var x = Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12)
    var y = cy + 16; if (y + h > window.innerHeight - 12) y = Math.max(12, cy - h - 16)
    pop.style.left = x + 'px'; pop.style.top = y + 'px'
  }
  function showTip(html, e) { if (!tipEl) tipEl = document.getElementById('tip'); if (!tipEl) return; tipEl.innerHTML = html; tipEl.hidden = false; positionTip(e) }
  function positionTip(e) { if (!tipEl || tipEl.hidden) return; var w = tipEl.offsetWidth, h = tipEl.offsetHeight; var x = Math.min(Math.max(10, e.clientX - w / 2), window.innerWidth - w - 10); var yy = e.clientY - h - 14; if (yy < 10) yy = e.clientY + 20; tipEl.style.left = x + 'px'; tipEl.style.top = yy + 'px' }
  function hideTip() { if (tipEl) tipEl.hidden = true }
  document.addEventListener('mouseover', function (e) {
    var g = e.target.closest && e.target.closest('.rel-arc')
    if (g) { var L = relLayersAt(g.dataset.rel); if (L) showTip(tipShortHTML(L), e) }
  })
  document.addEventListener('mousemove', function (e) {
    if (tipEl && !tipEl.hidden) { if (e.target.closest && e.target.closest('.rel-arc')) positionTip(e); else hideTip() }
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
    renderIntake(); renderAlmanac(); renderPersonal()
    document.getElementById('personal').scrollIntoView({ behavior: 'smooth' })
  })

  // ======== 初始化 ========
  refreshChart()
  renderLearn()
  renderYixue()
  renderAlmanac()
  renderIntake()
  renderPersonal()
})()
