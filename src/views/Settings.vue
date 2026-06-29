<template>
  <div class="page">
    <van-nav-bar title="设置" :border="false" />

    <div class="page-content">
      <!-- 题库管理 -->
      <van-cell-group :border="false">
        <van-cell title="导入 Excel 题库" is-link to="/import" icon="plus">
          <template #icon>
            <van-icon name="plus" style="color:var(--primary);margin-right:8px;" />
          </template>
        </van-cell>
        <van-cell title="当前题库" :value="`${dbStats.questions} 题`" icon="book">
          <template #icon>
            <van-icon name="book" style="color:var(--primary);margin-right:8px;" />
          </template>
        </van-cell>
      </van-cell-group>

      <div style="height:12px;"></div>

      <!-- 学习计划 -->
      <van-cell-group :border="false">
        <template #title>
          <div style="padding:12px 0 4px;font-size:14px;font-weight:600;color:var(--text-primary);">
            <van-icon name="chart-trend" style="margin-right:6px;" />学习计划
          </div>
        </template>

        <van-cell center>
          <template #title>
            <div>每日新题目标</div>
          </template>
          <template #value>
            <van-stepper
              v-model="localSettings.dailyNewQuestionsTarget"
              :min="5"
              :max="100"
              :step="5"
            />
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div>考试日期</div>
          </template>
          <template #value>
            <div style="display:flex;align-items:center;gap:8px;">
              <span v-if="localSettings.examDate" style="font-size:14px;color:var(--primary);">
                {{ formatDate(localSettings.examDate) }}
              </span>
              <span v-else style="font-size:13px;color:var(--text-secondary);">未设置</span>
              <input
                type="date"
                :value="localSettings.examDate ? formatDateInput(localSettings.examDate) : ''"
                @change="onExamDateChange"
                style="font-size:13px;border:1px solid var(--divider);border-radius:6px;padding:4px 8px;"
              />
              <van-button v-if="localSettings.examDate" size="mini" round @click="clearExamDate">清除</van-button>
            </div>
          </template>
        </van-cell>

        <!-- 考试日期推算提示 -->
        <van-cell v-if="localSettings.examDate && unlearnedCount > 0">
          <template #title>
            <div style="font-size:13px;color:var(--text-secondary);">
              距考试还有 <b style="color:var(--primary);">{{ daysUntilExam }}</b> 天
              ，每天约需做 <b style="color:var(--primary);">{{ autoDailyTarget }}</b> 题
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="height:12px;"></div>

      <!-- 题目顺序 -->
      <van-cell-group :border="false">
        <template #title>
          <div style="padding:12px 0 4px;font-size:14px;font-weight:600;color:var(--text-primary);">
            <van-icon name="exchange" style="margin-right:6px;" />题目顺序
          </div>
        </template>
        <van-cell center>
          <template #title>
            <div>刷题时题目顺序</div>
          </template>
          <template #value>
            <select v-model="shuffleOrder" class="settings-select">
              <option :value="true">随机顺序</option>
              <option :value="false">按导入顺序</option>
            </select>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="height:12px;"></div>

      <!-- 复习系统 -->
      <van-cell-group :border="false">
        <template #title>
          <div style="padding:12px 0 4px;font-size:14px;font-weight:600;color:var(--text-primary);">
            <van-icon name="replay" style="margin-right:6px;" />复习系统
          </div>
        </template>
        <van-cell title="记忆法" value="艾宾浩斯记忆曲线" />
        <van-cell title="复习阶段" value="5 个阶段（仅错题）" />
        <van-cell>
          <template #title>
            <div style="font-size:13px;color:var(--text-secondary);">
              间隔: 1天 → 2天 → 4天 → 7天 → 15天
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="height:12px;"></div>

      <!-- 保存按钮 -->
      <div style="padding:8px 16px 16px;">
        <van-button
          type="primary"
          block
          round
          size="large"
          @click="saveSettings"
        >
          {{ savedText }}
        </van-button>
      </div>

      <div style="height:12px;"></div>

      <!-- 数据管理 -->
      <van-cell-group :border="false">
        <template #title>
          <div style="padding:12px 0 4px;font-size:14px;font-weight:600;color:var(--text-primary);">
            <van-icon name="setting-o" style="margin-right:6px;" />数据管理
          </div>
        </template>
        <van-cell title="导出学习报告" is-link @click="exportReport" icon="description">
          <template #icon>
            <van-icon name="description" style="color:var(--primary);margin-right:8px;" />
          </template>
        </van-cell>
        <van-cell title="答题记录" :value="`${dbStats.studyRecords} 条`" />
        <van-cell title="清除所有数据" is-link @click="showClearConfirm = true">
          <template #value>
            <span style="color:var(--wrong);">清除</span>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="height:12px;"></div>

      <!-- 关于 -->
      <van-cell-group :border="false">
        <template #title>
          <div style="padding:12px 0 4px;font-size:14px;font-weight:600;color:var(--text-primary);">
            <van-icon name="info-o" style="margin-right:6px;" />关于
          </div>
        </template>
        <van-cell title="版本" value="1.0.0" />
        <van-cell title="应用名称" value="全科医学刷题" />
      </van-cell-group>

      <div style="height:20px;"></div>
    </div>

    <!-- 清除确认 -->
    <van-dialog
      v-model:show="showClearConfirm"
      title="确认清除"
      show-cancel-button
      confirm-button-color="#e04040"
      @confirm="doClear"
    >
      <p style="padding:16px;font-size:14px;color:var(--text-secondary);line-height:1.6;">
        此操作将删除所有题目、答题记录和复习计划，且不可恢复。确定要继续吗？
      </p>
    </van-dialog>

    <!-- 报告弹窗 -->
    <van-dialog v-model:show="showReport" title="学习报告">
      <pre style="padding:16px;font-size:13px;line-height:1.8;white-space:pre-wrap;text-align:left;">{{ reportText }}</pre>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDate } from '@/utils/dateUtils'
import db from '@/services/db'

const settingsStore = useSettingsStore()
const dbStats = ref({ questions: 0, studyRecords: 0 })
const showClearConfirm = ref(false)
const showReport = ref(false)
const reportText = ref('')
const savedText = ref('保存设置')
const unlearnedCount = ref(0)

const shuffleOrder = ref(true)

const localSettings = reactive({
  dailyNewQuestionsTarget: 20,
  examDate: null
})

// 距考试天数
const daysUntilExam = computed(() => {
  if (!localSettings.examDate) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exam = new Date(localSettings.examDate)
  exam.setHours(0, 0, 0, 0)
  return Math.max(Math.ceil((exam - now) / (1000 * 60 * 60 * 24)), 1)
})

// 自动推算每日应做题数
const autoDailyTarget = computed(() => {
  if (!localSettings.examDate || unlearnedCount.value <= 0) return 0
  return Math.ceil(unlearnedCount.value / daysUntilExam.value)
})

onMounted(async () => {
  const s = settingsStore.settings
  localSettings.dailyNewQuestionsTarget = s.dailyNewQuestionsTarget
  localSettings.examDate = s.examDate

  // 读取顺序偏好
  const saved = localStorage.getItem('shuffleQuestions')
  shuffleOrder.value = saved !== 'false'

  await settingsStore.loadDbStats()
  dbStats.value = settingsStore.dbStats

  // 计算未学题目数
  const allQuestions = await db.getAllQuestions()
  const learnedIds = await db.getLearnedQuestionIds()
  unlearnedCount.value = allQuestions.length - learnedIds.length
})

function saveSettings() {
  var data = {
    dailyNewQuestionsTarget: localSettings.dailyNewQuestionsTarget,
    examDate: localSettings.examDate
  }
  localStorage.setItem('studySettings', JSON.stringify(data))
  localStorage.setItem('shuffleQuestions', shuffleOrder.value ? 'true' : 'false')
  settingsStore.settings = data

  savedText.value = '已保存 ✓'
  setTimeout(() => { savedText.value = '保存设置' }, 2000)
}

function onExamDateChange(e) {
  const val = e.target.value
  if (val) {
    localSettings.examDate = new Date(val)
  } else {
    localSettings.examDate = null
  }
}

function clearExamDate() {
  localSettings.examDate = null
}

function formatDateInput(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

async function doClear() {
  await settingsStore.clearAllData()
  dbStats.value = settingsStore.dbStats
  savedText.value = '已清除 ✓'
  setTimeout(() => { savedText.value = '保存设置' }, 2000)
}

async function exportReport() {
  reportText.value = await settingsStore.generateReport()
  showReport.value = true
}
</script>

<style scoped>
.settings-select {
  font-size: 14px;
  padding: 4px 8px;
  border: 1px solid var(--divider);
  border-radius: 6px;
  background: white;
  color: var(--text-primary);
}
</style>
