/*
 * interpret.js · 「能量化学反应」解读层
 * 1) 关系内核：天干五合 + 地支六冲 / 六合 / 相害 / 相破 / 相刑 / 三合 / 三会
 * 2) 把「当下干支 × 本命盘」翻译成克制、可读的中文 + 可供画图的结构化关系
 * 依赖 window.Engine（生克、十神、五行表）。
 */
;(function (root) {
  'use strict'
  var E = root.Engine

  var LABEL = { year: '年', month: '月', day: '日', time: '时', liuri: '流日', liuyue: '流月', liunian: '流年', dayun: '大运' }

  // —— 关系参照表 ——
  var GAN5HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' }
  var GAN5HE_WX = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' }
  var CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
  var HE6 = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }
  var HE6_WX = { 子丑: '土', 寅亥: '木', 卯戌: '火', 辰酉: '金', 巳申: '水', 午未: '土' }
  var HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' }
  var PO = { 子: '酉', 酉: '子', 午: '卯', 卯: '午', 巳: '申', 申: '巳', 寅: '亥', 亥: '寅', 辰: '丑', 丑: '辰', 戌: '未', 未: '戌' }
  var SANHE = [
    { z: ['申', '子', '辰'], wx: '水', wang: '子' },
    { z: ['亥', '卯', '未'], wx: '木', wang: '卯' },
    { z: ['寅', '午', '戌'], wx: '火', wang: '午' },
    { z: ['巳', '酉', '丑'], wx: '金', wang: '酉' }
  ]
  var SANHUI = [
    { z: ['寅', '卯', '辰'], wx: '木' },
    { z: ['巳', '午', '未'], wx: '火' },
    { z: ['申', '酉', '戌'], wx: '金' },
    { z: ['亥', '子', '丑'], wx: '水' }
  ]
  var XING3 = [['寅', '巳', '申'], ['丑', '戌', '未']]
  var ZIXING = { 辰: 1, 午: 1, 酉: 1, 亥: 1 }

  function pair(map, a, b) { return map[a + b] || map[b + a] || '' }

  // positions: [{ key, label, gan, zhi }]
  // 返回关系数组：{ type, kind:'gan'|'zhi', members:[key], chars:[..], element?, desc }
  function findRelations(positions) {
    var rels = []
    var n = positions.length

    // 两两
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var a = positions[i], b = positions[j]
        if (GAN5HE[a.gan] === b.gan) {
          var gw = pair(GAN5HE_WX, a.gan, b.gan)
          rels.push({ type: '五合', kind: 'gan', members: [a.key, b.key], chars: [a.gan, b.gan], element: gw, desc: '天干 ' + a.gan + b.gan + ' 合' + (gw ? '化' + gw : '') })
        }
        if (CHONG[a.zhi] === b.zhi) rels.push({ type: '冲', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], desc: '地支 ' + a.zhi + b.zhi + ' 相冲' })
        if (HE6[a.zhi] === b.zhi) { var hw = pair(HE6_WX, a.zhi, b.zhi); rels.push({ type: '合', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], element: hw, desc: '地支 ' + a.zhi + b.zhi + ' 六合' + (hw ? '化' + hw : '') }) }
        if (HAI[a.zhi] === b.zhi) rels.push({ type: '害', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], desc: '地支 ' + a.zhi + b.zhi + ' 相害' })
        if (PO[a.zhi] === b.zhi) rels.push({ type: '破', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], desc: '地支 ' + a.zhi + b.zhi + ' 相破' })
        if ((a.zhi === '子' && b.zhi === '卯') || (a.zhi === '卯' && b.zhi === '子'))
          rels.push({ type: '刑', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], desc: '子卯 相刑（无礼之刑）' })
        if (a.zhi === b.zhi && ZIXING[a.zhi])
          rels.push({ type: '刑', kind: 'zhi', members: [a.key, b.key], chars: [a.zhi, b.zhi], desc: a.zhi + a.zhi + ' 自刑' })
      }
    }

    // 三组：三合 / 三会 / 三刑（需三位俱全）
    function hasAll(zset) {
      var used = [], chosen = []
      for (var t = 0; t < zset.length; t++) {
        var found = -1
        for (var p = 0; p < n; p++) { if (used.indexOf(p) < 0 && positions[p].zhi === zset[t]) { found = p; break } }
        if (found < 0) return null
        used.push(found); chosen.push(positions[found].key)
      }
      return chosen
    }
    SANHE.forEach(function (s) { var m = hasAll(s.z); if (m) rels.push({ type: '三合', kind: 'zhi', members: m, chars: s.z.slice(), element: s.wx, desc: s.z.join('') + ' 三合 ' + s.wx + '局' }) })
    SANHUI.forEach(function (s) { var m = hasAll(s.z); if (m) rels.push({ type: '三会', kind: 'zhi', members: m, chars: s.z.slice(), element: s.wx, desc: s.z.join('') + ' 三会 ' + s.wx + '方' }) })
    XING3.forEach(function (z) { var m = hasAll(z); if (m) rels.push({ type: '刑', kind: 'zhi', members: m, chars: z.slice(), desc: z.join('') + ' 三刑' }) })

    return rels
  }

  function positionsOf(chart) {
    return ['year', 'month', 'day', 'time'].map(function (k) {
      return { key: k, label: LABEL[k], gan: chart.pillars[k].gan, zhi: chart.pillars[k].zhi }
    })
  }

  function chartRelations(chart) { return findRelations(positionsOf(chart)) }

  function dayRelations(chart, day) {
    var pos = positionsOf(chart)
    pos.push({ key: 'liuri', label: '流日', gan: day.liuriGan, zhi: day.liuriZhi })
    return findRelations(pos).filter(function (r) { return r.members.indexOf('liuri') >= 0 })
  }

  // 位置含义（哪一柱被触动）
  var POS_MEAN = {
    year: '年柱主早年、根基、长辈与祖业（约 16 岁前，也关乎名声与外部大环境）',
    month: '月柱主事业、父母与青年期（约 16–30 岁，是全局的提纲）',
    day: '日支是你的「夫妻宫」，主自身与配偶、亲密关系',
    time: '时柱主子女、晚年与下属（约 47 岁后）'
  }
  // 六冲的五行机理（《五行大义》：冲者气相格对）
  var CHONG_MECH = {
    子午: '子水冲午火，水火相格', 丑未: '丑未皆土，墓库相冲',
    寅申: '寅木申金，金木相格', 卯酉: '卯木酉金，金木相格',
    辰戌: '辰戌皆土，墓库相冲', 巳亥: '巳火亥水，水火相格'
  }
  // 冲的「谁克谁」（分层 L2 用）
  var CHONG_NOTE = {
    子午: '水火相格——子水克午火（水主胜）', 巳亥: '水火相格——亥水克巳火（水主胜）',
    卯酉: '金木相格——酉金克卯木（金主胜）', 寅申: '金木相格——申金克寅木（金主胜）',
    辰戌: '辰戌皆土，同气朋冲，主开火 / 水之库', 丑未: '丑未皆土，同气朋冲，主开金 / 木之库'
  }
  function posName(k) { return k === 'liuri' || k === 'liuyue' || k === 'liunian' || k === 'dayun' ? LABEL[k] : (LABEL[k] || '') + '柱' }
  function liuriTail(ms) {
    if (!ms.some(function (m) { return m.key === 'liuri' })) return ''
    var natal = ms.filter(function (m) { return m.key !== 'liuri' })[0]
    if (!natal) return ''
    return '——' + (POS_MEAN[natal.key] || '') + '；流日只主一天，短而轻（不比流月 / 流年 / 大运持久），宜顺其势、不必硬扛。'
  }

  // ———— 同型同字关系合并（年午+月午 与流日丑相害 → 一条）————
  function mergeRelations(rels) {
    var map = {}, out = []
    rels.forEach(function (r) {
      var sig = r.type + '|' + r.chars.slice().sort().join('')
      if (map[sig]) {
        r.members.forEach(function (m) { if (map[sig].members.indexOf(m) < 0) map[sig].members.push(m) })
        map[sig].merged = true
      } else {
        var c = { type: r.type, kind: r.kind, chars: r.chars.slice(), element: r.element, desc: r.desc, members: r.members.slice(), merged: false }
        map[sig] = c; out.push(c)
      }
    })
    return out
  }
  // 把合并后的成员按「所属字」分成两组（pair 型关系用）
  function pairGroups(rel, ms) {
    var g = rel.kind === 'gan' ? 'gan' : 'zhi'
    var aChar = rel.chars[0], bChar = rel.chars[1]
    var aList = ms.filter(function (m) { return m[g] === aChar })
    var bList = ms.filter(function (m) { return m[g] === bChar && aList.indexOf(m) < 0 })
    return { aChar: aChar, bChar: bChar, aList: aList, bList: bList }
  }
  function sideName(list, ch) {
    if (!list.length) return ch
    return list.map(function (m) { return posName(m.key) }).join('、') + ch
  }
  // 合并版富文本（不带逐条尾注；尾注由 relTailNote 统一给一次）
  function explainMerged(rel, positions) {
    var pmap = {}
    positions.forEach(function (p) { pmap[p.key] = p })
    var ms = rel.members.map(function (k) { return pmap[k] }).filter(Boolean)
    if (ms.length < 2) return rel.desc
    if (rel.type === '三合' || rel.type === '三会') {
      return rel.chars.join('') + ' ' + rel.type + (rel.element || '') + (rel.type === '三合' ? '局' : '方') + '。三支结成一气、力量汇聚成势：主合力、成事、目标一致。'
    }
    if (rel.type === '刑' && ms.length > 2) {
      return rel.chars.join('') + ' 三刑。彼此摩擦、磨合、消耗；提醒放慢、调整方式，并非灾祸。'
    }
    var pg = pairGroups(rel, ms)
    var a = sideName(pg.aList, pg.aChar), b = sideName(pg.bList, pg.bChar)
    if (rel.type === '五合') return a + ' 与 ' + b + ' 天干五合' + (rel.element ? '化' + rel.element : '') + '。两股能量结成一对、彼此吸引：主情感、合作、合约与转化；也可能被「合住」而牵绊。'
    if (rel.type === '冲') {
      var mech = CHONG_MECH[pg.aChar + pg.bChar] || CHONG_MECH[pg.bChar + pg.aChar] || '二气相对'
      return a + ' 与 ' + b + ' 相冲（' + mech + '）。两气正面相撞：主动荡、变化、走动——该动则是突破之机，该静被冲则起波澜。'
    }
    if (rel.type === '合') return a + ' 与 ' + b + ' 六合' + (rel.element ? '化' + rel.element : '') + '。主亲近、结盟、缓和；也可能黏着、牵绊、分心。'
    if (rel.type === '害') return a + ' 与 ' + b + ' 相害。暗里的小妨碍与嫌隙，多在细节与人情；留心则可避，不必惊惧。'
    if (rel.type === '破') return a + ' 与 ' + b + ' 相破。小破耗、松动；把收尾做稳即可，影响通常轻微。'
    if (rel.type === '刑') return a + ' 与 ' + b + ' 相刑。彼此摩擦、磨合、消耗；提醒放慢、调整方式，并非灾祸。'
    return rel.desc
  }
  // 涉及宫位的尾注（整组只出现一次）
  function relTailNote(rels) {
    var keys = [], hasLiuri = false
    rels.forEach(function (r) {
      r.members.forEach(function (k) {
        if (k === 'liuri') { hasLiuri = true; return }
        if (POS_MEAN[k] && keys.indexOf(k) < 0) keys.push(k)
      })
    })
    if (!keys.length) return ''
    var order = ['year', 'month', 'day', 'time']
    keys.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b) })
    var t = '被触动的宫位：' + keys.map(function (k) { return POS_MEAN[k] }).join('；') + '。'
    if (hasLiuri) t += '流日只主一天，短而轻（不比流月 / 流年 / 大运持久），宜顺其势、不必硬扛。'
    return t
  }
  // 选定日 × 命局：合并去重后的关系 + 一次性尾注
  function mergedDayRelations(chart, day) {
    var pos = positionsOf(chart)
    pos.push({ key: 'liuri', label: '流日', gan: day.liuriGan, zhi: day.liuriZhi })
    var rels = mergeRelations(findRelations(pos).filter(function (r) { return r.members.indexOf('liuri') >= 0 }))
    rels.forEach(function (r) { r.rich = explainMerged(r, pos) })
    return { positions: pos, relations: rels, tail: relTailNote(rels) }
  }
  // 把任意两 / 三位之间的关系展开成「具体到这两个字」的可读解读（供连线悬停 + 列表）
  function explainRelation(rel, positions) {
    var pmap = {}
    positions.forEach(function (p) { pmap[p.key] = p })
    var ms = rel.members.map(function (k) { return pmap[k] }).filter(Boolean)
    if (ms.length < 2) return rel.desc
    var a = ms[0], b = ms[1]
    if (rel.type === '五合') {
      return posName(a.key) + a.gan + ' 与 ' + posName(b.key) + b.gan + ' 天干五合' + (rel.element ? '化' + rel.element : '') +
        '。天干相合像两股能量结成一对、彼此吸引：主情感、合作、合约与转化；也可能被「合住」而牵绊，该动的力量反而动不了。' + liuriTail(ms)
    }
    if (rel.type === '冲') {
      var mech = CHONG_MECH[a.zhi + b.zhi] || CHONG_MECH[b.zhi + a.zhi] || '二气相对'
      return posName(a.key) + a.zhi + ' 与 ' + posName(b.key) + b.zhi + ' 地支相冲（' + mech +
        '）。相冲是两气正面相撞：主动荡、变化、走动、心绪起伏——该动则是突破之机，该静被冲则起波澜。' + liuriTail(ms)
    }
    if (rel.type === '合') {
      return posName(a.key) + a.zhi + ' 与 ' + posName(b.key) + b.zhi + ' 地支六合' + (rel.element ? '化' + rel.element : '') +
        '。六合主亲近、结盟、缓和；也可能黏着、牵绊、分心。' + liuriTail(ms)
    }
    if (rel.type === '害') {
      return ms.map(function (m) { return posName(m.key) + m.zhi }).join(' 与 ') + ' 相害（' + rel.chars.join('') +
        '）。相害是暗里的小妨碍与嫌隙，多在细节与人情；留心则可避，不必惊惧。' + liuriTail(ms)
    }
    if (rel.type === '破') {
      return ms.map(function (m) { return posName(m.key) + m.zhi }).join(' 与 ') + ' 相破。小破耗、松动；把收尾做稳即可，影响通常轻微。' + liuriTail(ms)
    }
    if (rel.type === '刑') {
      return rel.chars.join('') + ' 相刑。彼此摩擦、磨合、消耗；提醒放慢、调整方式，并非灾祸。' + liuriTail(ms)
    }
    if (rel.type === '三合' || rel.type === '三会') {
      return rel.chars.join('') + ' ' + rel.type + (rel.element || '') + '局 / 方。三支结成一气、力量汇聚成势：主合力、成事、目标一致。' + liuriTail(ms)
    }
    return rel.desc
  }

  // —— 十神大类 → 能量域文案 ——
  var DOMAIN = {
    比劫: { name: '自我与行动', good: '适合靠自己推进、做主、与同伴并肩做事', care: '留意与人争利、冲动或不必要的破费' },
    食伤: { name: '表达与创造', good: '适合输出、表达、创作、展示才华与想法', care: '留意言多必失、锋芒太露惹是非' },
    财: { name: '务实与收益', good: '适合处理钱与事、经营关系、把计划落地', care: '留意贪多求快、为利耗神' },
    官杀: { name: '责任与规则', good: '适合担责、处理正事、按规矩推进', care: '留意压力上身、被管束或与人硬碰硬' },
    印: { name: '学习与内蓄', good: '适合读书、思考、休养、向师长贵人请益', care: '留意多思拖延、过度依赖而不行动' }
  }

  function dmRelation(dmWx, dayWx) {
    if (dmWx === dayWx) return { tag: '同气', desc: '今日之气与你日主同类，得朋比之助，底气较足' }
    if (E.generates(dayWx, dmWx)) return { tag: '生我', desc: '今日之气生扶你的日主，得养得助，宜借势蓄力' }
    if (E.generates(dmWx, dayWx)) return { tag: '我生', desc: '今日之气泄你日主之秀，宜表达输出，也较耗神' }
    if (E.controls(dmWx, dayWx)) return { tag: '我克', desc: '今日之气为你日主所克，是可掌控的资源，宜务实取用' }
    if (E.controls(dayWx, dmWx)) return { tag: '克我', desc: '今日之气克你日主，外有约束压力，宜守不宜强出头' }
    return { tag: '', desc: '' }
  }

  // —— 选定日的总解读 ——（yong 可选：{favorable, unfavorable} 喜忌）
  function dayReading(chart, day, yong) {
    var dm = chart.dayMaster
    var ss = E.shiShen(dm.gan, day.liuriGan)
    var group = E.SHISHEN_GROUP[ss]
    var domain = DOMAIN[group]
    var dayGanWx = E.GAN_WUXING[day.liuriGan]
    var rel = dmRelation(dm.wuxing, dayGanWx)
    var pos5 = positionsOf(chart)
    pos5.push({ key: 'liuri', label: '流日', gan: day.liuriGan, zhi: day.liuriZhi })
    var relations = dayRelations(chart, day).map(function (r) {
      r.rich = explainRelation(r, pos5)
      return r
    })

    var tone
    if (group === '比劫' || group === '食伤') tone = '偏外放 —— 适合主动、表达、行动'
    else if (group === '官杀') tone = '偏收敛 —— 宜稳、守规、担正事'
    else if (group === '印') tone = '偏内蓄 —— 宜静、学习、养精神'
    else tone = '偏务实 —— 宜落地、理事、经营'

    var yongHint = null
    if (yong) {
      var le = dayGanWx
      if (yong.tiaohouEl && yong.tiaohouEl.indexOf(le) >= 0) yongHint = { hit: '喜', text: '今日之气（' + le + '）正是你的调候用神 —— 最对症、宜借力（穷通宝鉴：调候为急）。' }
      else if (yong.favorable && yong.favorable.indexOf(le) >= 0) yongHint = { hit: '喜', text: '今日之气（' + le + '）属你的喜用 —— 顺，宜借力推进、主动一些。' }
      else if (yong.unfavorable && yong.unfavorable.indexOf(le) >= 0) yongHint = { hit: '忌', text: '今日之气（' + le + '）偏你的忌神 —— 留意，宜守、宜缓，不必强求。' }
      else yongHint = { hit: '平', text: '今日之气（' + le + '）在你喜忌之外 —— 平，照常即可。' }
    }

    return {
      shiShen: ss, group: group, domain: domain,
      relation: rel, tone: tone,
      liuriGanWx: dayGanWx, liuriZhiWx: E.ZHI_WUXING[day.liuriZhi],
      relations: relations, yong: yongHint
    }
  }

  // 分层解读：{ title, layers:[{tag,text}] }（L1 是什么 / L2 怎么合怎么克 / L3 对日主 / L4 暗机）
  // 兼容 mergeRelations 的合并关系（同型同字多柱共一条）
  function relationLayers(rel, positions) {
    var pmap = {}
    positions.forEach(function (p) { pmap[p.key] = p })
    var ms = rel.members.map(function (k) { return pmap[k] }).filter(Boolean)
    if (ms.length < 2) return { title: rel.type, layers: [{ tag: '说明', text: rel.desc }] }
    var el = rel.element ? '·' + rel.element : '', L = []
    function pd() {
      // 「谁与谁」：按所属字分两侧（合并关系一侧可有多柱）
      var pg = pairGroups(rel, ms)
      return { a: sideName(pg.aList, pg.aChar), b: sideName(pg.bList, pg.bChar) }
    }
    if (rel.type === '五合') {
      var g5 = pd()
      L.push({ tag: '是什么', text: '天干五合：两个天干结成一对、彼此吸引，像结盟或情感纽带。' })
      L.push({ tag: '怎么合', text: g5.a + ' 与 ' + g5.b + ' 阴阳相吸而合' + (rel.element ? '，可合化为「' + rel.element + '」（两气并力，性质偏向' + rel.element + '）' : '') + '。' })
      L.push({ tag: '对日主', text: '合主亲近、合作、合约、转化；也可能把该动的力量「合住」、牵绊住，使人黏着不前。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '合化成的若正是你需要的五行，是助力；若合住了用神 / 喜用，反误事。能否合化，看月令与有无妒合争合。' })
      return { title: rel.chars.join('') + ' 五合' + el, layers: L }
    }
    if (rel.type === '冲') {
      var gc = pd()
      var note = CHONG_NOTE[rel.chars[0] + rel.chars[1]] || CHONG_NOTE[rel.chars[1] + rel.chars[0]] || '二气相对'
      L.push({ tag: '是什么', text: '相冲：两气方位相对、正面相撞，主动荡、变化、走动、心绪起伏。' })
      L.push({ tag: '怎么冲', text: gc.a + ' 冲 ' + gc.b + '（' + note + '）。冲的内核其实是「克」。' })
      L.push({ tag: '对日主', text: '该动时，冲是突破、换轨的契机；该静却被冲，则起波澜。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '冲能「开库」（辰戌丑未相冲打开墓库）；冲用神为患、冲去忌神反吉；近冲力大、隔位冲力小。' })
      return { title: rel.chars.join('') + ' 相冲', layers: L }
    }
    if (rel.type === '合') {
      var g6 = pd()
      L.push({ tag: '是什么', text: '地支六合：两支相合相恋，主亲近、结盟、缓和。' })
      L.push({ tag: '怎么合', text: g6.a + ' 合 ' + g6.b + (rel.element ? '，可合化「' + rel.element + '」' : '') + '。' })
      L.push({ tag: '对日主', text: '合主和气、合作、牵连；也可能黏着、绊住、分心。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '合能解冲、也能合绊用神；合而不化只是「牵连」，合化则性质转变。' })
      return { title: rel.chars.join('') + ' 六合' + el, layers: L }
    }
    if (rel.type === '害') {
      var gh = pd()
      L.push({ tag: '是什么', text: '相害（穿）：暗里的妨碍、嫌隙、小损耗。' })
      L.push({ tag: '怎么害', text: gh.a + ' 与 ' + gh.b + ' 相害——多因一方的「合」被另一方冲破而生怨。' })
      L.push({ tag: '对日主', text: '多在细节、人情、健康的暗处使绊；留心则可避，不必惊惧。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '害是较轻的暗伤，常被冲合掩盖；看它落在哪个六亲宫位，留意该处人情摩擦。' })
      return { title: rel.chars.join('') + ' 相害', layers: L }
    }
    if (rel.type === '破') {
      var gp = pd()
      L.push({ tag: '是什么', text: '相破：小的破耗、松动，像约定打了折扣。' })
      L.push({ tag: '怎么破', text: gp.a + ' 与 ' + gp.b + ' 相破。' })
      L.push({ tag: '对日主', text: '影响通常轻微，把收尾做稳即可。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '破力最轻，常可忽略，多与冲合并看。' })
      return { title: rel.chars.join('') + ' 相破', layers: L }
    }
    if (rel.type === '刑') {
      var gx = ms.length === 2 && rel.chars.length === 2 && rel.chars[0] !== rel.chars[1] ? pd() : null
      L.push({ tag: '是什么', text: '相刑：彼此摩擦、磨合、消耗（恃势 / 无恩 / 无礼之刑，及自刑）。' })
      L.push({ tag: '怎么刑', text: (gx ? gx.a + ' 与 ' + gx.b : ms.map(function (m) { return posName(m.key) + m.zhi }).join('、')) + ' 相刑。' })
      L.push({ tag: '对日主', text: '提醒放慢、调整方式、收敛锋芒，并非灾祸。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '刑常主关系反复、是非或身体某处反复；自刑多为自我消耗。' })
      return { title: rel.chars.join('') + ' 相刑', layers: L }
    }
    if (rel.type === '三合' || rel.type === '三会') {
      L.push({ tag: '是什么', text: '三支会成一气，力量汇聚成势。' })
      L.push({ tag: '怎么会', text: rel.chars.join('') + ' 结成「' + (rel.element || '') + '」' + (rel.type === '三合' ? '局' : '方') + '，力量集中于此五行。' })
      L.push({ tag: '对日主', text: '主合力、成事、目标一致；是强而有方向的能量。' + liuriTail(ms) })
      L.push({ tag: '暗机', text: '三合力大：若所成是用神则大吉，是忌神则防其势过旺。' })
      return { title: rel.chars.join('') + ' ' + rel.type + (rel.element || ''), layers: L }
    }
    return { title: rel.type, layers: [{ tag: '说明', text: rel.desc }] }
  }

  var Interpret = {
    findRelations: findRelations,
    relationLayers: relationLayers,
    chartRelations: chartRelations,
    dayRelations: dayRelations,
    mergeRelations: mergeRelations,
    mergedDayRelations: mergedDayRelations,
    explainMerged: explainMerged,
    relTailNote: relTailNote,
    dayReading: dayReading,
    todayReading: dayReading, // 兼容旧名
    explainRelation: explainRelation,
    DOMAIN: DOMAIN,
    LABEL: LABEL
  }
  root.Interpret = Interpret
  if (typeof module !== 'undefined' && module.exports) module.exports = Interpret
})(typeof window !== 'undefined' ? window : globalThis)
