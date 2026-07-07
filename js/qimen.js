/*
 * qimen.js · 奇门遁甲引擎（时家 · 转盘 · 拆补法）
 * 每日取「午时盘」为观象快照（日中之时，取法为本站约定）。
 * 定局：节气定阴阳遁与三局（冬至惊蛰一七四歌诀）；日柱符头（甲/己）定上中下元（拆补：子午卯酉上、寅申巳亥中、辰戌丑未下）。
 * 排盘：地盘六仪三奇（阳顺阴逆）→ 时旬首定值符星/值使门 → 九星随时干转宫、八门数至时辰、八神阳顺阴逆。
 * 读盘（问财，观 BTC）：看生门与戊（资本）之落宫与生克，输出参考倾向。依赖全局 Solar/Lunar 与 Engine 五行表。
 */
;(function (root) {
  'use strict'
  var E = root.Engine

  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('')
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')
  // 二十四节气 → 阴阳遁 + 上中下元局数
  var JU = {
    冬至: { yang: 1, ju: [1, 7, 4] }, 小寒: { yang: 1, ju: [2, 8, 5] }, 大寒: { yang: 1, ju: [3, 9, 6] },
    立春: { yang: 1, ju: [8, 5, 2] }, 雨水: { yang: 1, ju: [9, 6, 3] }, 惊蛰: { yang: 1, ju: [1, 7, 4] },
    春分: { yang: 1, ju: [3, 9, 6] }, 清明: { yang: 1, ju: [4, 1, 7] }, 谷雨: { yang: 1, ju: [5, 2, 8] },
    立夏: { yang: 1, ju: [4, 1, 7] }, 小满: { yang: 1, ju: [5, 2, 8] }, 芒种: { yang: 1, ju: [6, 3, 9] },
    夏至: { yang: 0, ju: [9, 3, 6] }, 小暑: { yang: 0, ju: [8, 2, 5] }, 大暑: { yang: 0, ju: [7, 1, 4] },
    立秋: { yang: 0, ju: [2, 5, 8] }, 处暑: { yang: 0, ju: [1, 4, 7] }, 白露: { yang: 0, ju: [9, 3, 6] },
    秋分: { yang: 0, ju: [7, 1, 4] }, 寒露: { yang: 0, ju: [6, 9, 3] }, 霜降: { yang: 0, ju: [5, 8, 2] },
    立冬: { yang: 0, ju: [6, 9, 3] }, 小雪: { yang: 0, ju: [5, 8, 2] }, 大雪: { yang: 0, ju: [4, 7, 1] }
  }
  var RING = [1, 8, 3, 4, 9, 2, 7, 6] // 九宫环（顺时针：坎艮震巽离坤兑乾）
  var STAR_OF = { 1: '天蓬', 8: '天任', 3: '天冲', 4: '天辅', 9: '天英', 2: '天芮', 7: '天柱', 6: '天心', 5: '天禽' }
  var DOOR_OF = { 1: '休门', 8: '生门', 3: '伤门', 4: '杜门', 9: '景门', 2: '死门', 7: '惊门', 6: '开门' }
  var GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']
  var PAL_DIR = { 1: '北 · 坎', 8: '东北 · 艮', 3: '东 · 震', 4: '东南 · 巽', 9: '南 · 离', 2: '西南 · 坤', 7: '西 · 兑', 6: '西北 · 乾', 5: '中宫' }
  var PAL_EL = { 1: '水', 8: '土', 3: '木', 4: '木', 9: '火', 2: '土', 7: '金', 6: '金', 5: '土' }
  var DOOR_EL = { 休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金' }
  var YI_SEQ = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] // 六仪三奇布地盘序
  var XUN_YI = { 0: '戊', 10: '己', 8: '庚', 6: '辛', 4: '壬', 2: '癸' } // 旬首支 → 所遁六仪
  var STAR_TONE = { 天辅: 1, 天心: 1, 天任: 1, 天禽: 1, 天冲: 0, 天英: 0, 天蓬: -1, 天芮: -1, 天柱: -1 } // 聚/平/敛（去恐吓化）

  function gz60(g, z) { for (var i = g; i < 60; i += 10) { if (i % 12 === z) return i } return -1 }
  function ringIdx(p) { return RING.indexOf(p) }

  // date: {year,month,day}；时辰固定取午时（12:00）
  function build(date) {
    var solar = Solar.fromYmdHms(date.year, date.month, date.day, 12, 0, 0)
    var lu = solar.getLunar()
    var jq = lu.getPrevJieQi(true)
    var jqName = jq.getName()
    var spec = JU[jqName]
    if (!spec) return null
    var day60 = gz60(lu.getDayGanIndex(), lu.getDayZhiIndex())
    var fz = (day60 - day60 % 5) % 12
    var yuanIdx = (fz === 0 || fz === 6 || fz === 3 || fz === 9) ? 0 : (fz === 2 || fz === 8 || fz === 5 || fz === 11) ? 1 : 2
    var ju = spec.ju[yuanIdx], yang = !!spec.yang

    // 地盘
    var dipan = {}
    var p = ju
    YI_SEQ.forEach(function (g) {
      dipan[p] = g
      p = yang ? (p % 9) + 1 : ((p + 7) % 9) + 1
    })

    // 时柱与旬首
    var timeGz = lu.getTimeInGanZhi()
    var tg = timeGz[0], tz = timeGz[1]
    var ts60 = gz60(GAN.indexOf(tg), ZHI.indexOf(tz))
    var xun = ts60 - ts60 % 10
    var xunYi = XUN_YI[xun % 12]
    var fuPal = 0
    for (var pp = 1; pp <= 9; pp++) { if (dipan[pp] === xunYi) { fuPal = pp; break } }
    var zhiFuStar = STAR_OF[fuPal]
    var zhiShiDoor = DOOR_OF[fuPal === 5 ? 2 : fuPal]

    // 时干宫（甲遁于旬首仪）
    var tgUse = tg === '甲' ? xunYi : tg
    var tgPal = 0
    for (var q = 1; q <= 9; q++) { if (dipan[q] === tgUse) { tgPal = q; break } }
    if (tgPal === 5) tgPal = 2 // 寄坤

    // 天盘九星（值符星转至时干宫，余星随环）；禽随芮，天盘干随星携其地盘仪
    var starHome = fuPal === 5 ? 2 : fuPal
    var off = ringIdx(tgPal) - ringIdx(starHome)
    var tianStar = {}, tianGan = {}
    RING.forEach(function (home, i) {
      var target = RING[((i + off) % 8 + 8) % 8]
      tianStar[target] = home === 2 ? '芮禽' : STAR_OF[home].slice(1) // 单字：蓬任冲辅英柱心 + 芮禽
      tianGan[target] = dipan[home] + (home === 2 && dipan[5] ? dipan[5] : '')
    })

    // 八门（值使门从值符宫数至时辰，阳顺阴逆过九宫数序，遇五寄二）
    var steps = ts60 - xun
    var doorPal = yang ? ((fuPal - 1 + steps) % 9) + 1 : (((fuPal - 1 - steps) % 9) + 9) % 9 + 1
    if (doorPal === 5) doorPal = 2
    var doorHome = fuPal === 5 ? 2 : fuPal
    var offD = ringIdx(doorPal) - ringIdx(doorHome)
    var doors = {}
    RING.forEach(function (home, i) {
      var target = RING[((i + offD) % 8 + 8) % 8]
      doors[target] = DOOR_OF[home]
    })

    // 八神（自值符宫起，阳顺阴逆）
    var gods = {}
    var base = ringIdx(tgPal)
    GODS.forEach(function (g, i) {
      var pal = RING[((base + (yang ? i : -i)) % 8 + 8) % 8]
      gods[pal] = g
    })

    // ———— 读盘（问财）：生门 + 戊（资本）————
    var shengPal = 0, wuPal = 0
    for (var d2 = 1; d2 <= 9; d2++) {
      if (doors[d2] === '生门') shengPal = d2
      if ((tianGan[d2] || '').indexOf('戊') >= 0) wuPal = d2
    }
    var score = 0, bullets = []
    var sGan = tianGan[shengPal] || ''
    if (sGan.indexOf('戊') >= 0) { score += 1.2; bullets.push('生门与戊（资本）同宫于' + PAL_DIR[shengPal] + '——生意与资金同气，资金面偏活络') }
    else {
      bullets.push('生门落' + PAL_DIR[shengPal] + '，临天盘' + sGan + '；戊（资本）落' + PAL_DIR[wuPal])
      if (/[乙丙丁]/.test(sGan)) { score += 0.6; bullets.push('生门得三奇之助——生机得贵') }
      if (wuPal && doors[wuPal] && '开休生'.indexOf(doors[wuPal][0]) >= 0) { score += 0.6; bullets.push('戊临' + doors[wuPal] + '（三吉门）——资本有出路') }
      else if (wuPal) { score -= 0.3; bullets.push('戊临' + (doors[wuPal] || '静宫') + '——资本偏蛰，流转费力') }
    }
    var dEl = DOOR_EL['生门'], pEl = PAL_EL[shengPal]
    if (E.controls(dEl, pEl)) { score -= 1; bullets.push('生门迫于' + PAL_DIR[shengPal] + '宫（' + dEl + '克' + pEl + '）——生机费力，事倍功半') }
    else if (E.controls(pEl, dEl)) { score -= 0.6; bullets.push('生门受宫制（' + pEl + '克' + dEl + '）——势有掣肘') }
    else if (E.generates(pEl, dEl)) { score += 0.5; bullets.push('生门得宫气相生（' + pEl + '生' + dEl + '）——生机得养') }
    var tone = STAR_TONE[zhiFuStar] || 0
    score += tone * 0.4
    bullets.push('值符' + zhiFuStar + '当值——气性偏' + (tone > 0 ? '聚' : tone < 0 ? '敛' : '平') + '；值使' + zhiShiDoor + '行事')
    score = Math.max(-3, Math.min(3, score))
    var tendency = score >= 1 ? '偏扬' : score <= -1 ? '偏抑' : '震荡'

    return {
      juName: (yang ? '阳' : '阴') + '遁' + '一二三四五六七八九'[ju - 1] + '局',
      yuan: ['上元', '中元', '下元'][yuanIdx], jieQi: jqName, shiGz: timeGz, dayGz: lu.getDayInGanZhi(),
      yang: yang, ju: ju, dipan: dipan, tianStar: tianStar, tianGan: tianGan, doors: doors, gods: gods,
      zhiFu: { star: zhiFuStar, palace: fuPal }, zhiShi: { door: zhiShiDoor, palace: doorPal },
      shengPal: shengPal, wuPal: wuPal,
      reading: { score: Math.round(score * 100) / 100, tendency: tendency, bullets: bullets },
      grid: [[4, 9, 2], [3, 5, 7], [8, 1, 6]], PAL_DIR: PAL_DIR
    }
  }

  var Qimen = { build: build, JU: JU, RING: RING, STAR_OF: STAR_OF, DOOR_OF: DOOR_OF, GODS: GODS, PAL_DIR: PAL_DIR, PAL_EL: PAL_EL }
  root.Qimen = Qimen
  if (typeof module !== 'undefined' && module.exports) module.exports = Qimen
})(typeof window !== 'undefined' ? window : globalThis)
