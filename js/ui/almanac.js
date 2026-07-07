/*
 * ui/almanac.js · 万年历（月格 + 年月快跳）与选定日面板（时间层叠加）
 * 依赖 Engine / UI.fmt。挂 window.UI.almanac。渲染函数接收 app 的 state。
 */
;(function () {
  'use strict'
  var E = window.Engine
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  // 时间层叠加（大运 / 流年 / 流月 / 流日 × 十神 × 顺逆）
  // 顺逆标签：干支双计（Daily.dayHit：干 0.6 / 支 0.4），调候命中给鎏金标；「忌」软化为赭色空心章（去恐吓化）
  var FT_CLS = { tiaohou: 'th', xi: 'xi', ping: 'ping', ji: 'ji' }
  function favTag(gan, zhi, yong) {
    var D = window.Daily
    if (!yong || !D) return ''
    var h = D.dayHit(yong, E.GAN_WUXING[gan], E.ZHI_WUXING[zhi], gan)
    if (!h) return ''
    return '<span class="ft ft-' + FT_CLS[h.hit] + '">' + D.HIT_CN[h.hit] + '</span>'
  }
  function hitScore(gan, zhi, yong) {
    var D = window.Daily
    if (!yong || !D) return 0
    var h = D.dayHit(yong, E.GAN_WUXING[gan], E.ZHI_WUXING[zhi], gan)
    return h ? (h.hit === 'tiaohou' ? 1 : h.score) : 0
  }
  function tlRow(label, gz, dm, yong, extra) {
    if (!gz) return ''
    var gan = gz[0], ss = E.shiShen(dm, gan)
    return '<div class="tl-row"><span class="tl-label">' + label + '</span>' +
      '<span class="tl-gz">' + F.gzTok(gz) + '</span>' +
      F.wxBadge(gz) +
      '<span class="tl-ss">' + F.term(ss, 'shishen', ss) + '</span>' +
      favTag(gan, gz[1], yong) + (extra || '') + '</div>'
  }
  function timeStackHTML(chart, yong, d) {
    var dm = chart.dayMaster.gan
    var cur = E.currentDaYun(chart, d.year)
    var rows = cur
      ? tlRow('大运', cur.ganZhi, dm, yong, '<span class="tl-x">' + cur.startAge + '岁起</span>')
      : '<div class="tl-row"><span class="tl-label">大运</span><span class="tl-none">' + F.daYunNote(chart, d.year) + '</span></div>'
    rows += tlRow('流年', d.liunian, dm, yong)
    rows += tlRow('流月', d.liuyue, dm, yong)
    rows += tlRow('流日', d.liuri, dm, yong)
    var sum = hitScore(d.liunianGan, d.liunianZhi, yong) + hitScore(d.liuyueGan, d.liuyueZhi, yong) + hitScore(d.liuriGan, d.liuriZhi, yong)
    if (cur && cur.ganZhi) sum += hitScore(cur.ganZhi[0], cur.ganZhi[1], yong)
    var tone = sum > 0.5 ? '整体偏顺 —— 多层之气落在你的喜用，宜进取' : sum < -0.5 ? '整体偏缓 —— 多层之气偏你的忌神，宜守、宜缓' : '顺逆参半 —— 平稳，照常即可'
    return '<div class="timestack">' +
      '<div class="ts-cap">时间层叠加 · 大运 → 流年 → 流月 → 流日（日主 ' + dm + '）</div>' +
      rows + '<div class="ts-tone">' + tone + '</div></div>'
  }

  // 某一层（流年/流月）与本命四柱的关系速记
  function layerRelSummary(chart, key, label, gan, zhi) {
    var I = window.Interpret
    var pos = ['year', 'month', 'day', 'time'].map(function (k) {
      return { key: k, label: I.LABEL[k], gan: chart.pillars[k].gan, zhi: chart.pillars[k].zhi }
    })
    pos.push({ key: key, label: label, gan: gan, zhi: zhi })
    var rels = I.mergeRelations(I.findRelations(pos).filter(function (r) { return r.members.indexOf(key) >= 0 }))
    if (!rels.length) return ''
    var parts = rels.map(function (r) {
      var natal = r.members.filter(function (m) { return m !== key })
        .map(function (m) { return I.LABEL[m] || m }).join('')
      return r.chars.join('') + (r.type === '刑' && r.chars[0] === r.chars[1] ? '自刑' : r.type) + (r.element ? '化' + r.element : '') + '·落' + natal
    })
    return '<div class="lr-line"><span class="lr-k">' + label + zhi + ' 与命局</span>' + parts.join('　') + '</div>'
  }

  // 通用老黄历折叠条（千人一面的参考，与个人顺逆区分开）
  function folkFold(d) {
    var yi = d.yi.map(function (x) { return '<span class="chip">' + x + '</span>' }).join('')
    var ji = d.ji.map(function (x) { return '<span class="chip">' + x + '</span>' }).join('')
    return '<details class="folk"><summary>传统黄历参考（通用，千人一面）</summary>' +
      '<div class="folk-note">以下为旧式黄历的通用宜忌，人人相同，仅作民俗参考——个人化的顺逆以你的命盘为准。</div>' +
      '<div class="yiji">' +
        '<div class="col"><span class="lab yi">宜</span>' + (yi || '<span class="chip">诸事可为</span>') + '</div>' +
        '<div class="col"><span class="lab ji">忌</span>' + (ji || '<span class="chip">无</span>') + '</div>' +
      '</div>' +
      '<div class="dp-meta"><span>纳音 ' + d.dayNaYin + '</span><span>冲 ' + d.chong + '</span><span>煞 ' + d.sha + '</span><span>值 ' + d.zhiXing + '</span></div>' +
    '</details>'
  }

  // 化机指数分析块（v2 五因子；idxBlockHTML 供观象台等复用）
  function partBar(label, v, hintKey) {
    var pct = Math.round(Math.abs(v) * 50)
    var pos = v >= 0
    var fill = '<span class="pb-f ' + (pos ? 'pb-pos' : 'pb-neg') + '" style="width:' + pct + '%;' + (pos ? 'left:50%' : 'right:50%') + '"></span>'
    return '<div class="idx-part"><span class="ip-k"' + (hintKey ? ' data-hint="' + hintKey + '"' : '') + '>' + label + '</span>' +
      '<span class="pb"><span class="pb-mid"></span>' + fill + '</span>' +
      '<span class="ip-v">' + (v > 0 ? '+' : '') + Math.round(v * 100) + '</span></div>'
  }
  // 五行能量谱：五色横杆 + 喜△忌▽ 标记
  function energySpectrumHTML(en, yong) {
    if (!en) return ''
    var rows = ['木', '火', '土', '金', '水'].map(function (w) {
      var mark = ''
      if (yong && yong.favorable && yong.favorable.indexOf(w) >= 0) mark = '<i class="es-mark es-fav">△喜</i>'
      else if (yong && yong.unfavorable && yong.unfavorable.indexOf(w) >= 0) mark = '<i class="es-mark es-unf">▽忌</i>'
      return '<div class="es-row"><span class="es-k" style="color:' + F.ELC[w] + '">' + w + '</span>' +
        '<span class="es-bar"><span class="es-fill" style="width:' + Math.min(100, en.pct[w]) + '%;background:' + F.ELC[w] + '"></span></span>' +
        '<span class="es-v">' + en.pct[w] + '%</span>' + mark + '<span class="es-season">' + en.seasons[w] + '</span></div>'
    }).join('')
    return '<div class="es" data-hint="五行能量"><div class="es-cap">五行能量谱 · 月令' + en.ruler + '当权（旺相休囚死已计入）</div>' + rows + '</div>'
  }
  function layerDetailHTML(ld, dayunLabel) {
    if (!ld) return ''
    function chip(k, v) {
      if (v === null || v === undefined) return ''
      return '<span class="idx-lc">' + k + ' <b class="' + (v > 0.15 ? 'lc-pos' : v < -0.15 ? 'lc-neg' : '') + '">' + (v > 0 ? '+' : '') + Math.round(v * 100) + '</b></span>'
    }
    return '<div class="idx-sub">' + chip(dayunLabel || '大运', ld.dayun) + chip('流年', ld.liunian) + chip('流月', ld.liuyue) + '</div>'
  }
  function idxBlockHTML(ix, opts, yong) {
    if (!ix) return ''
    var o = opts || {}
    var zwSub = ''
    if (ix.zwFlow && ix.zwFlow.list.length) {
      zwSub = '<div class="idx-sub">' + ix.zwFlow.list.map(function (x) {
        return '<span class="idx-lc' + (x.inSFSZ ? ' lc-hit' : '') + '">' + x.hua.slice(1) + '→' + (x.palace || x.zhi) + (x.inSFSZ ? '·入垣' : '') + '</span>'
      }).join('') + '</div>'
    }
    return '<div class="idx">' +
      '<div class="idx-head"><span class="idx-cap" data-hint="化机指数">化机指数</span>' +
        '<b class="idx-score">' + ix.score + '</b><span class="idx-band idx-b-' + ix.band + '">' + ix.band + '</span>' +
        (ix.parts.tiaohou ? '<span class="ft ft-th">调候加成</span>' : '') + '</div>' +
      '<div class="idx-bar"><span class="idx-needle" style="left:' + ix.score + '%"></span></div>' +
      partBar('流日契合', ix.parts.fit) +
      partBar('五行能量', ix.parts.energy, '五行能量') +
      partBar('层运共振', ix.parts.layers) +
      layerDetailHTML(ix.parts.layerDetail, o.dayunLabel) +
      partBar('合冲动静', ix.parts.motion) +
      (ix.parts.ziwei === null || ix.parts.ziwei === undefined ? '' : partBar('紫微流曜', ix.parts.ziwei, '紫微流曜') + zwSub) +
      energySpectrumHTML(ix.energy, yong) +
      '<div class="idx-advice">' + ix.advice + '<span class="idx-note">模型参考 · 非吉凶断言</span></div>' +
    '</div>'
  }
  function idxHTML(state, d) {
    var D = window.Daily
    if (!state.chart || !D || !D.dayIndex) return ''
    var ix = D.dayIndex(state.chart, state.st, state.yong, d, { zw: state.zw })
    return idxBlockHTML(ix, null, state.yong)
  }

  function renderDayPanel(state, sel) {
    var d = E.buildDay(sel)
    var lr = state.chart
      ? layerRelSummary(state.chart, 'liunian', '流年', d.liunianGan, d.liunianZhi) +
        layerRelSummary(state.chart, 'liuyue', '流月', d.liuyueGan, d.liuyueZhi)
      : ''
    // 紫微速记：此日流日入何宫、禄忌何在（详见紫微板块）
    if (state.zw && window.Ziwei) {
      var flz = window.Ziwei.flowLayers(state.zw, sel)
      var lu2 = '', ji2 = ''
      flz.ri.sihua.list.forEach(function (h) { if (h.hua === '化禄') lu2 = h.palace; if (h.hua === '化忌') ji2 = h.palace })
      lr += '<div class="lr-line"><span class="lr-k">紫微此日</span>流日入「' + flz.ri.palace + '」 · 禄→' + (lu2 || '外') + ' 忌→' + (ji2 || '外') +
        '　<a href="#ziwei" class="link-btn">看星盘 ↓</a></div>'
    }
    return (
      '<div class="day-panel">' +
        '<div class="dp-top">' +
          '<span class="dp-date">' + d.solarYmd + ' ' + d.weekday + (F.same(sel, F.TODAY) ? ' · 今天' : '') + '</span>' +
          '<span class="dp-lunar">' + d.lunarStr + ' · 属' + d.shengXiao + (d.jieQi ? ' <span class="dp-jq">【' + d.jieQi + '】</span>' : '') + '</span>' + F.festChips(d.festivals) +
        '</div>' +
        (state.chart
          ? idxHTML(state, d) + timeStackHTML(state.chart, state.yong, d) + lr
          : '<div class="dp-gz">' +
              '<span><span class="g">流年</span>' + F.gzTok(d.liunian) + '</span>' +
              '<span><span class="g">流月</span>' + F.gzTok(d.liuyue) + '</span>' +
              '<span><span class="g">' + F.term('流日', 'terms', '流日') + '</span>' + F.gzTok(d.liuri) + '</span>' +
            '</div>') +
        folkFold(d) +
      '</div>'
    )
  }

  function renderAlmanac(state) {
    var el = document.getElementById('almanac')
    var y = state.cal.year, m = state.cal.month
    var days = E.monthDays(y, m)
    var firstWeek = days[0].week

    var D = window.Daily
    var canDot = !!(state.yong && D)
    var cnt = { tiaohou: 0, xi: 0, ping: 0, ji: 0 }
    var grid = ''
    F.WEEK_CN.forEach(function (w, i) {
      grid += '<div class="cal-wk' + (i === 0 || i === 6 ? ' wend' : '') + '">' + w + '</div>'
    })
    for (var i = 0; i < firstWeek; i++) grid += '<div class="cal-cell empty"></div>'
    days.forEach(function (d) {
      var solY = F.pad4(y) + '-' + F.pad2(m) + '-' + F.pad2(d.day)
      var isToday = solY === F.ymd(F.TODAY)
      var isSel = F.same({ year: y, month: m, day: d.day }, state.sel)
      // 副行优先级：节气（本站根基）> 节日 > 初一月名 > 农历日
      var sub, subCls = ''
      if (d.jieQi) { sub = d.jieQi; subCls = ' jq' }
      else if (d.fest) { sub = d.fest.name; subCls = ' f-' + d.fest.kind }
      else sub = d.lunarDayCn === '初一' ? d.lunarMonthCn + '月' : d.lunarDayCn
      var dot = ''
      if (canDot) {
        var cls = D.dayScore(d.liuriGan, d.liuriZhi, state.yong)
        cnt[cls]++
        if (cls !== 'ping') dot = '<span class="c-dot cd-' + cls + '"></span>'
      }
      grid +=
        '<button class="cal-cell' + (isToday ? ' today' : '') + (isSel ? ' sel' : '') + '" data-action="selectDay" data-day="' + d.day + '">' + dot +
          '<span class="c-num">' + d.day + '</span>' +
          '<span class="c-sub' + subCls + '">' + sub + '</span>' +
          '<span class="c-gz">' + d.ganZhiDay + '</span>' +
        '</button>'
    })
    var monthSum = canDot
      ? '<div class="cal-sum">本月大势：<span class="cs-th" data-hint="调候日">调候日 ' + cnt.tiaohou + '</span> · <span class="cs-xi" data-hint="顺">顺 ' + cnt.xi + '</span> · <span data-hint="平">平 ' + cnt.ping + '</span> · <span class="cs-ji" data-hint="留意">留意 ' + cnt.ji + '</span>' +
        '<span class="cal-leg"><span data-hint="调候日"><span class="c-dot cd-tiaohou"></span>调候</span> <span data-hint="顺"><span class="c-dot cd-xi"></span>顺</span> <span data-hint="留意"><span class="c-dot cd-ji"></span>留意</span></span></div>'
      : ''

    var yrs = ''
    for (var yy = 1901; yy <= 2099; yy++) yrs += '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + yy + '</option>'
    var mos = ''
    for (var mm = 1; mm <= 12; mm++) mos += '<option value="' + mm + '"' + (mm === m ? ' selected' : '') + '>' + mm + '</option>'
    el.innerHTML =
      '<h2 class="sect-title">万年历</h2>' +
      '<div class="cal-head">' +
        '<button class="cal-nav" data-action="prevMonth">‹</button>' +
        '<div class="cal-title"><select id="cal-y" class="cal-sel">' + yrs + '</select> 年 <select id="cal-m" class="cal-sel">' + mos + '</select> 月</div>' +
        '<button class="cal-nav" data-action="nextMonth">›</button>' +
        '<button class="cal-today" data-action="today">今天</button>' +
      '</div>' +
      monthSum +
      '<div class="cal-grid">' + grid + '</div>' +
      renderDayPanel(state, state.sel)
  }

  UI.almanac = {
    renderAlmanac: renderAlmanac, renderDayPanel: renderDayPanel, timeStackHTML: timeStackHTML,
    favTag: favTag, tlRow: tlRow, folkFold: folkFold, layerRelSummary: layerRelSummary,
    idxBlockHTML: idxBlockHTML, energySpectrumHTML: energySpectrumHTML
  }
})()
