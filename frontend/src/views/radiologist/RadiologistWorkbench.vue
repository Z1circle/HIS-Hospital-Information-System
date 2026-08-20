<template>
  <div class="mri-workbench" @keydown="handleKeydown" tabindex="0" ref="workbenchRef">
    <!-- ===== 顶部标题栏 ===== -->
    <div class="top-bar">
      <div class="top-left">
        <span class="sys-name">影像科医生工作站</span>
        <span class="dept-tag">MRI / CT</span>
      </div>
      <div class="top-center">
        <div class="toolbar-icons">
          <el-tooltip content="搜索 (Ctrl+F)" placement="bottom">
            <el-button :icon="Search" circle size="small" class="top-btn" @click="focusSearch" />
          </el-tooltip>
          <el-tooltip content="刷新 (F5)" placement="bottom">
            <el-button :icon="Refresh" circle size="small" class="top-btn" @click="refreshAll" />
          </el-tooltip>
          <el-tooltip content="打印" placement="bottom">
            <el-button :icon="Printer" circle size="small" class="top-btn" @click="handlePrint" />
          </el-tooltip>
          <el-tooltip content="导出DICOM" placement="bottom">
            <el-button :icon="Download" circle size="small" class="top-btn" @click="handleExport" />
          </el-tooltip>
        </div>
        <div class="quick-search">
          <el-input v-model="globalSearch" placeholder="输入姓名/检查号快速检索..." prefix-icon="Search" size="small" clearable @input="onGlobalSearch" ref="searchRef" />
        </div>
      </div>
      <div class="top-right">
        <el-tooltip content="消息通知" placement="bottom">
          <el-badge :value="2" class="notify-badge">
            <el-button :icon="Bell" circle size="small" class="top-btn" />
          </el-badge>
        </el-tooltip>
        <el-tooltip content="系统设置" placement="bottom">
          <el-button :icon="Setting" circle size="small" class="top-btn" @click="showSystemConfig = true" />
        </el-tooltip>
        <span class="clock">{{ currentTime }}</span>
        <el-divider direction="vertical" />
        <div class="user-area">
          <el-icon :size="18"><UserFilled /></el-icon>
          <span class="user-name">{{ currentUser?.real_name }}</span>
        </div>
        <el-button size="small" class="top-btn" @click="openProfile">个人中心</el-button>
        <el-button size="small" type="danger" text @click="showLogoutDialog = true">退出</el-button>
      </div>
    </div>

    <div class="main-layout">
      <!-- ===== 左侧图标导航栏 ===== -->
      <div class="left-sidebar">
        <div class="nav-icons">
          <el-tooltip content="待检查列表" placement="right">
            <div :class="['nav-item', activeTab === 'pending' ? 'active' : '']" @click="activeTab = 'pending'">
              <el-badge :value="pendingCount" :hidden="pendingCount === 0">
                <el-icon :size="22"><Clock /></el-icon>
              </el-badge>
              <span>待检查</span>
            </div>
          </el-tooltip>
          <el-tooltip content="检查中" placement="right">
            <div :class="['nav-item', activeTab === 'processing' ? 'active' : '']" @click="activeTab = 'processing'">
              <el-icon :size="22"><Loading /></el-icon>
              <span>检查中</span>
            </div>
          </el-tooltip>
          <el-tooltip content="已完成" placement="right">
            <div :class="['nav-item', activeTab === 'completed' ? 'active' : '']" @click="activeTab = 'completed'">
              <el-icon :size="22"><CircleCheck /></el-icon>
              <span>已完成</span>
            </div>
          </el-tooltip>
          <el-tooltip content="危急值" placement="right">
            <div :class="['nav-item', activeTab === 'critical' ? 'active' : '']" @click="activeTab = 'critical'">
              <el-badge :value="criticalCount" :hidden="criticalCount === 0">
                <el-icon :size="22"><Warning /></el-icon>
              </el-badge>
              <span>危急值</span>
            </div>
          </el-tooltip>
          <el-tooltip content="序列管理" placement="right">
            <div :class="['nav-item', activeTab === 'sequences' ? 'active' : '']" @click="activeTab = 'sequences'">
              <el-icon :size="22"><Film /></el-icon>
              <span>序列</span>
            </div>
          </el-tooltip>
        </div>
        <div class="nav-bottom">
          <el-tooltip content="刷新数据" placement="right">
            <div class="nav-item" @click="refreshAll"><el-icon :size="20"><Refresh /></el-icon></div>
          </el-tooltip>
          <el-tooltip content="打印胶片" placement="right">
            <div class="nav-item" @click="handlePrint"><el-icon :size="20"><Printer /></el-icon></div>
          </el-tooltip>
          <div class="nav-main-action" @click="batchApprove">
            <el-icon :size="22"><Select /></el-icon>
            <span>审核</span>
          </div>
        </div>
      </div>

      <!-- ===== 中间主工作区 ===== -->
      <div class="work-area">
        <div class="upper-panel" :style="{ height: upperPanelHeight + 'px' }">
          <div class="panel-header">
            <span class="panel-title">{{ tabTitle }}</span>
            <div class="panel-actions">
              <el-input v-model="listSearch" placeholder="姓名/检查号" prefix-icon="Search" size="small" clearable style="width: 200px" />
              <el-select v-model="urgencyFilter" placeholder="紧急程度" size="small" clearable style="width: 100px">
                <el-option label="急诊" value="emergency" />
                <el-option label="加急" value="urgent" />
                <el-option label="普通" value="normal" />
              </el-select>
              <el-button size="small" @click="refreshList">刷新</el-button>
            </div>
          </div>
          <div class="data-table-wrapper">
            <template v-if="activeTab !== 'completed' && activeTab !== 'sequences'">
              <el-table :data="filteredList" stripe highlight-current-row @row-click="selectRequest" @row-dblclick="openDetail" height="100%" size="small" v-loading="tableLoading">
                <el-table-column type="index" label="序号" width="55" />
                <el-table-column prop="patient_name" label="姓名" width="80" />
                <el-table-column prop="gender" label="性别" width="55" />
                <el-table-column prop="age" label="年龄" width="55" sortable />
                <el-table-column prop="department_name" label="科室" width="100" />
                <el-table-column prop="doctor_name" label="申请医生" width="90" />
                <el-table-column prop="exam_name" label="检查项目" min-width="140" show-overflow-tooltip />
                <el-table-column label="检查部位" width="100">
                  <template #default="{ row }">{{ row.body_part || '--' }}</template>
                </el-table-column>
                <el-table-column label="申请时间" width="160" sortable>
                  <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="100" fixed="right">
                  <template #default="{ row }">
                    <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </template>
            <template v-if="activeTab === 'completed'">
              <el-table :data="filteredList" stripe highlight-current-row @row-click="viewReport" @row-dblclick="viewReport" height="100%" size="small" v-loading="tableLoading">
                <el-table-column prop="id" label="报告号" width="80" />
                <el-table-column prop="patient_name" label="患者" width="80" />
                <el-table-column prop="exam_name" label="检查项目" min-width="140" show-overflow-tooltip />
                <el-table-column prop="reporter_name" label="报告医生" width="90" />
                <el-table-column prop="report_date" label="报告日期" width="120" sortable>
                  <template #default="{ row }">{{ formatDate(row.report_date) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                  <template #default><el-tag type="success" size="small">已完成</el-tag></template>
                </el-table-column>
              </el-table>
            </template>
            <template v-if="activeTab === 'sequences'">
              <div class="sequences-placeholder">
                <el-icon :size="48"><Film /></el-icon>
                <p>MRI 扫描序列管理</p>
                <div class="seq-grid">
                  <div v-for="s in sequences" :key="s.name" class="seq-card">
                    <div class="seq-name">{{ s.name }}</div>
                    <div class="seq-info">TR: {{ s.TR }}ms | TE: {{ s.TE }}ms | 层厚: {{ s.thickness }}mm</div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 分隔条 -->
        <div class="divider-bar" @mousedown="startResize">
          <div class="divider-handle"></div>
        </div>

        <!-- 下半部分 -->
        <div class="lower-panel" :style="{ height: bottomHeight + 'px' }">
          <div class="panel-header">
            <span class="panel-title">{{ lowerTitle }}</span>
            <div class="panel-actions" v-if="currentRequest">
              <!-- 状态流转按钮 -->
              <el-tag :type="statusTagType(currentRequest.status)" size="small" style="margin-right: 8px;">
                {{ statusLabel(currentRequest.status) }}
              </el-tag>
              <el-button v-if="currentRequest.status === 'pending'" type="success" size="small" @click="receiveRequest">
                <el-icon><Select /></el-icon> 接收申请
              </el-button>
              <el-button v-if="currentRequest.status === 'received'" type="primary" size="small" @click="startExam">
                <el-icon><VideoPlay /></el-icon> 开始检查
              </el-button>
              <el-button v-if="currentRequest.status === 'received' || currentRequest.status === 'processing'" type="warning" size="small" @click="quickExam">
                <el-icon><Timer /></el-icon> 快进
              </el-button>
              <el-button v-if="currentRequest.status === 'processing'" type="primary" size="small" @click="showReportForm = true">提交报告</el-button>
              <el-button v-if="currentRequest.status === 'processing'" type="danger" size="small" @click="rejectRequest">驳回</el-button>
              <el-button v-if="currentRequest.status === 'completed'" type="info" size="small" @click="removeFromList">
                <el-icon><Close /></el-icon> 移出列表
              </el-button>
            </div>
          </div>
          <div v-if="!currentRequest" class="empty-lower">
            <el-icon :size="48"><Picture /></el-icon>
            <p>请从上方列表中选择患者</p>
          </div>
          <div v-else-if="currentRequest.status === 'completed'" class="completed-view">
            <el-empty description="该检查已完成，请在已完成列表中查看报告" :image-size="80" />
          </div>
          <div v-else class="imaging-area">
            <div class="patient-summary-bar">
              <span class="ps-item"><strong>姓名：</strong>{{ currentRequest.patient_name }}</span>
              <span class="ps-item"><strong>性别：</strong>{{ currentRequest.gender }}</span>
              <span class="ps-item"><strong>年龄：</strong>{{ currentRequest.age }}岁</span>
              <span class="ps-item"><strong>项目：</strong>{{ currentRequest.exam_name }}</span>
            </div>
            <div class="imaging-content">
              <div class="image-viewer">
                <div class="image-placeholder">
                  <el-icon :size="48"><Picture /></el-icon>
                  <p>MRI / CT 图像显示区域</p>
                  <p class="sub-text">支持DICOM格式图像查看、窗宽窗位调节、测量标注</p>
                  <div class="image-series">
                    <div v-for="i in 4" :key="i" class="series-thumb">
                      <el-icon :size="28"><Picture /></el-icon>
                      <span>序列 {{ i }}</span>
                    </div>
                  </div>
                </div>
                <div class="image-toolbar">
                  <el-button-group size="small">
                    <el-button :icon="ZoomIn" />
                    <el-button :icon="ZoomOut" />
                  </el-button-group>
                  <el-button-group size="small">
                    <el-button>窗宽</el-button>
                    <el-button>窗位</el-button>
                  </el-button-group>
                  <el-button-group size="small">
                    <el-button>测量</el-button>
                    <el-button>标注</el-button>
                  </el-button-group>
                  <el-button size="small" :icon="RefreshRight">复位</el-button>
                </div>
              </div>
              <div class="report-preview" v-if="currentReport">
                <div class="preview-title">当前报告</div>
                <div class="preview-item">
                  <span class="pi-label">检查所见</span>
                  <div class="pi-value">{{ currentReport.findings || '--' }}</div>
                </div>
                <div class="preview-item">
                  <span class="pi-label">影像表现</span>
                  <div class="pi-value">{{ currentReport.image_features || '--' }}</div>
                </div>
                <div class="preview-item">
                  <span class="pi-label">结论</span>
                  <div class="pi-value">{{ currentReport.conclusion || '--' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 右侧辅助信息栏 ===== -->
      <div class="right-panel">
        <div class="patient-card" v-if="currentRequest">
          <div class="card-title">患者信息</div>
          <div class="card-body">
            <div class="info-row"><span class="lbl">姓名</span><span class="val">{{ currentRequest.patient_name }}</span></div>
            <div class="info-row"><span class="lbl">性别</span><span class="val">{{ currentRequest.gender }}</span></div>
            <div class="info-row"><span class="lbl">年龄</span><span class="val">{{ currentRequest.age }}岁</span></div>
            <div class="info-row"><span class="lbl">身份证</span><span class="val">{{ maskIdCard(currentRequest.id_card) }}</span></div>
            <div class="info-row"><span class="lbl">科室</span><span class="val">{{ currentRequest.department_name }}</span></div>
            <div class="info-row"><span class="lbl">诊断</span><span class="val">{{ currentRequest.clinical_diagnosis || '--' }}</span></div>
          </div>
        </div>
        <div class="patient-card" v-else>
          <div class="card-title">患者信息</div>
          <div class="card-body empty-card">
            <el-icon :size="32"><User /></el-icon>
            <p>请选择患者</p>
          </div>
        </div>

        <div class="history-panel">
          <div class="card-title">历史影像</div>
          <div class="card-body">
            <div v-if="patientHistory.length > 0" class="history-list">
              <div v-for="h in patientHistory" :key="h.id" class="history-item" @click="viewReport(h)">
                <div class="hi-name">{{ h.exam_name }}</div>
                <div class="hi-date">{{ formatDate(h.report_date) }}</div>
              </div>
            </div>
            <div v-else class="card-body empty-card"><p>暂无历史记录</p></div>
          </div>
        </div>

        <div class="remark-panel">
          <div class="card-title">备注意见</div>
          <el-input v-model="remark" type="textarea" :rows="3" placeholder="审核意见、复检原因..." />
        </div>

        <div class="action-buttons">
          <el-button type="primary" size="large" style="width: 100%" @click="approveAndSubmit" :disabled="!currentRequest || currentRequest.status !== 'processing'">
            <el-icon><Select /></el-icon> 审核通过
          </el-button>
          <el-button plain size="small" style="width: 100%; margin-top: 6px" @click="saveDraft">
            <el-icon><Document /></el-icon> 保存草稿
          </el-button>
          <el-button type="danger" plain size="small" style="width: 100%; margin-top: 4px" :disabled="!currentRequest" @click="rejectRequest">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <span>{{ currentUser?.real_name }} | 影像科 | HIS v1.0</span>
      <span>{{ currentDate }} {{ currentTime }}</span>
      <span>待检查: {{ pendingCount }} | 检查中: {{ processingCount }}</span>
    </div>

    <!-- ===== 弹窗 ===== -->
    <el-dialog v-model="showReportForm" title="提交影像报告" width="650px">
      <el-form :model="reportForm" label-width="100px">
        <el-form-item label="检查项目"><el-input :value="currentRequest?.exam_name" disabled /></el-form-item>
        <el-form-item label="检查所见" required>
          <el-input v-model="reportForm.findings" type="textarea" :rows="5" placeholder="请输入检查所见..." />
        </el-form-item>
        <el-form-item label="影像学表现">
          <el-input v-model="reportForm.image_features" type="textarea" :rows="4" placeholder="请输入影像学表现..." />
        </el-form-item>
        <el-form-item label="结论" required>
          <el-input v-model="reportForm.conclusion" type="textarea" :rows="3" placeholder="请输入诊断结论..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReportForm = false">取消</el-button>
        <el-button type="primary" @click="submitReport">提交报告</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showReportDetail" title="影像报告详情" width="650px">
      <div v-if="viewingReport">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="患者">{{ viewingReport.patient_name }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ viewingReport.exam_name }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ formatDate(viewingReport.report_date) }}</el-descriptions-item>
          <el-descriptions-item label="报告人">{{ viewingReport.reporter_name }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px;">
          <div class="detail-title">检查所见</div>
          <pre class="detail-pre">{{ viewingReport.findings }}</pre>
          <div class="detail-title">影像学表现</div>
          <pre class="detail-pre">{{ viewingReport.image_features }}</pre>
          <div class="detail-title">结论</div>
          <pre class="detail-pre">{{ viewingReport.conclusion }}</pre>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showLogoutDialog" title="确认退出" width="300px">
      <p>确定要退出登录吗？</p>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="logout">确定退出</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSystemConfig" title="系统设置" width="500px">
      <el-form label-width="120px">
        <el-form-item label="自动刷新"><el-select v-model="autoRefresh" size="small">
          <el-option label="关闭" :value="0" /><el-option label="30秒" :value="30" /><el-option label="60秒" :value="60" />
        </el-select></el-form-item>
        <el-form-item label="默认窗宽"><el-input-number v-model="defaultWindowWidth" :min="1" :max="4000" size="small" /></el-form-item>
        <el-form-item label="默认窗位"><el-input-number v-model="defaultWindowLevel" :min="-1000" :max="3000" size="small" /></el-form-item>
        <el-form-item label="声音提醒"><el-switch v-model="soundAlert" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSystemConfig = false">取消</el-button>
        <el-button type="primary" @click="showSystemConfig = false">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled, Clock, Loading, CircleCheck, Warning, Film,
  Search, Refresh, Printer, Download, Bell, Setting,
  Select, Document, Close, Picture, User, ZoomIn, ZoomOut,
  RefreshRight, VideoPlay, Timer
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const currentUser = ref(userStore.currentUser)
const workbenchRef = ref<HTMLElement>()
const searchRef = ref<HTMLElement>()

const currentTime = ref('')
const currentDate = ref('')
let timeTimer: any = null
let autoRefreshTimer: any = null

const updateClock = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN')
}

const activeTab = ref('pending')
const listSearch = ref('')
const globalSearch = ref('')
const urgencyFilter = ref('')
const remark = ref('')

const showSystemConfig = ref(false)
const autoRefresh = ref(60)
const defaultWindowWidth = ref(1500)
const defaultWindowLevel = ref(-600)
const soundAlert = ref(true)

const mockSequences = () => {
  return [
    { name: 'T1 SE', TR: 500, TE: 15, thickness: 5 },
    { name: 'T2 FSE', TR: 3500, TE: 120, thickness: 5 },
    { name: 'FLAIR', TR: 6000, TE: 100, thickness: 5 },
    { name: 'DWI', TR: 4000, TE: 80, thickness: 5 },
    { name: 'T1+C', TR: 500, TE: 15, thickness: 5 },
    { name: 'T2* GRE', TR: 600, TE: 25, thickness: 3 },
  ]
}
const sequences = ref<any[]>(mockSequences())

const pendingRequests = ref<any[]>([])
const processingRequests = ref<any[]>([])
const completedReports = ref<any[]>([])
const criticalRequests = ref<any[]>([])
const patientHistory = ref<any[]>([])

const currentRequest = ref<any>(null)
const currentReport = ref<any>(null)
const viewingReport = ref<any>(null)
const tableLoading = ref(false)

const reportForm = ref({ findings: '', image_features: '', conclusion: '' })

const upperPanelHeight = ref(350)
const bottomHeight = ref(300)
const isResizing = ref(false)
const startY = ref(0)
const startUpperHeight = ref(0)

const showReportForm = ref(false)
const showReportDetail = ref(false)
const showLogoutDialog = ref(false)

const pendingCount = computed(() => pendingRequests.value.length)
const processingCount = computed(() => processingRequests.value.length)
const criticalCount = computed(() => criticalRequests.value.length)

const tabTitle = computed(() => {
  const t: Record<string, string> = { pending: '待检查列表', processing: '检查中列表', completed: '已完成报告', critical: '危急值管理', sequences: '扫描序列管理' }
  return t[activeTab.value] || ''
})

const lowerTitle = computed(() => {
  if (!currentRequest.value) return '影像阅片区'
  if (currentRequest.value.status === 'completed') return '已完成的检查'
  return currentRequest.value.patient_name + ' - 影像报告'
})

const currentList = computed(() => {
  switch (activeTab.value) {
    case 'pending': return pendingRequests.value
    case 'processing': return processingRequests.value
    case 'completed': return completedReports.value
    case 'critical': return criticalRequests.value
    default: return []
  }
})

const filteredList = computed(() => {
  let list = currentList.value
  if (listSearch.value) {
    const kw = listSearch.value.toLowerCase()
    list = list.filter((r: any) => r.patient_name?.toLowerCase().includes(kw) || String(r.id).includes(kw))
  }
  if (urgencyFilter.value) list = list.filter((r: any) => r.urgency === urgencyFilter.value)
  return list
})

const statusLabel = (s: string) => ({ pending: '待检查', received: '已接收', processing: '检查中', completed: '已完成' } as any)[s] || s
const statusTagType = (s: string) => ({ pending: 'info', received: 'success', processing: 'warning', completed: 'success' } as any)[s] || 'info'
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : ''
const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : ''
const maskIdCard = (s: string) => s ? s.substring(0, 6) + '****' + s.substring(14) : '--'

// ============ 数据加载 ============
const loadPendingRequests = async () => {
  tableLoading.value = true
  try {
    const res = await axios.get('/api/radiologist/pending')
    pendingRequests.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    pendingRequests.value = []
  }
  tableLoading.value = false
}

const loadProcessingRequests = async () => {
  try {
    const res = await axios.get('/api/radiologist/processing')
    processingRequests.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    processingRequests.value = []
  }
}

const loadCompletedReports = async () => {
  try {
    const res = await axios.get('/api/radiologist/reports')
    completedReports.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    completedReports.value = []
  }
}

const loadPatientHistory = async (patientId: number) => {
  try {
    const res = await axios.get('/api/radiologist/reports', { params: { patient_id: patientId } })
    patientHistory.value = res.data || []
  } catch (err) {}
}

const refreshAll = () => { loadPendingRequests(); loadProcessingRequests(); loadCompletedReports() }
const refreshList = () => {
  if (activeTab.value === 'pending') loadPendingRequests()
  else if (activeTab.value === 'processing') loadProcessingRequests()
  else if (activeTab.value === 'completed') loadCompletedReports()
}

const onGlobalSearch = () => { listSearch.value = globalSearch.value }
const focusSearch = () => { searchRef.value?.focus() }

// ============ 选择患者 ============
const selectRequest = async (req: any) => {
  currentRequest.value = req; currentReport.value = null
  if (req.patient_id) loadPatientHistory(req.patient_id)
  if (req.status === 'processing') {
    try {
      const res = await axios.get('/api/radiologist/reports', { params: { reporter_id: currentUser.value?.id } })
      const r = res.data?.find((r: any) => r.request_id === req.id)
      if (r) currentReport.value = r
    } catch {}
  }
}

const openDetail = (row: any) => { if (activeTab.value === 'completed') viewReport(row) }

// ============ 操作 ============
// 接收影像检查申请
const receiveRequest = async () => {
  if (!currentRequest.value) return
  try {
    await axios.put(`/api/radiologist/exam-request/${currentRequest.value.id}/receive`, {
      received_by: currentUser.value?.id
    })
    currentRequest.value.status = 'received'
    currentRequest.value.received_at = new Date().toISOString()
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== currentRequest.value.id)
    await loadPendingRequests()
    ElMessage.success('申请已接收，可开始检查')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '接收失败')
  }
}

const startExam = async () => {
  try {
    await axios.put(`/api/radiologist/exam-request/${currentRequest.value.id}/start`)
    currentRequest.value.status = 'processing'
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== currentRequest.value.id)
    processingRequests.value.unshift(currentRequest.value)
    activeTab.value = 'processing'
    ElMessage.success('已开始检查')
  } catch (err: any) { ElMessage.error(err.response?.data?.error || '操作失败') }
}

const quickExam = async () => {
  try {
    await axios.put(`/api/radiologist/exam-request/${currentRequest.value.id}/start`)
    currentRequest.value.status = 'processing'
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== currentRequest.value.id)
    processingRequests.value.unshift(currentRequest.value)
    activeTab.value = 'processing'
    
    reportForm.value.findings = `检查部位：${currentRequest.value.body_part || '全身'}。图像清晰，未见明显异常密度影。各器官形态、大小正常。`
    reportForm.value.image_features = '影像学表现未见明显异常，各层面结构清晰，未见占位性病变。'
    reportForm.value.conclusion = '检查未见明显异常，请结合临床。'
    
    await axios.post('/api/radiologist/report-with-notify', {
      request_id: currentRequest.value.id,
      findings: reportForm.value.findings,
      image_features: reportForm.value.image_features,
      conclusion: reportForm.value.conclusion,
      reporter_id: currentUser.value?.id
    })
    
    currentRequest.value.status = 'completed'
    processingRequests.value = processingRequests.value.filter(r => r.id !== currentRequest.value.id)
    completedReports.value.unshift({
      ...currentRequest.value,
      report_date: new Date().toISOString(),
      reporter_name: currentUser.value?.real_name
    })
    
    ElMessage.success('快进完成，报告已自动提交')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '快进失败')
  }
}

const submitReport = async () => {
  if (!reportForm.value.findings || !reportForm.value.conclusion) { ElMessage.warning('请填写检查所见和结论'); return }
  try {
    // 使用新的带通知的API
    await axios.post('/api/radiologist/report-with-notify', {
      request_id: currentRequest.value.id, 
      patient_id: currentRequest.value.patient_id,
      exam_name: currentRequest.value.exam_name, 
      findings: reportForm.value.findings,
      image_features: reportForm.value.image_features,
      conclusion: reportForm.value.conclusion + (remark.value ? '\n备注: ' + remark.value : ''),
      image_url: '', // 可添加DICOM图像URL
      reporter_id: currentUser.value?.id, 
      reporter_name: currentUser.value?.real_name,
      is_critical: false
    })
    
    showReportForm.value = false
    reportForm.value = { findings: '', image_features: '', conclusion: '' }
    remark.value = ''
    
    // 更新状态
    currentRequest.value.status = 'completed'
    processingRequests.value = processingRequests.value.filter(r => r.id !== currentRequest.value.id)
    currentRequest.value = null
    currentReport.value = null
    
    await loadPendingRequests()
    await loadCompletedReports()
    
    ElMessage.success('报告提交成功！已自动通知申请医生')
  } catch (err: any) { ElMessage.error(err.response?.data?.error || '提交报告失败') }
}

// 移出已完成患者
const removeFromList = async () => {
  if (!currentRequest.value) return
  try {
    await ElMessageBox.confirm(`确定将患者 ${currentRequest.value.patient_name} 从当前列表移出吗？`, '确认移出', { type: 'info' })
    completedReports.value = completedReports.value.filter(r => r.id !== currentRequest.value.id)
    currentRequest.value = null
    ElMessage.success('已从列表移出')
  } catch {}
}

const approveAndSubmit = () => {
  if (currentRequest.value?.status === 'processing') showReportForm.value = true
  else ElMessage.info('请先选择检查中的患者')
}
const batchApprove = () => approveAndSubmit()
const saveDraft = () => { ElMessage.success('草稿已保存') }

const rejectRequest = async () => {
  if (!currentRequest.value) return
  try {
    await ElMessageBox.confirm(`确定驳回患者 ${currentRequest.value.patient_name} 的检查申请吗？`, '确认驳回', { type: 'warning' })
    processingRequests.value = processingRequests.value.filter(r => r.id !== currentRequest.value.id)
    currentRequest.value = null
    ElMessage.success('已驳回')
  } catch {}
}

const viewReport = (report: any) => { viewingReport.value = report; showReportDetail.value = true }
const handlePrint = () => { ElMessage.info('打印功能已触发') }
const handleExport = () => { ElMessage.success('正在导出DICOM文件...') }

// 面板拖拽
const startResize = (e: MouseEvent) => {
  isResizing.value = true; startY.value = e.clientY; startUpperHeight.value = upperPanelHeight.value
  document.addEventListener('mousemove', onResize); document.addEventListener('mouseup', stopResize)
}
const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const newH = startUpperHeight.value + e.clientY - startY.value
  if (newH > 120 && newH < window.innerHeight - 300) {
    upperPanelHeight.value = newH
    bottomHeight.value = window.innerHeight - newH - 200
  }
}
const stopResize = () => { isResizing.value = false; document.removeEventListener('mousemove', onResize); document.removeEventListener('mouseup', stopResize) }

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'F5') { e.preventDefault(); refreshAll() }
  else if (e.key === 'Escape') { showReportForm.value = false; showReportDetail.value = false }
  else if (e.ctrlKey && e.key === 'f') { e.preventDefault(); focusSearch() }
}

const openProfile = () => { router.push('/doctor/profile') }
const logout = () => { userStore.logout(); router.push('/login') }

const startAutoRefresh = () => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  if (autoRefresh.value > 0) autoRefreshTimer = setInterval(refreshAll, autoRefresh.value * 1000)
}
watch(autoRefresh, startAutoRefresh)

onMounted(() => {
  updateClock()
  timeTimer = setInterval(updateClock, 1000)
  loadPendingRequests(); loadCompletedReports()
  document.addEventListener('keydown', handleKeydown)
  startAutoRefresh()
})

onBeforeUnmount(() => {
  if (timeTimer) clearInterval(timeTimer)
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  document.removeEventListener('keydown', handleKeydown)
})

watch(activeTab, () => {
  currentRequest.value = null
  if (activeTab.value === 'pending') loadPendingRequests()
  else if (activeTab.value === 'processing') loadProcessingRequests()
  else if (activeTab.value === 'completed') loadCompletedReports()
})
</script>

<style scoped>
.mri-workbench { height: 100vh; display: flex; flex-direction: column; background: #0d1117; color: #c9d1d9; outline: none; }

/* ===== 顶部 ===== */
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 48px; background: #161b22; border-bottom: 1px solid #30363d; flex-shrink: 0; }
.top-left { display: flex; align-items: center; gap: 10px; }
.sys-name { font-size: 15px; font-weight: 600; color: #e6edf3; }
.dept-tag { background: #1f6feb; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 3px; font-weight: 600; }
.top-center { display: flex; align-items: center; gap: 12px; }
.toolbar-icons { display: flex; gap: 4px; }
.top-btn { color: #58a6ff !important; background: rgba(88,166,255,0.1) !important; border-color: rgba(88,166,255,0.3) !important; }
.top-btn:hover { color: #fff !important; background: rgba(88,166,255,0.25) !important; }
.quick-search { width: 220px; }
.quick-search :deep(.el-input__wrapper) { background: #0d1117; border: 1px solid #30363d; box-shadow: none; }
.quick-search :deep(.el-input__inner) { color: #c9d1d9; }
.quick-search :deep(.el-input__inner::placeholder) { color: #484f58; }
.top-right { display: flex; align-items: center; gap: 8px; }
.clock { font-size: 14px; font-family: 'Courier New', monospace; font-weight: 600; color: #58a6ff; }
.user-area { display: flex; align-items: center; gap: 6px; }
.user-name { font-size: 13px; font-weight: 500; color: #e6edf3; }

/* ===== 左侧导航 ===== */
.left-sidebar { width: 56px; background: #161b22; border-right: 1px solid #30363d; display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; }
.nav-icons { display: flex; flex-direction: column; padding-top: 8px; }
.nav-item { display: flex; flex-direction: column; align-items: center; padding: 12px 4px; cursor: pointer; color: #8b949e; transition: all 0.2s; font-size: 10px; gap: 4px; }
.nav-item:hover { color: #e6edf3; background: rgba(255,255,255,0.05); }
.nav-item.active { color: #58a6ff; background: #1a2333; }
.nav-bottom { display: flex; flex-direction: column; padding-bottom: 8px; }
.nav-main-action { display: flex; flex-direction: column; align-items: center; padding: 10px 4px; margin: 4px 6px; cursor: pointer; background: #238636; color: #fff; border-radius: 6px; font-size: 10px; gap: 2px; }
.nav-main-action:hover { background: #2ea043; }

/* ===== 主工作区 ===== */
.work-area { flex: 1; display: flex; flex-direction: column; background: #0d1117; min-width: 0; }
.upper-panel, .lower-panel { background: #161b22; border: 1px solid #30363d; overflow: hidden; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #21262d; border-bottom: 1px solid #30363d; height: 40px; flex-shrink: 0; }
.panel-title { font-weight: 600; font-size: 14px; color: #e6edf3; }
.panel-actions { display: flex; gap: 8px; align-items: center; }
.data-table-wrapper { height: calc(100% - 40px); }

/* 表格暗色 */
:deep(.el-table) { --el-table-bg-color: #161b22; --el-table-tr-bg-color: #161b22; --el-table-header-bg-color: #21262d; --el-table-border-color: #30363d; --el-table-text-color: #c9d1d9; --el-table-header-text-color: #8b949e; --el-table-row-hover-bg-color: #1a2333; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) { background: #1c2128; }
:deep(.el-table th), :deep(.el-table td) { border-color: #30363d !important; }

/* 分隔条 */
.divider-bar { height: 6px; background: #21262d; cursor: row-resize; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.divider-bar:hover { background: #30363d; }
.divider-handle { width: 40px; height: 3px; background: #484f58; border-radius: 2px; }
.divider-bar:hover .divider-handle { background: #58a6ff; }

/* 下半部分 */
.empty-lower { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 40px); color: #484f58; }
.empty-lower p { margin-top: 12px; font-size: 14px; }
.completed-view { display: flex; align-items: center; justify-content: center; height: calc(100% - 40px); }
.imaging-area { padding: 12px; height: calc(100% - 40px); }
.patient-summary-bar { display: flex; gap: 20px; padding: 8px 12px; background: #1a2333; border-radius: 4px; margin-bottom: 12px; flex-wrap: wrap; }
.ps-item { font-size: 13px; color: #c9d1d9; }
.ps-item strong { color: #8b949e; }
.imaging-content { display: flex; gap: 12px; height: calc(100% - 52px); }
.image-viewer { flex: 1; background: #0d1117; border: 2px solid #30363d; border-radius: 6px; display: flex; flex-direction: column; }
.image-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #484f58; padding: 16px; }
.image-placeholder .sub-text { font-size: 11px; color: #30363d; margin-top: 4px; }
.image-series { display: flex; gap: 12px; margin-top: 20px; }
.series-thumb { width: 80px; height: 70px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #8b949e; font-size: 11px; }
.series-thumb:hover { border-color: #58a6ff; color: #58a6ff; }
.image-toolbar { display: flex; gap: 8px; padding: 8px 12px; background: #21262d; border-top: 1px solid #30363d; }
.image-toolbar .el-button { background: #30363d; border-color: #484f58; color: #c9d1d9; }
.image-toolbar .el-button:hover { border-color: #58a6ff; color: #58a6ff; }
.report-preview { width: 220px; background: #21262d; border-radius: 6px; border: 1px solid #30363d; padding: 12px; overflow-y: auto; flex-shrink: 0; }
.preview-title { font-size: 13px; font-weight: 600; color: #58a6ff; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #30363d; }
.preview-item { margin-bottom: 10px; }
.pi-label { font-size: 11px; color: #8b949e; margin-bottom: 4px; }
.pi-value { font-size: 12px; color: #c9d1d9; line-height: 1.5; }

/* 序列管理 */
.sequences-placeholder { padding: 40px; text-align: center; color: #8b949e; }
.sequences-placeholder p { margin-top: 12px; font-size: 14px; font-weight: 500; }
.seq-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; justify-content: center; }
.seq-card { width: 140px; padding: 16px; background: #21262d; border: 1px solid #30363d; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.seq-card:hover { border-color: #58a6ff; }
.seq-name { font-size: 14px; font-weight: 600; color: #58a6ff; margin-bottom: 8px; }
.seq-info { font-size: 11px; color: #8b949e; }

/* ===== 右侧 ===== */
.right-panel { width: 240px; background: #161b22; border-left: 1px solid #30363d; display: flex; flex-direction: column; gap: 8px; padding: 10px; flex-shrink: 0; overflow-y: auto; }
.patient-card, .history-panel, .remark-panel { background: #21262d; border-radius: 6px; border: 1px solid #30363d; }
.card-title { font-size: 13px; font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #30363d; background: #1a2333; color: #e6edf3; }
.card-body { padding: 10px 12px; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 20px; color: #484f58; font-size: 12px; }
.info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
.info-row .lbl { color: #8b949e; }
.info-row .val { color: #c9d1d9; font-weight: 500; text-align: right; }
.history-list { max-height: 150px; overflow-y: auto; }
.history-item { padding: 6px 0; border-bottom: 1px solid #30363d; cursor: pointer; }
.history-item:hover { color: #58a6ff; }
.hi-name { font-size: 12px; font-weight: 500; }
.hi-date { font-size: 11px; color: #8b949e; }
.remark-panel :deep(.el-textarea__inner) { background: #0d1117; border-color: #30363d; color: #c9d1d9; }
.action-buttons { margin-top: auto; padding-top: 8px; }

/* ===== 底部 ===== */
.status-bar { height: 26px; background: #161b22; border-top: 1px solid #30363d; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 11px; color: #8b949e; flex-shrink: 0; }

/* ===== 弹窗 ===== */
:deep(.el-dialog) { --el-dialog-bg-color: #161b22; --el-dialog-border-color: #30363d; }
:deep(.el-dialog__title) { color: #e6edf3; }
:deep(.el-dialog__body) { color: #c9d1d9; }
:deep(.el-descriptions__body) { background: #0d1117; }
:deep(.el-descriptions__label) { background: #21262d; color: #8b949e; border-color: #30363d !important; }
:deep(.el-descriptions__content) { background: #161b22; color: #c9d1d9; border-color: #30363d !important; }
:deep(.el-input__wrapper) { background: #0d1117; border-color: #30363d; }
:deep(.el-input__inner) { color: #c9d1d9; }
:deep(.el-textarea__inner) { background: #0d1117; border-color: #30363d; color: #c9d1d9; }
.detail-title { font-weight: 600; font-size: 14px; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #58a6ff; display: inline-block; color: #58a6ff; }
.detail-pre { background: #0d1117; padding: 12px; border-radius: 4px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; border: 1px solid #30363d; color: #c9d1d9; }
</style>
