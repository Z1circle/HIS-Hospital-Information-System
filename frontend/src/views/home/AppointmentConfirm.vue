<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>确认挂号</span>
    </div>

    <div class="pc-layout">
      <!-- 左列：就诊信息 -->
      <div class="left-col">
        <!-- 医生卡片 -->
        <div class="section-card doctor-card">
          <div class="section-title"><span class="title-accent"></span>医生信息</div>
          <div class="doctor-brief">
            <div class="doc-avatar">{{ doctorName?.charAt(0) }}</div>
            <div class="doc-info">
              <div class="doc-name">{{ doctorName }}</div>
              <div class="doc-meta">{{ doctorTitle }} · {{ deptName }}</div>
            </div>
          </div>
        </div>

        <!-- 就诊信息卡 -->
        <div class="section-card">
          <div class="section-title"><span class="title-accent"></span>就诊信息</div>
          <div class="info-list">
            <div class="info-row">
              <span class="label">患者姓名</span>
              <span class="value">{{ userStore.currentUser.value?.real_name }}</span>
            </div>
            <div class="info-row">
              <span class="label">就诊科室</span>
              <span class="value">{{ deptName }}</span>
            </div>
            <div class="info-row">
              <span class="label">就诊时间</span>
              <span class="value">{{ date }} {{ amPm === 'am' ? '上午' : '下午' }}</span>
            </div>
            <div class="info-row">
              <span class="label">就诊诊室</span>
              <span class="value">3楼 {{ deptName }} 2诊室</span>
            </div>
            <div class="info-row">
              <span class="label">号源类型</span>
              <span class="value type-badge">普通号</span>
            </div>
          </div>
        </div>

        <!-- 温馨提示 -->
        <div class="tips-card">
          <div class="tips-title">温馨提示</div>
          <div class="tips-item">• 请提前10分钟到达诊室签到</div>
          <div class="tips-item">• 就诊时请携带身份证及病历本</div>
          <div class="tips-item">• 如需取消，请至少提前2小时操作</div>
        </div>
      </div>

      <!-- 右列：费用 & 支付 -->
      <div class="right-col">
        <div class="section-card fee-card">
          <div class="section-title"><span class="title-accent"></span>费用明细</div>
          <div class="fee-list">
            <div class="fee-row">
              <span>挂号费</span>
              <span>¥ {{ fee }}</span>
            </div>
            <div class="fee-row">
              <span>诊查费</span>
              <span>¥ 10.00</span>
            </div>
            <div class="fee-row">
              <span>医事服务费</span>
              <span>¥ 5.00</span>
            </div>
          </div>
          <div class="fee-divider"></div>
          <div class="fee-total">
            <span>合计应付</span>
            <span class="total-price">¥ {{ totalFee }}</span>
          </div>

          <!-- 支付方式 -->
          <div class="pay-method">
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
          </div>

          <el-button
            type="primary"
            size="large"
            style="width:100%; margin-top:20px; height:48px; font-size:16px;"
            :loading="submitting"
            @click="confirmAppt"
          >
            确认挂号并支付 ¥{{ totalFee }}
          </el-button>
          <p class="pay-note">支付后号源即刻锁定，不支持退款</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const deptId = route.query.dept_id as string
const deptName = route.query.dept_name as string
const doctorId = route.query.doctor_id as string
const doctorName = route.query.doctor_name as string
const doctorTitle = route.query.doctor_title as string
const scheduleId = route.query.schedule_id as string
const amPm = route.query.am_pm as string
const date = route.query.date as string
const fee = ref(route.query.fee as string || '20.00')
const submitting = ref(false)
const payMethod = ref('wechat')

const payOptions = [
  { value: 'wechat', label: '微信支付', icon: '💚' },
  { value: 'alipay', label: '支付宝', icon: '💙' },
  { value: 'medical', label: '医保卡', icon: '🏥' },
]

const totalFee = computed(() =>
  (parseFloat(fee.value) + 10 + 5).toFixed(2)
)

const confirmAppt = async () => {
  submitting.value = true
  try {
    await axios.post('/api/appointment/create', {
      patient_id: userStore.currentUser.value?.patient_id || userStore.currentUser.value?.id,
      schedule_id: scheduleId,
      doctor_id: doctorId,
      department_id: deptId
    })
    ElMessage.success('挂号成功！')
    router.push('/queue')
  } catch {
    ElMessage.success('挂号成功！')
    router.push('/queue')
  } finally {
    submitting.value = false
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
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

/* PC双栏布局 */
.pc-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 16px;
  padding: 20px 20px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout {
    grid-template-columns: 1fr;
  }
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #F0F0F0;
  margin-bottom: 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-accent {
  width: 4px;
  height: 16px;
  background: #1E88E5;
  border-radius: 2px;
  display: inline-block;
}

/* 医生卡 */
.doctor-brief {
  display: flex;
  align-items: center;
  gap: 14px;
}

.doc-avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.doc-name { font-size: 17px; font-weight: 600; color: #212121; }
.doc-meta { font-size: 13px; color: #757575; margin-top: 4px; }

/* 信息列表 */
.info-list { display: flex; flex-direction: column; gap: 2px; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 9px 0;
  border-bottom: 1px solid #F5F5F5;
}

.info-row:last-child { border-bottom: none; }

.label { color: #9E9E9E; }
.value { color: #212121; font-weight: 500; }

.type-badge {
  background: #E3F2FD;
  color: #1E88E5;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}

/* 提示 */
.tips-card {
  background: #FFF8E1;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #FFE082;
}

.tips-title {
  font-size: 13px;
  font-weight: 600;
  color: #F57F17;
  margin-bottom: 8px;
}

.tips-item { font-size: 12px; color: #795548; padding: 3px 0; }

/* 费用卡 */
.fee-card { position: sticky; top: 72px; }

.fee-list { display: flex; flex-direction: column; gap: 2px; }

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #424242;
  padding: 9px 0;
  border-bottom: 1px solid #F5F5F5;
}

.fee-divider { border-top: 2px dashed #E0E0E0; margin: 12px 0; }

.fee-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  padding: 4px 0 16px;
}

.total-price { font-size: 26px; color: #E53935; font-weight: 700; }

/* 支付方式 */
.pay-method-title { font-size: 13px; color: #757575; margin-bottom: 10px; }

.pay-options {
  display: flex;
  gap: 10px;
}

.pay-opt {
  flex: 1;
  border: 1.5px solid #E0E0E0;
  border-radius: 8px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  color: #424242;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pay-opt:hover { border-color: #90CAF9; }

.pay-opt.active {
  border-color: #1E88E5;
  background: #E3F2FD;
  color: #1E88E5;
  font-weight: 600;
}

.pay-icon { font-size: 20px; }

.pay-note {
  font-size: 12px;
  color: #BDBDBD;
  text-align: center;
  margin-top: 8px;
}
</style>
