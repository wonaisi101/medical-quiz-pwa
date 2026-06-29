<template>
  <div class="page">
    <van-nav-bar title="刷题" :border="false" />

    <div class="page-content">
      <!-- 开始页面 -->
      <div class="start-section" v-if="store.studyState === 'idle'">
        <van-icon name="book" :size="64" color="#3399ff" />
        <h2>准备好开始学习了吗？</h2>
        <p class="start-desc">系统已根据您的学习计划分配了今日任务</p>

        <van-button
          type="primary"
          size="large"
          round
          icon="play"
          @click="startStudy"
          :loading="store.loading"
          style="margin-top: 30px;"
        >
          开始今日学习
        </van-button>

        <van-button
          size="large"
          round
          plain
          icon="eye-o"
          @click="startDirectView"
          :loading="store.loading"
          style="margin-top: 12px;"
        >
          直接看题
        </van-button>

        <div v-if="store.todayCompleted > 0" class="today-complete">
          <van-icon name="success" color="#33b86c" />
          <span>已完成 {{ store.todayCompleted }} 题</span>
        </div>
      </div>

      <!-- 学习中状态 → 跳转到答题页 -->
      <div v-else-if="store.studyState === 'selecting' || store.studyState === 'answered'">
        <van-button
          type="primary"
          size="large"
          round
          icon="arrow"
          @click="goToSession"
          style="margin-top: 40px;"
        >
          继续答题 ({{ store.currentIndex + 1 }}/{{ store.totalQuestions }})
        </van-button>

        <div class="resume-info">
          <van-icon name="info-o" />
          <span>上次学习进度: 第 {{ store.currentIndex + 1 }} 题，正确 {{ store.correctCount }} 题</span>
        </div>
      </div>

      <!-- 完成状态 -->
      <div v-else-if="store.studyState === 'completed'" class="completed-section">
        <van-icon name="checked" :size="64" color="#33b86c" />
        <h2>本轮学习完成！</h2>

        <div class="result-card">
          <div class="result-row">
            <span>总题数</span>
            <span>{{ store.totalQuestions }}</span>
          </div>
          <div class="result-row">
            <span style="color:var(--correct);">正确</span>
            <span style="color:var(--correct);font-weight:700;">{{ store.correctCount }}</span>
          </div>
          <div class="result-row">
            <span style="color:var(--wrong);">错误</span>
            <span style="color:var(--wrong);font-weight:700;">{{ store.wrongCount }}</span>
          </div>
          <div class="result-row">
            <span>正确率</span>
            <span>{{ store.totalQuestions > 0 ? Math.round(store.correctCount / store.totalQuestions * 100) + '%' : 'N/A' }}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;margin-top:20px;">
          <van-button type="primary" round @click="startStudy">
            继续刷题（下一组）
          </van-button>
          <van-button plain round @click="store.resetStudy()">
            返回首页
          </van-button>
        </div>
      </div>

      <div style="height:20px;"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '@/stores/studyStore'
import { showToast } from 'vant'

const router = useRouter()
const store = useStudyStore()

onMounted(() => {
  store.loadDashboard()
})

async function startStudy() {
  await store.startLearning()
  if (store.studyState === 'completed') {
    showToast('今日任务已完成！')
  } else if (store.questionQueue.length > 0) {
    router.push('/study/session')
  } else {
    showToast('题库为空，请先导入题目')
  }
}

async function startDirectView() {
  const { db } = await import('@/services/db')
  const allQuestions = await db.getAllQuestions()
  if (allQuestions.length === 0) {
    showToast('题库为空，请先导入题目')
    return
  }
  store.startViewing(allQuestions)
  router.push('/study/session')
}

function goToSession() {
  router.push('/study/session')
}
</script>

<style scoped>
.start-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 50px;
  text-align: center;
}
.start-section h2 {
  margin-top: 16px;
  font-size: 20px;
}
.start-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 8px;
  line-height: 1.5;
}
.today-complete {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding: 10px 16px;
  background: #e8f8ef;
  border-radius: 8px;
  font-size: 14px;
  color: #33b86c;
}
.resume-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding: 12px;
  background: #e8f4ff;
  border-radius: 8px;
  font-size: 13px;
  color: var(--primary);
}
.completed-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
  text-align: center;
}
.completed-section h2 {
  margin-top: 12px;
  font-size: 20px;
}
.result-card {
  width: 100%;
  max-width: 280px;
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 16px;
  margin-top: 20px;
  box-shadow: var(--shadow);
}
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}
.result-row + .result-row {
  border-top: 1px solid var(--divider);
}
</style>
