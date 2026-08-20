<template>
  <div class="report-manage">
    <div class="page-header">
      <h2 class="page-title">报表管理</h2>
    </div>

    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 自定义报表 -->
        <el-tab-pane label="自定义报表" name="custom">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleCreateReport">新建报表</el-button>
            <div class="filter-row">
              <el-input v-model="reportFilter" placeholder="搜索报表名称" clearable style="width: 200px" prefix-icon="Search" />
              <el-select v-model="reportTypeFilter" placeholder="报表类型" clearable style="width: 140px">
                <el-option label="全部" value="" />
                <el-option label="门诊" value="门诊" />
                <el-option label="住院" value="住院" />
                <el-option label="财务" value="财务" />
                <el-option label="药品" value="药品" />
              </el-select>
            </div>
          </div>

          <!-- 报表图表概览 -->
          <div class="charts-overview">
            <div class="chart-panel glass-card">
              <div class="chart-header">
                <span class="chart-title">月度门诊量统计</span>
                <el-select v-model="chartMonth" size="small" style="width: 120px">
                  <el-option label="近6个月" value="6" />
                  <el-option label="近12个月" value="12" />
                </el-select>
              </div>
              <div class="chart-placeholder">
                <el-icon :size="48"><DataAnalysis /></el-icon>
                <span>门诊量趋势图</span>
              </div>
            </div>
            <div class="chart-panel glass-card">
              <div class="chart-header">
                <span class="chart-title">收入构成分析</span>
                <el-tag size="small" type="success">本月</el-tag>
              </div>
              <div class="chart-placeholder">
                <el-icon :size="48"><PieChart /></el-icon>
                <span>收入构成饼图</span>
              </div>
            </div>
          </div>

          <!-- 报表列表 -->
          <div class="report-list-section">
            <h3 class="section-title">我的报表</h3>
            <el-table :data="filteredReports" stripe v-loading="loading">
              <el-table-column prop="name" label="报表名称" min-width="200" />
              <el-table-column prop="type" label="类型" width="80">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="creator" label="创建人" width="100" />
              <el-table-column prop="create_time" label="创建时间" width="160" />
              <el-table-column prop="update_time" label="更新时间" width="160" />
              <el-table-column prop="schedule" label="定时发送" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.schedule ? 'success' : 'info'" size="small">
                    {{ row.schedule ? '已开启' : '未设置' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="300" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" type="primary" link icon="Edit" @click="handleEditReport(row)">编辑</el-button>
                  <el-button size="small" type="primary" link icon="View" @click="handlePreviewReport(row)">预览</el-button>
                  <el-button size="small" type="success" link icon="Download" @click="handleExportReport(row, 'excel')">导出Excel</el-button>
                  <el-button size="small" type="warning" link icon="Clock" @click="handleScheduleSend(row)">定时发送</el-button>
                  <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteReport(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 定时发送 -->
        <el-tab-pane label="定时发送" name="schedule">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddSchedule">新增定时任务</el-button>
          </div>

          <div class="schedule-list">
            <div v-for="item in scheduleList" :key="item.id" class="schedule-card glass-card">
              <div class="schedule-left">
                <el-icon :size="32" :color="item.enabled ? '#22c55e' : '#94a3b8'">
                  <Clock />
                </el-icon>
                <div class="schedule-info">
                  <h4 class="schedule-name">{{ item.report_name }}</h4>
                  <div class="schedule-detail">
                    <span>发送频率: {{ item.frequency }}</span>
                    <span>发送时间: {{ item.send_time }}</span>
                    <span>收件邮箱: {{ item.email }}</span>
                  </div>
                </div>
              </div>
              <div class="schedule-right">
                <el-switch v-model="item.enabled" active-text="开启" inactive-text="关闭" />
                <el-button size="small" type="primary" link icon="Edit" @click="handleEditSchedule(item)">编辑</el-button>
                <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteSchedule(item)">删除</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 报表编辑对话框 -->
    <el-dialog v-model="reportDialogVisible" :title="reportDialogTitle" width="700px" @close="handleReportDialogClose">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="报表名称" prop="name">
          <el-input v-model="reportForm.name" placeholder="请输入报表名称" />
        </el-form-item>
        <el-form-item label="报表类型" prop="type">
          <el-select v-model="reportForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="门诊" value="门诊" />
            <el-option label="住院" value="住院" />
            <el-option label="财务" value="财务" />
            <el-option label="药品" value="药品" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择字段" prop="fields">
          <div class="field-grid">
            <el-checkbox-group v-model="reportForm.fields">
              <el-checkbox v-for="field in availableFields" :key="field" :label="field">{{ field }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="reportForm.description" type="textarea" :rows="3" placeholder="请输入报表描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReport">确定</el-button>
      </template>
    </el-dialog>

    <!-- 定时发送设置对话框 -->
    <el-dialog v-model="scheduleDialogVisible" :title="scheduleDialogTitle" width="550px" @close="handleScheduleDialogClose">
      <el-form :model="scheduleForm" :rules="scheduleRules" ref="scheduleFormRef" label-width="100px">
        <el-form-item label="报表名称">
          <el-input :model-value="scheduleForm.report_name" disabled />
        </el-form-item>
        <el-form-item label="发送频率" prop="frequency">
          <el-select v-model="scheduleForm.frequency" placeholder="请选择发送频率" style="width: 100%">
            <el-option label="每天" value="每天" />
            <el-option label="每周" value="每周" />
            <el-option label="每月" value="每月" />
          </el-select>
        </el-form-item>
        <el-form-item label="发送时间" prop="send_time">
          <el-time-picker v-model="scheduleForm.send_time" placeholder="选择发送时间" style="width: 100%" format="HH:mm" value-format="HH:mm" />
        </el-form-item>
        <el-form-item label="收件邮箱" prop="email">
          <el-input v-model="scheduleForm.email" placeholder="请输入收件邮箱，多个邮箱用;分隔" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="scheduleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitSchedule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Clock, DataAnalysis, PieChart
} from '@element-plus/icons-vue'

const props = defineProps<{ defaultTab?: string }>()

const activeTab = ref(props.defaultTab || 'custom')
const loading = ref(false)
const chartMonth = ref('6')

// 自定义报表
const reportFilter = ref('')
const reportTypeFilter = ref('')

const reports = ref([
  { id: 1, name: '门诊挂号统计报表', type: '门诊', creator: '管理员', create_time: '2026-06-01 10:00', update_time: '2026-06-15 14:00', schedule: true, fields: ['日期', '科室', '挂号数量'] },
  { id: 2, name: '住院收费汇总表', type: '住院', creator: '管理员', create_time: '2026-05-20 09:00', update_time: '2026-06-12 16:00', schedule: false, fields: ['日期', '科室', '费用金额'] },
  { id: 3, name: '药品消耗统计表', type: '药品', creator: '李管理员', create_time: '2026-04-15 11:00', update_time: '2026-06-10 10:30', schedule: true, fields: ['药品名称', '消耗数量', '金额'] },
  { id: 4, name: '财务收入日报', type: '财务', creator: '管理员', create_time: '2026-06-05 08:00', update_time: '2026-06-18 09:00', schedule: true, fields: ['日期', '收入类型', '金额'] }
])

const filteredReports = computed(() => {
  return reports.value.filter(r => {
    const matchName = !reportFilter.value || r.name.includes(reportFilter.value)
    const matchType = !reportTypeFilter.value || r.type === reportTypeFilter.value
    return matchName && matchType
  })
})

// 报表编辑
const reportDialogVisible = ref(false)
const reportDialogTitle = ref('新建报表')
const reportFormRef = ref<FormInstance>()
const isEditReportDialog = ref(false)

const availableFields = ['日期', '科室', '医生', '患者ID', '患者姓名', '挂号数量', '费用金额', '收入类型', '药品名称', '消耗数量', '金额', '状态']

const reportForm = reactive({
  id: 0,
  name: '',
  type: '',
  fields: [] as string[],
  description: ''
})

const reportRules: FormRules = {
  name: [{ required: true, message: '请输入报表名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择报表类型', trigger: 'change' }]
}

const handleCreateReport = () => {
  reportDialogTitle.value = '新建报表'
  isEditReportDialog.value = false
  reportDialogVisible.value = true
}

const handleEditReport = (row: any) => {
  reportDialogTitle.value = '编辑报表'
  isEditReportDialog.value = true
  Object.assign(reportForm, row)
  reportDialogVisible.value = true
}

const handlePreviewReport = (row: any) => {
  ElMessageBox.alert(`
    <div style="line-height:2">
      <h3>${row.name}</h3>
      <div><strong>类型:</strong> ${row.type}</div>
      <div><strong>创建人:</strong> ${row.creator}</div>
      <div><strong>字段:</strong> ${row.fields.join(', ')}</div>
    </div>
  `, '报表预览', { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' })
}

// 导出报表功能
const handleExportReport = (row: any, format: string) => {
  ElMessage.success(`${row.name} 正在导出为 ${format.toUpperCase()} 格式...`)
  // 模拟导出过程
  setTimeout(() => {
    // 生成模拟数据
    const data = generateReportData(row)
    if (format === 'excel') {
      exportToExcel(row.name, data)
    } else if (format === 'pdf') {
      exportToPDF(row.name, data)
    }
  }, 500)
}

// 生成报表数据
const generateReportData = (_row: any) => {
  const data: any[] = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    data.push({
      date: date.toISOString().slice(0, 10),
      visits: Math.floor(Math.random() * 100) + 50,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      prescriptions: Math.floor(Math.random() * 50) + 20,
      patients: Math.floor(Math.random() * 80) + 30
    })
  }
  return data
}

// 导出为Excel（模拟）
const exportToExcel = (name: string, data: any[]) => {
  // 创建CSV内容
  const headers = ['日期', '门诊量', '收入', '处方数', '患者数']
  const csvContent = headers.join(',') + '\n' +
    data.map(row => `${row.date},${row.visits},${row.revenue},${row.prescriptions},${row.patients}`).join('\n')
  
  // 创建Blob并下载
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('Excel导出成功')
}

// 导出为PDF（模拟）
const exportToPDF = (_name: string, _data: any[]) => {
  // 这里可以调用后端API生成PDF，暂时模拟
  ElMessage.success('PDF导出功能需要后端支持，请联系管理员')
}

const handleDeleteReport = (row: any) => {
  ElMessageBox.confirm(`确定要删除"${row.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    reports.value = reports.value.filter(r => r.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitReport = async () => {
  if (!reportFormRef.value) return
  await reportFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditReportDialog.value) {
        const idx = reports.value.findIndex(r => r.id === reportForm.id)
        if (idx !== -1) reports.value[idx] = { ...reports.value[idx], ...reportForm, update_time: new Date().toLocaleString() }
        ElMessage.success('修改成功')
      } else {
        reports.value.push({
          ...reportForm, id: Date.now(), creator: '当前用户',
          create_time: new Date().toLocaleString(), update_time: new Date().toLocaleString(), schedule: false
        })
        ElMessage.success('创建成功')
      }
      reportDialogVisible.value = false
    }
  })
}

const handleReportDialogClose = () => {
  reportFormRef.value?.resetFields()
  Object.assign(reportForm, { id: 0, name: '', type: '', fields: [], description: '' })
}

// 定时发送
const scheduleList = ref([
  { id: 1, report_name: '门诊挂号统计报表', frequency: '每天', send_time: '08:00', email: 'admin@hospital.com', enabled: true },
  { id: 2, report_name: '财务收入日报', frequency: '每天', send_time: '18:00', email: 'finance@hospital.com', enabled: true },
  { id: 3, report_name: '药品消耗统计表', frequency: '每周', send_time: '09:00', email: 'pharmacy@hospital.com', enabled: false }
])

const scheduleDialogVisible = ref(false)
const scheduleDialogTitle = ref('新增定时发送')
const scheduleFormRef = ref<FormInstance>()
const isEditScheduleDialog = ref(false)

const scheduleForm = reactive({
  id: 0,
  report_name: '',
  frequency: '',
  send_time: '',
  email: '',
  enabled: true
})

const scheduleRules: FormRules = {
  frequency: [{ required: true, message: '请选择发送频率', trigger: 'change' }],
  send_time: [{ required: true, message: '请选择发送时间', trigger: 'change' }],
  email: [
    { required: true, message: '请输入收件邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const handleScheduleSend = (row: any) => {
  scheduleDialogTitle.value = '设置定时发送'
  isEditScheduleDialog.value = false
  scheduleForm.report_name = row.name
  scheduleDialogVisible.value = true
}

const handleAddSchedule = () => {
  scheduleDialogTitle.value = '新增定时发送'
  isEditScheduleDialog.value = false
  scheduleDialogVisible.value = true
}

const handleEditSchedule = (item: any) => {
  scheduleDialogTitle.value = '编辑定时发送'
  isEditScheduleDialog.value = true
  Object.assign(scheduleForm, item)
  scheduleDialogVisible.value = true
}

const handleDeleteSchedule = (item: any) => {
  ElMessageBox.confirm(`确定要删除"${item.report_name}"的定时发送吗？`, '删除确认', { type: 'warning' }).then(() => {
    scheduleList.value = scheduleList.value.filter(s => s.id !== item.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitSchedule = async () => {
  if (!scheduleFormRef.value) return
  await scheduleFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditScheduleDialog.value) {
        const idx = scheduleList.value.findIndex(s => s.id === scheduleForm.id)
        if (idx !== -1) scheduleList.value[idx] = { ...scheduleForm }
        ElMessage.success('修改成功')
      } else {
        scheduleList.value.push({ ...scheduleForm, id: Date.now() })
        ElMessage.success('新增成功')
      }
      scheduleDialogVisible.value = false
    }
  })
}

const handleScheduleDialogClose = () => {
  scheduleFormRef.value?.resetFields()
  Object.assign(scheduleForm, { id: 0, report_name: '', frequency: '', send_time: '', email: '', enabled: true })
}
</script>

<style scoped lang="scss">
.report-manage {
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
.filter-row { display: flex; gap: 10px; }

.charts-overview { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }

.chart-panel {
  padding: 20px; border-radius: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .chart-title { color: #1E293B; font-weight: 600; font-size: 16px; }
  .chart-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 200px; color: #94A3B8;
    span { margin-top: 12px; }
  }
}

.report-list-section { margin-top: 20px; }
.section-title { color: #1E293B; font-size: 18px; margin: 0 0 15px; }

.schedule-list { display: flex; flex-direction: column; gap: 12px; }

.schedule-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-radius: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(66, 153, 225, 0.1); }
}

.schedule-left { display: flex; align-items: center; gap: 15px; }
.schedule-info { display: flex; flex-direction: column; gap: 4px; }
.schedule-name { margin: 0; color: #1E293B; font-size: 15px; font-weight: 500; }
.schedule-detail { display: flex; gap: 20px; font-size: 13px; color: #64748B; }

.schedule-right { display: flex; align-items: center; gap: 12px; }

.field-grid {
  :deep(.el-checkbox-group) { display: flex; flex-wrap: wrap; gap: 12px; }
  :deep(.el-checkbox) { margin-right: 0; }
}

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
</style>