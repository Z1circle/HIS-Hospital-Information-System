<template>
  <div class="pharmacy-wb">
    <!-- ==================== 顶部状态栏 ==================== -->
    <div class="top-bar">
      <div class="title-area">
        <el-icon :size="22"><Box /></el-icon>
        <span class="wb-title">药房工作台</span>
        <!-- 数据同步状态指示器 -->
        <el-tag 
          :type="syncStatus === 'online' ? 'success' : 'danger'" 
          size="small" 
          style="margin-left:8px"
        >
          {{ syncStatus === 'online' ? '● 数据同步正常' : '● 数据同步异常' }}
        </el-tag>
        <el-button v-if="syncStatus === 'offline'" size="small" @click="manualSync" style="margin-left:8px">
          手动同步
        </el-button>
      </div>
      
      <div class="top-actions">
        <!-- 当前登录药师信息 -->
        <span class="pharmacist-name">{{ currentUser?.real_name || currentUser?.nickname || '未登录' }}</span>
        
        <!-- 待处理处方数量角标 -->
        <el-badge :value="pendingCount" :hidden="pendingCount === 0" style="margin-left:16px">
          <el-button size="small" type="primary">待处理 {{ pendingCount }}</el-button>
        </el-badge>
        
        <el-button size="small" style="margin-left:10px" @click="openProfile">个人中心</el-button>
        <el-button size="small" type="danger" style="margin-left:10px" @click="showLogoutDialog = true">退出</el-button>
      </div>
    </div>

    <!-- ==================== 离线模式提示 ==================== -->
    <el-alert
      v-if="syncStatus === 'offline'"
      title="当前处于离线模式，部分功能可能受限。网络恢复后将自动同步数据。"
      type="warning"
      :closable="false"
      show-icon
      style="flex-shrink:0"
    />

    <!-- ==================== 主工作区 ==================== -->
    <div class="main-content">
      <!-- ========== 左侧待处理队列 ========== -->
      <div class="left-panel">
        <div class="panel-header">
          <span class="panel-title">待处理处方</span>
          <el-button size="small" @click="loadPrescriptions" :loading="loading">刷新</el-button>
        </div>
        
        <el-empty v-if="prescriptionList.length === 0 && !loading" description="暂无待处理处方" :image-size="60" />
        
        <div class="prescription-list">
          <div
            v-for="p in prescriptionList"
            :key="p.prescriptionId"
            :class="['presc-card', selectedPrescription?.prescriptionId === p.prescriptionId ? 'selected' : '', isTimeout(p) ? 'timeout' : '']"
            @click="selectPrescription(p)"
          >
            <div class="presc-top">
              <span class="presc-receipt">回执号: {{ p.receiptNo }}</span>
              <el-tag size="small" :type="getStatusType(p.status)">{{ getStatusText(p.status) }}</el-tag>
            </div>
            <div class="presc-patient-info">
              <span class="presc-name">{{ p.patientName }}</span>
              <span class="presc-age">{{ p.patientAge }}岁</span>
            </div>
            <div class="presc-time">{{ formatTime(p.paidTime) }}</div>
            <!-- 超时闪烁提示 -->
            <div v-if="isTimeout(p)" class="timeout-indicator">⚠ 接收超时</div>
          </div>
        </div>
      </div>

      <!-- ========== 右侧工作区（中央详情 + 底部发药）========== -->
      <div class="right-column">
      <!-- ========== 中央详情与核验区 ========== -->
      <div class="center-panel">
        <div v-if="!selectedPrescription" class="no-select">
          <el-empty description="请从左侧选择处方查看详情" :image-size="100" />
        </div>
        
        <template v-else>
          <!-- 患者信息区 -->
          <div class="patient-section">
            <div class="section-title">患者信息</div>
            <div class="patient-info-grid">
              <div class="info-item">
                <span class="label">姓名：</span>
                <span class="value">{{ selectedPrescription.patientName }}</span>
              </div>
              <div class="info-item">
                <span class="label">年龄：</span>
                <span class="value">{{ selectedPrescription.patientAge }}岁</span>
              </div>
              <div class="info-item">
                <span class="label">就诊码：</span>
                <span class="value">{{ selectedPrescription.visitCode || '未扫描' }}</span>
              </div>
              <div class="info-item allergy-highlight" v-if="selectedPrescription.allergyHistory?.length > 0">
                <span class="label">过敏史：</span>
                <span class="value allergy-text">
                  <el-icon><Warning /></el-icon>
                  {{ selectedPrescription.allergyHistory.join('、') }}
                </span>
              </div>
              <div class="info-item" v-else>
                <span class="label">过敏史：</span>
                <span class="value" style="color:#43A047">无</span>
              </div>
            </div>
          </div>

          <!-- 药品清单区 -->
          <div class="drugs-section">
            <div class="section-title">
              药品清单
              <span v-if="selectedPrescription?.status === '已接收'" style="margin-left:12px;font-size:13px;color:#757575">
                (已扫描 {{ scannedDrugCount }}/{{ selectedPrescription.drugs.length }})
              </span>
            </div>
            <el-table :data="selectedPrescription.drugs" size="small" border>
              <el-table-column label="品名" prop="name" min-width="140" />
              <el-table-column label="规格" prop="spec" width="120" />
              <el-table-column label="数量" prop="quantity" width="80" />
              <el-table-column label="用法用量" prop="usage" min-width="150" />
              <el-table-column label="监管码" width="200">
                <template #default="{ row }">
                  <div v-if="selectedPrescription?.status === '已接收'">
                    <el-input 
                      v-model="row.scannedCode" 
                      placeholder="扫码或手动输入"
                      size="small"
                      clearable
                      @keyup.enter="handleDrugCodeEnter(row)"
                      :class="{ 'scanned-input': row.scannedCode }"
                    >
                      <template #prefix>
                        <el-icon><Camera /></el-icon>
                      </template>
                    </el-input>
                    <div v-if="row.codeMatched" style="color:#43A047;font-size:12px;margin-top:4px">✓ 匹配成功</div>
                    <div v-else-if="row.scannedCode && !row.codeMatched" style="color:#E53935;font-size:12px;margin-top:4px">✗ 不匹配</div>
                  </div>
                  <div v-else>
                    <span v-if="row.scannedCode" style="color:#43A047">✓ {{ row.scannedCode }}</span>
                    <span v-else style="color:#9E9E9E">未扫描</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 操作按钮区 -->
          <div class="action-buttons">
            <el-button 
              type="success" 
              size="large" 
              @click="confirmReceive"
              :disabled="selectedPrescription.status !== '待接收'"
              :loading="receiveLoading"
            >
              ✓ 确认接收
            </el-button>
            <el-button 
              type="danger" 
              size="large" 
              @click="openExceptionReport"
              :disabled="selectedPrescription.status !== '待接收'"
            >
              ⚠ 异常上报
            </el-button>
          </div>
        </template>
      </div>

      <!-- ========== 底部发药操作区 ========== -->
      <div class="bottom-panel">
        <div class="dispense-bar" :class="{ disabled: selectedPrescription?.status !== '已接收' }">
          <!-- 药品监管码 -->
          <div class="bar-item bar-scan">
            <label>监管码：</label>
            <el-input 
              v-model="scannedDrugCode" 
              placeholder="扫码或输入"
              clearable
              size="small"
              @keyup.enter="verifyDrugCode"
              :disabled="selectedPrescription?.status !== '已接收'"
            >
              <template #prefix><el-icon><Camera /></el-icon></template>
              <template #append>
                <el-button @click="autoFillAllDrugCodes" :disabled="!selectedPrescription || selectedPrescription.status !== '已接收'" size="small">一键填入</el-button>
              </template>
            </el-input>
            <span v-if="drugCodeMatch" class="match-ok">✓</span>
            <span v-else-if="scannedDrugCode && drugCodeMatch === false" class="match-fail">✗</span>
          </div>

          <!-- 就诊码 -->
          <div class="bar-item bar-scan">
            <label>就诊码：</label>
            <el-input 
              v-model="scannedVisitCode" 
              :placeholder="selectedPrescription?.visitCode ? `已自动填充：${selectedPrescription.visitCode}` : '扫码或输入'"
              clearable
              size="small"
              @keyup.enter="verifyVisitCode"
              :disabled="selectedPrescription?.status !== '已接收'"
              :class="{ 'auto-filled-input': scannedVisitCode && selectedPrescription?.visitCode }"
            >
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
            <span v-if="visitCodeMatch" class="match-ok">✓</span>
            <span v-else-if="scannedVisitCode && visitCodeMatch === false" class="match-fail"></span>
            <el-tag v-if="selectedPrescription?.visitCode && !visitCodeMatch" size="small" type="info" style="margin-left: 4px">点击左侧患者自动填充</el-tag>
          </div>

          <!-- 四项勾选 -->
          <div class="bar-item bar-checks">
            <el-checkbox v-model="checkItems.identity" :disabled="selectedPrescription?.status !== '已接收' || !visitCodeMatch">身份</el-checkbox>
            <el-checkbox v-model="checkItems.drugName" :disabled="selectedPrescription?.status !== '已接收' || !drugCodeMatch">药品</el-checkbox>
            <el-checkbox v-model="checkItems.specUsage" :disabled="selectedPrescription?.status !== '已接收'">规格</el-checkbox>
            <el-checkbox v-model="checkItems.allergy" :disabled="selectedPrescription?.status !== '已接收'">过敏</el-checkbox>
          </div>

          <!-- 确认发药 -->
          <div class="bar-item bar-action">
            <el-button 
              type="primary" 
              @click="confirmDispense"
              :disabled="!canDispense"
              :loading="dispenseLoading"
            >
              确认发药
            </el-button>
          </div>
        </div>
      </div>
      </div> <!-- /right-column -->
    </div>

    <!-- ==================== 异常上报表单弹窗 ==================== -->
    <el-dialog v-model="exceptionDialogVisible" title="异常上报" width="500px" :close-on-click-modal="false">
      <el-form :model="exceptionForm" label-width="80px">
        <el-form-item label="异常类型" required>
          <el-select v-model="exceptionForm.type" placeholder="请选择异常类型" style="width:100%">
            <el-option label="药品信息错误" value="drug_error" />
            <el-option label="患者信息不符" value="patient_mismatch" />
            <el-option label="处方剂量异常" value="dosage_error" />
            <el-option label="其他问题" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细描述" required>
          <el-input 
            v-model="exceptionForm.description" 
            type="textarea" 
            :rows="4" 
            placeholder="请详细描述异常情况..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exceptionDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitException">提交并退回</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 手工登记表单弹窗（离线模式）==================== -->
    <el-dialog v-model="manualRegisterVisible" title="手工登记处方" width="600px" :close-on-click-modal="false">
      <el-alert 
        title="离线模式下手工登记的处方将在网络恢复后自动补传" 
        type="warning" 
        :closable="false" 
        style="margin-bottom:16px"
      />
      <el-form :model="manualForm" label-width="100px">
        <el-form-item label="缴费回执号" required>
          <el-input v-model="manualForm.receiptNo" placeholder="请输入缴费回执号" />
        </el-form-item>
        <el-form-item label="患者姓名" required>
          <el-input v-model="manualForm.patientName" placeholder="请输入患者姓名" />
        </el-form-item>
        <el-form-item label="患者年龄" required>
          <el-input-number v-model="manualForm.patientAge" :min="0" :max="150" />
        </el-form-item>
        <el-form-item label="过敏史">
          <el-input v-model="manualForm.allergyText" placeholder="多个过敏史用逗号分隔，无则留空" />
        </el-form-item>
        <el-form-item label="药品清单">
          <el-button size="small" @click="addManualDrug">+ 添加药品</el-button>
          <el-table v-if="manualForm.drugs.length > 0" :data="manualForm.drugs" border size="small" style="margin-top:8px">
            <el-table-column label="品名" min-width="120">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="规格" width="100">
              <template #default="{ row }">
                <el-input v-model="row.spec" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="1" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="用法用量" min-width="120">
              <template #default="{ row }">
                <el-input v-model="row.usage" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ $index }">
                <el-button size="small" type="danger" text @click="manualForm.drugs.splice($index, 1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualRegisterVisible = false">取消</el-button>
        <el-button type="primary" @click="submitManualRegister">保存（待同步）</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 二次确认弹窗 ==================== -->
    <el-dialog v-model="dispenseConfirmVisible" title="确认发药" width="400px" :close-on-click-modal="false">
      <div style="text-align:center;padding:20px 0">
        <el-icon :size="60" color="#409EFF"><CircleCheck /></el-icon>
        <p style="font-size:16px;margin-top:16px;color:#212121">确认对以下处方进行发药？</p>
        <p style="font-size:14px;color:#757575;margin-top:8px">
          患者：<strong>{{ selectedPrescription?.patientName }}</strong> | 
          药品数：<strong>{{ selectedPrescription?.drugs?.length }}</strong> 种
        </p>
        <p style="font-size:13px;color:#FB8C00;margin-top:12px">此操作将扣减库存并生成发药记录</p>
      </div>
      <template #footer>
        <el-button @click="dispenseConfirmVisible = false">取消</el-button>
        <el-button type="primary" @click="executeDispense">确认发药</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 个人资料弹窗 ==================== -->
    <el-dialog v-model="profileDialogVisible" title="个人中心" width="450px" :close-on-click-modal="false">
      <el-form :model="profileForm" label-width="80px">
        <el-form-item label="头像">
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <div
              v-for="av in avatarOptions"
              :key="av"
              @click="profileForm.avatar = av"
              style="width:40px;height:40px;border:2px solid #ddd;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer"
              :style="profileForm.avatar === av ? 'border-color:#409EFF;background:#ecf5ff' : ''"
            >{{ av }}</div>
          </div>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" placeholder="请输入昵称" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="profileForm.phone" placeholder="请输入手机号" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="profileLoading" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 退出确认弹窗 ==================== -->
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
import { ref, computed, onMounted, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Box, SwitchButton, Warning, Camera, User, CircleCheck } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// ==================== 用户信息 ====================
const currentUser = computed(() => userStore.currentUser.value)

// ==================== 数据同步状态 ====================
const syncStatus = ref<'online' | 'offline'>('online')
const loading = ref(false)

// ==================== 处方列表 ====================
interface DrugItem {
  name: string
  spec: string
  quantity: number
  usage: string
  scannedCode?: string
  codeMatched?: boolean  // 监管码是否匹配
}

interface Prescription {
  prescriptionId: string
  receiptNo: string
  patientName: string
  patientAge: number
  allergyHistory: string[]
  drugs: DrugItem[]
  status: '待接收' | '已接收' | '已发药' | '已驳回'
  paidTime: string
  visitCode?: string
  receivedTime?: string
}

const prescriptionList = ref<Prescription[]>([])
const selectedPrescription = ref<Prescription | null>(null)

// 计算待处理处方数量
const pendingCount = computed(() => 
  prescriptionList.value.filter(p => p.status === '待接收' || p.status === '已接收').length
)

// 计算已扫描药品数量
const scannedDrugCount = computed(() => {
  if (!selectedPrescription.value) return 0
  return selectedPrescription.value.drugs.filter(d => d.scannedCode).length
})

// ==================== 超时检测（2分钟）====================
const getElapsedTime = (paidTime: string): number => {
  const now = new Date().getTime()
  const paid = new Date(paidTime).getTime()
  return Math.floor((now - paid) / 1000 / 60) // 返回分钟数
}

const isTimeout = (p: Prescription): boolean => {
  if (p.status !== '待接收') return false
  return getElapsedTime(p.paidTime) >= 2
}

// ==================== 状态辅助函数 ====================
const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    '待接收': 'warning', 'pending': 'warning',
    '已接收': 'primary', 'received': 'primary',
    '已发药': 'success', 'dispensed': 'success',
    '已驳回': 'danger', 'rejected': 'danger', 'cancelled': 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    'pending': '待接收', '待接收': '待接收',
    'received': '已接收', '已接收': '已接收',
    'dispensed': '已发药', '已发药': '已发药',
    'rejected': '已驳回', '已驳回': '已驳回',
    'cancelled': '已作废'
  }
  return map[status] || status
}

const formatTime = (time: string): string => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ==================== 加载处方数据 ====================
const loadPrescriptions = async () => {
  loading.value = true
  try {
    // 调用真实API获取待处理处方列表
    const res = await axios.get('/api/pharmacy/pending-prescriptions')
    // 转换API字段名以匹配前端接口 (snake_case → camelCase，状态值映射)
    const rawData = res.data || []
    const statusMap: Record<string, string> = {
      'pending': '待接收', 'received': '已接收',
      'dispensed': '已发药', 'rejected': '已驳回', 'cancelled': '已作废'
    }
    const newList = rawData.map((p: any) => ({
      prescriptionId: p.prescription_id || p.prescriptionId,
      receiptNo: p.receipt_no || p.receiptNo || '',
      patientName: p.patient_name || p.patientName || '',
      patientAge: p.patient_age || p.patientAge || 0,
      allergyHistory: p.allergy_history || p.allergyHistory || [],
      paidTime: p.paid_time || p.paidTime || '',
      visitCode: p.visit_code || p.visitCode || '',
      receivedTime: p.received_time || p.receivedTime || '',
      status: statusMap[p.status] || p.status || '待接收',
      reviewStatus: p.review_status || '',
      doctorName: p.doctor_name || '',
      type: p.type || '',
      drugs: (p.drugs || []).map((d: any) => ({
        name: d.name || '',
        spec: d.spec || '',
        quantity: d.quantity || 0,
        usage: d.usage || '',
        scannedCode: d.scannedCode || d.scanned_code || '',
        codeMatched: !!(d.scannedCode || d.scanned_code)
      }))
    }))
    
    // 保留已有扫描状态（自动刷新时不丢失用户操作）
    if (prescriptionList.value.length > 0) {
      const oldMap = new Map(prescriptionList.value.map(p => [p.prescriptionId, p]))
      newList.forEach((newP: any) => {
        const oldP = oldMap.get(newP.prescriptionId)
        if (oldP) {
          // 保留处方状态（如果用户已接收，不被API覆盖）
          if (oldP.status === '已接收' && newP.status === '待接收') {
            newP.status = '已接收'
            newP.receivedTime = oldP.receivedTime
          }
          // 保留药品扫描状态
          newP.drugs.forEach((newDrug: any) => {
            const oldDrug = oldP.drugs.find((od: any) => od.name === newDrug.name)
            if (oldDrug?.scannedCode) {
              newDrug.scannedCode = oldDrug.scannedCode
              newDrug.codeMatched = oldDrug.codeMatched
            }
          })
        }
      })
      // 如果当前选中的处方还在列表中，保持引用
      if (selectedPrescription.value) {
        const updated = newList.find((p: any) => p.prescriptionId === selectedPrescription.value?.prescriptionId)
        if (updated) {
          selectedPrescription.value = updated
        }
      }
    }
    
    prescriptionList.value = newList
    
    if (prescriptionList.value.length === 0) {
      ElMessage.info('暂无待处理处方')
    }
    
    syncStatus.value = 'online'
  } catch (err) {
    console.error('加载处方数据失败:', err)
    ElMessage.error('网络异常，无法加载处方数据')
    prescriptionList.value = []
    syncStatus.value = 'offline'
  } finally {
    loading.value = false
  }
}



// ==================== 选择处方 ====================
const selectPrescription = (p: Prescription) => {
  selectedPrescription.value = p
  // 重置扫描和确认状态
  resetDispenseState()
  
  // 自动填充患者就诊码（如果有）
  if (p.visitCode) {
    scannedVisitCode.value = p.visitCode
    console.log('[Pharmacy] selectPrescription: visitCode=', p.visitCode, 'scannedVisitCode=', scannedVisitCode.value)
    // 自动触发就诊码验证
    verifyVisitCode()
    ElMessage.success(`已自动填充就诊码：${p.visitCode}`)
  }
}

// ==================== 流程A：处方接收 ====================
const receiveLoading = ref(false)

const confirmReceive = async () => {
  if (!selectedPrescription.value) return
  
  receiveLoading.value = true
  try {
    await axios.post('/api/pharmacy/receive-prescription', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id
    })
    
    // 更新当前选中处方的状态（原地修改，保持引用一致性）
    selectedPrescription.value.status = '已接收'
    selectedPrescription.value.receivedTime = new Date().toISOString()
    
    // 确保列表中同一对象也被更新（selectedPrescription与列表中是同一引用）
    const idx = prescriptionList.value.findIndex(
      p => p.prescriptionId === selectedPrescription.value?.prescriptionId
    )
    if (idx !== -1) {
      // 直接修改列表中同一对象的属性，确保响应式触发
      prescriptionList.value[idx].status = '已接收'
      prescriptionList.value[idx].receivedTime = new Date().toISOString()
    }
    
    // 记录操作日志
    addOperationLog('接收处方', `接收处方 ${selectedPrescription.value.prescriptionId}`)
    
    // 自动填充就诊码并触发验证
    if (selectedPrescription.value.visitCode) {
      scannedVisitCode.value = selectedPrescription.value.visitCode
      verifyVisitCode()
    }
    
    ElMessage.success('处方接收成功，可进行发药操作')
  } catch (err: any) {
    console.error('接收失败:', err)
    ElMessage.error(err.response?.data?.error || '接收失败，请重试')
  } finally {
    receiveLoading.value = false
  }
}

// ==================== 异常上报 ====================
const exceptionDialogVisible = ref(false)
const exceptionForm = reactive({
  type: '',
  description: ''
})

const openExceptionReport = () => {
  exceptionForm.type = ''
  exceptionForm.description = ''
  exceptionDialogVisible.value = true
}

const submitException = async () => {
  if (!exceptionForm.type || !exceptionForm.description) {
    ElMessage.warning('请填写完整的异常信息')
    return
  }
  
  try {
    // 模拟API调用
    await axios.post('/api/pharmacy/report-exception', {
      prescriptionId: selectedPrescription.value!.prescriptionId,
      exceptionType: exceptionForm.type,
      description: exceptionForm.description,
      operator: currentUser.value?.id
    })
    
    // 更新状态
    selectedPrescription.value!.status = '已驳回'
    
    // 记录操作日志
    addOperationLog('异常上报', `上报异常：${exceptionForm.type} - ${exceptionForm.description}`)
    
    ElMessage.success('异常已上报，处方已退回医生端')
    exceptionDialogVisible.value = false
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    console.error('上报失败:', err)
    ElMessage.error('上报失败，请重试')
  }
}

// ==================== 流程B：药品发放 ====================
const scannedDrugCode = ref('')
const scannedVisitCode = ref('')
const drugCodeMatch = ref<boolean | null>(null)
const visitCodeMatch = ref<boolean | null>(null)

const checkItems = reactive({
  identity: false,
  drugName: false,
  specUsage: false,
  allergy: false
})

const dispenseLoading = ref(false)
const dispenseConfirmVisible = ref(false)

// 验证药品监管码
const verifyDrugCode = () => {
  if (!scannedDrugCode.value || !selectedPrescription.value) {
    drugCodeMatch.value = null
    return
  }
  
  // 模拟验证逻辑 - 检查监管码是否匹配处方中的任一药品
  const matched = selectedPrescription.value.drugs.some(drug => {
    // 实际项目中应该查询数据库验证监管码
    return scannedDrugCode.value.includes(drug.name.substring(0, 2))
  })
  
  drugCodeMatch.value = matched
  if (matched) {
    // 标记已扫描
    selectedPrescription.value.drugs.forEach(drug => {
      if (!drug.scannedCode && scannedDrugCode.value.includes(drug.name.substring(0, 2))) {
        drug.scannedCode = scannedDrugCode.value
        drug.codeMatched = true
      }
    })
    checkItems.drugName = true
    ElMessage.success('药品监管码验证通过')
  } else {
    checkItems.drugName = false
    ElMessage.error('药品监管码不匹配，请核对')
  }
}

// 处理单个药品监管码输入（表格中）
const handleDrugCodeEnter = (row: any) => {
  if (!row.scannedCode || !selectedPrescription.value) return
  
  // 验证监管码是否匹配该药品
  const matched = row.scannedCode.includes(row.name.substring(0, 2))
  row.codeMatched = matched
  
  if (matched) {
    ElMessage.success(`✓ ${row.name} 监管码验证通过`)
  } else {
    ElMessage.warning(`✗ ${row.name} 监管码可能不匹配`)
  }
}

// 一键填入所有药品监管码（测试用）
const autoFillAllDrugCodes = () => {
  if (!selectedPrescription.value || selectedPrescription.value.status !== '已接收') {
    ElMessage.warning('请先接收处方')
    return
  }
  
  const drugs = selectedPrescription.value.drugs
  // 使用 splice 原地替换，确保深层响应式更新
  for (let i = 0; i < drugs.length; i++) {
    if (!drugs[i].scannedCode) {
      const prefix = drugs[i].name.substring(0, 2).toUpperCase()
      const randomNum = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
      drugs.splice(i, 1, {
        ...drugs[i],
        scannedCode: `${prefix}${randomNum}`,
        codeMatched: true
      })
    }
  }
  
  checkItems.drugName = true
  drugCodeMatch.value = true
  ElMessage.success(`已为 ${drugs.length} 个药品自动填入监管码`)
}

// 验证患者就诊码
const verifyVisitCode = () => {
  console.log('[Pharmacy] verifyVisitCode: scanned=', scannedVisitCode.value, 'presc=', selectedPrescription.value?.visitCode, 'status=', selectedPrescription.value?.status)
  if (!scannedVisitCode.value || !selectedPrescription.value) {
    console.log('[Pharmacy] verifyVisitCode: early return (null)')
    visitCodeMatch.value = null
    return
  }
  
  // 验证就诊码是否与处方中的患者匹配
  const matched = scannedVisitCode.value === selectedPrescription.value.visitCode
  console.log('[Pharmacy] verifyVisitCode: matched=', matched)
  
  visitCodeMatch.value = matched
  if (matched) {
    checkItems.identity = true
    ElMessage.success('患者身份验证通过')
  } else {
    checkItems.identity = false
    ElMessage.error('就诊码不匹配，请核对患者身份')
  }
}

// 是否可以发药
const canDispense = computed(() => {
  if (!selectedPrescription.value || selectedPrescription.value.status !== '已接收') {
    return false
  }
  
  // 四项必须全部勾选
  return checkItems.identity && 
         checkItems.drugName && 
         checkItems.specUsage && 
         checkItems.allergy &&
         drugCodeMatch.value === true &&
         visitCodeMatch.value === true
})

// 重置发药状态
const resetDispenseState = () => {
  scannedDrugCode.value = ''
  scannedVisitCode.value = ''
  drugCodeMatch.value = null
  visitCodeMatch.value = null
  checkItems.identity = false
  checkItems.drugName = false
  checkItems.specUsage = false
  checkItems.allergy = false
}

// 确认发药
const confirmDispense = () => {
  if (!canDispense.value) {
    ElMessage.warning('请完成所有必填项和确认项')
    return
  }
  
  dispenseConfirmVisible.value = true
}

// 执行发药
const executeDispense = async () => {
  if (!selectedPrescription.value) return
  
  dispenseLoading.value = true
  try {
    // 模拟API调用
    await axios.post('/api/pharmacy/dispense', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id,
      drugCodes: selectedPrescription.value.drugs.map(d => d.scannedCode).filter(Boolean),
      visitCode: scannedVisitCode.value
    })
    
    // 更新状态
    selectedPrescription.value.status = '已发药'
    
    // 记录操作日志
    addOperationLog('确认发药', `发药完成：${selectedPrescription.value.prescriptionId}`)
    
    ElMessage.success('发药成功，库存已扣减，通知患者取药')
    dispenseConfirmVisible.value = false
    
    // 重置状态
    resetDispenseState()
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    console.error('发药失败:', err)
    ElMessage.error('发药失败，请重试')
  } finally {
    dispenseLoading.value = false
  }
}

// ==================== 手动同步 ====================
const manualSync = async () => {
  try {
    ElMessage.info('正在同步数据...')
    await loadPrescriptions()
    syncStatus.value = 'online'
    ElMessage.success('数据同步成功')
  } catch (err) {
    ElMessage.error('同步失败，请检查网络连接')
  }
}

// ==================== 离线模式手工登记 ====================
const manualRegisterVisible = ref(false)
const manualForm = reactive({
  receiptNo: '',
  patientName: '',
  patientAge: 18,
  allergyText: '',
  drugs: [] as DrugItem[]
})

const addManualDrug = () => {
  manualForm.drugs.push({
    name: '',
    spec: '',
    quantity: 1,
    usage: ''
  })
}

const submitManualRegister = () => {
  if (!manualForm.receiptNo || !manualForm.patientName || manualForm.drugs.length === 0) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  const newPrescription: Prescription = {
    prescriptionId: `MANUAL_${Date.now()}`,
    receiptNo: manualForm.receiptNo,
    patientName: manualForm.patientName,
    patientAge: manualForm.patientAge,
    allergyHistory: manualForm.allergyText ? manualForm.allergyText.split(/[,，]/).map(s => s.trim()) : [],
    drugs: manualForm.drugs,
    status: '待接收',
    paidTime: new Date().toISOString(),
    visitCode: ''
  }
  
  prescriptionList.value.unshift(newPrescription)
  
  // 记录操作日志
  addOperationLog('手工登记', `离线登记处方：${manualForm.receiptNo}`)
  
  ElMessage.success('处方已保存，网络恢复后将自动同步')
  manualRegisterVisible.value = false
  
  // 重置表单
  manualForm.receiptNo = ''
  manualForm.patientName = ''
  manualForm.patientAge = 18
  manualForm.allergyText = ''
  manualForm.drugs = []
}

// ==================== 操作日志 ====================
const operationLogs = ref<Array<{ time: string; user: string; action: string }>>([])

const addOperationLog = (action: string, detail: string) => {
  const log = {
    time: new Date().toLocaleString('zh-CN'),
    user: currentUser.value?.real_name || currentUser.value?.nickname || '未知',
    action: `${action} - ${detail}`
  }
  operationLogs.value.unshift(log)
  
  // 最多保留50条
  if (operationLogs.value.length > 50) {
    operationLogs.value = operationLogs.value.slice(0, 50)
  }
}

// ==================== 个人资料 ====================
const profileDialogVisible = ref(false)
const profileLoading = ref(false)
const profileForm = reactive({ nickname: '', phone: '', avatar: '' })
const avatarOptions = ['👤', '👨', '👩', '🧑', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍💼', '👩‍💼']

const openProfile = () => {
  profileForm.nickname = currentUser.value?.nickname || currentUser.value?.real_name || ''
  profileForm.phone = currentUser.value?.phone || ''
  profileForm.avatar = currentUser.value?.avatar || '👩‍⚕️'
  profileDialogVisible.value = true
}

const saveProfile = async () => {
  if (!currentUser.value) return
  profileLoading.value = true
  try {
    const res = await axios.put('/api/user/profile', {
      userId: currentUser.value.id,
      nickname: profileForm.nickname,
      phone: profileForm.phone,
      avatar: profileForm.avatar
    })
    userStore.currentUser.value = { ...currentUser.value, ...res.data }
    profileDialogVisible.value = false
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    profileLoading.value = false
  }
}

// ==================== 退出登录 ====================
const showLogoutDialog = ref(false)

const logout = () => {
  showLogoutDialog.value = false
  userStore.logout()
  router.push('/login')
}

// ==================== 定时刷新和超时检测 ====================
let refreshTimer: number | null = null

onMounted(() => {
  loadPrescriptions()
  
  // 每30秒自动刷新一次
  refreshTimer = window.setInterval(() => {
    if (syncStatus.value === 'online') {
      loadPrescriptions()
    }
  }, 30000)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
/* ==================== 整体布局 ==================== */
.pharmacy-wb {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  font-size: 14px;
  overflow: hidden;
}

/* ==================== 顶部状态栏 ==================== */
.top-bar {
  height: 56px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.title-area { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
}

.wb-title { 
  font-size: 18px; 
  font-weight: 700; 
  color: #212121; 
}

.top-actions { 
  display: flex; 
  align-items: center; 
  gap: 8px;
}

.pharmacist-name {
  font-size: 14px;
  color: #424242;
  font-weight: 500;
}

/* ==================== 主工作区 ==================== */
.main-content {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
 
}

/* ==================== 左侧待处理队列 ==================== */
.left-panel {
  width: 220px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FAFAFA;
}

.panel-title { 
  font-size: 15px; 
  font-weight: 600; 
  color: #212121; 
}

.prescription-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.presc-card {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.presc-card:hover { 
  background: #F5F7FA; 
  border-color: #BDBDBD;
}

.presc-card.selected { 
  background: #E3F2FD; 
  border-left: 4px solid #1E88E5;
  border-color: #1E88E5;
}

.presc-card.timeout {
  animation: blink 1.5s infinite;
  background: #FFF9C4;
  border-color: #FBC02D;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.presc-top { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 6px; 
}

.presc-receipt { 
  font-size: 12px; 
  color: #757575; 
  font-family: monospace;
}

.presc-patient-info {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.presc-name { 
  font-weight: 600; 
  color: #212121; 
  font-size: 15px; 
}

.presc-age {
  font-size: 13px;
  color: #757575;
}

.presc-time { 
  font-size: 12px; 
  color: #9E9E9E; 
}

.timeout-indicator {
  margin-top: 6px;
  font-size: 12px;
  color: #E53935;
  font-weight: 600;
  text-align: center;
  padding: 4px;
  background: rgba(229, 57, 53, 0.1);
  border-radius: 4px;
}

/* ==================== 右侧工作区（中央+底部）==================== */
.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  min-width: 0;
}

/* ==================== 中央详情与核验区 ==================== */
.center-panel {
  flex: 1;
  background: white;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  
}

.no-select { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  height: 100%; 
}

.patient-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1E88E5;
}

.patient-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.info-item .label {
  color: #757575;
  margin-right: 8px;
  min-width: 70px;
}

.info-item .value {
  color: #212121;
  font-weight: 500;
}

.allergy-highlight {
  background: #FFEBEE;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #FFCDD2;
}

.allergy-text {
  color: #E53935 !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.drugs-section {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.action-buttons .el-button {
  flex: 1;
}

/* ==================== 底部发药操作区 ==================== */
.bottom-panel {
  height: 56px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.dispense-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  width: 100%;
  height: 100%;
}

.dispense-bar.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bar-item label {
  font-size: 12px;
  color: #757575;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-scan {
  flex: 1;
  min-width: 0;
}

.bar-scan .el-input {
  flex: 1;
}

.bar-checks {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.bar-checks .el-checkbox {
  font-size: 12px;
}

.bar-action {
  flex-shrink: 0;
}

.match-ok {
  color: #43A047;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.match-fail {
  color: #E53935;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ==================== 操作日志面板 ==================== */
.log-panel {
  position: fixed;
  bottom: 60px;
  right: 20px;
  width: 400px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 99;
  display: flex;
  flex-direction: column;
}

.log-header {
  padding: 12px 16px;
  border-bottom: 1px solid #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FAFAFA;
  font-weight: 600;
  color: #212121;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  padding: 8px 12px;
  border-bottom: 1px solid #F5F5F5;
  font-size: 13px;
  display: flex;
  gap: 12px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #9E9E9E;
  font-size: 12px;
  min-width: 140px;
}

.log-user {
  color: #1E88E5;
  font-weight: 500;
  min-width: 80px;
}

.log-action {
  color: #424242;
  flex: 1;
}

/* ==================== 自动填充样式 ==================== */
.auto-filled-input :deep(.el-input__inner) {
  background-color: #E3F2FD !important;
  border-color: #1E88E5 !important;
  font-weight: 600;
}

/* ==================== 药品监管码输入框样式 ==================== */
.scanned-input :deep(.el-input__inner) {
  background-color: #E8F5E9 !important;
  border-color: #43A047 !important;
}

/* ==================== 退出确认弹窗 ==================== */
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

/* ==================== 滚动条样式 ==================== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #BDBDBD;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #757575;
}

::-webkit-scrollbar-track {
  background: #F5F5F5;
}
</style>
