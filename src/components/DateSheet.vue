<template>
  <BottomSheet v-model="open" title="选择日期">
    <div class="cn-sheet__month">
      <button type="button" class="cn-sheet__nav" aria-label="上个月" @click="shiftMonth(-1)">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <span class="cn-sheet__month-label">{{ monthLabel }}</span>
      <button type="button" class="cn-sheet__nav" aria-label="下个月" @click="shiftMonth(1)">
        <el-icon><ArrowRight /></el-icon>
      </button>
    </div>

    <div class="cn-sheet__quick" role="group" aria-label="快捷选择">
      <button
        v-for="q in quickOptions"
        :key="q.label"
        type="button"
        class="cn-sheet__quick-btn"
        :class="{ 'is-active': q.ts === selectedTs }"
        @click="pick(q.ts)"
      >
        {{ q.label }}
      </button>
    </div>

    <div class="cn-sheet__week" aria-hidden="true">
      <span v-for="w in WEEK" :key="w">{{ w }}</span>
    </div>

    <div class="cn-sheet__grid">
      <template v-for="(cell, i) in cells" :key="i">
        <span v-if="!cell.day" class="cn-sheet__blank"></span>
        <button
          v-else
          type="button"
          class="cn-sheet__day"
          :class="{ 'is-today': cell.ts === todayTs, 'is-selected': cell.ts === selectedTs }"
          :aria-label="`${monthNo}月${cell.day}日 ${fmtWeekday(cell.ts)}`"
          :aria-pressed="cell.ts === selectedTs"
          @click="pick(cell.ts)"
        >
          {{ cell.day }}
        </button>
      </template>
    </div>
  </BottomSheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { addDays, startOfDay, fmtWeekday } from '../utils/time'
import { monthCells, startOfMonth } from '../utils/calendar'
import BottomSheet from './BottomSheet.vue'

/**
 * 日期选择抽屉
 * - 面板外壳（遮罩 / 标题 / 关闭 / 动画 / 层级）统一在 BottomSheet
 * - 固定 6 行日期格：不管 4/5/6 行的月份，面板高度都一样，切月不会移位误触
 * - 无输入框，不会唤起键盘
 */

/** 周日开头，与月视图 MonthCalendar 保持一致 */
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const props = defineProps({
  /** 抽屉显隐 */
  modelValue: { type: Boolean, default: false },
  /** 当前选中日期（当天 0 点时间戳），可为空 */
  date: { type: [Number, String], default: null }
})
const emit = defineEmits(['update:modelValue', 'update:date'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

/** 面板当前展示的月份（该月 1 日 0 点） */
const viewMonth = ref(startOfMonth(Date.now()))
/** 今天 0 点（每次打开时刷新，避免跨天后仍指向昨天） */
const todayTs = ref(startOfDay(Date.now()))

/** 表单里的选中日期，统一成当天 0 点 */
const selectedTs = computed(() => {
  if (props.date == null || props.date === '') return null
  const ts = Number(props.date)
  return Number.isFinite(ts) ? startOfDay(ts) : null
})

const monthLabel = computed(() => {
  const d = new Date(viewMonth.value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
})

/** 当前展示月份（1-12），用于日期的 aria-label */
const monthNo = computed(() => new Date(viewMonth.value).getMonth() + 1)

/** 固定 6 行（42 格），保证切月时面板高度恒定 */
const cells = computed(() => monthCells(viewMonth.value, 6))

/** 今天 / 明天 / 后天：省去在月历里翻找 */
const quickOptions = computed(() => [
  { label: '今天', ts: todayTs.value },
  { label: '明天', ts: addDays(todayTs.value, 1) },
  { label: '后天', ts: addDays(todayTs.value, 2) }
])

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    todayTs.value = startOfDay(Date.now())
    viewMonth.value = startOfMonth(selectedTs.value ?? todayTs.value)
  },
  { immediate: true }
)

/** 切换展示月份 */
function shiftMonth(delta) {
  const d = new Date(viewMonth.value)
  viewMonth.value = new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime()
}

/** 选中日期并关闭 */
function pick(ts) {
  emit('update:date', startOfDay(ts))
  emit('update:modelValue', false)
}
</script>

<style scoped>
.cn-sheet__month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 6px 0 10px;
}

.cn-sheet__month-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--cn-text);
  letter-spacing: 0.5px;
}

.cn-sheet__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #f0e6ec;
  border-radius: 10px;
  background: #faf4f8;
  color: var(--cn-text-secondary);
  font-size: 15px;
  cursor: pointer;
  touch-action: manipulation;
}

.cn-sheet__nav:active {
  background: #ffeaf2;
  border-color: #ffd4e1;
  color: var(--cn-primary);
}

.cn-sheet__quick {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.cn-sheet__quick-btn {
  flex: 1;
  height: 36px;
  padding: 0;
  border: 1px solid #f0e6ec;
  border-radius: 10px;
  background: #faf4f8;
  color: var(--cn-text-secondary);
  font-size: 13px;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.cn-sheet__quick-btn.is-active {
  border-color: var(--cn-primary);
  background: #fff1f5;
  color: var(--cn-primary);
  font-weight: 600;
}

.cn-sheet__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 2px 0 6px;
}

.cn-sheet__week span {
  text-align: center;
  font-size: 12px;
  color: var(--cn-text-hint);
}

.cn-sheet__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cn-sheet__blank,
.cn-sheet__day {
  height: 44px;
}

.cn-sheet__day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--cn-text);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.12s ease, color 0.12s ease;
}

.cn-sheet__day:active {
  background: #fff1f5;
}

/* 今天：主色文字 + 底部小圆点 */
.cn-sheet__day.is-today {
  color: var(--cn-primary);
  font-weight: 700;
}

.cn-sheet__day.is-today::after {
  content: '';
  position: absolute;
  bottom: 6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--cn-primary);
}

/* 选中：主色渐变填充，优先级高于今天 */
.cn-sheet__day.is-selected {
  background: linear-gradient(135deg, #ff8fb3, #ff6f9c);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(255, 111, 156, 0.35);
}

.cn-sheet__day.is-selected::after {
  display: none;
}
</style>
