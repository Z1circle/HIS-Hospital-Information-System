<template>
  <div class="medical-tech-manage">
    <div class="page-header">
      <h2 class="page-title">医技管理</h2>
    </div>

    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 危急值设置 -->
        <el-tab-pane label="危急值设置" name="critical">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddCritical">新增危急值</el-button>
            <el-select v-model="criticalFilter" placeholder="筛选分类" clearable style="width: 160px">
              <el-option label="全部" value="" />
              <el-option label="血液" value="血液" />
              <el-option label="生化" value="生化" />
              <el-option label="电解质" value="电解质" />
              <el-option label="凝血" value="凝血" />
            </el-select>
          </div>

          <el-table :data="filteredCriticalValues" stripe v-loading="loading">
            <el-table-column prop="name" label="检验项目" min-width="180" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="lower_limit" label="下限值" width="100">
              <template #default="{ row }">{{ row.lower_limit === null ? '-' : row.lower_limit }}</template>
            </el-table-column>
            <el-table-column prop="upper_limit" label="上限值" width="100">
              <template #default="{ row }">{{ row.upper_limit === null ? '-' : row.upper_limit }}</template>
            </el-table-column>
            <el-table-column prop="notify_doctor" label="通知医生" width="90">
              <template #default="{ row }">
                <el-tag :type="row.notify_doctor ? 'success' : 'info'" size="small">
                  {{ row.notify_doctor ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="notify_level" label="通知级别" width="100">
              <template #default="{ row }">
                <el-tag :type="levelTypeMap[row.notify_level]">{{ row.notify_level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="update_time" label="更新时间" width="160" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="Edit" @click="handleEditCritical(row)">编辑</el-button>
                <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteCritical(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 报告模板 -->
        <el-tab-pane label="报告模板" name="report">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddReport">新增模板</el-button>
            <el-select v-model="reportFilter" placeholder="筛选类型" clearable style="width: 160px">
              <el-option label="全部" value="" />
              <el-option label="检验报告" value="检验报告" />
              <el-option label="检查报告" value="检查报告" />
            </el-select>
          </div>

          <div class="report-grid">
            <div v-for="item in filteredReportTemplates" :key="item.id" class="report-card glass-card">
              <div class="report-header">
                <h4 class="report-name">{{ item.name }}</h4>
                <el-tag size="small" :type="item.type === '检验报告' ? 'success' : 'warning'">{{ item.type }}</el-tag>
              </div>
              <div class="report-body">
                <div class="report-row">
                  <span class="label">适用项目:</span>
                  <span class="value">{{ item.project }}</span>
                </div>
                <div class="report-row">
                  <span class="label">模板结论:</span>
                  <p class="conclusion-preview">{{ item.conclusion.substring(0, 80) }}...</p>
                </div>
                <div class="report-row">
                  <span class="label">创建人:</span>
                  <span>{{ item.creator }}</span>
                </div>
              </div>
              <div class="report-footer">
                <span class="update-time">更新: {{ item.update_time }}</span>
                <div class="report-actions">
                  <el-button size="small" type="primary" link icon="Edit" @click="handleEditReport(item)">编辑</el-button>
                  <el-button size="small" type="primary" link icon="View" @click="handlePreviewReport(item)">预览</el-button>
                  <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteReport(item)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 危急值编辑对话框 -->
    <el-dialog v-model="criticalDialogVisible" :title="criticalDialogTitle" width="550px" @close="handleCriticalDialogClose">
      <el-form :model="criticalForm" :rules="criticalRules" ref="criticalFormRef" label-width="100px">
        <el-form-item label="检验项目" prop="name">
          <el-input v-model="criticalForm.name" placeholder="如：白细胞计数" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="criticalForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="血液" value="血液" />
            <el-option label="生化" value="生化" />
            <el-option label="电解质" value="电解质" />
            <el-option label="凝血" value="凝血" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="criticalForm.unit" placeholder="如：×10⁹/L" />
        </el-form-item>
        <el-form-item label="下限值">
          <el-input-number v-model="criticalForm.lower_limit" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="上限值">
          <el-input-number v-model="criticalForm.upper_limit" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="通知医生">
          <el-switch v-model="criticalForm.notify_doctor" />
        </el-form-item>
        <el-form-item label="通知级别" prop="notify_level">
          <el-select v-model="criticalForm.notify_level" style="width: 100%">
            <el-option label="紧急" value="紧急" />
            <el-option label="重要" value="重要" />
            <el-option label="普通" value="普通" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="criticalDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitCritical">确定</el-button>
      </template>
    </el-dialog>

    <!-- 报告模板编辑对话框 -->
    <el-dialog v-model="reportDialogVisible" :title="reportDialogTitle" width="700px" @close="handleReportDialogClose">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="reportForm.name" placeholder="如：血常规报告模板" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="reportForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="检验报告" value="检验报告" />
            <el-option label="检查报告" value="检查报告" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用项目" prop="project">
          <el-input v-model="reportForm.project" placeholder="如：血常规" />
        </el-form-item>
        <el-form-item label="模板结论" prop="conclusion">
          <el-input v-model="reportForm.conclusion" type="textarea" :rows="10" placeholder="请输入报告结论模板" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReport">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

const props = defineProps<{ defaultTab?: string }>()

const activeTab = ref(props.defaultTab || 'critical')
const loading = ref(false)

// 危急值
const criticalFilter = ref('')
const levelTypeMap: Record<string, string> = { '紧急': 'danger', '重要': 'warning', '普通': 'info' }

const criticalValues = ref([
  { id: 1, name: '白细胞计数(WBC)', category: '血液', unit: '×10⁹/L', lower_limit: 1.5, upper_limit: 30, notify_doctor: true, notify_level: '紧急', update_time: '2026-06-15 10:00' },
  { id: 2, name: '血红蛋白(Hb)', category: '血液', unit: 'g/L', lower_limit: 50, upper_limit: 200, notify_doctor: true, notify_level: '紧急', update_time: '2026-06-15 10:00' },
  { id: 3, name: '血糖(GLU)', category: '生化', unit: 'mmol/L', lower_limit: 2.5, upper_limit: 25, notify_doctor: true, notify_level: '重要', update_time: '2026-06-12 14:00' },
  { id: 4, name: '血钾(K)', category: '电解质', unit: 'mmol/L', lower_limit: 2.8, upper_limit: 6.2, notify_doctor: true, notify_level: '紧急', update_time: '2026-06-10 09:00' },
  { id: 5, name: '血钠(Na)', category: '电解质', unit: 'mmol/L', lower_limit: 120, upper_limit: 160, notify_doctor: true, notify_level: '重要', update_time: '2026-06-10 09:00' },
  { id: 6, name: '凝血酶原时间(PT)', category: '凝血', unit: '秒', lower_limit: null, upper_limit: 30, notify_doctor: true, notify_level: '重要', update_time: '2026-06-08 16:00' }
])

const filteredCriticalValues = computed(() => {
  if (!criticalFilter.value) return criticalValues.value
  return criticalValues.value.filter(c => c.category === criticalFilter.value)
})

// 危急值对话框
const criticalDialogVisible = ref(false)
const criticalDialogTitle = ref('新增危急值')
const criticalFormRef = ref<FormInstance>()
const isEditCritical = ref(false)

const criticalForm = reactive({
  id: 0,
  name: '',
  category: '',
  unit: '',
  lower_limit: null as number | null,
  upper_limit: null as number | null,
  notify_doctor: true,
  notify_level: '重要'
})

const criticalRules: FormRules = {
  name: [{ required: true, message: '请输入检验项目', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  notify_level: [{ required: true, message: '请选择通知级别', trigger: 'change' }]
}

const handleAddCritical = () => {
  criticalDialogTitle.value = '新增危急值'
  isEditCritical.value = false
  criticalDialogVisible.value = true
}

const handleEditCritical = (row: any) => {
  criticalDialogTitle.value = '编辑危急值'
  isEditCritical.value = true
  Object.assign(criticalForm, row)
  criticalDialogVisible.value = true
}

const handleDeleteCritical = (row: any) => {
  ElMessageBox.confirm(`确定要删除"${row.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    criticalValues.value = criticalValues.value.filter(c => c.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitCritical = async () => {
  if (!criticalFormRef.value) return
  await criticalFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditCritical.value) {
        const idx = criticalValues.value.findIndex(c => c.id === criticalForm.id)
        if (idx !== -1) criticalValues.value[idx] = { ...criticalForm, update_time: new Date().toLocaleString() } as typeof criticalValues.value[number]
        ElMessage.success('修改成功')
      } else {
        criticalValues.value.push({ ...criticalForm, id: Date.now(), update_time: new Date().toLocaleString() } as typeof criticalValues.value[number])
        ElMessage.success('新增成功')
      }
      criticalDialogVisible.value = false
    }
  })
}

const handleCriticalDialogClose = () => {
  criticalFormRef.value?.resetFields()
  Object.assign(criticalForm, { id: 0, name: '', category: '', unit: '', lower_limit: null, upper_limit: null, notify_doctor: true, notify_level: '重要' })
}

// 报告模板
const reportFilter = ref('')

const reportTemplates = ref([
  { id: 1, name: '血常规报告', type: '检验报告', project: '血常规', conclusion: '检查所见：白细胞计数、中性粒细胞百分比、红细胞计数、血红蛋白浓度、血小板计数均在正常范围内。诊断意见：未见明显异常。', creator: '张医生', update_time: '2026-06-15' },
  { id: 2, name: '胸部CT报告', type: '检查报告', project: '胸部CT', conclusion: '影像所见：双肺纹理清晰，未见明显实变影；纵隔未见肿大淋巴结；心脏大小形态正常。诊断意见：胸部CT平扫未见明显异常。', creator: '李医生', update_time: '2026-06-12' },
  { id: 3, name: '肝功能报告', type: '检验报告', project: '肝功能', conclusion: '检查所见：ALT、AST、TBIL、DBIL、ALP、GGT均在正常参考范围内。诊断意见：肝功能未见明显异常。', creator: '王医生', update_time: '2026-06-10' }
])

const filteredReportTemplates = computed(() => {
  if (!reportFilter.value) return reportTemplates.value
  return reportTemplates.value.filter(r => r.type === reportFilter.value)
})

// 报告对话框
const reportDialogVisible = ref(false)
const reportDialogTitle = ref('新增报告模板')
const reportFormRef = ref<FormInstance>()
const isEditReport = ref(false)

const reportForm = reactive({
  id: 0,
  name: '',
  type: '',
  project: '',
  conclusion: '',
  creator: ''
})

const reportRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  project: [{ required: true, message: '请输入适用项目', trigger: 'blur' }],
  conclusion: [{ required: true, message: '请输入模板结论', trigger: 'blur' }]
}

const handleAddReport = () => {
  reportDialogTitle.value = '新增报告模板'
  isEditReport.value = false
  reportDialogVisible.value = true
}

const handleEditReport = (row: any) => {
  reportDialogTitle.value = '编辑报告模板'
  isEditReport.value = true
  Object.assign(reportForm, row)
  reportDialogVisible.value = true
}

const handlePreviewReport = (row: any) => {
  ElMessageBox.alert(row.conclusion, `模板预览 - ${row.name}`, { confirmButtonText: '关闭' })
}

const handleDeleteReport = (row: any) => {
  ElMessageBox.confirm(`确定要删除"${row.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    reportTemplates.value = reportTemplates.value.filter(r => r.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitReport = async () => {
  if (!reportFormRef.value) return
  await reportFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditReport.value) {
        const idx = reportTemplates.value.findIndex(r => r.id === reportForm.id)
        if (idx !== -1) reportTemplates.value[idx] = { ...reportForm, update_time: new Date().toLocaleDateString() }
        ElMessage.success('修改成功')
      } else {
        reportTemplates.value.push({ ...reportForm, id: Date.now(), creator: '当前用户', update_time: new Date().toLocaleDateString() })
        ElMessage.success('新增成功')
      }
      reportDialogVisible.value = false
    }
  })
}

const handleReportDialogClose = () => {
  reportFormRef.value?.resetFields()
  Object.assign(reportForm, { id: 0, name: '', type: '', project: '', conclusion: '', creator: '' })
}
</script>

<style scoped lang="scss">
.medical-tech-manage {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #1E293B; }

.tab-section {
  padding: 0; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  :deep(.el-tabs__header) { background: rgba(235, 248, 255, 0.8); border-bottom: 1px solid rgba(66, 153, 225, 0.1); }
  :deep(.el-tabs__content) { padding: 20px; }
  :deep(.el-tabs__item) { color: #64748B; }
  :deep(.el-tabs__item.is-active) { color: #4299E1; background: rgba(66, 153, 225, 0.1); }
}

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }

.report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }

.report-card {
  padding: 20px; border-radius: 12px; transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(66, 153, 225, 0.12); }
}

.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.report-name { margin: 0; color: #1E293B; font-size: 16px; font-weight: 600; }

.report-body { margin-bottom: 15px; }
.report-row { margin-bottom: 8px; }
.report-row .label { color: #94A3B8; font-size: 13px; margin-right: 8px; }
.report-row .value { color: #1E293B; font-size: 14px; }
.conclusion-preview { color: #64748B; font-size: 13px; margin: 4px 0 0; line-height: 1.6; }

.report-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(66, 153, 225, 0.1); padding-top: 12px; }
.update-time { font-size: 13px; color: #94A3B8; }

.glass-card { background: rgba(255,255,255,0.95); border: 1px solid rgba(66, 153, 225, 0.1); box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06); }

:deep(.el-table) {
  background: rgba(255,255,255,0.95); border-radius: 12px;
  th { background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%); color: #4299E1; border-color: rgba(66, 153, 225, 0.1); font-weight: 600; }
  td { border-color: rgba(66, 153, 225, 0.08); color: #4A5568; }
  tr:hover > td { background: rgba(66, 153, 225, 0.05); }
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

:deep(.el-tag--success) { background: rgba(72, 187, 120, 0.1); color: #48BB78; border-color: rgba(72, 187, 120, 0.2); }
:deep(.el-tag--info) { background: rgba(66, 153, 225, 0.1); color: #4299E1; border-color: rgba(66, 153, 225, 0.2); }
:deep(.el-tag--warning) { background: rgba(250, 204, 21, 0.1); color: #ECC94B; border-color: rgba(250, 204, 21, 0.2); }
:deep(.el-tag--danger) { background: rgba(252, 129, 129, 0.1); color: #FC8181; border-color: rgba(252, 129, 129, 0.2); }
</style>