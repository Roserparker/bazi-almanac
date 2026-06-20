/*
 * srs.js · 间隔重复引擎（忠于 Anki 的 SM-2 记忆曲线）
 * 评分四档：again / hard / good / easy（对应 Anki 重来 / 困难 / 良好 / 简单）。
 * 每张卡的进度（ease、间隔、到期、复习次数）存 localStorage，全程本地、不联网。
 * 现代 Anki 默认 FSRS；此处实现经典 SM-2（轻量、无依赖、够用且可解释）。
 */
;(function (root) {
  'use strict'
  var KEY = 'huaji.srs'
  var DAY = 86400000

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} } }
  function saveAll(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) {} }
  function get(id) {
    var s = load()
    return s[id] || { ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0, seen: false }
  }
  function put(id, c) { var s = load(); s[id] = c; saveAll(s) }

  // 计算某评分会给出的间隔（天），不落库——用于按钮上的预测
  function preview(id, grade) {
    var c = get(id)
    if (grade === 'again') return 0
    var ef = c.ef
    if (grade === 'hard') ef = Math.max(1.3, ef - 0.15)
    else if (grade === 'easy') ef = Math.min(3.2, ef + 0.15)
    if (c.reps === 0) return grade === 'easy' ? 4 : 1
    if (c.reps === 1) return grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6
    if (grade === 'hard') return Math.max(1, Math.round(c.interval * 1.2))
    if (grade === 'easy') return Math.max(1, Math.round(c.interval * ef * 1.3))
    return Math.max(1, Math.round(c.interval * ef))
  }

  function rate(id, grade) {
    var c = get(id), now = Date.now()
    c.seen = true
    if (grade === 'again') {
      c.reps = 0; c.lapses++; c.ef = Math.max(1.3, c.ef - 0.2); c.interval = 0; c.due = now
      put(id, c); return c
    }
    if (grade === 'hard') c.ef = Math.max(1.3, c.ef - 0.15)
    else if (grade === 'easy') c.ef = Math.min(3.2, c.ef + 0.15)
    var I
    if (c.reps === 0) I = grade === 'easy' ? 4 : 1
    else if (c.reps === 1) I = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6
    else if (grade === 'hard') I = Math.round(c.interval * 1.2)
    else if (grade === 'easy') I = Math.round(c.interval * c.ef * 1.3)
    else I = Math.round(c.interval * c.ef)
    I = Math.max(1, I)
    c.interval = I; c.reps++; c.due = now + I * DAY
    put(id, c); return c
  }

  // 给定卡牌全集，分出「到期复习」与「未学新卡」
  function queue(allCards) {
    var s = load(), now = Date.now(), due = [], fresh = []
    allCards.forEach(function (card) {
      var c = s[card.id]
      if (!c || !c.seen) fresh.push(card)
      else if (c.due <= now) due.push(card)
    })
    // 到期的按到期时间升序
    due.sort(function (a, b) { return (s[a.id].due || 0) - (s[b.id].due || 0) })
    return { due: due, fresh: fresh }
  }

  function stats(allCards) {
    var s = load(), now = Date.now(), learned = 0, dueN = 0, freshN = 0, young = 0, mature = 0
    allCards.forEach(function (card) {
      var c = s[card.id]
      if (!c || !c.seen) { freshN++; return }
      learned++
      if (c.due <= now) dueN++
      if (c.interval >= 21) mature++; else young++
    })
    return { total: allCards.length, learned: learned, due: dueN, fresh: freshN, young: young, mature: mature }
  }

  function fmtDays(d) {
    if (d <= 0) return '<10 分钟'
    if (d === 1) return '1 天'
    if (d < 30) return d + ' 天'
    if (d < 365) return Math.round(d / 30) + ' 个月'
    return (d / 365).toFixed(1) + ' 年'
  }

  function reset() { saveAll({}) }

  root.SRS = { rate: rate, preview: preview, queue: queue, stats: stats, fmtDays: fmtDays, get: get, reset: reset }
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SRS
})(typeof window !== 'undefined' ? window : globalThis)
