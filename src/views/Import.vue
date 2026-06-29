<template>
  <div class="page">
    <van-nav-bar title="导入题库" left-arrow @click-left="$router.back()" :border="false" />

    <div class="page-content">
      <!-- 步骤1: 选择文件 -->
      <template v-if="step === 'select'">
        <div class="import-start">
          <van-icon name="plus" :size="72" color="#3399ff" />
          <h3>导入 Excel 题库</h3>
          <p>支持 .xlsx 格式，系统会自动识别列结构</p>

          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls"
            style="display:none"
            @change="onFileSelected"
          />
          <van-button type="primary" round icon="folder-o" size="large" @click="$refs.fileInput.click()">
            选择 Excel 文件
          </van-button>
        </div>

        <!-- 错误提示 -->
        <van-notice-bar v-if="errorMsg" mode="closeable" color="#e04040" background="#fde8e8">
          {{ errorMsg }}
        </van-notice-bar>
      </template>

      <!-- 步骤2: 列映射 -->
      <template v-if="step === 'mapping'">
        <div class="file-info">
          <van-icon name="description" color="#3399ff" />
          <span>{{ fileName }}</span>
          <span style="margin-left:auto;font-size:13px;color:var(--text-secondary);">共 {{ rows.length }} 行</span>
        </div>

        <h4 style="margin:16px 0 12px;">设置列映射关系</h4>

        <div v-for="(header, i) in headers" :key="i" class="mapping-row">
          <div class="mapping-header">
            <span>{{ header }}</span>
            <van-tag v-if="getMappedType(i)" type="success" size="small" style="margin-left:8px;">已映射</van-tag>
          </div>
          <van-field
            :model-value="getMappedTypeLabel(i)"
            is-link
            readonly
            :placeholder="'选择字段类型'"
            @click="showPicker(i)"
          />
        </div>

        <van-button
          type="primary"
          round
          block
          style="margin-top:20px;"
          :disabled="!mapping['stem'] || !mapping['correctAnswer']"
          @click="step = 'preview'"
        >
          预览确认 ({{ rows.length }} 题)
        </van-button>
      </template>

      <!-- 步骤3: 预览 -->
      <template v-if="step === 'preview'">
        <div class="preview-hint">
          <van-icon name="eye-o" color="#3399ff" />
          <span>预览前 5 行数据，确认无误后导入</span>
        </div>

        <div v-for="(row, ri) in previewRows" :key="ri" class="preview-row">
          <div class="preview-row-num">第 {{ ri + 2 }} 行</div>
          <div v-for="type in usedTypes" :key="type.key" class="preview-cell">
            <span class="preview-label">{{ type.label }}</span>
            <span class="preview-value">{{ getCellValue(row, mapping[type.key]) }}</span>
          </div>
        </div>

        <div class="preview-actions">
          <van-button round plain @click="step = 'mapping'" style="flex:1;">返回修改</van-button>
          <van-button
            type="primary"
            round
            style="flex:1;"
            :loading="importing"
            @click="doImport"
          >
            确认导入 ({{ rows.length }} 题)
          </van-button>
        </div>
      </template>

      <!-- 步骤4: 完成 -->
      <template v-if="step === 'completed'">
        <div class="import-complete">
          <van-icon name="checked" :size="72" color="#33b86c" />
          <h3>导入成功！</h3>

          <div class="result-card">
            <div class="result-row"><span>成功导入</span><span>{{ importedCount }} 道题</span></div>
            <div v-if="importErrors.length" class="result-row">
              <span style="color:var(--warning);">警告</span>
              <span style="color:var(--warning);">{{ importErrors.length }} 条</span>
            </div>
            <div class="result-row"><span>复习计划</span><span>已自动创建</span></div>
          </div>

          <div v-if="importErrors.length" class="error-detail">
            <p style="font-weight:600;color:var(--warning);margin-bottom:8px;">导入警告：</p>
            <p v-for="(err, i) in importErrors.slice(0, 10)" :key="i" class="error-line">{{ err }}</p>
            <p v-if="importErrors.length > 10">...还有 {{ importErrors.length - 10 }} 条</p>
          </div>

          <van-button type="primary" round @click="$router.back()" style="margin-top:20px;">
            完成
          </van-button>
        </div>
      </template>
    </div>

    <!-- 列类型选择弹窗 -->
    <van-action-sheet v-model:show="pickerShow" :actions="pickerActions" @select="onPickerSelect" />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { showToast } from 'vant'
import { parseExcelFile, guessColumnMapping, importQuestions, ColumnTypes, ColumnType } from '@/services/excelParser'
import db from '@/services/db'

// 步骤
const step = ref('select')
const fileInput = ref(null)
const fileName = ref('')
const errorMsg = ref('')

// 解析数据
const headers = ref([])
const rows = ref([])
const previewRows = ref([])

// 列映射
const mapping = reactive({})
const pickerShow = ref(false)
const pickerTarget = ref(null)

// 导入结果
const importing = ref(false)
const importedCount = ref(0)
const importErrors = ref([])

// 已使用的列类型
const usedTypes = computed(() => {
  return ColumnTypes.filter(t => t.key !== 'ignore' && mapping[t.key] !== undefined)
})

function getMappedType(index) {
  return Object.entries(mapping).find(([_, v]) => v === index)?.[0]
}

function getMappedTypeLabel(index) {
  const key = getMappedType(index)
  if (key) return ColumnTypes.find(t => t.key === key)?.label || key
  return '忽略此列'
}

function getCellValue(row, index) {
  if (index === undefined || index >= row.length) return ''
  return row[index] || ''
}

const pickerActions = computed(() => {
  return ColumnTypes.map(t => ({
    name: t.label,
    key: t.key
  }))
})

function showPicker(index) {
  pickerTarget.value = index
  pickerShow.value = true
}

function onPickerSelect(action) {
  // 移除旧的该类型映射
  for (const key of Object.keys(mapping)) {
    if (mapping[key] === pickerTarget.value) {
      delete mapping[key]
    }
  }
  // 设置新映射
  if (action.key !== 'ignore') {
    mapping[action.key] = pickerTarget.value
  }
  pickerShow.value = false
}

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  errorMsg.value = ''
  fileName.value = file.name

  try {
    const result = await parseExcelFile(file)
    headers.value = result.headers
    rows.value = result.rows
    previewRows.value = result.rows.slice(0, 5)

    // 自动猜测映射
    const guessed = guessColumnMapping(result.headers)
    Object.assign(mapping, guessed)

    step.value = 'mapping'
  } catch (err) {
    errorMsg.value = err.message
  }
}

async function doImport() {
  importing.value = true
  try {
    const result = importQuestions(rows.value, headers.value, { ...mapping })

    if (result.questions.length) {
      // 保存题目（复习计划在答错时自动创建）
      await db.addQuestions(result.questions)

      importedCount.value = result.questions.length
      importErrors.value = result.errors
      step.value = 'completed'
    } else {
      showToast('没有成功导入的题目')
    }
  } catch (err) {
    showToast('导入失败: ' + err.message)
  }
  importing.value = false
}
</script>

<style scoped>
.import-start {
  text-align: center;
  padding-top: 40px;
}
.import-start h3 {
  margin: 16px 0 8px;
}
.import-start p {
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 14px;
  line-height: 1.5;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.mapping-row {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  overflow: hidden;
}
.mapping-header {
  display: flex;
  align-items: center;
  padding: 10px 14px 0;
  font-size: 14px;
  font-weight: 500;
}

.preview-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--primary-light);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 13px;
}
.preview-row {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 8px;
}
.preview-row-num {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.preview-cell {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
}
.preview-label {
  color: var(--primary);
  width: 60px;
  flex-shrink: 0;
}
.preview-value {
  color: var(--text-primary);
}
.preview-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.import-complete {
  text-align: center;
  padding-top: 30px;
}
.import-complete h3 {
  margin: 16px 0;
}
.result-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 16px;
  margin: 0 auto 16px;
  max-width: 280px;
  box-shadow: var(--shadow);
}
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}
.error-detail {
  text-align: left;
  background: #fff7e6;
  border-radius: var(--radius-sm);
  padding: 14px;
  max-width: 320px;
  margin: 0 auto;
}
.error-line {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
