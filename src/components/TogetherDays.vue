<template>
  <!-- 展示「在一起 XX 天」；点击徽标触发全屏桃心雨彩蛋 -->
  <div
    class="together-days"
    role="button"
    tabindex="0"
    aria-label="在一起天数，点击查看"
    @click="openLove"
    @keydown.enter.prevent="openLove"
    @keydown.space.prevent="openLove"
  >
    <span class="td-heart" aria-hidden="true">💌</span>
    <span class="td-text">在一起 <span class="td-days">{{ days }}</span> 天啦</span>
  </div>

  <!-- 彩蛋层：Teleport 到 body，全屏桃心雨 + 中心「我爱你」；点击任意位置关闭 -->
  <LoveRainLayer :visible="raining" @close="raining = false" />
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import LoveRainLayer from './LoveRainLayer.vue'

/**
 * 「在一起 XX 天」徽标
 * - 起始日期写死 2026-08-08，纯前端实时计算，不读写 IndexedDB
 * - 含首日口径：起始日当天即第 1 天（今天 2026-09-16 → 40 天）
 */

/** 起始固定日期（YYYY-MM-DD） */
const START_DATE = '2026-08-08'

const DAY_MS = 24 * 60 * 60 * 1000

/** 当前时间戳：仅作为重算触发器，页面从后台恢复时刷新 */
const now = ref(Date.now())

/** 彩蛋层显隐：点击徽标打开，点击全屏任意位置 / Esc 关闭 */
const raining = ref(false)

function openLove() {
  raining.value = true
}

/** 展示天数 = 本地自然日日期差 + 1（含首日） */
const days = computed(() => {
  // 起始日之后恒为正；若设备时间被调早，兜底为 1，避免出现 0 / 负数
  return Math.max(1, diffInDays(START_DATE, now.value) + 1)
})

/**
 * 计算两个日期相差的整天数
 * 统一按本地「年-月-日」转成 UTC 零点再相减，忽略时分秒，规避时区与夏令时误差
 */
function diffInDays(fromYmd, toTimestamp) {
  const [y, m, d] = fromYmd.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  const t = new Date(toTimestamp)
  const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.round((today - start) / DAY_MS)
}

function refresh() {
  now.value = Date.now()
}

/** PWA 从后台切回前台 / 跨天时重新计算（无定时器） */
function onVisibilityChange() {
  if (!document.hidden) refresh()
}

onMounted(() => {
  refresh()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', refresh)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', refresh)
})
</script>

<style scoped>
.together-days {
  /* 固定在导航栏最右，不参与左侧标题的伸缩 */
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  /* 可点击彩蛋入口：按下有轻微回弹反馈 */
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.15s ease;
  /* 文字水平居中且永不换行 */
  text-align: center;
  white-space: nowrap;
  /* 空间不足时自动微调字号：窄屏逐级变小，宽屏封顶 16px（仍小于导航标题 17px） */
  font-size: clamp(12px, 3.3vw, 16px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.2px;
  /* 低饱和暖粉（主色 #ff6f9c 同色系柔化），与整站多巴胺粉调统一 */
  color: #cf7f9e;
  /* 极淡半透明浅粉底 + 柔和圆角胶囊 */
  background: rgba(255, 111, 156, 0.07);
  border: 1px solid rgba(255, 111, 156, 0.14);
  border-radius: 999px;
  padding: 4px 10px;
  margin-left: 8px;
  /* 极限窄屏兜底：徽标自身先截断，绝不撑破导航栏、不挤压左侧标题 */
  max-width: 52%;
  overflow: hidden;
}

/* 点击反馈：与 .stat-card.clickable 的按下缩放保持一致 */
.together-days:active {
  transform: scale(0.95);
}

.together-days:focus-visible {
  outline: 2px solid rgba(255, 111, 156, 0.5);
  outline-offset: 2px;
}

/* 表情柔和：略小于正文，不抢导航标题视觉 */
.td-heart {
  font-size: 0.95em;
  line-height: 1;
}

.td-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 天数等宽数字，数字变化时不抖动 */
.td-days {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
