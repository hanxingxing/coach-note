import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useCustomers } from './useCustomers'
import { useSessions } from './useSessions'
import { copyText } from '../utils/clipboard'

/**
 * 上课 / 快捷下课 共享操作（日视图与首页今日排课列表共用，行为完全一致）
 * - 上课：自定义庆祝弹窗「开始上课啦，加油章章」+ 复制「已到店」文本（不改数据）
 * - 下课：扣减课时（事务）+ 自定义庆祝弹窗「辛苦了章章」+ 复制「已下课」文本（使用扣减后最新课时）
 * 庆祝特效为两套相互独立的实例（表情素材、弹出时长一致，文案与表情集区分），
 * 不使用 Element Plus toast，由 CelebrationLayer 组件渲染。
 */

/** 上课表情集 */
const START_EMOJIS = ['💪', '🔥', '⚡', '🌟', '✨', '🎉', '🚀', '🎯']
/** 下课表情集 */
const COMPLETE_EMOJIS = ['🎉', '💪', '✨', '🌟', '🎊', '🔥', '❤️', '🏆']

// 上课庆祝（独立实例）
const startCelebration = ref(false)
const startConfetti = ref([])
let startTimer = null
// 下课庆祝（独立实例）
const completeCelebration = ref(false)
const completeConfetti = ref([])
let completeTimer = null

/** 生成上课/下课复制文本模板（严格保留换行格式） */
export function buildClassTemplate(state, name, remaining) {
  return [
    `正式课 ${state}`,
    '门店：锦业路店',
    `会员：${name}`,
    `课节：剩余 ${remaining}（菲力德)`
  ].join('\n') + '\n'
}

/** 生成表情粒子：以屏幕中心为原点向四周径向扩散（方向随机，距离/时长错落） */
function spawnConfetti(emojis) {
  return Array.from({ length: 18 }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist = 10 + Math.random() * 24 // 扩散半径（vw/vh）
    return {
      id: Math.random(),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      // 径向位移：横向用 vw、纵向用 vh，保证不同屏幕比例下扩散均匀
      dx: `${(Math.cos(angle) * dist).toFixed(1)}vw`,
      dy: `${(Math.sin(angle) * dist).toFixed(1)}vh`,
      rot: Math.round((Math.random() - 0.5) * 200), // 旋转角度
      delay: Math.random() * 0.12,
      duration: (1.1 + Math.random() * 0.5).toFixed(2), // 上浮时长错落
      size: 20 + Math.round(Math.random() * 20)
    }
  })
}

/** 触发上课庆祝（独立实例，防止连续点击叠加） */
function celebrateStart() {
  if (startCelebration.value) return
  startConfetti.value = spawnConfetti(START_EMOJIS)
  startCelebration.value = true
  clearTimeout(startTimer)
  startTimer = setTimeout(() => {
    startCelebration.value = false
    startConfetti.value = []
  }, 1800)
}

/** 触发下课庆祝（独立实例，防止连续点击叠加） */
function celebrateComplete() {
  if (completeCelebration.value) return
  completeConfetti.value = spawnConfetti(COMPLETE_EMOJIS)
  completeCelebration.value = true
  clearTimeout(completeTimer)
  completeTimer = setTimeout(() => {
    completeCelebration.value = false
    completeConfetti.value = []
  }, 1800)
}

export function useClassActions() {
  const { getById: getCustomer } = useCustomers()
  const { completeSession } = useSessions()

  /** 上课：庆祝弹窗 + 复制「已到店」文本（不改动任何数据） */
  async function onQuickStart(s) {
    const customer = getCustomer(s.customerId)
    const name = customer ? customer.name : '未知客户'
    const remaining = customer ? customer.remainingLessons : 0
    celebrateStart()
    const ok = await copyText(buildClassTemplate('已到店', name, remaining))
    if (!ok) ElMessage.warning('剪贴板复制失败，请手动复制到店通知')
  }

  /** 快捷下课：扣减课时 + 庆祝弹窗 + 复制「已下课」文本（使用扣减后最新课时） */
  async function onQuickComplete(s) {
    const result = await completeSession(s.id)
    if (result.ok) {
      celebrateComplete()
      // 扣减后客户数据已刷新，取最新剩余课时
      const customer = getCustomer(s.customerId)
      const name = customer ? customer.name : '未知客户'
      const remaining = customer ? customer.remainingLessons : 0
      const ok = await copyText(buildClassTemplate('已下课', name, remaining))
      if (!ok) ElMessage.warning('剪贴板复制失败，请手动复制下课通知')
    } else {
      ElMessage.warning(result.error)
    }
  }

  return {
    startCelebration,
    startConfetti,
    completeCelebration,
    completeConfetti,
    onQuickStart,
    onQuickComplete
  }
}
