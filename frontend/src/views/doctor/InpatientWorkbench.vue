<template>
  <div class="inpatient-wb">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="doctor-info">
        <el-icon :size="20"><UserFilled /></el-icon>
        <span class="doctor-name">{{ currentUser?.real_name }}（{{ currentUser?.department_name || '未分配科室' }} - {{ currentUser?.title || '医师' }}）</span>
      </div>
      <div class="top-actions">
        <el-button size="small" @click="$router.push('/doctor/outpatient')">切换门诊工作台</el-button>
        <el-button size="small" type="danger" @click="showLogoutDialog = true">退出</el-button>
      </div>
    </div>

    <div class="main-layout">
      <!-- 左侧床位列表 -->
      <div class="bed-panel">
        <div class="panel-header">
          <span class="panel-title">床位总览</span>
          <el-select v-model="selectedWard" size="small" style="width:120px" @change="loadBeds(selectedWard)">
            <el-option label="呼吸科病区" value="呼吸科病区" />
            <el-option label="心内科病区" value="心内科病区" />
            <el-option label="外科病区" value="外科病区" />
          </el-select>
        </div>

        <div class="bed-stats">
          <div class="stat-item">
            <div class="stat-num">{{ beds.filter(b => b.status === 'occupied').length }}</div>
            <div class="stat-label">在院</div>
          </div>
          <div class="stat-item">
            <div class="stat-num empty">{{ beds.filter(b => b.status === 'empty').length }}</div>
            <div class="stat-label">空床</div>
          </div>
          <div class="stat-item">
            <div class="stat-num warn">{{ beds.filter(b => b.status === 'reserved').length }}</div>
            <div class="stat-label">预留</div>
          </div>
        </div>

        <div class="bed-grid">
          <div
            v-for="bed in beds"
            :key="bed.id"
            :class="['bed-card', bed.status, currentBed?.id === bed.id ? 'selected' : '']"
            @click="selectBed(bed)"
          >
            <div class="bed-no">{{ bed.bed_no }}床</div>
            <div v-if="bed.patient_name" class="bed-patient">
              <div class="bed-name">{{ bed.patient_name }}</div>
              <div class="bed-meta">{{ bed.gender }} {{ bed.age }}岁</div>
            </div>
            <div v-else class="bed-empty-label">空床</div>
            <el-tag v-if="bed.allergy" type="danger" size="small" class="bed-allergy">过敏</el-tag>
          </div>
        </div>
      </div>

      <!-- 右侧患者详情 -->
      <div class="detail-area">
        <div v-if="!currentBed || currentBed.status === 'empty'" class="no-patient">
          <el-empty description="请从左侧选择在院患者" />
        </div>
        <template v-else>
          <!-- 患者基本信息卡 -->
          <div class="patient-header">
            <div class="ph-basic">
              <el-icon :size="22"><Avatar /></el-icon>
              <span class="ph-name">{{ currentBed.patient_name }}</span>
              <span class="ph-meta">{{ currentBed.gender }} {{ currentBed.age }}岁</span>
              <el-tag v-if="currentBed.allergy" type="danger" size="small">⚠️ 过敏：{{ currentBed.allergy }}</el-tag>
              <el-tag type="info" size="small">{{ currentBed.ward }} {{ currentBed.bed_no }}床</el-tag>
            </div>
            <div class="ph-right">
              <span class="ph-admit">入院：{{ currentBed.admit_date }}</span>
              <el-button size="small" type="primary" @click="orderVisible = true">开具长期医嘱</el-button>
              <el-button size="small" type="warning" @click="dischargeVisible = true">办理出院</el-button>
            </div>
          </div>

          <!-- 功能 Tabs -->
          <el-tabs v-model="activeTab" class="detail-tabs">
            <!-- Tab1: 住院病历 -->
            <el-tab-pane label="住院病历" name="record">
              <div class="tab-content">
                <div class="form-row">
                  <div class="field-label req">入院诊断</div>
                  <el-input v-model="inRecord.admission_diag" placeholder="请填写入院诊断" />
                </div>
                <div class="form-row">
                  <div class="field-label req">主诉</div>
                  <el-input v-model="inRecord.chief" type="textarea" :rows="2" placeholder="主要症状及持续时间" />
                </div>
                <div class="form-row">
                  <div class="field-label">现病史</div>
                  <el-input v-model="inRecord.history" type="textarea" :rows="4" placeholder="现病史详细描述" />
                </div>
                <div class="form-row">
                  <div class="field-label">既往史</div>
                  <el-input v-model="inRecord.past" type="textarea" :rows="2" placeholder="既往疾病及手术史" />
                </div>
                <div class="form-row">
                  <div class="field-label">体格检查</div>
                  <el-input v-model="inRecord.physical" type="textarea" :rows="3" placeholder="T:℃ P:次/分 R:次/分 BP:mmHg" />
                </div>
                <div class="form-row">
                  <div class="field-label">治疗计划</div>
                  <el-input v-model="inRecord.plan" type="textarea" :rows="3" placeholder="治疗方案及用药计划" />
                </div>
                <div class="save-bar">
                  <el-button type="primary" @click="saveInRecord">保存病历</el-button>
                </div>
              </div>
            </el-tab-pane>

            <!-- Tab2: 长期医嘱 -->
            <el-tab-pane label="长期医嘱" name="long-order">
              <div class="tab-content">
                <div class="order-section">
                  <div class="section-title">当前长期医嘱</div>
                  <el-empty v-if="longOrders.length === 0" description="暂无长期医嘱" :image-size="50" />
                  <div v-for="(o, i) in longOrders" :key="i" class="order-item">
                    <div class="order-name">{{ o.item_name }}</div>
                    <div class="order-meta">{{ o.dosage }} {{ o.frequency }} × {{ o.days }}天</div>
                    <el-button size="small" type="danger" text @click="longOrders.splice(i, 1)">停用</el-button>
                  </div>
                </div>
                <div class="add-order-bar">
                  <el-button type="primary" size="small" @click="orderVisible = true">+ 新增医嘱</el-button>
                </div>
              </div>
            </el-tab-pane>

            <!-- Tab3: 临时医嘱 -->
            <el-tab-pane label="临时医嘱" name="temp-order">
              <div class="tab-content">
                <div class="order-section">
                  <div class="section-title">临时医嘱记录</div>
                  <el-empty v-if="tempOrders.length === 0" description="暂无临时医嘱" :image-size="50" />
                  <div v-for="(o, i) in tempOrders" :key="i" class="order-item">
                    <div class="order-name">{{ o.item_name }}</div>
                    <div class="order-meta">{{ o.dosage }} {{ o.frequency }}</div>
                    <el-tag size="small" type="success">已执行</el-tag>
                  </div>
                </div>
                <div class="add-order-bar">
                  <el-button type="warning" size="small" @click="tempOrderVisible = true">+ 临时医嘱</el-button>
                </div>
              </div>
            </el-tab-pane>

            <!-- Tab4: 护理记录 -->
            <el-tab-pane label="护理记录" name="nursing">
              <div class="tab-content">
                <div v-for="(n, i) in nursingRecords" :key="i" class="nursing-row">
                  <div class="nursing-time">{{ n.time }}</div>
                  <div class="nursing-content">{{ n.content }}</div>
                  <div class="nursing-nurse">{{ n.nurse }}</div>
                </div>
                <el-empty v-if="nursingRecords.length === 0" description="暂无护理记录" :image-size="50" />
              </div>
            </el-tab-pane>

            <!-- Tab5: 检查检验 -->
            <el-tab-pane label="检查检验" name="exam">
              <div class="tab-content">
                <div class="exam-bar">
                  <el-button size="small" type="primary" @click="examVisible = true">开具检查单</el-button>
                </div>
                <el-table :data="examOrders" size="small" border style="margin-top:8px">
                  <el-table-column label="项目" prop="name" />
                  <el-table-column label="申请时间" prop="time" width="160" />
                  <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'done' ? 'success' : 'warning'" size="small">
                        {{ row.status === 'done' ? '已出结果' : '待检查' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="结果" prop="result" />
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </template>
      </div>
    </div>

    <!-- 开具医嘱弹窗 -->
    <el-dialog v-model="orderVisible" title="开具长期医嘱" width="500px">
      <div class="drug-search-bar">
        <el-input
          v-model="orderDrugKeyword"
          placeholder="输入药品名称搜索"
          @input="onOrderDrugSearch"
          clearable
        />
      </div>
      <div v-if="orderDrugResults.length > 0" class="drug-results">
        <div
          v-for="d in orderDrugResults"
          :key="d.id"
          class="drug-row"
          @click="selectOrderDrug(d)"
        >
          <span class="d-name">{{ d.name }}</span>
          <span class="d-spec">{{ d.specification }}</span>
          <span class="d-price">¥{{ d.price }}</span>
          <el-tag v-if="d.need_skin_test" type="danger" size="small">皮试</el-tag>
        </div>
      </div>
      <el-form v-if="selectedOrderDrug" :model="orderForm" label-width="70px" style="margin-top:12px">
        <el-form-item label="药品">
          <el-tag>{{ selectedOrderDrug.name }} {{ selectedOrderDrug.specification }}</el-tag>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="orderForm.quantity" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="用法">
          <el-select v-model="orderForm.dosage" style="width:120px">
            <el-option label="口服" value="口服" />
            <el-option label="静脉滴注" value="静脉滴注" />
            <el-option label="肌肉注射" value="肌肉注射" />
          </el-select>
        </el-form-item>
        <el-form-item label="频次">
          <el-select v-model="orderForm.frequency" style="width:140px">
            <el-option label="qd(每日1次)" value="qd" />
            <el-option label="bid(每日2次)" value="bid" />
            <el-option label="tid(每日3次)" value="tid" />
          </el-select>
        </el-form-item>
        <el-form-item label="天数">
          <el-input-number v-model="orderForm.days" :min="1" :max="30" />天
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="orderVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedOrderDrug" @click="confirmAddLongOrder">确认开具</el-button>
      </template>
    </el-dialog>

    <!-- 开具检查单弹窗 -->
    <el-dialog v-model="examVisible" title="开具检查申请" width="420px">
      <el-form :model="examForm" label-width="80px">
        <el-form-item label="检查项目">
          <el-select v-model="examForm.name" placeholder="请选择检查项目">
            <el-option label="血常规" value="血常规" />
            <el-option label="尿常规" value="尿常规" />
            <el-option label="胸部CT" value="胸部CT" />
            <el-option label="心电图" value="心电图" />
            <el-option label="肝功能" value="肝功能" />
            <el-option label="肾功能" value="肾功能" />
            <el-option label="血糖" value="血糖" />
            <el-option label="血脂" value="血脂" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="examForm.note" placeholder="备注说明" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="examVisible = false">取消</el-button>
        <el-button type="primary" @click="submitExam">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 临时医嘱弹窗 -->
    <el-dialog v-model="tempOrderVisible" title="开具临时医嘱" width="420px">
      <el-form :model="tempOrderForm" label-width="70px">
        <el-form-item label="医嘱内容">
          <el-input v-model="tempOrderForm.item_name" placeholder="填写药品或处置名称" />
        </el-form-item>
        <el-form-item label="用法">
          <el-input v-model="tempOrderForm.dosage" placeholder="如：静脉滴注" />
        </el-form-item>
        <el-form-item label="执行时间">
          <el-select v-model="tempOrderForm.frequency">
            <el-option label="立即执行" value="st" />
            <el-option label="需要时" value="prn" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tempOrderVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTempOrder">提交</el-button>
      </template>
    </el-dialog>

    <!-- 出院弹窗 -->
    <el-dialog v-model="dischargeVisible" title="办理出院" width="360px">
      <el-form :model="dischargeForm" label-width="80px">
        <el-form-item label="出院诊断">
          <el-input v-model="dischargeForm.diagnosis" placeholder="填写最终诊断" />
        </el-form-item>
        <el-form-item label="出院小结">
          <el-input v-model="dischargeForm.summary" type="textarea" :rows="3" placeholder="治疗情况及出院医嘱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dischargeVisible = false">取消</el-button>
        <el-button type="primary" type-color="danger" @click="confirmDischarge">确认出院</el-button>
      </template>
    </el-dialog>

    <!-- 退出登录确认弹窗 -->
    <el-dialog v-model="showLogoutDialog" title="确认退出" width="320px" :close-on-click-modal="false">
      <div class="logout-dialog-content">
        <el-icon :size="48" color="#F56C6C" style="margin-bottom:16px"><SwitchButton /></el-icon>
        <p>确定要退出系统吗？</p>
        <p class="logout-hint">退出后需要重新登录才能继续操作</p>
      </div>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="logout">确定退出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useHisStore, type PrescItem, type BedInfo } from '@/stores/his'
import { ElMessage } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser
const his = useHisStore()
const { beds } = his

const selectedWard = ref('呼吸科病区')
const activeTab = ref('record')
const currentBed = ref<BedInfo | null>(null)
const longOrders = ref<PrescItem[]>([])
const tempOrders = ref<PrescItem[]>([])
const orderVisible = ref(false)
const examVisible = ref(false)
const tempOrderVisible = ref(false)
const dischargeVisible = ref(false)

// 住院病历表单
const inRecord = ref({
  admission_diag: '',
  chief: '',
  history: '',
  past: '',
  physical: 'T:  ℃  P:  次/分  R:  次/分  BP:  mmHg',
  plan: '',
})

// 医嘱药品搜索
const orderDrugKeyword = ref('')
const orderDrugResults = ref<any[]>([])
const selectedOrderDrug = ref<any>(null)
const orderForm = ref({ quantity: 1, dosage: '口服', frequency: 'bid', days: 7 })

// 检查申请
const examOrders = ref([
  { name: '血常规', time: '2026-06-14 08:30', status: 'done', result: 'WBC 8.5×10⁹/L' },
  { name: '胸部CT', time: '2026-06-14 09:00', status: 'pending', result: '' },
])
const examForm = ref({ name: '', note: '' })

// 临时医嘱
const tempOrderForm = ref({ item_name: '', dosage: '', frequency: 'st' })

// 出院
const dischargeForm = ref({ diagnosis: '', summary: '' })

// 护理记录 mock
const nursingRecords = ref([
  { time: '08:00', content: '测量生命体征，T:37.2℃，P:76次/分，BP:125/82mmHg', nurse: '李护士' },
  { time: '10:00', content: '遵医嘱静脉输液，巡视病房', nurse: '张护士' },
  { time: '14:00', content: '患者诉头晕，通知值班医生', nurse: '李护士' },
])

const selectBed = (bed: BedInfo) => {
  currentBed.value = bed
  if (bed.patient_name) {
    // 加载该患者数据（mock）
    inRecord.value = {
      admission_diag: '2型糖尿病合并肺部感染',
      chief: '发热伴咳嗽3天，血糖控制不佳',
      history: '患者3天前出现发热，体温最高39℃，伴咳嗽咳痰。',
      past: '2型糖尿病病史5年，口服二甲双胍控制。',
      physical: 'T: 38.5℃  P: 88次/分  R: 20次/分  BP: 135/85mmHg',
      plan: '抗感染治疗，血糖控制，营养支持。',
    }
  }
}

let searchTimer: ReturnType<typeof setTimeout>
const onOrderDrugSearch = (val: string) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!val.trim()) { orderDrugResults.value = []; return }
    await his.searchDrugs(val)
    orderDrugResults.value = his.drugSearchResults.value
  }, 300)
}

const selectOrderDrug = (d: any) => {
  selectedOrderDrug.value = d
  orderDrugResults.value = []
  orderDrugKeyword.value = d.name
}

const confirmAddLongOrder = () => {
  if (!selectedOrderDrug.value) return
  const item: PrescItem = {
    drug_id: selectedOrderDrug.value.id,
    item_name: selectedOrderDrug.value.name,
    quantity: orderForm.value.quantity,
    unit: '盒',
    price: selectedOrderDrug.value.price,
    dosage: orderForm.value.dosage,
    frequency: orderForm.value.frequency,
    days: orderForm.value.days,
    need_skin_test: selectedOrderDrug.value.need_skin_test,
  }
  longOrders.value.push(item)
  orderVisible.value = false
  selectedOrderDrug.value = null
  orderDrugKeyword.value = ''
  ElMessage.success(`长期医嘱已开具：${item.item_name}`)
}

const submitExam = () => {
  if (!examForm.value.name) { ElMessage.warning('请选择检查项目'); return }
  examOrders.value.push({
    name: examForm.value.name,
    time: new Date().toLocaleString(),
    status: 'pending',
    result: '',
  })
  examVisible.value = false
  examForm.value = { name: '', note: '' }
  ElMessage.success('检查申请已提交')
}

const submitTempOrder = () => {
  if (!tempOrderForm.value.item_name) { ElMessage.warning('请填写医嘱内容'); return }
  tempOrders.value.push({
    item_name: tempOrderForm.value.item_name,
    quantity: 1,
    unit: '次',
    price: 0,
    dosage: tempOrderForm.value.dosage,
    frequency: tempOrderForm.value.frequency,
    days: 1,
  })
  tempOrderVisible.value = false
  tempOrderForm.value = { item_name: '', dosage: '', frequency: 'st' }
  ElMessage.success('临时医嘱已提交')
}

const saveInRecord = () => {
  ElMessage.success('住院病历已保存')
}

const confirmDischarge = () => {
  if (!dischargeForm.value.diagnosis) { ElMessage.warning('请填写出院诊断'); return }
  ElMessage.success(`${currentBed.value?.patient_name} 办理出院成功`)
  dischargeVisible.value = false
  // 更新床位状态
  if (currentBed.value) {
    const idx = beds.value.findIndex(b => b.id === currentBed.value!.id)
    if (idx >= 0) beds.value[idx] = { ...beds.value[idx], status: 'empty', patient_id: undefined, patient_name: undefined }
    currentBed.value = null
  }
}

const { loadBeds } = his

const showLogoutDialog = ref(false)

const logout = () => {
  showLogoutDialog.value = false
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadBeds(selectedWard.value)
})
</script>

<style scoped>
.inpatient-wb {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  font-size: 14px;
}

.top-bar {
  height: 56px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.doctor-info { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #212121; }
.top-actions { display: flex; align-items: center; gap: 10px; }

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧床位 */
.bed-panel {
  width: 300px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #E0E0E0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 10px 12px;
  border-bottom: 1px solid #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title { font-size: 14px; font-weight: 600; color: #212121; }

.bed-stats {
  display: flex;
  padding: 8px 12px;
  gap: 12px;
  border-bottom: 1px solid #F0F0F0;
}
.stat-item { text-align: center; flex: 1; }
.stat-num { font-size: 22px; font-weight: 700; color: #1E88E5; }
.stat-num.empty { color: #43A047; }
.stat-num.warn { color: #FB8C00; }
.stat-label { font-size: 11px; color: #757575; }

.bed-grid {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-content: start;
}

.bed-card {
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  min-height: 80px;
}
.bed-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.bed-card.selected { border-color: #1E88E5; box-shadow: 0 0 0 2px #BBDEFB; }
.bed-card.occupied { background: #FFF9C4; }
.bed-card.empty { background: #F1F8E9; }
.bed-card.reserved { background: #FFF3E0; }

.bed-no { font-size: 16px; font-weight: 700; color: #424242; margin-bottom: 4px; }
.bed-patient .bed-name { font-size: 13px; font-weight: 600; color: #212121; }
.bed-patient .bed-meta { font-size: 11px; color: #757575; }
.bed-empty-label { font-size: 12px; color: #9E9E9E; margin-top: 8px; }
.bed-allergy { position: absolute; top: 4px; right: 4px; }

/* 右侧详情 */
.detail-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  gap: 10px;
}

.no-patient { display: flex; align-items: center; justify-content: center; height: 100%; }

.patient-header {
  background: #F0F7FF;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.ph-basic { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ph-name { font-size: 16px; font-weight: 700; color: #212121; }
.ph-meta { font-size: 13px; color: #757575; }
.ph-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ph-admit { font-size: 12px; color: #757575; }

.detail-tabs { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.tab-content {
  padding: 12px 0;
  overflow-y: auto;
  max-height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 13px; color: #757575; }
.field-label.req::after { content: ' *'; color: #E53935; }
.save-bar { padding-top: 8px; border-top: 1px solid #F0F0F0; }

.order-section { margin-bottom: 12px; }
.section-title { font-size: 13px; font-weight: 600; color: #757575; margin-bottom: 8px; }
.order-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F5F5F5; }
.order-name { flex: 1; font-weight: 600; color: #212121; }
.order-meta { font-size: 12px; color: #757575; }
.add-order-bar { margin-top: 8px; }

.nursing-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #F5F5F5; }
.nursing-time { width: 55px; font-size: 13px; color: #1E88E5; font-weight: 600; flex-shrink: 0; }
.nursing-content { flex: 1; font-size: 13px; color: #212121; }
.nursing-nurse { font-size: 12px; color: #757575; flex-shrink: 0; }

.exam-bar { margin-bottom: 8px; }

/* 医嘱药品搜索 */
.drug-search-bar { margin-bottom: 8px; }
.drug-results { border: 1px solid #E0E0E0; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
.drug-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #F5F5F5; cursor: pointer; }
.drug-row:hover { background: #F5F7FA; }
.d-name { font-weight: 600; color: #212121; }
.d-spec { font-size: 12px; color: #757575; flex: 1; }
.d-price { font-size: 13px; color: #E53935; }

/* 退出确认弹窗 */
:deep(.logout-dialog-content) {
  text-align: center;
  padding: 24px 0;
}
:deep(.logout-dialog-content p) {
  margin: 10px 0;
  color: #4A5568;
  font-size: 15px;
}
:deep(.logout-hint) {
  font-size: 13px;
  color: #A0AEC0 !important;
}
</style>
