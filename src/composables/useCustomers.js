import { ref } from 'vue'
import { db } from '../db'

/**
 * 客户管理组合式函数（模块级单例状态，多组件共享）
 * 字段：姓名 name、性别 gender（男/女）、备注 note、剩余课时 remainingLessons(节)
 */

const customers = ref([])
const loading = ref(false)

export function useCustomers() {
  /** 从 IndexedDB 加载全部客户（按姓名排序） */
  async function refresh() {
    loading.value = true
    try {
      customers.value = await db.customers.orderBy('name').toArray()
    } finally {
      loading.value = false
    }
  }

  /** 根据 id 获取客户对象 */
  function getById(id) {
    return customers.value.find((c) => c.id === id) || null
  }

  /** 新增客户 */
  async function addCustomer(data) {
    const id = await db.customers.add({
      ...data,
      gender: data.gender || '',
      remainingLessons: Number(data.remainingLessons) || 0,
      createdAt: Date.now()
    })
    await refresh()
    return id
  }

  /** 编辑客户 */
  async function updateCustomer(id, data) {
    await db.customers.update(id, {
      ...data,
      remainingLessons: Number(data.remainingLessons) || 0
    })
    await refresh()
  }

  /**
   * 删除客户（级联删除其全部排课记录，弹窗中已做风险提示）
   */
  async function deleteCustomer(id) {
    await db.transaction('rw', db.customers, db.sessions, async () => {
      await db.sessions.where('customerId').equals(id).delete()
      await db.customers.delete(id)
    })
    await refresh()
  }

  return { customers, loading, refresh, getById, addCustomer, updateCustomer, deleteCustomer }
}
