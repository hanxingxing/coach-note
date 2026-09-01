<template>
  <div class="month-cal">
    <div class="week-row">
      <div v-for="w in WEEK" :key="w" class="week-cell">{{ w }}</div>
    </div>
    <div v-for="(row, ri) in rows" :key="ri" class="week-row">
      <div
        v-for="cell in row"
        :key="cell.key"
        class="day-cell"
        :class="cellClass(cell)"
        @click="onCellClick(cell)"
      >
        <div class="day-num">{{ cell.day ?? '' }}</div>
        <div class="dots">
          <template v-if="cell.day">
            <span
              v-for="(s, i) in cell.sessions.slice(0, 3)"
              :key="s.id"
              class="dot"
              :class="'dot-' + s.status"
            ></span>
            <span v-if="cell.sessions.length > 3" class="more">+{{ cell.sessions.length - 3 }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { startOfDay, sameDay } from '../utils/time'

/**
 * 月视图日历
 * - 每天以彩色圆点展示排课数量（蓝=待上课 绿=已完成）
 * - 点击某天切换到日视图
 */

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  sessions: { type: Array, default: () => [] },
  /** 当前选中日（时间戳） */
  selectedTs: { type: Number, default: null }
})
const emit = defineEmits(['select-day'])

const daysInMonth = computed(() => new Date(props.year, props.month, 0).getDate())
const firstWeekday = computed(() => new Date(props.year, props.month - 1, 1).getDay())
const today = startOfDay(Date.now())

/** 生成 6 行 × 7 列网格（含前月空白补齐） */
const rows = computed(() => {
  const total = Math.ceil((firstWeekday.value + daysInMonth.value) / 7) * 7
  const cells = []
  for (let i = 0; i < total; i++) {
    const day = i - firstWeekday.value + 1
    if (day < 1 || day > daysInMonth.value) {
      cells.push({ key: i, day: null, ts: null, sessions: [] })
    } else {
      const ts = new Date(props.year, props.month - 1, day).getTime()
      cells.push({
        key: i,
        day,
        ts,
        sessions: props.sessions.filter((s) => sameDay(s.start, ts))
      })
    }
  }
  const result = []
  for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
  return result
})

function cellClass(cell) {
  if (!cell.day) return 'is-blank'
  return {
    'is-today': sameDay(cell.ts, today),
    'is-selected': props.selectedTs != null && sameDay(cell.ts, props.selectedTs),
    'has-sessions': cell.sessions.length > 0
  }
}

function onCellClick(cell) {
  if (cell.day) emit('select-day', cell.ts)
}
</script>

<style scoped>
.month-cal {
  background: var(--cn-card-bg);
  border-radius: 14px;
  padding: 8px 6px;
  box-shadow: var(--cn-shadow);
}
.week-row {
  display: flex;
}
.week-cell,
.day-cell {
  flex: 1;
  text-align: center;
}
.week-cell {
  font-size: 11px;
  color: var(--cn-text-hint);
  padding: 6px 0;
}
.day-cell {
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
}
.day-cell.is-blank {
  cursor: default;
}
.day-num {
  font-size: 14px;
  line-height: 22px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--cn-text);
}
.day-cell.is-today .day-num {
  background: var(--cn-primary);
  color: #fff;
  font-weight: 600;
}
.day-cell.is-selected:not(.is-today) .day-num {
  background: #ffeaf2;
  color: var(--cn-primary);
  font-weight: 600;
}
.dots {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 14px;
  margin-top: 2px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cn-info);
}
.dot-pending {
  background: var(--cn-primary);
}
.dot-completed {
  background: var(--cn-success);
}
.more {
  font-size: 10px;
  color: var(--cn-text-hint);
}
</style>
