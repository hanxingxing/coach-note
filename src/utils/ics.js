import { fmtDate, fmtTime } from './time'

/**
 * ICS（iCalendar）文件生成与下载工具
 * 用于把排课导出为 .ics 文件，可直接导入 iPhone 系统日历作为兜底提醒
 */

/** 转义 ICS 特殊字符 */
function esc(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * 格式化为 ICS 本地时间（不带 Z，浮动时区，导入后按本机时区显示）
 * 输出形如 20250105T143000
 */
function fmtICS(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 格式化为 ICS UTC 时间（DTSTAMP 必须用 UTC） */
function fmtICSZ(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

/**
 * 把单条排课转换为 VEVENT 文本
 * @param {object} session 排课对象
 * @param {object} customer 关联客户对象
 */
export function sessionToVevent(session, customer) {
  const statusMap = { pending: 'CONFIRMED', completed: 'CONFIRMED' }
  const summary = `[课记] ${customer ? customer.name : '未知客户'}`
  const description = [
    `客户：${customer ? customer.name : ''}`,
    `备注：${session.note || ''}`,
    `状态：${({ pending: '待上课', completed: '已完成' })[session.status] || ''}`
  ]
    .filter((l) => !/：$/.test(l))
    .join('\\n')

  return [
    'BEGIN:VEVENT',
    `UID:coachnote-${session.id || Date.now()}@coachnote`,
    `DTSTAMP:${fmtICSZ(Date.now())}`,
    `DTSTART:${fmtICS(session.start)}`,
    `DTEND:${fmtICS(session.end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `STATUS:${statusMap[session.status] || 'CONFIRMED'}`,
    'END:VEVENT'
  ].join('\r\n')
}

/**
 * 由事件列表生成完整 ICS 文件内容
 * @param {string[]} vevents VEVENT 文本数组
 */
export function buildIcs(vevents) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CoachNote//课记//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n') + '\r\n'
}

/**
 * 触发浏览器下载 .ics 文件
 * @param {string} filename 文件名
 * @param {string} content 文件内容
 */
export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 文件名中的时间戳，如 20250105-1430 */
export function icsFileStamp(ts) {
  return `${fmtDate(ts).replace(/-/g, '')}-${fmtTime(ts).replace(':', '')}`
}
