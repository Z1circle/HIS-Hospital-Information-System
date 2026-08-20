<template>
  <div class="nurse-workbench">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="title-area">
        <el-icon :size="22"><Monitor /></el-icon>
        <span class="wb-title">门诊护士站</span>
        <el-tag type="success" size="small" style="margin-left:8px">在线</el-tag>
      </div>
      <div class="top-actions">
        <el-badge :value="pendingCount" :hidden="pendingCount === 0">
          <el-button size="small" type="primary">待审核 {{ pendingCount }}</el-button>
        </el-badge>
        <el-button size="small" type="danger" style="margin-left:10px" @click="logout">退出</el-button>
      </div>
    </div>

    <!-- 主 Tabs -->
    <el-tabs v-model="mainTab" class="main-tabs" @tab-change="onTabChange">
      <!-- Tab1: 医嘱审核 -->
      <el-tab-pane label="医嘱审核" name="review">
        <div class="tab-body">
          <div class="list-panel">
            <div class="list-header">
              <span class="list-title">待审核医嘱</span>
              <el-button size="small" @click="loadOrders">刷新</el-button>
            </div>
            <el-empty v-if="pendingOrders.length === 0" description="暂无待审核医嘱" :image-size="60" />
            <div
              v-for="o in pendingOrders"
              :key="o.id"
              :class="['order-card', selectedOrder?.id === o.id ? 'selected' : '']"
              @click="selectedOrder = o"
            >
              <div class="order-top">
                <span class="order-patient">{{ o.patient_name }}</span>
                <el-tag size="small" :type="o.priority === 'urgent' ? 'danger' : o.priority === 'high' ? 'warning' : 'info'">
                  {{ o.priority === 'urgent' ? '紧急' : o.priority === 'high' ? '优先' : '普通' }}
                </el-tag>
              </div>
              <div class="order-meta">
                <span>{{ o.doctor_name }} {{ o.doctor_title }}</span>
                <span>{{ formatTime(o.created_at) }}</span>
              </div>
              <div class="order-type">
                <el-tag size="small" effect="plain">{{ getTypeText(o.type) }}</el-tag>
              </div>
            </div>
          </div>

          <div class="detail-panel">
            <div v-if="!selectedOrder" class="no-select">
              <el-empty description="请从左侧选择医嘱" :image-size="80" />
            </div>
            <template v-else>
              <div class="detail-header">
                <div class="dh-info">
                  <span class="dh-patient">{{ selectedOrder.patient_name }}</span>
                  <el-tag size="small" :type="selectedOrder.priority === 'urgent' ? 'danger' : 'warning'">
                    {{ selectedOrder.priority === 'urgent' ? '紧急' : selectedOrder.priority === 'high' ? '优先' : '普通' }}
                  </el-tag>
                </div>
                <div class="dh-meta">
                  <span>开单医生：{{ selectedOrder.doctor_name }} {{ selectedOrder.doctor_title }}</span>
                  <span>时间：{{ formatTime(selectedOrder.created_at) }}</span>
                </div>
              </div>

              <div class="order-content">
                <div class="section-title">医嘱内容</div>
                <div class="content-text">{{ selectedOrder.content }}</div>
                <div class="section-title" style="margin-top:12px">医嘱类型</div>
                <el-tag size="small" effect="plain">{{ getTypeText(selectedOrder.type) }}</el-tag>
              </div>

              <div class="review-bar">
                <div class="review-note-label">审核意见</div>
                <el-input v-model="reviewNote" type="textarea" :rows="2" placeholder="请输入审核意见（选填）" />
                <div class="review-btns">
                  <el-button type="danger" @click="rejectOrder">驳回</el-button>
                  <el-button type="success" @click="approveOrder">审核通过</el-button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab2: 医嘱执行 -->
      <el-tab-pane label="医嘱执行" name="execute">
        <div class="tab-body">
          <div class="list-panel">
            <div class="list-header">
              <span class="list-title">待执行医嘱</span>
              <el-button size="small" @click="loadExecuteOrders">刷新</el-button>
            </div>
            <el-empty v-if="executeOrders.length === 0" description="暂无待执行医嘱" :image-size="60" />
            <div
              v-for="o in executeOrders"
              :key="o.id"
              :class="['order-card', executingOrder?.id === o.id ? 'selected' : '']"
              @click="executingOrder = o"
            >
              <div class="order-top">
                <span class="order-patient">{{ o.patient_name }}</span>
                <el-tag size="small" type="success">已审核</el-tag>
              </div>
              <div class="order-meta">
                <span>{{ o.doctor_name }}</span>
                <span>{{ formatTime(o.created_at) }}</span>
              </div>
              <div class="order-type">
                <el-tag size="small" effect="plain">{{ getTypeText(o.type) }}</el-tag>
              </div>
            </div>
          </div>

          <div class="detail-panel">
            <div v-if="!executingOrder" class="no-select">
              <el-empty description="请从左侧选择医嘱" :image-size="80" />
            </div>
            <template v-else>
              <div class="detail-header">
                <div class="dh-info">
                  <span class="dh-patient">{{ executingOrder.patient_name }}</span>
                  <el-tag size="small" type="success">待执行</el-tag>
                </div>
                <div class="dh-meta">
                  <span>开单医生：{{ executingOrder.doctor_name }}</span>
                  <span>审核护士：{{ executingOrder.nurse_name || '-' }}</span>
                </div>
              </div>

              <div class="order-content">
                <div class="section-title">医嘱内容</div>
                <div class="content-text">{{ executingOrder.content }}</div>
              </div>

              <div class="review-bar">
                <div class="review-note-label">执行备注</div>
                <el-input v-model="executeNote" type="textarea" :rows="2" placeholder="执行备注（选填）" />
                <div class="review-btns">
                  <el-button type="warning" @click="cancelExecuteOrder">取消医嘱</el-button>
                  <el-button type="primary" @click="confirmExecute">确认执行</el-button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab3: 医嘱查询 -->
      <el-tab-pane label="医嘱查询" name="query">
        <div class="query-panel">
          <div class="query-filters">
            <el-input v-model="queryPatient" placeholder="患者姓名" clearable style="width:160px" />
            <el-select v-model="queryStatus" placeholder="状态筛选" clearable style="width:130px">
              <el-option label="待审核" value="pending_review" />
              <el-option label="已审核" value="approved" />
              <el-option label="已执行" value="executed" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="loadQueryOrders">查询</el-button>
          </div>
          <el-table :data="queryOrders" border stripe size="small" style="width:100%">
            <el-table-column label="患者" prop="patient_name" width="100" />
            <el-table-column label="开单医生" prop="doctor_name" width="100" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ getTypeText(row.type) }}</template>
            </el-table-column>
            <el-table-column label="内容" prop="content" min-width="200" show-overflow-tooltip />
            <el-table-column label="优先级" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.priority === 'urgent' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'">
                  {{ row.priority === 'urgent' ? '紧急' : row.priority === 'high' ? '优先' : '普通' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="执行状态" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.execute_status === 'executed'" size="small" type="success">已执行</el-tag>
                <el-tag v-else-if="row.execute_status === 'pending'" size="small">待执行</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 取消医嘱弹窗 -->
    <el-dialog v-model="cancelVisible" title="取消医嘱" width="400px">
      <el-form label-width="80px">
        <el-form-item label="患者">
          <span>{{ cancelOrder?.patient_name }}</span>
        </el-form-item>
        <el-form-item label="医嘱内容">
          <span>{{ cancelOrder?.content }}</span>
        </el-form-item>
        <el-form-item label="取消原因" required>
          <el-input v-model="cancelReason" type="textarea" :rows="3" placeholder="请填写取消原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmCancel">确认取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser

const mainTab = ref('review')
const selectedOrder = ref<any>(null)
const executingOrder = ref<any>(null)
const reviewNote = ref('')
const executeNote = ref('')
const pendingOrders = ref<any[]>([])
const executeOrders = ref<any[]>([])
const queryOrders = ref<any[]>([])
const queryPatient = ref('')
const queryStatus = ref('')
const cancelVisible = ref(false)
const cancelOrder = ref<any>(null)
const cancelReason = ref('')

const pendingCount = computed(() => pendingOrders.value.length)

const logout = () => {
  userStore.logout()
  router.push('/login')
}

const onTabChange = () => {
  if (mainTab.value === 'review') loadOrders()
  else if (mainTab.value === 'execute') loadExecuteOrders()
  else if (mainTab.value === 'query') loadQueryOrders()
}

const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    drug: '药品医嘱', exam: '检查医嘱', lab: '检验医嘱',
    treatment: '治疗医嘱', nursing: '护理医嘱', other: '其他',
  }
  return map[type] || type
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_review: '待审核', approved: '已审核', rejected: '已驳回',
    executed: '已执行', cancelled: '已取消',
  }
  return map[status] || status
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending_review: 'warning', approved: 'primary', rejected: 'danger',
    executed: 'success', cancelled: 'info',
  }
  return map[status] || 'info'
}

const formatTime = (t: string) => {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const loadOrders = async () => {
  try {
    const res = await axios.get('/api/nurse/orders', { params: { status: 'pending_review' } })
    pendingOrders.value = res.data || []
  } catch { /* empty */ }
}

const loadExecuteOrders = async () => {
  try {
    const res = await axios.get('/api/nurse/orders', { params: { status: 'approved' } })
    executeOrders.value = res.data || []
  } catch { /* empty */ }
}

const loadQueryOrders = async () => {
  try {
    const params: any = {}
    if (queryPatient.value) params.patient_id = queryPatient.value
    if (queryStatus.value) params.status = queryStatus.value
    const res = await axios.get('/api/nurse/orders', { params })
    queryOrders.value = res.data || []
  } catch { /* empty */ }
}

const approveOrder = async () => {
  if (!selectedOrder.value) return
  try {
    await axios.post(`/api/nurse/orders/${selectedOrder.value.id}/review`, {
      approved: true,
      nurse_id: currentUser.value?.id,
      remark: reviewNote.value,
    })
    ElMessage.success('审核通过')
    reviewNote.value = ''
    selectedOrder.value = null
    loadOrders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '审核失败')
  }
}

const rejectOrder = async () => {
  if (!selectedOrder.value) return
  if (!reviewNote.value.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  try {
    await axios.post(`/api/nurse/orders/${selectedOrder.value.id}/review`, {
      approved: false,
      nurse_id: currentUser.value?.id,
      remark: reviewNote.value,
    })
    ElMessage.success('已驳回')
    reviewNote.value = ''
    selectedOrder.value = null
    loadOrders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

const confirmExecute = async () => {
  if (!executingOrder.value) return
  try {
    await axios.post(`/api/nurse/orders/${executingOrder.value.id}/execute`, {
      nurse_id: currentUser.value?.id,
    })
    ElMessage.success('医嘱已执行')
    executeNote.value = ''
    executingOrder.value = null
    loadExecuteOrders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '执行失败')
  }
}

const cancelExecuteOrder = (order?: any) => {
  cancelOrder.value = order || executingOrder.value
  cancelReason.value = ''
  cancelVisible.value = true
}

const confirmCancel = async () => {
  if (!cancelOrder.value) return
  if (!cancelReason.value.trim()) {
    ElMessage.warning('请填写取消原因')
    return
  }
  try {
    await axios.post(`/api/nurse/orders/${cancelOrder.value.id}/cancel`, { reason: cancelReason.value })
    ElMessage.success('医嘱已取消')
    cancelVisible.value = false
    cancelReason.value = ''
    cancelOrder.value = null
    executingOrder.value = null
    loadExecuteOrders()
    loadOrders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '取消失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.nurse-workbench {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}
.title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wb-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.main-tabs {
  padding: 0 20px;
  background: #fff;
  margin: 12px 16px;
  border-radius: 8px;
}
.tab-body {
  display: flex;
  gap: 16px;
  min-height: 500px;
}
.list-panel {
  width: 320px;
  border-right: 1px solid #ebeef5;
  padding-right: 16px;
  overflow-y: auto;
  max-height: 600px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.list-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.order-card {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.order-card:hover {
  border-color: #409eff;
  background: #f5f7fa;
}
.order-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.order-patient {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.order-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}
.order-type {
  display: flex;
  gap: 4px;
}
.detail-panel {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
.no-select {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}
.detail-header {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.dh-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dh-patient {
  font-size: 16px;
  font-weight: 600;
}
.dh-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #909399;
}
.order-content {
  margin-bottom: 16px;
}
.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}
.content-text {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}
.review-bar {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}
.review-note-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.review-btns {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}
.query-panel {
  padding: 16px 0;
}
.query-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
</style>
