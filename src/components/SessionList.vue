<template>
  <div>
    <!-- 筛选栏：状态 + 客户（支持查看单个客户的全部排课） -->
    <div class="filter-bar">
      <el-select
        v-model="local.status"
        placeholder="全部状态"
        clearable
        style="flex: 1"
        @change="onFilterChange"
      >
        <el-option label="待上课" value="pending" />
        <el-option label="已完成" value="completed" />
      </el-select>
      <el-select
        v-model="local.customerId"
        placeholder="全部客户"
        clearable
        filterable
        style="flex: 1.4"
        @change="onFilterChange"
      >
        <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
    </div>

    <!-- 按日期分组的排课列表 -->
    <template v-if="grouped.length">
      <div v-for="g in grouped" :key="g.date" class="list-group">
        <div class="group-title">
          {{ g.date }}
          <span class="weekday">{{ fmtWeekday(g.list[0].start) }}</span>
          <span class="count">{{ g.list.length }} 节</span>
        </div>
        <div
          v-for="s in g.list"
          :key="s.id"
          class="record-item session-item"
          @click="emit('edit', s)"
        >
          <div class="time-col">
            <div class="t-main">{{ fmtTime(s.start) }}</div>
            <div class="t-sub">{{ fmtTime(s.end) }}</div>
          </div>
          <div class="info-col">
            <div class="row1">
              <span class="name">{{ customerName(s.customerId) }}</span>
              <el-tag :type="statusTagType(s.status)" size="small" effect="light">
                {{ statusText(s.status) }}
              </el-tag>
            </div>
            <div v-if="s.note" class="row2">{{ s.note }}</div>
          </div>
          <!-- 上课 / 快捷下课 / 导出ICS（逻辑与日视图完全一致） -->
          <div class="session-actions" @click.stop>
            <el-button
              v-if="s.status === 'pending'"
              class="quick-btn start-btn"
              size="small"
              circle
              title="上课（复制到店通知）"
              @click="onQuickStart(s)"
            >
              <el-icon><VideoPlay /></el-icon>
            </el-button>
            <el-button
              v-if="s.status === 'pending'"
              class="quick-btn finish-btn"
              size="small"
              circle
              title="快捷下课（标记已完成并扣减 1 节课时）"
              @click="onQuickComplete(s)"
            >
              <el-icon><Check /></el-icon>
            </el-button>
            <el-icon class="export-btn" title="导出ICS" @click.stop="onExport(s)">
              <Download />
            </el-icon>
          </div>
        </div>
      </div>
    </template>
    <el-empty v-else description="暂无排课记录" :image-size="80" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCustomers } from '../composables/useCustomers'
import { useClassActions } from '../composables/useClassActions'
import { fmtWeekday, fmtTime } from '../utils/time'
import { buildIcs, sessionToVevent, downloadIcs, icsFileStamp } from '../utils/ics'

/**
 * 排课列表视图
 * - 支持按状态、按客户筛选（客户详情页可跳转查看单个客户全部排课）
 * - 待上课条目提供 上课 / 快捷下课 按钮（逻辑、特效与日视图一致），每条可导出 ICS
 */

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  customers: { type: Array, default: () => [] },
  /** 筛选条件 { status, customerId }（v-model 双向绑定） */
  filters: { type: Object, default: () => ({ status: '', customerId: null }) }
})
const emit = defineEmits(['edit', 'update:filters'])

const { getById: getCustomer } = useCustomers()
// 上课/下课共享操作（庆祝弹窗由宿主页面渲染，实例状态共享）
const { onQuickStart, onQuickComplete } = useClassActions()
const local = ref({ status: props.filters.status || '', customerId: props.filters.customerId || null })

// 外部筛选条件变化时同步（如从客户页跳转进入）
watch(
  () => props.filters,
  (f) => {
    local.value.status = f.status || ''
    local.value.customerId = f.customerId || null
  },
  { deep: true }
)

function onFilterChange() {
  emit('update:filters', {
    status: local.value.status || '',
    customerId: local.value.customerId || null
  })
}

/** 按日期分组；组内与日期均按时间从早到晚、由近到远排序 */
const grouped = computed(() => {
  const filtered = props.sessions
    .filter((s) => {
      if (local.value.status && s.status !== local.value.status) return false
      if (local.value.customerId && s.customerId !== local.value.customerId) return false
      return true
    })
    .sort((a, b) => a.start - b.start)

  const map = new Map()
  for (const s of filtered) {
    const key = new Date(s.start).toLocaleDateString('zh-CN')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return Array.from(map.entries()).map(([date, list]) => ({ date, list }))
})

function customerName(id) {
  return getCustomer(id)?.name || '未知客户'
}

function statusText(s) {
  return { pending: '待上课', completed: '已完成' }[s] || s
}

function statusTagType(s) {
  return { pending: 'primary', completed: 'success' }[s] || 'info'
}

/** 导出单条排课 ICS */
function onExport(s) {
  const content = buildIcs([sessionToVevent(s, getCustomer(s.customerId))])
  downloadIcs(`coachnote-${icsFileStamp(s.start)}.ics`, content)
  ElMessage.success('ICS 已导出，可导入 iPhone 系统日历')
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.session-item {
  align-items: center;
  cursor: pointer;
}
/* 上课/下课/导出按钮列（按钮视觉统一在全局 .quick-btn） */
.session-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.session-actions .quick-btn {
  width: auto;
}
.session-actions .quick-btn:active {
  transform: scale(0.94);
}
.export-btn {
  color: var(--cn-text-hint);
  font-size: 17px;
  padding: 6px;
  flex-shrink: 0;
}
</style>
