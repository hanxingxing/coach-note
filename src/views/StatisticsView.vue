<template>
  <div>
    <!-- 返回栏 -->
    <div class="back-bar">
      <el-button circle :icon="ArrowLeft" @click="goBack" />
      <div class="stats-title">汇总统计</div>
    </div>

    <!-- 总览统计（点击可定位到对应区块） -->
    <div class="stat-grid">
      <div class="stat-card clickable" @click="scrollTo('sec-completed')">
        <div class="icon i-success">
          <el-icon><Finished /></el-icon>
        </div>
        <div>
          <div class="num">{{ completedCount }}</div>
          <div class="label">已上课（节）</div>
        </div>
      </div>
      <div class="stat-card clickable" @click="scrollTo('sec-pending')">
        <div class="icon i-warning">
          <el-icon><Clock /></el-icon>
        </div>
        <div>
          <div class="num">{{ pendingCount }}</div>
          <div class="label">待上课（节）</div>
        </div>
      </div>
      <div class="stat-card clickable full" @click="router.push('/customers')">
        <div class="icon i-primary">
          <el-icon><User /></el-icon>
        </div>
        <div>
          <div class="num">{{ customerCount }}</div>
          <div class="label">客户总数（人）</div>
        </div>
        <el-icon class="card-arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 今日排课 -->
    <section id="sec-today" class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="#f56c6c"><Calendar /></el-icon>
        今日排课
      </h3>
      <template v-if="todaySessions.length">
        <div v-for="s in todaySessions" :key="s.id" class="record-item">
          <div class="time-col">
            <div class="t-main">{{ fmtTime(s.start) }}</div>
            <div class="t-sub">{{ fmtTime(s.end) }}</div>
          </div>
          <div class="info-col">
            <div class="row1">
              <span class="name">{{ customerName(s.customerId) }}</span>
              <el-tag :type="tagType(s.status)" size="small">{{ tagText(s.status) }}</el-tag>
            </div>
            <div v-if="s.note" class="row2">{{ s.note }}</div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">今天暂无排课</div>
    </section>

    <!-- 待上课列表 -->
    <section id="sec-pending" class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="#e6a23c"><Clock /></el-icon>
        待上课列表
      </h3>
      <template v-if="pendingGroups.length">
        <div v-for="g in pendingGroups" :key="g.date" class="list-group">
          <div class="group-title">
            {{ g.date }}
            <span class="weekday">{{ fmtWeekday(g.list[0].start) }}</span>
            <span class="count">{{ g.list.length }} 节</span>
          </div>
          <div v-for="s in g.list" :key="s.id" class="record-item">
            <div class="time-col">
              <div class="t-main">{{ fmtTime(s.start) }}</div>
              <div class="t-sub">{{ fmtTime(s.end) }}</div>
            </div>
            <div class="info-col">
              <div class="row1"><span class="name">{{ customerName(s.customerId) }}</span></div>
              <div v-if="s.note" class="row2">{{ s.note }}</div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">暂无待上课排课</div>
    </section>

    <!-- 已完成记录 -->
    <section id="sec-completed" class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="#67c23a"><Finished /></el-icon>
        已完成记录
      </h3>
      <template v-if="completedGroups.length">
        <div v-for="g in completedGroups" :key="g.date" class="list-group">
          <div class="group-title">
            {{ g.date }}
            <span class="weekday">{{ fmtWeekday(g.list[0].start) }}</span>
            <span class="count">{{ g.list.length }} 节</span>
          </div>
          <div v-for="s in g.list" :key="s.id" class="record-item">
            <div class="time-col">
              <div class="t-main">{{ fmtTime(s.start) }}</div>
              <div class="t-sub">{{ fmtTime(s.end) }}</div>
            </div>
            <div class="info-col">
              <div class="row1"><span class="name">{{ customerName(s.customerId) }}</span></div>
              <div v-if="s.note" class="row2">{{ s.note }}</div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">暂无已完成记录</div>
    </section>

    <!-- 客户课时一览 -->
    <div class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="#409eff"><User /></el-icon>
        客户课时一览
      </h3>
      <template v-if="customers.length">
        <div v-for="c in customers" :key="c.id" class="lesson-row">
          <div class="avatar">{{ c.name.slice(0, 1) }}</div>
          <div class="lr-info">
            <span class="lr-name">{{ c.name }}</span>
            <span v-if="c.gender" class="lr-gender" :class="c.gender === '男' ? 'male' : 'female'">{{ c.gender }}</span>
          </div>
          <div class="lr-nums">
            <span class="lr-done">已完成 {{ customerCompletedCount(c.id) }} 节</span>
            <span class="lr-lessons" :class="{ zero: c.remainingLessons <= 0 }">
              剩余 {{ c.remainingLessons }} 节
            </span>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">暂无客户</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import { fmtTime, fmtWeekday, sameDay, fmtDate } from '../utils/time'

/**
 * 汇总统计页
 * 首页统计卡片跳转目标：
 * - 已上课（focus=completed）→ 已完成记录区块
 * - 待上课（focus=pending）→ 待上课列表区块
 * - 今日排课（focus=today）→ 今日排课区块
 * 同时提供客户课时一览（剩余课时 / 已完成节数）
 */

const route = useRoute()
const router = useRouter()

const { customers, getById: getCustomer } = useCustomers()
const { sessions } = useSessions()

const completedCount = computed(() => sessions.value.filter((s) => s.status === 'completed').length)
const pendingCount = computed(() => sessions.value.filter((s) => s.status === 'pending').length)
const customerCount = computed(() => customers.value.length)

const todaySessions = computed(() =>
  sessions.value.filter((s) => sameDay(s.start, Date.now())).sort((a, b) => a.start - b.start)
)

/** 按日期分组（日期倒序） */
function groupByDate(list) {
  const sorted = [...list].sort((a, b) => b.start - a.start)
  const map = new Map()
  for (const s of sorted) {
    const key = fmtDate(s.start)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return Array.from(map.entries()).map(([date, list2]) => ({ date, list: list2 }))
}

const pendingGroups = computed(() =>
  groupByDate(sessions.value.filter((s) => s.status === 'pending'))
)
const completedGroups = computed(() =>
  groupByDate(sessions.value.filter((s) => s.status === 'completed'))
)

function customerName(id) {
  return getCustomer(id)?.name || '未知客户'
}

function customerCompletedCount(id) {
  return sessions.value.filter((s) => s.customerId === id && s.status === 'completed').length
}

function tagType(s) {
  return { pending: 'primary', completed: 'success' }[s] || 'info'
}
function tagText(s) {
  return { pending: '待上课', completed: '已完成' }[s] || s
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

/** 定位滚动到指定区块 */
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  // 首页跳转带 focus 参数时自动定位到对应区块
  if (route.query.focus) {
    await nextTick()
    scrollTo(`sec-${route.query.focus}`)
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
.stats-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cn-text);
}
section,
.cn-card {
  scroll-margin-top: 72px;
}
.lesson-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid #f0f2f5;
  min-width: 0;
}
.lesson-row:last-child {
  border-bottom: none;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec4, #a78bfa);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lr-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.lr-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--cn-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lr-gender {
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  margin-left: 6px;
  flex-shrink: 0;
}
.lr-gender.male {
  color: #4da3e8;
  background: #e8f4ff;
}
.lr-gender.female {
  color: var(--cn-primary);
  background: #ffeaf2;
}
.lr-nums {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lr-done {
  font-size: 12px;
  color: var(--cn-success);
}
.lr-lessons {
  font-size: 12px;
  color: var(--cn-text-secondary);
}
.lr-lessons.zero {
  color: var(--cn-danger);
  font-weight: 600;
}
</style>
