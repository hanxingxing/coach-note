import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/coach-note/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
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
        theme_color: '#409eff',
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
