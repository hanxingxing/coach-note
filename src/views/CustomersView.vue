<template>
  <div>
    <!-- 搜索 + 新增 -->
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索姓名 / 电话" clearable style="flex: 1">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
    </div>

    <!-- 客户列表 -->
    <template v-if="filtered.length">
      <div v-for="c in filtered" :key="c.id" class="customer-card">
        <div class="avatar">{{ c.name.slice(0, 1) }}</div>
        <div class="c-info">
          <div class="c-row1">
            <span class="c-name">{{ c.name }}</span>
            <span
              v-if="c.gender"
              class="c-gender"
              :class="c.gender === '男' ? 'male' : 'female'"
            >{{ c.gender }}</span>
            <span class="c-lessons" :class="{ zero: c.remainingLessons <= 0 }">
              剩余 {{ c.remainingLessons }} 节
            </span>
          </div>
          <div class="c-row2">
            <el-icon style="margin-right: 2px"><Iphone /></el-icon>
            {{ c.phone || '未填写电话' }}
          </div>
          <div v-if="c.note" class="c-row3">{{ c.note }}</div>
        </div>
        <div class="c-actions">
          <el-button size="small" text type="primary" @click="viewSessions(c)">
            <el-icon><Calendar /></el-icon>
          </el-button>
          <el-button size="small" text type="primary" @click="openEdit(c)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" text type="danger" @click="openDelete(c)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </template>
    <el-empty v-else description="暂无客户，点击右上角「新增」添加" :image-size="80" />

    <CustomerFormDialog v-model="dialogVisible" :customer="editingCustomer" @saved="onSaved" />

    <!-- 删除客户确认对话框（el-dialog 形式，提示级联删除风险） -->
    <el-dialog
      v-model="deleteVisible"
      title="删除客户"
      class="cn-dialog"
      width="92%"
      append-to-body
    >
      <div class="del-tip">
        <p class="del-main">确认删除客户「<b>{{ pendingDelete?.name }}</b>」？</p>
        <p class="del-sub">
          该客户剩余的 {{ pendingDelete?.remainingLessons ?? 0 }} 节课时将被一并清除，
          其全部排课记录也会被删除，此操作<b>不可恢复</b>。
        </p>
      </div>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="onDeleteConfirm">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CustomerFormDialog from '../components/CustomerFormDialog.vue'
import { useCustomers } from '../composables/useCustomers'

/**
 * 客户管理页：新增 / 编辑 / 删除客户
 * 点击日历图标可查看该客户的全部排课记录（跳转排课页列表视图并自动筛选）
 */

const router = useRouter()
const { customers, refresh, deleteCustomer } = useCustomers()

const keyword = ref('')
const dialogVisible = ref(false)
const editingCustomer = ref(null)
// 删除确认对话框状态
const deleteVisible = ref(false)
const deleting = ref(false)
const pendingDelete = ref(null)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return customers.value
  return customers.value.filter(
    (c) => c.name.toLowerCase().includes(kw) || (c.phone || '').includes(kw)
  )
})

function openCreate() {
  editingCustomer.value = null
  dialogVisible.value = true
}
function openEdit(c) {
  editingCustomer.value = c
  dialogVisible.value = true
}
async function onSaved() {
  await refresh()
}

/** 打开删除确认对话框 */
function openDelete(c) {
  pendingDelete.value = c
  deleteVisible.value = true
}

/** 确认删除客户 */
async function onDeleteConfirm() {
  const c = pendingDelete.value
  if (!c) return
  deleting.value = true
  try {
    await deleteCustomer(c.id)
    ElMessage.success(`客户「${c.name}」已删除`)
    deleteVisible.value = false
    pendingDelete.value = null
  } finally {
    deleting.value = false
  }
}

/** 查看单个客户的全部排课记录 */
function viewSessions(c) {
  router.push({ path: '/calendar', query: { view: 'list', customer: c.id } })
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--cn-card-bg);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: var(--cn-shadow);
  min-width: 0;
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec4, #a78bfa);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.c-info {
  flex: 1;
  min-width: 0;
}
.c-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.c-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--cn-text);
}
.c-gender {
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  flex-shrink: 0;
}
.c-gender.male {
  color: #4da3e8;
  background: #e8f4ff;
}
.c-gender.female {
  color: var(--cn-primary);
  background: #ffeaf2;
}
.c-lessons {
  font-size: 12px;
  color: var(--cn-success);
  background: #e7f9ef;
  padding: 1px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}
.c-lessons.zero {
  color: var(--cn-danger);
  background: #ffecec;
}
.c-row2 {
  font-size: 12px;
  color: var(--cn-text-hint);
  margin-top: 3px;
  display: flex;
  align-items: center;
}
.c-row3 {
  font-size: 12px;
  color: var(--cn-text-secondary);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c-actions {
  display: flex;
  flex-shrink: 0;
}
/* 删除确认对话框 */
.del-tip {
  line-height: 1.8;
}
.del-main {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--cn-text);
}
.del-sub {
  margin: 0;
  font-size: 13px;
  color: var(--cn-text-secondary);
}
</style>
