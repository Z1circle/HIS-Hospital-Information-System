<template>
  <div class="chief-hotwords-manage">
    <div class="page-header">
      <h2>科室热词管理</h2>
      <p class="subtitle">管理本科室医疗关键词的优先级和展示顺序</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-tag type="success" size="large">{{ currentUser?.department_name || '内科' }}</el-tag>
        <el-tag type="info" size="large" style="margin-left: 10px">主任医师权限</el-tag>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索关键词..."
          prefix-icon="Search"
          clearable
          style="width: 300px; margin-left: 20px"
          @input="handleSearch"
        />
        <el-select v-model="filterType" placeholder="类型" clearable style="width: 120px; margin-left: 10px">
          <el-option label="全部" value="" />
          <el-option label="诊断" value="diagnosis" />
          <el-option label="症状" value="symptom" />
        </el-select>
        <el-button style="margin-left: 10px" @click="loadHotwords">刷新</el-button>
      </div>
      <div class="toolbar-right">
        <el-statistic title="置顶热词" :value="topCount" />
        <el-statistic title="总热词数" :value="totalCount" style="margin-left: 30px" />
      </div>
    </div>

    <el-table :data="filteredHotwords" v-loading="loading" stripe style="width: 100%; margin-top: 20px" max-height="600"
              row-key="id" :row-class-name="getRowClassName">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="keyword" label="关键词" min-width="150">
        <template #default="{ row }">
          <span class="keyword-cell">
            <span v-if="row.is_top" class="top-badge">🔥</span>
            <span>{{ row.keyword }}</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="keyword_type" label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.keyword_type === 'diagnosis' ? 'primary' : 'warning'" size="small">
            {{ row.keyword_type === 'diagnosis' ? '诊断' : '症状' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="150">
        <template #default="{ row }">
          <div class="priority-control">
            <el-slider
              v-model="row.priority"
              :min="0"
              :max="200"
              :step="10"
              :show-tooltip="true"
              @change="handlePriorityChange(row)"
            />
            <span class="priority-value">{{ row.priority }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="weight" label="权重" width="80" />
      <el-table-column label="置顶" width="80">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_top"
            :active-value="true"
            :inactive-value="false"
            @change="handleTopChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="隐藏" width="80">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_hidden"
            @change="handleHiddenChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="usage_count" label="使用次数" width="100" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="moveUp(row)" :disabled="!canMoveUp(row)">上移</el-button>
          <el-button size="small" type="primary" link @click="moveDown(row)" :disabled="!canMoveDown(row)">下移</el-button>
          <el-button size="small" type="danger" link @click="deleteKeyword(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="totalCount"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; justify-content: flex-end"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />

    <!-- 添加热词对话框 -->
    <el-dialog v-model="addDialogVisible" title="添加热词" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="关键词">
          <el-input v-model="addForm.keyword" placeholder="请输入关键词" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="addForm.keyword_type" style="width: 100%">
            <el-option label="诊断" value="diagnosis" />
            <el-option label="症状" value="symptom" />
          </el-select>
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number v-model="addForm.weight" :min="1" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="addForm.is_top" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addKeyword" :loading="adding">添加</el-button>
      </template>
    </el-dialog>

    <!-- 操作记录对话框 -->
    <el-dialog v-model="historyDialogVisible" title="调整记录" width="800px">
      <el-table :data="adjustmentHistory" stripe style="width: 100%">
        <el-table-column prop="keyword" label="关键词" width="150" />
        <el-table-column prop="old_priority" label="原优先级" width="100" />
        <el-table-column prop="new_priority" label="新优先级" width="100" />
        <el-table-column prop="old_is_top" label="原置顶" width="80">
          <template #default="{ row }">
            <el-tag :type="row.old_is_top ? 'success' : 'info'" size="small">
              {{ row.old_is_top ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="new_is_top" label="新置顶" width="80">
          <template #default="{ row }">
            <el-tag :type="row.new_is_top ? 'success' : 'info'" size="small">
              {{ row.new_is_top ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="调整时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

interface Hotword {
  id: number
  keyword: string
  keyword_type: string
  weight: number
  priority: number
  is_top: boolean
  is_hidden: boolean
  usage_count: number
}

interface AdjustmentHistory {
  id: number
  keyword: string
  old_priority: number
  new_priority: number
  old_is_top: boolean
  new_is_top: boolean
  created_at: string
}

const currentUser = ref<any>(null)
const loading = ref(false)
const hotwords = ref<Hotword[]>([])
const searchKeyword = ref('')
const filterType = ref('')
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)
const addDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const adding = ref(false)
const addForm = ref({
  keyword: '',
  keyword_type: 'diagnosis',
  weight: 50,
  is_top: false
})
const adjustmentHistory = ref<AdjustmentHistory[]>([])

const topCount = computed(() => hotwords.value.filter(h => h.is_top === true).length)

const filteredHotwords = computed(() => {
  let result = hotwords.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(h => h.keyword.toLowerCase().includes(kw))
  }
  if (filterType.value) {
    result = result.filter(h => h.keyword_type === filterType.value)
  }
  // 按优先级和置顶状态排序
  return result.sort((a, b) => {
    if (a.is_top !== b.is_top) return b.is_top ? 1 : -1
    return b.priority - a.priority
  })
})

const loadCurrentUser = async () => {
  try {
    const res = await axios.get('/api/auth/me')
    currentUser.value = res.data

    // 检查是否为主任医师
    if (!res.data.is_chief_physician) {
      ElMessage.error('您不是主任医师，无法访问此页面')
      window.location.href = '/doctor/workbench'
    }
  } catch (err) {
    console.error('获取用户信息失败:', err)
    ElMessage.error('获取用户信息失败')
  }
}

const loadHotwords = async () => {
  loading.value = true
  try {
    const params: any = {
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value,
      department_id: currentUser.value?.department_id
    }
    const res = await axios.get('/api/hot-keywords', { params })
    hotwords.value = (res.data.keywords || []).map((item: any) => ({
      ...item,
      is_top: item.is_top === true || item.is_top === 1,
      is_hidden: item.is_hidden === true || item.is_hidden === 1,
      priority: item.priority || 0
    }))
    totalCount.value = res.data.total || 0
  } catch (err) {
    console.error('加载热词失败:', err)
    ElMessage.error('加载热词失败')
  }
  loading.value = false
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

const handlePriorityChange = async (row: Hotword) => {
  try {
    await axios.put(`/api/hot-keywords/${row.id}/chief-adjust`, {
      priority: row.priority,
      doctor_id: currentUser.value?.doctor_id
    })
    ElMessage.success('优先级调整成功')
    loadHotwords()
  } catch (err) {
    console.error('调整优先级失败:', err)
    ElMessage.error('调整优先级失败')
  }
}

const handleTopChange = async (row: Hotword) => {
  try {
    await axios.put(`/api/hot-keywords/${row.id}/chief-adjust`, {
      is_top: row.is_top,
      priority: row.is_top ? Math.max(row.priority, 100) : row.priority,
      doctor_id: currentUser.value?.doctor_id
    })
    ElMessage.success('置顶状态调整成功')
    loadHotwords()
  } catch (err) {
    console.error('调整置顶状态失败:', err)
    ElMessage.error('调整置顶状态失败')
  }
}

const handleHiddenChange = async (row: Hotword) => {
  try {
    await axios.put(`/api/hot-keywords/${row.id}/chief-adjust`, {
      is_hidden: row.is_hidden,
      doctor_id: currentUser.value?.doctor_id
    })
    ElMessage.success('隐藏状态调整成功')
    loadHotwords()
  } catch (err) {
    console.error('调整隐藏状态失败:', err)
    ElMessage.error('调整隐藏状态失败')
  }
}

const canMoveUp = (row: Hotword) => {
  const index = filteredHotwords.value.findIndex(h => h.id === row.id)
  return index > 0
}

const canMoveDown = (row: Hotword) => {
  const index = filteredHotwords.value.findIndex(h => h.id === row.id)
  return index < filteredHotwords.value.length - 1
}

const moveUp = async (row: Hotword) => {
  const index = filteredHotwords.value.findIndex(h => h.id === row.id)
  if (index <= 0) return

  const aboveRow = filteredHotwords.value[index - 1]
  const tempPriority = row.priority

  try {
    await axios.put(`/api/hot-keywords/${row.id}/chief-adjust`, {
      priority: aboveRow.priority + 10,
      doctor_id: currentUser.value?.doctor_id
    })
    await axios.put(`/api/hot-keywords/${aboveRow.id}/chief-adjust`, {
      priority: tempPriority,
      doctor_id: currentUser.value?.doctor_id
    })
    ElMessage.success('上移成功')
    loadHotwords()
  } catch (err) {
    console.error('上移失败:', err)
    ElMessage.error('上移失败')
  }
}

const moveDown = async (row: Hotword) => {
  const index = filteredHotwords.value.findIndex(h => h.id === row.id)
  if (index >= filteredHotwords.value.length - 1) return

  const belowRow = filteredHotwords.value[index + 1]
  const tempPriority = row.priority

  try {
    await axios.put(`/api/hot-keywords/${row.id}/chief-adjust`, {
      priority: belowRow.priority - 10,
      doctor_id: currentUser.value?.doctor_id
    })
    await axios.put(`/api/hot-keywords/${belowRow.id}/chief-adjust`, {
      priority: tempPriority,
      doctor_id: currentUser.value?.doctor_id
    })
    ElMessage.success('下移成功')
    loadHotwords()
  } catch (err) {
    console.error('下移失败:', err)
    ElMessage.error('下移失败')
  }
}

const addKeyword = async () => {
  if (!addForm.value.keyword.trim()) {
    ElMessage.warning('请输入关键词')
    return
  }

  adding.value = true
  try {
    await axios.post('/api/hot-keywords', {
      department_id: currentUser.value?.department_id,
      keyword: addForm.value.keyword.trim(),
      keyword_type: addForm.value.keyword_type,
      weight: addForm.value.weight,
      is_top: addForm.value.is_top,
      priority: addForm.value.is_top ? 100 : 50
    })
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    addForm.value = { keyword: '', keyword_type: 'diagnosis', weight: 50, is_top: false }
    loadHotwords()
  } catch (err) {
    console.error('添加失败:', err)
    ElMessage.error('添加失败')
  } finally {
    adding.value = false
  }
}

const deleteKeyword = async (row: Hotword) => {
  try {
    await ElMessageBox.confirm('确定要删除这个热词吗？', '确认删除', {
      type: 'warning'
    })
    await axios.delete(`/api/hot-keywords/${row.id}`)
    ElMessage.success('删除成功')
    loadHotwords()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

const loadAdjustmentHistory = async () => {
  try {
    const res = await axios.get('/api/hot-keywords/adjustment-history', {
      params: { department_id: currentUser.value?.department_id }
    })
    adjustmentHistory.value = res.data.history || []
  } catch (err) {
    console.error('加载调整记录失败:', err)
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getRowClassName = ({ row }: { row: Hotword }) => {
  if (row.is_top) return 'top-row'
  if (row.is_hidden) return 'hidden-row'
  return ''
}

onMounted(() => {
  loadCurrentUser()
  loadHotwords()
  loadAdjustmentHistory()
})
</script>

<style scoped>
.chief-hotwords-manage {
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

.top-badge {
  font-size: 16px;
}

.priority-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.priority-control :deep(.el-slider) {
  flex: 1;
}

.priority-value {
  min-width: 40px;
  text-align: right;
  font-size: 13px;
  color: #606266;
  font-weight: bold;
}

:deep(.top-row) {
  background-color: #fff7e6 !important;
}

:deep(.hidden-row) {
  opacity: 0.6;
  background-color: #f5f5f5 !important;
}
</style>