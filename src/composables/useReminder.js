import { fmtTime, fmtWeekday } from '../utils/time'

/**
 * 课前提醒调度器
 *
 * 原理：应用打开期间每分钟检查一次，对「待上课」且开始时间在
 * 提醒窗口内的排课发送浏览器通知（按 排课id+提前量 去重，避免重复提醒）。
 *
 * 提醒时间固定：提前 10 分钟、提前 5 分钟各提醒一次，用户只需开关即可。
 *
 * 局限说明（iPhone）：后台无法定时执行，通知在应用打开/前台时触发；
 * 如需可靠兜底，请使用「导出 ICS → 导入 iPhone 系统日历」。
 */

const STORAGE_KEY = 'coachnote-notified-sessions'

/** 固定提醒提前量（分钟）：提前 10 分钟、提前 5 分钟 */
const LEADS = [10, 5]

/** 读取已提醒记录 [{key, ts}] */
function loadNotified() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/** 记录已提醒，并清理 24 小时前的记录 */
function markNotified(key) {
  const list = loadNotified().filter((n) => Date.now() - n.ts < 24 * 3600 * 1000)
  list.push({ key, ts: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function isNotified(key) {
  return loadNotified().some((n) => n.key === key)
}

/**
 * 启动/停止提醒调度
 * @param {object} params
 * @param {import('vue').Ref} params.sessions 排课列表
 * @param {import('vue').Ref} params.settings 设置（reminderEnabled）
 * @param {import('vue').Ref} params.permission 通知权限
 * @param {Function} params.getCustomer 根据 id 获取客户
 * @param {Function} params.notify 发送通知
 */
export function useReminder({ sessions, settings, permission, getCustomer, notify }) {
  let timer = null

  /** 检查一次是否有需要提醒的排课 */
  function check() {
    if (permission.value !== 'granted' || !settings.value.reminderEnabled) return
    const now = Date.now()
    const pending = sessions.value.filter((s) => s.status === 'pending')

    for (const s of pending) {
      const gap = s.start - now
      if (gap <= 0) continue
      for (const lead of LEADS) {
        if (gap > lead * 60 * 1000) continue
        const key = `${s.id}-${lead}`
        if (isNotified(key)) continue
        const customer = getCustomer(s.customerId)
        notify(`课程提醒 · ${customer ? customer.name : '未知客户'}`, {
          body: `${fmtWeekday(s.start)} ${fmtTime(s.start)}，还有 ${Math.max(1, Math.ceil(gap / 60000))} 分钟开始`,
          tag: `coachnote-${key}`,
          data: { sessionId: s.id }
        })
        markNotified(key)
      }
    }
  }

  function start() {
    stop()
    check()
    timer = setInterval(check, 60 * 1000)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { check, start, stop }
}
