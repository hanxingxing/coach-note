<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="love-layer"
      role="dialog"
      aria-label="我爱你"
      @click="emit('close')"
    >
      <!-- 桃心雨：从顶部持续飘落，位置/大小/时长随机错落 -->
      <span
        v-for="h in hearts"
        :key="h.id"
        class="love-heart"
        :style="{
          '--x': h.left + 'vw',
          '--size': h.size + 'px',
          '--dx': h.drift + 'px',
          '--rot': h.rot,
          '--o': h.opacity,
          animationDelay: h.delay + 's',
          animationDuration: h.duration + 's'
        }"
        >{{ h.emoji }}</span
      >

      <!-- 中心文案 -->
      <div class="love-center">
        <div class="love-beat">
          <div class="love-text">章章</div>
          <div class="love-text">我爱你</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * 「在一起 XX 天」彩蛋层：全屏桃心雨 + 中心「我爱你」
 * - Teleport 到 body，避免导航栏 sticky/层叠上下文影响，确保真正全屏
 * - 样式与关键帧定义在 src/styles/global.css（.love-*），与 .celebration-* 同一约定
 * - 整层可点击：点击任意位置立即关闭并恢复界面正常使用；覆盖期间拦截底层交互与滚动
 * - 纯展示，不读写任何数据
 */

const props = defineProps({
  /** 是否显示 */
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

/** 桃心素材 */
const HEART_EMOJIS = ['💗', '💖', '💕', '❤️', '💓', '💞']
/** 桃心数量（兼顾氛围与手机性能） */
const HEART_COUNT = 40

const hearts = ref([])

/**
 * 生成桃心粒子：横向铺满全屏，下落时长/大小/飘移随机错落
 * delay 用「当前周期内的负偏移」：打开瞬间每颗桃心已处在下落路径的不同位置，
 * 画面一出现就已是满屏桃心雨；用正延迟会让桃心先静止等待再开始掉，产生起手停顿
 */
function spawnHearts() {
  const stamp = Date.now()
  return Array.from({ length: HEART_COUNT }, (_, i) => {
    const duration = +(2.6 + Math.random() * 2.2).toFixed(2)
    return {
      id: `${stamp}-${i}`,
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
      left: +(Math.random() * 100).toFixed(1),
      size: 14 + Math.round(Math.random() * 18),
      delay: +(-Math.random() * duration).toFixed(2),
      duration,
      drift: Math.round((Math.random() - 0.5) * 90),
      rot: Math.round((Math.random() - 0.5) * 220),
      opacity: (0.65 + Math.random() * 0.35).toFixed(2)
    }
  })
}

/** Esc 兜底关闭（桌面 / PWA 键盘场景） */
function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      hearts.value = spawnHearts()
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
      hearts.value = []
    }
  }
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>
