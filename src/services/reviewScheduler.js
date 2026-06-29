import { addDays, generateId } from '@/utils/dateUtils'

/**
 * 艾宾浩斯复习调度服务
 * 仅管理错题的复习计划
 */

// 7 阶段复习间隔（天）— 艾宾浩斯记忆曲线
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30, 60]
export const MAX_STAGE = EBBINGHAUS_INTERVALS.length

/**
 * 创建初始复习计划（答错时调用）
 */
export function createInitialSchedule(questionId) {
  return {
    id: generateId(),
    questionId,
    nextReviewDate: addDays(new Date(), EBBINGHAUS_INTERVALS[0]).getTime(),
    stage: 1,
    intervalDays: EBBINGHAUS_INTERVALS[0],
    lastReviewed: null,
    consecutiveCorrect: 0
  }
}

/**
 * 处理答对 - 进入下一阶段
 * 如果 stage 超过 MAX_STAGE，返回 null 表示复习完成
 */
export function handleCorrectAnswer(schedule) {
  const newStage = schedule.stage + 1
  // 如果已经完成所有阶段，返回 null 表示移出复习
  if (newStage > MAX_STAGE) return null

  const newInterval = EBBINGHAUS_INTERVALS[newStage - 1]
  return {
    ...schedule,
    stage: newStage,
    intervalDays: newInterval,
    nextReviewDate: addDays(new Date(), newInterval).getTime(),
    lastReviewed: Date.now(),
    consecutiveCorrect: schedule.consecutiveCorrect + 1
  }
}

/**
 * 处理答错 - 重置回 Stage 1
 */
export function handleWrongAnswer(schedule) {
  return {
    ...schedule,
    stage: 1,
    intervalDays: EBBINGHAUS_INTERVALS[0],
    nextReviewDate: addDays(new Date(), EBBINGHAUS_INTERVALS[0]).getTime(),
    lastReviewed: Date.now(),
    consecutiveCorrect: 0
  }
}

/**
 * 获取阶段描述
 */
export function getStageDescription(stage) {
  const descriptions = [
    '首次复习', '二次复习', '三次复习',
    '四次复习', '五次复习', '六次复习', '七次复习'
  ]
  if (stage >= 1 && stage <= MAX_STAGE) return descriptions[stage - 1]
  return '已完成'
}

/**
 * 获取间隔描述
 */
export function getIntervalDescription(stage) {
  if (stage < 1 || stage > MAX_STAGE) return '已完成'
  const days = EBBINGHAUS_INTERVALS[stage - 1]
  if (days >= 30) return `${days / 30}个月`
  if (days >= 7) return `${days / 7}周`
  return `${days}天`
}

/**
 * 判断某 stage 是否已完成全部阶段
 */
export function isReviewCompleted(stage) {
  return stage > MAX_STAGE
}
