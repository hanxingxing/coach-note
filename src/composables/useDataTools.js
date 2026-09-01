import { db } from '../db'
import { fmtDate } from '../utils/time'

/**
 * 数据工具组合式函数：一键导出 / 一键导入 JSON、清空数据
 * 数据完全保存在浏览器本地，导出文件即为全部备份。
 */

/** 生成备份文件名，如 coachnote-backup-20250105.json */
function backupFilename() {
  return `coachnote-backup-${fmtDate(Date.now()).replace(/-/g, '')}.json`
}

export function useDataTools() {
  /**
   * 导出全部数据为 JSON 并触发下载
   * @returns {Promise<number>} 导出记录总数
   */
  async function exportData() {
    const [customers, sessions, settings] = await Promise.all([
      db.customers.toArray(),
      db.sessions.toArray(),
      db.settings.toArray()
    ])
    const payload = {
      app: '课记CoachNote',
      version: 1,
      exportedAt: new Date().toISOString(),
      customers,
      sessions,
      settings
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return customers.length + sessions.length
  }

  /**
   * 从 JSON 文件恢复数据（覆盖式导入）
   * @param {File} file 用户选择的 JSON 文件
   * @returns {Promise<{ok:boolean, customers:number, sessions:number, error?:string}>}
   */
  async function importData(file) {
    const text = await file.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, customers: 0, sessions: 0, error: '文件不是有效的 JSON' }
    }
    if (!data || !Array.isArray(data.customers) || !Array.isArray(data.sessions)) {
      return { ok: false, customers: 0, sessions: 0, error: '文件缺少 customers / sessions 数据' }
    }

    // 数据清洗：只保留合法字段，避免脏数据（「取消」状态已移除，导入时跳过 cancelled 记录）
    const cleanCustomers = data.customers
      .filter((c) => c && typeof c.name === 'string')
      .map((c) => ({
        name: c.name,
        phone: c.phone || '',
        gender: c.gender || '',
        note: c.note || '',
        remainingLessons: Number(c.remainingLessons) || 0,
        createdAt: Number(c.createdAt) || Date.now()
      }))
    const cleanSessions = data.sessions
      .filter(
        (s) =>
          s &&
          s.customerId != null &&
          typeof s.start === 'number' &&
          s.status !== 'cancelled' // 已取消的排课不再导入
      )
      .map((s) => ({
        customerId: s.customerId,
        start: Number(s.start),
        end: Number(s.end) || Number(s.start) + 3600000,
        note: s.note || '',
        status: ['pending', 'completed'].includes(s.status) ? s.status : 'pending',
        createdAt: Number(s.createdAt) || Date.now()
      }))

    // 覆盖式导入（清空旧数据后写入）
    await db.transaction('rw', db.customers, db.sessions, db.settings, async () => {
      await db.customers.clear()
      await db.sessions.clear()
      await db.settings.clear()
      if (cleanCustomers.length) await db.customers.bulkAdd(cleanCustomers)
      if (cleanSessions.length) await db.sessions.bulkAdd(cleanSessions)
      if (Array.isArray(data.settings)) {
        const cleanSettings = data.settings.filter((s) => s && s.key)
        if (cleanSettings.length) await db.settings.bulkAdd(cleanSettings)
      }
    })

    return { ok: true, customers: cleanCustomers.length, sessions: cleanSessions.length }
  }

  /** 清空全部数据（危险操作，需二次确认） */
  async function clearAll() {
    await db.transaction('rw', db.customers, db.sessions, db.settings, async () => {
      await db.customers.clear()
      await db.sessions.clear()
      await db.settings.clear()
    })
  }

  return { exportData, importData, clearAll }
}
