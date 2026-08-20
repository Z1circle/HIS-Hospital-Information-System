<template>
  <div class="presc-tpl-page">
    <div class="page-header">
      <div class="header-left">
        <el-icon class="back-icon" @click="$router.back()"><ArrowLeft /></el-icon>
        <h2>协定处方</h2>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建处方
      </el-button>
    </div>

    <!-- 处方列表 -->
    <div class="presc-list" v-loading="loading">
      <el-empty v-if="!loading && templates.length === 0" description="暂无协定处方" />
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="presc-card"
      >
        <div class="card-header">
          <div class="card-title-row">
            <h3>{{ tpl.name }}</h3>
            <el-tag size="small" :type="tpl.type === 'chinese' ? 'warning' : ''">
              {{ tpl.type === 'chinese' ? '中药' : '西药' }}
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
        <div class="card-body">
          <div v-for="(item, idx) in parseItems(tpl.items)" :key="idx" class="drug-row">
            <span class="drug-name">{{ item.item_name }}</span>
            <span class="drug-dosage">{{ item.dosage }} {{ item.frequency }}</span>
            <span class="drug-qty">x{{ item.quantity }}{{ item.unit }}</span>
            <span class="drug-price">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>
        <div v-if="tpl.remark" class="card-remark">
          <el-icon><InfoFilled /></el-icon> {{ tpl.remark }}
        </div>
        <div class="card-footer">
          <span class="total-price">合计：¥{{ calcTotal(tpl.items) }}</span>
          <el-button size="small" type="primary" @click="useTemplate(tpl)">使用此处方</el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTemplate ? '编辑协定处方' : '新建协定处方'"
      width="700px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="处方名称" required>
          <el-input v-model="form.name" placeholder="请输入处方名称" />
        </el-form-item>
        <el-form-item label="处方类型">
          <el-radio-group v-model="form.type">
            <el-radio label="western">西药</el-radio>
            <el-radio label="chinese">中药</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="处方说明（可选）" />
        </el-form-item>
        <el-form-item label="药品明细">
          <div class="drug-list-editor">
            <div v-for="(item, idx) in form.items" :key="idx" class="drug-editor-row">
              <el-input v-model="item.item_name" placeholder="药品名称" style="width: 180px" />
              <el-input v-model="item.dosage" placeholder="用法" style="width: 120px" />
              <el-input v-model="item.frequency" placeholder="频次" style="width: 100px" />
              <el-input-number v-model="item.quantity" :min="1" style="width: 90px" />
              <el-input v-model="item.unit" placeholder="单位" style="width: 70px" />
              <el-input-number v-model="item.price" :min="0" :precision="2" style="width: 100px" />
              <el-button type="danger" text @click="form.items.splice(idx, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" text @click="form.items.push({ item_name: '', dosage: '', frequency: '每日1次', quantity: 1, unit: '盒', price: 0 })">
              <el-icon><Plus /></el-icon> 添加药品
            </el-button>
          </div>
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
import { ArrowLeft, Plus, Edit, Delete, InfoFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser

const loading = ref(false)
const saving = ref(false)
const templates = ref<any[]>([])
const showCreateDialog = ref(false)
const editingTemplate = ref<any>(null)

const form = reactive({
  name: '',
  type: 'western',
  remark: '',
  items: [] as any[]
})

const parseItems = (itemsStr: string) => {
  try {
    return JSON.parse(itemsStr) || []
  } catch {
    return []
  }
}

const calcTotal = (itemsStr: string) => {
  const items = parseItems(itemsStr)
  return items.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0).toFixed(2)
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/doctor/prescription-templates', {
      params: { doctor_id: currentUser.value?.doctor_id || currentUser.value?.id }
    })
    templates.value = res.data || []
  } catch {
    ElMessage.error('加载处方失败')
  } finally {
    loading.value = false
  }
}

const editTemplate = (tpl: any) => {
  editingTemplate.value = tpl
  form.name = tpl.name
  form.type = tpl.type
  form.remark = tpl.remark || ''
  form.items = parseItems(tpl.items)
  showCreateDialog.value = true
}

const saveTemplate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入处方名称')
    return
  }
  if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个药品')
    return
  }
  saving.value = true
  try {
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
    const payload = {
      doctor_id: doctorId,
      name: form.name,
      type: form.type,
      items: form.items,
      remark: form.remark
    }
    if (editingTemplate.value) {
      await axios.put(`/api/doctor/prescription-templates/${editingTemplate.value.id}`, payload)
      ElMessage.success('处方已更新')
    } else {
      await axios.post('/api/doctor/prescription-templates', payload)
      ElMessage.success('处方已创建')
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
    await ElMessageBox.confirm('确定要删除此协定处方吗？', '提示', { type: 'warning' })
    await axios.delete(`/api/doctor/prescription-templates/${id}`)
    ElMessage.success('已删除')
    await loadTemplates()
  } catch {
    // 用户取消
  }
}

const useTemplate = (tpl: any) => {
  sessionStorage.setItem('selectedPrescTemplate', JSON.stringify(tpl))
  router.push('/doctor/outpatient')
  ElMessage.success('处方已选择，请在工作台使用')
}

const resetForm = () => {
  editingTemplate.value = null
  form.name = ''
  form.type = 'western'
  form.remark = ''
  form.items = []
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.presc-tpl-page {
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

.presc-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 20px;
}

.presc-card {
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

.card-body {
  margin-bottom: 12px;
}

.drug-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px dashed #F0F0F0;
  font-size: 14px;
}

.drug-row:last-child {
  border-bottom: none;
}

.drug-name {
  flex: 1;
  font-weight: 500;
  color: #212121;
}

.drug-dosage {
  color: #757575;
  width: 140px;
}

.drug-qty {
  color: #1E88E5;
  font-weight: 600;
  width: 70px;
}

.drug-price {
  color: #F57C00;
  font-weight: 600;
  width: 80px;
  text-align: right;
}

.card-remark {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #757575;
  background: #FFF8E1;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.total-price {
  font-size: 16px;
  font-weight: 700;
  color: #F57C00;
}

/* 药品编辑器 */
.drug-list-editor {
  width: 100%;
}

.drug-editor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
