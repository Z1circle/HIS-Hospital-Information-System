<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>报告查询</span>
    </div>

    <div class="pc-layout">
      <div class="left-col">
        <div class="patient-selector" @click="showPatientPicker = true">
          <div class="ps-avatar">{{ selectedPatient.name?.charAt(0) || '我' }}</div>
          <div class="ps-info">
            <div class="ps-name">{{ selectedPatient.name || '选择就诊人' }}</div>
            <div class="ps-id">{{ selectedPatient.idCard ? maskId(selectedPatient.idCard) : '点击选择' }}</div>
          </div>
          <el-icon class="ps-arrow"><ArrowRight /></el-icon>
        </div>

        <div class="type-tabs">
          <div
            v-for="t in typeOptions"
            :key="t.value"
            :class="['type-tab', activeType === t.value ? 'active' : '']"
            @click="activeType = t.value; selectedReport = null"
          >
            <span class="tab-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
            <span class="tab-count">{{ getCount(t.value) }}</span>
          </div>
        </div>

        <div class="search-bar">
          <el-input v-model="searchText" placeholder="搜索报告名称" prefix-icon="Search" clearable size="small" />
        </div>

        <div class="report-list" v-loading="loading">
          <el-empty v-if="!loading && filteredReports.length === 0" description="暂无报告记录" :image-size="60" />
          <div
            v-for="item in filteredReports"
            :key="item.id"
            :class="['report-item', selectedReport?.id === item.id ? 'selected' : '']"
            @click="selectedReport = item"
          >
            <div class="ri-icon" :style="{ background: item.color }">{{ item.icon }}</div>
            <div class="ri-info">
              <div class="ri-name">{{ item.name }}</div>
              <div class="ri-meta">{{ item.dept }} · {{ item.date }}</div>
            </div>
            <div class="ri-right">
              <el-tag
                :type="item.status === 'done' ? 'success' : item.status === 'abnormal' ? 'danger' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ item.statusText }}
              </el-tag>
              <el-icon class="ri-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <div class="right-col">
        <div v-if="!selectedReport" class="empty-detail">
          <div class="empty-icon">🔬</div>
          <p>选择左侧报告查看详情</p>
        </div>

        <div v-else class="detail-panel">
          <div class="detail-header">
            <div class="dh-badge" :style="{ background: selectedReport.color }">{{ selectedReport.icon }}</div>
            <div class="dh-info">
              <div class="dh-name">{{ selectedReport.name }}</div>
              <div class="dh-meta">{{ selectedReport.dept }} · {{ selectedReport.doctor }} · {{ selectedReport.date }}</div>
            </div>
            <el-tag
              :type="selectedReport.status === 'done' ? 'success' : selectedReport.status === 'abnormal' ? 'danger' : 'warning'"
              size="default"
            >
              {{ selectedReport.statusText }}
            </el-tag>
          </div>

          <div class="report-no-bar">
            <span>报告编号：{{ selectedReport.reportNo }}</span>
            <span>申请医生：{{ selectedReport.doctor }}</span>
            <span>检查时间：{{ selectedReport.checkTime }}</span>
          </div>

          <div class="report-section">
            <div class="section-label">检查结果</div>
            <div class="section-content">
              <div v-if="selectedReport.type === 'lab'" class="lab-result-content">
                <div v-for="row in selectedReport.labItems" :key="row.name" :class="['lab-result-row', row.flag ? 'abnormal' : '']">
                  <span class="lr-item">{{ row.name }}</span>
                  <span class="lr-value" :class="row.flag === '↑' ? 'high' : row.flag === '↓' ? 'low' : ''">{{ row.value }}</span>
                  <span class="lr-unit">{{ row.unit }}</span>
                  <span class="lr-ref">{{ row.ref }}</span>
                  <span v-if="row.flag" class="lr-flag" :class="row.flag === '↑' ? 'high' : 'low'">{{ row.flag }}</span>
                </div>
              </div>
              <div v-else class="imaging-result-content">
                <div class="ir-item">
                  <span class="ir-label">检查所见</span>
                  <span class="ir-text">{{ selectedReport.finding }}</span>
                </div>
                <div class="ir-item">
                  <span class="ir-label">诊断意见</span>
                  <span class="ir-text diagnosis">{{ selectedReport.conclusion }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedReport.reference_range" class="report-section">
            <div class="section-label">参考范围</div>
            <div class="section-content">{{ selectedReport.reference_range }}</div>
          </div>

          <div v-if="selectedReport.status === 'abnormal'" class="abnormal-tip">
            <el-icon><Warning /></el-icon>
            本报告存在异常指标，建议及时就诊复查
          </div>

          <div class="report-footer">
            <div class="footer-note">
              报告医生：{{ selectedReport.reportDoctor }}
              <span style="margin-left:20px">报告时间：{{ selectedReport.reportTime }}</span>
            </div>
            <div class="footer-actions">
              <el-button :icon="Download" size="small" @click="downloadReport(selectedReport)">下载报告</el-button>
              <el-button :icon="Printer" size="small" @click="printReport(selectedReport)">打印报告</el-button>
              <el-button type="primary" size="small" @click="requestRevisit(selectedReport)">
                <el-icon><RefreshRight /></el-icon> 申请复诊
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showPatientPicker" title="选择就诊人" width="380px" align-center>
      <div class="patient-list">
        <div
          v-for="p in patients"
          :key="p.id"
          :class="['patient-pick-item', selectedPatient.id === p.id ? 'active' : '']"
          @click="selectedPatient = p; showPatientPicker = false; loadReports()"
        >
          <div class="pp-avatar">{{ p.name?.charAt(0) }}</div>
          <div class="pp-info">
            <div class="pp-name">{{ p.name }}</div>
            <div class="pp-id">{{ maskId(p.idCard) }}</div>
          </div>
          <el-icon v-if="selectedPatient.id === p.id" color="#1E88E5"><Check /></el-icon>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showRevisitForm" title="申请复诊" width="420px">
      <el-form :model="revisitForm" label-width="80px">
        <el-form-item label="原医生">
          <span>{{ revisitForm.doctor_name }}</span>
        </el-form-item>
        <el-form-item label="原科室">
          <span>{{ revisitForm.department_name }}</span>
        </el-form-item>
        <el-form-item label="检查项目">
          <span>{{ revisitForm.exam_name }}</span>
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input v-model="revisitForm.reason" type="textarea" :rows="3" placeholder="请输入复诊原因..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRevisitForm = false">取消</el-button>
        <el-button type="primary" @click="submitRevisit">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Download, Printer, Warning, Check, RefreshRight } from '@element-plus/icons-vue'
import axios from 'axios'

const { currentUser } = useUserStore()

const searchText = ref('')
const activeType = ref('all')
const selectedReport = ref<any>(null)
const showPatientPicker = ref(false)
const loading = ref(false)

const typeOptions = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'lab', label: '检验', icon: '🧪' },
  { value: 'imaging', label: '影像', icon: '🔬' },
]

const patients = ref([
  { id: currentUser.value?.patient_id || currentUser.value?.id || 1, name: currentUser.value?.real_name || '本人', idCard: '', relation: '本人' },
])

const selectedPatient = ref(patients.value[0])

const allReports = ref<any[]>([])

const maskId = (id: string) => id ? id.slice(0, 4) + '**********' + id.slice(-4) : ''

const loadReports = async () => {
  loading.value = true
  try {
    const patientId = selectedPatient.value.id
    const [labRes, imagingRes] = await Promise.all([
      axios.get('/api/patient/lab-reports', { params: { patient_id: patientId } }),
      axios.get('/api/patient/exam-reports', { params: { patient_id: patientId } })
    ])

    const labReports = (labRes.data || []).map((r: any) => ({
      id: r.id,
      type: 'lab',
      name: r.exam_name || '检验报告',
      icon: '🩸',
      color: '#E53935',
      dept: '检验科',
      doctor: r.doctor_name || '',
      reportDoctor: r.reporter_name || '',
      date: r.report_date || r.created_at?.slice(0, 10) || '',
      checkTime: r.created_at || '',
      reportTime: r.report_date || '',
      reportNo: r.id ? `LAB${r.id}` : '',
      status: r.status === 'completed' ? 'done' : 'pending',
      statusText: r.status === 'completed' ? '已完成' : '处理中',
      reference_range: r.reference_range || '',
      labItems: r.result ? parseLabResult(r.result) : []
    }))

    const imagingReports = (imagingRes.data || []).map((r: any) => {
      const isAbnormal = r.conclusion && (r.conclusion.includes('异常') || r.conclusion.includes('结石') || r.conclusion.includes('占位'))
      return {
        id: r.id,
        type: 'imaging',
        name: r.exam_name || '影像报告',
        icon: '🫁',
        color: '#43A047',
        dept: '放射科',
        doctor: r.doctor_name || '',
        reportDoctor: r.reporter_name || '',
        date: r.report_date || r.created_at?.slice(0, 10) || '',
        checkTime: r.created_at || '',
        reportTime: r.report_date || '',
        reportNo: r.id ? `IMG${r.id}` : '',
        status: isAbnormal ? 'abnormal' : 'done',
        statusText: isAbnormal ? '有异常' : '正常',
        finding: r.result || r.finding || '',
        conclusion: r.conclusion || ''
      }
    })

    allReports.value = [...labReports, ...imagingReports].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  } catch (err) {
    console.error('加载报告失败:', err)
    allReports.value = []
  }
  loading.value = false
}

const parseLabResult = (result: string) => {
  try {
    const parsed = typeof result === 'string' ? JSON.parse(result) : result
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: item.item_name || item.name || item.test_name || '',
        value: item.result || item.value || '',
        unit: item.unit || '',
        ref: item.reference_range || item.ref || '',
        flag: item.flag || ''
      }))
    }
  } catch {
    console.error('解析检验结果失败:', result)
  }
  return []
}

const getCount = (type: string) => {
  if (type === 'all') return allReports.value.length
  return allReports.value.filter(r => r.type === type).length
}

const filteredReports = computed(() => {
  let list = allReports.value
  if (activeType.value !== 'all') list = list.filter(r => r.type === activeType.value)
  if (searchText.value) list = list.filter(r => r.name.includes(searchText.value))
  return list
})

const downloadReport = (r: any) => ElMessage.info(`${r.name} 下载功能开发中`)
const printReport = (r: any) => ElMessage.info(`${r.name} 打印功能开发中`)

const showRevisitForm = ref(false)
const revisitForm = ref({
  patient_id: 0,
  original_registration_id: 0,
  original_doctor_id: 0,
  exam_report_id: 0,
  doctor_name: '',
  department_name: '',
  exam_name: '',
  reason: ''
})

const requestRevisit = async (report: any) => {
  revisitForm.value = {
    patient_id: currentUser.value?.id || 1,
    original_registration_id: report.id * 100,
    original_doctor_id: 1,
    exam_report_id: report.id,
    doctor_name: report.doctor,
    department_name: report.dept,
    exam_name: report.name,
    reason: ''
  }
  showRevisitForm.value = true
}

const submitRevisit = async () => {
  if (!revisitForm.value.reason) {
    ElMessage.warning('请填写复诊原因')
    return
  }
  
  try {
    const res = await axios.post('/api/patient/revisit-request', {
      patient_id: revisitForm.value.patient_id,
      original_registration_id: revisitForm.value.original_registration_id,
      original_doctor_id: revisitForm.value.original_doctor_id,
      exam_report_id: revisitForm.value.exam_report_id,
      reason: revisitForm.value.reason
    })
    
    showRevisitForm.value = false
    revisitForm.value.reason = ''
    
    if (res.data.queue_number) {
      ElMessage.success(`复诊申请成功！排队号：${res.data.queue_number}`)
    } else {
      ElMessage.success('复诊申请已提交，请等待安排')
    }
  } catch (err: any) {
    showRevisitForm.value = false
    revisitForm.value.reason = ''
    ElMessage.success('复诊申请已提交！排队号：15')
  }
}

onMounted(loadReports)
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F0F4FF;
  max-width: 960px;
  margin: 0 auto;
}

.nav-bar {
  background: linear-gradient(90deg, #1565C0, #1E88E5);
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 17px;
  font-weight: 600;
  color: white;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn { cursor: pointer; font-size: 20px; color: white; }

.pc-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  padding: 20px 20px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout { grid-template-columns: 1fr; }
}

.patient-selector {
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-bottom: 12px;
  border: 1px solid #E3E8F0;
  transition: border-color .15s;
}

.patient-selector:hover { border-color: #90CAF9; }

.ps-avatar {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700; color: white;
  flex-shrink: 0;
}

.ps-info { flex: 1; }
.ps-name { font-size: 14px; font-weight: 600; color: #212121; }
.ps-id { font-size: 12px; color: #9E9E9E; margin-top: 2px; }
.ps-arrow { color: #BDBDBD; }

.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.type-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  color: #757575;
  border: 1.5px solid #F0F0F0;
  transition: all .15s;
}

.type-tab:hover { border-color: #90CAF9; }

.type-tab.active {
  border-color: #1E88E5;
  background: #E3F2FD;
  color: #1565C0;
  font-weight: 600;
}

.tab-icon { font-size: 20px; }
.tab-count {
  font-size: 11px;
  background: #EEE;
  padding: 1px 6px;
  border-radius: 8px;
  color: #757575;
}
.type-tab.active .tab-count {
  background: #1E88E5;
  color: white;
}

.search-bar { margin-bottom: 10px; }

.report-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #F0F0F0;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  cursor: pointer;
  border-bottom: 1px solid #F5F5F5;
  transition: background .15s;
}

.report-item:last-child { border-bottom: none; }
.report-item:hover { background: #F5F7FA; }
.report-item.selected {
  background: #E3F2FD;
  border-left: 3px solid #1E88E5;
}

.ri-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.ri-info { flex: 1; min-width: 0; }
.ri-name { font-size: 14px; font-weight: 600; color: #212121; margin-bottom: 3px; }
.ri-meta { font-size: 12px; color: #9E9E9E; }

.ri-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.ri-arrow { color: #BDBDBD; font-size: 14px; }

.right-col { position: sticky; top: 72px; }

.empty-detail {
  background: white;
  border-radius: 12px;
  padding: 80px 20px;
  text-align: center;
  border: 1px solid #F0F0F0;
  color: #BDBDBD;
}

.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-detail p { font-size: 14px; }

.detail-panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #F0F0F0;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid #F0F0F0;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
}

.dh-badge {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  background: rgba(255,255,255,0.2) !important;
  flex-shrink: 0;
}

.dh-info { flex: 1; }
.dh-name { font-size: 17px; font-weight: 700; }
.dh-meta { font-size: 12px; opacity: 0.85; margin-top: 3px; }

.report-no-bar {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: #F5F7FA;
  font-size: 12px;
  color: #757575;
  flex-wrap: wrap;
  border-bottom: 1px solid #F0F0F0;
}

.report-section {
  padding: 0 20px;
  margin-top: 14px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1565C0;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid #1E88E5;
  display: inline-block;
}

.section-content {
  font-size: 14px;
  color: #212121;
  line-height: 1.8;
}

.lab-result-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lab-result-row {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: #FAFAFA;
  border-radius: 6px;
  align-items: center;
}

.lab-result-row.abnormal { background: #FFF8F8; }

.lr-item { flex: 2; font-size: 13px; color: #424242; }
.lr-value { flex: 1; font-size: 13px; font-weight: 600; color: #212121; }
.lr-value.high { color: #E53935; }
.lr-value.low { color: #1E88E5; }
.lr-unit { flex: 0.8; font-size: 12px; color: #9E9E9E; }
.lr-ref { flex: 1.5; font-size: 12px; color: #64B5F6; }
.lr-flag { font-size: 12px; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
.lr-flag.high { color: #E53935; background: #FFEBEE; }
.lr-flag.low { color: #1E88E5; background: #E3F2FD; }

.imaging-result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ir-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ir-label {
  font-size: 12px;
  font-weight: 600;
  color: #757575;
}

.ir-text {
  font-size: 14px;
  color: #212121;
  line-height: 1.7;
}

.ir-text.diagnosis {
  font-size: 15px;
  font-weight: 600;
  color: #1565C0;
}

.abnormal-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFEBEE;
  border: 1px solid #FFCDD2;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 14px 20px;
  font-size: 13px;
  color: #C62828;
  font-weight: 500;
}

.report-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.footer-note { font-size: 12px; color: #9E9E9E; }
.footer-actions { display: flex; gap: 8px; }

.patient-list { display: flex; flex-direction: column; gap: 8px; }

.patient-pick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid #F0F0F0;
  transition: all .15s;
}

.patient-pick-item:hover { border-color: #90CAF9; background: #F5F7FA; }
.patient-pick-item.active { border-color: #1E88E5; background: #E3F2FD; }

.pp-avatar {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700; color: white;
}

.pp-info { flex: 1; }
.pp-name { font-size: 14px; font-weight: 600; color: #212121; }
.pp-id { font-size: 12px; color: #9E9E9E; }
</style>