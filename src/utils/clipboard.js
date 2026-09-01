/**
 * 剪贴板复制工具
 * 优先使用 Clipboard API（需要安全上下文 https / localhost），
 * 失败时降级为「隐藏 textarea + execCommand('copy')」，兼容旧设备与非安全上下文。
 * @param {string} text 要复制的文本（保留原始换行格式）
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyText(text) {
  // 方案一：Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限被拒或异步手势失效，继续走降级方案
    }
  }

  // 方案二：隐藏 textarea + execCommand（兼容降级）
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
