import { fmtDate, fmtTime } from './time'

/**
 * 构建版本信息（「设置」页底部展示，用于判断线上是否已更新到最新版本）
 * 由 vite.config.js 的 define 在构建时注入：
 *   __APP_VERSION__     package.json 的 version
 *   __APP_BUILD_TIME__  UTC ISO 字符串
 *   __APP_COMMIT__      git 短哈希
 *
 * 全部用 typeof 兜底：即使某个值没有被注入（例如脱离 Vite 单独运行），
 * 也不会抛 ReferenceError，只会降级成占位文本。
 */

export const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export const appCommit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'unknown'

const buildTimeIso = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : ''

/** 构建时间按设备本地时区显示（CI 在 UTC 构建，直接显示 UTC 会看不懂） */
export const buildTimeText = formatBuildTime(buildTimeIso)

function formatBuildTime(iso) {
  if (!iso) return '未知'
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return '未知'
  return `${fmtDate(ts)}`
}
