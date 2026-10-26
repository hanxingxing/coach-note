<template>
  <BottomSheet v-model="open" title="选择开始时间">
    <p class="time-hint">每节课 60 分钟，最晚 21:00 开始（22:00 下课）</p>
    <div class="time-grid">
      <button
        v-for="t in slots"
        :key="t"
        type="button"
        class="time-slot"
        :class="{ 'is-active': t === value }"
        :aria-pressed="t === value"
        @click="pick(t)"
      >
        {{ t }}
      </button>
    </div>
  </BottomSheet>
</template>

<script setup>
import { computed } from 'vue'
import { buildTimeSlots } from '../utils/time'
import BottomSheet from './BottomSheet.vue'

/**
 * 开始时间选择抽屉
 * - 与日期抽屉共用 BottomSheet 外壳：无输入框、无键盘、固定高度
 * - 时间片以 4 列网格一次铺开，不滚动、不筛选，点一下即选中
 * - 只提供能排下的开始时间：09:00 - 21:00（每节 60 分钟，22:00 下课）
 */

const START = '09:00'
/** 最晚开始时间：21:00 + 60 分钟 = 22:00，正好在可排课范围内 */
const END = '21:00'
const slots = buildTimeSlots(START, END, 30)

const props = defineProps({
  /** 抽屉显隐 */
  modelValue: { type: Boolean, default: false },
  /** 当前开始时间（"HH:mm"） */
  value: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'update:value'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

/** 选中时间并关闭 */
function pick(t) {
  emit('update:value', t)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.time-hint {
  margin: 4px 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--cn-text-hint);
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.time-slot {
  height: 44px;
  padding: 0;
  border: 1px solid #f0e6ec;
  border-radius: 12px;
  background: #faf4f8;
  color: var(--cn-text);
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.time-slot:active {
  background: #fff1f5;
}

.time-slot.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #ff8fb3, #ff6f9c);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(255, 111, 156, 0.35);
}
</style>
