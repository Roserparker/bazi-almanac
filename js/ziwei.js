/*
 * ziwei.js · 紫微斗数引擎（安星 + 生年四化 + 流曜四化）
 * 安星依《紫微斗数全书》通行诀（三合派）：闰月归本月、庚干四化从「阳武阴同」。
 * 输入公历生辰（依赖全局 Solar/Lunar，即 vendor/lunar.js），输出十二宫星盘纯数据。
 * 浏览器挂 window.Ziwei；Node 可测（module.exports）。
 */
;(function (root) {
  'use strict'

  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('')
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')
  var PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母']
  function mod12(n) { return ((n % 12) + 12) % 12 }

  // 纳音五行（公式版，与六十甲子纳音表逐一相符）：金水火土木 轮转
  var NAYIN_EL = ['金', '水', '火', '土', '木']
  function naYinElement(ganIdx, zhiIdx) {
    return NAYIN_EL[(Math.floor(ganIdx / 2) + Math.floor((zhiIdx % 6) / 2)) % 5]
  }
  var JU_NUM = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 }

  // 五虎遁：年干 → 寅宫起干
  var WUHU = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }
  function palaceGan(yearGanIdx, zhi) {
    var start = WUHU[GAN[yearGanIdx]]
    return GAN[(start + mod12(zhi - 2)) % 10]
  }

  // 安紫微：五行局数 j × 生日 n，「借日凑整，商定基准；奇退偶进」
  function ziweiPos(ju, day) {
    var q = Math.ceil(day / ju)
    var r = q * ju - day
    var pos = 2 + (q - 1)
    if (r > 0) pos += (r % 2 === 1) ? -r : r
    return mod12(pos)
  }

  // 年干四化（禄/权/科/忌）——庚干从通行「阳武阴同」
  var SIHUA = {
    甲: ['廉贞', '破军', '武曲', '太阳'], 乙: ['天机', '天梁', '紫微', '太阴'],
    丙: ['天同', '天机', '文昌', '廉贞'], 丁: ['太阴', '天同', '天机', '巨门'],
    戊: ['贪狼', '太阴', '右弼', '天机'], 己: ['武曲', '贪狼', '天梁', '文曲'],
    庚: ['太阳', '武曲', '太阴', '天同'], 辛: ['巨门', '太阳', '文曲', '文昌'],
    壬: ['天梁', '紫微', '左辅', '武曲'], 癸: ['破军', '巨门', '太阴', '贪狼']
  }
  var SIHUA_NAMES = ['化禄', '化权', '化科', '化忌']

  // 禄存（年干）· 魁钺（年干贵人）
  var LUCUN = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 }
  var KUI = { 甲: 1, 戊: 1, 庚: 1, 乙: 0, 己: 0, 丙: 11, 丁: 11, 壬: 3, 癸: 3, 辛: 6 }
  var YUE = { 甲: 7, 戊: 7, 庚: 7, 乙: 8, 己: 8, 丙: 9, 丁: 9, 壬: 5, 癸: 5, 辛: 2 }
  // 火铃起宫（年支三合组）+ 时数
  function huoLingStart(yearZhiIdx) {
    var g = yearZhiIdx % 4 // 申子辰0 巳酉丑1 寅午戌2 亥卯未3
    if (g === 0) return { huo: 2, ling: 10 }
    if (g === 1) return { huo: 3, ling: 10 }
    if (g === 2) return { huo: 1, ling: 3 }
    return { huo: 9, ling: 10 }
  }
  var TIANMA = [2, 11, 8, 5] // 申子辰→寅 巳酉丑→亥 寅午戌→申 亥卯未→巳（按 yearZhi%4 组序）

  // 命主（命宫支）/ 身主（年支）——身主从全书「子火午铃」；部分软件（如 iztro）子午皆取火星，属流派差异
  var MING_ZHU = ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '武曲', '廉贞', '文曲', '禄存', '巨门']
  var SHEN_ZHU = ['火星', '天相', '天梁', '天同', '文昌', '天机', '铃星', '天相', '天梁', '天同', '文昌', '天机']

  // 星曜五行（釉色渲染用）
  var STAR_EL = {
    紫微: '土', 天机: '木', 太阳: '火', 武曲: '金', 天同: '水', 廉贞: '火',
    天府: '土', 太阴: '水', 贪狼: '木', 巨门: '水', 天相: '水', 天梁: '土', 七杀: '金', 破军: '水',
    左辅: '土', 右弼: '水', 文昌: '金', 文曲: '水', 禄存: '土', 天马: '火',
    擎羊: '金', 陀罗: '金', 天魁: '火', 天钺: '火', 火星: '火', 铃星: '火',
    地空: '火', 地劫: '火', 红鸾: '水', 天喜: '水'
  }

  // 十四主星两面性贴士（去恐吓化：先讲能量本质，再讲两面）
  var STAR_NOTE = {
    紫微: '帝座 · 尊贵与主见——立得住方向，也可能好面子、耳根软（逢辅弼则众星拱）。',
    天机: '智星 · 机变与谋划——脑子快、善筹算，也可能想多善变、心神不定。',
    太阳: '权贵之光 · 博爱与担当——照人则暖、施而不求，也易操劳过度、锋芒刺眼。',
    武曲: '财星 · 刚毅与执行——务实肯干、理财有方，也可能刚硬孤直、不解风情。',
    天同: '福星 · 温和与知足——随遇而安、有福自来，也可能安逸少进、遇事想躲。',
    廉贞: '次桃花 · 才情与原则的拉扯——公关手腕与艺术气质兼具，也易在情与理间摇摆。',
    天府: '库星 · 稳健与包容——守成有度、气度从容，也可能保守惜财、缺了闯劲。',
    太阴: '母星 · 细腻与积蓄——温润体贴、暗中生财，也可能多愁内敛、优柔寡断。',
    贪狼: '欲望之星 · 也是生命力——多才多艺、人缘桃花，欲望驾驭得当即是进取心。',
    巨门: '暗星 · 口才与深究——善辩能钻研，是非也常由口出；用在专业则成深度。',
    天相: '印星 · 辅佐与公道——重承诺、善协调，也可能滥好人、随波逐流。',
    天梁: '荫星 · 庇护与老成——逢难有解、乐于照拂，也可能好为人师、操心太宽。',
    七杀: '将星 · 冲锋与决断——敢闯敢破、遇险不惧，宜有战场；无处使力时易自耗。',
    破军: '先锋 · 破旧立新——变革的引擎，破而后立；只破不立则动荡，配禄则破中生机。',
    左辅: '辅佐之星——得力的帮手与贵人缘，主稳重随和，默默把台子搭稳。',
    右弼: '辅佐之星——机敏的援手，热心巧助；与左辅同见，众星得势。',
    文昌: '文魁之星——文书、考学、条理与正统之才；也主对体面形式的在意。',
    文曲: '文华之星——口才、才艺、灵感与韵味；用在专业是风流，散漫则成飘。',
    禄存: '禄食之星——天生的积蓄缘与谨慎，守成有余；只须防守得太紧。',
    天马: '驿动之星——出行迁移变动之机；与禄同乡为「禄马交驰」，动中生财。',
    擎羊: '锋刃之星——冲劲与执行的利器；用于攻坚是刃，用于人际是刺。',
    陀罗: '磨砺之星——韧性与反复并存；事多回旋不是坏事，是要你磨出真章。',
    天魁: '阳贵之星——明处的贵人与提携，多得长辈师长之力。',
    天钺: '阴贵之星——暗处的荫护与照拂，多得平辈暗中之助。',
    火星: '烈火之星——爆发力与急躁同源；点燃行动力，别烧到人情。',
    铃星: '闷火之星——持久的韧劲与暗涌的脾气；宜文火慢炖，忌闷烧。',
    地空: '空灵之星——破执之思、哲想与顿悟；务实事上宜多一道确认。',
    地劫: '波动之星——耗散与起伏的提醒；轻财慎诺，反得洒脱。',
    红鸾: '喜庆之星——情缘、喜事、人缘的粉光所在。',
    天喜: '喜庆之星——喜讯、添喜、热闹的暖光所在。'
  }
  // 十二宫一句白话
  var PALACE_NOTE = {
    命宫: '你的主格局与气质底色', 兄弟: '手足同辈与合伙缘分', 夫妻: '亲密关系与相处模式',
    子女: '子息后辈与创造成果', 财帛: '求财方式与金钱观', 疾厄: '体质与需保养之处',
    迁移: '外出际遇与外界眼中的你', 交友: '朋友部属与人际圈', 官禄: '事业形态与做事风格',
    田宅: '家宅根基与不动产缘', 福德: '精神享受与内心底气', 父母: '长辈缘分与得到的荫护'
  }

  /*
   * 核心：由农历参数排盘
   * lunarYearGanIdx/lunarYearZhiIdx：农历年干支序（春节切换）
   * month：农历月 1..12（闰月归本月）  day：农历日 1..30  timeZhiIdx：时支序 0..11
   */
  function buildFromLunar(yg, yz, month, day, timeZhiIdx) {
    var m = Math.abs(month), t = timeZhiIdx
    var ming = mod12(2 + (m - 1) - t)
    var shen = mod12(2 + (m - 1) + t)
    var mingGan = palaceGan(yg, ming)
    var juEl = naYinElement(GAN.indexOf(mingGan), ming)
    var ju = JU_NUM[juEl]

    // 星曜落宫（地支序 0..11 → 星名数组）
    var stars = {}
    function put(name, zhi, major) {
      var z = mod12(zhi)
      ;(stars[z] = stars[z] || []).push({ name: name, major: !!major })
    }
    var zi = ziweiPos(ju, day)
    put('紫微', zi, 1); put('天机', zi - 1, 1); put('太阳', zi - 3, 1)
    put('武曲', zi - 4, 1); put('天同', zi - 5, 1); put('廉贞', zi - 8, 1)
    var fu = mod12(16 - zi)
    put('天府', fu, 1); put('太阴', fu + 1, 1); put('贪狼', fu + 2, 1); put('巨门', fu + 3, 1)
    put('天相', fu + 4, 1); put('天梁', fu + 5, 1); put('七杀', fu + 6, 1); put('破军', fu + 10, 1)
    // 时系 · 月系 · 年系辅星
    put('文昌', 10 - t); put('文曲', 4 + t); put('地劫', 11 + t); put('地空', 11 - t)
    put('左辅', 4 + (m - 1)); put('右弼', 10 - (m - 1))
    var yGan = GAN[yg]
    var lc = LUCUN[yGan]
    put('禄存', lc); put('擎羊', lc + 1); put('陀罗', lc - 1)
    put('天魁', KUI[yGan]); put('天钺', YUE[yGan])
    var hl = huoLingStart(yz)
    put('火星', hl.huo + t); put('铃星', hl.ling + t)
    put('天马', TIANMA[yz % 4])
    var luan = mod12(3 - yz)
    put('红鸾', luan); put('天喜', luan + 6)

    // 生年四化：标到星上
    var sh = SIHUA[yGan]
    var sihua = {}
    for (var i = 0; i < 4; i++) sihua[sh[i]] = SIHUA_NAMES[i]
    for (var z = 0; z < 12; z++) (stars[z] || []).forEach(function (s) { if (sihua[s.name]) s.hua = sihua[s.name] })

    // 十二宫（自命宫逆布）
    var palaces = []
    for (var k = 0; k < 12; k++) {
      var pz = mod12(ming - k)
      palaces.push({
        name: PALACE_NAMES[k], zhi: ZHI[pz], zhiIdx: pz,
        gan: palaceGan(yg, pz),
        stars: (stars[pz] || []).slice(),
        isShen: pz === shen
      })
    }

    return {
      ming: ming, shen: shen, mingZhi: ZHI[ming], shenZhi: ZHI[shen],
      ju: ju, juEl: juEl, juName: juEl + (['', '', '二', '三', '四', '五', '六'][ju]) + '局',
      mingZhu: MING_ZHU[ming], shenZhu: SHEN_ZHU[yz],
      yearGan: yGan, yearZhi: ZHI[yz], yearGanIdx: yg,
      sihua: sh.slice(), // [禄,权,科,忌] 星名
      palaces: palaces, starsByZhi: stars,
      params: { month: m, leap: month < 0, day: day, timeZhi: ZHI[t], timeZhiIdx: t }
    }
  }

  // 由公历生辰排盘（gender 供大限顺逆：阳男阴女顺、阴男阳女逆）
  function buildFromBirth(birth) {
    var solar = Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
    var lu = solar.getLunar()
    var zw = buildFromLunar(lu.getYearGanIndex(), lu.getYearZhiIndex(), lu.getMonth(), lu.getDay(), lu.getTimeZhiIndex())
    zw.lunarDesc = lu.toString() + ' ' + lu.getTimeZhi() + '时'
    zw.gender = birth.gender === 0 ? 0 : 1
    zw.birthLunarYear = lu.getYear()
    return zw
  }

  /*
   * 大限（紫微的十年大运）：起限 = 五行局数（虚岁），每限十年，第一限在命宫；
   * 阳男阴女顺行（命→父母方向），阴男阳女逆行（命→兄弟方向）。
   * 大限四化取大限宫之宫干（三合派通行）。selLunarYear = 所观日期的农历年。
   */
  function daXian(zw, selLunarYear) {
    if (zw.birthLunarYear === undefined || zw.gender === undefined) return null
    var age = selLunarYear - zw.birthLunarYear + 1 // 虚岁
    if (age < zw.ju) return { tong: true, age: age, startAge: zw.ju } // 童限（未起限）
    var idx = Math.floor((age - zw.ju) / 10)
    var yangYear = zw.yearGanIdx % 2 === 0
    var shun = (yangYear && zw.gender === 1) || (!yangYear && zw.gender === 0)
    var gong = mod12(zw.ming + (shun ? idx : -idx))
    var gan = palaceGan(zw.yearGanIdx, gong)
    return {
      tong: false, gong: gong, gongZhi: ZHI[gong], gan: gan,
      startAge: zw.ju + idx * 10, endAge: zw.ju + idx * 10 + 9, age: age, shun: shun,
      sihua: flowSiHua(zw, gan)
    }
  }

  // 某星在盘中的地支序（找不到返回 -1）
  function starZhi(zw, starName) {
    for (var z = 0; z < 12; z++) {
      var arr = zw.starsByZhi[z] || []
      for (var i = 0; i < arr.length; i++) if (arr[i].name === starName) return z
    }
    return -1
  }

  // 三方四正（本宫 + 对宫 + 两三合宫）
  function sanFangSiZheng(zhiIdx) { return [mod12(zhiIdx), mod12(zhiIdx + 4), mod12(zhiIdx + 6), mod12(zhiIdx + 8)] }

  /*
   * 流曜四化：某天干引动的禄/权/科/忌 各落何宫，并给「对命宫三方四正」的影响分
   * 返回 { list:[{hua,star,zhi,zhiIdx,palace,inSFSZ}], score(-1..1) }
   */
  var HUA_W = { 化禄: 0.5, 化权: 0.3, 化科: 0.3, 化忌: -0.6 }
  function flowSiHua(zw, ganChar) {
    var sh = SIHUA[ganChar]
    if (!sh) return null
    var sfsz = sanFangSiZheng(zw.ming)
    var pmap = {}
    zw.palaces.forEach(function (p) { pmap[p.zhiIdx] = p.name })
    var list = [], score = 0
    for (var i = 0; i < 4; i++) {
      var z = starZhi(zw, sh[i])
      if (z < 0) continue
      var inS = sfsz.indexOf(z) >= 0
      if (inS) {
        score += HUA_W[SIHUA_NAMES[i]]
        if (SIHUA_NAMES[i] === '化忌' && z === zw.ming) score -= 0.3
      }
      list.push({ hua: SIHUA_NAMES[i], star: sh[i], zhi: ZHI[z], zhiIdx: z, palace: pmap[z] || '', inSFSZ: inS })
    }
    return { list: list, score: Math.max(-1, Math.min(1, score)) }
  }

  /*
   * ———— 流层推宫（紫微的年月日）————
   * 流年宫 = 太岁（农历年支）所在宫；
   * 斗君（流年正月）依全书诀：「太岁宫中便起正，逆回数至生月份；生月宫中起子时，顺至生时镇斗君」；
   * 流月宫 = 斗君顺行至当月（农历月，闰月归本月）；流日宫 = 流月宫起初一顺行。
   * 干支：流年取农历岁首（春节切换），流月干由年干五虎遁，流日干支即当日日柱——
   * 与八字侧的节气链各守其义（立春/节气 vs 岁首/斗君），界面注明。
   */
  function flowLayers(zw, date) {
    var solar = Solar.fromYmdHms(date.year, date.month, date.day, 12, 0, 0)
    var lu = solar.getLunar()
    var yg = lu.getYearGanIndex(), yz = lu.getYearZhiIndex()
    var lm = Math.abs(lu.getMonth()), ld = lu.getDay()
    var yearGong = yz
    var douJun = mod12(yearGong - (zw.params.month - 1) + zw.params.timeZhiIdx)
    var monthGong = mod12(douJun + (lm - 1))
    var dayGong = mod12(monthGong + (ld - 1))
    var mGan = GAN[(WUHU[GAN[yg]] + (lm - 1)) % 10]
    var dayGz = lu.getDayInGanZhi()
    var pmap = {}
    zw.palaces.forEach(function (p) { pmap[p.zhiIdx] = p.name })
    function layer(label, gan, zhi, gong) {
      return {
        label: label, gan: gan, zhi: zhi, gong: gong, gongZhi: ZHI[gong],
        palace: pmap[gong] || '', sihua: flowSiHua(zw, gan)
      }
    }
    var dx = daXian(zw, lu.getYear())
    if (dx && !dx.tong) { dx.palace = pmap[dx.gong] || ''; dx.label = '大限' }
    return {
      lunarDesc: lu.toString(), lunarMonth: lm, lunarDay: ld, douJun: douJun,
      dx: dx,
      nian: layer('流年', GAN[yg], ZHI[yz], yearGong),
      yue: layer('流月', mGan, ZHI[(2 + lm - 1) % 12], monthGong),
      ri: layer('流日', dayGz[0], dayGz[1], dayGong)
    }
  }

  // ———— 十四主星 · 当日行动建议（宜/留意，一星一对，去恐吓化）————
  var STAR_ADVICE = {
    紫微: { yi: '拿大主意、定方向，做需要「拍板」的事', ji: '留意只听顺耳话——今天多问一句反对意见' },
    天机: { yi: '筹划、复盘、优化流程，动脑的事最顺手', ji: '留意想太多而不动手——方案过三稿就先行动' },
    太阳: { yi: '公开表达、照拂他人、把事摆到台面上谈', ji: '留意过度操劳、大包大揽——留一盏灯给自己' },
    武曲: { yi: '处理钱账与硬任务，执行力今天是长板', ji: '留意语气太硬——事要刚，话可以柔' },
    天同: { yi: '修整关系、享受生活，把节奏放慢半拍', ji: '留意安逸拖延——挑一件小事今天务必收尾' },
    廉贞: { yi: '公关斡旋、艺术审美之事，手腕灵活', ji: '留意情理拉扯——先定原则，再讲人情' },
    天府: { yi: '盘点库存、守成理财，稳字诀最合拍', ji: '留意过于保守——好机会给它十分钟认真看' },
    太阴: { yi: '静水深流：整理、积蓄、照顾身边人', ji: '留意多愁内耗——心事写下来就放下' },
    贪狼: { yi: '社交应酬、学新东西，欲望即是动力', ji: '留意贪多嚼不烂——今天只追一只兔子' },
    巨门: { yi: '深究一个问题、做研究与谈判，口才有光', ji: '留意言语是非——评事不评人' },
    天相: { yi: '协调各方、履约践诺，做公道的中间人', ji: '留意滥好人——该拒绝的事今天练习说不' },
    天梁: { yi: '照拂后辈、处理善后、请教长者，荫庇在身', ji: '留意好为人师——先听完，再给建议' },
    七杀: { yi: '攻坚克难，把最硬的骨头排给今天', ji: '留意冲得太猛——出手前留一条退路' },
    破军: { yi: '破旧立新：清理、重构、开新局', ji: '留意破而不立——拆掉之前先想好怎么建' }
  }
  var HUA_ADVICE = {
    化禄: function (p) { return '禄入「' + p + '」——此处顺手有缘，宜落实一件实事' },
    化权: function (p) { return '权入「' + p + '」——此处宜主动出手、当仁不让' },
    化科: function (p) { return '科入「' + p + '」——此处宜亮相正名，好名声护持' },
    化忌: function (p) { return '忌入「' + p + '」——此处易多想多绊，留一分耐心（非凶，是功课）' }
  }

  // 某宫取「用星」：本宫主星；空宫借对宫（注明）
  function gongStars(zw, gongIdx) {
    var own = (zw.starsByZhi[gongIdx] || []).filter(function (s) { return s.major })
    if (own.length) return { stars: own, borrowed: false }
    var opp = (zw.starsByZhi[mod12(gongIdx + 6)] || []).filter(function (s) { return s.major })
    return { stars: opp, borrowed: true }
  }

  /*
   * 当日建议（主入口）：流日入何宫 × 该宫主星 × 流日四化 → { theme, starLines, huaLines, chen }
   */
  function dayAdvice(zw, date) {
    var fl = flowLayers(zw, date)
    var ri = fl.ri
    var gs = gongStars(zw, ri.gong)
    var theme = '流日入「' + ri.palace + '」—— 今日气聚于' + (PALACE_NOTE[ri.palace] || '此宫') +
      (gs.borrowed ? '；此宫无主星，借对宫之光行事' : '')
    var starLines = gs.stars.slice(0, 2).map(function (s) {
      var a = STAR_ADVICE[s.name] || { yi: '顺其星性而为', ji: '留意过犹不及' }
      return { star: s.name, hua: s.hua || '', yi: a.yi, ji: a.ji }
    })
    var sfsz = sanFangSiZheng(zw.ming)
    var huaLines = [], luGong = '', jiGong = '', jiInSFSZ = false
    ri.sihua.list.forEach(function (x) {
      huaLines.push({ hua: x.hua, star: x.star, palace: x.palace, inSFSZ: x.inSFSZ, text: HUA_ADVICE[x.hua](x.palace || x.zhi) })
      if (x.hua === '化禄') luGong = x.palace
      if (x.hua === '化忌') { jiGong = x.palace; jiInSFSZ = x.inSFSZ }
    })
    var chen = '臣观星垣：气聚' + ri.palace + '，禄在' + (luGong || '外') + '、忌在' + (jiGong || '外') +
      (jiInSFSZ ? '——忌临要垣，锋芒收三分，稳字当头。' : '——大道无碍，各安其位，顺星而行。')
    // 运限视角：大限（十年气象）× 流年（今年功课）× 流日（当日课业）
    var yunxian = ''
    function gsName(gong) {
      var g = gongStars(zw, gong)
      return g.stars.length ? g.stars.slice(0, 2).map(function (s) { return s.name }).join('') + (g.borrowed ? '(借)' : '') : '静'
    }
    if (fl.dx && !fl.dx.tong) {
      yunxian = '大限（' + fl.dx.startAge + '–' + fl.dx.endAge + '岁）行「' + fl.dx.palace + '」坐' + gsName(fl.dx.gong) +
        '——十年气象所聚；流年过「' + fl.nian.palace + '」坐' + gsName(fl.nian.gong) +
        '——今年功课所在；日课落「' + ri.palace + '」——小事之中见大势。'
    } else if (fl.dx && fl.dx.tong) {
      yunxian = '尚在童限（' + fl.dx.startAge + '岁起第一限）；流年过「' + fl.nian.palace + '」坐' + gsName(fl.nian.gong) + '——今年功课所在。'
    }
    return { fl: fl, gong: ri.palace, gongZhi: ri.gongZhi, stars: gs, theme: theme, starLines: starLines, huaLines: huaLines, chen: chen, yunxian: yunxian }
  }

  /*
   * ———— 宫位深批：三方四正会商 × 大限十年 × 流年今岁 × 趋势合断 ————
   * 规则合成的四段分析（非断言口径）：
   *   sanfang —— 本宫与三方四正的格局判读（杀破狼/府相/日月/机梁 + 吉煞配比 + 生年四化落垣）
   *   daxian —— 大限与此宫的位置关系 + 限四化入垣的十年影响
   *   liunian —— 流年与此宫的位置关系 + 年四化入垣的今年功课
   *   trend —— 限×年叠加的趋势一句（起/承/敛/转，去恐吓化）
   */
  var STAR_TONE2 = {
    紫微: '尊贵持重', 天机: '灵动多谋', 太阳: '外放照人', 武曲: '刚毅务实', 天同: '温和自适',
    廉贞: '才情多变', 天府: '稳健守成', 太阴: '内敛蓄藏', 贪狼: '活力多欲', 巨门: '深究善辩',
    天相: '公道辅佐', 天梁: '荫护老成', 七杀: '冲锋决断', 破军: '破旧立新'
  }
  var JI_XING = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存']
  var SHA_XING = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']
  var NATAL_HUA_TXT = {
    化禄: '生年禄坐此垣——底子里带一分财缘与顺遂',
    化权: '生年权在此——天生对这一司有掌控欲，也压得住担子',
    化科: '生年科照——名声与文书是此处的护身符',
    化忌: '生年忌埋在此垣——命里的一门长期功课，认了它反而轻'
  }
  var DX_HUA_TXT = {
    化禄: '限禄注入——这十年此处越走越顺，资源渐聚',
    化权: '限权到位——十年间主动权渐入手，担子也随之而来',
    化科: '限科来照——十年里名声文书渐立',
    化忌: '限忌所指——十年反复叩问之处，是大限的主功课'
  }
  var LN_HUA_TXT = {
    化禄: '年禄入垣——今年此处顺水，宜趁势落实',
    化权: '年权入垣——今年宜在此主动请缨',
    化科: '年科入垣——今年此处宜亮相正名',
    化忌: '年忌入垣——今年此处多想多绊，宜慢半拍、留余地'
  }
  function gongAnalysis(zw, fl, gong) {
    var group = [gong, mod12(gong + 4), mod12(gong + 8), mod12(gong + 6)]
    var pmap = {}
    zw.palaces.forEach(function (q) { pmap[q.zhiIdx] = q })
    var p = pmap[gong]
    if (!p) return null
    // 会商组：各宫主星（本宫空则借对宫）与全部星曜名单
    var names = {}, majorsOf = {}
    group.forEach(function (z) {
      var g = gongStars(zw, z)
      majorsOf[z] = g
      ;(zw.starsByZhi[z] || []).forEach(function (s) { names[s.name] = s })
      g.stars.forEach(function (s) { names[s.name] = names[s.name] || s })
    })
    function hasAll(list) { return list.every(function (n) { return names[n] }) }
    var ju
    if (hasAll(['七杀', '破军', '贪狼'])) ju = '会齐「杀破狼」——动局：这一司十年不甘守旧，机会在变动里，宜以整备代观望、以攻代守'
    else if (hasAll(['天府', '天相'])) ju = '府相相会——稳局：根基厚、有靠山，宜守成中求精进，不必急'
    else if (hasAll(['太阳', '太阴'])) ju = '日月并照——内外兼修之局：明处担事、暗处蓄力，两条线都要经营'
    else if (hasAll(['天机', '天梁']) || hasAll(['天机', '天同'])) ju = '机梁同会——筹谋安稳之局：宜按部就班，以巧劲代蛮力'
    else {
      var tones = []
      group.forEach(function (z) {
        majorsOf[z].stars.slice(0, 1).forEach(function (s) { if (STAR_TONE2[s.name] && tones.indexOf(STAR_TONE2[s.name]) < 0) tones.push(STAR_TONE2[s.name]) })
      })
      ju = '会商之气以「' + tones.slice(0, 3).join('、') + '」为主调'
    }
    var ji = 0, sha = 0
    Object.keys(names).forEach(function (n) { if (JI_XING.indexOf(n) >= 0) ji++; if (SHA_XING.indexOf(n) >= 0) sha++ })
    var jiSha = ji > sha + 1 ? '吉辅成群而煞轻——得人得势，谋事有人抬轿'
      : sha > ji + 1 ? '煞曜偏多——这一司做事多磨，但磨出来的最扎实；宜慢、宜实、宜留余地'
      : '吉煞相济（' + ji + '吉' + sha + '煞）——有帮衬也有考验，成色看拿捏'
    var natal = []
    group.forEach(function (z) {
      (zw.starsByZhi[z] || []).forEach(function (s) { if (s.hua) natal.push(NATAL_HUA_TXT[s.hua] + '（' + s.name + '在' + (pmap[z] ? pmap[z].name : ZHI[z]) + '）') })
    })
    var own = majorsOf[gong]
    var ownDesc = own.stars.length ? own.stars.slice(0, 2).map(function (s) { return s.name }).join('') + (own.borrowed ? '（借对宫）' : '') : '静'
    var sanfang = '本宫坐' + ownDesc + '，与三合「' + pmap[mod12(gong + 4)].name + '」「' + pmap[mod12(gong + 8)].name + '」、对照「' + pmap[mod12(gong + 6)].name + '」同参：' + ju + '。' + jiSha + '。' + (natal.length ? natal.join('；') + '。' : '')
    // 位置关系描述
    function relTo(z) {
      if (z === gong) return 'self'
      if (group.indexOf(z) >= 0) return 'group'
      return 'far'
    }
    function huaHits(layer, TXT) {
      var out = []
      if (!layer || !layer.sihua) return out
      layer.sihua.list.forEach(function (h) {
        if (group.indexOf(h.zhiIdx) >= 0) out.push(TXT[h.hua] + (h.zhiIdx === gong ? '（正入本宫）' : '（入' + (pmap[h.zhiIdx] ? pmap[h.zhiIdx].name : ZHI[h.zhiIdx]) + '）'))
      })
      return out
    }
    function layerScore(layer) {
      var v = 0
      if (!layer || !layer.sihua) return 0
      layer.sihua.list.forEach(function (h) {
        if (group.indexOf(h.zhiIdx) < 0) return
        v += { 化禄: 2, 化权: 1, 化科: 1, 化忌: -2 }[h.hua] * (h.zhiIdx === gong ? 1.5 : 1)
      })
      return v
    }
    // 大限段
    var daxian, dxScore = 0
    if (!fl.dx) daxian = '未知大限（生辰信息不全）。'
    else if (fl.dx.tong) daxian = '尚在童限（' + fl.dx.startAge + '岁起第一限）——十年之风未起，此宫暂行常度。'
    else {
      var r1 = relTo(fl.dx.gong)
      var dxHits = huaHits(fl.dx, DX_HUA_TXT)
      dxScore = layerScore(fl.dx) + (r1 === 'self' ? 1.5 : r1 === 'group' ? 0.5 : 0)
      daxian = '大限（' + fl.dx.startAge + '–' + fl.dx.endAge + '岁）' +
        (r1 === 'self' ? '正行此宫——十年天气直接落在这一司，宫中之星就是十年之臣'
          : r1 === 'group' ? '行「' + fl.dx.palace + '」，在此宫三方四正之内——十年之气斜照此司，间接而持续'
          : '行「' + fl.dx.palace + '」，与此宫无直会——十年主线不在此，这一司行常度、受远光') + '。' +
        (dxHits.length ? dxHits.join('；') + '。' : '限内四化未入此垣，十年里此司平稳少扰。')
    }
    // 流年段
    var r2 = relTo(fl.nian.gong)
    var lnHits = huaHits(fl.nian, LN_HUA_TXT)
    var lnScore = layerScore(fl.nian) + (r2 === 'self' ? 1.5 : r2 === 'group' ? 0.5 : 0)
    var liunian = '流年' + fl.nian.gan + fl.nian.zhi +
      (r2 === 'self' ? '太岁坐此——今年功课正在这一司，此宫之事被反复叩问'
        : r2 === 'group' ? '过「' + fl.nian.palace + '」，会照此宫——今年之气侧身而入，此司有感而不迫'
        : '过「' + fl.nian.palace + '」，不与此宫直会——今年此司大体行其常') + '。' +
      (lnHits.length ? lnHits.join('；') + '。' : '年四化未入此垣，今年此处顺其自然即可。')
    // 趋势合断
    var trend
    if (dxScore > 0.5 && lnScore > 0.5) trend = '限年同暖：十年向好、今年加持——趋势向上，宜乘势把此司之事往前推一格。'
    else if (dxScore > 0.5 && lnScore < -0.5) trend = '大势向暖、今岁有坎：十年趋势不改，今年节奏放缓——把今年当整固期，不因一年疑十年。'
    else if (dxScore < -0.5 && lnScore > 0.5) trend = '十年功课未了、今年得喘息：宜借今年的顺手处整备补课——趋势在养，养好则后段转扬。'
    else if (dxScore < -0.5 && lnScore < -0.5) trend = '限年同敛：此司正处深耕蛰养之期——趋势不在攻而在守，守得住便是赢。'
    else trend = '限年皆平：此司平流缓进——趋势无大起伏，日拱一卒最相宜。'
    trend += '（趋势为模型合断，福祸相依、非命定论。）'
    return { name: p.name, gz: p.gan + p.zhi, sanfang: sanfang, daxian: daxian, liunian: liunian, trend: trend, dxScore: dxScore, lnScore: lnScore }
  }

  var Ziwei = {
    buildFromBirth: buildFromBirth, buildFromLunar: buildFromLunar, daXian: daXian,
    flowSiHua: flowSiHua, flowLayers: flowLayers, dayAdvice: dayAdvice, gongStars: gongStars,
    gongAnalysis: gongAnalysis,
    sanFangSiZheng: sanFangSiZheng, starZhi: starZhi,
    ziweiPos: ziweiPos, naYinElement: naYinElement, palaceGan: palaceGan,
    SIHUA: SIHUA, SIHUA_NAMES: SIHUA_NAMES, STAR_EL: STAR_EL, STAR_NOTE: STAR_NOTE,
    STAR_ADVICE: STAR_ADVICE, PALACE_NOTE: PALACE_NOTE, PALACE_NAMES: PALACE_NAMES, ZHI: ZHI, GAN: GAN
  }
  root.Ziwei = Ziwei
  if (typeof module !== 'undefined' && module.exports) module.exports = Ziwei
})(typeof window !== 'undefined' ? window : globalThis)
