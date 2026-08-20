﻿<template>
  <div class="register-page">
    <header class="page-header">
      <div class="back-btn" @click="goBack">←</div>
      <h1>预约挂号</h1>
      <div class="placeholder"></div>
    </header>
    
    <!-- 多人抢号提示 -->
    <div v-if="competitorCount > 0" class="competition-alert">
      <span class="alert-icon">🔥</span>
      <span>当前有 {{ competitorCount }} 人在抢号，请尽快完成预约！</span>
    </div>
    
    <div class="card-section">
      <div class="card-item" @click="showPatientModal = true">
        <div class="card-icon">{{ selectedPatient ? selectedPatient.avatar : '⊛' }}</div>
        <div class="card-info">
          <p class="card-title">{{ selectedPatient ? selectedPatient.name : '就诊人信息' }}</p>
          <p class="card-text">{{ selectedPatient ? `${selectedPatient.gender} ${selectedPatient.age}岁 ${selectedPatient.idCard}` : '点击选择就诊人' }}</p>
        </div>
        <div class="card-arrow">›</div>
      </div>
    </div>

    <div class="section" v-if="bookingStep === 'selectDept'">
      <h2 class="section-title">选择科室</h2>
      <div class="department-list">
        <div class="dept-item" v-for="dept in departments" :key="dept.name" @click="selectDept(dept)">
          <div class="dept-icon">{{ dept.icon }}</div>
          <div class="dept-info">
            <p class="dept-name">{{ dept.name }}</p>
            <p class="dept-count">{{ dept.count }}位医生可预约</p>
          </div>
        </div>
      </div>
    </div>

    <div class="section" v-if="bookingStep === 'selectDoctor' && selectedDept">
      <h2 class="section-title">{{ selectedDept.name }} - 选择医生</h2>
      <div class="doctor-list">
        <div class="doctor-item" v-for="doctor in doctors" :key="doctor.name" @click="selectDoctor(doctor)">
          <div class="doctor-avatar">{{ doctor.avatar }}</div>
          <div class="doctor-info">
            <p class="doctor-name">{{ doctor.name }}</p>
            <p class="doctor-title">{{ doctor.title }}</p>
            <p class="doctor-hospital">{{ doctor.hospital }}</p>
          </div>
          <div class="doctor-action">
            <span class="fee">{{ doctor.fee }}元</span>
            <span class="select-text">选择</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 就诊人选择弹窗 -->
    <div class="modal-overlay" v-if="showPatientModal" @click="showPatientModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header"><h3>选择就诊人</h3><span class="modal-close" @click="showPatientModal = false">×</span></div>
        <div class="modal-body">
          <div class="patient-list">
            <div :class="['patient-item', selectedPatient?.id === patient.id ? 'selected' : '']" v-for="patient in patients" :key="patient.id" @click="selectPatient(patient)">
              <div class="patient-avatar">{{ patient.avatar }}</div>
              <div class="patient-info">
                <div class="patient-name-row">
                  <span class="patient-name">{{ patient.name }}</span>
                  <span class="patient-tag">{{ patient.gender }} {{ patient.age }}岁</span>
                </div>
                <p class="patient-id">{{ patient.idCard }}</p>
              </div>
              <div v-if="selectedPatient?.id === patient.id" class="patient-check">✓</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn submit" @click="addPatient">添加就诊人</button>
        </div>
      </div>
    </div>

    <!-- 添加就诊人弹窗 -->
    <div class="modal-overlay" v-if="showAddPatientModal" @click="showAddPatientModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header"><h3>添加就诊人</h3><span class="modal-close" @click="showAddPatientModal = false">×</span></div>
        <div class="modal-body">
          <div class="form-item">
            <label>姓名</label>
            <input type="text" v-model="newPatient.name" placeholder="请输入姓名" />
          </div>
          <div class="form-item">
            <label>身份证号</label>
            <input type="text" v-model="newPatient.idCard" placeholder="请输入身份证号" />
          </div>
          <div class="form-item">
            <label>性别</label>
            <div class="gender-options">
              <div :class="['gender-option', newPatient.gender === '男' ? 'active' : '']" @click="newPatient.gender = '男'">男</div>
              <div :class="['gender-option', newPatient.gender === '女' ? 'active' : '']" @click="newPatient.gender = '女'">女</div>
            </div>
          </div>
          <div class="form-item">
            <label>年龄</label>
            <input type="number" v-model="newPatient.age" placeholder="请输入年龄" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showAddPatientModal = false">取消</button>
          <button class="modal-btn submit" @click="submitAddPatient">确认添加</button>
        </div>
      </div>
    </div>

    <!-- 确认预约弹窗 -->
    <div class="modal-overlay" v-if="showConfirmModal" @click="!isBooking && (showConfirmModal = false)">
      <div class="modal-content confirm-modal" @click.stop>
        <div class="modal-header"><h3>确认预约</h3><span class="modal-close" v-if="!isBooking" @click="showConfirmModal = false">×</span></div>
        
        <!-- 抢号进度 -->
        <div v-if="isBooking" class="booking-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: bookingProgress + '%' }"></div>
          </div>
          <p class="progress-text">{{ bookingStatus }}</p>
          <p class="progress-hint" v-if="competitorCount > 0">⚡ 检测到 {{ competitorCount }} 个竞争者！</p>
        </div>
        
        <div class="modal-body" v-if="selectedDoctor && !isBooking">
          <div class="confirm-section">
            <h4>就诊人信息</h4>
            <div class="confirm-item">
              <span class="label">姓名:</span>
              <span>{{ selectedPatient?.name || '未选择' }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">性别:</span>
              <span>{{ selectedPatient?.gender || '-' }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">年龄:</span>
              <span>{{ selectedPatient?.age || '-' }}岁</span>
            </div>
          </div>
          <div class="confirm-section">
            <h4>预约信息</h4>
            <div class="confirm-item">
              <span class="label">科室:</span>
              <span>{{ selectedDept?.name }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">医生:</span>
              <span>{{ selectedDoctor.name }} {{ selectedDoctor.title }}</span>
            </div>
            <div class="confirm-item">
              <span class="label">就诊时间:</span>
              <span @click="showScheduleModal = true" class="schedule-select">{{ selectedSchedule || '请选择时间' }} ›</span>
            </div>
          </div>
          <div class="confirm-section">
            <h4>费用信息</h4>
            <div class="confirm-item total">
              <span class="label">挂号费:</span>
              <span class="fee-amount">¥{{ selectedDoctor.fee }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer" v-if="!isBooking">
          <button class="modal-btn cancel" @click="showConfirmModal = false">取消</button>
          <button class="modal-btn submit" @click="confirmBooking">确认预约</button>
        </div>
      </div>
    </div>

    <!-- 时间选择弹窗（显示实时号源状态） -->
    <div class="modal-overlay" v-if="showScheduleModal" @click="showScheduleModal = false">
      <div class="modal-content schedule-modal" @click.stop>
        <div class="modal-header"><h3>选择就诊时间</h3><span class="modal-close" @click="showScheduleModal = false">×</span></div>
        <div class="modal-body" v-if="selectedDoctor">
          <div class="schedule-tips">
            <span class="tip-item"><span class="dot available"></span> 有号</span>
            <span class="tip-item"><span class="dot limited"></span> 紧张</span>
            <span class="tip-item"><span class="dot full"></span> 约满</span>
            <span class="tip-item"><span class="dot locking"></span> 有人抢</span>
          </div>
          <div class="schedule-list">
            <div :class="getSlotClass(item)" 
                 v-for="item in selectedDoctor.schedule" :key="item" 
                 @click="selectAndClose(item)">
              <div class="schedule-time">{{ item }}</div>
              <div class="schedule-status">
                <span v-if="getSlotStatus(item).remaining === 0" class="status-badge full">约满</span>
                <span v-else-if="getSlotStatus(item).remaining <= 2" class="status-badge limited">仅剩{{ getSlotStatus(item).remaining }}</span>
                <span v-else class="status-badge available">可预约</span>
                <span v-if="getSlotStatus(item).myLock" class="status-badge my-lock">我锁定</span>
                <span v-else-if="getSlotStatus(item).locked" class="status-badge locking">🔥抢号中</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn submit" @click="showScheduleModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 预约成功弹窗 -->
    <div class="modal-overlay" v-if="showSuccessModal" @click="closeSuccessModal">
      <div class="modal-content success" @click.stop>
        <div class="success-icon">✓</div>
        <h3>预约成功</h3>
        <p>请按时前往医院就诊</p>
        <button class="modal-btn submit" @click="closeSuccessModal">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { appointmentService, type TimeSlot } from '@/services/appointment'
import axios from 'axios'

const router = useRouter()

// 从API获取科室和医生数据
const departments = ref<any[]>([])
const doctors = ref<any[]>([])

const loadDeptAndDoctors = async () => {
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data || []
  } catch (error) {
    console.error('加载科室数据失败:', error)
  }
}

const selectedDept = ref<typeof departments.value[0] | null>(null)
const bookingStep = ref('selectDept')
const selectedDoctor = ref<typeof doctors.value[0] | null>(null)
const showConfirmModal = ref(false)
const showSuccessModal = ref(false)
const showPatientModal = ref(false)
const showScheduleModal = ref(false)
const selectedPatient = ref<typeof patients.value[0] | null>(null)
const selectedSchedule = ref('')

// 抢号状态
const isBooking = ref(false)
const bookingStatus = ref('')
const bookingProgress = ref(0)
const competitorCount = ref(0)
const slotStatuses = ref<Map<string, { remaining: number; locked: boolean; myLock: boolean }>>(new Map())

const patients = ref([
  { id: 1, name: '赵伟', idCard: '11010119900101****', avatar: '赵', gender: '男', age: 34 },
  { id: 2, name: '李小红', idCard: '11010119950202****', avatar: '李', gender: '女', age: 29 }
])

const selectPatient = (patient: typeof patients.value[0]) => {
  selectedPatient.value = patient
  showPatientModal.value = false
}

const addPatient = () => {
  showPatientModal.value = false
  showAddPatientModal.value = true
}

const showAddPatientModal = ref(false)
const newPatient = ref({
  name: '',
  idCard: '',
  gender: '男',
  age: ''
})

const submitAddPatient = () => {
  if (!newPatient.value.name || !newPatient.value.idCard || !newPatient.value.age) {
    alert('请填写完整信息')
    return
  }
  patients.value.push({
    id: patients.value.length + 1,
    name: newPatient.value.name,
    idCard: newPatient.value.idCard.slice(0, 8) + '****',
    avatar: newPatient.value.name.charAt(0),
    gender: newPatient.value.gender,
    age: parseInt(newPatient.value.age)
  })
  showAddPatientModal.value = false
  newPatient.value = { name: '', idCard: '', gender: '男', age: '' }
  alert('添加成功')
}

const goBack = () => {
  if (bookingStep.value === 'selectDoctor') {
    bookingStep.value = 'selectDept'
    selectedDoctor.value = null
    slotStatuses.value.clear()
  } else {
    router.back()
  }
}

const selectDept = (dept: typeof departments.value[0]) => {
  selectedDept.value = dept
  bookingStep.value = 'selectDoctor'
}

const selectDoctor = (doctor: typeof doctors.value[0]) => {
  selectedDoctor.value = doctor
  
  // 初始化号源
  appointmentService.initSlots(doctor.id, doctor.name, doctor.schedule, 5)
  
  // 更新号源状态
  updateSlotStatuses()
  
  showConfirmModal.value = true
}

const selectAndClose = (schedule: string) => {
  const status = getSlotStatus(schedule)
  if (status.remaining > 0 && !status.locked) {
    selectedSchedule.value = schedule
    showScheduleModal.value = false
  }
}

// 获取号源状态
const getSlotStatus = (time: string): { remaining: number; locked: boolean; myLock: boolean } => {
  return slotStatuses.value.get(time) || { remaining: 5, locked: false, myLock: false }
}

// 获取号源样式
const getSlotClass = (time: string): string => {
  const status = getSlotStatus(time)
  const classes = ['schedule-item']
  
  if (selectedSchedule.value === time) classes.push('selected')
  if (status.remaining === 0) classes.push('full')
  else if (status.remaining <= 2) classes.push('limited')
  else classes.push('available')
  
  if (status.myLock) classes.push('my-lock')
  else if (status.locked) classes.push('locking')
  
  return classes.join(' ')
}

// 更新所有号源状态
const updateSlotStatuses = () => {
  if (!selectedDoctor.value) return
  
  selectedDoctor.value.schedule.forEach((time: string) => {
    const slot = appointmentService.getSlot(selectedDoctor.value!.id, time)
    if (slot) {
      slotStatuses.value.set(time, {
        remaining: slot.remaining,
        locked: !!slot.lockHolder,
        myLock: slot.lockHolder === appointmentService.getTabId()
      })
    }
  })
}

// 监听预约事件
const handleBookingStart = ({ slotId }: { slotId: string }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    competitorCount.value++
    updateSlotStatuses()
  }
}

const handleSlotLocked = ({ slotId }: { slotId: string }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    updateSlotStatuses()
  }
}

const handleBookingSuccess = ({ slotId }: { slotId: string }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    updateSlotStatuses()
    competitorCount.value = Math.max(0, competitorCount.value - 1)
  }
}

const handleBookingFailed = ({ slotId }: { slotId: string }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    updateSlotStatuses()
    competitorCount.value = Math.max(0, competitorCount.value - 1)
  }
}

const handleSlotReleased = ({ slotId }: { slotId: string }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    updateSlotStatuses()
  }
}

const handleStateUpdated = ({ slotId, slot }: { slotId: string; slot: TimeSlot }) => {
  if (selectedDoctor.value && slotId.startsWith(selectedDoctor.value.id)) {
    slotStatuses.value.set(slot.time, {
      remaining: slot.remaining,
      locked: !!slot.lockHolder,
      myLock: slot.lockHolder === appointmentService.getTabId()
    })
  }
}

onMounted(() => {
  // 加载科室和医生数据
  loadDeptAndDoctors()
  // 监听跨标签页事件
  appointmentService.on('booking_start', handleBookingStart)
  appointmentService.on('slot_locked', handleSlotLocked)
  appointmentService.on('booking_success', handleBookingSuccess)
  appointmentService.on('booking_failed', handleBookingFailed)
  appointmentService.on('slot_released', handleSlotReleased)
  appointmentService.on('state_updated', handleStateUpdated)
})

onUnmounted(() => {
  appointmentService.off('booking_start')
  appointmentService.off('slot_locked')
  appointmentService.off('booking_success')
  appointmentService.off('booking_failed')
  appointmentService.off('slot_released')
  appointmentService.off('state_updated')
})

const confirmBooking = async () => {
  if (!selectedPatient.value) {
    alert('请先选择就诊人')
    return
  }
  if (!selectedSchedule.value) {
    alert('请选择就诊时间')
    return
  }
  
  if (!selectedDoctor.value) return
  
  const slotId = `${selectedDoctor.value.id}_${selectedSchedule.value}`
  const slot = appointmentService.getSlot(selectedDoctor.value.id, selectedSchedule.value)
  
  if (!slot || slot.remaining <= 0) {
    alert('该号源已被抢完，请选择其他时间')
    return
  }
  
  isBooking.value = true
  bookingStatus.value = '正在抢号中...'
  bookingProgress.value = 10
  competitorCount.value = 0
  
  try {
    // 阶段1：开始抢号
    bookingStatus.value = '正在锁定号源...'
    bookingProgress.value = 30
    
    const result = await appointmentService.bookSlot(
      slotId,
      String(selectedPatient.value.id),
      selectedPatient.value.name
    )
    
    if (result.success) {
      // 阶段2：预约成功
      bookingStatus.value = '预约成功！'
      bookingProgress.value = 100
      showConfirmModal.value = false
      showSuccessModal.value = true
      
      // 清理状态
      setTimeout(() => {
        isBooking.value = false
        bookingStatus.value = ''
        bookingProgress.value = 0
      }, 1500)
    } else {
      // 预约失败
      bookingStatus.value = result.reason || '抢号失败'
      alert(result.reason || '抢号失败，该号源可能已被其他用户抢走')
      
      // 刷新号源状态
      updateSlotStatuses()
      
      setTimeout(() => {
        isBooking.value = false
        bookingStatus.value = ''
        bookingProgress.value = 0
      }, 1500)
    }
  } catch (error) {
    bookingStatus.value = '系统错误'
    alert('预约过程出错，请重试')
    isBooking.value = false
    bookingProgress.value = 0
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  bookingStep.value = 'selectDept'
  selectedDoctor.value = null
  selectedDept.value = null
  selectedSchedule.value = ''
  slotStatuses.value.clear()
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background: linear-gradient(180deg, #8B4513 0%, #D2691E 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  font-size: 24px;
  cursor: pointer;
}

.page-header h1 {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.placeholder {
  width: 24px;
}

/* 竞争提示 */
.competition-alert {
  background: linear-gradient(90deg, #ff6b6b 0%, #ff8e53 100%);
  color: white;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.alert-icon {
  font-size: 18px;
}

.card-section {
  padding: 16px;
}

.card-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.card-text {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #999;
}

.card-arrow {
  font-size: 20px;
  color: #999;
}

.section {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
}

.department-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.dept-item {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.dept-item:last-child {
  border-bottom: none;
}

.dept-item:active {
  background: #f5f5f5;
}

.dept-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.dept-info {
  flex: 1;
}

.dept-name {
  font-size: 15px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.dept-count {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

.doctor-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.doctor-item {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.doctor-item:last-child {
  border-bottom: none;
}

.doctor-item:active {
  background: #f5f5f5;
}

.doctor-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  font-weight: bold;
}

.doctor-info {
  flex: 1;
}

.doctor-name {
  font-size: 15px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.doctor-title {
  font-size: 13px;
  color: #666;
  margin: 4px 0 0 0;
}

.doctor-hospital {
  font-size: 12px;
  color: #999;
  margin: 2px 0 0 0;
}

.doctor-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.fee {
  font-size: 16px;
  font-weight: bold;
  color: #ff6b6b;
}

.select-text {
  font-size: 12px;
  color: #D2691E;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 100%;
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.modal-close {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  padding: 16px;
  display: flex;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 15px;
  border: none;
  cursor: pointer;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.submit {
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  color: white;
}

/* 就诊人列表 */
.patient-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patient-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  gap: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.patient-item.selected {
  border-color: #D2691E;
  background: #fff5f0;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
}

.patient-info {
  flex: 1;
}

.patient-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-name {
  font-weight: bold;
  color: #333;
}

.patient-tag {
  font-size: 12px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.patient-id {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

.patient-check {
  color: #D2691E;
  font-size: 18px;
  font-weight: bold;
}

/* 表单 */
.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.form-item input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.gender-options {
  display: flex;
  gap: 12px;
}

.gender-option {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
}

.gender-option.active {
  border-color: #D2691E;
  background: #fff5f0;
  color: #D2691E;
}

/* 确认弹窗 */
.confirm-section {
  margin-bottom: 16px;
}

.confirm-section h4 {
  font-size: 14px;
  color: #999;
  margin: 0 0 8px 0;
  text-transform: uppercase;
}

.confirm-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.confirm-item .label {
  color: #666;
}

.confirm-item.total {
  border-bottom: none;
  padding-top: 12px;
}

.confirm-item .fee-amount {
  font-size: 20px;
  font-weight: bold;
  color: #ff6b6b;
}

.schedule-select {
  color: #D2691E;
  cursor: pointer;
}

/* 预约进度 */
.booking-progress {
  padding: 24px 16px;
  text-align: center;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b 0%, #ff8e53 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.progress-hint {
  font-size: 14px;
  color: #ff6b6b;
  margin: 8px 0 0 0;
}

/* 时间选择 */
.schedule-tips {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 8px 0;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.available { background: #52c41a; }
.dot.limited { background: #faad14; }
.dot.full { background: #ff4d4f; }
.dot.locking { background: #ff6b6b; }

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.schedule-item.available:not(.locking):active {
  background: #e6f7e6;
}

.schedule-item.selected {
  border-color: #D2691E;
  background: #fff5f0;
}

.schedule-item.locking {
  background: #fff0f0;
}

.schedule-item.full {
  opacity: 0.5;
  cursor: not-allowed;
}

.schedule-item.my-lock {
  background: #e6f7ff;
  border-color: #1890ff;
}

.schedule-time {
  font-size: 14px;
  color: #333;
}

.schedule-status {
  display: flex;
  gap: 6px;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-badge.available {
  background: #d9f7be;
  color: #52c41a;
}

.status-badge.limited {
  background: #ffe58f;
  color: #faad14;
}

.status-badge.full {
  background: #ffccc7;
  color: #ff4d4f;
}

.status-badge.locking {
  background: #ff6b6b;
  color: white;
  animation: pulse 0.5s infinite;
}

.status-badge.my-lock {
  background: #1890ff;
  color: white;
}

/* 成功弹窗 */
.modal-content.success {
  text-align: center;
  padding: 32px 16px;
}

.success-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin: 0 auto 16px;
}

.modal-content.success h3 {
  font-size: 20px;
  color: #333;
  margin: 0 0 8px 0;
}

.modal-content.success p {
  font-size: 14px;
  color: #999;
  margin: 0 0 24px 0;
}
</style>
