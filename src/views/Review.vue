<template>
  <div class="page">
    <van-nav-bar title="复习管理" :border="false" />

    <div class="page-content">
      <!-- 加载中 -->
      <van-skeleton v-if="store.loading" title :row="5" />

      <!-- 空状态 -->
      <van-empty v-else-if="!store.reviewSchedules.length" description="暂无待复习题目">
        <template #image>
          <van-icon name="checked" :size="64" color="#33b86c" />
        </template>
        <p style="color:var(--text-secondary);font-size:14px;text-align:center;">
          学习新题后，系统会自动按艾宾浩斯记忆曲线安排复习
        </p>
      </van-empty>

      <template v-else>
        <!-- 复习概览 -->
        <div class="card">
          <div class="card-header">
            <van-icon name="replay" color="#8b5cf6" />
            <span>复习概览</span>
            <van-tag type="warning" style="margin-left:auto;">{{ dueCount }} 道待复习</van-tag>
          </div>

          <div v-for="s in stageDistribution" :key="s.stage" class="stage-row">
            <div class="stage-info">
              <div class="stage-dot" :style="{ background: stageColor(s.stage) }"></div>
              <span>{{ s.description }}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:14px;font-weight:600;">{{ s.count }}</span>
              <van-button size="mini" round @click="startStageReview(s.stage)">复习</van-button>
            </div>
          </div>
        </div>

        <!-- 艾宾浩斯进度 -->
        <div class="card">
          <div class="card-header">
            <van-icon name="chart-trend" color="#3399ff" />
            <span>艾宾浩斯复习进度</span>
          </div>

          <div v-for="stage in 5" :key="stage" class="ebbinghaus-row">
            <div class="stage-indicator">
              <div class="stage-circle" :style="{ background: stageColor(stage) }">{{ stage }}</div>
              <div>
                <div style="font-size:14px;">{{ getStageDesc(stage) }}</div>
                <div style="font-size:12px;color:var(--text-secondary);">
                  间隔 {{ getIntervalDesc(stage) }}
                </div>
              </div>
            </div>
            <div class="stage-count" :style="{ color: stageColor(stage) }">
              {{ stageCount(stage) }} 题
            </div>
          </div>
        </div>

        <!-- 全部复习按钮组 -->
        <div style="display:flex;gap:12px;">
          <van-button
            type="primary"
            round
            block
            icon="play"
            @click="startAllReview"
            style="flex:1;"
          >
            开始全部复习 ({{ dueCount }} 题)
          </van-button>
          <van-button
            round
            plain
            icon="eye-o"
            @click="viewAllDue"
            style="flex:1;"
          >
            浏览全部
          </van-button>
        </div>
      </template>

      <div style="height:20px;"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '@/stores/studyStore'
import { getStageDescription, getIntervalDescription } from '@/services/reviewScheduler'
import db from '@/services/db'

const router = useRouter()
const store = useStudyStore()

onMounted(() => {
  store.loadReviewData()
  store.loadDashboard()
})

const stageDistribution = computed(() => {
  const dist = []
  for (let stage = 1; stage <= 5; stage++) {
    const count = store.reviewSchedules.filter(s => s.stage === stage).length
    if (count > 0) {
      dist.push({ stage, count, description: getStageDescription(stage) })
    }
  }
  return dist
})

const dueCount = computed(() => {
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return store.reviewSchedules.filter(
    s => s.nextReviewDate >= todayStart.getTime() && s.nextReviewDate < tomorrow.getTime()
  ).length
})

function getStageDesc(stage) { return getStageDescription(stage) }
function getIntervalDesc(stage) { return getIntervalDescription(stage) }

function stageCount(stage) {
  return store.reviewSchedules.filter(s => s.stage === stage).length
}

function stageColor(stage) {
  const colors = ['#3399ff', '#4a90d9', '#8b5cf6', '#7c3aed', '#33b86c']
  return colors[stage - 1] || '#3399ff'
}

async function startStageReview(stage) {
  const questions = await store.getQuestionsForStage(stage)
  if (questions.length) {
    store.startReview(questions)
    router.push('/study/session')
  }
}

async function startAllReview() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dueSchedules = store.reviewSchedules.filter(
    s => s.nextReviewDate >= todayStart.getTime() && s.nextReviewDate < tomorrow.getTime()
  )
  const ids = dueSchedules.map(s => s.questionId)
  const questions = await db.getQuestionsByIds(ids)
  if (questions.length) {
    store.startReview(questions)
    router.push('/study/session')
  }
}

async function viewAllDue() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dueSchedules = store.reviewSchedules.filter(
    s => s.nextReviewDate >= todayStart.getTime() && s.nextReviewDate < tomorrow.getTime()
  )
  const ids = dueSchedules.map(s => s.questionId)
  const questions = await db.getQuestionsByIds(ids)
  if (questions.length) {
    store.startViewing(questions)
    router.push('/study/session')
  }
}
</script>

<style scoped>
.stage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--divider);
}
.stage-row:last-child { border-bottom: none; }
.stage-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.ebbinghaus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.stage-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stage-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.stage-count {
  font-size: 15px;
  font-weight: 600;
}
</style>
