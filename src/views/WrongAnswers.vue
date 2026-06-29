<template>
  <div class="page">
    <van-nav-bar title="错题本" :border="false">
      <template #right>
        <van-icon name="ellipsis" @click="showMenu = true" />
      </template>
    </van-nav-bar>

    <!-- 顶部统计 -->
    <div class="wrong-header">
      <div class="wrong-stat">
        <div class="wrong-stat-value" style="color:var(--wrong);">{{ wrongList.length }}</div>
        <div class="wrong-stat-label">待复习</div>
      </div>
      <div class="stat-divider"></div>
      <div class="wrong-stat">
        <div class="wrong-stat-value" style="color:var(--correct);">{{ masteredCount }}</div>
        <div class="wrong-stat-label">已掌握</div>
      </div>
      <div class="stat-divider"></div>
      <div class="wrong-stat">
        <div class="wrong-stat-value">{{ allWrongCount }}</div>
        <div class="wrong-stat-label">总计</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <button
        class="filter-chip"
        :class="{ active: !store.wrongFilter.notMastered }"
        @click="store.wrongFilter.notMastered = !store.wrongFilter.notMastered; store.loadWrongAnswers()"
      >
        全部
      </button>
      <button
        class="filter-chip"
        :class="{ active: store.wrongFilter.notMastered }"
        @click="store.wrongFilter.notMastered = true; store.loadWrongAnswers()"
      >
        待复习
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        class="filter-chip"
        :class="{ active: store.wrongFilter.category === cat }"
        @click="store.wrongFilter.category = cat; store.loadWrongAnswers()"
      >
        {{ cat }}
      </button>
    </div>

    <!-- 错题列表 -->
    <div class="page-content" v-if="!store.loading">
      <van-empty v-if="!wrongList.length" description="暂无错题" />

      <div v-for="item in wrongList" :key="item.wrong.id" class="wrong-card">
        <div class="wrong-header-row">
          <div class="wrong-tags">
            <van-tag :type="item.wrong.wrongCount >= 3 ? 'danger' : 'warning'" size="small">
              错 {{ item.wrong.wrongCount }} 次
            </van-tag>
            <van-tag v-if="item.question.category" plain type="primary" size="small">
              {{ item.question.category }}
            </van-tag>
          </div>
          <div class="wrong-time">上次: {{ friendlyDate(item.wrong.lastWrongDate) }}</div>
        </div>

        <div class="wrong-stem">{{ item.question.stem }}</div>

        <div class="wrong-answer-hint">
          <template v-for="(ci, idx) in (item.question.correctIndices || [item.question.correctIndex || 0])" :key="idx">
            <span class="correct-letter">{{ letters[ci] }}</span>
          </template>
          <span style="color:var(--correct);font-size:13px;margin-left:4px;">{{ getOptionPreview(item.question) }}</span>
        </div>

        <div class="wrong-actions">
          <van-button size="small" round @click="reviewSingle([item.question])">重做</van-button>
          <van-button size="small" round plain type="success" @click="store.markAsMastered(item.wrong.id)">标记掌握</van-button>
        </div>
      </div>

      <div style="height:20px;"></div>
    </div>

    <!-- 菜单 -->
    <van-action-sheet v-model:show="showMenu" :actions="menuActions" @select="onMenuSelect" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '@/stores/studyStore'
import { friendlyDate } from '@/utils/dateUtils'
import db from '@/services/db'

const router = useRouter()
const store = useStudyStore()
const showMenu = ref(false)
const letters = ['A', 'B', 'C', 'D', 'E']

const wrongList = computed(() => store.wrongAnswers)

const allWrongCount = ref(0)
onMounted(async () => {
  await store.loadWrongAnswers()
  const all = await db.getAllWrongAnswers()
  allWrongCount.value = all.length
})

const masteredCount = computed(() => {
  return allWrongCount.value - wrongList.value.filter(w => !w.wrong.isMastered).length
})

const categories = computed(() => {
  const cats = new Set(wrongList.value.map(w => w.question.category).filter(Boolean))
  return [...cats]
})

const menuActions = [
  { name: '重做全部错题', icon: 'replay' },
  { name: '浏览全部错题', icon: 'eye-o' },
  { name: '全部标记已掌握', icon: 'checked' }
]

function getOptionPreview(question) {
  const indices = question.correctIndices || [question.correctIndex || 0]
  if (question.options && indices.length > 0) {
    // 取第一个正确答案的预览
    const firstIdx = indices[0]
    if (question.options[firstIdx]) {
      const opt = question.options[firstIdx]
      return opt.length > 30 ? opt.slice(0, 30) + '...' : opt
    }
  }
  return ''
}

function reviewSingle(questions) {
  store.startReview(questions)
  router.push('/study/session')
}

async function onMenuSelect(action) {
  showMenu.value = false
  if (action.name === '重做全部错题') {
    const questions = wrongList.value.map(w => w.question)
    if (questions.length) {
      store.startReview(questions)
      router.push('/study/session')
    }
  } else if (action.name === '浏览全部错题') {
    const questions = wrongList.value.map(w => w.question)
    if (questions.length) {
      store.startViewing(questions)
      router.push('/study/session')
    }
  } else if (action.name === '全部标记已掌握') {
    for (const item of wrongList.value) {
      await store.markAsMastered(item.wrong.id)
    }
    await store.loadWrongAnswers()
  }
}
</script>

<style scoped>
.wrong-header {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--divider);
}
.wrong-stat {
  text-align: center;
}
.wrong-stat-value {
  font-size: 22px;
  font-weight: 700;
}
.wrong-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--divider);
}

.wrong-card {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}
.wrong-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.wrong-tags {
  display: flex;
  gap: 6px;
}
.wrong-time {
  font-size: 11px;
  color: var(--text-secondary);
}
.wrong-stem {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wrong-answer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.correct-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--correct-light);
  color: var(--correct);
  font-size: 12px;
  font-weight: 700;
}
.wrong-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
