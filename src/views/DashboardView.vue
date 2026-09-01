<template>
  <div>
    <!-- 统计面板：今日排课重点放大展示（不可点击）；已上课/待上课/客户总数并排展示 -->
    <div class="stat-grid">
      <div class="stat-card today-card">
        <div class="icon i-danger">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="today-info">
          <div class="num">{{ todayCount }}</div>
          <div class="label">今日排课（节）</div>
          <div class="today-sub">{{ todayPending }} 节待上课 · {{ todayCompleted }} 节已完成</div>
        </div>
      </div>
    </div>

    <!-- 已上课 / 待上课 / 客户总数：三卡并排 -->
    <div class="mini-grid">
      <div class="stat-card mini clickable" @click="goRecords('completed')">
        <div class="icon i-success">
          <el-icon><Finished /></el-icon>
        </div>
        <div class="num">{{ completedCount }}</div>
        <div class="label">已上课</div>
      </div>
      <div class="stat-card mini clickable" @click="goRecords('pending')">
        <div class="icon i-warning">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="num">{{ pendingCount }}</div>
        <div class="label">待上课</div>
      </div>
      <div class="stat-card mini clickable" @click="goCustomers">
        <div class="icon i-primary">
          <el-icon><User /></el-icon>
        </div>
        <div class="num">{{ customerCount }}</div>
        <div class="label">客户总数</div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <el-button type="primary" size="large" style="flex: 1" @click="openCreateSession">
        <el-icon style="margin-right: 4px"><Plus /></el-icon>新建排课
      </el-button>
      <el-button size="large" style="flex: 1" @click="openCreateCustomer">
        <el-icon style="margin-right: 4px"><Plus /></el-icon>新建客户
      </el-button>
    </div>

    <!-- 今日排课 -->
    <div class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="var(--cn-primary)"><Calendar /></el-icon>
        今日排课
      </h3>
      <template v-if="todaySessions.length">
        <div
          v-for="s in todaySessions"
          :key="s.id"
          class="record-item"
          @click="openEditSession(s)"
        >
          <div class="time-col">
            <div class="t-main">{{ fmtTime(s.start) }}</div>
            <div class="t-sub">{{ fmtTime(s.end) }}</div>
          </div>
          <div class="info-col">
            <div class="row1">
              <span class="name">{{ customerName(s.customerId) }}</span>
              <el-tag :type="tagType(s.status)" size="small">{{ tagText(s.status) }}</el-tag>
            </div>
            <div class="row2">{{ s.note }}</div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">今天暂无排课，点击上方「新建排课」安排一节吧</div>
    </div>

    <!-- 排课弹窗 -->
    <SessionFormDialog v-model="sessionDialogVisible" :session="editingSession" @saved="onSessionSaved" />
    <!-- 客户弹窗 -->
    <CustomerFormDialog v-model="customerDialogVisible" :customer="editingCustomer" @saved="onCustomerSaved" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import SessionFormDialog from '../components/SessionFormDialog.vue'
import CustomerFormDialog from '../components/CustomerFormDialog.vue'
import { fmtTime, sameDay } from '../utils/time'

/**
 * 首页：统计面板 + 快捷操作 + 今日排课（重点展示）
 * 统计卡片导航：
 * - 已上课 / 待上课 → 课程记录页（/records?status=...）
 * - 客户总数 → 客户管理页（/customers）
 * - 今日排课 → 无跳转，仅展示
 */

const router = useRouter()

/** 跳转课程记录页（可带状态定位：completed / pending） */
function goRecords(status) {
  router.push({ path: '/records', query: { status } })
}

/** 跳转客户管理页 */
function goCustomers() {
  router.push('/customers')
}

const { customers, getById: getCustomer } = useCustomers()
const { sessions, refresh: refreshSessions } = useSessions()

const completedCount = computed(() => sessions.value.filter((s) => s.status === 'completed').length)
const customerCount = computed(() => customers.value.length)
const pendingCount = computed(() => sessions.value.filter((s) => s.status === 'pending').length)
const todaySessionsAll = computed(() =>
  sessions.value.filter((s) => sameDay(s.start, Date.now())).sort((a, b) => a.start - b.start)
)
const todayCount = computed(() => todaySessionsAll.value.length)
const todayPending = computed(() => todaySessionsAll.value.filter((s) => s.status === 'pending').length)
const todayCompleted = computed(
  () => todaySessionsAll.value.filter((s) => s.status === 'completed').length
)
const todaySessions = todaySessionsAll

function customerName(id) {
  return getCustomer(id)?.name || '未知客户'
}

function tagType(s) {
  return { pending: 'primary', completed: 'success' }[s] || 'info'
}
function tagText(s) {
  return { pending: '待上课', completed: '已完成' }[s] || s
}

// 排课弹窗状态
const sessionDialogVisible = ref(false)
const editingSession = ref(null)
function openCreateSession() {
  editingSession.value = null
  sessionDialogVisible.value = true
}
function openEditSession(s) {
  editingSession.value = s
  sessionDialogVisible.value = true
}
async function onSessionSaved() {
  await refreshSessions()
}

// 客户弹窗状态
const customerDialogVisible = ref(false)
const editingCustomer = ref(null)
function openCreateCustomer() {
  editingCustomer.value = null
  customerDialogVisible.value = true
}
function onCustomerSaved() {
  // 客户列表为单例 ref，弹窗保存后已自动刷新
}
</script>

<style scoped>
/* 统一模块间距：今日排课 / 三卡并排 / 快捷操作 / 今日列表 */
.stat-grid {
  margin-bottom: 12px;
}
.mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.quick-actions {
  display: flex;
  gap: 10px;
  margin: 0 0 12px;
}
.record-item {
  cursor: pointer;
}
/* 今日排课卡片：跨整行、放大加粗数字、多巴胺粉紫渐变底，重点展示 */
.today-card {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #fff0f6, #f5ecff);
  padding: 16px;
}
.today-card .icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  font-size: 24px;
}
.today-card .num {
  font-size: 40px;
  font-weight: 800;
}
.today-card .label {
  font-size: 13px;
  font-weight: 600;
}
.today-sub {
  font-size: 13px;
  font-weight: 500;
  color: var(--cn-text-secondary);
  margin-top: 4px;
}
/* 已上课 / 待上课 / 客户总数：三卡并排一行，数字放大加粗 */
.stat-card.mini {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px 4px;
  text-align: center;
  min-width: 0;
}
.stat-card.mini .icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 16px;
}
.stat-card.mini .num {
  font-size: 24px;
  font-weight: 800;
}
.stat-card.mini .label {
  font-size: 12px;
  font-weight: 500;
  margin-top: 0;
}
/* 快捷操作按钮：放大加粗 */
.quick-actions :deep(.el-button) {
  font-size: 16px;
  font-weight: 700;
}
/* 今日排课列表：时间与客户名放大加粗 */
.record-item .t-main {
  font-size: 16px;
}
.record-item .name {
  font-size: 16px;
  font-weight: 700;
}
</style>
