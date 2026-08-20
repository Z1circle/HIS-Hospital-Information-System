<template>
  <div class="adverse-event">
    <div class="page-header">
      <h2 class="page-title">不良事件</h2>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card glass-card">
        <div class="stat-icon blue-icon">
          <el-icon :size="28"><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">总事件数</div>
          <div class="stat-value">{{ eventList.length }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon red-icon">
          <el-icon :size="28"><CircleClose /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">I-II级事件</div>
          <div class="stat-value danger-text">{{ highLevelCount }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon yellow-icon">
          <el-icon :size="28"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">处理中</div>
          <div class="stat-value warning-text">{{ processingCount }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon green-icon">
          <el-icon :size="28"><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">已关闭</div>
          <div class="stat-value">{{ closedCount }}</div>
        </div>
      </div>
    </div>

    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 事件上报 -->
        <el-tab-pane label="事件上报" name="report">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleReportEvent">上报事件</el-button>
            <div class="filter-row">
              <el-select v-model="eventFilter.level" placeholder="事件等级" clearable style="width: 130px">
                <el-option label="全部" value="" />
                <el-option label="I级" value="I级" />
                <el-option label="II级" value="II级" />
                <el-option label="III级" value="III级" />
                <el-option label="IV级" value="IV级" />
              </el-select>
              <el-select v-model="eventFilter.status" placeholder="处理状态" clearable style="width: 130px">
                <el-option label="全部" value="" />
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已关闭" value="closed" />
              </el-select>
              <el-input v-model="eventFilter.keyword" placeholder="搜索事件描述" clearable style="width: 180px" />
            </div>
          </div>

          <el-table :data="filteredEvents" stripe v-loading="loading">
            <el-table-column prop="id" label="编号" width="80" />
            <el-table-column prop="title" label="事件标题" min-width="200" />
            <el-table-column prop="level" label="等级" width="70">
              <template #default="{ row }">
                <el-tag :type="levelTagType[row.level]" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dept" label="发生科室" width="120" />
            <el-table-column prop="reporter" label="上报人" width="100" />
            <el-table-column prop="report_time" label="上报时间" width="160" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusTagType[row.status]" size="small">{{ statusText[row.status] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="View" @click="handleViewEvent(row)">查看</el-button>
                <el-button size="small" type="warning" link icon="Setting" @click="handleLevelSetting(row)">定级</el-button>
                <el-button size="small" type="success" link icon="Edit" @click="handleRectify(row)">整改追踪</el-button>
                <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteEvent(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 统计分析 -->
        <el-tab-pane label="统计分析" name="analysis">
          <div class="analysis-grid">
            <div class="analysis-card glass-card">
              <h4 class="analysis-title">事件等级分布</h4>
              <div ref="levelChartRef" class="chart-container"></div>
            </div>
            <div class="analysis-card glass-card">
              <h4 class="analysis-title">月度趋势</h4>
              <div ref="trendChartRef" class="chart-container"></div>
            </div>
            <div class="analysis-card glass-card">
              <h4 class="analysis-title">科室分布</h4>
              <div ref="deptChartRef" class="chart-container"></div>
            </div>
            <div class="analysis-card glass-card">
              <h4 class="analysis-title">整改完成率</h4>
              <div class="stat-highlight">
                <span class="big-number">78%</span>
                <span class="stat-sub">整改完成率</span>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 事件上报对话框 -->
    <el-dialog v-model="reportDialogVisible" title="上报不良事件" width="600px" @close="handleReportDialogClose">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="事件标题" prop="title">
          <el-input v-model="reportForm.title" placeholder="请输入事件标题" />
        </el-form-item>
        <el-form-item label="发生科室" prop="dept">
          <el-select v-model="reportForm.dept" placeholder="请选择科室" style="width: 100%">
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="儿科" value="儿科" />
            <el-option label="妇产科" value="妇产科" />
            <el-option label="药房" value="药房" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件等级" prop="level">
          <el-select v-model="reportForm.level" placeholder="请选择等级" style="width: 100%">
            <el-option label="I级(极严重)" value="I级" />
            <el-option label="II级(严重)" value="II级" />
            <el-option label="III级(中等)" value="III级" />
            <el-option label="IV级(轻微)" value="IV级" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件描述" prop="description">
          <el-input v-model="reportForm.description" type="textarea" :rows="5" placeholder="请详细描述事件经过" />
        </el-form-item>
        <el-form-item label="相关患者">
          <el-input v-model="reportForm.patient" placeholder="请输入患者姓名或ID（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReport">提交上报</el-button>
      </template>
    </el-dialog>

    <!-- 事件定级对话框 -->
    <el-dialog v-model="levelDialogVisible" title="事件定级" width="500px">
      <el-form :model="levelForm" ref="levelFormRef" label-width="100px" v-if="selectedEvent">
        <el-form-item label="事件标题">{{ selectedEvent.title }}</el-form-item>
        <el-form-item label="当前等级">
          <el-tag :type="levelTagType[selectedEvent.level]">{{ selectedEvent.level }}</el-tag>
        </el-form-item>
        <el-form-item label="新等级" prop="level">
          <el-select v-model="levelForm.level" placeholder="请选择新等级" style="width: 100%">
            <el-option label="I级(极严重)" value="I级" />
            <el-option label="II级(严重)" value="II级" />
            <el-option label="III级(中等)" value="III级" />
            <el-option label="IV级(轻微)" value="IV级" />
          </el-select>
        </el-form-item>
        <el-form-item label="定级原因">
          <el-input v-model="levelForm.reason" type="textarea" :rows="3" placeholder="请输入定级原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="levelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmLevel">确认定级</el-button>
      </template>
    </el-dialog>

    <!-- 整改追踪对话框 -->
    <el-dialog v-model="rectifyDialogVisible" title="整改追踪" width="600px">
      <el-form :model="rectifyForm" ref="rectifyFormRef" label-width="100px" v-if="selectedEvent">
        <el-form-item label="事件标题">{{ selectedEvent.title }}</el-form-item>
        <el-form-item label="整改措施" prop="measure">
          <el-input v-model="rectifyForm.measure" type="textarea" :rows="4" placeholder="请输入整改措施" />
        </el-form-item>
        <el-form-item label="责任人" prop="responsible">
          <el-input v-model="rectifyForm.responsible" placeholder="请输入责任人" />
        </el-form-item>
        <el-form-item label="完成期限" prop="deadline">
          <el-date-picker v-model="rectifyForm.deadline" type="date" placeholder="选择完成期限" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="整改状态">
          <el-select v-model="rectifyForm.rectifyStatus" style="width: 100%">
            <el-option label="未开始" value="未开始" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rectifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmRectify">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import * as echarts from 'echarts'
import {
  Warning, CircleCheck, CircleClose, Clock
} from '@element-plus/icons-vue'

const activeTab = ref('report')
const loading = ref(false)

const levelTagType: Record<string, string> = { 'I级': 'danger', 'II级': 'warning', 'III级': 'primary', 'IV级': 'info' }
const statusTagType: Record<string, string> = { pending: 'danger', processing: 'warning', closed: 'success' }
const statusText: Record<string, string> = { pending: '待处理', processing: '处理中', closed: '已关闭' }

// 事件列表
const eventFilter = reactive({ level: '', status: '', keyword: '' })

const eventList = ref([
  { id: 1001, title: '病房患者跌倒事件', level: 'II级', dept: '内科', reporter: '张护士', report_time: '2026-06-15 10:00', status: 'processing', description: '患者王某在病房内不慎跌倒，经检查无骨折。' },
  { id: 1002, title: '药品发错事件', level: 'III级', dept: '药房', reporter: '李药师', report_time: '2026-06-14 15:30', status: 'closed', description: '药房发放药品时，将A患者的药品错发给B患者。' },
  { id: 1003, title: '输液反应事件', level: 'II级', dept: '外科', reporter: '王护士', report_time: '2026-06-13 09:00', status: 'processing', description: '患者李某在输液过程中出现皮疹、发热等过敏反应。' },
  { id: 1004, title: '手术部位错误', level: 'I级', dept: '外科', reporter: '赵医生', report_time: '2026-06-12 08:30', status: 'pending', description: '术前标记错误，险些在错误部位进行手术。' },
  { id: 1005, title: '检验标本丢失', level: 'IV级', dept: '检验科', reporter: '陈技师', report_time: '2026-06-10 11:00', status: 'closed', description: '患者血液标本在送检过程中丢失，已重新采样。' }
])

const filteredEvents = computed(() => {
  return eventList.value.filter(e => {
    const matchLevel = !eventFilter.level || e.level === eventFilter.level
    const matchStatus = !eventFilter.status || e.status === eventFilter.status
    const matchKeyword = !eventFilter.keyword || e.title.includes(eventFilter.keyword)
    return matchLevel && matchKeyword && matchStatus
  })
})

const highLevelCount = computed(() => eventList.value.filter(e => e.level === 'I级' || e.level === 'II级').length)
const processingCount = computed(() => eventList.value.filter(e => e.status === 'processing').length)
const closedCount = computed(() => eventList.value.filter(e => e.status === 'closed').length)

// 上报事件
const reportDialogVisible = ref(false)
const reportFormRef = ref<FormInstance>()

const reportForm = reactive({
  title: '',
  dept: '',
  level: 'IV级',
  description: '',
  patient: ''
})

const reportRules: FormRules = {
  title: [{ required: true, message: '请输入事件标题', trigger: 'blur' }],
  dept: [{ required: true, message: '请选择科室', trigger: 'change' }],
  level: [{ required: true, message: '请选择事件等级', trigger: 'change' }],
  description: [{ required: true, message: '请输入事件描述', trigger: 'blur' }]
}

const handleReportEvent = () => {
  reportDialogVisible.value = true
}

const handleSubmitReport = async () => {
  if (!reportFormRef.value) return
  await reportFormRef.value.validate((valid) => {
    if (valid) {
      eventList.value.unshift({
        id: Date.now() % 10000,
        ...reportForm,
        reporter: '当前用户',
        report_time: new Date().toLocaleString(),
        status: 'pending'
      })
      ElMessage.success('事件上报成功')
      reportDialogVisible.value = false
    }
  })
}

const handleReportDialogClose = () => {
  reportFormRef.value?.resetFields()
  Object.assign(reportForm, { title: '', dept: '', level: 'IV级', description: '', patient: '' })
}

// 查看事件
const handleViewEvent = (row: any) => {
  ElMessageBox.alert(`
    <div style="line-height:2">
      <h3>${row.title}</h3>
      <div><strong>等级:</strong> ${row.level}</div>
      <div><strong>科室:</strong> ${row.dept}</div>
      <div><strong>上报人:</strong> ${row.reporter}</div>
      <div><strong>上报时间:</strong> ${row.report_time}</div>
      <div><strong>状态:</strong> ${statusText[row.status]}</div>
      <div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:4px">
        <strong>事件描述:</strong><br>${row.description}
      </div>
    </div>
  `, '事件详情', { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' })
}

// 事件定级
const levelDialogVisible = ref(false)
const levelFormRef = ref<FormInstance>()
const selectedEvent = ref<any>(null)
const levelForm = reactive({ level: '', reason: '' })

const handleLevelSetting = (row: any) => {
  selectedEvent.value = row
  levelForm.level = row.level
  levelForm.reason = ''
  levelDialogVisible.value = true
}

const handleConfirmLevel = () => {
  if (selectedEvent.value && levelForm.level) {
    selectedEvent.value.level = levelForm.level
    ElMessage.success('事件定级已更新')
  }
  levelDialogVisible.value = false
}

// 整改追踪
const rectifyDialogVisible = ref(false)
const rectifyFormRef = ref<FormInstance>()
const rectifyForm = reactive({ measure: '', responsible: '', deadline: '', rectifyStatus: '未开始' })

const handleRectify = (row: any) => {
  selectedEvent.value = row
  rectifyForm.measure = ''
  rectifyForm.responsible = ''
  rectifyForm.deadline = ''
  rectifyForm.rectifyStatus = '未开始'
  rectifyDialogVisible.value = true
}

const handleConfirmRectify = () => {
  if (selectedEvent.value) {
    selectedEvent.value.status = 'processing'
    if (rectifyForm.rectifyStatus === '已完成') {
      selectedEvent.value.status = 'closed'
    }
    ElMessage.success('整改信息已保存')
  }
  rectifyDialogVisible.value = false
}

// 删除事件
const handleDeleteEvent = (row: any) => {
  ElMessageBox.confirm(`确定要删除事件"${row.title}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    eventList.value = eventList.value.filter(e => e.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

// 统计分析图表
const levelChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()
const deptChartRef = ref<HTMLDivElement>()

let levelChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null

const initAnalysisCharts = () => {
  if (activeTab.value !== 'analysis') return
  
  // 等级分布饼图
  if (levelChartRef.value) {
    levelChart = echarts.init(levelChartRef.value)
    levelChart.setOption({
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(66,153,225,0.2)', textStyle: { color: '#2D3748' } },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#718096' } },
      series: [{
        type: 'pie', radius: ['45%', '75%'], center: ['55%', '50%'],
        label: { color: '#4A5568' },
        data: [
          { value: 1, name: 'I级', itemStyle: { color: '#E53E3E' } },
          { value: 3, name: 'II级', itemStyle: { color: '#ED8936' } },
          { value: 2, name: 'III级', itemStyle: { color: '#ECC94B' } },
          { value: 4, name: 'IV级', itemStyle: { color: '#4299E1' } }
        ]
      }]
    })
  }
  
  // 月度趋势柱状图
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(66,153,225,0.2)', textStyle: { color: '#2D3748' } },
      xAxis: { type: 'category', data: ['1月','2月','3月','4月','5月','6月'], axisLabel: { color: '#718096' } },
      yAxis: { type: 'value', axisLabel: { color: '#718096' }, splitLine: { lineStyle: { color: 'rgba(66,153,225,0.08)' } } },
      series: [{
        type: 'bar', data: [5, 3, 6, 2, 4, 7],
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4299E1' }, { offset: 1, color: '#63B3ED' }
          ])
        }
      }]
    })
  }
  
  // 科室分布条形图
  if (deptChartRef.value) {
    deptChart = echarts.init(deptChartRef.value)
    deptChart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(66,153,225,0.2)', textStyle: { color: '#2D3748' } },
      xAxis: { type: 'value', axisLabel: { color: '#718096' }, splitLine: { lineStyle: { color: 'rgba(66,153,225,0.08)' } } },
      yAxis: { type: 'category', data: ['内科','外科','药房','儿科','妇科','检验科'], axisLabel: { color: '#4A5568' } },
      series: [{
        type: 'bar', data: [4, 3, 1, 2, 1, 2],
        itemStyle: { color: '#48BB78', borderRadius: [0, 6, 6, 0] }
      }]
    })
  }
}

watch(activeTab, (val) => {
  if (val === 'analysis') {
    nextTick(() => initAnalysisCharts())
  }
})

onMounted(() => {
  watch(activeTab, (val) => {
    if (val === 'analysis') {
      nextTick(() => initAnalysisCharts())
    }
  }, { immediate: true })
})

onUnmounted(() => {
  levelChart?.dispose()
  trendChart?.dispose()
  deptChart?.dispose()
})
</script>

<style scoped lang="scss">
.adverse-event {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #1E293B; }

.stats-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }

.stat-card {
  display: flex; align-items: center; padding: 20px; border-radius: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  transition: all 0.3s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15); }
}

.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
.blue-icon { background: linear-gradient(135deg, #4299E1, #3182CE); color: #fff; }
.green-icon { background: linear-gradient(135deg, #48BB78, #38A169); color: #fff; }
.yellow-icon { background: linear-gradient(135deg, #ECC94B, #D69E2E); color: #fff; }
.red-icon { background: linear-gradient(135deg, #FC8181, #F56565); color: #fff; }

.stat-content { flex: 1; }
.stat-label { font-size: 13px; color: #64748B; margin-bottom: 4px; }
.stat-value { font-size: 26px; font-weight: 700; color: #1E293B; }
.warning-text { color: #ECC94B; }
.danger-text { color: #FC8181; }

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

.analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }

.analysis-card {
  padding: 24px; border-radius: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  .analysis-title { margin: 0 0 20px; color: #1E293B; font-size: 16px; font-weight: 600; }
  .chart-container { height: 220px; width: 100%; }
  .chart-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 180px; color: #94A3B8;
    span { margin-top: 10px; }
  }
  .stat-highlight {
    display: flex; flex-direction: column; align-items: center; justify-content: center; height: 180px;
    .big-number { font-size: 48px; font-weight: 700; color: #48BB78; }
    .stat-sub { color: #94A3B8; margin-top: 8px; }
  }
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

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}
</style>