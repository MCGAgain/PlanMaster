import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
    meta: { title: '今日待办', icon: '&#9728;' }
  },
  {
    path: '/checkin',
    name: 'checkin',
    component: () => import('@/views/CheckinView.vue'),
    meta: { title: '打卡', icon: '&#9745;' }
  },
  {
    path: '/important',
    name: 'important',
    component: () => import('@/views/ImportantView.vue'),
    meta: { title: '重要事项', icon: '&#9888;' }
  },
  {
    path: '/weekly',
    name: 'weekly',
    component: () => import('@/views/WeeklyView.vue'),
    meta: { title: '周计划', icon: '&#128197;' }
  },
  {
    path: '/monthly',
    name: 'monthly',
    component: () => import('@/views/MonthlyView.vue'),
    meta: { title: '月计划', icon: '&#128197;' }
  },
  {
    path: '/yearly',
    name: 'yearly',
    component: () => import('@/views/YearlyView.vue'),
    meta: { title: '年计划', icon: '&#128197;' }
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: '统计数据', icon: '&#128202;' }
  },
  {
    path: '/focus',
    name: 'focus',
    component: () => import('@/views/FocusView.vue'),
    meta: { title: '专注模式', icon: '&#9201;' }
  },
  {
    path: '/wishes',
    name: 'wishes',
    component: () => import('@/views/WishesView.vue'),
    meta: { title: '心愿兑换单', icon: '&#9734;' }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@/views/TransactionsView.vue'),
    meta: { title: '价值流水', icon: '&#128200;' }
  },
  {
    path: '/recycle',
    name: 'recycle',
    component: () => import('@/views/RecycleView.vue'),
    meta: { title: '回收站', icon: '&#128465;' }
  },
  {
    path: '/apibalance',
    name: 'apibalance',
    component: () => import('@/views/ApiBalanceView.vue'),
    meta: { title: 'API余量', icon: '&#128176;' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'AI设置', icon: '&#9881;' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
