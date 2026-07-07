/*
 * ui/ziwei.js · 紫微斗数星盘卡（辅助板块）
 * 4×4 宫格：外环十二宫（巳午未申 / 辰…酉 / 卯…戌 / 寅丑子亥），中央命造摘要。
 * 主星大字、辅星小字、生年四化章、身宫印、命宫三方四正描边、今日流日四化行。
 * 依赖 Ziwei / Engine / UI.fmt。挂 window.UI.ziwei。
 */
;(function () {
  'use strict'
  var Z = window.Ziwei, E = window.Engine
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  var HUA_CLS = { 化禄: 'lu', 化权: 'quan', 化科: 'ke', 化忌: 'ji' }
  var HUA_CN = { 化禄: '禄', 化权: '权', 化科: '科', 化忌: '忌' }

  function starHTML(s) {
    var el = Z.STAR_EL[s.name] || '土'
    var hua = s.hua ? '<i class="zw-hua zw-hua-' + HUA_CLS[s.hua] + '">' + HUA_CN[s.hua] + '</i>' : ''
    return '<span class="zw-star ' + (s.major ? 'zw-major' : 'zw-minor') + ' zwc-' + F.WX[el] + '" data-hint="' + s.name + '">' + s.name + hua + '</span>'
  }

  function palaceHTML(p, zw, flowMap) {
    var sfsz = Z.sanFangSiZheng(zw.ming)
    var cls = 'zw-cell'
    if (p.name === '命宫') cls += ' zw-ming'
    else if (sfsz.indexOf(p.zhiIdx) >= 0) cls += ' zw-sfsz'
    var majors = p.stars.filter(function (s) { return s.major })
    var minors = p.stars.filter(function (s) { return !s.major })
    var flow = flowMap[p.zhiIdx]
      ? '<span class="zw-flow" title="今日流曜">' + flowMap[p.zhiIdx].map(function (x) { return '<i class="zw-hua zw-hua-' + HUA_CLS[x.hua] + ' zw-hua-flow">流' + HUA_CN[x.hua] + '</i>' }).join('') + '</span>'
      : ''
    return '<div class="' + cls + '" style="grid-area:p' + p.zhiIdx + '">' +
      '<div class="zw-head"><span class="zw-pname" data-hint="' + p.name + '">' + p.name + '</span>' +
        (p.isShen ? '<span class="zw-shen">身</span>' : '') +
        '<span class="zw-gz">' + p.gan + p.zhi + '</span></div>' +
      '<div class="zw-stars">' +
        (majors.length ? majors.map(starHTML).join('') : '<span class="zw-empty">借对宫</span>') +
      '</div>' +
      (minors.length ? '<div class="zw-minors">' + minors.map(starHTML).join('') + '</div>' : '') +
      flow +
    '</div>'
  }

  function renderZiwei(state) {
    var host = document.getElementById('ziwei')
    if (!host) return
    if (!state.chart || !window.Ziwei) {
      host.innerHTML =
        '<h2 class="sect-title">紫微斗数 · 个人星盘</h2>' +
        '<div class="dash-cta"><button class="btn" data-action="gotoIntake">录入生辰 · 排你的紫微星盘</button>' +
        '<span class="hint">与八字同一份生辰，本机排盘不上传</span></div>'
      return
    }
    var zw = state.zw
    if (!zw) { host.innerHTML = ''; return }

    // 今日流日四化 → 宫位映射
    var d = E.buildDay(F.TODAY)
    var flow = Z.flowSiHua(zw, d.liuriGan)
    var flowMap = {}
    if (flow) flow.list.forEach(function (x) { (flowMap[x.zhiIdx] = flowMap[x.zhiIdx] || []).push(x) })

    var cells = zw.palaces.map(function (p) { return palaceHTML(p, zw, flowMap) }).join('')
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
        '<div class="zw-c-note">安星依《紫微斗数全书》通行诀 · 闰月归本月 · 庚干四化从「阳武阴同」</div>' +
      '</div>'

    var flowLine = flow
      ? '<div class="zw-flowline"><span class="zw-c-k" data-hint="紫微流曜">今日流曜</span>流日 ' + F.tok(d.liuriGan, E.GAN_WUXING[d.liuriGan]) + ' 引动：' +
        flow.list.map(function (x) {
          return '<span class="zw-fl-item">' + x.hua.slice(1) + '→' + x.star + '<i>' + (x.palace || x.zhi) + (x.inSFSZ ? '·入垣' : '') + '</i></span>'
        }).join('') +
        '<span class="zw-fl-score">对命垣影响 ' + (flow.score > 0 ? '+' : '') + Math.round(flow.score * 100) + '</span></div>'
      : ''

    host.innerHTML =
      '<h2 class="sect-title">紫微斗数 · 个人星盘 <span class="sect-sub">辅参 · 与八字互为镜鉴</span></h2>' +
      '<div class="zw-grid">' + cells + center + '</div>' +
      flowLine +
      '<div class="zw-legend">' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-lu">禄</i>如意财缘</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-quan">权</i>主动掌控</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-ke">科</i>声名护持</span>' +
        '<span class="zw-lg"><i class="zw-hua zw-hua-ji">忌</i>牵挂功课（非凶，是提醒）</span>' +
        '<span class="zw-lg zw-lg-sfsz">描边 = 命宫三方四正</span>' +
      '</div>' +
      '<div class="disclaimer">星曜如朝臣，各有司职、各有两面——点每颗星与宫名可看白话讲解。紫微与八字是两把尺，参差处正是可玩味处；皆为参考视角，非断言。</div>'
  }

  UI.ziwei = { renderZiwei: renderZiwei }
})()
