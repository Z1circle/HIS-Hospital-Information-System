<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>复诊挂号</span>
    </div>

    <div class="main-content" v-loading="loading">
      <div class="left-panel">
        <div class="tab-bar">
          <div 
            :class="['tab-item', activeTab === 'visited' ? 'active' : '']"
            @click="activeTab = 'visited'"
          >已就诊</div>
          <div 
            :class="['tab-item', activeTab === 'favorite' ? 'active' : '']"
            @click="activeTab = 'favorite'"
          >我的关注</div>
        </div>

        <div class="doctor-list">
          <el-empty
            v-if="!loading && filteredDoctors.length === 0"
            description="暂无就诊记录"
            :image-size="60"
          />
          <div 
            v-for="doctor in filteredDoctors" 
            :key="doctor.id" 
            :class="['doctor-item', selectedDoctor?.id === doctor.id ? 'selected' : '']"
            @click="selectDoctor(doctor)"
          >
            <div class="item-avatar">{{ doctor.name.charAt(0) }}</div>
            <div class="item-info">
              <div class="item-name">{{ doctor.name }}</div>
              <div class="item-title">{{ doctor.title }} · {{ doctor.department_name }}</div>
              <div class="item-visit">上次就诊：{{ doctor.last_visit_date || '-' }}</div>
            </div>
            <el-icon v-if="selectedDoctor?.id === doctor.id" color="#1E88E5"><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="selectedDoctor" class="detail-card">
          <div class="detail-header">
            <div class="detail-avatar">{{ selectedDoctor.name.charAt(0) }}</div>
            <div class="detail-title">
              <div class="detail-name">{{ selectedDoctor.name }}</div>
              <div class="detail-position">{{ selectedDoctor.title }} · {{ selectedDoctor.department_name }}</div>
            </div>
          </div>
          
          <el-divider />
          
          <div class="detail-section">
            <div class="section-label">专业擅长</div>
            <div class="section-content">{{ selectedDoctor.specialty || '暂无专长' }}</div>
          </div>

          <div class="detail-section">
            <div class="section-label">医生简介</div>
            <div class="section-content intro-text">{{ selectedDoctor.biography || selectedDoctor.introduction || '暂无简介' }}</div>
          </div>

          <div class="detail-section">
            <div class="section-label">上次就诊信息</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">就诊日期</span>
                <span class="info-value">{{ selectedDoctor.last_visit_date || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">诊断结果</span>
                <span class="info-value">{{ selectedDoctor.last_diagnosis || '暂无' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-action">
            <el-button type="primary" size="large" @click="goAppointment(selectedDoctor)">
              立即挂号
            </el-button>
          </div>
        </div>

        <div v-else class="empty-card">
          <div class="empty-icon">👨‍⚕️</div>
          <div class="empty-text">选择左侧医生查看详情</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

import { ArrowLeft, Check } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const { currentUser } = useUserStore()
const loading = ref(false)
const doctorList = ref<any[]>([])
const favoriteList = ref<any[]>([])
const activeTab = ref('visited')
const selectedDoctor = ref<any>(null)

const filteredDoctors = computed(() => {
  return activeTab.value === 'visited' ? doctorList.value : favoriteList.value
})

const loadDoctorList = async () => {
  loading.value = true
  try {
    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    const res = await axios.get('/api/patient/visit-doctors', {
      params: { patient_id: patientId }
    })
    doctorList.value = res.data || []
    if (doctorList.value.length > 0) {
      selectedDoctor.value = doctorList.value[0]
    }
  } catch (err) {
    console.error('加载就诊医生失败:', err)
    doctorList.value = []
  }
  loading.value = false
}

const loadFavorites = async () => {
  try {
    const patientId = currentUser.value?.patient_id || currentUser.value?.id
    const res = await axios.get('/api/patient/favorites', {
      params: { patient_id: patientId }
    })
    favoriteList.value = res.data || []
  } catch (err) {
    console.error('加载关注医生失败:', err)
    favoriteList.value = []
  }
}

const selectDoctor = (doctor: any) => {
  selectedDoctor.value = doctor
}

const goAppointment = (doctor: any) => {
  router.push({
    path: '/appointment/confirm',
    query: {
      doctor_id: doctor.id,
      department_id: doctor.department_id
    }
  })
}

onMounted(() => {
  loadDoctorList()
  loadFavorites()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F7FA;
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

.main-content {
  display: flex;
  min-height: calc(100vh - 52px);
}

.left-panel {
  width: 380px;
  background: white;
  border-right: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  padding: 12px 16px 0;
  gap: 8px;
  border-bottom: 1px solid #E5E7EB;
}

.tab-item {
  padding: 8px 16px;
  font-size: 14px;
  color: #64748B;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab-item.active {
  color: #1E88E5;
  font-weight: 600;
  border-bottom: 2px solid #1E88E5;
  background: #F0F7FF;
}

.tab-item:hover {
  background: #F9FAFB;
}

.doctor-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.doctor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.doctor-item:hover {
  background: #F9FAFB;
}

.doctor-item.selected {
  background: #E3F2FD;
}

.item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 2px;
}

.item-title {
  font-size: 12px;
  color: #64748B;
  margin-bottom: 2px;
}

.item-visit {
  font-size: 12px;
  color: #9E9E9E;
}

.right-panel {
  flex: 1;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.detail-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}

.detail-title {
  flex: 1;
}

.detail-name {
  font-size: 20px;
  font-weight: 700;
  color: #212121;
}

.detail-position {
  font-size: 14px;
  color: #1E88E5;
  margin-top: 4px;
}

.detail-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  color: #64748B;
  margin-bottom: 6px;
  display: block;
}

.section-content {
  font-size: 14px;
  color: #424242;
  line-height: 1.6;
}

.intro-text {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #F9FAFB;
  border-radius: 6px;
}

.info-label {
  font-size: 13px;
  color: #64748B;
}

.info-value {
  font-size: 13px;
  color: #424242;
  font-weight: 500;
}

.detail-action {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.detail-action .el-button {
  width: 200px;
}

.empty-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  padding: 60px 24px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #9E9E9E;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #E5E7EB;
  }
  
  .doctor-list {
    max-height: 300px;
  }
  
  .right-panel {
    padding: 16px;
  }
}
</style>