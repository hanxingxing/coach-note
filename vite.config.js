import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const base = '/coach-note/'

/**
 * 构建信息：构建时注入前端，在「设置」页底部展示，用于判断线上是否已经跑上新版本
 * - __APP_VERSION__    package.json 的 version
 * - __APP_BUILD_TIME__ UTC ISO 字符串（CI 跑在 UTC），前端按设备本地时区显示
 * - __APP_COMMIT__     git 短哈希，和 GitHub Actions 的 commit 对得上
 * 三项都做了兜底：拿不到 git / package.json 也不会让构建失败。
 */
function buildInfo() {
  let version = '0.0.0'
  let commit = 'unknown'
  try {
    version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version
  } catch {
    // package.json 读取失败时保留占位值
  }
  try {
    commit = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
    // 工作区有未提交改动时标记 -dirty：避免本地构建显示的哈希与线上一致、内容却不同
    const dirty = execSync('git status --porcelain', {
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
    if (dirty) commit += '-dirty'
  } catch {
    // 无 git 环境（打包机未带 .git）时保留 unknown
  }
  return {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_COMMIT__: JSON.stringify(commit)
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base,
  define: buildInfo(),
  plugins: [
    vue(),
    // PWA 配置：应用名称「课记CoachNote」，standalone 全屏展示（iPhone 添加主屏幕后隐藏地址栏）
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '章章CoachNote',
        short_name: '章章CoachNote',
        description: '章章自用排课工具：客户管理、排课日历、空闲时段查询、课时统计、课程提醒',
        lang: 'zh-CN',
        display: 'standalone', // 全屏展示，隐藏浏览器地址栏
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#ffffff', // 与 .app-header 白底一致，避免 iOS 顶端出现割裂色带
        background_color: '#ffffff',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: false // 开发模式不启用 SW，避免缓存干扰；PWA 效果在 build/preview 中验证
      }
    })
  ],
  server: {
    host: true
  },
  build: {
    // Element Plus 全量引入体积较大，提高警告阈值避免噪音（本地工具应用可接受）
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 手动分包，减少单文件体积、便于 SW 增量缓存
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          dexie: ['dexie']
        }
      }
    }
  }
})
