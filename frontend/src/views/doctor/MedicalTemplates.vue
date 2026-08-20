<template>
  <div class="template-page">
    <div class="page-header">
      <div class="header-left">
        <el-icon class="back-icon" @click="$router.back()"><ArrowLeft /></el-icon>
        <h2>病历模板</h2>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建模板
      </el-button>
    </div>

    <!-- 分类筛选 -->
    <div class="category-filter">
      <el-radio-group v-model="currentCategory" @change="loadTemplates">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="common">常用</el-radio-button>
        <el-radio-button label="chronic">慢性病</el-radio-button>
        <el-radio-button label="emergency">急诊</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 模板列表 -->
    <div class="template-list" v-loading="loading">
      <el-empty v-if="!loading && templates.length === 0" description="暂无模板" />
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="template-card"
      >
        <div class="card-header">
          <div class="card-title-row">
            <h3>{{ tpl.name }}</h3>
            <el-tag size="small" :type="categoryTagType(tpl.category)">
              {{ categoryLabel(tpl.category) }}
            </el-tag>
          </div>
          <div class="card-actions">
            <el-button size="small" text type="primary" @click="editTemplate(tpl)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" text type="danger" @click="deleteTemplate(tpl.id)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
        </div>
        <div class="card-content">
          <div v-if="tpl.chief" class="content-item">
            <span class="label">主诉：</span>
            <span>{{ tpl.chief }}</span>
          </div>
          <div v-if="tpl.history" class="content-item">
            <span class="label">现病史：</span>
            <span>{{ tpl.history }}</span>
          </div>
          <div v-if="tpl.diagnosis" class="content-item">
            <span class="label">诊断：</span>
            <span>{{ tpl.diagnosis }}</span>
          </div>
          <div v-if="tpl.suggestion" class="content-item">
            <span class="label">处理意见：</span>
            <span>{{ tpl.suggestion }}</span>
          </div>
        </div>
        <div class="card-footer">
          <el-button size="small" type="primary" @click="useTemplate(tpl)">使用此模板</el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTemplate ? '编辑模板' : '新建模板'"
      width="700px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.category" style="width: 100%">
            <el-option label="常用" value="common" />
            <el-option label="慢性病" value="chronic" />
            <el-option label="急诊" value="emergency" />
          </el-select>
        </el-form-item>
        <el-form-item label="主诉">
          <el-input v-model="form.chief" type="textarea" :rows="2" placeholder="请输入主诉" />
        </el-form-item>
        <el-form-item label="现病史">
          <el-input v-model="form.history" type="textarea" :rows="3" placeholder="请输入现病史" />
        </el-form-item>
        <el-form-item label="既往史">
          <el-input v-model="form.past" type="textarea" :rows="2" placeholder="请输入既往史" />
        </el-form-item>
        <el-form-item label="体格检查">
          <el-input v-model="form.physical" type="textarea" :rows="2" placeholder="请输入体格检查" />
        </el-form-item>
        <el-form-item label="诊断">
          <el-input v-model="form.diagnosis" placeholder="请输入诊断" />
        </el-form-item>
        <el-form-item label="辅助检查">
          <el-input v-model="form.auxiliary" type="textarea" :rows="2" placeholder="请输入辅助检查结果" />
        </el-form-item>
        <el-form-item label="过敏史">
          <el-input v-model="form.allergy" placeholder="请输入过敏史，如：青霉素过敏" />
        </el-form-item>
        <el-form-item label="家族史">
          <el-input v-model="form.family" type="textarea" :rows="2" placeholder="请输入家族史" />
        </el-form-item>
        <el-form-item label="处理意见">
          <el-input v-model="form.suggestion" type="textarea" :rows="3" placeholder="请输入处理意见" />
        </el-form-item>
        <el-form-item label="随访计划">
          <el-input v-model="form.followup" placeholder="请输入随访计划，如：1周后复诊" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="saving">
          {{ editingTemplate ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Edit, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser

const loading = ref(false)
const saving = ref(false)
const templates = ref<any[]>([])
const currentCategory = ref('all')
const showCreateDialog = ref(false)
const editingTemplate = ref<any>(null)

const form = reactive({
  name: '',
  category: 'common',
  chief: '',
  history: '',
  past: '',
  physical: '',
  auxiliary: '',
  diagnosis: '',
  allergy: '',
  family: '',
  suggestion: '',
  followup: ''
})

const categoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    common: '常用',
    chronic: '慢性病',
    emergency: '急诊'
  }
  return map[cat] || cat
}

const categoryTagType = (cat: string) => {
  const map: Record<string, string> = {
    common: '',
    chronic: 'warning',
    emergency: 'danger'
  }
  return (map[cat] || '') as any
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const params: any = { doctor_id: currentUser.value?.doctor_id || currentUser.value?.id }
    if (currentCategory.value !== 'all') {
      params.category = currentCategory.value
    }
    const res = await axios.get('/api/doctor/templates', { params })
    templates.value = res.data || []
  } catch {
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

const editTemplate = (tpl: any) => {
  editingTemplate.value = tpl
  Object.assign(form, {
    name: tpl.name,
    category: tpl.category,
    chief: tpl.chief || '',
    history: tpl.history || '',
    past: tpl.past || '',
    physical: tpl.physical || '',
    auxiliary: tpl.auxiliary || '',
    diagnosis: tpl.diagnosis || '',
    allergy: tpl.allergy || '',
    family: tpl.family || '',
    suggestion: tpl.suggestion || '',
    followup: tpl.followup || ''
  })
  showCreateDialog.value = true
}

const saveTemplate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  saving.value = true
  try {
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
    if (editingTemplate.value) {
      await axios.put(`/api/doctor/templates/${editingTemplate.value.id}`, form)
      ElMessage.success('模板已更新')
    } else {
      await axios.post('/api/doctor/templates', { ...form, doctor_id: doctorId })
      ElMessage.success('模板已创建')
    }
    showCreateDialog.value = false
    resetForm()
    await loadTemplates()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const deleteTemplate = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此模板吗？', '提示', {
      type: 'warning'
    })
    await axios.delete(`/api/doctor/templates/${id}`)
    ElMessage.success('已删除')
    await loadTemplates()
  } catch {
    // 用户取消
  }
}

const useTemplate = (tpl: any) => {
  // 将模板数据存储到sessionStorage，供工作台使用
  sessionStorage.setItem('selectedTemplate', JSON.stringify(tpl))
  router.push('/doctor/outpatient')
  ElMessage.success('模板已选择，请在工作台使用')
}

const resetForm = () => {
  editingTemplate.value = null
  Object.assign(form, {
    name: '',
    category: 'common',
    chief: '',
    history: '',
    past: '',
    physical: '',
    auxiliary: '',
    diagnosis: '',
    suggestion: ''
  })
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.template-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-icon {
  font-size: 20px;
  cursor: pointer;
  color: #1E88E5;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #212121;
}

.category-filter {
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.template-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 20px;
}

.template-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border: 1px solid #F0F0F0;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0F0F0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title-row h3 {
  margin: 0;
  font-size: 16px;
  color: #212121;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-content {
  margin-bottom: 16px;
}

.content-item {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.content-item .label {
  color: #757575;
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}
</style>
