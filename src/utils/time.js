/** 一天毫秒数 */
export const DAY_MS = 24 * 60 * 60 * 1000
/** 一小时毫秒数 */
export const HOUR_MS = 60 * 60 * 1000
/** 一分钟毫秒数 */
export const MINUTE_MS = 60 * 1000

/** 取某时间戳当天的 0 点（本地时区） */
export function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 取某时间戳当天的最后一毫秒 */
export function endOfDay(ts) {
  return startOfDay(ts) + DAY_MS - 1
}

/** 判断两个时间戳是否同一天 */
export function sameDay(a, b) {
  return startOfDay(a) === startOfDay(b)
}

/** 日期偏移 n 天 */
export function addDays(ts, n) {
  return ts + n * DAY_MS
}

/** 格式化日期：2025-01-05 */
export function fmtDate(ts) {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 格式化时间：14:30 */
export function fmtTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 格式化日期时间：01-05 14:30 */
export function fmtDateTime(ts) {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day} ${fmtTime(ts)}`
}

/** 星期中文 */
export function fmtWeekday(ts) {
  return '周' + '日一二三四五六'[new Date(ts).getDay()]
}

/** 解析 "HH:mm" 为当天分钟数（0-1439） */
export function parseHM(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

/** 当天 0 点 + 分钟数 → 时间戳 */
export function tsFromDayMinutes(dayStart, minutes) {
  return dayStart + minutes * MINUTE_MS
}

/** 时间范围字符串：14:30-15:30 */
export function fmtRange(start, end) {
  return `${fmtTime(start)}-${fmtTime(end)}`
}
