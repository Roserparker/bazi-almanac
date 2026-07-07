/*
 * liuyao.js · 六爻引擎（每日一卦 · 观 BTC 大势）
 * 成卦：以日期为种的确定性「三枚铜钱」法（6 老阴 / 7 少阳 / 8 少阴 / 9 老阳），同日稳定、次日更新。
 * 装卦：京房纳甲（干支）→ 八宫与世应（按八宫卦变算法推得，非查表）→ 六亲（以卦宫五行论）→ 六神（按流日天干起）。
 * 断卦：问财（用神=妻财爻），以月建/日建生扶、动爻生克记分，输出「偏扬/震荡/偏抑」参考倾向。
 * 立场：以日为种是「每日一签」的现代约定，非摇卦本义；参考视角，非断言。依赖 Engine 五行表。
 */
;(function (root) {
  'use strict'
  var E = root.Engine

  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')
  // 3bit 值（初爻为最低位，1=阳）→ 八卦
  var TRI = { 7: '乾', 3: '兑', 5: '离', 1: '震', 6: '巽', 2: '坎', 4: '艮', 0: '坤' }
  var TRI_SYM = { 乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷' }
  var GONG_EL = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' }

  // 京房纳甲：各经卦 内卦(下) / 外卦(上) 三爻地支（自下而上）与所纳天干
  var NAJIA = {
    乾: { inZhi: ['子', '寅', '辰'], outZhi: ['午', '申', '戌'], inGan: '甲', outGan: '壬' },
    坤: { inZhi: ['未', '巳', '卯'], outZhi: ['丑', '亥', '酉'], inGan: '乙', outGan: '癸' },
    震: { inZhi: ['子', '寅', '辰'], outZhi: ['午', '申', '戌'], inGan: '庚', outGan: '庚' },
    巽: { inZhi: ['丑', '亥', '酉'], outZhi: ['未', '巳', '卯'], inGan: '辛', outGan: '辛' },
    坎: { inZhi: ['寅', '辰', '午'], outZhi: ['申', '戌', '子'], inGan: '戊', outGan: '戊' },
    离: { inZhi: ['卯', '丑', '亥'], outZhi: ['酉', '未', '巳'], inGan: '己', outGan: '己' },
    艮: { inZhi: ['辰', '午', '申'], outZhi: ['戌', '子', '寅'], inGan: '丙', outGan: '丙' },
    兑: { inZhi: ['巳', '卯', '丑'], outZhi: ['亥', '酉', '未'], inGan: '丁', outGan: '丁' }
  }

  // 六十四卦（键 = 上卦+下卦）：名 · 卦辞节选 · 白话一句（去恐吓化）
  var HEX64 = {
    乾乾: { n: '乾为天', ci: '元亨利贞。', su: '纯阳至健——大势强劲，宜顺势而行' },
    坤坤: { n: '坤为地', ci: '元亨，利牝马之贞。', su: '厚德载物——势缓而稳，宜跟随不宜抢先' },
    坎震: { n: '水雷屯', ci: '元亨利贞，勿用有攸往，利建侯。', su: '万物始生——起步维艰，蓄势待其成形' },
    艮坎: { n: '山水蒙', ci: '匪我求童蒙，童蒙求我。', su: '蒙以养正——形势未明，多看少动' },
    坎乾: { n: '水天需', ci: '有孚，光亨，贞吉，利涉大川。', su: '云上于天——静待时机，耐心即策略' },
    乾坎: { n: '天水讼', ci: '有孚窒惕，中吉终凶。', su: '上刚下险——分歧之象，不宜恋战' },
    坤坎: { n: '地水师', ci: '贞，丈人吉，无咎。', su: '以众行险——先整纪律，再谈进退' },
    坎坤: { n: '水地比', ci: '吉。原筮元永贞，无咎。', su: '众水归流——亲比之象，跟住主流' },
    巽乾: { n: '风天小畜', ci: '亨。密云不雨，自我西郊。', su: '密云不雨——蓄而未发，将动未动' },
    乾兑: { n: '天泽履', ci: '履虎尾，不咥人，亨。', su: '行于险旁——谨慎则无咎' },
    坤乾: { n: '地天泰', ci: '小往大来，吉亨。', su: '天地交泰——通达之象，上下同气' },
    乾坤: { n: '天地否', ci: '大往小来。', su: '天地不交——闭塞之象，宜守待通' },
    乾离: { n: '天火同人', ci: '同人于野，亨，利涉大川。', su: '与人同志——共识凝聚，同道者众' },
    离乾: { n: '火天大有', ci: '元亨。', su: '火在天上——丰有之象，盛时更宜谦' },
    坤艮: { n: '地山谦', ci: '亨，君子有终。', su: '谦尊而光——低调蓄力，终有所成' },
    震坤: { n: '雷地豫', ci: '利建侯行师。', su: '雷出地奋——欢豫之象，乐而勿忘备' },
    兑震: { n: '泽雷随', ci: '元亨利贞，无咎。', su: '随时而动——顺势跟随，不逆潮流' },
    艮巽: { n: '山风蛊', ci: '元亨，利涉大川。', su: '整饬积弊——旧疾当治，刮骨方新' },
    坤兑: { n: '地泽临', ci: '元亨利贞。', su: '临事而长——渐盛之象，乘势而进' },
    巽坤: { n: '风地观', ci: '盥而不荐，有孚颙若。', su: '观而后动——登高望远，看清再落子' },
    离震: { n: '火雷噬嗑', ci: '亨。利用狱。', su: '咬合梗阻——有阻须破，快刀断之' },
    艮离: { n: '山火贲', ci: '亨。小利有攸往。', su: '文饰之美——表象华彩，宜察其实' },
    艮坤: { n: '山地剥', ci: '不利有攸往。', su: '剥落之象——势在消退，守静护本' },
    坤震: { n: '地雷复', ci: '亨。反复其道，七日来复。', su: '一阳来复——转机初现，静养其阳' },
    乾震: { n: '天雷无妄', ci: '元亨利贞。其匪正有眚。', su: '不妄则吉——守正而行，勿贪意外' },
    艮乾: { n: '山天大畜', ci: '利贞。不家食吉。', su: '大畜以德——厚积薄发，蓄满自开' },
    艮震: { n: '山雷颐', ci: '贞吉。观颐，自求口实。', su: '观颐养正——自养其实，勿贪口食' },
    兑巽: { n: '泽风大过', ci: '栋桡。利有攸往，亨。', su: '栋梁之桡——负重过甚，减载为先' },
    坎坎: { n: '坎为水', ci: '习坎，有孚，维心亨。', su: '重险之间——心亨则过，稳住不乱' },
    离离: { n: '离为火', ci: '利贞，亨。畜牝牛吉。', su: '丽明之象——光明所附，看清所依' },
    兑艮: { n: '泽山咸', ci: '亨，利贞，取女吉。', su: '感而遂通——气息相感，顺其自然' },
    震巽: { n: '雷风恒', ci: '亨，无咎，利贞。', su: '恒久之道——守常不辍，细水长流' },
    乾艮: { n: '天山遁', ci: '亨，小利贞。', su: '退而有度——退是进的一种' },
    震乾: { n: '雷天大壮', ci: '利贞。', su: '阳刚壮盛——势大声隆，壮时勿蛮' },
    离坤: { n: '火地晋', ci: '康侯用锡马蕃庶，昼日三接。', su: '明出地上——进升之象，其道渐光' },
    坤离: { n: '地火明夷', ci: '利艰贞。', su: '明入地中——光暂受抑，藏明于内' },
    巽离: { n: '风火家人', ci: '利女贞。', su: '内正外成——先安内，再图外' },
    离兑: { n: '火泽睽', ci: '小事吉。', su: '睽而知同——分歧之下，小事可成' },
    坎艮: { n: '水山蹇', ci: '利西南，贞吉。', su: '见险而止——绕行胜于硬闯' },
    震坎: { n: '雷水解', ci: '利西南。其来复吉。', su: '险以动解——冰释之象，压力松动' },
    艮兑: { n: '山泽损', ci: '有孚，元吉，无咎。', su: '损下益上——先舍后得，损中有益' },
    巽震: { n: '风雷益', ci: '利有攸往，利涉大川。', su: '损上益下——得助之象，乘风而益' },
    兑乾: { n: '泽天夬', ci: '扬于王庭，孚号有厉。', su: '决而不忧——了断之象，明断勿拖' },
    乾巽: { n: '天风姤', ci: '女壮，勿用取女。', su: '一阴初遇——微变初起，见微知著' },
    兑坤: { n: '泽地萃', ci: '亨。王假有庙，利见大人。', su: '泽上于地——汇聚之象，聚而有序' },
    坤巽: { n: '地风升', ci: '元亨。南征吉。', su: '柔以时升——渐进之象，积小成高' },
    兑坎: { n: '泽水困', ci: '亨，贞，大人吉。有言不信。', su: '困而不失——处困守正，行胜于言' },
    坎巽: { n: '水风井', ci: '改邑不改井，无丧无得。', su: '井养不穷——本源不改，养人自养' },
    兑离: { n: '泽火革', ci: '巳日乃孚，元亨利贞，悔亡。', su: '顺天应人——变革之象，时至则变' },
    离巽: { n: '火风鼎', ci: '元吉，亨。', su: '鼎新之象——去故取新，稳中换代' },
    震震: { n: '震为雷', ci: '亨。震来虩虩，笑言哑哑。', su: '震惊百里——波动骤起，惊而不乱' },
    艮艮: { n: '艮为山', ci: '艮其背，不获其身。', su: '时止则止——止的智慧，不动亦是动' },
    巽艮: { n: '风山渐', ci: '女归吉，利贞。', su: '鸿渐于陆——循序渐进，急不得' },
    震兑: { n: '雷泽归妹', ci: '征凶，无攸利。', su: '次序未正——勿急于求成' },
    震离: { n: '雷火丰', ci: '亨，王假之。宜日中。', su: '丰大之象——盛极宜守，日中则昃' },
    离艮: { n: '火山旅', ci: '小亨。旅贞吉。', su: '行旅之象——身在途中，轻装少恋' },
    巽巽: { n: '巽为风', ci: '小亨。利有攸往。', su: '随风而入——柔而能入，顺势渗透' },
    兑兑: { n: '兑为泽', ci: '亨，利贞。', su: '丽泽相说——和悦之象，以和为贵' },
    巽坎: { n: '风水涣', ci: '亨。利涉大川。', su: '风行水上——涣散之象，聚心为先' },
    坎兑: { n: '水泽节', ci: '亨。苦节不可贞。', su: '节以制度——有节则亨，过紧则苦' },
    巽兑: { n: '风泽中孚', ci: '豚鱼吉，利涉大川。', su: '信及豚鱼——诚信之象，以信立身' },
    震艮: { n: '雷山小过', ci: '亨，利贞。可小事，不可大事。', su: '可小不可大——小步可为，大动不宜' },
    坎离: { n: '水火既济', ci: '亨小，利贞。初吉终乱。', su: '既济之象——事已成形，初吉慎终' },
    离坎: { n: '火水未济', ci: '亨。小狐汔济，濡其尾。', su: '未济之象——事未竟成，续力有望' }
  }

  // 爻位通义（动爻提示用；本站不载 384 爻辞，取爻位之义）
  var YAO_POS = ['初爻·事起于微，根基之动', '二爻·得中于内，臣位之动', '三爻·内外之交，多虑之位',
    '四爻·近君之位，进退多惧', '五爻·尊位得中，主事之动', '上爻·物极之位，盛极将反']

  // ———— 确定性成卦：mulberry32 以日期字符串做种 ————
  function seedOf(str) {
    var h = 2166136261
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
    return h >>> 0
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  // 掷六次（自下而上），每次三枚铜钱：背=3 字=2，和 ∈ 6..9
  function castLines(seedStr) {
    var rnd = mulberry32(seedOf(seedStr))
    var lines = []
    for (var i = 0; i < 6; i++) {
      var s = 0
      for (var c = 0; c < 3; c++) s += rnd() < 0.5 ? 2 : 3
      lines.push(s) // 6 老阴(动) 7 少阳 8 少阴 9 老阳(动)
    }
    return lines
  }

  function bitsOf(lines) { return lines.map(function (v) { return v % 2 }) } // 1=阳
  function triVal(bits, lo) { return bits[lo] + bits[lo + 1] * 2 + bits[lo + 2] * 4 }
  function hexOf(bits) {
    var lower = TRI[triVal(bits, 0)], upper = TRI[triVal(bits, 3)]
    return { key: upper + lower, upper: upper, lower: lower, info: HEX64[upper + lower] }
  }

  // ———— 八宫与世应：由八纯卦按「一至五世 → 游魂 → 归魂」生成 64 卦归属 ————
  var GONG_MAP = null
  function buildGongMap() {
    if (GONG_MAP) return GONG_MAP
    GONG_MAP = {}
    var SHI = [6, 1, 2, 3, 4, 5, 4, 3]
    Object.keys(NAJIA).forEach(function (g) {
      var v = { 乾: 7, 兑: 3, 离: 5, 震: 1, 巽: 6, 坎: 2, 艮: 4, 坤: 0 }[g]
      var bits = [v & 1, (v >> 1) & 1, (v >> 2) & 1, v & 1, (v >> 1) & 1, (v >> 2) & 1]
      var seq = [bits.slice()]
      var cur = bits.slice()
      for (var i = 0; i < 5; i++) { cur = cur.slice(); cur[i] ^= 1; seq.push(cur.slice()) }
      cur = cur.slice(); cur[3] ^= 1; seq.push(cur.slice()) // 游魂：四爻复变
      cur = cur.slice(); cur[0] ^= 1; cur[1] ^= 1; cur[2] ^= 1; seq.push(cur.slice()) // 归魂：内卦复原
      seq.forEach(function (b, idx) {
        var h = hexOf(b)
        GONG_MAP[h.key] = { gong: g, shi: SHI[idx], kind: idx === 0 ? '八纯' : idx === 6 ? '游魂' : idx === 7 ? '归魂' : ['', '一', '二', '三', '四', '五'][idx] + '世' }
      })
    })
    return GONG_MAP
  }

  // 装卦：纳甲地支 + 六亲 + 世应
  var LIUQIN_VERB = { 兄弟: '同我', 子孙: '我生', 妻财: '我克', 官鬼: '克我', 父母: '生我' }
  function liuQin(gongEl, yaoEl) {
    if (yaoEl === gongEl) return '兄弟'
    if (E.generates(gongEl, yaoEl)) return '子孙'
    if (E.controls(gongEl, yaoEl)) return '妻财'
    if (E.controls(yaoEl, gongEl)) return '官鬼'
    return '父母'
  }
  var LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
  var SHEN_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 }

  function zhuangGua(bits, dayGan) {
    var h = hexOf(bits)
    var gm = buildGongMap()[h.key]
    var gongEl = GONG_EL[gm.gong]
    var start = SHEN_START[dayGan] || 0
    var lines = []
    for (var i = 0; i < 6; i++) {
      var inner = i < 3
      var tri = inner ? h.lower : h.upper
      var na = NAJIA[tri]
      var zhi = inner ? na.inZhi[i] : na.outZhi[i - 3]
      var gan = inner ? na.inGan : na.outGan
      var el = E.ZHI_WUXING[zhi]
      lines.push({
        pos: i + 1, yang: bits[i] === 1, gan: gan, zhi: zhi, el: el,
        qin: liuQin(gongEl, el), shen: LIUSHEN[(start + i) % 6],
        shi: gm.shi === i + 1, ying: ((gm.shi - 1 + 3) % 6) + 1 === i + 1
      })
    }
    return { hex: h, gong: gm.gong, gongEl: gongEl, kind: gm.kind, shi: gm.shi, ying: ((gm.shi - 1 + 3) % 6) + 1, lines: lines }
  }

  // ———— 断卦（问财：BTC 走势，用神=妻财爻）————
  // 月建/日建对用神：临（同支）+2 / 同五行 +1.6 / 生 +1.4 / 克 −1.8 / 泄耗 −0.4（日建 ×0.8）
  function liTag(refZhi, el) {
    var re = E.ZHI_WUXING[refZhi]
    if (refZhi === undefined) return 0
    if (re === el) return 2
    if (E.generates(re, el)) return 1.4
    if (E.controls(re, el)) return -1.8
    return -0.4
  }
  function judge(cast, day) {
    var g = cast.ben
    var caiLines = g.lines.filter(function (l) { return l.qin === '妻财' })
    var reasons = [], score = 0
    if (!caiLines.length) {
      reasons.push('财爻不上卦（伏而未现）——财气藏于暗处，宜观望少动')
      score -= 0.4
    } else {
      caiLines.forEach(function (l) {
        var m = l.zhi === day.liuyueZhi ? 2 : liTag(day.liuyueZhi, l.el)
        var d = l.zhi === day.liuriZhi ? 1.6 : liTag(day.liuriZhi, l.el) * 0.8
        score += (m + d) / caiLines.length
        var mTxt = m >= 2 ? '临月建' : m >= 1.4 ? '得月建生扶' : m <= -1 ? '受月建克' : '与月建平'
        var dTxt = d >= 1.6 ? '临日建' : d >= 1 ? '得日建生扶' : d <= -0.8 ? '受日建克' : '与日建平'
        reasons.push('妻财' + l.zhi + l.el + '（' + YAO_POS[l.pos - 1].slice(0, 2) + '）' + mTxt + '、' + dTxt)
      })
    }
    // 动爻影响
    cast.moving.forEach(function (pos) {
      var l = g.lines[pos - 1]
      if (l.qin === '妻财') {
        var to = cast.bian.lines[pos - 1]
        if (E.controls(to.el, l.el)) { score -= 1.5; reasons.push('财爻发动而化回头克（' + l.zhi + '→' + to.zhi + '）——动中有耗') }
        else if (E.generates(to.el, l.el)) { score += 1.2; reasons.push('财爻发动化回头生（' + l.zhi + '→' + to.zhi + '）——越动越旺') }
        else { score += 0.8; reasons.push('财爻发动——财气活络，动而有为') }
      } else if (l.qin === '子孙') { score += 1.3; reasons.push('子孙爻动——原神发动，生财之源开闸') }
      else if (l.qin === '兄弟') { score -= 1.3; reasons.push('兄弟爻动——比劫争财，分流之象') }
      else if (l.qin === '官鬼') { score -= 0.5; reasons.push('官鬼爻动——压力事件扰动，财气受牵') }
      else { score -= 0.3; reasons.push('父母爻动——消息文书繁杂，泄子孙生财之力') }
    })
    // 世爻承接力
    var shiLine = g.lines[g.shi - 1]
    var shiFit = liTag(day.liuyueZhi, shiLine.el)
    if (shiFit >= 1.4) { score += 0.5; reasons.push('世爻' + shiLine.zhi + '得月建之气——主体承接有力') }
    else if (shiFit <= -1) { score -= 0.5; reasons.push('世爻' + shiLine.zhi + '受月建所制——主体承接偏弱') }
    score = Math.max(-4, Math.min(4, score))
    var tendency = score >= 1.2 ? '偏扬' : score <= -1.2 ? '偏抑' : '震荡'
    return { score: Math.round(score * 100) / 100, tendency: tendency, reasons: reasons }
  }

  /*
   * 每日一卦（主入口）：day = Engine.buildDay 产物；tag 区分问事（默认 'BTC'）
   * 返回 { lines(6数), moving[], ben:{hex,gong,lines..}, bian:{...}, judge:{score,tendency,reasons}, yaoNote }
   */
  function dailyGua(day, tag) {
    var seedStr = day.solarYmd + '#' + (tag || 'BTC')
    var raw = castLines(seedStr)
    var bits = bitsOf(raw)
    var moving = []
    raw.forEach(function (v, i) { if (v === 6 || v === 9) moving.push(i + 1) })
    var bianBits = bits.slice()
    moving.forEach(function (p) { bianBits[p - 1] ^= 1 })
    var ben = zhuangGua(bits, day.liuriGan)
    var bian = zhuangGua(bianBits, day.liuriGan)
    var cast = { raw: raw, moving: moving, ben: ben, bian: bian }
    cast.judge = judge(cast, day)
    cast.yaoNote = moving.length
      ? moving.map(function (p) { return YAO_POS[p - 1] }).join('；')
      : '六爻安静——势在延续，以卦辞与旺衰断'
    return cast
  }

  var Liuyao = {
    dailyGua: dailyGua, castLines: castLines, zhuangGua: zhuangGua, hexOf: hexOf,
    bitsOf: bitsOf, buildGongMap: buildGongMap, judge: judge,
    HEX64: HEX64, NAJIA: NAJIA, TRI_SYM: TRI_SYM, GONG_EL: GONG_EL, YAO_POS: YAO_POS, LIUSHEN: LIUSHEN
  }
  root.Liuyao = Liuyao
  if (typeof module !== 'undefined' && module.exports) module.exports = Liuyao
})(typeof window !== 'undefined' ? window : globalThis)
