<template>
  <div>
    <!-- ========== 课前提醒 ========== -->
    <div class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="var(--cn-warning)"><Bell /></el-icon>
        课前提醒
      </h3>
      <div class="setting-row">
        <div class="s-label">课前提醒</div>
        <el-switch v-model="reminderEnabled" @change="onToggleReminder" />
      </div>
      <div class="reminder-hint">固定提前 10 分钟、5 分钟各提醒一次，开启后自动生效</div>
      <el-button class="full-btn" @click="onTestNotify">发送测试通知</el-button>
    </div>

    <!-- ========== 通知权限（独立卡片，置于中间区域，内容居中） ========== -->
    <div class="cn-card notify-card">
      <h3 class="cn-card-title">
        <el-icon color="var(--cn-primary)"><BellFilled /></el-icon>
        通知权限
      </h3>
      <div class="notify-center">
        <el-tag :type="permissionTag.type" size="large" effect="light">
          {{ permissionTag.text }}
        </el-tag>
        <el-button
          class="notify-btn"
          :type="permission === 'granted' ? 'success' : 'primary'"
          @click="onRequestPermission"
        >
          {{ permission === 'granted' ? '通知已授权' : '开启通知授权' }}
        </el-button>
      </div>
      <div class="tip-box">
        <b>iPhone 使用说明：</b>网页通知仅在「添加到主屏幕」安装为独立应用后可用（iOS 16.4+），
        且应用打开时才会触发提醒。如需可靠兜底，请使用「导出 ICS → 导入系统日历」。
      </div>
    </div>

    <!-- ========== 数据管理 ========== -->
    <div class="cn-card">
      <h3 class="cn-card-title">
        <el-icon color="var(--cn-success)"><FolderOpened /></el-icon>
        数据管理
      </h3>
      <p class="data-note">
        数据全部保存在本机浏览器 IndexedDB 中。建议定期导出 JSON 备份，换机 / 清缓存后可通过导入恢复。
      </p>
      <el-button class="data-btn" @click="onExport">
        <el-icon style="margin-right: 4px"><Download /></el-icon>一键导出全部数据（JSON）
      </el-button>
      <el-button class="data-btn" @click="fileInput?.click()">
        <el-icon style="margin-right: 4px"><Upload /></el-icon>一键导入数据（JSON）
      </el-button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="onImport"
      />
      <el-button class="data-btn" @click="onExportAllIcs">
        <el-icon style="margin-right: 4px"><Calendar /></el-icon>导出全部排课为 ICS
      </el-button>
      <el-popconfirm
        title="将清空全部客户、排课与设置，且不可恢复，确认？"
        confirm-button-text="清空"
        cancel-button-text="取消"
        @confirm="onClearAll"
      >
        <template #reference>
          <el-button class="data-btn" type="danger" plain>清空全部数据</el-button>
        </template>
      </el-popconfirm>
    </div>

    <p class="version">章章 CoachNote v1.0.0 · 纯本地运行，数据不出手机</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCustomers } from '../composables/useCustomers'
import { useSessions } from '../composables/useSessions'
import { useSettings } from '../composables/useSettings'
import { useNotifications } from '../composables/useNotifications'
import { useDataTools } from '../composables/useDataTools'
import { buildIcs, sessionToVevent, downloadIcs } from '../utils/ics'

/**
 * 设置页：课程提醒 / 数据管理（导出导入）
 * （排课设置已移除：上课时间固定 09:00-22:00；数据规则说明模块已删除）
 */

const { refresh: refreshCustomers, getById: getCustomerById } = useCustomers()
const { sessions, refresh: refreshSessions } = useSessions()
const { settings, loadSettings, saveSettings } = useSettings()
const { supported, permission, requestPermission, notify } = useNotifications()
const { exportData, importData, clearAll } = useDataTools()

const fileInput = ref(null)

// 提醒开关状态
const reminderEnabled = ref(settings.value.reminderEnabled)

const permissionTag = computed(() => {
  const map = {
    granted: { type: 'success', text: '已授权' },
    denied: { type: 'danger', text: '已拒绝' },
    default: { type: 'warning', text: '未授权' },
    unsupported: { type: 'info', text: '此浏览器不支持' }
  }
  return map[permission.value] || { type: 'info', text: permission.value }
})

onMounted(async () => {
  await loadSettings()
  reminderEnabled.value = settings.value.reminderEnabled
})

/** 请求通知授权（需用户点击触发） */
async function onRequestPermission() {
  if (!supported) {
    ElMessage.warning('当前浏览器不支持通知；iPhone 请添加主屏幕后使用独立应用')
    return
  }
  const result = await requestPermission()
  if (result === 'granted') {
    ElMessage.success('通知授权成功，课前提醒已生效')
  } else if (result === 'denied') {
    ElMessage.warning('已拒绝通知，可在 iPhone「设置」中重新开启')
  } else {
    ElMessage.info('未选择，请在弹窗中点击「允许」')
  }
}

async function onToggleReminder(v) {
  await saveSettings({ reminderEnabled: v })
  ElMessage.success(v ? '课前提醒已开启' : '课前提醒已关闭')
}

function onTestNotify() {
  if (permission.value !== 'granted') {
    ElMessage.warning('请先开启通知授权')
    return
  }
  const ok = notify('课记测试通知', { body: '通知功能正常，课前提醒即将生效' })
  if (ok) ElMessage.success('测试通知已发送')
}

// ---------- 数据工具 ----------
async function onExport() {
  const count = await exportData()
  ElMessage.success(`已导出 ${count} 条记录（JSON 文件）`)
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    await ElMessageBox.confirm(
      '导入将覆盖当前全部数据，请确认已备份当前数据。是否继续？',
      '导入数据',
      { type: 'warning', confirmButtonText: '覆盖导入', cancelButtonText: '取消' }
    )
  } catch {
    e.target.value = ''
    return
  }
  const result = await importData(file)
  e.target.value = ''
  if (result.ok) {
    await Promise.all([refreshCustomers(), refreshSessions(), loadSettings()])
    ElMessage.success(`导入成功：${result.customers} 位客户，${result.sessions} 条排课`)
  } else {
    ElMessage.error(result.error || '导入失败')
  }
}

function onExportAllIcs() {
  if (!sessions.value.length) {
    ElMessage.warning('暂无排课数据')
    return
  }
  // 导出全部排课（「取消」状态已移除）
  const vevents = sessions.value.map((s) => sessionToVevent(s, getCustomerById(s.customerId)))
  downloadIcs('coachnote-all.ics', buildIcs(vevents))
  ElMessage.success(`已导出 ${vevents.length} 条排课到 ICS 文件`)
}

async function onClearAll() {
  await clearAll()
  await Promise.all([refreshCustomers(), refreshSessions(), loadSettings()])
  ElMessage.success('全部数据已清空')
}
</script>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}
.s-label {
  color: var(--cn-text-secondary);
}
.reminder-hint {
  font-size: 12px;
  color: var(--cn-text-hint);
  padding: 0 0 10px;
}
.full-btn {
  width: 100%;
}
/* 通知权限卡片：内容居中 */
.notify-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 12px;
}
.notify-btn {
  width: 100%;
}
.data-note {
  font-size: 12px;
  color: var(--cn-text-hint);
  line-height: 1.6;
  margin: 0 0 10px;
}
/* 数据管理按钮：统一宽度与间距 */
.data-btn {
  width: 100%;
  margin-bottom: 8px;
  margin-left: 0px;
}
.version {
  text-align: center;
  color: #c8cdd6;
  font-size: 12px;
  margin: 16px 0;
}
</style>
