<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑排课' : '新建排课'"
    class="cn-dialog"
    width="94%"
    append-to-body
  >
    <el-form label-position="top" size="large">
      <!-- 客户 + 排课状态：新增模式分行展示（放大客户区域）；编辑模式保持并列 -->
      <div class="form-row" :class="{ stacked: !isEdit }">
        <el-form-item label="客户" required :style="isEdit ? 'flex: 1.6; min-width: 0' : ''">
          <!-- 新增排课：客户标签展示全部客户 -->
          <template v-if="showAllCustomerTags">
            <div v-if="customers.length" class="customer-tags">
              <span
                v-for="c in customers"
                :key="c.id"
                class="ctag"
                :class="{ active: form.customerId === c.id }"
                @click="toggleCustomer(c.id)"
              >
                {{ c.name }}<i v-if="form.customerId === c.id" class="ctag-sub">剩{{ c.remainingLessons }}节</i>
              </span>
            </div>
            <div v-else class="customer-empty">
              <span>暂无客户，</span>
              <el-button type="primary" link @click="goCustomers">去添加客户</el-button>
            </div>
          </template>
          <!-- 编辑排课：默认只展示当前绑定客户，点击标签弹窗更换 -->
          <template v-else>
            <div class="customer-tags">
              <span class="ctag active edit-tag" @click="openCustomerPicker">
                {{ currentCustomer.name }}<i class="ctag-sub">剩{{ currentCustomer.remainingLessons }}节</i>
                <el-icon class="ctag-edit-icon"><EditPen /></el-icon>
              </span>
            </div>
          </template>
        </el-form-item>
        <el-form-item label="排课状态" :style="isEdit ? 'flex: 1; min-width: 0' : ''">
          <el-radio-group v-model="form.status" class="status-group" :style="!isEdit && 'flex-direction: row'">
            <el-radio-button value="pending">待上课</el-radio-button>
            <el-radio-button value="completed">已完成</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item label="日期" required style="flex: 1">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="x"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间" required style="flex: 1">
          <el-time-select
            v-model="form.startTime"
            start="09:00"
            end="22:00"
            step="00:30"
            placeholder="开始时间"
            style="width: 100%"
          />
        </el-form-item>
      </div>

      <!-- 课时扣减提示 -->
      <div v-if="form.status === 'completed'" class="status-hint">
        <el-alert
          :type="customerRemaining <= 0 ? 'error' : 'warning'"
          :closable="false"
          show-icon
          :title="
            customerRemaining <= 0
              ? '该客户剩余课时为 0，无法标记为已完成（禁止扣减）'
              : `标记为已完成将自动扣减 1 节剩余课时（当前剩余 ${customerRemaining} 节）`
          "
        />
      </div>

      <el-form-item label="上课小结备注">
        <div class="note-tags">
          <span
            v-for="t in NOTE_TAGS"
            :key="t"
            class="note-tag"
            :class="{ active: noteHasTag(t) }"
            @click="toggleNoteTag(t)"
          >{{ t }}</span>
        </div>
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="点击上方标签快速填入（胸/肩/背/腿/功能），也可自由编辑"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button v-if="isEdit" type="danger" plain @click="onDelete">删除</el-button>
      <el-button @click="onExportIcs">
        <el-icon style="margin-right: 4px"><Download /></el-icon>导出ICS
      </el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>

  <!-- 更换客户弹窗（编辑排课时使用）：在弹窗内重新选择其他客户 -->
  <el-dialog
    v-model="pickerVisible"
    title="更换客户"
    class="cn-dialog"
    width="92%"
    append-to-body
  >
    <div v-if="customers.length" class="customer-tags">
      <span
        v-for="c in customers"
        :key="c.id"
        class="ctag"
        :class="{ active: form.customerId === c.id }"
        @click="pickCustomer(c.id)"
      >
        {{ c.name }}<i v-if="form.customerId === c.id" class="ctag-sub">剩{{ c.remainingLessons }}节</i>
      </span>
    </div>
    <div v-else class="customer-empty">暂无其他客户，可先到「客户」页添加</div>
    <template #footer>
      <el-button @click="pickerVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import { startOfDay, fmtTime } from '../utils/time'
import { buildIcs, sessionToVevent, downloadIcs, icsFileStamp } from '../utils/ics'

/** 上课时间范围：早 09:00 — 晚 22:00（排课不允许超出） */
const WORK_START_MINUTES = 9 * 60
const WORK_END_MINUTES = 22 * 60

const props = defineProps({
  /** 弹窗显隐 */
  modelValue: { type: Boolean, default: false },
  /** 预填参数 { customerId?, start?, end? }（日视图点击空白时间等场景） */
  preset: { type: Object, default: null },
  /** 编辑时传入的排课对象；新增传 null */
  session: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const router = useRouter()

const { customers, getById: getCustomer, updateCustomer } = useCustomers()
const { saveSession, deleteSession } = useSessions()

const visible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
/** 更换客户弹窗显隐（编辑排课时使用） */
const pickerVisible = ref(false)
const form = reactive({
  customerId: null,
  date: null,
  startTime: '10:00',
  status: 'pending',
  note: ''
})

/** 当前绑定客户 */
const currentCustomer = computed(() => (form.customerId ? getCustomer(form.customerId) : null))

/** 新增模式展示全部客户；编辑模式默认仅展示绑定客户（绑定客户不存在时回退展示全部） */
const showAllCustomerTags = computed(() => !isEdit.value || !currentCustomer.value)

/** 点击客户标签：单选切换（新增模式，再次点击取消选中） */
function toggleCustomer(id) {
  form.customerId = form.customerId === id ? null : id
}

/** 编辑模式：打开更换客户弹窗 */
function openCustomerPicker() {
  pickerVisible.value = true
}

/** 在更换客户弹窗中选择新客户 */
function pickCustomer(id) {
  form.customerId = id
  pickerVisible.value = false
}

/** 小结备注快捷标签（点击快速填入，仍支持自由编辑） */
const NOTE_TAGS = ['胸', '肩', '背', '腿', '功能']

/** 备注中是否已包含该标签 */
function noteHasTag(t) {
  return form.note.split(/[、,，\s]+/).includes(t)
}

/** 点击标签：已存在则移除，不存在则追加（以「、」连接） */
function toggleNoteTag(t) {
  const parts = form.note.split(/[、,，\s]+/).filter(Boolean)
  const idx = parts.indexOf(t)
  if (idx >= 0) parts.splice(idx, 1)
  else parts.push(t)
  form.note = parts.join('、')
}

/** 跳转客户管理页 */
function goCustomers() {
  visible.value = false
  router.push('/customers')
}

const customerRemaining = computed(() => {
  const c = getCustomer(form.customerId)
  return c ? c.remainingLessons : 0
})

/** 排课开始时间戳 */
const startTs = computed(() => {
  if (!form.date || !form.startTime) return null
  const [h, m] = form.startTime.split(':').map(Number)
  return startOfDay(form.date) + h * 3600000 + m * 60000
})

/** 排课结束时间戳（每节固定 60 分钟，无时长选择） */
const endTs = computed(() => {
  if (!startTs.value) return null
  return startTs.value + 60 * 60000
})

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v) initForm()
  }
)
watch(visible, (v) => emit('update:modelValue', v))

/**
 * 新建排课默认开始时间：当前时间往后最近的半小时整点（如 14:37 → 15:00，14:12 → 14:30）
 * 恰好整点则顺延半小时；超出可排课范围 [09:00, 21:30] 时回退到 09:00
 */
function nextHalfHour() {
  const d = new Date()
  let next = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30
  if (next === d.getHours() * 60 + d.getMinutes()) next += 30
  if (next < 9 * 60) next = 9 * 60
  if (next > 21 * 60 + 30) next = 9 * 60
  const h = Math.floor(next / 60)
  const m = next % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 初始化表单：编辑模式取排课数据，否则取预填参数（每节固定 60 分钟） */
function initForm() {
  if (props.session) {
    isEdit.value = true
    form.customerId = props.session.customerId
    form.date = startOfDay(props.session.start)
    form.startTime = fmtTime(props.session.start)
    form.status = props.session.status || 'pending'
    form.note = props.session.note || ''
  } else {
    isEdit.value = false
    form.customerId = props.preset?.customerId ?? null
    form.date = props.preset?.start ? startOfDay(props.preset.start) : startOfDay(Date.now())
    form.startTime = props.preset?.start ? fmtTime(props.preset.start) : nextHalfHour()
    form.status = 'pending'
    form.note = ''
  }
}

/** 时间戳在当天 0 点起的分钟数 */
function minutesOfDay(ts) {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

/** 保存（含时间冲突校验与课时扣减逻辑，均在 useSessions 中处理） */
async function onSave() {
  if (!form.customerId) {
    ElMessage.warning('请选择客户')
    return
  }
  if (!form.date) {
    ElMessage.warning('请选择日期')
    return
  }
  if (!form.startTime) {
    ElMessage.warning('请选择开始时间')
    return
  }
  if (!startTs.value || !endTs.value) return

  // 时间范围约束：上课时间整体限定 09:00 - 22:00，不允许超出
  const startM = minutesOfDay(startTs.value)
  const endM = minutesOfDay(endTs.value)
  if (startM < WORK_START_MINUTES || endM > WORK_END_MINUTES) {
    ElMessage.warning('上课时间需在 09:00 - 22:00 之间，且结束时间不能超过 22:00')
    return
  }

  // 新建排课校验：客户剩余课时为 0 时弹出确认弹窗提示是否续课
  // 同意 → 客户课时自动 +1；取消 → 不做修改，继续保存排课
  if (!isEdit.value && customerRemaining.value <= 0 && currentCustomer.value) {
    try {
      await ElMessageBox.confirm(
        `客户「${currentCustomer.value.name}」剩余课时为 0，是否续课 1 节？`,
        '续课提示',
        {
          type: 'warning',
          confirmButtonText: '续课 +1',
          cancelButtonText: '暂不续课'
        }
      )
      await updateCustomer(currentCustomer.value.id, {
        ...currentCustomer.value,
        remainingLessons: currentCustomer.value.remainingLessons + 1
      })
    } catch {
      // 用户取消续课：不做修改，继续保存
    }
  }

  saving.value = true
  try {
    const result = await saveSession(
      {
        customerId: form.customerId,
        start: startTs.value,
        end: endTs.value,
        note: form.note,
        status: form.status
      },
      props.session?.id
    )
    if (result.ok) {
      ElMessage.success('排课已保存')
      visible.value = false
      emit('saved')
    } else {
      ElMessage.warning(result.error)
    }
  } finally {
    saving.value = false
  }
}

/** 删除排课 */
async function onDelete() {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确认删除该排课？', '删除排课', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return // 用户取消
  }
  await deleteSession(props.session.id)
  ElMessage.success('排课已删除')
  visible.value = false
  emit('saved')
}

/** 导出当前排课为 ICS 日历文件（可直接导入 iPhone 系统日历） */
function onExportIcs() {
  if (!startTs.value || !endTs.value) {
    ElMessage.warning('请先选择日期和开始时间')
    return
  }
  const session = {
    id: props.session?.id,
    start: startTs.value,
    end: endTs.value,
    note: form.note,
    status: form.status
  }
  const customer = getCustomer(form.customerId)
  const content = buildIcs([sessionToVevent(session, customer)])
  downloadIcs(`coachnote-${icsFileStamp(startTs.value)}.ics`, content)
  ElMessage.success('ICS 文件已导出，可导入 iPhone 系统日历')
}
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 10px;
}
/* 新建排课：客户与状态分行展示，放大客户标签区域，保证点击空间 */
.form-row.stacked {
  flex-direction: column;
}
.form-row.stacked .el-form-item {
  width: 100%;
}
.form-row.stacked .ctag {
  padding: 10px 18px;
  font-size: 15px;
}
.time-hint {
  font-size: 12px;
  color: #909399;
  margin: -8px 0 14px;
}
.status-hint {
  margin: -4px 0 14px;
}
/* 排课状态：纵向排列，与客户标签并列 */
.status-group {
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}
.customer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}
/* 客户标签：放大，与「排课状态」按钮风格保持一致（圆角胶囊） */
.ctag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: #faf4f8;
  color: var(--cn-text-secondary);
  border: 1px solid #f0e6ec;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}
.ctag.active {
  background: var(--cn-primary);
  border-color: var(--cn-primary);
  color: #fff;
}
.ctag-sub {
  font-style: normal;
  font-size: 11px;
  opacity: 0.85;
}
/* 编辑模式：绑定客户标签 + 更换入口 */
.edit-tag {
  cursor: pointer;
}
.ctag-edit-icon {
  font-size: 13px;
  opacity: 0.9;
}
.customer-edit-hint {
  font-size: 12px;
  color: var(--cn-text-hint);
  margin-top: 6px;
}
.customer-empty {
  font-size: 13px;
  color: var(--cn-text-hint);
  padding: 6px 0;
}
.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.note-tag {
  padding: 4px 14px;
  background: #f4f5f7;
  border: 1px solid #e8eaef;
  color: var(--cn-text-secondary);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  line-height: 30px;
}
.note-tag.active {
  background: var(--cn-primary);
  border-color: var(--cn-primary);
  color: #fff;
}
</style>
