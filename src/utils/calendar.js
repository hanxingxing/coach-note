/**
 * 日历相关纯函数（本地时区）
 * 月视图 MonthCalendar 与日期选择抽屉共用「周日开头」的排布约定
 */

/** 某时间戳所在月的 1 日 0 点 */
export function startOfMonth(ts) {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/**
 * 生成某月的日历格子（周日开头），前后用空白天补齐整周
 * @param {number} ts 该月任意一天的时间戳
 * @param {number} [minRows=0] 最少行数；日期选择面板传 6，可保证切月时面板高度不变
 * @returns {Array<{ day: number|null, ts: number|null }>} 每项为一天或空白格
 */
export function monthCells(ts, minRows = 0) {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = d.getMonth()
  // 0 = 周日，与 MonthCalendar 的 WEEK 顺序一致
  const leading = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const rows = Math.max(Math.ceil((leading + days) / 7), minRows)
  const total = rows * 7
  const cells = []
  for (let i = 0; i < total; i++) {
    const day = i - leading + 1
    if (day < 1 || day > days) {
      cells.push({ day: null, ts: null })
    } else {
      // 本地 0 点，与 utils/time 的 startOfDay 一致
      cells.push({ day, ts: new Date(year, month, day).getTime() })
    }
  }
  return cells
}
