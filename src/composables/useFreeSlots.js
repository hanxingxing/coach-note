import { ref, computed } from 'vue'
import { startOfDay, addDays, DAY_MS, MINUTE_MS, fmtDate } from '../utils/time'

/**
 * 空闲时段检索组合式函数
 *
 * 思路：
 * 1. 用户选择查询日期范围；上课时间固定为每日 09:00 - 22:00，单节默认 60 分钟
 * 2. 以 30 分钟为步长枚举候选时间片，剔除与「未取消」排课重叠的时间片
 * 3. 仅提供检索建议，不会自动生成排课，由人工点击后确认保存
 */

/** 上课时间范围（与排课弹窗、日视图保持一致，不允许超出） */
export const WORK_START_HOUR = 9
export const WORK_END_HOUR = 22
/** 单节默认时长（分钟） */
export const SLOT_DURATION_MIN = 60

const loading = ref(false)
/** 查询日期范围 [开始日0点, 结束日0点] */
const range = ref([startOfDay(Date.now()), startOfDay(addDays(Date.now(), 6))])
/** 空闲时间片数组 [{ start, end }] */
const slots = ref([])
/** 最近一次查询的说明信息 */
const lastQueryInfo = ref('')

/** 按天分组后的空闲时段（用于展示） */
const groupedSlots = computed(() => {
  const map = new Map()
  for (const s of slots.value) {
    const key = fmtDate(s.start)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return Array.from(map.entries()).map(([date, list]) => ({ date, list }))
})

/**
 * 计算指定日期范围内的空闲时间片（固定工作时段 09:00-22:00，每节 60 分钟）
 * @param {number} rangeStart 范围开始（当天0点）
 * @param {number} rangeEnd 范围结束（当天23:59:59.999）
 * @param {Array} sessions 全部排课（未取消的视为占用）
 * @returns {Array<{start:number,end:number}>}
 */
export function computeFreeSlots(rangeStart, rangeEnd, sessions) {
  const now = Date.now()
  // 未取消的排课占用时间
  const occupied = sessions.filter((s) => s.status !== 'cancelled')
  const step = 30 * MINUTE_MS
  const duration = SLOT_DURATION_MIN * MINUTE_MS
  const result = []

  for (let day = startOfDay(rangeStart); day <= rangeEnd; day += DAY_MS) {
    const dayStart = day + WORK_START_HOUR * 60 * MINUTE_MS
    const dayEnd = day + WORK_END_HOUR * 60 * MINUTE_MS

    for (let t = dayStart; t + duration <= dayEnd; t += step) {
      const end = t + duration
      // 已过去的时间片不推荐
      if (end <= now) continue
      // 与任意未取消排课重叠则跳过
      const overlapped = occupied.some((o) => t < o.end && end > o.start)
      if (!overlapped) result.push({ start: t, end })
    }
  }
  return result
}

export function useFreeSlots() {
  /** 执行查询 */
  function query({ sessions }) {
    loading.value = true
    // 延迟一帧，保证 loading 状态渲染
    setTimeout(() => {
      const [rs, re] = range.value
      slots.value = computeFreeSlots(rs, re + DAY_MS - 1, sessions)
      const days = Math.round((re - rs) / DAY_MS) + 1
      lastQueryInfo.value = `已检索 ${days} 天（09:00-22:00，每节 ${SLOT_DURATION_MIN} 分钟），共找到 ${slots.value.length} 个空闲时段`
      loading.value = false
    }, 0)
  }

  return { loading, range, slots, groupedSlots, lastQueryInfo, query }
}
