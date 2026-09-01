import { createRouter, createWebHashHistory } from 'vue-router'

// 使用 hash 路由：纯静态托管（如 Cloudflare Pages）无需服务端重写配置
const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: '首页' } },
  { path: '/calendar', name: 'calendar', component: () => import('../views/CalendarView.vue'), meta: { title: '排课' } },
  { path: '/customers', name: 'customers', component: () => import('../views/CustomersView.vue'), meta: { title: '客户' } },
  { path: '/records', name: 'records', component: () => import('../views/RecordsView.vue'), meta: { title: '课程记录' } },
  { path: '/stats', name: 'stats', component: () => import('../views/StatisticsView.vue'), meta: { title: '汇总统计' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '设置' } }
]

const router = createRouter({
  history: createWebHashHistory('/coach-note/'),
  routes
})

export default router
