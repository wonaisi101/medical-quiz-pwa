import Dexie from 'dexie'

/**
 * IndexedDB 数据库层
 * 替代 iOS 版本的 SwiftData
 */
class MedicalQuizDB extends Dexie {
  constructor() {
    super('MedicalQuizDB')

    this.version(1).stores({
      questions: 'id, category, examPaperId, createdAt',
      examPapers: 'id, importDate',
      studyRecords: 'id, questionId, date, isReview',
      reviewSchedules: 'id, questionId, nextReviewDate, stage',
      wrongAnswers: 'id, questionId, isMastered'
    })

    this.questions = this.table('questions')
    this.examPapers = this.table('examPapers')
    this.studyRecords = this.table('studyRecords')
    this.reviewSchedules = this.table('reviewSchedules')
    this.wrongAnswers = this.table('wrongAnswers')
  }

  // ===== 题目操作 =====
  async addQuestions(questions) {
    return this.questions.bulkAdd(questions)
  }

  async getAllQuestions() {
    return this.questions.toArray()
  }

  async getQuestion(id) {
    return this.questions.get(id)
  }

  async getQuestionsByIds(ids) {
    if (!ids.length) return []
    return this.questions.where('id').anyOf(ids).toArray()
  }

  async getQuestionCount() {
    return this.questions.count()
  }

  async getQuestionsByCategory(category) {
    return this.questions.where('category').equals(category).toArray()
  }

  // ===== 试卷操作 =====
  async addExamPaper(paper) {
    return this.examPapers.add(paper)
  }

  async getExamPapers() {
    return this.examPapers.orderBy('importDate').reverse().toArray()
  }

  // ===== 学习记录 =====
  async addStudyRecord(record) {
    return this.studyRecords.add(record)
  }

  async getAllStudyRecords() {
    return this.studyRecords.toArray()
  }

  async getTodayRecords() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return this.studyRecords
      .where('date')
      .aboveOrEqual(today.getTime())
      .toArray()
  }

  async getRecordsInRange(startDate, endDate) {
    return this.studyRecords
      .where('date')
      .between(startDate.getTime(), endDate.getTime())
      .toArray()
  }

  async getLearnedQuestionIds() {
    const records = await this.studyRecords.toArray()
    return [...new Set(records.map(r => r.questionId))]
  }

  // ===== 复习计划 =====
  async addReviewSchedules(schedules) {
    return this.reviewSchedules.bulkAdd(schedules)
  }

  async updateReviewSchedule(schedule) {
    return this.reviewSchedules.put(schedule)
  }

  async getReviewSchedule(questionId) {
    return this.reviewSchedules
      .where('questionId')
      .equals(questionId)
      .first()
  }

  async getDueReviewIds() {
    const now = Date.now()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.reviewSchedules
      .where('nextReviewDate')
      .between(todayStart.getTime(), tomorrow.getTime())
      .toArray()
      .then(schedules => schedules.map(s => s.questionId))
  }

  async getDueReviewCount() {
    const ids = await this.getDueReviewIds()
    return ids.length
  }

  async getStageCount(stage) {
    return this.reviewSchedules
      .where('stage')
      .equals(stage)
      .count()
  }

  async getReviewSchedulesByStage(stage) {
    return this.reviewSchedules
      .where('stage')
      .equals(stage)
      .toArray()
  }

  async getAllReviewSchedules() {
    return this.reviewSchedules.toArray()
  }

  // ===== 错题本 =====
  async addWrongAnswer(wrongAnswer) {
    return this.wrongAnswers.add(wrongAnswer)
  }

  async updateWrongAnswer(wrongAnswer) {
    return this.wrongAnswers.put(wrongAnswer)
  }

  async getWrongAnswer(questionId) {
    return this.wrongAnswers
      .where('questionId')
      .equals(questionId)
      .first()
  }

  async getAllWrongAnswers() {
    return this.wrongAnswers.toArray()
  }

  async getWrongAnswersNotMastered() {
    return this.wrongAnswers
      .where('isMastered')
      .equals(0)
      .toArray()
  }

  async deleteWrongAnswer(id) {
    return this.wrongAnswers.delete(id)
  }

  // ===== 数据管理 =====
  async clearAll() {
    await Promise.all([
      this.questions.clear(),
      this.examPapers.clear(),
      this.studyRecords.clear(),
      this.reviewSchedules.clear(),
      this.wrongAnswers.clear()
    ])
  }

  async getDatabaseStats() {
    return {
      questions: await this.questions.count(),
      examPapers: await this.examPapers.count(),
      studyRecords: await this.studyRecords.count(),
      reviewSchedules: await this.reviewSchedules.count(),
      wrongAnswers: await this.wrongAnswers.count()
    }
  }
}

export const db = new MedicalQuizDB()
export default db
