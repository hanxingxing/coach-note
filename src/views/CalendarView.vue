<template>
  <div>
    <!-- 视图切换：月 / 日 / 列表（放大尺寸，方便手机点击）+ 新建排课 -->
    <div class="cal-toolbar">
      <el-segmented v-model="viewMode" :options="viewOptions" size="large" class="view-switch" />
      <el-button type="primary" circle size="large" :icon="Plus" title="新建排课" @click="openCreate" />
    </div>

    <!-- 月视图 -->
    <div v-if="viewMode === 'month'" class="cal-panel">
      <div class="nav-row">
        <el-button class="nav-btn" circle :icon="ArrowLeft" @click="shiftMonth(-1)" />
        <div class="nav-title" @click="goToday">{{ year }}年{{ month }}月</div>
        <el-button class="nav-btn" circle :icon="ArrowRight" @click="shiftMonth(1)" />
        <el-button class="today-btn" text @click="goToday">今天</el-button>
      </div>
      <MonthCalendar
        :year="year"
        :month="month"
        :sessions="sessions"
        :selected-ts="selectedDay"
        @select-day="onSelectDay"
      />
    </div>

    <!-- 日视图 -->
    <div v-if="viewMode === 'day'" class="cal-panel">
      <div class="nav-row">
        <el-button class="nav-btn" circle :icon="ArrowLeft" @click="shiftDay(-1)" />
        <div class="nav-title" @click="goToday">{{ fmtDate(selectedDay) }} {{ fmtWeekday(selectedDay) }}</div>
        <el-button class="nav-btn" circle :icon="ArrowRight" @click="shiftDay(1)" />
      </div>
      <DayCalendar
        :date-ts="selectedDay"
        :sessions="sessions"
        :work-start="9"
        :work-end="22"
        @edit="openEdit"
        @add-at="openCreateAt"
        @complete="onQuickComplete"
        @start="onQuickStart"
      />
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'">
      <SessionList
        :sessions="sessions"
        :customers="customers"
        :filters="listFilters"
        @update:filters="onFiltersChange"
        @edit="openEdit"
      />
    </div>

    <!-- 排课弹窗 -->
    <SessionFormDialog
      v-model="dialogVisible"
      :session="editingSession"
      :preset="preset"
      @saved="onSaved"
    />

    <!-- 上课庆祝弹窗（独立实例，文案：开始上课啦，加油章章） -->
    <CelebrationLayer
      :visible="startCelebration"
      :confetti="startConfetti"
      text="开始上课啦，加油章章"
    />
    <!-- 下课庆祝弹窗（独立实例，文案：辛苦了章章） -->
    <CelebrationLayer
      :visible="completeCelebration"
      :confetti="completeConfetti"
      text="辛苦了，章章"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import MonthCalendar from '../components/MonthCalendar.vue'
import DayCalendar from '../components/DayCalendar.vue'
import SessionList from '../components/SessionList.vue'
import SessionFormDialog from '../components/SessionFormDialog.vue'
import CelebrationLayer from '../components/CelebrationLayer.vue'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import { useClassActions } from '../composables/useClassActions'
import { startOfDay, addDays, fmtDate, fmtWeekday } from '../utils/time'

/**
 * 排课页：月视图 / 日视图 / 列表视图 三合一
 * 支持通过路由参数进入：
 * - ?view=list&customer=ID 查看单个客户全部排课（客户页跳转）
 * - ?view=day&date=时间戳 定位到某天
 */

const route = useRoute()

const { customers } = useCustomers()
const { sessions } = useSessions()
// 上课/下课共享操作与庆祝特效（与首页今日排课列表共用）
const {
  startCelebration,
  startConfetti,
  completeCelebration,
  completeConfetti,
  onQuickStart,
  onQuickComplete
} = useClassActions()

const viewOptions = [
  { label: '月', value: 'month' },
  { label: '日', value: 'day' },
  { label: '列表', value: 'list' }
]

const viewMode = ref('month')
const selectedDay = ref(startOfDay(Date.now()))
const listFilters = ref({ status: '', customerId: null })

// 弹窗状态
const dialogVisible = ref(false)
const editingSession = ref(null)
const preset = ref(null)

const year = computed(() => new Date(selectedDay.value).getFullYear())
const month = computed(() => new Date(selectedDay.value).getMonth() + 1)

onMounted(() => {
  // 支持从客户页 / 其他入口带参数进入
  if (route.query.view) viewMode.value = route.query.view
  if (route.query.customer) {
    viewMode.value = 'list'
    listFilters.value.customerId = Number(route.query.customer)
  }
  if (route.query.date) {
    viewMode.value = 'day'
    selectedDay.value = startOfDay(Number(route.query.date))
  }
})

// ---------- 月份切换 ----------
function shiftMonth(delta) {
  const d = new Date(selectedDay.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  selectedDay.value = startOfDay(d.getTime())
}
function goToday() {
  selectedDay.value = startOfDay(Date.now())
}
// ---------- 日期切换 ----------
function shiftDay(delta) {
  selectedDay.value = addDays(selectedDay.value, delta)
}
function onSelectDay(ts) {
  selectedDay.value = ts
  viewMode.value = 'day'
}
function onFiltersChange(f) {
  listFilters.value = f
}

// ---------- 排课弹窗操作 ----------
function openCreate() {
  editingSession.value = null
  preset.value = null
  dialogVisible.value = true
}
function openCreateAt(start) {
  editingSession.value = null
  // 单节默认 60 分钟（上课时间固定 09:00-22:00）
  preset.value = { start, end: start + 60 * 60000 }
  dialogVisible.value = true
}
function openEdit(s) {
  editingSession.value = s
  preset.value = null
  dialogVisible.value = true
}

function onSaved() {
  // 数据在 composable 内已刷新；无需额外处理
}
</script>

<style scoped>
.cal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.view-switch {
  flex: 1;
  min-width: 0;
}
/* 放大切换项：增大移动端点击区域（圆角样式统一在全局样式） */
.view-switch :deep(.el-segmented__item) {
  padding: 9px 0;
  font-size: 15px;
}
.cal-panel {
  margin-bottom: 4px;
}
/* 导航行：与日历主体拉开上下间距 */
.nav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
/* 上/下月（上/下一天）切换按钮：放大尺寸，增大移动端点击热区 */
.nav-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.today-btn {
  font-size: 14px;
  padding: 8px 12px;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
}
</style>
