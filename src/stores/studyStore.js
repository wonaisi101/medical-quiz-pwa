import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '@/services/db'
import { createInitialSchedule, handleCorrectAnswer, handleWrongAnswer } from '@/services/reviewScheduler'
import { calculateDailyPlan, getStudySettings } from '@/services/studyPlan'
import { getOverview, getDailyStats, getCategoryStats } from '@/services/statistics'

/**
 * 学习状态管理
 * 替代 iOS 的所有 ViewModel
 */
export const useStudyStore = defineStore('study', () => {
  // ===== 数据状态 =====
  const overview = ref(null)
  const dailyStats = ref([])
  const categoryStats = ref([])

  // 学习队列
  const questionQueue = ref([])
  const currentIndex = ref(0)
  const currentQuestion = ref(null)

  // 答题状态
  const studyState = ref('idle') // idle | selecting | answered | completed | viewing
  const studyMode = ref('learning') // learning | reviewing
  const viewMode = ref(false) // true = 直接看题模式
  const selectedIndices = ref([])
  const isCorrect = ref(false)
  const showResult = ref(false)
  // 多选题标识（兼容新旧格式 + 题型列标注）
  const isMultiSelect = computed(() => {
    const q = currentQuestion.value
    if (!q) return false
    // 1. 如果题型列明确标注为多选
    if (q.questionType && /多选|multi|multiple/i.test(q.questionType)) return true
    // 2. 如果 correctIndices 有多项
    const indices = Array.isArray(q.correctIndices) ? q.correctIndices : [q.correctIndex].filter(i => i !== undefined)
    return indices.length > 1
  })

  // 统计
  const correctCount = ref(0)
  const wrongCount = ref(0)
  const totalQuestions = ref(0)

  // 错题本
  const wrongAnswers = ref([])
  const wrongFilter = ref({ notMastered: true, category: '全部' })

  // 复习
  const reviewSchedules = ref([])

  // 加载中
  const loading = ref(false)

  // ===== 计算属性 =====
  const todayCompleted = computed(() => overview.value?.todayCount || 0)
  const dailyPlan = computed(() => {
    if (!overview.value) return null
    return calculateDailyPlan(
      overview.value.totalQuestions - overview.value.learnedQuestions,
      overview.value.dueReviewCount,
      overview.value.todayCount
    )
  })

  // ===== 数据加载 =====
  async function loadDashboard() {
    loading.value = true
    try {
      overview.value = await getOverview()
      dailyStats.value = await getDailyStats(30)
      categoryStats.value = await getCategoryStats()
    } catch (e) {
      console.error('加载首页数据失败:', e)
    }
    loading.value = false
  }

  // ===== 顺序偏好 =====
  function shouldShuffle() {
    const saved = localStorage.getItem('shuffleQuestions')
    return saved === 'true' // 默认顺序（用户手动开启才随机）
  }

  /** 按题号排序（题号为空则按创建时间） */
  function sortByQuestionNumber(questions) {
    return [...questions].sort((a, b) => {
      const na = parseInt(a.questionNumber)
      const nb = parseInt(b.questionNumber)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      if (!isNaN(na)) return -1
      if (!isNaN(nb)) return 1
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
  }

  // ===== 刷题逻辑 =====
  async function startLearning() {
    const settings = getStudySettings()

    // 获取今日已完成题目ID
    const todayRecords = await db.getTodayRecords()
    const excludedIds = todayRecords.map(r => r.questionId)

    // 获取全部题目，按题号排序
    const allQuestions = sortByQuestionNumber(await db.getAllQuestions())
    const learnedIds = await db.getLearnedQuestionIds()

    // 未学题目（按题号顺序取前面的）
    const unlearnedQs = allQuestions.filter(
      q => !learnedIds.includes(q.id) && !excludedIds.includes(q.id)
    )

    // 待复习的错题（按题号顺序）
    const reviewIds = (await db.getDueReviewIds())
      .filter(id => !excludedIds.includes(id))
    let reviewQuestions = await db.getQuestionsByIds(reviewIds)
    reviewQuestions = sortByQuestionNumber(reviewQuestions)

    // 按计划分配
    const plan = calculateDailyPlan(
      unlearnedQs.length,
      reviewQuestions.length,
      excludedIds.length,
      settings
    )

    // 取前 N 个未学题 + 前 N 个复习题
    const newQuestions = unlearnedQs.slice(0, plan.newQuestions)
    const dueReviewQs = reviewQuestions.slice(0, plan.reviewQuestions)

    const combined = [...newQuestions, ...dueReviewQs]
    questionQueue.value = shouldShuffle() ? shuffleArray(combined) : combined
    totalQuestions.value = questionQueue.value.length

    if (questionQueue.value.length > 0) {
      currentIndex.value = 0
      currentQuestion.value = questionQueue.value[0]
      studyState.value = 'selecting'
      studyMode.value = 'learning'
      correctCount.value = 0
      wrongCount.value = 0
      selectedIndices.value = []
      showResult.value = false
    } else {
      studyState.value = 'completed'
    }
  }

  async function startReview(questions) {
    const qs = [...questions]
    questionQueue.value = shouldShuffle() ? shuffleArray(qs) : sortByQuestionNumber(qs)
    totalQuestions.value = questions.length

    if (questions.length > 0) {
      currentIndex.value = 0
      currentQuestion.value = questionQueue.value[0]
      studyState.value = 'selecting'
      studyMode.value = 'reviewing'
      correctCount.value = 0
      wrongCount.value = 0
      selectedIndices.value = []
      showResult.value = false
    } else {
      studyState.value = 'completed'
    }
  }

  /**
   * 进入看题模式：直接显示题目和答案，不答题
   */
  async function startViewing(questions) {
    const qs = [...questions]
    questionQueue.value = shouldShuffle() ? shuffleArray(qs) : sortByQuestionNumber(qs)
    totalQuestions.value = questions.length
    viewMode.value = true

    if (questions.length > 0) {
      currentIndex.value = 0
      currentQuestion.value = questionQueue.value[0]
      studyState.value = 'viewing'
      studyMode.value = 'learning'
      selectedIndices.value = []
      showResult.value = true // 直接显示答案
    } else {
      studyState.value = 'completed'
    }
  }

  /**
   * 切换 看题/答题 模式（在答题过程中）
   */
  function toggleViewMode() {
    viewMode.value = !viewMode.value
    if (viewMode.value) {
      studyState.value = 'viewing'
      showResult.value = true
    } else {
      studyState.value = 'selecting'
      selectedIndices.value = []
      showResult.value = false
    }
  }

  /**
   * 切换选项选择状态（支持多选）
   */
  function toggleSelect(index) {
    if (studyState.value !== 'selecting' || !currentQuestion.value) return

    const idx = selectedIndices.value.indexOf(index)
    if (idx >= 0) {
      selectedIndices.value.splice(idx, 1) // 取消选择
    } else {
      selectedIndices.value.push(index) // 选择
    }
  }

  /**
   * 确认答案并提交
   */
  function confirmAnswer() {
    if (studyState.value !== 'selecting' || !currentQuestion.value) return
    if (selectedIndices.value.length === 0) return

    const q = currentQuestion.value
    const correct = Array.isArray(q.correctIndices) ? q.correctIndices : [q.correctIndex].filter(i => i !== undefined)

    // 判断是否正确：选中的 = 正确的，且数量一致
    const sortedSelected = [...selectedIndices.value].sort()
    const sortedCorrect = [...correct].sort()
    isCorrect.value =
      sortedSelected.length === sortedCorrect.length &&
      sortedSelected.every((v, i) => v === sortedCorrect[i])

    studyState.value = 'answered'
    showResult.value = true

    if (isCorrect.value) {
      correctCount.value++
    } else {
      wrongCount.value++
    }

    // 保存答题记录
    saveAnswer(currentQuestion.value)
  }

  async function saveAnswer(question) {
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      questionId: question.id,
      date: Date.now(),
      isCorrect: isCorrect.value ? 1 : 0,
      answerTime: 0,
      isReview: studyMode.value === 'reviewing' ? 1 : 0,
      selectedIndex: selectedIndices.value.join(',')
    }
    await db.addStudyRecord(record)

    // 复习计划：仅答错时创建/更新
    const existingSchedule = await db.getReviewSchedule(question.id)
    if (!isCorrect.value) {
      // 答错 → 创建或重置复习计划
      if (existingSchedule) {
        const updated = handleWrongAnswer(existingSchedule)
        await db.updateReviewSchedule(updated)
      } else {
        const schedule = createInitialSchedule(question.id)
        await db.addReviewSchedules([schedule])
      }
    } else if (existingSchedule && studyMode.value === 'reviewing') {
      // 复习模式中答对 → 进入下一阶段
      const updated = handleCorrectAnswer(existingSchedule)
      if (updated === null) {
        // 全部阶段已完成 → 移出复习计划 + 标记错题已掌握
        await db.reviewSchedules.delete(existingSchedule.id)
        const wrong = await db.getWrongAnswer(question.id)
        if (wrong) { wrong.isMastered = 1; await db.updateWrongAnswer(wrong) }
      } else {
        await db.updateReviewSchedule(updated)
      }
    }

    // 更新错题本
    if (!isCorrect.value) {
      const existingWrong = await db.getWrongAnswer(question.id)
      if (existingWrong) {
        existingWrong.wrongCount++
        existingWrong.lastWrongDate = Date.now()
        existingWrong.lastWrongAnswer = selectedIndices.value.join(',')
        existingWrong.isMastered = 0
        await db.updateWrongAnswer(existingWrong)
      } else {
        await db.addWrongAnswer({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
          questionId: question.id,
          wrongCount: 1,
          lastWrongDate: Date.now(),
          lastWrongAnswer: selectedIndices.value.join(','),
          isMastered: 0,
          createdAt: Date.now()
        })
      }
    } else if (studyMode.value === 'reviewing') {
      // 复习模式答对 - 检查错题本
      const existingWrong = await db.getWrongAnswer(question.id)
      if (existingWrong) {
        // 检查复习计划的连续答对次数
        const schedule = await db.getReviewSchedule(question.id)
        if (schedule && schedule.consecutiveCorrect >= 3) {
          existingWrong.isMastered = 1
          await db.updateWrongAnswer(existingWrong)
        }
      }
    }
  }

  function nextQuestion() {
    if (currentIndex.value < questionQueue.value.length - 1) {
      currentIndex.value++
      currentQuestion.value = questionQueue.value[currentIndex.value]
      selectedIndices.value = []
      showResult.value = false
      studyState.value = 'selecting'
    } else {
      studyState.value = 'completed'
    }
  }

  /**
   * 跳转到指定题目
   */
  function goToQuestion(index) {
    if (index < 0 || index >= questionQueue.value.length) return
    currentIndex.value = index
    currentQuestion.value = questionQueue.value[index]
    selectedIndices.value = []
    showResult.value = false

    if (viewMode.value) {
      studyState.value = 'viewing'
      showResult.value = true
    } else {
      studyState.value = 'selecting'
    }
  }

  /**
   * 按随机/顺序重新排列队列（保留当前题目位置）
   */
  function reorderQuestions(shuffled) {
    if (questionQueue.value.length === 0) return
    const current = currentQuestion.value?.id

    if (shuffled) {
      questionQueue.value = shuffleArray([...questionQueue.value])
    } else {
      questionQueue.value = sortByQuestionNumber(questionQueue.value)
    }

    // 尝试定位当前题在新的队列中的位置
    if (current) {
      const newIndex = questionQueue.value.findIndex(q => q.id === current)
      if (newIndex >= 0) {
        currentIndex.value = newIndex
      }
    }
  }

  function resetStudy() {
    studyState.value = 'idle'
    studyMode.value = 'learning'
    questionQueue.value = []
    currentIndex.value = 0
    currentQuestion.value = null
    selectedIndices.value = []
    isCorrect.value = false
    showResult.value = false
    correctCount.value = 0
    wrongCount.value = 0
    totalQuestions.value = 0
  }

  // ===== 错题本逻辑 =====
  async function loadWrongAnswers() {
    loading.value = true
    try {
      let wrongs = await db.getAllWrongAnswers()
      if (wrongFilter.value.notMastered) {
        wrongs = wrongs.filter(w => !w.isMastered)
      }

      const result = []
      for (const wrong of wrongs) {
        const question = await db.getQuestion(wrong.questionId)
        if (question) {
          if (wrongFilter.value.category !== '全部' && question.category !== wrongFilter.value.category) continue
          result.push({ wrong, question })
        }
      }
      wrongAnswers.value = result.sort((a, b) => b.wrong.wrongCount - a.wrong.wrongCount)
    } catch (e) {
      console.error('加载错题失败:', e)
    }
    loading.value = false
  }

  async function markAsMastered(wrongId) {
    const wrong = await db.wrongAnswers.get(wrongId)
    if (wrong) {
      wrong.isMastered = 1
      await db.updateWrongAnswer(wrong)
      await loadWrongAnswers()
    }
  }

  async function deleteWrongAnswer(wrongId) {
    await db.deleteWrongAnswer(wrongId)
    await loadWrongAnswers()
  }

  // ===== 复习逻辑 =====
  async function loadReviewData() {
    loading.value = true
    try {
      reviewSchedules.value = await db.getAllReviewSchedules()
    } catch (e) {
      console.error('加载复习数据失败:', e)
    }
    loading.value = false
  }

  async function getQuestionsForStage(stage) {
    const schedules = await db.getReviewSchedulesByStage(stage)
    const ids = schedules.map(s => s.questionId)
    return db.getQuestionsByIds(ids)
  }

  // ===== 工具函数 =====
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  return {
    // 状态
    overview, dailyStats, categoryStats,
    questionQueue, currentIndex, currentQuestion,
    studyState, studyMode, viewMode, selectedIndices, isCorrect, showResult, isMultiSelect,
    correctCount, wrongCount, totalQuestions,
    wrongAnswers, wrongFilter, reviewSchedules, loading,
    // 计算属性
    todayCompleted, dailyPlan,
    // 方法
    loadDashboard,
    startLearning, startReview, startViewing, toggleSelect, confirmAnswer, nextQuestion, goToQuestion, reorderQuestions, resetStudy, toggleViewMode,
    loadWrongAnswers, markAsMastered, deleteWrongAnswer,
    loadReviewData, getQuestionsForStage
  }
})
