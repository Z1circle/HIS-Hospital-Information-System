<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>门诊缴费</span>
    </div>

    <div class="pc-layout">
      <!-- 左列：待缴费项目列表 -->
      <div class="left-col">
        <el-tabs v-model="activeTab" class="fee-tabs" @tab-change="detailItem = null">
          <el-tab-pane label="待缴费" name="unpaid" />
          <el-tab-pane label="已完成" name="paid" />
        </el-tabs>

        <div class="presc-list" v-loading="loading">
          <div v-if="activeTab === 'unpaid' && displayList.length > 0" class="select-header">
            <el-checkbox v-model="selectAll" @change="handleSelectAll">全选</el-checkbox>
            <el-button
              type="primary"
              size="small"
              :disabled="selectedItems.length === 0"
              @click="doBatchPay"
            >
              一键缴费 ({{ selectedItems.length }})
            </el-button>
          </div>

          <el-empty
            v-if="!loading && displayList.length === 0"
            :description="activeTab === 'unpaid' ? '暂无待缴费项目' : '暂无已缴费记录'"
            :image-size="80"
          />

          <div
            v-for="item in displayList"
            :key="item.id"
            :class="['presc-card', detailItem?.id === item.id ? 'selected' : '', { 'checked': selectedIds.includes(item.id) }]"
            @click="detailItem = item"
          >
            <div v-if="activeTab === 'unpaid'" class="checkbox-wrap">
              <el-checkbox
                :value="item.id"
                :checked="selectedIds.includes(item.id)"
                @change.stop="handleItemSelect(item.id)"
              />
            </div>
            <div class="presc-header">
              <span class="presc-no">{{ item.order_type === 'exam' ? '检验检查' : '处方' }} {{ item.order_no }}</span>
              <el-tag :type="getStatusTagType(item.payment_status)" size="small">
                {{ getStatusText(item.payment_status) }}
              </el-tag>
            </div>
            <div class="presc-meta">
              <span>申请科室：{{ item.department_name || '未知科室' }}</span>
              <span>{{ item.created_at?.slice(0,10) }}</span>
            </div>
            <div class="drug-brief">
              {{ item.items?.slice(0,2).map((d: any) => d.item_name).join('、') + (item.items?.length > 2 ? `等${item.items.length}种` : '') }}
            </div>
            <div class="presc-amount">
              合计：<b>¥ {{ parseFloat(item.total_amount).toFixed(2) }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- 右列：费用明细 & 支付 -->
      <div class="right-col">
        <!-- 未选中时的空状态 -->
        <div v-if="!detailItem" class="empty-detail">
          <div class="empty-icon">🧾</div>
          <p>选择左侧订单查看费用明细</p>
        </div>

        <div v-else class="detail-panel">
          <div class="detail-title">
            {{ detailItem.order_type === 'exam' ? '检验检查申请' : '处方' }} {{ detailItem.order_no }}
            <el-tag :type="getStatusTagType(detailItem.payment_status)" size="small">
              {{ getStatusText(detailItem.payment_status) }}
            </el-tag>
          </div>
          <div class="detail-meta">
            <span>申请科室：{{ detailItem.department_name || '未知科室' }}</span>
            <span>申请医生：{{ detailItem.doctor_name || '未知医生' }}</span>
            <span>申请时间：{{ detailItem.created_at?.slice(0,10) }}</span>
          </div>

          <!-- 项目明细表 -->
          <div class="drug-table">
            <div class="drug-table-head">
              <span class="col-name">项目名称</span>
              <span class="col-type">类型</span>
              <span class="col-qty">数量</span>
              <span class="col-price">单价</span>
              <span class="col-total">小计</span>
            </div>
            <div v-for="(item, idx) in detailItem.items" :key="idx" class="drug-table-row">
              <span class="col-name">{{ item.item_name }}</span>
              <span class="col-type">{{ item.exam_type === 'lab' ? '检验' : item.exam_type === 'imaging' ? '影像' : '药品' }}</span>
              <span class="col-qty">{{ item.quantity || 1 }}{{ item.unit || '次' }}</span>
              <span class="col-price">¥{{ Number(item.price).toFixed(2) }}</span>
              <span class="col-total">¥{{ Number(item.total).toFixed(2) }}</span>
            </div>
          </div>

          <!-- 费用汇总 -->
          <div class="fee-summary">
            <div class="fee-summary-row">
              <span>费用合计</span>
              <span>¥ {{ parseFloat(detailItem.total_amount).toFixed(2) }}</span>
            </div>
            <!-- 医保类型选择 -->
            <div v-if="detailItem.payment_status !== 'paid'" class="insurance-select">
              <span class="ins-label">医保类型：</span>
              <el-select v-model="insuranceType" size="small" style="width: 140px" @change="calculateInsurance(detailItem)">
                <el-option label="自费" value="self" />
                <el-option label="职工医保" value="employee" />
                <el-option label="居民医保" value="resident" />
                <el-option label="新农合" value="rural" />
              </el-select>
            </div>
            <div v-if="insuranceType !== 'self' && detailItem.insurance_amount" class="fee-summary-row green">
              <span>医保统筹支付（{{ insuranceRatio }}%）</span>
              <span>- ¥ {{ parseFloat(detailItem.insurance_amount).toFixed(2) }}</span>
            </div>
            <div v-if="insuranceType !== 'self'" class="fee-summary-row orange">
              <span>起付线扣除</span>
              <span>- ¥ {{ deductible.toFixed(2) }}</span>
            </div>
            <div class="fee-summary-divider"></div>
            <div class="fee-summary-row total">
              <span>个人实付</span>
              <span class="pay-amount">¥ {{ parseFloat(detailItem.self_amount || detailItem.total_amount).toFixed(2) }}</span>
            </div>
          </div>

          <!-- 支付方式 -->
          <div v-if="detailItem.payment_status !== 'paid'" class="pay-section">
            <div class="pay-method-title">支付方式</div>
            <div class="pay-options">
              <div
                v-for="opt in payOptions"
                :key="opt.value"
                :class="['pay-opt', payMethod === opt.value ? 'active' : '']"
                @click="payMethod = opt.value"
              >
                <span class="pay-icon">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </div>
            </div>
            <el-button
              type="primary"
              size="large"
              style="width:100%; margin-top:16px; height:48px; font-size:16px;"
              :loading="detailItem.paying"
              @click="doPay(detailItem)"
            >
              立即缴费 ¥{{ parseFloat(detailItem.self_amount || detailItem.total_amount).toFixed(2) }}
            </el-button>
          </div>

          <div v-else class="paid-badge">
            <span>✅ 已缴费完成</span>
            <div v-if="detailItem.transaction_no" class="transaction-info">
              交易号：{{ detailItem.transaction_no }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const { currentUser } = useUserStore()
const activeTab = ref('unpaid')
const loading = ref(false)
const prescriptions = ref<any[]>([])
const detailItem = ref<any>(null)
const payMethod = ref('wechat')
const insuranceType = ref('employee')
const insuranceRatio = ref(60)
const deductible = ref(0)

const selectAll = ref(false)
const selectedIds = ref<number[]>([])

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'paid': return 'success'
    case 'cancelled': return 'danger'
    default: return 'warning'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'paid': return '已缴费'
    case 'cancelled': return '已取消'
    default: return '待缴费'
  }
}

// 医保费率配置
const insuranceRates = {
  employee: { ratio: 70, deductible: 300, annualLimit: 50000 },
  resident: { ratio: 55, deductible: 500, annualLimit: 30000 },
  rural: { ratio: 45, deductible: 800, annualLimit: 20000 },
  self: { ratio: 0, deductible: 0, annualLimit: 0 }
}

const payOptions = [
  { value: 'wechat', label: '微信支付', icon: '💚' },
  { value: 'alipay', label: '支付宝', icon: '💙' },
  { value: 'medical', label: '医保卡', icon: '🏥' },
]

// 计算医保报销金额
const calculateInsurance = (item: any) => {
  const rates = insuranceRates[insuranceType.value as keyof typeof insuranceRates]
  insuranceRatio.value = rates.ratio
  deductible.value = rates.deductible

  if (insuranceType.value === 'self') {
    item.insurance_amount = 0
    item.self_amount = item.total_amount
  } else {
    const afterDeductible = Math.max(0, parseFloat(item.total_amount) - rates.deductible)
    item.insurance_amount = afterDeductible * rates.ratio / 100
    item.self_amount = parseFloat(item.total_amount) - item.insurance_amount
  }
}

const selectedItems = computed(() =>
  displayList.value.filter(item => selectedIds.value.includes(item.id))
)

const selectedTotal = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + parseFloat(item.total_amount), 0)
)

const handleSelectAll = (val: boolean) => {
  if (val) {
    selectedIds.value = displayList.value.map(item => item.id)
  } else {
    selectedIds.value = []
  }
}

const handleItemSelect = (id: number) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
  selectAll.value = selectedIds.value.length === displayList.value.length
}

const doBatchPay = async () => {
  try {
    const { value: paymentType } = await ElMessageBox.confirm(
      `确认支付选中的 ${selectedItems.value.length} 个订单，合计 ¥${selectedTotal.value.toFixed(2)}？\n\n请选择支付方式：`,
      '支付确认',
      {
        confirmButtonText: '微信支付',
        cancelButtonText: '支付宝',
        type: 'warning',
        showInput: true,
        inputPlaceholder: '输入"医保"使用医保卡支付，或直接点击按钮',
        inputValidator: (value: string) => {
          if (value === '医保') {
            return ''
          }
          return '输入"医保"可使用医保卡支付'
        }
      }
    )

    const payType = paymentType === '医保' ? 'medical' : (paymentType === '' ? 'wechat' : 'alipay')
    const patientId = currentUser.value?.patient_id || currentUser.value?.id

    for (const item of selectedItems.value) {
      item.paying = true
      try {
        if (item.order_type === 'exam') {
          await axios.post('/api/exam-request/pay', {
            request_id: item.source_id,
            patient_id: patientId,
            payment_method: payType
          })
        } else {
          await axios.post('/api/payment/pay', {
            presc_id: item.source_id,
            patient_id: patientId,
            payment_method: payType
          })
        }
        item.payment_status = 'paid'
      } catch {
        // 单个失败继续处理其他
      }
      item.paying = false
    }

    selectedIds.value = []
    selectAll.value = false
    ElMessage.success('批量缴费成功！')
    loadData()
  } catch {
    // 用户取消
  }
}

const displayList = computed(() =>
  prescriptions.value.filter(p =>
    activeTab.value === 'unpaid'
      ? p.payment_status === 'unpaid'
      : p.payment_status === 'paid' || p.payment_status === 'cancelled'
  )
)

const loadData = async () => {
  loading.value = true
  try {
    if (currentUser.value) {
      try {
        const userRes = await axios.get('/api/user/profile', { params: { userId: currentUser.value.id } })
        if (userRes.data) {
          const store = useUserStore()
          store.login(userRes.data.username, '')
        }
      } catch { /* 忽略错误 */ }
    }

    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    
    // 使用统一的缴费订单接口
    const ordersRes = await axios.get('/api/payment/orders', {
      params: { patient_id: patientId }
    })
    
    prescriptions.value = (ordersRes.data || []).map((order: any) => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    })).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch (err) {
    console.error('加载缴费数据失败:', err)
    prescriptions.value = []
  }
  loading.value = false
}

const doPay = async (item: any) => {
  try {
    const { value: paymentType } = await ElMessageBox.confirm(
      `确认支付订单 ${item.order_no}，金额 ¥${parseFloat(item.self_amount || item.total_amount).toFixed(2)}？\n\n请选择支付方式：`,
      '支付确认',
      {
        confirmButtonText: '微信支付',
        cancelButtonText: '支付宝',
        type: 'warning',
        showInput: true,
        inputPlaceholder: '输入"医保"使用医保卡支付，或直接点击按钮',
        inputValidator: (value: string) => {
          if (value === '医保') {
            return ''
          }
          return '输入"医保"可使用医保卡支付'
        }
      }
    )

    const payType = paymentType === '医保' ? 'medical' : (paymentType === '' ? 'wechat' : 'alipay')
    item.paying = true

    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    
    if (item.order_type === 'exam') {
      await axios.post('/api/exam-request/pay', {
        request_id: item.source_id,
        patient_id: patientId,
        payment_method: payType
      })
    } else {
      await axios.post('/api/payment/pay', {
        presc_id: item.source_id,
        patient_id: patientId,
        payment_method: payType
      })
    }
    
    item.payment_status = 'paid'
    item.paying = false
    ElMessage.success('缴费成功！')
    detailItem.value = { ...item }
    loadData()
  } catch (err: any) {
    if (err !== 'cancel') {
      item.paying = false
      ElMessage.error(err.response?.data?.error || '缴费失败，请重试')
    }
  }
}

onMounted(loadData)
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg);
  max-width: 960px;
  margin: 0 auto;
}

.nav-bar {
  background: white;
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 17px;
  font-weight: 600;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

/* PC双栏布局 */
.pc-layout {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 16px;
  padding: 20px 20px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout { grid-template-columns: 1fr; }
}

/* 左列 */
.fee-tabs { background: white; border-radius: 10px 10px 0 0; padding: 0 16px; }

.presc-list { margin-top: 2px; display: flex; flex-direction: column; gap: 10px; }

.presc-card {
  background: white;
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1.5px solid #F0F0F0;
  cursor: pointer;
  transition: all 0.15s;
}

.presc-card:hover { border-color: #90CAF9; box-shadow: 0 2px 8px rgba(30,136,229,0.1); }
.presc-card.selected { border-color: #1E88E5; background: #F0F7FF; }
.presc-card.checked { border-color: #4CAF50; background: #F1F8E9; }

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 4px;
}

.checkbox-wrap {
  position: absolute;
  top: 14px;
  left: 14px;
}

.presc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-left: 24px; }
.presc-no { font-size: 13px; color: #757575; font-family: monospace; }

.presc-meta { font-size: 12px; color: #9E9E9E; display: flex; justify-content: space-between; margin-bottom: 8px; }

.drug-brief { font-size: 13px; color: #424242; margin-bottom: 8px; }
.more-items { color: #1E88E5; font-size: 12px; }

.presc-amount { font-size: 13px; color: #757575; }
.presc-amount b { color: #E53935; font-size: 15px; }

/* 右列 */
.right-col { position: sticky; top: 72px; }

.empty-detail {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  border: 1px solid #F0F0F0;
  color: #BDBDBD;
}

.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-detail p { font-size: 14px; }

.detail-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #F0F0F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.detail-title {
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-meta { font-size: 12px; color: #9E9E9E; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; }

/* 药品表格 */
.drug-table { border: 1px solid #F0F0F0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }

.drug-table-head {
  display: grid;
  grid-template-columns: 1fr 60px 50px 60px 60px;
  padding: 8px 12px;
  background: #F5F7FA;
  font-size: 12px;
  color: #9E9E9E;
  font-weight: 600;
}

.drug-table-row {
  display: grid;
  grid-template-columns: 1fr 60px 50px 60px 60px;
  padding: 9px 12px;
  font-size: 13px;
  color: #424242;
  border-top: 1px solid #F5F5F5;
}

.col-qty, .col-price, .col-total { text-align: right; }
.col-type { text-align: center; color: #64748B; }

/* 检验检查详情 */
.exam-detail {
  margin: 16px 0;
  padding: 16px;
  background: #F5F7FA;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
}
.exam-info-row {
  display: flex;
  margin-bottom: 12px;
  font-size: 14px;
}
.exam-info-row:last-child { margin-bottom: 0; }
.exam-label {
  width: 100px;
  color: #616161;
  font-weight: 500;
  flex-shrink: 0;
}
.exam-value {
  flex: 1;
  color: #424242;
}

/* 费用汇总 */
.fee-summary { background: #FAFAFA; border-radius: 8px; padding: 14px; margin-bottom: 16px; }

.fee-summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #424242;
  padding: 5px 0;
}

.fee-summary-row.green { color: #43A047; }
.fee-summary-row.orange { color: #FB8C00; }
.insurance-select { display: flex; align-items: center; margin: 8px 0; }
.ins-label { font-size: 13px; color: #64748B; margin-right: 8px; }
.fee-summary-divider { border-top: 1px dashed #E0E0E0; margin: 8px 0; }
.fee-summary-row.total { font-weight: 600; font-size: 15px; }
.pay-amount { font-size: 22px; color: #E53935; font-weight: 700; }

/* 支付 */
.pay-section { border-top: 1px solid #F0F0F0; padding-top: 16px; }
.pay-method-title { font-size: 13px; color: #757575; margin-bottom: 10px; }

.pay-options { display: flex; gap: 10px; }

.pay-opt {
  flex: 1;
  border: 1.5px solid #E0E0E0;
  border-radius: 8px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  font-size: 12px;
  color: #424242;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pay-opt:hover { border-color: #90CAF9; }
.pay-opt.active { border-color: #1E88E5; background: #E3F2FD; color: #1E88E5; font-weight: 600; }
.pay-icon { font-size: 18px; }

.paid-badge {
  text-align: center;
  padding: 16px;
  color: #43A047;
  font-size: 15px;
  font-weight: 600;
  background: #F1F8E9;
  border-radius: 8px;
}

.transaction-info {
  margin-top: 8px;
  font-size: 12px;
  color: #66BB6A;
  font-weight: normal;
}
</style>
