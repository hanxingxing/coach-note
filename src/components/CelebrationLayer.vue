<template>
  <Teleport to="body">
    <div v-if="visible" class="celebration-layer">
      <span
        v-for="c in confetti"
        :key="c.id"
        class="celebration-emoji"
        :style="{
          '--dx': c.dx,
          '--dy': c.dy,
          '--rot': c.rot,
          animationDelay: c.delay + 's',
          animationDuration: c.duration + 's',
          fontSize: c.size + 'px'
        }"
      >{{ c.emoji }}</span>
      <div class="celebration-text">{{ text }}</div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * 自定义庆祝弹窗层（上课 / 下课共用，实例相互独立）
 * - Teleport 到 body，避免任何祖先容器/层级影响，确保始终可见
 * - 样式与动画定义在 src/styles/global.css（.celebration-*）
 * - 不使用 Element Plus toast，由父组件控制显隐与表情粒子
 */
defineProps({
  /** 是否显示 */
  visible: { type: Boolean, default: false },
  /** 表情粒子数组 [{ id, emoji, left, delay, size }] */
  confetti: { type: Array, default: () => [] },
  /** 提示文案（上课 / 下课各自独立传入） */
  text: { type: String, default: '' }
})
</script>
