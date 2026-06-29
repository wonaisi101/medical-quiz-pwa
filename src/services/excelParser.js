import * as XLSX from 'xlsx'
import { generateId } from '@/utils/dateUtils'

/**
 * Excel 解析服务
 * 基于 SheetJS (xlsx) 库，替代 iOS 的 CoreXLSX
 */

// 列类型定义
export const ColumnType = {
  QUESTION_NUMBER: { key: 'questionNumber', label: '编号' },
  STEM: { key: 'stem', label: '题干' },
  OPTION_A: { key: 'optionA', label: '选项A' },
  OPTION_B: { key: 'optionB', label: '选项B' },
  OPTION_C: { key: 'optionC', label: '选项C' },
  OPTION_D: { key: 'optionD', label: '选项D' },
  OPTION_E: { key: 'optionE', label: '选项E' },
  QUESTION_TYPE: { key: 'questionType', label: '题型（单选/多选）' },
  CORRECT_ANSWER: { key: 'correctAnswer', label: '正确答案' },
  EXPLANATION: { key: 'explanation', label: '题目解析' },
  CATEGORY: { key: 'category', label: '分类/科目' },
  DIFFICULTY: { key: 'difficulty', label: '难度' },
  IGNORE: { key: 'ignore', label: '忽略此列' }
}

export const ColumnTypes = Object.values(ColumnType)

/**
 * 解析 Excel 文件
 * @param {File} file - 上传的 Excel 文件
 * @returns {Promise<{headers: string[], rows: string[][]}>}
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        if (!jsonData || jsonData.length < 2) {
          reject(new Error('文件中没有足够的数据'))
          return
        }

        const headers = jsonData[0].map(h => String(h || ''))
        const rows = jsonData.slice(1).map(row =>
          Array.isArray(row) ? row.map(cell => String(cell || '')) : []
        ).filter(row => row.some(cell => cell.trim()))

        resolve({ headers, rows, sheetNames: workbook.SheetNames })
      } catch (err) {
        reject(new Error('文件解析失败: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 自动猜测列映射
 */
export function guessColumnMapping(headers) {
  const mapping = {}

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()

    const rules = [
      { keys: ['题干', '题目', 'stem', 'question'], type: ColumnType.STEM },
      { keys: ['选项a', 'a选项', 'option a', 'a.'], type: ColumnType.OPTION_A },
      { keys: ['选项b', 'b选项', 'option b', 'b.'], type: ColumnType.OPTION_B },
      { keys: ['选项c', 'c选项', 'option c', 'c.'], type: ColumnType.OPTION_C },
      { keys: ['选项d', 'd选项', 'option d', 'd.'], type: ColumnType.OPTION_D },
      { keys: ['选项e', 'e选项', 'option e', 'e.'], type: ColumnType.OPTION_E },
      { keys: ['编号', '序号', '题号', 'number', 'id', 'no.'], type: ColumnType.QUESTION_NUMBER },
      { keys: ['正确答案', '答案', 'answer', 'correct'], type: ColumnType.CORRECT_ANSWER },
      { keys: ['题型', '题目类型', 'type', 'question type'], type: ColumnType.QUESTION_TYPE },
      { keys: ['解析', '解释', '讲解', 'explanation'], type: ColumnType.EXPLANATION },
      { keys: ['分类', '科目', '类别', 'category', 'subject'], type: ColumnType.CATEGORY },
      { keys: ['难度', 'difficulty', 'difficult'], type: ColumnType.DIFFICULTY }
    ]

    for (const rule of rules) {
      if (rule.keys.some(k => h.includes(k))) {
        mapping[rule.type.key] = i
        break
      }
    }
  }

  return mapping
}

/**
 * 解析答案字符串为索引数组（支持多选）
 * 支持格式: "A" / "A,B,C" / "0,1,2" / "ABC" / "A、B、C"
 */
function parseAnswerIndices(answer, optionsCount) {
  if (!answer) return [0]

  const trimmed = answer.trim()
  if (!trimmed) return [0]

  // 如果包含分隔符（逗号、顿号、空格），按分隔符解析
  const separators = /[,，、\s]+/
  if (separators.test(trimmed)) {
    const parts = trimmed.split(separators).filter(Boolean)
    const indices = parts.map(p => parseSingleAnswer(p, optionsCount))
    return indices.filter(i => i >= 0 && i < optionsCount)
  }

  // 连续字母如 "ABC" → [0, 1, 2]
  const upper = trimmed.toUpperCase().replace(/[^A-Z]/g, '')
  if (upper.length > 1 && /^[A-Z]+$/.test(upper)) {
    return [...upper]
      .map(ch => ch.charCodeAt(0) - 65)
      .filter(i => i >= 0 && i < optionsCount)
  }

  // 单个答案
  const single = parseSingleAnswer(trimmed, optionsCount)
  return [single]
}

/**
 * 解析单个答案（字母或数字）
 */
function parseSingleAnswer(answer, optionsCount) {
  const trimmed = answer.trim()

  // 尝试数字
  const num = parseInt(trimmed)
  if (!isNaN(num) && num >= 0 && num < optionsCount) {
    return num
  }

  // 尝试字母
  const letter = trimmed.toUpperCase().replace(/[^A-Z]/g, '')[0]
  if (letter) {
    const index = letter.charCodeAt(0) - 65 // 'A' = 0
    if (index >= 0 && index < optionsCount) {
      return index
    }
  }

  return 0
}

/**
 * 将解析后的数据导入为题目数组
 */
export function importQuestions(rows, headers, mapping) {
  const questions = []
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    try {
      // 题干
      const stemIdx = mapping['stem']
      if (stemIdx === undefined || !row[stemIdx]?.trim()) {
        errors.push(`第${rowNum}行: 缺少题干`)
        continue
      }

      // 选项
      const options = []
      const optionKeys = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE']
      for (const key of optionKeys) {
        const idx = mapping[key]
        if (idx !== undefined && row[idx]?.trim()) {
          options.push(row[idx].trim())
        }
      }
      if (options.length < 2) {
        errors.push(`第${rowNum}行: 选项不足（至少需要2个选项）`)
        continue
      }

      // 正确答案
      const ansIdx = mapping['correctAnswer']
      if (ansIdx === undefined || !row[ansIdx]?.trim()) {
        errors.push(`第${rowNum}行: 缺少正确答案`)
        continue
      }
      let correctIndices = parseAnswerIndices(row[ansIdx], options.length)

      // 题型（判断是否多选）
      let questionType = ''
      if (mapping['questionType'] !== undefined && row[mapping['questionType']]?.trim()) {
        questionType = row[mapping['questionType']].trim()
        const isMultiKeyword = /多选|multi|multiple/i.test(questionType)
        // 如果明确标记为多选，强制用多选解析方式
        if (isMultiKeyword && correctIndices.length <= 1) {
          // 答案只有一个索引但标记为多选 → 重新解析（尝试按逗号/顿号分割）
          const raw = row[ansIdx].trim()
          if (!/,|，|、/.test(raw)) {
            // 单个字母如 "B" → 可能是简写，保持原样
            // 但将 isMulti 标记为 true
          }
        }
      }

      // 解析
      const explanation = mapping['explanation'] !== undefined ? (row[mapping['explanation']] || '') : ''
      // 分类
      const category = mapping['category'] !== undefined ? (row[mapping['category']] || '') : ''
      // 难度
      let difficulty = 3
      if (mapping['difficulty'] !== undefined) {
        const diff = parseInt(row[mapping['difficulty']])
        if (!isNaN(diff) && diff >= 1 && diff <= 5) {
          difficulty = diff
        }
      }

      // 编号（仅保留作为参考）
      let questionNumber = ''
      if (mapping['questionNumber'] !== undefined) {
        questionNumber = (row[mapping['questionNumber']] || '').trim()
      }

      questions.push({
        id: generateId(),
        stem: row[stemIdx].trim(),
        options,
        correctIndices,
        questionType,    // 存储原始题型标注
        explanation,
        category,
        difficulty,
        questionNumber,
        examPaperId: null,
        createdAt: Date.now()
      })
    } catch (err) {
      errors.push(`第${rowNum}行: 解析错误`)
    }
  }

  return { questions, errors }
}
