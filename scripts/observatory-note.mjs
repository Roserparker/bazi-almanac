// 观象手记工具：给云端 routine 用的「取景 + 落笔」两步 CLI。
//   node scripts/observatory-note.mjs context [YYYY-MM-DD]   → 打印当日观象全景 JSON（写评语的素材）
//   node scripts/observatory-note.mjs write <YYYY-MM-DD> <文本文件>  → 把评语并入 data/observatory-notes.json（按日期去重、降序、保留 30 条）
//   node scripts/observatory-note.mjs check                  → 校验 notes 文件结构
// 评语风格约束见 routines/观象手记.md。数据只来自本站引擎（不编造行情）。
import LunarLib from 'lunar-javascript'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const L = LunarLib.default ?? LunarLib
Object.assign(globalThis, L)
globalThis.window = globalThis

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const f of ['engine', 'interpret', 'analyze', 'ziwei', 'liuyao', 'qimen', 'daily', 'btc']) require(resolve(root, 'js/' + f + '.js'))
const { Engine, Liuyao, Qimen, BTC } = globalThis

const NOTES_PATH = resolve(root, 'data/observatory-notes.json')

function todayYmd() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return { year: y, month: m, day: d }
}
function loadNotes() {
  if (!existsSync(NOTES_PATH)) return { notes: [] }
  return JSON.parse(readFileSync(NOTES_PATH, 'utf8'))
}

const cmd = process.argv[2]

if (cmd === 'context') {
  const ymd = process.argv[3] || todayYmd()
  const date = parseYmd(ymd)
  const day = Engine.buildDay(date)
  const ix = BTC.indexOf(day)
  const wk = BTC.weekSeries(date)
  const ly = Liuyao.dailyGua(day, 'BTC')
  const qm = Qimen.build(date)
  const rels = BTC.relationsOf(day).map((r) => r.type + ':' + r.chars.join(''))
  const bandT = ix.score >= 58 ? '偏扬' : ix.score <= 43 ? '偏抑' : '震荡'
  console.log(JSON.stringify({
    date: ymd, ganzhi: { nian: day.liunian, yue: day.liuyue, ri: day.liuri },
    index: { score: ix.score, band: ix.band, tendency: bandT, parts: ix.parts },
    relations: rels,
    week: wk.map((s) => ({ d: s.weekday, gz: s.gz, score: s.score, band: s.band })),
    weekComment: BTC.weekComment(wk),
    liuyao: {
      ben: ly.ben.hex.info.n, bian: ly.bian.hex.info.n, gong: ly.ben.gong + '宫' + ly.ben.kind,
      moving: ly.moving, ci: ly.ben.hex.info.ci, su: ly.ben.hex.info.su,
      tendency: ly.judge.tendency, score: ly.judge.score, reasons: ly.judge.reasons
    },
    qimen: {
      ju: qm.jieQi + qm.yuan + qm.juName, zhiFu: qm.zhiFu.star, zhiShi: qm.zhiShi.door,
      tendency: qm.reading.tendency, bullets: qm.reading.bullets
    },
    heji: { bazi: bandT, liuyao: ly.judge.tendency, qimen: qm.reading.tendency }
  }, null, 2))
} else if (cmd === 'write') {
  const ymd = process.argv[3]
  const file = process.argv[4]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '') || !file) {
    console.error('用法: node scripts/observatory-note.mjs write <YYYY-MM-DD> <文本文件>')
    process.exit(1)
  }
  const text = readFileSync(resolve(file), 'utf8').trim()
  if (text.length < 30 || text.length > 400) { console.error('评语长度应在 30–400 字之间，实得 ' + text.length); process.exit(1) }
  const data = loadNotes()
  data.notes = (data.notes || []).filter((n) => n.date !== ymd)
  data.notes.push({ date: ymd, text })
  data.notes.sort((a, b) => (a.date < b.date ? 1 : -1))
  data.notes = data.notes.slice(0, 30)
  writeFileSync(NOTES_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log('已写入 ' + ymd + ' 手记（现存 ' + data.notes.length + ' 条）→ data/observatory-notes.json')
} else if (cmd === 'check') {
  const data = loadNotes()
  const ok = Array.isArray(data.notes) && data.notes.every((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date) && typeof n.text === 'string' && n.text.length >= 30)
  const sorted = data.notes.every((n, i) => i === 0 || data.notes[i - 1].date > n.date)
  if (!ok || !sorted) { console.error('NOTES INVALID'); process.exit(1) }
  console.log('NOTES OK (' + data.notes.length + ' 条, 最新 ' + (data.notes[0] ? data.notes[0].date : '—') + ')')
} else {
  console.error('用法: context [日期] | write <日期> <文本文件> | check')
  process.exit(1)
}
