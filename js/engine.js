/*
 * engine.js · 排盘引擎封装
 * 包住全局 lunar.js（Solar / Lunar / EightChar），导出干净的领域数据。
 * 浏览器：挂到 window.Engine；Node（测试用）：module.exports。
 */
;(function (root) {
  'use strict'

  // —— 五行 / 阴阳 基础表 ——
  var GAN_WUXING = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
  }
  var ZHI_WUXING = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
  }
  var GAN_YINYANG = {
    甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
    己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴'
  }
  // 地支主气藏干（本气）——支的五行阴阳以本气论：子藏癸=阴水、午藏丁=阴火…
  var ZHI_MAIN = {
    子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
    午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬'
  }
  // 地支全藏干（本气·中气·余气，顺序即权重序）——五行能量谱与藏干分析共用
  var ZHI_CANG = {
    子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊',
    午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲'
  }
  var WUXING_ORDER = ['木', '火', '土', '金', '水']
  var WEEK = ['日', '一', '二', '三', '四', '五', '六']

  // —— 五行生克 ——
  function generates(a, b) {
    // a 生 b
    return (
      (a === '木' && b === '火') ||
      (a === '火' && b === '土') ||
      (a === '土' && b === '金') ||
      (a === '金' && b === '水') ||
      (a === '水' && b === '木')
    )
  }
  function controls(a, b) {
    // a 克 b
    return (
      (a === '木' && b === '土') ||
      (a === '土' && b === '水') ||
      (a === '水' && b === '火') ||
      (a === '火' && b === '金') ||
      (a === '金' && b === '木')
    )
  }

  // —— 十神：以日主 dm 之眼看 other 干 ——
  function shiShen(dm, other) {
    var de = GAN_WUXING[dm]
    var oe = GAN_WUXING[other]
    var same = GAN_YINYANG[dm] === GAN_YINYANG[other]
    if (de === oe) return same ? '比肩' : '劫财'
    if (generates(de, oe)) return same ? '食神' : '伤官' // 我生
    if (generates(oe, de)) return same ? '偏印' : '正印' // 生我
    if (controls(de, oe)) return same ? '偏财' : '正财' // 我克
    if (controls(oe, de)) return same ? '七杀' : '正官' // 克我
    return ''
  }

  // 十神 → 能量大类
  var SHISHEN_GROUP = {
    比肩: '比劫', 劫财: '比劫',
    食神: '食伤', 伤官: '食伤',
    正财: '财', 偏财: '财',
    正官: '官杀', 七杀: '官杀',
    正印: '印', 偏印: '印'
  }

  // 取一柱（which: 'Year'|'Month'|'Day'|'Time'）
  function pillar(ec, which) {
    var gan = ec['get' + which + 'Gan']()
    var zhi = ec['get' + which + 'Zhi']()
    return {
      gan: gan,
      zhi: zhi,
      ganWuxing: GAN_WUXING[gan],
      zhiWuxing: ZHI_WUXING[zhi],
      ganShiShen: which === 'Day' ? '日元' : ec['get' + which + 'ShiShenGan'](),
      hideGan: ec['get' + which + 'HideGan'](), // 数组
      zhiShiShen: ec['get' + which + 'ShiShenZhi'](), // 数组，与 hideGan 对应
      naYin: ec['get' + which + 'NaYin']()
    }
  }

  // —— 排本命盘 ——
  // input: { year, month, day, hour, minute, gender }  gender: 1=男 0=女
  function buildChart(input) {
    var solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0)
    var lunar = solar.getLunar()
    var ec = lunar.getEightChar()

    var pillars = {
      year: pillar(ec, 'Year'),
      month: pillar(ec, 'Month'),
      day: pillar(ec, 'Day'),
      time: pillar(ec, 'Time')
    }
    var dmGan = ec.getDayGan()

    // 五行分布（4 天干 + 4 地支主气）
    var count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
    ;['year', 'month', 'day', 'time'].forEach(function (k) {
      count[pillars[k].ganWuxing]++
      count[pillars[k].zhiWuxing]++
    })

    // 大运
    var yun = ec.getYun(input.gender)
    var daYun = yun.getDaYun().map(function (dy) {
      return {
        startAge: dy.getStartAge(),
        startYear: dy.getStartYear(),
        ganZhi: dy.getGanZhi()
      }
    })

    return {
      solar: solar.toYmdHms(),
      lunar: lunar.toString(),
      gender: input.gender,
      dayMaster: { gan: dmGan, wuxing: GAN_WUXING[dmGan], yinyang: GAN_YINYANG[dmGan] },
      pillars: pillars,
      wuxingCount: count,
      wuxingOrder: WUXING_ORDER,
      yun: {
        startDesc:
          yun.getStartYear() + ' 年 ' + yun.getStartMonth() + ' 个月 ' + yun.getStartDay() + ' 天后起运',
        startSolar: typeof yun.getStartSolar === 'function' ? yun.getStartSolar().toYmd() : '',
        daYun: daYun
      }
    }
  }

  // —— 节日 ——
  // 库自带：农历节日（春节/端午/中秋/七夕…）+ 公历节日（元旦/情人节/母亲节/感恩节/圣诞…含浮动算法）。
  // 自建补充：库未收的美国联邦/民俗节日。kind：cn=中国（朱），west=西方/国际（黛）。
  var CN_SOLAR_FEST = { 元旦节: 1, 妇女节: 1, 植树节: 1, 劳动节: 1, 青年节: 1, 儿童节: 1, 建党节: 1, 建军节: 1, 教师节: 1, 国庆节: 1 }
  // 只展示大众熟知的节日（库里还夹带世界住房日等联合国纪念日，不入素静的历面）
  var FEST_ALLOW = {
    元旦节: 1, 春节: 1, 除夕: 1, 元宵节: 1, 龙头节: 1, 情人节: 1, 妇女节: 1, 植树节: 1, 愚人节: 1,
    劳动节: 1, 青年节: 1, 母亲节: 1, 端午节: 1, 儿童节: 1, 父亲节: 1, 建党节: 1, 建军节: 1,
    七夕节: 1, 中元节: 1, 教师节: 1, 中秋节: 1, 国庆节: 1, 重阳节: 1, 腊八节: 1,
    万圣节前夜: 1, 感恩节: 1, 平安夜: 1, 圣诞节: 1
  }
  var US_FIXED = { '7-4': '美国独立日', '11-11': '退伍军人节' }
  var US_FLOAT = [
    { m: 1, w: 1, nth: 3, name: '马丁路德金日' },
    { m: 2, w: 1, nth: 3, name: '总统日' },
    { m: 5, w: 1, nth: -1, name: '阵亡将士日' },
    { m: 9, w: 1, nth: 1, name: '美国劳工节' }
  ]
  function festivalsOf(solar, lunar) {
    var out = []
    lunar.getFestivals().forEach(function (n) { if (FEST_ALLOW[n]) out.push({ name: n, kind: 'cn' }) })
    solar.getFestivals().forEach(function (n) { if (FEST_ALLOW[n]) out.push({ name: n, kind: CN_SOLAR_FEST[n] ? 'cn' : 'west' }) })
    var m = solar.getMonth(), d = solar.getDay(), w = solar.getWeek()
    var fx = US_FIXED[m + '-' + d]
    if (fx) out.push({ name: fx, kind: 'west' })
    US_FLOAT.forEach(function (r) {
      if (r.m !== m || r.w !== w) return
      if (r.nth === -1) { if (d + 7 > new Date(solar.getYear(), m, 0).getDate()) out.push({ name: r.name, kind: 'west' }) }
      else if (Math.ceil(d / 7) === r.nth) out.push({ name: r.name, kind: 'west' })
    })
    return out
  }

  // —— 取某日（默认今日）的流年/流月/流日 + 万年历基本信息 ——
  // 用当天正午建 EightChar，立春/节气边界与本命盘一致
  function buildDay(date) {
    var d = date ? new Date(date.year, date.month - 1, date.day, 12, 0, 0) : new Date()
    var solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0, 0)
    var lunar = solar.getLunar()
    var ec = lunar.getEightChar()
    return {
      solarYmd: solar.toYmd(),
      year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(),
      weekday: '周' + WEEK[solar.getWeek()],
      lunarStr: lunar.toString(),
      lunarMonthCn: lunar.getMonthInChinese(),
      lunarDayCn: lunar.getDayInChinese(),
      shengXiao: lunar.getYearShengXiao(),
      jieQi: lunar.getJieQi(), // 当天若是节气则返回名称，否则 ''
      liunian: ec.getYear(), liunianGan: ec.getYearGan(), liunianZhi: ec.getYearZhi(),
      liuyue: ec.getMonth(), liuyueGan: ec.getMonthGan(), liuyueZhi: ec.getMonthZhi(),
      liuri: ec.getDay(), liuriGan: ec.getDayGan(), liuriZhi: ec.getDayZhi(),
      dayNaYin: lunar.getDayNaYin(),
      chong: lunar.getDayChongDesc(), // 冲（生肖）
      sha: lunar.getDaySha(), // 煞方
      zhiXing: lunar.getZhiXing(), // 建除十二神
      yi: lunar.getDayYi(), // 宜（数组）
      ji: lunar.getDayJi(), // 忌（数组）
      festivals: festivalsOf(solar, lunar) // 节日 [{name, kind}]
    }
  }

  // —— 某公历月的所有日（供万年历网格）——
  function monthDays(year, month) {
    var dim = new Date(year, month, 0).getDate()
    var out = []
    for (var dd = 1; dd <= dim; dd++) {
      var s = Solar.fromYmd(year, month, dd)
      var lunar = s.getLunar()
      var fs = festivalsOf(s, lunar)
      out.push({
        day: dd,
        week: s.getWeek(),
        solarYmd: s.toYmd(),
        lunarDayCn: lunar.getDayInChinese(),
        lunarMonthCn: lunar.getMonthInChinese(),
        ganZhiDay: lunar.getDayInGanZhi(),
        liuriGan: lunar.getDayGan(),
        liuriZhi: lunar.getDayZhi(),
        jieQi: lunar.getJieQi(),
        fest: fs.length ? fs[0] : null
      })
    }
    return out
  }

  // 找覆盖某公历年的大运
  function currentDaYun(chart, year) {
    var arr = chart.yun.daYun
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i].ganZhi) continue
      var startY = arr[i].startYear
      var endY = i + 1 < arr.length ? arr[i + 1].startYear - 1 : startY + 9
      if (year >= startY && year <= endY) return arr[i]
    }
    return null
  }

  var Engine = {
    buildChart: buildChart,
    buildDay: buildDay,
    monthDays: monthDays,
    festivalsOf: festivalsOf,
    currentDaYun: currentDaYun,
    shiShen: shiShen,
    generates: generates,
    controls: controls,
    SHISHEN_GROUP: SHISHEN_GROUP,
    GAN_WUXING: GAN_WUXING,
    ZHI_WUXING: ZHI_WUXING,
    GAN_YINYANG: GAN_YINYANG,
    ZHI_MAIN: ZHI_MAIN,
    ZHI_CANG: ZHI_CANG
  }

  root.Engine = Engine
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine
})(typeof window !== 'undefined' ? window : globalThis)
