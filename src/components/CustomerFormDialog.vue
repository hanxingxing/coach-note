<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑客户' : '新增客户'"
    class="cn-dialog"
    width="94%"
    append-to-body
  >
    <el-form label-position="top" size="large">
      <el-form-item label="姓名" required>
        <el-input v-model="form.name" placeholder="客户姓名" maxlength="20" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="form.phone" placeholder="手机号（选填）" maxlength="20" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="genderRadio">
          <el-radio-button value="male">男</el-radio-button>
          <el-radio-button value="female">女</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="剩余课时（节）" required>
        <el-input-number v-model="form.remainingLessons" :min="0" :max="9999" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="3" placeholder="学员情况、训练计划等（选填）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCustomers } from '../composables/useCustomers'

const props = defineProps({
  /** 弹窗显隐 */
  modelValue: { type: Boolean, default: false },
  /** 编辑时传入的客户对象；新增传 null */
  customer: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { addCustomer, updateCustomer } = useCustomers()

const visible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
/** 性别单选：male=男 / female=女（仅两个可选项） */
const genderRadio = ref('male')
const form = reactive({ name: '', phone: '', remainingLessons: 0, note: '' })

/** 性别中文 → 单选值 */
function genderToRadio(gender) {
  if (gender === '男') return 'male'
  if (gender === '女') return 'female'
  return 'male' // 旧数据无性别时默认男
}

/** 单选值 → 性别中文 */
function radioToGender(val) {
  if (val === 'male') return '男'
  if (val === 'female') return '女'
  return ''
}

// 弹窗打开时初始化表单
watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v) initForm()
  }
)
watch(visible, (v) => emit('update:modelValue', v))

function initForm() {
  isEdit.value = !!props.customer
  genderRadio.value = props.customer ? genderToRadio(props.customer.gender) : 'male'
  if (props.customer) {
    form.name = props.customer.name || ''
    form.phone = props.customer.phone || ''
    form.remainingLessons = props.customer.remainingLessons || 0
    form.note = props.customer.note || ''
  } else {
    form.name = ''
    form.phone = ''
    form.remainingLessons = 0
    form.note = ''
  }
}

async function onSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写客户姓名')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, gender: radioToGender(genderRadio.value), name: form.name.trim() }
    if (isEdit.value) {
      await updateCustomer(props.customer.id, payload)
    } else {
      await addCustomer(payload)
    }
    ElMessage.success(isEdit.value ? '客户已更新' : '客户已添加')
    visible.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
