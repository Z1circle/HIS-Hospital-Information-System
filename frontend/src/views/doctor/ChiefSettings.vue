<template>
  <div class="chief-settings">
    <el-card class="header-card">
      <div class="header-content">
        <div class="title-section">
          <h2 class="title">主任医师热词管理</h2>
          <p class="subtitle">管理本科室的热词，调整热词热度和显示状态</p>
        </div>
        <div class="actions">
          <el-button type="primary" :icon="Refresh" @click="loadKeywords">刷新</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20">
      <!-- 左侧：热词列表 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>热词列表</span>
              <div class="header-actions">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索热词"
                  prefix-icon="Search"
                  size="small"
                  style="width: 200px"
                  clearable
                />
                <el-select v-model="filterType" placeholder="类型" size="small" style="width: 120px" clearable>
                  <el-option label="诊断" value="diagnosis" />
                  <el-option label="症状" value="symptom" />
                  <el-option label="检查" value="test" />
                  <el-option label="药品" value="drug" />
                </el-select>
              </div>
            </div>
          </template>

          <el-table :data="filteredKeywords" stripe style="width: 100%" max-height="600">
            <el-table-column prop="keyword" label="热词" width="150" />
            <el-table-column prop="keyword_type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getKeywordTypeColor(row.keyword_type)" size="small">
                  {{ getKeywordTypeLabel(row.keyword_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="热度" width="100" sortable />
            <el-table-column prop="usage_count" label="使用次数" width="100" sortable />
            <el-table-column prop="is_top" label="置顶" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_top ? 'success' : 'info'" size="small">
                  {{ row.is_top ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="is_hidden" label="隐藏" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_hidden ? 'danger' : 'success'" size="small">
                  {{ row.is_hidden ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department_name" label="科室" width="120" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="openAdjustDialog(row)">调整</el-button>
                <el-button size="small" @click="viewAdjustLogs(row)">日志</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：统计信息 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>统计信息</span>
          </template>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">总热词数</div>
              <div class="stat-value">{{ keywords.length }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">置顶热词</div>
              <div class="stat-value">{{ keywords.filter(k => k.is_top).length }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">隐藏热词</div>
              <div class="stat-value">{{ keywords.filter(k => k.is_hidden).length }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">本科室热词</div>
              <div class="stat-value">{{ keywords.filter(k => k.department_id === currentUser?.department_id).length }}</div>
            </div>
          </div>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>使用排行</span>
          </template>

          <div class="ranking-list">
            <div
              v-for="(keyword, index) in topKeywords"
              :key="keyword.id"
              class="ranking-item"
            >
              <div class="rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="keyword">{{ keyword.keyword }}</div>
              <div class="count">{{ keyword.usage_count }}次</div>
            </div>
            <el-empty v-if="topKeywords.length === 0" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 调整热词对话框 -->
    <el-dialog v-model="adjustDialogVisible" title="调整热词" width="500px">
      <el-form :model="adjustForm" label-width="100px">
        <el-form-item label="热词">
          <el-input v-model="adjustForm.keyword" disabled />
        </el-form-item>
        <el-form-item label="热度">
          <el-input-number v-model="adjustForm.weight" :min="1" :max="100" />
          <span class="form-tip">数值越大，显示越靠前</span>
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="adjustForm.is_top" />
          <span class="form-tip">置顶的热词会显示在最前面</span>
        </el-form-item>
        <el-form-item label="隐藏">
          <el-switch v-model="adjustForm.is_hidden" />
          <span class="form-tip">隐藏的热词不会显示给其他医生</span>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input
            v-model="adjustForm.adjustment_reason"
            type="textarea"
            :rows="3"
            placeholder="请输入调整原因（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjustment">确定</el-button>
      </template>
    </el-dialog>

    <!-- 调整日志对话框 -->
    <el-dialog v-model="logsDialogVisible" title="调整日志" width="800px">
      <el-table :data="adjustLogs" stripe style="width: 100%">
        <el-table-column prop="created_at" label="调整时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="doctor_name" label="调整人" width="120" />
        <el-table-column label="热度变化" width="150">
          <template #default="{ row }">
            <span v-if="row.old_weight !== row.new_weight">
              {{ row.old_weight }} → {{ row.new_weight }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="置顶变化" width="100">
          <template #default="{ row }">
            <span v-if="row.old_is_top !== row.new_is_top">
              {{ row.old_is_top ? '是' : '否' }} → {{ row.new_is_top ? '是' : '否' }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="adjustment_reason" label="调整原因" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="logsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const currentUser = userStore.currentUser

interface Keyword {
  id: number
  keyword: string
  keyword_type: string
  weight: number
  usage_count: number
  is_top: boolean
  is_hidden: boolean
  department_id?: number
  department_name?: string
}

interface AdjustLog {
  id: number
  keyword_id: number
  doctor_id: number
  old_weight: number
  new_weight: number
  old_is_top: boolean
  new_is_top: boolean
  old_is_hidden: boolean
  new_is_hidden: boolean
  adjustment_reason: string
  created_at: string
  doctor_name?: string
}

const keywords = ref<Keyword[]>([])
const searchKeyword = ref('')
const filterType = ref('')
const adjustDialogVisible = ref(false)
const logsDialogVisible = ref(false)
const adjustForm = ref({
  id: 0,
  keyword: '',
  weight: 10,
  is_top: false,
  is_hidden: false,
  adjustment_reason: ''
})
const adjustLogs = ref<AdjustLog[]>([])

const filteredKeywords = computed(() => {
  return keywords.value.filter(k => {
    const matchSearch = !searchKeyword.value || k.keyword.toLowerCase().includes(searchKeyword.value.toLowerCase())
    const matchType = !filterType.value || k.keyword_type === filterType.value
    return matchSearch && matchType
  })
})

const topKeywords = computed(() => {
  return [...keywords.value]
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10)
})

const loadKeywords = async () => {
  try {
    const res = await axios.get('/api/chief-physician/keywords')
    if (res.data.success) {
      keywords.value = res.data.keywords
    }
  } catch (err: any) {
    ElMessage.error('加载热词失败: ' + (err.response?.data?.error || err.message))
  }
}

const openAdjustDialog = (keyword: Keyword) => {
  adjustForm.value = {
    id: keyword.id,
    keyword: keyword.keyword,
    weight: keyword.weight,
    is_top: keyword.is_top,
    is_hidden: keyword.is_hidden,
    adjustment_reason: ''
  }
  adjustDialogVisible.value = true
}

const submitAdjustment = async () => {
  try {
    const res = await axios.put(`/api/hot-keywords/${adjustForm.value.id}/chief-adjust`, {
      weight: adjustForm.value.weight,
      is_top: adjustForm.value.is_top,
      is_hidden: adjustForm.value.is_hidden,
      adjustment_reason: adjustForm.value.adjustment_reason
    })

    if (res.data.success) {
      ElMessage.success('调整成功')
      adjustDialogVisible.value = false
      loadKeywords()
    }
  } catch (err: any) {
    ElMessage.error('调整失败: ' + (err.response?.data?.error || err.message))
  }
}

const viewAdjustLogs = async (keyword: Keyword) => {
  try {
    const res = await axios.get(`/api/hot-keywords/${keyword.id}/adjustment-logs`)
    if (res.data.success) {
      adjustLogs.value = res.data.logs
      logsDialogVisible.value = true
    }
  } catch (err: any) {
    ElMessage.error('加载日志失败: ' + (err.response?.data?.error || err.message))
  }
}

const getKeywordTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    diagnosis: '诊断',
    symptom: '症状',
    test: '检查',
    drug: '药品'
  }
  return labels[type] || type
}

const getKeywordTypeColor = (type: string) => {
  const colors: Record<string, any> = {
    diagnosis: '',
    symptom: 'warning',
    test: 'info',
    drug: 'success'
  }
  return colors[type] || ''
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadKeywords()
})
</script>

<style scoped>
.chief-settings {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section .title {
  margin: 0 0 5px 0;
  font-size: 20px;
  color: #333;
}

.title-section .subtitle {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.ranking-list {
  max-height: 400px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  margin-right: 10px;
  background: #eee;
}

.rank-1 {
  background: #f56c6c;
  color: white;
}

.rank-2 {
  background: #e6a23c;
  color: white;
}

.rank-3 {
  background: #409eff;
  color: white;
}

.keyword {
  flex: 1;
  font-size: 14px;
}

.count {
  font-size: 12px;
  color: #666;
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}
</style>