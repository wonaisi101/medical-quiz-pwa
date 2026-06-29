import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '学习首页', icon: 'home-o' }
  },
  {
    path: '/study',
    name: 'Study',
    component: () => import('@/views/Study.vue'),
    meta: { title: '刷题', icon: 'book-o' }
  },
  {
    path: '/study/session',
    name: 'StudySession',
    component: () => import('@/views/StudySession.vue'),
    meta: { title: '答题' }
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/views/Review.vue'),
    meta: { title: '复习', icon: 'replay' }
  },
  {
    path: '/wrong-answers',
    name: 'WrongAnswers',
    component: () => import('@/views/WrongAnswers.vue'),
    meta: { title: '错题本', icon: 'cross-circle-o' }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('@/views/Import.vue'),
    meta: { title: '导入题库' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置', icon: 'setting-o' }
  }
]

// 自动适配 base 路径（本地 / 或 GitHub Pages 的 /medical-quiz/）
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
