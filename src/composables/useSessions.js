import { ref } from 'vue'
import { db } from '../db'
import { useCustomers } from './useCustomers'

/**
 * 排课管理组合式函数
 * 字段：customerId 关联客户、start/end 上课时间（限定 09:00-22:00）、
 *      note 上课小结备注、status 状态（pending待上课/completed已完成）
 *
 * 业务规则：
 * 1. 同一客户同一时间段不可重复排课（时间重叠校验）
 * 2. 状态改为「已完成」时自动扣减客户 1 节剩余课时；剩余课时为 0 时禁止扣减
 * 3. 从「已完成」改回其他状态时自动回补 1 节（数据一致性）
 * 4. 快捷下课（日视图按钮）直接完成排课并扣减课时，无需打开详情弹窗
 */

const sessions = ref([])
const loading = ref(false)

export function useSessions() {
  const { customers, refresh: refreshCustomers, getById: getCustomer } = useCustomers()

  /** 从 IndexedDB 加载全部排课（按开始时间升序） */
  async function refresh() {
    loading.value = true
    try {
      sessions.value = await db.sessions.orderBy('start').toArray()
    } finally {
      loading.value = false
    }
  }

  /**
   * 查找同一客户的冲突排课（时间重叠）
   * @param {number} customerId 客户 id
   * @param {number} start 开始时间戳
   * @param {number} end 结束时间戳
   * @param {number} [excludeId] 排除的排课 id（编辑时排除自身）
   * @returns {Array} 冲突排课列表
   */
  function findConflicts(customerId, start, end, excludeId) {
    return sessions.value.filter(
      (s) => s.customerId === customerId && s.id !== excludeId && start < s.end && end > s.start
    )
  }

  /**
   * 保存排课（新增或编辑）
   * @param {object} data { customerId, start, end, note, status }
   * @param {number} [existingId] 编辑时传入原排课 id，新增不传
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function saveSession(data, existingId) {
    const customer = getCustomer(data.customerId)
    if (!customer) return { ok: false, error: '请选择客户' }

    // 时间校验：同一客户同一时间段不可重复创建
    const conflicts = findConflicts(data.customerId, data.start, data.end, existingId)
    if (conflicts.length > 0) {
      return { ok: false, error: '该客户在此时段已有排课，请更换时间' }
    }

    const oldStatus = existingId
      ? sessions.value.find((s) => s.id === existingId)?.status
      : null
    const nowCompleted = data.status === 'completed'
    const wasCompleted = oldStatus === 'completed'

    // 课时扣减/回补逻辑（在事务中原子执行）
    if (nowCompleted && !wasCompleted) {
      // 边界校验：剩余课时不能小于 0，课时为 0 时禁止继续扣减
      if (customer.remainingLessons <= 0) {
        return { ok: false, error: `客户「${customer.name}」剩余课时为 0，无法标记为已完成` }
      }
    }

    await db.transaction('rw', db.customers, db.sessions, async () => {
      if (nowCompleted && !wasCompleted) {
        // 标记已完成 → 扣减 1 节
        await db.customers.update(customer.id, {
          remainingLessons: customer.remainingLessons - 1
        })
      } else if (!nowCompleted && wasCompleted) {
        // 从已完成改回 → 回补 1 节
        await db.customers.update(customer.id, {
          remainingLessons: customer.remainingLessons + 1
        })
      }

      const payload = {
        customerId: data.customerId,
        start: data.start,
        end: data.end,
        note: data.note || '',
        status: data.status
      }

      if (existingId) {
        await db.sessions.update(existingId, payload)
      } else {
        await db.sessions.add({ ...payload, createdAt: Date.now() })
      }
    })

    // 刷新排课与客户（课时可能已变化）
    await Promise.all([refresh(), refreshCustomers()])
    return { ok: true }
  }

  /** 删除排课 */
  async function deleteSession(id) {
    await db.sessions.delete(id)
    await refresh()
  }

  /**
   * 快捷下课：直接把排课标记为「已完成」并自动扣减客户 1 节剩余课时
   * （日视图快捷按钮调用，无需打开详情弹窗）
   * @param {number} id 排课 id
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function completeSession(id) {
    const s = sessions.value.find((x) => x.id === id)
    if (!s) return { ok: false, error: '排课不存在' }
    if (s.status === 'completed') return { ok: false, error: '该排课已完成，无需重复操作' }

    const customer = getCustomer(s.customerId)
    if (!customer) return { ok: false, error: '关联客户不存在' }
    // 边界校验：剩余课时不能小于 0，课时为 0 时禁止扣减
    if (customer.remainingLessons <= 0) {
      return { ok: false, error: `客户「${customer.name}」剩余课时为 0，无法标记为已完成` }
    }

    await db.transaction('rw', db.customers, db.sessions, async () => {
      await db.customers.update(customer.id, {
        remainingLessons: customer.remainingLessons - 1
      })
      await db.sessions.update(id, { status: 'completed' })
    })
    await Promise.all([refresh(), refreshCustomers()])
    return { ok: true }
  }

  return { sessions, loading, refresh, findConflicts, saveSession, completeSession, deleteSession }
}
