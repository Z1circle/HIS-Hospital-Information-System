<template>
  <div class="hotwords-manage">
    <div class="page-header">
      <h2>热词管理</h2>
      <p class="subtitle">管理医疗关键词的热度权重和人工干预</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="selectedDepartment" placeholder="科室" clearable style="width: 150px">
          <el-option label="全部" value="all" />
          <el-option label="公共热词" value="common" />
          <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索关键词..."
          prefix-icon="Search"
          clearable
          style="width: 300px; margin-left: 10px"
          @input="handleSearch"
        />
        <el-select v-model="filterType" placeholder="节点类型" clearable style="width: 150px; margin-left: 10px">
          <el-option label="全部" value="" />
          <el-option label="疾病" value="disease" />
          <el-option label="症状" value="symptom" />
          <el-option label="药品" value="drug" />
          <el-option label="检查" value="test" />
          <el-option label="其他" value="other" />
        </el-select>
        <el-button style="margin-left: 10px" @click="loadHotwords">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Upload" @click="openBatchImportDialog">批量导入</el-button>
        <el-button :icon="Document" @click="viewImportHistory">导入记录</el-button>
        <el-statistic title="TOP热词数" :value="topCount" />
        <el-statistic title="总热词数" :value="totalCount" style="margin-left: 30px" />
      </div>
    </div>

    <el-table :data="filteredHotwords" v-loading="loading" stripe style="width: 100%; margin-top: 20px" max-height="600">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="keyword" label="关键词" min-width="150">
        <template #default="{ row }">
          <span class="keyword-cell">
            <span class="keyword-icon">{{ getNodeIcon(row.node_type) }}</span>
            <span>{{ row.keyword }}</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="node_type" label="节点类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getNodeTypeColor(row.node_type)" size="small">
            {{ getNodeTypeLabel(row.node_type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="weight" label="原始权重" width="100" />
      <el-table-column label="人工权重" width="200">
        <template #default="{ row }">
          <div class="weight-control">
            <el-slider
              v-model="row.manual_weight"
              :min="0"
              :max="2"
              :step="0.1"
              :show-tooltip="true"
              @change="handleWeightChange(row)"
            />
            <span class="weight-value">{{ row.manual_weight?.toFixed(1) || '1.0' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="综合权重" width="120">
        <template #default="{ row }">
          <span class="final-weight" :class="{ 'is-top': row.is_top }">
            {{ (row.weight * (row.manual_weight || 1)).toFixed(1) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="TOP" width="80">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_top"
            :active-value="1"
            :inactive-value="0"
            @change="handleTopChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="usage_count" label="使用次数" width="100" />
      <el-table-column label="科室" width="120">
        <template #default="{ row }">
          <span>{{ row.department_name || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="totalCount"
      :page-sizes="[20, 50, 100, 200]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; justify-content: flex-end"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />

    <el-dialog v-model="detailDialogVisible" title="热词详情" width="600px">
      <el-descriptions :column="2" border v-if="selectedKeyword">
        <el-descriptions-item label="ID">{{ selectedKeyword.id }}</el-descriptions-item>
        <el-descriptions-item label="关键词">{{ selectedKeyword.keyword }}</el-descriptions-item>
        <el-descriptions-item label="节点类型">
          <el-tag :type="getNodeTypeColor(selectedKeyword.node_type)" size="small">
            {{ getNodeTypeLabel(selectedKeyword.node_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关键词类型">{{ selectedKeyword.keyword_type }}</el-descriptions-item>
        <el-descriptions-item label="原始权重">{{ selectedKeyword.weight }}</el-descriptions-item>
        <el-descriptions-item label="人工权重">{{ selectedKeyword.manual_weight?.toFixed(1) || '1.0' }}</el-descriptions-item>
        <el-descriptions-item label="综合权重">{{ (selectedKeyword.weight * (selectedKeyword.manual_weight || 1)).toFixed(1) }}</el-descriptions-item>
        <el-descriptions-item label="使用次数">{{ selectedKeyword.usage_count }}</el-descriptions-item>
        <el-descriptions-item label="拼音首字母">{{ selectedKeyword.pinyin_initials || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属科室">{{ selectedKeyword.department_name || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="relation-section" v-if="selectedKeyword">
        <h4>关联关系</h4>
        <el-table :data="keywordRelations" size="small" max-height="200">
          <el-table-column prop="relation_type" label="关系类型" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ getRelationLabel(row.relation_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="target_keyword" label="关联词" />
          <el-table-column prop="target_node_type" label="类型" width="80">
            <template #default="{ row }">
              <span>{{ getNodeIcon(row.target_node_type) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="权重" width="80" />
        </el-table>
      </div>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="batchImportDialogVisible" title="批量导入热词" width="600px">
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="导入名称">
          <el-input v-model="importForm.import_name" placeholder="请输入导入名称" />
        </el-form-item>
        <el-form-item label="选择科室">
          <el-select v-model="importForm.department_id" placeholder="选择科室" clearable style="width: 100%">
            <el-option label="公共热词" :value="null" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="导入数据">
          <el-input
            v-model="importForm.keywordsText"
            type="textarea"
            :rows="10"
            placeholder="每行一个热词，格式：热词名称,类型,热度&#10;例如：&#10;感冒,diagnosis,50&#10;发热,symptom,40&#10;血常规,test,30"
          />
          <div class="form-tip">
            格式说明：每行一个热词，用逗号分隔。类型可选：diagnosis(诊断)、symptom(症状)、test(检查)、drug(药品)。热度范围1-100。
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchImportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>

    <!-- 导入记录对话框 -->
    <el-dialog v-model="importHistoryDialogVisible" title="导入记录" width="900px">
      <el-table :data="importHistory" stripe style="width: 100%">
        <el-table-column prop="import_name" label="导入名称" width="150" />
        <el-table-column prop="department_name" label="科室" width="120" />
        <el-table-column prop="total_count" label="总数" width="80" />
        <el-table-column prop="success_count" label="成功" width="80">
          <template #default="{ row }">
            <el-tag type="success">{{ row.success_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failed_count" label="失败" width="80">
          <template #default="{ row }">
            <el-tag type="danger">{{ row.failed_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="imported_by_name" label="导入人" width="100" />
        <el-table-column prop="created_at" label="导入时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="importHistoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'
import axios from 'axios'

interface Hotword {
  id: number
  keyword: string
  keyword_type: string
  node_type: string
  weight: number
  manual_weight: number | null
  usage_count: number
  is_top: boolean
  pinyin_initials: string
  department_name: string
}

interface Relation {
  id: number
  relation_type: string
  weight: number
  target_keyword: string
  target_node_type: string
}

const loading = ref(false)
const hotwords = ref<Hotword[]>([])
const searchKeyword = ref('')
const filterType = ref('')
const selectedDepartment = ref<string | number>('all')
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)
const detailDialogVisible = ref(false)
const selectedKeyword = ref<Hotword | null>(null)
const keywordRelations = ref<Relation[]>([])
const departments = ref<{ id: number; name: string }[]>([])
const isInitialLoad = ref(true)

const topCount = computed(() => hotwords.value.filter(h => h.is_top === true).length)

const filteredHotwords = computed(() => {
  let result = hotwords.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(h =>
      h.keyword.toLowerCase().includes(kw) ||
      h.pinyin_initials?.toLowerCase().includes(kw)
    )
  }
  if (filterType.value) {
    result = result.filter(h => h.node_type === filterType.value)
  }
  return result
})

const loadDepartments = async () => {
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data.departments || []
  } catch (err) {
    console.error('加载科室列表失败:', err)
  }
}

const loadHotwords = async () => {
  loading.value = true
  try {
    const params: any = { limit: pageSize.value, offset: (currentPage.value - 1) * pageSize.value }
    if (selectedDepartment.value !== 'all') {
      params.department_id = selectedDepartment.value
    }
    const res = await axios.get('/api/hot-keywords', { params })
    hotwords.value = (res.data.keywords || []).map((item: any) => ({
      ...item,
      manual_weight: item.manual_weight !== null ? parseFloat(item.manual_weight) : 1,
      is_top: item.is_top === true || item.is_top === 1
    }))
    totalCount.value = res.data.total || 0
  } catch (err) {
    console.error('加载热词失败:', err)
    ElMessage.error('加载热词失败')
  }
  loading.value = false
  isInitialLoad.value = false
}

const handleSearch = () => {
  currentPage.value = 1
  loadHotwords()
}

const handleSizeChange = () => {
  loadHotwords()
}

const handlePageChange = () => {
  loadHotwords()
}

const handleWeightChange = async (row: Hotword) => {
  try {
    await axios.put(`/api/hot-keywords/${row.id}/weight`, {
      manual_weight: row.manual_weight
    })
  } catch (err) {
    console.error('更新权重失败:', err)
  }
}

const handleTopChange = async (row: Hotword) => {
  try {
    await axios.put(`/api/hot-keywords/${row.id}/weight`, {
      is_top: row.is_top
    })
  } catch (err) {
    console.error('更新TOP状态失败:', err)
  }
}

const showDetail = async (row: Hotword) => {
  selectedKeyword.value = row
  detailDialogVisible.value = true

  try {
    const res = await axios.get('/api/knowledge-graph', {
      params: { keyword_id: row.id }
    })
    keywordRelations.value = res.data.relations?.filter((r: any) =>
      r.source_id === row.id || r.target_id === row.id
    ).map((r: any) => ({
      id: r.id,
      relation_type: r.relation_type,
      weight: r.weight,
      target_keyword: r.source_id === row.id ? r.target_keyword : r.source_keyword,
      target_node_type: r.source_id === row.id ? r.target_node_type : r.source_node_type
    })) || []
  } catch (err) {
    console.error('加载关联关系失败:', err)
    keywordRelations.value = []
  }
}

const getNodeIcon = (type: string) => {
  const icons: Record<string, string> = {
    disease: '🩺',
    symptom: '😷',
    drug: '💊',
    test: '🔬',
    other: '📋'
  }
  return icons[type] || '📋'
}

const getNodeTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    disease: 'danger',
    symptom: 'warning',
    drug: 'success',
    test: 'info',
    other: ''
  }
  return colors[type] || ''
}

const getNodeTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    disease: '疾病',
    symptom: '症状',
    drug: '药品',
    test: '检查',
    other: '其他'
  }
  return labels[type] || type
}

const getRelationLabel = (type: string) => {
  const labels: Record<string, string> = {
    has_symptom: '症状',
    has_drug: '用药',
    related_to: '相关',
    caused_by: '病因',
    test_for: '检查'
  }
  return labels[type] || type
}

// 批量导入功能
const batchImportDialogVisible = ref(false)
const importHistoryDialogVisible = ref(false)
const importing = ref(false)
const importForm = ref({
  import_name: '',
  department_id: null as number | null,
  keywordsText: ''
})
const importHistory = ref<any[]>([])

const openBatchImportDialog = () => {
  importForm.value = {
    import_name: '',
    department_id: null,
    keywordsText: ''
  }
  batchImportDialogVisible.value = true
}

const submitBatchImport = async () => {
  if (!importForm.value.import_name) {
    ElMessage.warning('请输入导入名称')
    return
  }

  if (!importForm.value.keywordsText.trim()) {
    ElMessage.warning('请输入导入数据')
    return
  }

  const lines = importForm.value.keywordsText.trim().split('\n')
  const keywords = []

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split(',').map(p => p.trim())
    if (parts.length < 1) continue

    const keyword = {
      keyword: parts[0],
      keyword_type: parts[1] || 'diagnosis',
      weight: parseInt(parts[2]) || 10
    }

    if (keyword.weight < 1 || keyword.weight > 100) {
      ElMessage.warning(`热词 "${keyword.keyword}" 的热度必须在1-100之间`)
      return
    }

    keywords.push(keyword)
  }

  if (keywords.length === 0) {
    ElMessage.warning('没有有效的热词数据')
    return
  }

  importing.value = true
  try {
    const res = await axios.post('/api/hot-keywords/batch-import', {
      import_name: importForm.value.import_name,
      department_id: importForm.value.department_id,
      keywords
    })

    if (res.data.success) {
      ElMessage.success(`导入成功！成功${res.data.success_count}个，失败${res.data.failed_count}个`)
      batchImportDialogVisible.value = false
      loadHotwords()
    }
  } catch (err: any) {
    ElMessage.error('导入失败: ' + (err.response?.data?.error || err.message))
  } finally {
    importing.value = false
  }
}

const viewImportHistory = async () => {
  try {
    const res = await axios.get('/api/hot-keywords/batch-import')
    if (res.data.success) {
      importHistory.value = res.data.imports
      importHistoryDialogVisible.value = true
    }
  } catch (err: any) {
    ElMessage.error('加载导入记录失败: ' + (err.response?.data?.error || err.message))
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadDepartments()
  loadHotwords()
})

watch(selectedDepartment, () => {
  currentPage.value = 1
  loadHotwords()
})
</script>

<style scoped>
.hotwords-manage {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.keyword-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keyword-icon {
  font-size: 18px;
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weight-control :deep(.el-slider) {
  flex: 1;
}

.weight-value {
  min-width: 35px;
  text-align: right;
  font-size: 13px;
  color: #606266;
}

.final-weight {
  font-weight: bold;
  color: #606266;
}

.final-weight.is-top {
  color: #f56c6c;
}

.relation-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.relation-section h4 {
  margin: 0 0 15px 0;
  color: #303133;
}
</style>
