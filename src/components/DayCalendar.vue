<template>
  <div class="day-cal">
    <!-- 左侧小时刻度 -->
    <div class="hours-col">
      <div
        v-for="h in hourRange"
        :key="h"
        class="hour-label"
        :style="{ top: (h - workStart) * HOUR_H + 'px' }"
      >
        {{ String(h).padStart(2, '0') }}
      </div>
    </div>
    <!-- 右侧时间轴 -->
    <div
      ref="timelineEl"
      class="timeline"
      :style="{ height: totalH + 'px' }"
      @click="onTimelineClick"
    >
      <div
        v-for="h in hourRange"
        :key="'l' + h"
        class="hour-line"
        :style="{ top: (h - workStart) * HOUR_H + 'px' }"
      ></div>
      <!-- 当前时间红线 -->
      <div v-if="nowLineTop != null" class="now-line" :style="{ top: nowLineTop + 'px' }"></div>
      <!-- 排课块 -->
      <div
        v-for="s in daySessions"
        :key="s.id"
        class="session-block"
        :class="'st-' + s.status"
        :style="blockStyle(s)"
        @click.stop="emit('edit', s)"
      >
        <div class="sb-time">{{ fmtTime(s.start) }} - {{ fmtTime(s.end) }}</div>
        <div class="sb-name">{{ customerName(s.customerId) }}</div>
        <!-- 快捷上课：复制「已到店」通知文本，配合提示与庆祝特效 -->
        <el-button
          v-if="s.status === 'pending'"
          class="quick-btn start-btn"
          size="small"
          circle
          title="上课（复制到店通知）"
          @click.stop="emit('start', s)"
        >
          <el-icon><VideoPlay /></el-icon>
        </el-button>
        <!-- 快捷下课：直接标记「已完成」并扣减 1 节课时，无需打开详情弹窗 -->
        <el-button
          v-if="s.status === 'pending'"
          class="quick-btn finish-btn"
          size="small"
          circle
          title="快捷下课（标记已完成并扣减 1 节课时）"
          @click.stop="emit('complete', s)"
        >
          <el-icon><Check /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCustomers } from '../composables/useCustomers'
import { startOfDay, sameDay, fmtTime, MINUTE_MS } from '../utils/time'

/**
 * 日视图时间轴
 * - 排课按时间定位展示，点击排课块可编辑
 * - 点击空白时间轴可快速在该时间点新建排课
 */

const HOUR_H = 56 // 每小时高度(px)

const props = defineProps({
  /** 当前日期（时间戳） */
  dateTs: { type: Number, required: true },
  sessions: { type: Array, default: () => [] },
  /** 上课时间范围（固定 09:00-22:00） */
  workStart: { type: Number, default: 9 },
  workEnd: { type: Number, default: 22 }
})
const emit = defineEmits(['edit', 'add-at', 'complete', 'start'])

const { getById: getCustomer } = useCustomers()

const hourRange = computed(() => {
  const arr = []
  for (let h = props.workStart; h <= props.workEnd; h++) arr.push(h)
  return arr
})
const totalH = computed(() => (props.workEnd - props.workStart) * HOUR_H)

/** 当天的排课（按开始时间排序） */
const daySessions = computed(() =>
  props.sessions
    .filter((s) => sameDay(s.start, props.dateTs))
    .sort((a, b) => a.start - b.start)
)

const isToday = computed(() => sameDay(props.dateTs, Date.now()))

/** 当前时间红线位置 */
const nowLineTop = computed(() => {
  if (!isToday.value) return null
  const d = new Date()
  const minutes = d.getHours() * 60 + d.getMinutes()
  const top = ((minutes - props.workStart * 60) / 60) * HOUR_H
  return top >= 0 && top <= totalH.value ? top : null
})

function customerName(id) {
  return getCustomer(id)?.name || '未知客户'
}

/** 排课块定位样式 */
function blockStyle(s) {
  const dayStart = startOfDay(s.start)
  const top = ((s.start - dayStart) / 3600000 - props.workStart) * HOUR_H
  const height = Math.max(((s.end - s.start) / 3600000) * HOUR_H, 40)
  return { top: top + 'px', height: height + 'px' }
}

/** 点击时间轴空白处：换算为时间点（按 30 分钟取整）并触发新建 */
function onTimelineClick(e) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const relY = e.clientY - rect.top
  const minutes = Math.round((relY / HOUR_H) * 60 / 30) * 30
  const start = startOfDay(props.dateTs) + minutes * MINUTE_MS
  emit('add-at', start)
}
</script>

<style scoped>
.day-cal {
  display: flex;
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--cn-shadow);
  overflow: hidden;
}
.hours-col {
  width: 46px;
  position: relative;
  flex-shrink: 0;
  background: #fafbfd;
  border-right: 1px solid #f0f2f5;
}
.hour-label {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--cn-text-hint);
}
.timeline {
  position: relative;
  flex: 1;
  cursor: pointer;
  background: #fdfefe;
}
.hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #f0f2f5;
}
.now-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 2px solid var(--cn-danger);
  z-index: 1;
}
.now-line::before {
  content: '';
  position: absolute;
  left: -1px;
  top: -4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cn-danger);
}
.session-block {
  position: absolute;
  left: 8px;
  right: 8px;
  border-radius: 10px;
  padding: 6px 96px 6px 10px;
  overflow: hidden;
  cursor: pointer;
  z-index: 2;
  background: #fff1f5;
  border-left: 3px solid var(--cn-primary);
  box-shadow: 0 1px 2px rgba(120, 80, 110, 0.06);
}
.st-completed {
  background: #e9faf1;
  border-left-color: var(--cn-success);
}
.st-completed .sb-name {
  color: var(--cn-text-secondary);
}
.sb-time {
  font-size: 11px;
  color: var(--cn-text-hint);
  letter-spacing: 0.2px;
}
.sb-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--cn-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 快捷上课/下课按钮：右侧并排、垂直居中（视觉样式统一在全局 .quick-btn） */
.session-block .quick-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: auto;
}
.session-block .quick-btn:active {
  transform: translateY(-50%) scale(0.94);
}
.session-block .start-btn {
  right: 50px;
}
.session-block .finish-btn {
  right: 10px;
}
</style>
