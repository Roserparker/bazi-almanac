/*
 * ui/ziwei.js · 紫微斗数星盘卡（互动版 · 与万年历融合）
 * 星盘跟随万年历选定日：流年/流月/流日三层推宫（斗君法）在宫格上打「年月日」章，
 * 四化排布可按层切换；点宫位看该宫详批浮层；下方由「流日入宫×星性×四化」生成当日建议。
 * 依赖 Ziwei / Engine / UI.fmt / UI.popups。挂 window.UI.ziwei。
 */
;(function () {
  'use strict'
  var Z = window.Ziwei, E = window.Engine
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var HUA_CLS = { 化禄: 'lu', 化权: 'quan', 化科: 'ke', 化忌: 'ji' }
  var HUA_CN = { 化禄: '禄', 化权: '权', 化科: '科', 化忌: '忌' }
  var LAYER_CN = { nian: '流年', yue: '流月', ri: '流日' }

  // 渲染态（供层切换与宫位浮层复用）
  var curLayer = 'ri'
  var lastZw = null, lastFl = null

  function starHTML(s) {
    var el = Z.STAR_EL[s.name] || '土'
    var hua = s.hua ? '<i class="zw-hua zw-hua-' + HUA_CLS[s.hua] + '">' + HUA_CN[s.hua] + '</i>' : ''
    return '<span class="zw-star ' + (s.major ? 'zw-major' : 'zw-minor') + ' zwc-' + F.WX[el] + '" data-hint="' + s.name + '">' + s.name + hua + '</span>'
  }

  function palaceHTML(p, zw, fl, flowMap) {
    var sfsz = Z.sanFangSiZheng(zw.ming)
    var cls = 'zw-cell'
    if (p.name === '命宫') cls += ' zw-ming'
    else if (sfsz.indexOf(p.zhiIdx) >= 0) cls += ' zw-sfsz'
    var majors = p.stars.filter(function (s) { return s.major })
    var minors = p.stars.filter(function (s) { return !s.major })
    // 流层落宫章：年 / 月 / 日
    var lay = ''
    if (fl) {
      if (fl.nian.gong === p.zhiIdx) lay += '<span class="zw-lay zw-lay-n">年</span>'
      if (fl.yue.gong === p.zhiIdx) lay += '<span class="zw-lay zw-lay-y">月</span>'
      if (fl.ri.gong === p.zhiIdx) lay += '<span class="zw-lay zw-lay-r">日</span>'
    }
    var flow = flowMap[p.zhiIdx]
      ? '<span class="zw-flow">' + flowMap[p.zhiIdx].map(function (x) { return '<i class="zw-hua zw-hua-' + HUA_CLS[x.hua] + ' zw-hua-flow">' + LAYER_CN[curLayer].slice(1) + HUA_CN[x.hua] + '</i>' }).join('') + '</span>'
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

  // 宫位详批浮层（点宫格触发；app.js 传坐标给 popups）
  function palacePopHTML(zhiIdx) {
    if (!lastZw) return '<button class="pop-x" data-action="closePop">×</button><h4>星盘未就绪</h4>'
    var zw = lastZw, fl = lastFl
    var p = null
    zw.palaces.forEach(function (x) { if (x.zhiIdx === zhiIdx) p = x })
    if (!p) return ''
    var x = '<button class="pop-x" data-action="closePop">×</button>'
    x += '<h4>' + p.name + '<span class="t-se">' + p.gan + p.zhi + (p.isShen ? ' · 身宫' : '') + '</span></h4>'
    x += '<p class="one">' + (Z.PALACE_NOTE[p.name] || '') + '。</p>'
    var majors = p.stars.filter(function (s) { return s.major })
    if (!majors.length) {
      var opp = Z.gongStars(zw, zhiIdx)
      x += '<p>此宫无主星——借对宫（' + Z.ZHI[(zhiIdx + 6) % 12] + '）之星观之：' + (opp.stars.map(function (s) { return s.name }).join('、') || '亦静') + '。</p>'
    }
    p.stars.forEach(function (s) {
      x += '<div class="tp"><b>' + s.name + (s.hua ? '·生年' + s.hua.slice(1) : '') + '</b>' + (Z.STAR_NOTE[s.name] || '') + '</div>'
    })
    if (fl) {
      var hits = []
      if (fl.nian.gong === zhiIdx) hits.push('流年（' + fl.nian.gan + fl.nian.zhi + '）坐此')
      if (fl.yue.gong === zhiIdx) hits.push('流月（' + fl.yue.gan + fl.yue.zhi + '）坐此')
      if (fl.ri.gong === zhiIdx) hits.push('流日（' + fl.ri.gan + fl.ri.zhi + '）坐此')
      fl[curLayer].sihua.list.forEach(function (h) {
        if (h.zhiIdx === zhiIdx) hits.push(LAYER_CN[curLayer] + h.hua + '（' + h.star + '）落此')
      })
      if (hits.length) x += '<div class="tp good"><b>此日</b>' + hits.join('；') + '。</div>'
    }
    x += '<div class="dao">宫如朝中一司，星如当值之臣——观其所司、用其所长。</div>'
    return x
  }

  function setLayer(l) { if (LAYER_CN[l]) curLayer = l }

  function renderZiwei(state) {
    var host = document.getElementById('ziwei')
    if (!host) return
    if (!state.chart || !window.Ziwei) {
      lastZw = lastFl = null
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

    // 当前层四化 → 宫位映射
    var flowMap = {}
    fl[curLayer].sihua.list.forEach(function (h) { (flowMap[h.zhiIdx] = flowMap[h.zhiIdx] || []).push(h) })

    // 日期条（跟随万年历选定日 + 前后翻）
    var dateBar =
      '<div class="zw-datebar">' +
        '<button class="cal-nav" data-action="zwPrev" title="前一日">‹</button>' +
        '<span class="zw-date"><b>' + d.solarYmd + '</b> ' + d.weekday + (isToday ? ' · 今天' : '') +
          '<span class="zw-date-lunar">' + fl.lunarDesc + '</span></span>' +
        '<button class="cal-nav" data-action="zwNext" title="后一日">›</button>' +
        (isToday ? '' : '<button class="cal-today" data-action="today">回今天</button>') +
        '<span class="zw-date-note">与万年历同步 · 点历中任一日，星盘随之</span>' +
      '</div>'

    // 三层信息 + 四化层切换
    function layChip(k) {
      var L = fl[k]
      return '<button class="zw-laybtn' + (curLayer === k ? ' on' : '') + '" data-action="zwLayer" data-layer="' + k + '">' +
        LAYER_CN[k] + ' ' + L.gan + L.zhi + ' · 入' + L.palace + '</button>'
    }
    var layerBar =
      '<div class="zw-layerbar"><span class="zw-c-k">流层推宫</span>' +
        layChip('nian') + layChip('yue') + layChip('ri') +
        '<span class="zw-lb-note">点选看该层四化排布 · 斗君在' + Z.ZHI[fl.douJun] + '宫</span>' +
      '</div>'

    var cells = zw.palaces.map(function (p) { return palaceHTML(p, zw, fl, flowMap) }).join('')
    var sihua = zw.sihua.map(function (s, i) {
      return '<span class="zw-shl"><i class="zw-hua zw-hua-' + HUA_CLS[Z.SIHUA_NAMES[i]] + '">' + HUA_CN[Z.SIHUA_NAMES[i]] + '</i>' + s + '</span>'
    }).join('')
    var center =
      '<div class="zw-center" style="grid-area:c">' +
        '<div class="zw-c-title">' + zw.yearGan + zw.yearZhi + '年 · ' + zw.lunarDesc + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">五行局</span><b>' + zw.juName + '</b></div>' +
        '<div class="zw-c-row"><span class="zw-c-k">命／身</span>' + zw.mingZhi + '宫立命 · 身在' + zw.shenZhi + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">命主身主</span>' + zw.mingZhu + ' · ' + zw.shenZhu + '</div>' +
        '<div class="zw-c-row zw-c-sihua"><span class="zw-c-k">生年四化</span>' + sihua + '</div>' +
        '<div class="zw-c-row"><span class="zw-c-k">' + LAYER_CN[curLayer] + '四化</span>' +
          fl[curLayer].sihua.list.map(function (h) {
            return '<span class="zw-fl-item">' + h.hua.slice(1) + '→' + h.star + '<i>' + (h.palace || h.zhi) + (h.inSFSZ ? '·入垣' : '') + '</i></span>'
          }).join('') + '</div>' +
        '<div class="zw-c-note">安星依《紫微斗数全书》通行诀 · 闰月归本月 · 庚干四化从「阳武阴同」；流层从农历岁首与斗君法，与八字侧节气链各守其义</div>' +
      '</div>'

    // 当日建议（流日入宫 × 星性 × 四化）
    var starRows = ad.starLines.map(function (s) {
      return '<div class="dy-row good"><span class="dy-k">宜</span><b class="zw-adv-star" data-hint="' + s.star + '">' + s.star + '</b>' + s.yi + '</div>' +
        '<div class="dy-row care"><span class="dy-k">忌</span>' + s.ji + '</div>'
    }).join('')
    var huaRows = ad.huaLines.map(function (h) {
      return '<li><i class="zw-hua zw-hua-' + HUA_CLS[h.hua] + '">' + HUA_CN[h.hua] + '</i>' + h.text + (h.inSFSZ ? '<span class="zw-inyuan">入命垣</span>' : '') + '</li>'
    }).join('')
    var advice =
      '<div class="zw-advice">' +
        '<div class="obs-cap">' + (isToday ? '紫微观今日' : '紫微观此日 · ' + d.solarYmd) + '<span class="obs-sub">流日入宫 × 星性 × 四化</span></div>' +
        '<div class="zw-adv-theme">' + ad.theme + '</div>' +
        starRows +
        '<ul class="obs-list zw-hua-list">' + huaRows + '</ul>' +
        '<div class="zw-chen">' + ad.chen + '</div>' +
      '</div>'

    host.innerHTML =
      '<h2 class="sect-title">紫微斗数 · 个人星盘 <span class="sect-sub">互动 · 与万年历同步</span></h2>' +
      dateBar + layerBar +
      '<div class="zw-grid">' + cells + center + '</div>' +
      '<div class="zw-legend">' +
        '<span class="zw-lg"><span class="zw-lay zw-lay-n">年</span><span class="zw-lay zw-lay-y">月</span><span class="zw-lay zw-lay-r">日</span>流层落宫</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-lu">禄</i>如意财缘</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-quan">权</i>主动掌控</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-ke">科</i>声名护持</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-ji">忌</i>牵挂功课（非凶，是提醒）</span>' +
        '<span class="zw-lg zw-lg-sfsz">描边 = 命宫三方四正 · 点任一宫看详批</span>' +
      '</div>' +
      advice +
      '<div class="disclaimer">星曜如朝臣，各有司职、各有两面——点星、点宫名、点宫格皆可细看。紫微与八字是两把尺，参差处正是可玩味处；皆为参考视角，非断言。</div>'
  }

  UI.ziwei = { renderZiwei: renderZiwei, setLayer: setLayer, palacePopHTML: palacePopHTML }
})()
