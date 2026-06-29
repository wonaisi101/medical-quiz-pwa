<template>
  <div class="session-page">
    <!-- ===== 顶部导航 ===== -->
    <van-nav-bar
      left-arrow
      @click-left="handleBack"
      :border="false"
    >
      <template #title>
        <span style="font-size:14px;">
          <template v-if="currentQ?.questionNumber">
            <span style="font-weight:600;">#{{ currentQ.questionNumber }}</span>
            <span style="color:var(--text-secondary);margin:0 6px;">|</span>
          </template>
          {{ store.currentIndex + 1 }} / {{ store.totalQuestions }}
        </span>
        <!-- 顺序切换按钮 -->
        <van-button
          size="mini"
          round
          plain
          :type="shuffled ? 'primary' : 'default'"
          @click.stop="toggleShuffle"
          style="margin-left:8px;font-size:11px;vertical-align:middle;"
        >
          {{ shuffled ? '随机' : '顺序' }}
        </van-button>
      </template>
      <template #right>
        <van-button
          v-if="store.studyState === 'selecting' || store.studyState === 'viewing'"
          :type="store.viewMode ? 'default' : 'primary'"
          size="small"
          round
          @click="store.toggleViewMode()"
          style="margin-right:6px;"
        >
          {{ store.viewMode ? '答题' : '看题' }}
        </van-button>
        <van-tag v-if="store.studyMode === 'reviewing'" type="warning" size="medium">复习</van-tag>
      </template>
    </van-nav-bar>

    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <!-- ===== 题目内容 ===== -->
    <div class="session-content" v-if="currentQ">
      <!-- 题型标签 -->
      <div class="type-badge">
        <van-tag v-if="store.studyState === 'viewing'" type="warning" size="medium">看题模式</van-tag>
        <van-tag v-else-if="isMultiQuestion" type="primary" size="medium">多选题</van-tag>
        <van-tag v-else type="success" size="medium">单选题</van-tag>
        <span v-if="currentQ.category" style="margin-left:8px;font-size:12px;color:var(--text-secondary);">{{ currentQ.category }}</span>
      </div>

      <!-- 题干 -->
      <div class="stem-section">
        <div class="stem-text">{{ currentQ.stem }}</div>
      </div>

      <!-- ===== 选项列表 ===== -->
      <div class="options-section">
        <button
          v-for="(opt, i) in currentQ.options"
          :key="i"
          class="option-btn"
          :class="optionClass(i)"
          :disabled="store.studyState === 'answered' || store.studyState === 'viewing'"
          @click="handleOptionClick(i)"
        >
          <span class="letter">{{ letters[i] }}</span>
          <span class="option-text">{{ opt }}</span>

          <!-- 状态图标 -->
          <!-- 看题模式：正确答案标记 -->
          <van-icon v-if="store.studyState === 'viewing' && correctIndices.includes(i)" name="success" color="#33b86c" size="20" />
          <!-- 答题 selecting：已选标记 -->
          <van-icon v-else-if="store.studyState === 'selecting' && isSelected(i)" name="success" color="#3399ff" size="20" />
          <!-- 答题 answered：正确标记 -->
          <van-icon v-else-if="store.showResult && correctIndices.includes(i)" name="success" color="#33b86c" size="20" />
          <!-- 答题 answered：错误标记（用户选错的） -->
          <van-icon v-else-if="store.showResult && store.selectedIndices.includes(i) && !correctIndices.includes(i)" name="fail" color="#e04040" size="20" />
        </button>
      </div>

      <!-- ===== 答题模式：提示 + 确认按钮 + 反馈 ===== -->
      <template v-if="!store.viewMode">
        <!-- 选择提示 -->
        <div v-if="store.studyState === 'selecting'" class="select-hint">
          <van-icon :name="correctIndices.length > 1 ? 'checkbox' : 'check'" />
          <span v-if="isMultiQuestion">多选题 — 请选择所有正确答案后点击下方「确认答案」</span>
          <span v-else>点击选项后点击「确认答案」</span>
        </div>

        <!-- 确认答案按钮 -->
        <van-button
          v-if="store.studyState === 'selecting' && store.selectedIndices.length > 0"
          type="primary"
          round
          block
          @click="store.confirmAnswer()"
          style="margin-top:12px;"
        >
          确认答案 (已选 {{ store.selectedIndices.length }} 项)
        </van-button>

        <!-- 答题反馈 -->
        <div v-if="store.showResult" class="feedback-section">
          <div class="feedback-header" :class="store.isCorrect ? 'correct' : 'wrong'">
            <van-icon :name="store.isCorrect ? 'success' : 'fail'" :size="22" />
            <span>{{ store.isCorrect ? '回答正确！' : '回答错误' }}</span>
            <span v-if="!store.isCorrect" style="font-weight:normal;font-size:13px;margin-left:auto;">
              正确答案: {{ correctAnswerLetters }}
            </span>
          </div>
          <div v-if="currentQ.explanation" class="explanation">
            <div class="explanation-title">📖 解析</div>
            <p>{{ currentQ.explanation }}</p>
          </div>
        </div>
      </template>

      <!-- ===== 看题模式：答案 & 解析始终显示 ===== -->
      <div v-if="store.studyState === 'viewing'" class="view-mode-answer">
        <div class="answer-banner">
          <van-icon name="info-o" />
          <span>正确答案：<strong>{{ correctAnswerLetters }}</strong></span>
        </div>
        <div v-if="currentQ.explanation" class="explanation">
          <div class="explanation-title">📖 解析</div>
          <p>{{ currentQ.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty v-else description="暂无题目" />

    <!-- ===== 底部导航栏（统一风格） ===== -->
    <div class="bottom-bar">
      <!-- 左侧统计（仅答题模式） -->
      <div v-if="!store.viewMode && store.studyState !== 'selecting'" class="bottom-stats">
        <span style="color:var(--correct);">✓ {{ store.correctCount }}</span>
        <span style="color:var(--wrong);margin-left:12px;">✗ {{ store.wrongCount }}</span>
      </div>
      <div v-else></div>

      <!-- 中间：导航按钮 -->
      <div class="bottom-nav">
        <van-button
          size="small"
          round
          :disabled="store.currentIndex <= 0"
          @click="goToPrev"
          icon="arrow-left"
          plain
        >
          上一题
        </van-button>
        <span class="bottom-position">{{ store.currentIndex + 1 }}/{{ store.totalQuestions }}</span>
        <van-button
          size="small"
          round
          type="primary"
          @click="goToNext"
        >
          {{ store.currentIndex >= store.totalQuestions - 1 ? '完成' : '下一题' }}
          <template #icon>
            <van-icon name="arrow" v-if="store.currentIndex < store.totalQuestions - 1" />
          </template>
        </van-button>
      </div>

      <!-- 右侧（占位） -->
      <div></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '@/stores/studyStore'
import { showConfirmDialog } from 'vant'

const router = useRouter()
const store = useStudyStore()
const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// 顺序/随机切换
const shuffled = ref(true)
onMounted(() => {
  const saved = localStorage.getItem('shuffleQuestions')
  shuffled.value = saved !== 'false'
})

function toggleShuffle() {
  shuffled.value = !shuffled.value
  localStorage.setItem('shuffleQuestions', shuffled.value ? 'true' : 'false')
  // 如果当前在看题/答题中，重新加载队列
  if (store.questionQueue.length > 0) {
    store.reorderQuestions(shuffled.value)
  }
}

// ---------- 计算属性 ----------
const currentQ = computed(() => store.currentQuestion)

const progressPercent = computed(() => {
  if (store.totalQuestions === 0) return 0
  return ((store.currentIndex + 1) / store.totalQuestions) * 100
})

/** 是否为多选题（基于题型列或 correctIndices 长度） */
const isMultiQuestion = computed(() => {
  const q = currentQ.value
  if (!q) return false
  if (q.questionType && /多选|multi|multiple/i.test(q.questionType)) return true
  const indices = Array.isArray(q.correctIndices) ? q.correctIndices : [q.correctIndex].filter(i => i !== undefined)
  return indices.length > 1
})

/** 统一获取 correctIndices（兼容新旧格式） */
const correctIndices = computed(() => {
  if (!currentQ.value) return []
  if (Array.isArray(currentQ.value.correctIndices)) return currentQ.value.correctIndices
  if (typeof currentQ.value.correctIndex === 'number') return [currentQ.value.correctIndex]
  return []
})

const correctAnswerLetters = computed(() => {
  return correctIndices.value
    .map(i => letters[i])
    .sort()
    .join(', ')
})

// ---------- 选项辅助函数 ----------
function isSelected(index) {
  return store.selectedIndices.includes(index)
}

function handleOptionClick(index) {
  if (store.studyState === 'answered' || store.studyState === 'viewing') return

  if (isMultiQuestion.value) {
    // 多选：切换选择
    store.toggleSelect(index)
  } else {
    // 单选：选中后立即确认
    store.selectedIndices = [index]
    store.confirmAnswer()
  }
}

function optionClass(index) {
  // 看题模式
  if (store.studyState === 'viewing') {
    return correctIndices.value.includes(index) ? 'correct' : 'default'
  }
  // 答题 selecting
  if (store.studyState === 'selecting') {
    return isSelected(index) ? 'selected' : 'default'
  }
  // 答题 answered
  if (store.showResult) {
    if (correctIndices.value.includes(index)) return 'correct'
    if (store.selectedIndices.includes(index)) return 'wrong'
  }
  return 'default'
}

// ---------- 导航 ----------
function goToPrev() {
  if (store.currentIndex > 0) {
    store.goToQuestion(store.currentIndex - 1)
  }
}

function goToNext() {
  if (store.currentIndex < store.totalQuestions - 1) {
    store.goToQuestion(store.currentIndex + 1)
  } else {
    // 最后一题 → 回到上一页
    router.replace('/study')
  }
}

function handleBack() {
  if (store.studyState === 'selecting' && !store.viewMode) {
    showConfirmDialog({
      title: '确认退出',
      message: '退出后进度不会丢失，下次可继续答题',
      confirmButtonText: '退出'
    }).then(() => {
      router.replace('/study')
    }).catch(() => {})
  } else {
    router.replace('/study')
  }
}
</script>

<style scoped>
.session-page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 70px;
}

.session-content {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.type-badge {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.stem-section {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}

.stem-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
}

.options-section {
  margin-bottom: 16px;
}

/* 选项按钮 */
.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 15px;
}
.option-btn + .option-btn { margin-top: 10px; }
.option-btn .letter {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.option-btn .option-text { flex: 1; }

/* 选中态 */
.option-btn.selected { border-color: var(--primary); background: var(--primary-light); }
.option-btn.selected .letter { background: var(--primary); color: white; }
/* 正确 */
.option-btn.correct { border-color: var(--correct); background: var(--correct-light); }
.option-btn.correct .letter { background: var(--correct); color: white; }
/* 错误 */
.option-btn.wrong { border-color: var(--wrong); background: var(--wrong-light); }
.option-btn.wrong .letter { background: var(--wrong); color: white; }
/* 默认 */
.option-btn.default .letter { background: var(--bg); color: var(--text-primary); }

.select-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #e8f4ff;
  border-radius: 8px;
  font-size: 13px;
  color: var(--primary);
  margin-top: 8px;
}

/* 反馈区 */
.feedback-section { margin-top: 12px; }
.feedback-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 600;
}
.feedback-header.correct { background: var(--correct-light); color: var(--correct); }
.feedback-header.wrong { background: var(--wrong-light); color: var(--wrong); }

.explanation {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-top: 10px;
  box-shadow: var(--shadow);
}
.explanation-title { font-weight: 600; margin-bottom: 6px; font-size: 14px; }
.explanation p { font-size: 14px; line-height: 1.6; color: var(--text-secondary); }

/* 看题模式答案横幅 */
.view-mode-answer { margin-top: 8px; }
.answer-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--correct-light);
  border-radius: var(--radius-sm);
  color: var(--correct);
  font-size: 15px;
  margin-bottom: 10px;
}

/* 底部导航 */
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--card-bg);
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0));
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  max-width: 600px;
  margin: 0 auto;
}

.bottom-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bottom-position {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 50px;
  text-align: center;
}

.bottom-stats {
  font-size: 15px;
  font-weight: 600;
}
</style>
