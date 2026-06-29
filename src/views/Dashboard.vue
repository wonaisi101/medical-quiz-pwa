<template>
  <div class="page">
    <van-nav-bar title="学习首页" :border="false" />

    <div class="page-content">
      <!-- 欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-date">{{ todayStr }}</div>
        <div class="welcome-title">继续学习，加油！</div>
        <div class="welcome-streak" v-if="store.overview">
          <van-icon name="fire-o" color="#f5a623" />
          <span>连续学习 {{ store.overview.streakDays }} 天</span>
          <span v-if="store.overview.streakDays > 0">🔥</span>
        </div>
      </div>

      <!-- 今日计划卡片 -->
      <div class="card" v-if="store.dailyPlan">
        <div class="card-header">
          <van-icon name="calendar-o" color="#3399ff" />
          <span>今日学习计划</span>
          <van-tag v-if="store.dailyPlan.isCompleted" type="success" plain style="margin-left:auto;">已完成</van-tag>
        </div>

        <div class="plan-stats">
          <div class="plan-item">
            <div class="plan-num primary">{{ store.dailyPlan.newQuestions }}</div>
            <div class="plan-label">新题</div>
          </div>
          <div class="plan-divider"></div>
          <div class="plan-item">
            <div class="plan-num review">{{ store.dailyPlan.reviewQuestions }}</div>
            <div class="plan-label">复习</div>
          </div>
          <div class="plan-divider"></div>
          <div class="plan-item">
            <div class="plan-num">{{ store.dailyPlan.newQuestions + store.dailyPlan.reviewQuestions }}</div>
            <div class="plan-label">总计</div>
          </div>
        </div>

        <van-progress
          :percentage="progressPercent"
          :stroke-width="6"
          color="#3399ff"
          track-color="#e8ecf1"
          style="margin: 12px 0;"
        />
        <div class="plan-time">
          <van-icon name="clock-o" />
          <span>预计 {{ store.dailyPlan.estimatedMinutes }} 分钟</span>
          <span style="margin-left:auto;">已完成 {{ store.todayCompleted }} 题</span>
        </div>
      </div>

      <!-- 概览统计 -->
      <div class="stats-grid" v-if="store.overview">
        <div class="stat-item">
          <div class="stat-value" style="color:#3399ff;">{{ store.overview.learnedQuestions }}</div>
          <div class="stat-label">已学习</div>
          <div class="stat-sub">/ {{ store.overview.totalQuestions }} 题</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:#33b86c;">{{ accuracyPercent }}%</div>
          <div class="stat-label">总正确率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:#8b5cf6;">{{ store.overview.dueReviewCount }}</div>
          <div class="stat-label">待复习</div>
        </div>
      </div>

      <!-- 学习趋势 -->
      <div class="card" v-if="store.dailyStats.length">
        <div class="card-header">
          <van-icon name="chart-bar" color="#3399ff" />
          <span>近 30 天学习趋势</span>
        </div>
        <div class="chart-container">
          <div
            v-for="(stat, i) in store.dailyStats"
            :key="i"
            class="chart-bar-wrapper"
            :title="`${formatDate(stat.date)}: ${stat.total}题`"
          >
            <div
              class="chart-bar"
              :style="{ height: barHeight(stat.total) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 学习建议 -->
      <div class="suggestion" v-if="store.overview">
        <template v-if="store.overview.dueReviewCount > 20">
          <van-icon name="warning-o" color="#f5a623" />
          <span>你有 {{ store.overview.dueReviewCount }} 道题待复习，建议优先完成复习任务。</span>
        </template>
        <template v-else-if="store.overview.wrongAnswerCount > 0">
          <van-icon name="cross-circle-o" color="#e04040" />
          <span>错题本中有 {{ store.overview.wrongAnswerCount }} 道题，建议及时回顾。</span>
        </template>
      </div>

      <div style="height:20px;"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStudyStore } from '@/stores/studyStore'
import { formatChineseDate, formatDate, getWeekday } from '@/utils/dateUtils'

const store = useStudyStore()

onMounted(() => {
  store.loadDashboard()
})

const todayStr = computed(() => {
  const now = new Date()
  return `${formatChineseDate(now)} ${getWeekday(now)}`
})

const accuracyPercent = computed(() => {
  if (!store.overview) return 0
  return Math.round(store.overview.accuracy * 100)
})

const progressPercent = computed(() => {
  if (!store.dailyPlan) return 0
  const total = store.dailyPlan.newQuestions + store.dailyPlan.reviewQuestions
  if (total === 0) return 0
  return Math.min(Math.round((store.todayCompleted / total) * 100), 100)
})

function barHeight(count) {
  const maxCount = Math.max(...store.dailyStats.map(s => s.total), 1)
  return Math.max(count / maxCount * 100, 2)
}
</script>

<style scoped>
.welcome-section {
  margin-bottom: 16px;
}
.welcome-date {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.welcome-streak {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0;
}
.plan-item {
  text-align: center;
}
.plan-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.plan-num.primary { color: var(--primary); }
.plan-num.review { color: var(--review); }
.plan-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.plan-divider {
  width: 1px;
  height: 32px;
  background: var(--divider);
}
.plan-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-sub {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 100px;
  padding-top: 8px;
}
.chart-bar-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.chart-bar {
  width: 100%;
  background: linear-gradient(180deg, #3399ff, #66b3ff);
  border-radius: 2px 2px 0 0;
  transition: height 0.3s;
  min-height: 2px;
}

.suggestion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fff7e6;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.5;
  margin-top: 12px;
}
</style>
