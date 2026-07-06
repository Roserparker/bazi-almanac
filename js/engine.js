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
      ji: lunar.getDayJi() // 忌（数组）
    }
  }

  // —— 某公历月的所有日（供万年历网格）——
  function monthDays(year, month) {
    var dim = new Date(year, month, 0).getDate()
    var out = []
    for (var dd = 1; dd <= dim; dd++) {
      var s = Solar.fromYmd(year, month, dd)
      var lunar = s.getLunar()
      out.push({
        day: dd,
        week: s.getWeek(),
        solarYmd: s.toYmd(),
        lunarDayCn: lunar.getDayInChinese(),
        lunarMonthCn: lunar.getMonthInChinese(),
        ganZhiDay: lunar.getDayInGanZhi(),
        liuriGan: lunar.getDayGan(),
        liuriZhi: lunar.getDayZhi(),
        jieQi: lunar.getJieQi()
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
    currentDaYun: currentDaYun,
    shiShen: shiShen,
    generates: generates,
    controls: controls,
    SHISHEN_GROUP: SHISHEN_GROUP,
    GAN_WUXING: GAN_WUXING,
    ZHI_WUXING: ZHI_WUXING,
    GAN_YINYANG: GAN_YINYANG,
    ZHI_MAIN: ZHI_MAIN
  }

  root.Engine = Engine
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine
})(typeof window !== 'undefined' ? window : globalThis)
