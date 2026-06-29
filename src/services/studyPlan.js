/**
 * 学习计划服务
 * 替代 iOS 版本的 StudyPlanService
 */

const DEFAULT_SETTINGS = {
  dailyMinutes: 30,
  secondsPerQuestion: 60,
  examDate: null,
  dailyNewQuestionsTarget: 20
}

/**
 * 获取用户设置
 */
export function getStudySettings() {
  try {
    const saved = localStorage.getItem('studySettings')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.examDate) parsed.examDate = new Date(parsed.examDate)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

/**
 * 保存用户设置
 */
export function saveStudySettings(settings) {
  localStorage.setItem('studySettings', JSON.stringify(settings))
}

/**
 * 计算每日学习计划
 */
export function calculateDailyPlan(
  totalUnlearned,
  totalReviewDue,
  todayCompleted,
  settings = null
) {
  const s = settings || getStudySettings()

  // 复习题数量
  const reviewCount = Math.min(totalReviewDue, Math.ceil(s.dailyNewQuestionsTarget / 2))

  // 新题数量
  let newCount
  if (s.examDate) {
    const now = new Date()
    const daysUntilExam = Math.max(Math.ceil((s.examDate - now) / (1000 * 60 * 60 * 24)), 1)
    newCount = Math.ceil(totalUnlearned / daysUntilExam)
  } else {
    newCount = s.dailyNewQuestionsTarget
  }

  // 按时间容量调整
  const remainingMinutes = Math.max(0, s.dailyMinutes - (reviewCount * s.secondsPerQuestion / 60))
  const maxNewByTime = Math.floor(remainingMinutes * 60 / Math.max(s.secondsPerQuestion, 1))
  const availableNew = Math.min(newCount, totalUnlearned, maxNewByTime)

  return {
    newQuestions: Math.max(0, availableNew),
    reviewQuestions: Math.max(0, reviewCount),
    estimatedMinutes: (availableNew + reviewCount) * s.secondsPerQuestion / 60,
    isCompleted: todayCompleted >= (availableNew + reviewCount)
  }
}
