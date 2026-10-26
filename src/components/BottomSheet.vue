<template>
  <Teleport to="body">
    <Transition name="cn-sheet">
      <div v-if="modelValue" class="cn-sheet-mask" :style="{ zIndex: maskZIndex }" @click.self="close">
        <div
          ref="panelRef"
          class="cn-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          @click.stop
          @keydown.esc.stop.prevent="close"
        >
          <div class="cn-sheet__head">
            <span class="cn-sheet__title">{{ title }}</span>
            <button type="button" class="cn-sheet__close" aria-label="关闭" @click="close">
              <el-icon><Close /></el-icon>
            </button>
          </div>
          <div class="cn-sheet__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useZIndex } from 'element-plus'

/**
 * 通用底部面板外壳（日期 / 时间选择共用）
 * - 遮罩层 + 底部滑入 + 标题与关闭按钮
 * - 打开时收起键盘、抢焦点（支持 Esc），并取一个高于当前弹窗的层级
 * - 内容放在默认插槽，面板高度由内容决定；滚动条只作用于内容区，标题固定
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

/** 借用 Element 的层级计数器，保证面板始终盖在已打开的弹窗之上 */
const { nextZIndex } = useZIndex()
const maskZIndex = ref(3000)
const panelRef = ref(null)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    maskZIndex.value = nextZIndex()
    // 收起备注等输入框已经唤起的键盘，避免面板被顶出可视区
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    nextTick(() => panelRef.value?.focus({ preventScroll: true }))
  },
  { immediate: true }
)

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.cn-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(74, 63, 74, 0.32);
  -webkit-tap-highlight-color: transparent;
}

.cn-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  overflow: hidden;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -10px 30px rgba(74, 63, 74, 0.16);
  outline: none;
}

/* 平板 / 桌面：面板居中并四角圆角，不贴屏幕底边 */
@media (min-width: 560px) {
  .cn-sheet {
    border-radius: 22px;
    margin-bottom: 24px;
  }
}

.cn-sheet__head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cn-sheet__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cn-text);
}

.cn-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: #faf4f8;
  color: var(--cn-text-secondary);
  font-size: 16px;
  cursor: pointer;
  touch-action: manipulation;
}

.cn-sheet__close:active {
  background: #ffeaf2;
  color: var(--cn-primary);
}

/* 内容区独立滚动，标题和关闭按钮始终固定 */
.cn-sheet__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* 遮罩淡入 + 面板上滑 */
.cn-sheet-enter-active,
.cn-sheet-leave-active {
  transition: opacity 0.22s ease;
}

.cn-sheet-enter-active .cn-sheet,
.cn-sheet-leave-active .cn-sheet {
  transition: transform 0.26s cubic-bezier(0.32, 0.72, 0.35, 1);
}

.cn-sheet-enter-from,
.cn-sheet-leave-to {
  opacity: 0;
}

.cn-sheet-enter-from .cn-sheet,
.cn-sheet-leave-to .cn-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .cn-sheet-enter-active,
  .cn-sheet-leave-active,
  .cn-sheet-enter-active .cn-sheet,
  .cn-sheet-leave-active .cn-sheet {
    transition: none;
  }
}
</style>
