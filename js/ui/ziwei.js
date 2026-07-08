/*
 * ui/ziwei.js · 紫微斗数星盘卡（互动版 · 与万年历同步）
 * 4×4 宫格 + 三方四正连线（点宫换焦点）+ 大限/流年/流月/流日四层推宫与四化切换
 * + 流曜运动轨迹（换日时旧宫留残影，看星宫如何逐日顺行）+ 宫位详批浮层（教看法、给分析）。
 * 依赖 Ziwei / Engine / UI.fmt。挂 window.UI.ziwei。
 */
;(function () {
  'use strict'
  var Z = window.Ziwei, E = window.Engine
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var HUA_CLS = { 化禄: 'lu', 化权: 'quan', 化科: 'ke', 化忌: 'ji' }
  var HUA_CN = { 化禄: '禄', 化权: '权', 化科: '科', 化忌: '忌' }
  var LAYER_CN = { dx: '大限', nian: '流年', yue: '流月', ri: '流日' }
  var LAYER_BADGE = { dx: '限', nian: '年', yue: '月', ri: '日' }
  var HUA_POP = {
    化禄: '得滋润——此处的事顺水推舟，宜落实',
    化权: '得权柄——此处宜主动出手、当仁不让',
    化科: '得护持——此处宜亮相正名，文书名声有助',
    化忌: '多牵挂——此处易反复多想，宜慢半拍、留余地（非凶，是功课）'
  }

  // 渲染态
  var curLayer = 'ri'
  var lastZw = null, lastFl = null
  var activeGong = null, activeDate = ''
  var prevGongs = null
  var resizeBound = false

  function starHTML(s) {
    var el = Z.STAR_EL[s.name] || '土'
    var hua = s.hua ? '<i class="zw-hua zw-hua-' + HUA_CLS[s.hua] + '">' + HUA_CN[s.hua] + '</i>' : ''
    return '<span class="zw-star ' + (s.major ? 'zw-major' : 'zw-minor') + ' zwc-' + F.WX[el] + '" data-hint="' + s.name + '">' + s.name + hua + '</span>'
  }

  function layerAt(fl, gong) {
    var hits = []
    if (fl.dx && !fl.dx.tong && fl.dx.gong === gong) hits.push('dx')
    if (fl.nian.gong === gong) hits.push('nian')
    if (fl.yue.gong === gong) hits.push('yue')
    if (fl.ri.gong === gong) hits.push('ri')
    return hits
  }

  function palaceHTML(p, zw, fl, flowMap) {
    var sfsz = Z.sanFangSiZheng(zw.ming)
    var cls = 'zw-cell'
    if (p.name === '命宫') cls += ' zw-ming'
    else if (sfsz.indexOf(p.zhiIdx) >= 0) cls += ' zw-sfsz'
    var majors = p.stars.filter(function (s) { return s.major })
    var minors = p.stars.filter(function (s) { return !s.major })
    var lay = layerAt(fl, p.zhiIdx).map(function (k) {
      return '<span class="zw-lay zw-lay-' + (k === 'dx' ? 'x' : k === 'nian' ? 'n' : k === 'yue' ? 'y' : 'r') + '">' + LAYER_BADGE[k] + '</span>'
    }).join('')
    var flow = flowMap[p.zhiIdx]
      ? '<span class="zw-flow">' + flowMap[p.zhiIdx].map(function (x) { return '<i class="zw-hua zw-hua-' + HUA_CLS[x.hua] + ' zw-hua-flow">' + LAYER_BADGE[curLayer] + HUA_CN[x.hua] + '</i>' }).join('') + '</span>'
      : ''
    return '<div class="' + cls + '" style="grid-area:p' + p.zhiIdx + '" data-zhi="' + p.zhiIdx + '" title="点开看此宫详批">' +
      '<div class="zw-head"><span class="zw-pname" data-hint="' + p.name + '">' + p.name + '</span>' +
        (p.isShen ? '<span class="zw-shen">身</span>' : '') + lay +
        '<span class="zw-gz">' + p.gan + p.zhi + '</span></div>' +
      '<div class="zw-stars">' +
        (majors.length ? majors.map(starHTML).join('') : '<span class="zw-empty">借对宫</span>') +
      '</div>' +
      (minors.length ? '<div class="zw-minors">' + minors.map(starHTML).join('') + '</div>' : '') +
      flow +
    '</div>'
  }

  // ———— 三方四正连线（SVG 覆盖层；焦点宫 = 点选宫，默认流日宫） ————
  function drawLinks() {
    var wrap = document.querySelector('.zw-wrap')
    var svg = document.getElementById('zw-links')
    if (!wrap || !svg || activeGong === null) return
    var wr = wrap.getBoundingClientRect()
    svg.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height)
    function center(z) {
      var el = wrap.querySelector('.zw-cell[data-zhi="' + z + '"]')
      if (!el) return null
      var r = el.getBoundingClientRect()
      return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 }
    }
    var a = center(activeGong)
    if (!a) { svg.innerHTML = ''; return }
    var out = ''
    ;[[6, 'zl-dui'], [4, 'zl-he'], [8, 'zl-he']].forEach(function (pair) {
      var b = center((activeGong + pair[0]) % 12)
      if (b) out += '<line class="' + pair[1] + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>'
    })
    out += '<circle class="zl-dot" cx="' + a.x + '" cy="' + a.y + '" r="4"/>'
    svg.innerHTML = out
    // 焦点宫与会商三宫的高亮
    var cells = wrap.querySelectorAll('.zw-cell')
    for (var i = 0; i < cells.length; i++) {
      var z = Number(cells[i].dataset.zhi)
      cells[i].classList.toggle('zw-act', z === activeGong)
      cells[i].classList.toggle('zw-mate', z === (activeGong + 4) % 12 || z === (activeGong + 6) % 12 || z === (activeGong + 8) % 12)
    }
  }

  // 点宫：换三方四正焦点 + 出详批浮层（app.js 调用）
  function onPalaceClick(zhiIdx) {
    activeGong = zhiIdx
    drawLinks()
    return palacePopHTML(zhiIdx)
  }

  // ———— 宫位详批（教看法 + 给分析） ————
  function gsDesc(zw, gong) {
    var g = Z.gongStars(zw, gong)
    if (!g.stars.length) return '无主星'
    return g.stars.slice(0, 2).map(function (s) { return s.name }).join('、') + (g.borrowed ? '（借）' : '')
  }
  function palacePopHTML(zhiIdx) {
    if (!lastZw) return '<button class="pop-x" data-action="closePop">×</button><h4>星盘未就绪</h4>'
    var zw = lastZw, fl = lastFl
    var p = null
    zw.palaces.forEach(function (x) { if (x.zhiIdx === zhiIdx) p = x })
    if (!p) return ''
    var x = '<button class="pop-x" data-action="closePop">×</button>'
    x += '<h4>' + p.name + '<span class="t-se">' + p.gan + p.zhi + (p.isShen ? ' · 身宫' : '') + '</span></h4>'
    x += '<p class="one">' + (Z.PALACE_NOTE[p.name] || '') + '。</p>'
    // 星曜（可点）
    var majors = p.stars.filter(function (s) { return s.major })
    p.stars.forEach(function (s) {
      x += '<div class="tp"><b class="zw-pop-star" data-hint="' + s.name + '">' + s.name + (s.hua ? '·生年' + HUA_CN[s.hua] : '') + '</b>' + (Z.STAR_NOTE[s.name] || '') + '</div>'
    })
    // 无主星：教「怎么借」
    if (!majors.length) {
      var oppZ = (zhiIdx + 6) % 12
      var opp = Z.gongStars(zw, zhiIdx)
      x += '<div class="tp"><b>怎么借对宫</b>十二宫两两相望（' + Z.ZHI[zhiIdx] + '↔' + Z.ZHI[oppZ] + '）。本宫无主星时，取对宫主星「' +
        (opp.stars.map(function (s) { return s.name }).join('、') || '亦静') + '」的气质来参此宫之事——力量约打七折：<b>重其气质、轻其强旺</b>。</div>'
    }
    // 三方四正：教「怎么会商」
    var he1 = (zhiIdx + 4) % 12, dui = (zhiIdx + 6) % 12, he2 = (zhiIdx + 8) % 12
    function pName(z) { var n = ''; zw.palaces.forEach(function (q) { if (q.zhiIdx === z) n = q.name }); return n }
    x += '<div class="tp"><b>三方四正</b>看一宫不单看本宫——与它三合的「' +
      pName(he1) + '（' + Z.ZHI[he1] + '·' + gsDesc(zw, he1) + '）」「' + pName(he2) + '（' + Z.ZHI[he2] + '·' + gsDesc(zw, he2) +
      '）」与对照的「' + pName(dui) + '（' + Z.ZHI[dui] + '·' + gsDesc(zw, dui) + '）」四宫同参：本宫为体、三方来朝，四宫之星共同定调。盘上青线即此。</div>'
    // 运限视角：大限 / 流年 / 流月 / 流日 与此宫的关系（真正的分析）
    if (fl) {
      var rows = []
      if (fl.dx && !fl.dx.tong && fl.dx.gong === zhiIdx) rows.push('<b>大限</b>' + fl.dx.startAge + '–' + fl.dx.endAge + ' 岁正行此宫——这十年的主题聚在「' + (Z.PALACE_NOTE[p.name] || p.name) + '」，宫中之星即十年之臣。')
      if (fl.nian.gong === zhiIdx) rows.push('<b>流年</b>' + fl.nian.gan + fl.nian.zhi + '年太岁坐此——今年的功课在这一司，此宫之事今年被反复叩问。')
      if (fl.yue.gong === zhiIdx) rows.push('<b>流月</b>' + fl.yue.gan + fl.yue.zhi + '月气临此——本月的题眼。')
      if (fl.ri.gong === zhiIdx) rows.push('<b>流日</b>' + fl.ri.gan + fl.ri.zhi + '日气聚此——今日之事多与此宫相干。')
      ;['dx', 'nian', 'yue', 'ri'].forEach(function (k) {
        var L = k === 'dx' ? fl.dx : fl[k]
        if (!L || L.tong || !L.sihua) return
        L.sihua.list.forEach(function (h) {
          if (h.zhiIdx === zhiIdx) rows.push('<b>' + LAYER_CN[k] + h.hua.slice(1) + '</b>' + h.star + h.hua + '入此——' + HUA_POP[h.hua] + '。')
        })
      })
      if (rows.length) x += rows.map(function (r) { return '<div class="tp good">' + r + '</div>' }).join('')
      else x += '<div class="tp"><b>此日</b>大限、流年、流月、流日皆不在此宫，四化亦未入——此司今日无事，各安其位。</div>'
    }
    x += '<div class="dao">宫如朝中一司，星如当值之臣；限年月日如四道公文，到哪一司，哪一司便忙。</div>'
    return x
  }

  function setLayer(l) { if (LAYER_CN[l]) curLayer = l }

  function renderZiwei(state) {
    var host = document.getElementById('ziwei')
    if (!host) return
    if (!state.chart || !window.Ziwei) {
      lastZw = lastFl = null; prevGongs = null
      host.innerHTML =
        '<h2 class="sect-title">紫微斗数 · 个人星盘</h2>' +
        '<div class="dash-cta"><button class="btn" data-action="gotoIntake">录入生辰 · 排你的紫微星盘</button>' +
        '<span class="hint">与八字同一份生辰，本机排盘不上传</span></div>'
      return
    }
    var zw = state.zw
    if (!zw) { host.innerHTML = ''; return }

    var sel = state.sel || F.TODAY
    var isToday = F.same(sel, F.TODAY)
    var d = E.buildDay(sel)
    var fl = Z.flowLayers(zw, sel)
    var ad = Z.dayAdvice(zw, sel)
    lastZw = zw; lastFl = fl
    if (curLayer === 'dx' && (!fl.dx || fl.dx.tong)) curLayer = 'ri'

    // 焦点宫：跟随流日宫（换日即移，配残影可见「轨迹」）；点宫可改
    if (activeDate !== d.solarYmd || activeGong === null) { activeGong = fl.ri.gong; activeDate = d.solarYmd }

    var curL = curLayer === 'dx' ? fl.dx : fl[curLayer]
    var flowMap = {}
    if (curL && curL.sihua) curL.sihua.list.forEach(function (h) { (flowMap[h.zhiIdx] = flowMap[h.zhiIdx] || []).push(h) })

    var dateBar =
      '<div class="zw-datebar">' +
        '<button class="cal-nav" data-action="zwPrev" title="前一日">‹</button>' +
        '<span class="zw-date"><b>' + d.solarYmd + '</b> ' + d.weekday + (isToday ? ' · 今天' : '') +
          '<span class="zw-date-lunar">' + fl.lunarDesc + '</span></span>' +
        '<button class="cal-nav" data-action="zwNext" title="后一日">›</button>' +
        (isToday ? '' : '<button class="cal-today" data-action="today">回今天</button>') +
        '<span class="zw-date-note">与万年历同步 · 换日看星宫走动</span>' +
      '</div>'

    function layChip(k) {
      var L = k === 'dx' ? fl.dx : fl[k]
      if (!L || L.tong) return ''
      var txt = k === 'dx'
        ? LAYER_CN.dx + ' ' + L.startAge + '–' + L.endAge + '岁 · 行' + L.palace
        : LAYER_CN[k] + ' ' + L.gan + L.zhi + ' · 入' + L.palace
      return '<button class="zw-laybtn' + (curLayer === k ? ' on' : '') + '" data-action="zwLayer" data-layer="' + k + '">' + txt + '</button>'
    }
    var layerBar =
      '<div class="zw-layerbar"><span class="zw-c-k">运限推宫</span>' +
        layChip('dx') + layChip('nian') + layChip('yue') + layChip('ri') +
      '</div>' +
      '<div class="zw-lb-note">点选看该层四化排布 · 斗君在' + Z.ZHI[fl.douJun] + '宫——流日每日顺行一宫、流月每月一宫、流年随太岁，此即星盘上的时间刻度</div>'

    var cells = zw.palaces.map(function (p) { return palaceHTML(p, zw, fl, flowMap) }).join('')
    var sihua = zw.sihua.map(function (s, i) {
      return '<span class="zw-shl"><i class="zw-hua zw-hua-' + HUA_CLS[Z.SIHUA_NAMES[i]] + '">' + HUA_CN[Z.SIHUA_NAMES[i]] + '</i>' + s + '</span>'
    }).join('')
    var center =
      '<div class="zw-center" style="grid-area:c">' +
        '<div class="zw-c-title">' + zw.yearGan + zw.yearZhi + '年 · ' + zw.lunarDesc + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">五行局</span><b>' + zw.juName + '</b><span class="zw-c-k" style="min-width:auto">命／身</span>' + zw.mingZhi + '宫 · ' + zw.shenZhi + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">大限</span>' +
          (fl.dx ? (fl.dx.tong ? '童限（' + fl.dx.startAge + '岁起第一限）' : '<b>' + fl.dx.startAge + '–' + fl.dx.endAge + '岁</b> 行「' + fl.dx.palace + '」' + (fl.dx.shun ? '顺行' : '逆行')) : '—') + '</div>' +
        '<div class="zw-c-row zw-c-sihua"><span class="zw-c-k">生年四化</span>' + sihua + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">' + LAYER_CN[curLayer] + '四化</span>' +
          (curL && curL.sihua ? curL.sihua.list.map(function (h) {
            return '<span class="zw-fl-item">' + h.hua.slice(1) + '→' + h.star + '<i>' + (h.palace || h.zhi) + (h.inSFSZ ? '·入垣' : '') + '</i></span>'
          }).join('') : '—') + '</div>' +
        '<div class="zw-c-note">安星依《紫微斗数全书》通行诀 · 闰月归本月 · 庚干四化「阳武阴同」· 大限阳男阴女顺行；流层从农历岁首与斗君法</div>' +
      '</div>'

    var starRows = ad.starLines.map(function (s) {
      return '<div class="dy-row good"><span class="dy-k">宜</span><b class="zw-adv-star" data-hint="' + s.star + '">' + s.star + '</b>' + s.yi + '</div>' +
        '<div class="dy-row care"><span class="dy-k">忌</span>' + s.ji + '</div>'
    }).join('')
    var huaRows = ad.huaLines.map(function (h) {
      return '<li><i class="zw-hua zw-hua-' + HUA_CLS[h.hua] + '">' + HUA_CN[h.hua] + '</i>' + h.text + (h.inSFSZ ? '<span class="zw-inyuan">入命垣</span>' : '') + '</li>'
    }).join('')
    var advice =
      '<div class="zw-advice">' +
        '<div class="obs-cap">' + (isToday ? '紫微观今日' : '紫微观此日 · ' + d.solarYmd) + '<span class="obs-sub">运限 × 流日入宫 × 星性 × 四化</span></div>' +
        (ad.yunxian ? '<div class="zw-yunxian">' + ad.yunxian + '</div>' : '') +
        '<div class="zw-adv-theme">' + ad.theme + '</div>' +
        starRows +
        '<ul class="obs-list zw-hua-list">' + huaRows + '</ul>' +
        '<div class="zw-chen">' + ad.chen + '</div>' +
      '</div>'

    host.innerHTML =
      '<h2 class="sect-title">紫微斗数 · 个人星盘 <span class="sect-sub">互动 · 与万年历同步</span></h2>' +
      dateBar + layerBar +
      '<div class="zw-wrap"><div class="zw-grid">' + cells + center + '</div><svg id="zw-links" class="zw-links" preserveAspectRatio="none"></svg></div>' +
      '<div class="zw-legend">' +
        '<span class="zw-lg"><span class="zw-lay zw-lay-x">限</span><span class="zw-lay zw-lay-n">年</span><span class="zw-lay zw-lay-y">月</span><span class="zw-lay zw-lay-r">日</span>运限落宫</span>' +
        '<span class="zw-lg zw-lg-sfsz">青线 = 焦点宫的三方四正（实线对照 · 虚线三合）· 点任一宫换焦点看详批</span>' +
      '</div>' +
      advice +
      '<div class="disclaimer">星曜如朝臣，各有司职、各有两面——点星、点宫名、点宫格皆可细看。紫微与八字是两把尺，参差处正是可玩味处；皆为参考视角，非断言。</div>'

    // 流曜运动轨迹：换日/换月时，旧宫留残影渐隐——星宫的「走动」看得见
    var wrapEl = host.querySelector('.zw-wrap')
    if (prevGongs && wrapEl) {
      ;[['ri', fl.ri.gong], ['yue', fl.yue.gong], ['nian', fl.nian.gong]].forEach(function (pair) {
        var old = prevGongs[pair[0]]
        if (old === undefined || old === pair[1]) return
        var cell = wrapEl.querySelector('.zw-cell[data-zhi="' + old + '"]')
        if (cell) {
          var g = document.createElement('span')
          g.className = 'zw-ghost zw-ghost-' + pair[0]
          g.textContent = LAYER_BADGE[pair[0] === 'ri' ? 'ri' : pair[0] === 'yue' ? 'yue' : 'nian']
          g.addEventListener('animationend', function () { g.remove() })
          cell.appendChild(g)
        }
      })
    }
    prevGongs = { ri: fl.ri.gong, yue: fl.yue.gong, nian: fl.nian.gong }

    requestAnimationFrame(drawLinks)
    if (!resizeBound) {
      resizeBound = true
      window.addEventListener('resize', function () { requestAnimationFrame(drawLinks) })
    }
  }

  UI.ziwei = { renderZiwei: renderZiwei, setLayer: setLayer, palacePopHTML: palacePopHTML, onPalaceClick: onPalaceClick }
})()
