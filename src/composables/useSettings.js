import { ref } from 'vue'
import { db } from '../db'

/**
 * 设置管理组合式函数（持久化到 IndexedDB settings 表）
 *
 * 键说明：
 * - reminderEnabled: 是否开启课前提醒
 * （提醒时间固定为提前 10 分钟 / 5 分钟，无需配置；
 *   排课设置已移除：上课时间固定 09:00-22:00，空闲时段按每节 60 分钟检索）
 */

const DEFAULTS = {
  reminderEnabled: true
}

const settings = ref({ ...DEFAULTS })

export function useSettings() {
  /** 加载设置（未保存过的键使用默认值） */
  async function loadSettings() {
    const rows = await db.settings.toArray()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    settings.value = { ...DEFAULTS, ...map }
  }

  /** 保存单个设置键 */
  async function saveSetting(key, value) {
    await db.settings.put({ key, value })
    settings.value[key] = value
  }

  /** 批量保存（表单提交用） */
  async function saveSettings(partial) {
    await db.transaction('rw', db.settings, async () => {
      for (const [k, v] of Object.entries(partial)) {
        await db.settings.put({ key: k, value: v })
        settings.value[k] = v
      }
    })
  }

  return { settings, loadSettings, saveSetting, saveSettings }
}
