import Dexie from 'dexie'

/**
 * dexie.js 数据库定义（IndexedDB 封装，纯本地存储）
 *
 * 表结构：
 * - customers: 客户
 *   id: 自增主键, name: 姓名, phone: 联系电话, gender: 性别（男/女，可空）,
 *   note: 备注, remainingLessons: 剩余课时（节）, createdAt: 创建时间戳
 * - sessions: 排课
 *   id: 自增主键, customerId: 关联客户 id, start: 开始时间戳(ms),
 *   end: 结束时间戳(ms), note: 上课小结备注,
 *   status: 状态 pending待上课/completed已完成, createdAt: 创建时间戳
 *   （「取消」状态已彻底移除，上课时间固定限定 09:00-22:00，由前端表单与校验保证）
 * - settings: 键值设置
 *   key: 设置名, value: 设置值
 */
export const db = new Dexie('coachnote')

db.version(1).stores({
  customers: '++id, name',
  sessions: '++id, customerId, start, status',
  settings: 'key'
})

/** 历史数据保留时长：一个标准自然月（1 个月前之前的数据删除，一个月内全部保留） */
export const KEEP_MONTHS = 1

/**
 * 数据清理（每次打开工具时调用）：
 * 1. 删除一个标准自然月之前的历史排课数据（按自然月推算，如 3月15日 → 删除 2月15日之前）
 * 2. 彻底移除「取消」状态：一并清理历史遗留的 cancelled 排课记录
 * 客户为主数据，不删除。
 * @returns {Promise<number>} 被删除的排课数量
 */
export async function cleanupOldData() {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - KEEP_MONTHS, now.getDate()).getTime()
  const deletedOld = await db.sessions.where('start').below(cutoff).delete()
  const deletedCancelled = await db.sessions.where('status').equals('cancelled').delete()
  return deletedOld + deletedCancelled
}
