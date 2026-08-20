<template>
  <div class="clinical-keywords-panel">
    <div class="panel-header">
      <el-icon :size="16"><TrendCharts /></el-icon>
      <span class="panel-title">科室热点 · 智能录入</span>
      <el-icon :size="14" class="refresh-icon" title="刷新" @click="loadComplaints"><Refresh /></el-icon>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-icon :size="18" class="spin"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="complaints.length === 0" class="empty-state">
      <span>暂无热点词条</span>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 第一层：高频主诉区 -->
      <div class="chief-complaints">
        <div
          v-for="item in complaints"
          :key="item.id"
          :class="['chief-pill', { active: activeComplaint?.id === item.id }]"
          @click="selectComplaint(item)"
        >
          <span v-if="hasUrgencyColor(item)" class="urgent-dot"></span>
          {{ item.keyword }}
        </div>
      </div>

      <!-- 第二层：分类关联区（点击主诉后展开） -->
      <transition name="expand">
        <div v-if="activeComplaint" class="expansion-panel" key="expansion">
          <!-- 加载中的关联词 -->
          <div v-if="relatedLoading" class="related-loading">
            <el-icon :size="14" class="spin"><Loading /></el-icon>
            <span>正在分析关联词条...</span>
          </div>

          <!-- 分类展示 -->
          <template v-else>
            <div
              v-for="cat in relatedCategories"
              :key="cat.type"
              class="category-block"
            >
              <div class="cat-label">
                <span class="cat-label-icon">{{ getCatIcon(cat.type) }}</span>
                {{ cat.name }}
              </div>
              <div class="cat-tags">
                <span
                  v-for="tag in cat.items"
                  :key="tag.id"
                  :class="['cat-tag', getTagColor(tag)]"
                  @click.stop="emitKeyword(tag)"
                >
                  {{ tag.keyword }}
                </span>
              </div>
            </div>

            <div v-if="relatedCategories.length === 0 && !relatedLoading" class="related-empty">
              该词条暂无分类关联数据
            </div>
          </template>
        </div>
      </transition>
    </template>

    <div class="panel-footer">
      <span class="footer-tip">点击主诉查看关联词条，点击词条填入病历</span>
      <el-button v-if="canManage" size="small" type="text" @click="showManageDialog = true">管理</el-button>
    </div>

    <!-- 管理弹窗（仅主任医师可见） -->
    <el-dialog v-model="showManageDialog" title="热点词条管理" width="500px">
      <div class="manage-content">
        <div class="add-section">
          <el-input v-model="newKeyword" placeholder="输入新词条" @keyup.enter="addKeyword">
            <template #append>
              <el-button @click="addKeyword">添加</el-button>
            </template>
          </el-input>
          <el-select v-model="newKeywordType" placeholder="类型" style="width: 100px; margin-left: 8px">
            <el-option label="诊断" value="diagnosis" />
            <el-option label="症状" value="symptom" />
          </el-select>
        </div>
        
        <el-table :data="allKeywords" stripe size="small" style="margin-top: 16px">
          <el-table-column prop="keyword" label="词条" />
          <el-table-column prop="keyword_type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.keyword_type === 'diagnosis' ? 'primary' : 'warning'" size="small">
                {{ row.keyword_type === 'diagnosis' ? '诊断' : '症状' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="权重" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.weight" :min="1" :max="100" size="small" @change="updateKeyword(row)" />
            </template>
          </el-table-column>
          <el-table-column label="置顶" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.is_top" @change="updateKeyword(row)" />
            </template>
          </el-table-column>
          <el-table-column label="隐藏" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.is_hidden" @change="updateKeyword(row)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="deleteKeyword(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { TrendCharts, Refresh, Loading } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

interface Keyword {
  id: number
  department_id: number
  keyword: string
  keyword_type: string
  weight: number
  is_top: boolean
  is_hidden: boolean
  usage_count: number
  total_weight?: number
  cnt?: number
}

interface RelatedCategory {
  name: string
  type: string
  items: Keyword[]
}

const props = defineProps<{
  departmentId?: number
  canManage?: boolean
}>()

const emit = defineEmits<{
  (e: 'keyword-click', keyword: string): void
}>()

const loading = ref(false)
const complaints = ref<Keyword[]>([])
const activeComplaint = ref<Keyword | null>(null)
const relatedCategories = ref<RelatedCategory[]>([])
const relatedLoading = ref(false)

const allKeywords = ref<Keyword[]>([])
const showManageDialog = ref(false)
const newKeyword = ref('')
const newKeywordType = ref('diagnosis')

// ============ 紧急程度判断 ============

/** 红色标记：急症/高热类症状或急性病 */
const hasUrgencyColor = (item: Keyword) => {
  const kw = item.keyword
  const urgentWords = ['发热', '高热', '胸痛', '呼吸困难', '惊厥', '大出血', '休克', '中毒', '心梗', '心绞痛',
    '急性', '咯血', '呕血', '昏迷', '抽搐', '窒息', '哮喘持续', '气胸']
  return urgentWords.some(w => kw.includes(w))
}

/** 根据词条类型和紧急程度返回颜色 class */
const getTagColor = (item: Keyword) => {
  if (hasUrgencyColor(item)) return 'tag-red'
  // 慢性病或普通症状用蓝色
  if (item.keyword_type === 'disease' || item.keyword_type === 'diagnosis') return 'tag-blue'
  return 'tag-default'
}

// ============ 分类图标 ============

const getCatIcon = (type: string) => {
  const icons: Record<string, string> = {
    quality: '📋',
    associated: '🔗',
    trigger: '⚠️',
    differential: '🩺',
    check: '🔬',
    tcm: '🌿'
  }
  return icons[type] || '📌'
}

// ============ 核心交互 ============

/** 加载去重后的高频主诉 */
const loadComplaints = async () => {
  loading.value = true
  activeComplaint.value = null
  relatedCategories.value = []

  try {
    const deptId = props.departmentId || 1
    const cacheKey = `chief_complaints_${deptId}`
    const cached = localStorage.getItem(cacheKey)
    const cacheTime = localStorage.getItem(`${cacheKey}_time`)

    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 5 * 60 * 1000) {
      complaints.value = JSON.parse(cached)
      loading.value = false
      return
    }

    const res = await axios.get('/api/hot-keywords/chief-complaints', {
      params: { department_id: deptId, limit: 8 }
    })
    const list: Keyword[] = res.data.complaints || []
    complaints.value = list
    if (list.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(list))
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
    }
  } catch (e) {
    // 兜底：从旧接口获取并前端去重
    try {
      const res = await axios.get('/api/hot-keywords', {
        params: { department_id: props.departmentId || 1, limit: 30 }
      })
      const all: Keyword[] = res.data.keywords || []
      // 前端去重聚合
      const map = new Map<string, Keyword>()
      for (const k of all) {
        const key = k.keyword
        const existing = map.get(key)
        if (!existing || k.weight > existing.weight) {
          map.set(key, { ...k, total_weight: (existing?.total_weight || 0) + k.weight, cnt: (existing?.cnt || 0) + 1 })
        } else {
          existing.total_weight = (existing.total_weight || existing.weight) + k.weight
          existing.cnt = (existing.cnt || 1) + 1
        }
      }
      const deduped = Array.from(map.values())
        .sort((a, b) => (b.total_weight || b.weight) - (a.total_weight || a.weight))
        .slice(0, 8)
      complaints.value = deduped
    } catch {
      complaints.value = getDefaultComplaints()
    }
  }
  loading.value = false
}

/** 点击主诉气泡 → 加载分类关联词 */
const selectComplaint = async (item: Keyword) => {
  // 点同一个 → 收起
  if (activeComplaint.value?.id === item.id) {
    activeComplaint.value = null
    relatedCategories.value = []
    return
  }

  // 填词
  emit('keyword-click', item.keyword)
  
  // 展开关联
  activeComplaint.value = item
  relatedCategories.value = []
  relatedLoading.value = true

  try {
    const res = await axios.get(`/api/hot-keywords/${item.id}/related`, {
      params: { department_id: props.departmentId || undefined, limit: 5, categorized: 'true' }
    })
    relatedCategories.value = res.data.categories || []
  } catch {
    relatedCategories.value = []
  }
  relatedLoading.value = false
}

/** 点击分类标签 → 填入病历 */
const emitKeyword = (tag: Keyword) => {
  emit('keyword-click', tag.keyword)

  // 记录使用
  axios.post('/api/hot-keywords/use', {
    keyword_id: tag.id,
    doctor_id: 1,
    patient_id: 0
  }).catch(() => {})
}

// ============ 默认兜底数据 ============

const getDefaultComplaints = (): Keyword[] => {
  const deptId = props.departmentId || 1
  const defaults: Record<number, Keyword[]> = {
    1: [
      { id: 1, department_id: 1, keyword: '发热', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 2, department_id: 1, keyword: '咳嗽', keyword_type: 'symptom', weight: 95, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 3, department_id: 1, keyword: '头痛', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 4, department_id: 1, keyword: '乏力', keyword_type: 'symptom', weight: 85, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 5, department_id: 1, keyword: '流涕', keyword_type: 'symptom', weight: 80, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 6, department_id: 1, keyword: '胸痛', keyword_type: 'symptom', weight: 75, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    2: [
      { id: 7, department_id: 2, keyword: '胸痛', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 8, department_id: 2, keyword: '心悸', keyword_type: 'symptom', weight: 95, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 9, department_id: 2, keyword: '胸闷', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 10, department_id: 2, keyword: '头晕', keyword_type: 'symptom', weight: 85, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    3: [
      { id: 11, department_id: 3, keyword: '多饮', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 12, department_id: 3, keyword: '多食', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 13, department_id: 3, keyword: '多尿', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 14, department_id: 3, keyword: '乏力', keyword_type: 'symptom', weight: 85, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    4: [
      { id: 15, department_id: 4, keyword: '腹痛', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 16, department_id: 4, keyword: '腹泻', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 17, department_id: 4, keyword: '恶心', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 18, department_id: 4, keyword: '反酸', keyword_type: 'symptom', weight: 85, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    5: [
      { id: 19, department_id: 5, keyword: '腰痛', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 20, department_id: 5, keyword: '颈痛', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 21, department_id: 5, keyword: '肢体麻木', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    6: [
      { id: 22, department_id: 6, keyword: '失眠', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 23, department_id: 6, keyword: '情绪低落', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
      { id: 24, department_id: 6, keyword: '烦躁', keyword_type: 'symptom', weight: 90, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    7: [
      { id: 25, department_id: 7, keyword: '皮肤瘙痒', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 26, department_id: 7, keyword: '皮疹', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
    ],
    8: [
      { id: 27, department_id: 8, keyword: '视力下降', keyword_type: 'symptom', weight: 100, is_top: true, is_hidden: false, usage_count: 0 },
      { id: 28, department_id: 8, keyword: '眼痛', keyword_type: 'symptom', weight: 95, is_top: false, is_hidden: false, usage_count: 0 },
    ]
  }
  return defaults[deptId] || defaults[1]
}

// ============ 管理相关 ============

const loadAllKeywords = async () => {
  try {
    const res = await axios.get('/api/hot-keywords', {
      params: { department_id: props.departmentId || 1, limit: 100 }
    })
    allKeywords.value = res.data.keywords || []
  } catch {
    allKeywords.value = []
  }
}

const addKeyword = async () => {
  if (!newKeyword.value.trim()) {
    ElMessage.warning('请输入词条')
    return
  }
  try {
    await axios.post('/api/hot-keywords', {
      department_id: props.departmentId || 1,
      keyword: newKeyword.value.trim(),
      keyword_type: newKeywordType.value,
      weight: 50
    })
    ElMessage.success('添加成功')
    newKeyword.value = ''
    loadAllKeywords()
    loadComplaints()
  } catch {
    ElMessage.error('添加失败')
  }
}

const updateKeyword = async (keyword: Keyword) => {
  try {
    await axios.put(`/api/hot-keywords/${keyword.id}`, {
      weight: keyword.weight,
      is_top: keyword.is_top,
      is_hidden: keyword.is_hidden
    })
    loadComplaints()
  } catch {
    ElMessage.error('更新失败')
  }
}

const deleteKeyword = async (id: number) => {
  try {
    await axios.delete(`/api/hot-keywords/${id}`)
    ElMessage.success('删除成功')
    loadAllKeywords()
    loadComplaints()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ============ 生命周期 ============

watch(() => props.departmentId, () => {
  activeComplaint.value = null
  relatedCategories.value = []
  loadComplaints()
})

watch(showManageDialog, (val) => {
  if (val) loadAllKeywords()
})

onMounted(() => {
  loadComplaints()
})
</script>

<style scoped>
.clinical-keywords-panel {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #EEF0F4;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F0F2F5;
  color: #555;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.refresh-icon {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}
.refresh-icon:hover {
  color: #1E88E5;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  color: #999;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  color: #BBB;
  font-size: 13px;
}

/* ============ 高频主诉区 ============ */
.chief-complaints {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chief-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  /* 默认：浅灰背景 */
  background: #F5F7FA;
  color: #555;
  border: 1px solid transparent;
}

.chief-pill:hover {
  background: #E8EDF2;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.chief-pill.active {
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  color: #1565C0;
  border-color: #90CAF9;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.2);
}

/* 紧急标记：红色小圆点 */
.urgent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #EF5350;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ============ 展开面板 ============ */
.expansion-panel {
  margin-top: 14px;
  padding: 12px;
  background: #F8FAFB;
  border-radius: 10px;
  border: 1px solid #E8ECF0;
}

.expand-enter-active {
  animation: expandIn 0.25s ease-out;
}
.expand-leave-active {
  animation: expandIn 0.15s ease-in reverse;
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 600px;
  }
}

.related-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.related-empty {
  padding: 16px;
  color: #BBB;
  font-size: 13px;
  text-align: center;
}

/* 分类块 */
.category-block {
  margin-bottom: 10px;
}
.category-block:last-child {
  margin-bottom: 0;
}

.cat-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  margin-bottom: 6px;
  padding-left: 2px;
}

.cat-label-icon {
  font-size: 13px;
}

.cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 分类标签 */
.cat-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  white-space: nowrap;
}

.cat-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 红色：急症/高热 */
.tag-red {
  background: linear-gradient(135deg, #FFF5F5 0%, #FFEBEE 100%);
  color: #D32F2F;
  border: 1px solid #FFCDD2;
}
.tag-red:hover {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}

/* 蓝色：疾病/慢性 */
.tag-blue {
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  color: #1565C0;
  border: 1px solid #90CAF9;
}
.tag-blue:hover {
  background: linear-gradient(135deg, #BBDEFB 0%, #90CAF9 100%);
}

/* 默认：浅灰 */
.tag-default {
  background: #F1F3F5;
  color: #555;
  border: 1px solid #E0E0E0;
}
.tag-default:hover {
  background: #E5E8EB;
}

/* ============ 底部 ============ */
.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #F0F2F5;
}

.footer-tip {
  font-size: 11px;
  color: #BBB;
}

.manage-content {
  padding: 8px 0;
}

.add-section {
  display: flex;
  align-items: center;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
