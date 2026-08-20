<template>
  <div class="charge-manage">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="收费记录" name="list" />
      <el-tab-pane label="门诊退费" name="refund" />
      <el-tab-pane label="日结管理" name="daily" />
    </el-tabs>

    <!-- 收费记录 -->
    <div v-show="activeTab === 'list'" class="tab-content">
      <div class="toolbar">
        <el-date-picker v-model="filterDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:160px" />
        <el-input v-model="filterPatient" placeholder="患者姓名" clearable style="width:160px" />
        <el-button type="primary" @click="loadCharges">查询</el-button>
      </div>
      <el-table :data="chargeList" border stripe size="small">
        <el-table-column label="收费单号" prop="receipt_no" width="160" />
        <el-table-column label="患者" prop="patient_name" width="100" />
        <el-table-column label="医生" prop="doctor_name" width="100" />
        <el-table-column label="总金额" width="110">
          <template #default="{ row }">¥{{ Number(row.total_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="医保支付" width="110">
          <template #default="{ row }">¥{{ Number(row.insurance_amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="个人支付" width="110">
          <template #default="{ row }">¥{{ Number(row.patient_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="支付方式" prop="payment_method" width="90">
          <template #default="{ row }">
            {{ row.payment_method === 'cash' ? '现金' : row.payment_method === 'card' ? '刷卡' : '微信/支付宝' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'refunded' ? 'danger' : 'warning'" size="small">
              {{ row.status === 'completed' ? '已完成' : row.status === 'refunded' ? '已退费' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16) }}</template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 门诊退费 -->
    <div v-show="activeTab === 'refund'" class="tab-content">
      <div class="toolbar">
        <el-input v-model="refundSearch" placeholder="搜索收费单号或患者" style="width:240px" />
        <el-button type="primary" @click="loadRefundable">查询</el-button>
      </div>
      <el-table :data="refundableList" border stripe size="small">
        <el-table-column label="收费单号" prop="receipt_no" width="160" />
        <el-table-column label="患者" prop="patient_name" width="100" />
        <el-table-column label="总金额" width="110">
          <template #default="{ row }">¥{{ Number(row.total_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="个人支付" width="110">
          <template #default="{ row }">¥{{ Number(row.patient_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">
              {{ row.status === 'completed' ? '已完成' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="row.status === 'completed'" size="small" type="danger" @click="openRefund(row)">退费</el-button>
            <span v-else style="color:#999">已退费</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 日结管理 -->
    <div v-show="activeTab === 'daily'" class="tab-content">
      <div class="toolbar">
        <el-button type="primary" @click="doDailyClose">执行日结</el-button>
        <el-button @click="loadDailyCloses">刷新</el-button>
      </div>
      <el-table :data="dailyCloses" border stripe size="small">
        <el-table-column label="日结日期" prop="close_date" width="120" />
        <el-table-column label="总收入" width="120">
          <template #default="{ row }">¥{{ Number(row.total_income).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="现金" width="100">
          <template #default="{ row }">¥{{ Number(row.cash_amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="医保" width="100">
          <template #default="{ row }">¥{{ Number(row.insurance_amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="挂号数" prop="registration_count" width="90" />
        <el-table-column label="处方数" prop="prescription_count" width="90" />
        <el-table-column label="操作员" prop="operator" width="100" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16) }}</template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 退费弹窗 -->
    <el-dialog v-model="refundVisible" title="门诊退费" width="400px">
      <div v-if="refundTarget">
        <p>收费单号：<b>{{ refundTarget.receipt_no }}</b></p>
        <p>患者：{{ refundTarget.patient_name }}</p>
        <p>退费金额：<b style="color:#E53935">¥{{ Number(refundTarget.patient_amount).toFixed(2) }}</b></p>
        <el-form-item label="退费原因" style="margin-top:12px">
          <el-input v-model="refundReason" type="textarea" :rows="3" placeholder="请填写退费原因" />
        </el-form-item>
      </div>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRefund">确认退费</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('list')
const filterDate = ref('')
const filterPatient = ref('')
const chargeList = ref<any[]>([])
const refundableList = ref<any[]>([])
const refundSearch = ref('')
const dailyCloses = ref<any[]>([])
const refundVisible = ref(false)
const refundTarget = ref<any>(null)
const refundReason = ref('')

const loadCharges = async () => {
  try {
    const params: any = {}
    if (filterDate.value) params.date = filterDate.value
    const res = await axios.get('/api/charge/list', { params })
    chargeList.value = res.data.rows || res.data || []
  } catch (error) {
    ElMessage.error('加载收费记录失败')
    console.error('加载收费记录失败:', error)
  }
}

const loadRefundable = async () => {
  try {
    const res = await axios.get('/api/charge/list', { params: { date: new Date().toISOString().split('T')[0] } })
    refundableList.value = (res.data.rows || res.data || []).filter((c: any) => c.status === 'completed')
  } catch (error) {
    ElMessage.error('加载可退费记录失败')
    console.error('加载可退费记录失败:', error)
  }
}

const loadDailyCloses = async () => {
  try {
    const res = await axios.get('/api/charge/daily-close')
    dailyCloses.value = res.data || []
  } catch (error) {
    ElMessage.error('加载日结记录失败')
    console.error('加载日结记录失败:', error)
  }
}

const openRefund = (row: any) => {
  refundTarget.value = row
  refundReason.value = ''
  refundVisible.value = true
}

const confirmRefund = async () => {
  if (!refundReason.value.trim()) {
    ElMessage.warning('请填写退费原因')
    return
  }
  try {
    await axios.post('/api/charge/refund', {
      charge_id: refundTarget.value.id,
      reason: refundReason.value,
      operator: 'admin',
    })
    ElMessage.success('退费成功')
    refundVisible.value = false
    loadCharges()
    loadRefundable()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '退费失败')
  }
}

const doDailyClose = async () => {
  try {
    await ElMessageBox.confirm('确认执行今日日结？', '提示', { type: 'warning' })
    await axios.post('/api/charge/daily-close', {
      close_date: new Date().toISOString().split('T')[0],
      operator: 'admin',
    })
    ElMessage.success('日结完成')
    loadDailyCloses()
  } catch { /* cancelled */ }
}

onMounted(() => {
  loadCharges()
  loadDailyCloses()
})
</script>

<style scoped>
.charge-manage { padding: 0; }
.tab-content { padding: 16px 0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>
