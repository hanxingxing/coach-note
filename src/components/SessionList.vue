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
          <el-icon class="export-btn" title="导出ICS" @click.stop="onExport(s)">
            <Download />
          </el-icon>
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
import { fmtWeekday, fmtTime } from '../utils/time'
import { buildIcs, sessionToVevent, downloadIcs, icsFileStamp } from '../utils/ics'

/**
 * 排课列表视图
 * - 支持按状态、按客户筛选（客户详情页可跳转查看单个客户全部排课）
 * - 每条排课可直接导出 ICS
 */

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  customers: { type: Array, default: () => [] },
  /** 筛选条件 { status, customerId }（v-model 双向绑定） */
  filters: { type: Object, default: () => ({ status: '', customerId: null }) }
})
const emit = defineEmits(['edit', 'update:filters'])

const { getById: getCustomer } = useCustomers()
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

/** 按日期倒序分组（近的在前） */
const grouped = computed(() => {
  const filtered = props.sessions
    .filter((s) => {
      if (local.value.status && s.status !== local.value.status) return false
      if (local.value.customerId && s.customerId !== local.value.customerId) return false
      return true
    })
    .sort((a, b) => b.start - a.start)

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
  align-items: flex-start;
  cursor: pointer;
}
.export-btn {
  color: var(--cn-text-hint);
  font-size: 17px;
  padding: 6px;
  flex-shrink: 0;
}
</style>
