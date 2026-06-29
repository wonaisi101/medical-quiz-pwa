/**
 * 统计分析服务
 * 替代 iOS 版本的 StatisticsService
 */

import db from './db'
import { startOfDay, addDays } from '@/utils/dateUtils'

/**
 * 获取学习概览
 */
export async function getOverview() {
  const [
    totalQuestions,
    allRecords,
    wrongAnswers,
    learnedIds
  ] = await Promise.all([
    db.getQuestionCount(),
    db.getAllStudyRecords(),
    db.getAllWrongAnswers(),
    db.getLearnedQuestionIds()
  ])

  // 今日记录
  const todayStart = startOfDay(new Date()).getTime()
  const todayRecords = allRecords.filter(r => r.date >= todayStart)

  // 总正确率
  const totalAnswered = allRecords.length
  const totalCorrect = allRecords.filter(r => r.isCorrect).length
  const accuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : 0

  // 今日
  const todayCorrect = todayRecords.filter(r => r.isCorrect).length
  const todayAccuracy = todayRecords.length > 0 ? todayCorrect / todayRecords.length : 0

  // 连续学习天数
  const streakDays = calculateStreakDays(allRecords)

  // 待复习
  const dueReviewCount = await db.getDueReviewCount()

  return {
    totalQuestions,
    learnedQuestions: learnedIds.length,
    accuracy,
    todayCount: todayRecords.length,
    todayAccuracy,
    streakDays,
    dueReviewCount,
    wrongAnswerCount: wrongAnswers.filter(w => !w.isMastered).length
  }
}

/**
 * 获取每日统计数据（用于图表）
 */
export async function getDailyStats(days = 30) {
  const allRecords = await db.getAllStudyRecords()
  const stats = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayStart = startOfDay(date).getTime()
    const dayEnd = dayStart + 86400000

    const dayRecords = allRecords.filter(r => r.date >= dayStart && r.date < dayEnd)
    const total = dayRecords.length
    const correct = dayRecords.filter(r => r.isCorrect).length

    stats.push({
      date: dayStart,
      total,
      correct,
      accuracy: total > 0 ? correct / total : 0
    })
  }

  return stats
}

/**
 * 获取分类统计
 */
export async function getCategoryStats() {
  const questions = await db.getAllQuestions()
  const allRecords = await db.getAllStudyRecords()

  const categories = [...new Set(questions.map(q => q.category).filter(Boolean))]
  if (!categories.length) return []

  return categories.map(cat => {
    const catIds = questions.filter(q => q.category === cat).map(q => q.id)
    const catRecords = allRecords.filter(r => catIds.includes(r.questionId))
    const correct = catRecords.filter(r => r.isCorrect).length
    return {
      category: cat,
      total: catRecords.length,
      correct,
      accuracy: catRecords.length > 0 ? correct / catRecords.length : 0
    }
  }).sort((a, b) => a.accuracy - b.accuracy)
}

/**
 * 计算连续学习天数
 */
function calculateStreakDays(allRecords) {
  const uniqueDays = [...new Set(allRecords.map(r => {
    return startOfDay(new Date(r.date)).getTime()
  }))].sort((a, b) => b - a)

  if (!uniqueDays.length) return 0

  const today = startOfDay(new Date()).getTime()
  let lastDate = uniqueDays[0]

  // 今天没学，检查昨天
  const yesterday = startOfDay(addDays(new Date(), -1)).getTime()
  if (lastDate !== today) {
    if (lastDate !== yesterday) return 0
  }

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const expectedPrev = startOfDay(addDays(new Date(lastDate), -1)).getTime()
    if (uniqueDays[i] === expectedPrev) {
      streak++
      lastDate = uniqueDays[i]
    } else {
      break
    }
  }

  return streak
}
