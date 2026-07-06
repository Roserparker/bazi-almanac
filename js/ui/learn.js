/*
 * ui/learn.js · 教学区（八字怎么运作）与易学区（后天八卦方位图）
 * 依赖 Knowledge / UI.fmt。挂 window.UI.learn。
 */
;(function () {
  'use strict'
  var K = window.Knowledge
  var UI = (window.UI = window.UI || {})
  var F = UI.fmt

  function renderLearn() {
    var ps = K.intro.paragraphs.map(function (p) { return '<p>' + p + '</p>' }).join('')
    var st = K.intro.stance.map(function (s) { return '<li>' + s + '</li>' }).join('')
    var ss = Object.keys(K.shishen).map(function (k) { return F.term(k, 'shishen', k) }).join('、')
    var rl = Object.keys(K.relations).map(function (k) { return F.term(k, 'relations', k) }).join('、')
    var wx = Object.keys(K.wuxing).map(function (k) { return F.term(k, 'wuxing', k) }).join('、')
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
    var cx = 160, cy = 165, R = 110, out = ''
    order.forEach(function (name, i) {
      var ang = (-90 + i * 45) * Math.PI / 180
      var x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang)
      var b = B[name], col = F.ELC[b.wuxing]
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
        '<circle r="26" fill="' + hexA(F.ELC['土'], 0.14) + '" stroke="' + F.ELC['土'] + '" stroke-width="1.3"/>' +
        '<text class="bg-name" y="-3" fill="' + F.ELC['土'] + '">中宫</text>' +
        '<text class="bg-dir2" y="11" fill="' + F.ELC['土'] + '">土·五</text>' +
      '</g>'
    out +=
      '<text class="bg-edge" x="160" y="12">南</text>' +
      '<text class="bg-edge" x="160" y="327">北</text>' +
      '<text class="bg-edge" x="9" y="169">东</text>' +
      '<text class="bg-edge" x="311" y="169">西</text>'
    return '<svg viewBox="0 0 320 332" class="bagua-svg">' + out + '</svg>'
  }
  function renderYixue() {
    var y = K.yixue
    var ps = y.paragraphs.map(function (p) { return '<p>' + p + '</p>' }).join('')
    var chips = Object.keys(K.bagua).map(function (k) { return F.term(K.bagua[k].symbol + ' ' + k, 'bagua', k) }).join('　')
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

  UI.learn = { renderLearn: renderLearn, renderYixue: renderYixue, baguaSVG: baguaSVG }
})()
