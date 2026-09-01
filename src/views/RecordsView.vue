<template>
  <div>
    <!-- 返回栏 -->
    <div class="back-bar">
      <el-button circle :icon="ArrowLeft" @click="goBack" />
      <div class="page-title">课程记录</div>
    </div>

    <!-- 已上课 / 待上课 切换（支持 ?status=completed|pending 定位） -->
    <el-segmented v-model="statusTab" :options="tabOptions" size="large" class="rec-tabs" />

    <!-- 已上课列表 -->
    <template v-if="statusTab === 'completed'">
      <template v-if="completedList.length">
        <div
          v-for="s in completedList"
          :key="s.id"
          class="record-item rec-row"
          @click="openEdit(s)"
        >
          <div class="rec-date">
            <div class="rec-day">{{ dayNum(s.start) }}</div>
            <div class="rec-meta">{{ monthDay(s.start) }} {{ fmtWeekday(s.start) }}</div>
            <div class="rec-meta">{{ fmtTime(s.start) }}-{{ fmtTime(s.end) }}</div>
          </div>
          <div class="info-col">
            <div class="row1">
              <span class="name">{{ customerName(s.customerId) }}</span>
              <el-tag type="success" size="small">已完成</el-tag>
            </div>
            <div class="row2">{{ s.note || '无课程简述' }}</div>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无已上课记录" :image-size="80" />
    </template>

    <!-- 待上课列表 -->
    <template v-else>
      <template v-if="pendingList.length">
        <div
          v-for="s in pendingList"
          :key="s.id"
          class="record-item rec-row"
          @click="openEdit(s)"
        >
          <div class="rec-date">
            <div class="rec-day">{{ dayNum(s.start) }}</div>
            <div class="rec-meta">{{ monthDay(s.start) }} {{ fmtWeekday(s.start) }}</div>
            <div class="rec-meta">{{ fmtTime(s.start) }}-{{ fmtTime(s.end) }}</div>
          </div>
          <div class="info-col">
            <div class="row1">
              <span class="name">{{ customerName(s.customerId) }}</span>
              <el-tag type="primary" size="small">待上课</el-tag>
            </div>
            <div class="row2">{{ s.note || '无课程简述' }}</div>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无待上课记录" :image-size="80" />
    </template>

    <!-- 排课弹窗（点击记录可查看/编辑） -->
    <SessionFormDialog v-model="dialogVisible" :session="editingSession" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import SessionFormDialog from '../components/SessionFormDialog.vue'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import { fmtTime, fmtWeekday } from '../utils/time'

/**
 * 课程记录页（首页「已上课 / 待上课」导航跳转目标）
 * 每条记录展示：日期（日号 + 月日星期）+ 时间 + 客户 + 课程简述（小结备注）
 */

const route = useRoute()
const router = useRouter()

const { getById: getCustomer } = useCustomers()
const { sessions, refresh: refreshSessions } = useSessions()

const tabOptions = [
  { label: '已上课', value: 'completed' },
  { label: '待上课', value: 'pending' }
]
const statusTab = ref('completed')
const dialogVisible = ref(false)
const editingSession = ref(null)

/** 已上课：按时间倒序（最近在前） */
const completedList = computed(() =>
  sessions.value
    .filter((s) => s.status === 'completed')
    .sort((a, b) => b.start - a.start)
)

/** 待上课：按时间正序（最近的先上课） */
const pendingList = computed(() =>
  sessions.value
    .filter((s) => s.status === 'pending')
    .sort((a, b) => a.start - b.start)
)

function customerName(id) {
  return getCustomer(id)?.name || '未知客户'
}

/** 日号（1-31） */
function dayNum(ts) {
  return new Date(ts).getDate()
}

/** 月-日 */
function monthDay(ts) {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function openEdit(s) {
  editingSession.value = s
  dialogVisible.value = true
}

async function onSaved() {
  await refreshSessions()
}

onMounted(() => {
  // 支持从首页带状态进入：/records?status=completed|pending
  if (route.query.status === 'pending' || route.query.status === 'completed') {
    statusTab.value = route.query.status
  }
})
</script>

<style scoped>
.back-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.page-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cn-text);
}
.rec-tabs {
  margin-bottom: 12px;
  display: block;
}
/* 已上课/待上课 tab 栏：加大高度，排版舒适（圆角样式统一在全局样式） */
.rec-tabs :deep(.el-segmented__item) {
  padding: 10px 0;
  font-size: 15px;
}
.rec-row {
  align-items: center;
  cursor: pointer;
}
.rec-date {
  width: 64px;
  text-align: center;
  flex-shrink: 0;
  padding: 2px 0;
}
.rec-day {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--cn-primary);
}
.rec-meta {
  font-size: 11px;
  color: var(--cn-text-hint);
  margin-top: 1px;
}
</style>
