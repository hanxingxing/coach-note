import { ref } from 'vue'

/**
 * 浏览器通知组合式函数
 *
 * 注意（iPhone）：iOS Safari 的 Web 通知仅对「添加到主屏幕」后的
 * 独立 PWA 生效（iOS 16.4+），且需用户显式授权。
 */

const supported = typeof window !== 'undefined' && 'Notification' in window
const permission = ref(supported ? Notification.permission : 'unsupported')

export function useNotifications() {
  /** 请求通知授权（必须在用户点击事件中调用） */
  async function requestPermission() {
    if (!supported) return 'unsupported'
    const result = await Notification.requestPermission()
    permission.value = result
    return result
  }

  /** 发送一条通知（已授权才发送） */
  function notify(title, options = {}) {
    if (!supported || permission.value !== 'granted') return false
    try {
      // 页面可见时用 ServiceWorker registration 展示更稳定，直接 new Notification 亦可
      new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options
      })
      return true
    } catch (e) {
      console.warn('通知发送失败', e)
      return false
    }
  }

  return { supported, permission, requestPermission, notify }
}
