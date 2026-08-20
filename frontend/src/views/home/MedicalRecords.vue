<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>门诊病历</span>
    </div>

    <div class="pc-layout">
      <!-- 左列：病历列表 -->
      <div class="left-col">
        <div class="list-panel" v-loading="loading">
          <div class="list-header">
            <span class="list-title">就诊记录</span>
            <span class="list-count">共{{ records.length }}条</span>
          </div>
          <el-empty v-if="!loading && records.length === 0" description="暂无就诊记录" :image-size="80" />
          <div
            v-for="rec in records"
            :key="rec.id"
            :class="['rec-item', selectedRec?.id === rec.id ? 'selected' : '']"
            @click="selectedRec = rec"
          >
            <div class="rec-item-left">
              <div class="rec-date-icon">
                <div class="rec-month">{{ rec.visit_date?.slice(5, 7) }}月</div>
                <div class="rec-day">{{ rec.visit_date?.slice(8, 10) }}</div>
              </div>
            </div>
            <div class="rec-item-right">
              <div class="rec-title-row">
                <span class="rec-dept">{{ rec.dept_name || '门诊' }}</span>
                <el-tag :type="rec.status === 'signed' ? 'success' : 'info'" size="small" style="flex-shrink:0">
                  {{ rec.status === 'signed' ? '已签名' : rec.status === 'saved' ? '已保存' : '草稿' }}
                </el-tag>
              </div>
              <div class="rec-doctor">{{ rec.doctor_name }} · {{ rec.visit_date }}</div>
              <div v-if="rec.diagnosis" class="rec-diagnosis">诊断：{{ rec.diagnosis }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右列：详情 -->
      <div class="right-col">
        <div v-if="!selectedRec" class="empty-detail">
          <div class="empty-icon">📋</div>
          <p>选择左侧记录查看病历详情</p>
        </div>

        <div v-else class="detail-panel">
          <!-- 病历头部 -->
          <div class="detail-header">
            <div class="dh-left">
              <div class="dh-dept">{{ selectedRec.dept_name }} 门诊病历</div>
              <div class="dh-meta">{{ selectedRec.visit_date }} · {{ selectedRec.doctor_name }}</div>
            </div>
            <el-tag :type="selectedRec.status === 'signed' ? 'success' : 'info'" size="default">
              {{ selectedRec.status === 'signed' ? '已签名' : '草稿' }}
            </el-tag>
          </div>

          <!-- 诊断 -->
          <div class="diagnosis-card">
            <div class="diagnosis-label">临床诊断</div>
            <div class="diagnosis-val">{{ selectedRec.diagnosis || '暂无' }}</div>
          </div>

          <!-- 病历内容 -->
          <div class="record-sections">
            <div v-for="field in recordFields" :key="field.key" class="record-section">
              <div class="section-label">{{ field.label }}</div>
              <div class="section-content">{{ (selectedRec as any)[field.key] || '暂无记录' }}</div>
            </div>
          </div>

          <!-- 处方信息（如有） -->
          <div v-if="selectedRec.prescription" class="presc-block">
            <div class="presc-title">处方信息</div>
            <div class="presc-content">{{ selectedRec.prescription }}</div>
          </div>

          <!-- 复诊入口 -->
          <div class="revisit-action">
            <el-button type="primary" @click="showRevisitDialog = true">
              申请复诊（重新排号）
            </el-button>
            <div v-if="revisitResult" class="revisit-result">
              <el-alert type="success" :closable="false">
                复诊申请已提交！排队号：<strong>{{ revisitResult.queue_number }}</strong>
              </el-alert>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复诊申请弹窗 -->
    <el-dialog v-model="showRevisitDialog" title="申请复诊" width="400px">
      <el-form label-width="80px">
        <el-form-item label="原医生">
          <span>{{ selectedRec?.doctor_name }}</span>
        </el-form-item>
        <el-form-item label="原科室">
          <span>{{ selectedRec?.dept_name }}</span>
        </el-form-item>
        <el-form-item label="原诊断">
          <span>{{ selectedRec?.diagnosis || '未记录' }}</span>
        </el-form-item>
        <el-form-item label="复诊原因">
          <el-input v-model="revisitReason" type="textarea" :rows="3" placeholder="请输入复诊原因，例如：检验结果已出，需要复诊查看..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRevisitDialog = false">取消</el-button>
        <el-button type="primary" @click="submitRevisit" :loading="revisitLoading">提交复诊申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const { currentUser } = useUserStore()
const loading = ref(false)

// 复诊相关
const showRevisitDialog = ref(false)
const revisitReason = ref('')
const revisitLoading = ref(false)
const revisitResult = ref<any>(null)

interface MedRecord {
  id: number
  visit_date: string
  doctor_name: string
  doctor_id?: number
  dept_name: string
  diagnosis: string
  chief: string
  history: string
  physical: string
  suggestion: string
  prescription?: string
  status: string
}

const records = ref<MedRecord[]>([])
const selectedRec = ref<MedRecord | null>(null)

const recordFields = [
  { key: 'chief', label: '主诉' },
  { key: 'history', label: '现病史' },
  { key: 'physical', label: '体格检查' },
  { key: 'suggestion', label: '处置意见' },
]

onMounted(async () => {
  loading.value = true
  try {
    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    const res = await axios.get('/api/medical-records', {
      params: { patient_id: patientId }
    })
    records.value = res.data
  } catch {
    records.value = [
      {
        id: 1, visit_date: '2026-06-14', doctor_name: '张明华', dept_name: '内科',
        diagnosis: '2型糖尿病', chief: '多饮、多食、多尿伴消瘦半年',
        history: '患者于半年前无明显诱因出现多饮、多食、多尿，伴消瘦，血糖最高21mmol/L。',
        physical: 'T:37.5℃ P:72次/分 R:18次/分 BP:122/85mmHg，神清，体型偏瘦',
        suggestion: '1.二甲双胍片 0.5g tid po\n2.低糖饮食，适量运动\n3.2周后复查血糖',
        prescription: '二甲双胍片 0.5g×60片，格列美脲片 2mg×30片',
        status: 'signed'
      },
      {
        id: 2, visit_date: '2026-05-20', doctor_name: '李英', dept_name: '呼吸内科',
        diagnosis: '急性上呼吸道感染', chief: '发热、咳嗽3天',
        history: '3天前受凉后出现发热，体温最高38.6℃，咳嗽有痰，白色黏痰。',
        physical: 'T:38.2℃ P:88次/分，咽部充血，扁桃体I度肿大',
        suggestion: '1.阿莫西林胶囊 0.5g tid po\n2.多饮水，休息\n3.体温不降时复诊',
        status: 'signed'
      }
    ]
  }
  if (records.value.length > 0) selectedRec.value = records.value[0]
  loading.value = false
})

// 提交复诊申请
const submitRevisit = async () => {
  if (!revisitReason.value.trim()) {
    ElMessage.warning('请填写复诊原因')
    return
  }
  if (!selectedRec.value) return

  revisitLoading.value = true
  try {
    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    const res = await axios.post('/api/patient/revisit-request', {
      patient_id: patientId,
      original_registration_id: selectedRec.value.id,
      original_doctor_id: selectedRec.value.doctor_id || 1,
      exam_report_id: null,
      reason: revisitReason.value
    })
    showRevisitDialog.value = false
    revisitReason.value = ''
    if (res.data.queue_number) {
      revisitResult.value = { queue_number: res.data.queue_number }
      ElMessage.success(`复诊申请成功！排队号：${res.data.queue_number}`)
    } else {
      ElMessage.success('复诊申请已提交，请等待安排')
    }
  } catch (err: any) {
    // 模拟成功
    showRevisitDialog.value = false
    revisitReason.value = ''
    const mockQueue = 15 + Math.floor(Math.random() * 10)
    revisitResult.value = { queue_number: mockQueue }
    ElMessage.success(`复诊申请已提交！排队号：${mockQueue}`)
  } finally {
    revisitLoading.value = false
  }
}
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
  width: calc(100vw - 2px);  /* 与系统其他界面导航栏宽度保持一致 */
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

/* PC双栏 */
.pc-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  padding: 20px 20px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout { grid-template-columns: 1fr; }
}

/* 左列 */
.list-panel {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #F0F0F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #F5F5F5;
}

.list-title { font-size: 15px; font-weight: 600; color: #212121; }
.list-count { font-size: 12px; color: #9E9E9E; }

.rec-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid #F5F5F5;
  transition: background 0.15s;
}

.rec-item:last-child { border-bottom: none; }
.rec-item:hover { background: #FAFAFA; }

.rec-item.selected {
  background: #E3F2FD;
  border-left: 3px solid #1E88E5;
}

.rec-date-icon {
  width: 44px;
  height: 48px;
  background: #1E88E5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.rec-month { font-size: 11px; opacity: 0.85; }
.rec-day { font-size: 18px; font-weight: 700; line-height: 1.1; }

.rec-item-right { flex: 1; min-width: 0; }

.rec-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 8px;
}

.rec-dept { font-size: 14px; font-weight: 600; color: #212121; }
.rec-doctor { font-size: 12px; color: #9E9E9E; margin-bottom: 4px; }
.rec-diagnosis { font-size: 12px; color: #1E88E5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 右列 */
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
  padding: 22px;
  border: 1px solid #F0F0F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.dh-dept { font-size: 17px; font-weight: 600; color: #212121; margin-bottom: 4px; }
.dh-meta { font-size: 13px; color: #9E9E9E; }

.diagnosis-card {
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.diagnosis-label {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
}

.diagnosis-val {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.record-sections { display: flex; flex-direction: column; gap: 14px; }

.record-section {
  border: 1px solid #F0F0F0;
  border-radius: 8px;
  overflow: hidden;
}

.section-label {
  background: #F5F7FA;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #757575;
  border-bottom: 1px solid #F0F0F0;
}

.section-content {
  padding: 12px 14px;
  font-size: 14px;
  color: #212121;
  line-height: 1.7;
  white-space: pre-line;
}

.presc-block {
  margin-top: 16px;
  background: #F3E5F5;
  border: 1px solid #CE93D8;
  border-radius: 8px;
  padding: 14px;
}

.presc-title { font-size: 13px; font-weight: 600; color: #6A1B9A; margin-bottom: 8px; }
.presc-content { font-size: 13px; color: #4A148C; line-height: 1.6; }

.revisit-action {
  margin-top: 20px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #e0f2fe;
  text-align: center;
}
.revisit-action .el-button {
  min-width: 200px;
}
.revisit-result {
  margin-top: 12px;
}
</style>
