// 引擎冒烟测试：验证 lunar-javascript 能正确排八字 / 大运 / 流日。
// 运行：npm run smoke
import * as LunarLib from 'lunar-javascript'

const Lib = LunarLib.default ?? LunarLib
const { Solar } = Lib

function dumpChart(label, y, m, d, hh, mm, gender) {
  const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()

  console.log(`\n=== ${label} ===`)
  console.log('公历:', solar.toYmdHms())
  console.log('农历:', lunar.toString())
  console.log('八字:', ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime())
  console.log('日主(日元):', ec.getDayGan())
  console.log(
    '十神(年/月/时干):',
    ec.getYearShiShenGan(),
    ec.getMonthShiShenGan(),
    ec.getTimeShiShenGan()
  )
  console.log('月支藏干:', ec.getMonthHideGan().join(' '))
  console.log(
    '纳音:',
    ec.getYearNaYin(),
    ec.getMonthNaYin(),
    ec.getDayNaYin(),
    ec.getTimeNaYin()
  )

  // 大运（gender: 1=男, 0=女）
  const yun = ec.getYun(gender)
  const startDesc =
    yun.getStartYear() + '年' + yun.getStartMonth() + '个月' + yun.getStartDay() + '天后起运'
  const startSolar =
    typeof yun.getStartSolar === 'function' ? '，起运公历约 ' + yun.getStartSolar().toYmd() : ''
  console.log('起运:', startDesc + startSolar)
  const daYun = yun.getDaYun()
  const head = daYun
    .slice(0, 8)
    .map((dy) => `${dy.getStartAge()}岁(${dy.getStartYear()}):${dy.getGanZhi() || '——'}`)
  console.log('大运:', head.join('  '))
  return ec
}

function dumpDay(label, y, m, d) {
  const solar = Solar.fromYmd(y, m, d)
  const lunar = solar.getLunar()
  console.log(`\n=== ${label} ===`)
  console.log('公历:', solar.toYmd(), '  农历:', lunar.toString())
  console.log(
    '流年:',
    lunar.getYearInGanZhi(),
    ' 流月:',
    lunar.getMonthInGanZhi(),
    ' 流日:',
    lunar.getDayInGanZhi()
  )
}

try {
  dumpChart('示例命主 1990-06-15 14:30 男', 1990, 6, 15, 14, 30, 1)
  dumpDay('今日流日 2026-06-16', 2026, 6, 16)
  console.log('\nSMOKE OK')
} catch (e) {
  console.error('\nSMOKE FAILED:', (e && e.stack) || e)
  process.exit(1)
}
