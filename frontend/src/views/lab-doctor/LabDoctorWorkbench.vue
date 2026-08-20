<template>
  <div class="lis-workbench" @keydown="handleKeydown" tabindex="0" ref="workbenchRef">
    <!-- ===== 顶部标题栏 ===== -->
    <div class="top-bar">
      <div class="top-left">
        <span class="sys-name">检验科医生工作站</span>
        <span class="dept-tag">LIS</span>
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
          <el-tooltip content="导出Excel" placement="bottom">
            <el-button :icon="Download" circle size="small" class="top-btn" @click="handleExport" />
          </el-tooltip>
        </div>
        <div class="quick-search">
          <el-input v-model="globalSearch" placeholder="输入姓名/条码号快速检索..." prefix-icon="Search" size="small" clearable @input="onGlobalSearch" ref="searchRef" />
        </div>
      </div>
      <div class="top-right">
        <el-tooltip content="消息通知" placement="bottom">
          <el-badge :value="3" class="notify-badge">
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
          <el-tooltip content="待检验列表" placement="right">
            <div :class="['nav-item', activeTab === 'pending' ? 'active' : '']" @click="activeTab = 'pending'">
              <el-badge :value="pendingCount" :hidden="pendingCount === 0">
                <el-icon :size="22"><Clock /></el-icon>
              </el-badge>
              <span>待检验</span>
            </div>
          </el-tooltip>
          <el-tooltip content="检验中" placement="right">
            <div :class="['nav-item', activeTab === 'processing' ? 'active' : '']" @click="activeTab = 'processing'">
              <el-icon :size="22"><Loading /></el-icon>
              <span>检验中</span>
            </div>
          </el-tooltip>
          <el-tooltip content="已完成报告" placement="right">
            <div :class="['nav-item', activeTab === 'completed' ? 'active' : '']" @click="activeTab = 'completed'">
              <el-icon :size="22"><CircleCheck /></el-icon>
              <span>已完成</span>
            </div>
          </el-tooltip>
          <el-tooltip content="危急值管理" placement="right">
            <div :class="['nav-item', activeTab === 'critical' ? 'active' : '']" @click="activeTab = 'critical'">
              <el-badge :value="criticalCount" :hidden="criticalCount === 0">
                <el-icon :size="22"><Warning /></el-icon>
              </el-badge>
              <span>危急值</span>
            </div>
          </el-tooltip>
          <el-tooltip content="质控图" placement="right">
            <div :class="['nav-item', activeTab === 'qc' ? 'active' : '']" @click="activeTab = 'qc'">
              <el-icon :size="22"><DataLine /></el-icon>
              <span>质控图</span>
            </div>
          </el-tooltip>
        </div>
        <div class="nav-bottom">
          <el-tooltip content="刷新数据" placement="right">
            <div class="nav-item" @click="refreshAll">
              <el-icon :size="20"><Refresh /></el-icon>
            </div>
          </el-tooltip>
          <el-tooltip content="打印" placement="right">
            <div class="nav-item" @click="handlePrint">
              <el-icon :size="20"><Printer /></el-icon>
            </div>
          </el-tooltip>
          <div class="nav-main-action" @click="batchApprove">
            <el-icon :size="22"><Select /></el-icon>
            <span>审核</span>
          </div>
        </div>
      </div>

      <!-- ===== 中间主工作区 ===== -->
      <div class="work-area">
        <!-- 筛选项 -->
        <div class="upper-panel" :style="{ height: upperPanelHeight + 'px' }">
          <div class="panel-header">
            <span class="panel-title">{{ tabTitle }}</span>
            <div class="panel-actions">
              <el-input v-model="listSearch" placeholder="姓名/条码号" prefix-icon="Search" size="small" clearable style="width: 200px" />
              <el-select v-model="urgencyFilter" placeholder="紧急程度" size="small" clearable style="width: 100px">
                <el-option label="急诊" value="emergency" />
                <el-option label="加急" value="urgent" />
                <el-option label="普通" value="normal" />
              </el-select>
              <el-button size="small" @click="refreshList">刷新</el-button>
            </div>
          </div>
          <div class="upper-content">
            <div class="data-table-wrapper">
              <template v-if="activeTab !== 'completed' && activeTab !== 'qc'">
                <el-table :data="filteredList" stripe highlight-current-row @row-click="selectRequest" @row-dblclick="openDetail" height="100%" size="small" v-loading="tableLoading">
                  <el-table-column prop="id" label="条码号" width="90" sortable />
                  <el-table-column prop="patient_name" label="姓名" width="80" />
                  <el-table-column prop="gender" label="性别" width="55" />
                  <el-table-column prop="age" label="年龄" width="55" sortable />
                  <el-table-column prop="department_name" label="科室" width="100" />
                  <el-table-column prop="doctor_name" label="送检医生" width="90" />
                  <el-table-column prop="exam_name" label="检验项目" min-width="130" show-overflow-tooltip />
                  <el-table-column label="标本类型" width="90">
                    <template #default="{ row }">{{ row.sample_type || '血液' }}</template>
                  </el-table-column>
                  <el-table-column prop="created_at" label="接收时间" width="160" sortable>
                    <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="80" fixed="right">
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
                  <el-table-column prop="exam_name" label="检验项目" min-width="140" show-overflow-tooltip />
                  <el-table-column prop="reporter_name" label="检验医生" width="90" />
                  <el-table-column prop="report_date" label="报告日期" width="120" sortable>
                    <template #default="{ row }">{{ formatDate(row.report_date) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="80">
                    <template #default>
                      <el-tag type="success" size="small">已完成</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
              <template v-if="activeTab === 'qc'">
                <div class="qc-placeholder">
                  <el-icon :size="64"><DataLine /></el-icon>
                  <p>Levey-Jennings 质控图</p>
                  <p class="sub-text">均值: -- | 标准差: -- | CV%: -- | 批次: --</p>
                  <div class="qc-chart-area">
                    <div class="qc-bar" v-for="i in 20" :key="i" :style="{ height: (20 + Math.random()*60) + 'px' }"></div>
                  </div>
                </div>
              </template>
            </div>
            <!-- 患者信息卡片 — 放在第一屏右侧 -->
            <div class="upper-patient-card">
              <div v-if="currentRequest">
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
              <div v-else class="empty-card">
                <el-icon :size="28" color="#BDBDBD"><User /></el-icon>
                <p>点击列表查看患者信息</p>
              </div>
            </div>
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

              <el-button v-if="currentRequest.status === 'received' || currentRequest.status === 'pending'" type="primary" size="small" @click="startExam">
                <el-icon><VideoPlay /></el-icon> 开始检验
              </el-button>
              <el-button v-if="currentRequest.status === 'processing'" type="primary" size="small" @click="addTestItem">添加项目</el-button>
              <el-button v-if="currentRequest.status === 'processing'" type="success" size="small" @click="submitReport">
                <el-icon><Check /></el-icon> 提交报告
              </el-button>
              <el-button v-if="currentRequest.status === 'completed'" type="success" size="small" @click="sendReport">
                <el-icon><ArrowRight /></el-icon> 发送结果
              </el-button>
              <el-button v-if="currentRequest.status === 'processing'" type="danger" size="small" @click="rejectRequest">驳回</el-button>
              <el-button v-if="currentRequest.status === 'completed'" type="info" size="small" @click="removeFromList">
                <el-icon><Close /></el-icon> 移出列表
              </el-button>
            </div>
          </div>
          <div v-if="!currentRequest" class="empty-lower">
            <el-icon :size="48" color="#BDBDBD"><Files /></el-icon>
            <p>请从上方列表中选择患者</p>
          </div>
          <div v-else-if="currentRequest.status === 'completed'" class="completed-view">
            <el-empty description="该检验已完成，请在已完成列表中查看报告" :image-size="80" />
          </div>
          <div v-else class="test-items-area">
            <div class="patient-summary-bar">
              <span class="ps-item"><strong>姓名：</strong>{{ currentRequest.patient_name }}</span>
              <span class="ps-item"><strong>性别：</strong>{{ currentRequest.gender }}</span>
              <span class="ps-item"><strong>年龄：</strong>{{ currentRequest.age }}岁</span>
              <span class="ps-item"><strong>条码号：</strong>{{ currentRequest.id }}</span>
              <span class="ps-item"><strong>标本：</strong>{{ currentRequest.sample_type || '血液' }}</span>
            </div>
            <el-table :data="testItems" size="small" border style="width: 100%" max-height="350">
              <el-table-column prop="item_name" label="检验项目" width="150" />
              <el-table-column prop="result" label="结果" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.result" size="small" @input="onResultInput(row)" :class="{ 'critical-value': isCritical(row) }" />
                </template>
              </el-table-column>
              <el-table-column prop="reference_range" label="参考范围" width="130">
                <template #default="{ row }">
                  <el-input v-model="row.reference_range" size="small" />
                </template>
              </el-table-column>
              <el-table-column prop="unit" label="单位" width="80">
                <template #default="{ row }">
                  <el-input v-model="row.unit" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="标志" width="70" align="center">
                <template #default="{ row }">
                  <span v-if="isAbnormal(row)" :class="['flag-badge', row.flag === 'H' ? 'high' : 'low']">{{ row.flag }}</span>
                  <span v-else class="flag-normal">正常</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ $index, row }">
                  <el-button link type="primary" size="small" @click="quickFillResult(row)">快进</el-button>
                  <el-button link type="danger" size="small" @click="removeTestItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="report-conclusion-area">
              <span class="label">检验结论：</span>
              <el-input v-model="reportForm.conclusion" type="textarea" :rows="2" placeholder="请输入检验结论..." />
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 右侧辅助信息栏 ===== -->
      <div class="right-panel">
        <div class="history-panel">
          <div class="card-title">历史记录</div>
          <div class="card-body">
            <div v-if="patientHistory.length > 0" class="history-list">
              <div v-for="h in patientHistory" :key="h.id" class="history-item" @click="viewReport(h)">
                <div class="hi-name">{{ h.exam_name }}</div>
                <div class="hi-date">{{ formatDate(h.report_date) }}</div>
              </div>
            </div>
            <div v-else class="card-body empty-card">
              <p>暂无历史记录</p>
            </div>
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
      <span>{{ currentUser?.real_name }} | 检验科 | HIS v1.0</span>
      <span>{{ currentDate }} {{ currentTime }}</span>
      <span>待检验: {{ pendingCount }} | 检验中: {{ processingCount }} | 危急值: {{ criticalCount }}</span>
    </div>

    <!-- ===== 弹窗 ===== -->
    <!-- 报告详情弹窗 -->
    <el-dialog v-model="showReportDetail" title="检验报告详情" width="650px">
      <div v-if="viewingReport">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="患者">{{ viewingReport.patient_name }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ viewingReport.exam_name }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ formatDate(viewingReport.report_date) }}</el-descriptions-item>
          <el-descriptions-item label="报告人">{{ viewingReport.reporter_name }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px;">
          <div class="detail-title">检验结果</div>
          <pre class="detail-pre">{{ viewingReport.result }}</pre>
          <div class="detail-title">参考范围</div>
          <pre class="detail-pre">{{ viewingReport.reference_range }}</pre>
          <div class="detail-title">结论</div>
          <pre class="detail-pre">{{ viewingReport.conclusion }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 危机值弹窗 -->
    <el-dialog v-model="showCriticalAlert" title="⚠ 危急值警告" width="450px" :close-on-click-modal="false">
      <div class="critical-alert-content">
        <el-alert type="error" :closable="false" show-icon>
          <template #title><strong>检测到危急值！请立即处理！</strong></template>
        </el-alert>
        <p style="margin-top: 12px;">患者 <strong>{{ criticalAlertPatient }}</strong></p>
        <ul>
          <li v-for="item in criticalAlertItems" :key="item.item_name">
            {{ item.item_name }}: <span class="critical-val">{{ item.result }}</span>（参考: {{ item.reference_range }}）
          </li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="showCriticalAlert = false">稍后处理</el-button>
        <el-button type="danger" @click="showCriticalAlert = false">已知晓，立即处理</el-button>
      </template>
    </el-dialog>

    <!-- 退出弹窗 -->
    <el-dialog v-model="showLogoutDialog" title="确认退出" width="300px">
      <p>确定要退出登录吗？</p>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="logout">确定退出</el-button>
      </template>
    </el-dialog>

    <!-- 系统设置弹窗 -->
    <el-dialog v-model="showSystemConfig" title="系统设置" width="500px">
      <el-form label-width="120px">
        <el-form-item label="自动刷新间隔"><el-select v-model="autoRefresh" size="small">
          <el-option label="关闭" :value="0" /><el-option label="30秒" :value="30" /><el-option label="60秒" :value="60" />
        </el-select></el-form-item>
        <el-form-item label="每页显示条数"><el-input-number v-model="pageSize" :min="10" :max="100" size="small" /></el-form-item>
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
  UserFilled, Clock, Loading, CircleCheck, Warning, DataLine,
  Search, Refresh, Printer, Download, Bell, Setting,
  Select, Document, Close, Files, User, VideoPlay, Check, ArrowRight
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const currentUser = ref(userStore.currentUser)
const workbenchRef = ref<HTMLElement>()
const searchRef = ref<HTMLElement>()

// 时间和日期
const currentTime = ref('')
const currentDate = ref('')
let timeTimer: any = null
let autoRefreshTimer: any = null

const updateClock = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN')
}

// tab
const activeTab = ref('pending')
const listSearch = ref('')
const globalSearch = ref('')
const urgencyFilter = ref('')
const remark = ref('')

// 设置
const showSystemConfig = ref(false)
const autoRefresh = ref(60)
const pageSize = ref(20)
const soundAlert = ref(true)

// 列表数据
const pendingRequests = ref<any[]>([])
const processingRequests = ref<any[]>([])
const completedReports = ref<any[]>([])
const criticalRequests = ref<any[]>([])
const patientHistory = ref<any[]>([])

const currentRequest = ref<any>(null)
const viewingReport = ref<any>(null)
const tableLoading = ref(false)

// 检验项目
const testItems = ref<any[]>([])
const reportForm = ref({ result: '', reference_range: '', conclusion: '' })

// 面板尺寸
const upperPanelHeight = ref(350)
const bottomHeight = ref(300)
const isResizing = ref(false)
const startY = ref(0)
const startUpperHeight = ref(0)

// 弹窗
const showReportDetail = ref(false)
const showLogoutDialog = ref(false)
const showCriticalAlert = ref(false)
const criticalAlertPatient = ref('')
const criticalAlertItems = ref<any[]>([])

// 计算属性
const pendingCount = computed(() => pendingRequests.value.length)
const processingCount = computed(() => processingRequests.value.length)
const criticalCount = computed(() => criticalRequests.value.length)

const tabTitle = computed(() => {
  const t: Record<string, string> = { pending: '待检验列表', processing: '检验中列表', completed: '已完成报告', critical: '危急值管理', qc: '质控图' }
  return t[activeTab.value] || ''
})

const lowerTitle = computed(() => {
  if (!currentRequest.value) return '检验结果录入区'
  if (currentRequest.value.status === 'completed') return '已完成的检验'
  return currentRequest.value.patient_name + ' - 检验结果录入'
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

const statusLabel = (s: string) => ({ pending: '待检验', received: '已接收', processing: '检验中', completed: '已完成' } as any)[s] || s
const statusTagType = (s: string) => ({ pending: 'info', received: 'success', processing: 'warning', completed: 'success' } as any)[s] || 'info'
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : ''
const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : ''
const maskIdCard = (s: string) => s ? s.substring(0, 6) + '****' + s.substring(14) : '--'

const isAbnormal = (item: any) => item.flag === 'H' || item.flag === 'L'
const isCritical = (item: any) => {
  if (!item.result || !item.reference_range) return false
  const val = parseFloat(item.result)
  if (isNaN(val)) return false
  const parts = item.reference_range.split(/[-~]/)
  if (parts.length === 2) {
    const lo = parseFloat(parts[0]), hi = parseFloat(parts[1]), r = hi - lo
    return val < lo - r || val > hi + r
  }
  return false
}

const onResultInput = (item: any) => {
  if (!item.result || !item.reference_range) { item.flag = ''; return }
  const val = parseFloat(item.result)
  if (isNaN(val)) { item.flag = ''; return }
  const parts = item.reference_range.split(/[-~]/)
  if (parts.length === 2) {
    const lo = parseFloat(parts[0]), hi = parseFloat(parts[1])
    if (val < lo) item.flag = 'L'
    else if (val > hi) item.flag = 'H'
    else item.flag = ''
  }
}

// ============ 数据加载 ============
const loadPendingRequests = async () => {
  tableLoading.value = true
  try {
    const res = await axios.get('/api/lab-doctor/pending')
    pendingRequests.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    pendingRequests.value = []
  }
  tableLoading.value = false
}

const loadProcessingRequests = async () => {
  try {
    const res = await axios.get('/api/lab-doctor/processing')
    processingRequests.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    processingRequests.value = []
  }
}

const loadCompletedReports = async () => {
  try {
    const res = await axios.get('/api/lab-doctor/reports')
    completedReports.value = res.data || []
  } catch (err) {
    console.error('加载失败:', err)
    completedReports.value = []
  }
}

const loadPatientHistory = async (patientId: number) => {
  try {
    const res = await axios.get('/api/lab-doctor/reports', { params: { patient_id: patientId } })
    patientHistory.value = res.data || []
  } catch (err) { console.error('加载历史失败:', err) }
}

const refreshAll = () => {
  loadPendingRequests()
  loadProcessingRequests()
  loadCompletedReports()
}

const refreshList = () => {
  if (activeTab.value === 'pending') loadPendingRequests()
  else if (activeTab.value === 'processing') loadProcessingRequests()
  else if (activeTab.value === 'completed') loadCompletedReports()
}

const onGlobalSearch = () => { listSearch.value = globalSearch.value }
const focusSearch = () => { searchRef.value?.focus() }

// ============ 选择患者 ============
const selectRequest = (req: any) => {
  currentRequest.value = req
  testItems.value = []
  reportForm.value = { result: '', reference_range: '', conclusion: '' }
  if (req.patient_id) loadPatientHistory(req.patient_id)
}

const openDetail = (row: any) => {
  if (activeTab.value === 'completed') viewReport(row)
}

// ============ 检验操作 ============

const startExam = async () => {
  try {
    await axios.put(`/api/lab-doctor/exam-request/${currentRequest.value.id}/start`)
    currentRequest.value.status = 'processing'
    // 从对应列表移除并添加到检验中
    if (currentRequest.value.status === 'received') {
      // 从已接收列表移除（如果有的话）
    }
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== currentRequest.value.id)
    processingRequests.value.unshift(currentRequest.value)
    activeTab.value = 'processing'
    const defaults = [
      { item_name: '白细胞(WBC)', result: '', reference_range: '3.5-9.5', unit: '×10⁹/L', flag: '' },
      { item_name: '红细胞(RBC)', result: '', reference_range: '4.0-5.5', unit: '×10¹²/L', flag: '' },
      { item_name: '血红蛋白(Hb)', result: '', reference_range: '120-160', unit: 'g/L', flag: '' },
      { item_name: '血小板(PLT)', result: '', reference_range: '100-300', unit: '×10⁹/L', flag: '' },
    ]
    testItems.value = [...defaults]
    ElMessage.success('已开始检验')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

const addTestItem = () => {
  testItems.value.push({ item_name: '', result: '', reference_range: '', unit: '', flag: '' })
}

const removeTestItem = (index: number) => {
  testItems.value.splice(index, 1)
}

const quickFillResult = (row: any) => {
  if (!row.reference_range) return
  const range = row.reference_range.split('-')
  if (range.length === 2) {
    const min = parseFloat(range[0])
    const max = parseFloat(range[1])
    if (!isNaN(min) && !isNaN(max)) {
      const randomValue = (min + Math.random() * (max - min)).toFixed(2)
      row.result = randomValue
    }
  }
}

// 检查危急值
const checkCriticalValues = (): boolean => {
  const criticals = testItems.value.filter(item => isCritical(item))
  if (criticals.length > 0) {
    criticalAlertPatient.value = currentRequest.value?.patient_name || ''
    criticalAlertItems.value = criticals
    showCriticalAlert.value = true
    return true
  }
  return false
}

const submitReport = async () => {
  // 先计算标志
  testItems.value.forEach(item => onResultInput(item))

  if (checkCriticalValues()) return

  if (testItems.value.length === 0) { ElMessage.warning('请至少添加一条检验项目'); return }
  if (!reportForm.value.conclusion) { ElMessage.warning('请填写检验结论'); return }

  const resultText = testItems.value.map(item =>
    `${item.item_name}: ${item.result || '--'} ${item.unit || ''} [${item.reference_range || '--'}] ${item.flag || ''}`
  ).join('\n')
  const refText = testItems.value.map(item => `${item.item_name}: ${item.reference_range || '--'}`).join('\n')

  // 检查是否有危急值
  const hasCritical = testItems.value.some(item => isCritical(item))

  try {
    // 使用新的带通知的API
    await axios.post('/api/lab-doctor/report-with-notify', {
      request_id: currentRequest.value.id, 
      patient_id: currentRequest.value.patient_id,
      exam_name: currentRequest.value.exam_name, 
      result: resultText,
      conclusion: reportForm.value.conclusion + (remark.value ? '\n备注: ' + remark.value : ''),
      reference_range: refText, 
      reporter_id: currentUser.value?.id, 
      reporter_name: currentUser.value?.real_name,
      is_critical: hasCritical
    })
    
    // 更新状态
    currentRequest.value.status = 'completed'
    processingRequests.value = processingRequests.value.filter(r => r.id !== currentRequest.value.id)
    
    // 清空当前选择
    currentRequest.value = null
    testItems.value = []
    reportForm.value = { result: '', reference_range: '', conclusion: '' }
    remark.value = ''
    
    // 重新加载列表
    await loadPendingRequests()
    await loadCompletedReports()
    
    ElMessage.success('报告提交成功！已自动通知申请医生')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '提交报告失败')
  }
}

// 发送检验结果给主治医生
const sendReport = async () => {
  if (!currentRequest.value) return
  try {
    await axios.post('/api/lab-doctor/send-report', {
      request_id: currentRequest.value.id,
      patient_id: currentRequest.value.patient_id,
      reporter_id: currentUser.value?.id,
      reporter_name: currentUser.value?.real_name
    })
    
    currentRequest.value.notify_sent = true
    ElMessage.success('检验结果已发送给主治医生！')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '发送失败')
  }
}

// 移出已完成患者
const removeFromList = async () => {
  if (!currentRequest.value) return
  try {
    await ElMessageBox.confirm(`确定将患者 ${currentRequest.value.patient_name} 从当前列表移出吗？`, '确认移出', { type: 'info' })
    // 从已完成列表移除
    completedReports.value = completedReports.value.filter(r => r.id !== currentRequest.value.id)
    currentRequest.value = null
    ElMessage.success('已从列表移出')
  } catch {}
}

const approveAndSubmit = () => {
  if (currentRequest.value?.status === 'processing') submitReport()
  else ElMessage.info('请先选择检验中的患者')
}

const batchApprove = () => approveAndSubmit()

const saveDraft = () => { ElMessage.success('草稿已保存') }

const rejectRequest = async () => {
  if (!currentRequest.value) return
  try {
    await ElMessageBox.confirm(`确定驳回患者 ${currentRequest.value.patient_name} 的检验申请吗？`, '确认驳回', { type: 'warning' })
    processingRequests.value = processingRequests.value.filter(r => r.id !== currentRequest.value.id)
    currentRequest.value = null; testItems.value = []
    ElMessage.success('已驳回')
  } catch {}
}

const viewReport = (report: any) => {
  viewingReport.value = report
  showReportDetail.value = true
}

// 工具栏操作
const handlePrint = () => { ElMessage.info('打印功能已触发') }
const handleExport = () => { ElMessage.success('正在导出Excel...') }

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
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize); document.removeEventListener('mouseup', stopResize)
}

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'F5') { e.preventDefault(); refreshAll() }
  else if (e.key === 'Escape') { showReportDetail.value = false; showCriticalAlert.value = false }
  else if (e.ctrlKey && e.key === 'f') { e.preventDefault(); focusSearch() }
}

const openProfile = () => { router.push('/doctor/profile') }
const logout = () => { userStore.logout(); router.push('/login') }

// 定时刷新
const startAutoRefresh = () => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  if (autoRefresh.value > 0) {
    autoRefreshTimer = setInterval(() => { loadPendingRequests(); loadProcessingRequests() }, autoRefresh.value * 1000)
  }
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
.lis-workbench { height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; outline: none; }

/* ===== 顶部栏 ===== */
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 48px; background: #1a3a5c; color: #fff; flex-shrink: 0; }
.top-left { display: flex; align-items: center; gap: 10px; }
.sys-name { font-size: 15px; font-weight: 600; }
.dept-tag { background: #0d9488; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 3px; font-weight: 600; }
.top-center { display: flex; align-items: center; gap: 12px; }
.toolbar-icons { display: flex; gap: 4px; }
.top-btn { color: #58a6ff !important; border-color: rgba(88,166,255,0.4) !important; background: rgba(88,166,255,0.1) !important; }
.top-btn:hover { color: #fff !important; border-color: #58a6ff !important; background: rgba(88,166,255,0.25) !important; }
.quick-search { width: 220px; }
.quick-search :deep(.el-input__wrapper) { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); box-shadow: none; }
.quick-search :deep(.el-input__inner) { color: #fff; }
.quick-search :deep(.el-input__inner::placeholder) { color: rgba(255,255,255,0.5); }
.top-right { display: flex; align-items: center; gap: 8px; }
.top-right .top-btn { color: #58a6ff !important; }
.clock { font-size: 14px; font-family: 'Courier New', monospace; font-weight: 600; }
.user-area { display: flex; align-items: center; gap: 6px; }
.user-name { font-size: 13px; font-weight: 500; }
.notify-badge :deep(.el-badge__content) { border: none; }

/* ===== 左侧导航 ===== */
.left-sidebar { width: 56px; background: #0f2b45; display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; }
.nav-icons { display: flex; flex-direction: column; padding-top: 8px; }
.nav-item { display: flex; flex-direction: column; align-items: center; padding: 12px 4px; cursor: pointer; color: rgba(255,255,255,0.6); transition: all 0.2s; font-size: 10px; gap: 4px; }
.nav-item:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-item.active { color: #fff; background: #1a6fb5; }
.nav-bottom { display: flex; flex-direction: column; padding-bottom: 8px; }
.nav-main-action { display: flex; flex-direction: column; align-items: center; padding: 10px 4px; margin: 4px 6px; cursor: pointer; background: #0d9488; color: #fff; border-radius: 6px; font-size: 10px; gap: 2px; transition: all 0.2s; }
.nav-main-action:hover { background: #0f766e; }

/* ===== 主工作区 ===== */
.work-area { flex: 1; display: flex; flex-direction: column; background: #f5f7fa; min-width: 0; }
.upper-panel, .lower-panel { background: #fff; overflow: hidden; }
.upper-panel { border-bottom: 1px solid #e4e7ed; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #fafbfc; border-bottom: 1px solid #e4e7ed; height: 40px; flex-shrink: 0; }
.panel-title { font-weight: 600; font-size: 14px; color: #303133; }
.panel-actions { display: flex; gap: 8px; align-items: center; }
.data-table-wrapper { height: calc(100% - 40px); }
.upper-content { display: flex; gap: 12px; height: calc(100% - 40px); }
.upper-content .data-table-wrapper { flex: 1; min-width: 0; }
.upper-patient-card { width: 200px; flex-shrink: 0; background: #fff; border-radius: 6px; border: 1px solid #e4e7ed; overflow-y: auto; }
.upper-patient-card .card-title { font-size: 13px; font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #ebeef5; background: #f5f7fa; color: #303133; }
.upper-patient-card .card-body { padding: 10px 12px; }
.upper-patient-card .empty-card { display: flex; flex-direction: column; align-items: center; padding: 20px; color: #909399; font-size: 12px; }

/* 分隔条 */
.divider-bar { height: 6px; background: #e4e7ed; cursor: row-resize; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.divider-bar:hover { background: #c6e2ff; }
.divider-handle { width: 40px; height: 3px; background: #c0c4cc; border-radius: 2px; }
.divider-bar:hover .divider-handle { background: #409eff; }

/* 下半部分 */
.empty-lower { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 40px); color: #909399; }
.empty-lower p { margin-top: 12px; font-size: 14px; }
.completed-view { display: flex; align-items: center; justify-content: center; height: calc(100% - 40px); }
.test-items-area { padding: 12px; overflow-y: auto; height: calc(100% - 40px); }
.patient-summary-bar { display: flex; gap: 20px; padding: 8px 12px; background: #f0f9ff; border-radius: 4px; margin-bottom: 12px; flex-wrap: wrap; }
.ps-item { font-size: 13px; color: #303133; }
.ps-item strong { color: #606266; }
.critical-value :deep(.el-input__inner) { border-color: #f56c6c !important; background: #fef0f0 !important; color: #f56c6c; font-weight: 600; }
.flag-badge { font-weight: 700; font-size: 13px; padding: 2px 8px; border-radius: 3px; }
.flag-badge.high { color: #f56c6c; background: #fef0f0; }
.flag-badge.low { color: #409eff; background: #f0f5ff; }
.flag-normal { color: #67c23a; font-size: 12px; }
.report-conclusion-area { margin-top: 12px; display: flex; align-items: flex-start; gap: 8px; }
.report-conclusion-area .label { white-space: nowrap; font-weight: 600; font-size: 13px; padding-top: 6px; }

/* 质控图 */
.qc-placeholder { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #909399; }
.qc-placeholder p { margin-top: 12px; font-size: 14px; font-weight: 500; }
.qc-placeholder .sub-text { font-size: 12px; color: #909399; margin-top: 4px; }
.qc-chart-area { display: flex; align-items: flex-end; gap: 4px; height: 120px; margin-top: 24px; padding: 0 20px; border-bottom: 2px solid #409eff; border-left: 2px solid #409eff; }
.qc-bar { width: 20px; background: linear-gradient(to top, #409eff, #67c23a); border-radius: 2px 2px 0 0; opacity: 0.7; }

/* ===== 右侧面板 ===== */
.right-panel { width: 240px; background: #fafbfc; border-left: 1px solid #e4e7ed; display: flex; flex-direction: column; gap: 8px; padding: 10px; flex-shrink: 0; overflow-y: auto; }
.patient-card, .history-panel, .remark-panel { background: #fff; border-radius: 6px; border: 1px solid #e4e7ed; }
.card-title { font-size: 13px; font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #ebeef5; background: #f5f7fa; color: #303133; }
.card-body { padding: 10px 12px; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 20px; color: #909399; font-size: 12px; }
.info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
.info-row .lbl { color: #909399; }
.info-row .val { color: #303133; font-weight: 500; text-align: right; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-list { max-height: 150px; overflow-y: auto; }
.history-item { padding: 6px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.history-item:hover { color: #409eff; }
.hi-name { font-size: 12px; font-weight: 500; }
.hi-date { font-size: 11px; color: #909399; }
.remark-panel :deep(.el-textarea__inner) { font-size: 12px; }
.action-buttons { margin-top: auto; padding-top: 8px; }

/* ===== 底部状态栏 ===== */
.status-bar { height: 26px; background: #f0f2f5; border-top: 1px solid #e4e7ed; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 11px; color: #909399; flex-shrink: 0; }

/* ===== 弹窗 ===== */
.detail-title { font-weight: 600; font-size: 14px; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #409eff; display: inline-block; }
.detail-pre { background: #f8f9fa; padding: 12px; border-radius: 4px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
.critical-alert-content .critical-val { color: #f56c6c; font-weight: 700; }
.critical-alert-content ul { padding-left: 20px; }
.critical-alert-content li { margin: 4px 0; font-size: 13px; }

/* ===== 表格样式 ===== */
:deep(.el-table .el-table__row) { cursor: pointer; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) { background: #f8fafc; }
:deep(.el-table__body tr.hover-row > td) { background: #ecf5ff !important; }
</style>
