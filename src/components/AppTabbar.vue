<template>
  <nav class="app-tabbar">
    <router-link
      v-for="t in tabs"
      :key="t.path"
      :to="t.path"
      class="tab-item"
      :class="{ active: isActive(t.path) }"
    >
      <el-icon><component :is="t.icon" /></el-icon>
      <span>{{ t.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

/** 底部导航配置（手机优先；已移除「空闲时段」入口） */
const tabs = [
  { path: '/', label: '首页', icon: 'HomeFilled' },
  { path: '/calendar', label: '排课', icon: 'Calendar' },
  { path: '/customers', label: '客户', icon: 'User' },
  { path: '/settings', label: '设置', icon: 'Setting' }
]

const route = useRoute()

function isActive(path) {
  return route.path === path
}
</script>
