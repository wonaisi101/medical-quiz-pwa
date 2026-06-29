import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStudySettings, saveStudySettings } from '@/services/studyPlan'
import db from '@/services/db'

/**
 * 设置状态管理
 * 替代 iOS 的 SettingsViewModel
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(getStudySettings())
  const dbStats = ref({ questions: 0, studyRecords: 0 })

  function updateSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
    saveStudySettings(settings.value)
  }

  async function loadDbStats() {
    dbStats.value = await db.getDatabaseStats()
  }

  async function clearAllData() {
    await db.clearAll()
    await loadDbStats()
  }

  async function generateReport() {
    const stats = await db.getDatabaseStats()
    const overview = await (await import('@/services/statistics')).getOverview()
    return [
      '📊 学习报告',
      '===========',
      `总题数: ${stats.questions}`,
      `答题记录: ${stats.studyRecords}`,
      `正确率: ${stats.studyRecords > 0 ? Math.round(overview.accuracy * 100) + '%' : 'N/A'}`,
      `连续学习: ${overview.streakDays} 天`,
      `待复习: ${overview.dueReviewCount} 题`,
      `错题数: ${overview.wrongAnswerCount} 题`
    ].join('\n')
  }

  return {
    settings, dbStats,
    updateSettings, loadDbStats, clearAllData, generateReport
  }
})
