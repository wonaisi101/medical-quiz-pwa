<template>
  <div class="app">
    <!-- 页面主体 -->
    <div class="page">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <keep-alive :include="keepAlivePages">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </div>

    <!-- 底部 TabBar（仅在主页面显示） -->
    <van-tabbar
      v-if="showTabbar"
      v-model="activeTab"
      active-color="#3399ff"
      inactive-color="#8e98a3"
      border
      safe-area-inset-bottom
      route
      @change="onTabChange"
    >
      <van-tabbar-item to="/dashboard" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/study" icon="book-o">刷题</van-tabbar-item>
      <van-tabbar-item to="/review" icon="replay">复习</van-tabbar-item>
      <van-tabbar-item to="/wrong-answers" icon="cross-circle-o">错题本</van-tabbar-item>
      <van-tabbar-item to="/settings" icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const activeTab = ref(0)

// 需要保持活跃的页面（缓存状态）
const keepAlivePages = ['Dashboard', 'WrongAnswers', 'Review']

// 主 Tab 页面（显示底部导航栏）
const tabPages = ['/dashboard', '/study', '/review', '/wrong-answers', '/settings']

const showTabbar = computed(() => tabPages.includes(route.path))

// 同步 Tab 与路由
const tabIndexMap = {
  '/dashboard': 0,
  '/study': 1,
  '/review': 2,
  '/wrong-answers': 3,
  '/settings': 4
}

watch(() => route.path, (path) => {
  if (path in tabIndexMap) {
    activeTab.value = tabIndexMap[path]
  }
}, { immediate: true })

function onTabChange(index) {
  // 路由已自动切换（route 属性）
}
</script>
