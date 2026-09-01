<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <div class="title">章章 CoachNote</div>
        <div class="subtitle">{{ todayText }}</div>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <AppTabbar />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import AppTabbar from './components/AppTabbar.vue'
import { cleanupOldData, KEEP_MONTHS } from './db'
import { useCustomers } from './composables/useCustomers'
import { useSessions } from './composables/useSessions'
import { useSettings } from './composables/useSettings'
import { useNotifications } from './composables/useNotifications'
import { useReminder } from './composables/useReminder'
import { fmtDate, fmtWeekday } from './utils/time'

const { refresh: refreshCustomers, getById: getCustomer } = useCustomers()
const { sessions, refresh: refreshSessions } = useSessions()
const { settings, loadSettings } = useSettings()
const { supported: notifySupported, permission, notify } = useNotifications()

const todayText = computed(() => {
  const now = Date.now()
  return `${fmtDate(now)} ${fmtWeekday(now)}`
})

let reminder = null

onMounted(async () => {
  // 1. 数据维护：每次打开自动删除一个自然月前的历史排课，并清理已取消的遗留记录
  const deleted = await cleanupOldData()
  if (deleted > 0) {
    ElMessage.info(`已自动清理 ${deleted} 条历史排课`)
  }

  // 2. 加载全部数据与设置
  await Promise.all([refreshCustomers(), refreshSessions(), loadSettings()])

  // 3. 同步通知权限状态，并启动课前提醒调度
  if (notifySupported) {
    permission.value = Notification.permission
  }
  reminder = useReminder({ sessions, settings, permission, getCustomer, notify })
  reminder.start()
})

onBeforeUnmount(() => {
  if (reminder) reminder.stop()
})
</script>
