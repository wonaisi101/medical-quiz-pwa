/**
 * 日期工具函数
 */

/**
 * 格式化日期为 yyyy-MM-dd
 */
export function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为中文格式
 */
export function formatChineseDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 获取星期几（中文）
 */
export function getWeekday(date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[new Date(date).getDay()]
}

/**
 * 判断是否为今天
 */
export function isToday(date) {
  const d = new Date(date)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

/**
 * 判断是否为昨天
 */
export function isYesterday(date) {
  const d = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
}

/**
 * 友好显示日期
 */
export function friendlyDate(date) {
  if (isToday(date)) return '今天'
  if (isYesterday(date)) return '昨天'
  return formatDate(date)
}

/**
 * 获取日期开始时间（00:00:00）
 */
export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取日期结束时间（23:59:59）
 */
export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * 添加天数
 */
export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * 计算两个日期之间的天数差
 */
export function daysBetween(date1, date2) {
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  return Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
}

/**
 * 生成唯一 ID
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
