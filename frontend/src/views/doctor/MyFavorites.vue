<template>
  <div class="my-favorites-page">
    <div class="page-header">
      <el-button size="small" @click="$emit('back')" icon="ArrowLeft">返回</el-button>
      <h2>我的关注</h2>
    </div>

    <div class="stats-row">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon">👤</div>
        <div class="stat-info">
          <div class="stat-value">{{ totalFavorites }}</div>
          <div class="stat-label">关注患者</div>
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <div class="stat-value">{{ recentVisits }}</div>
          <div class="stat-label">本月就诊</div>
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon">🔔</div>
        <div class="stat-info">
          <div class="stat-value">{{ needFollowup }}</div>
          <div class="stat-label">待随访</div>
        </div>
      </el-card>
    </div>

    <div class="filter-tabs">
      <el-tabs v-model="activeTab" @tab-change="loadFavorites">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待随访" name="followup" />
        <el-tab-pane label="本月就诊" name="monthly" />
        <el-tab-pane label="慢性病患者" name="chronic" />
      </el-tabs>
    </div>

    <div class="favorites-list">
      <el-card shadow="hover" v-for="item in favorites" :key="item.patient_id">
        <div class="favorite-item">
          <div class="patient-avatar">
            <el-icon size="40"><UserFilled /></el-icon>
          </div>
          <div class="patient-info">
            <div class="patient-name">
              {{ item.name }}
              <span class="patient-gender">{{ item.gender }}</span>
              <span class="patient-age">{{ item.age }}岁</span>
              <el-tag v-if="item.chronic_disease" type="warning" size="small">慢病</el-tag>
            </div>
            <div class="patient-meta">
              <span>{{ item.insurance_type }}</span>
              <span>{{ item.phone }}</span>
            </div>
            <div class="recent-visit" v-if="item.last_visit">
              <span>最近就诊：{{ item.last_visit }}</span>
            </div>
          </div>
          <div class="favorite-actions">
            <el-button size="small" @click="viewDetail(item)">查看</el-button>
            <el-button size="small" type="primary" @click="quickVisit(item)">接诊</el-button>
            <el-button size="small" @click="removeFavorite(item.patient_id)">取消关注</el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-if="favorites.length === 0 && !loading" description="暂无关注患者" :image-size="100" />
      <el-loading v-if="loading" fullscreen />
    </div>

    <el-dialog v-model="detailVisible" :title="`患者详情 - ${selectedPatient?.name}`" width="600px">
      <el-descriptions :column="2" border v-if="selectedPatient">
        <el-descriptions-item label="姓名">{{ selectedPatient.name }}</el-descriptions-item>
        <el-descriptions-item label="性别/年龄">{{ selectedPatient.gender }} / {{ selectedPatient.age }}岁</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ selectedPatient.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="医保类型">{{ selectedPatient.insurance_type }}</el-descriptions-item>
        <el-descriptions-item label="过敏史" v-if="selectedPatient.allergy">
          <el-tag type="danger" size="small">{{ selectedPatient.allergy }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="慢性病" v-if="selectedPatient.chronic_disease">
          <el-tag type="warning" size="small">{{ selectedPatient.chronic_disease }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="visit-history" v-if="visitHistory.length > 0">
        <el-divider content-position="left">就诊记录</el-divider>
        <el-timeline>
          <el-timeline-item v-for="(visit, index) in visitHistory" :key="index">
            <div>{{ visit.date }} - {{ visit.department }} - {{ visit.diagnosis }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div class="detail-actions" v-if="selectedPatient">
        <el-button type="primary" @click="quickVisit(selectedPatient)">快速接诊</el-button>
        <el-button @click="addFollowup">添加随访记录</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { UserFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const { currentUser } = useUserStore()

const loading = ref(false)
const activeTab = ref('all')
const detailVisible = ref(false)
const selectedPatient = ref<any>(null)
const favorites = ref<any[]>([])

const visitHistory = ref<any[]>([
  { date: '2024-01-15', department: '中医科', diagnosis: '慢性胃炎' },
  { date: '2024-02-20', department: '中医科', diagnosis: '慢性胃炎复诊' },
  { date: '2024-03-25', department: '中医科', diagnosis: '脾胃虚弱' }
])

const totalFavorites = computed(() => favorites.value.length)
const recentVisits = computed(() => favorites.value.filter(f => f.lastVisit).length)
const needFollowup = computed(() => favorites.value.filter(f => f.needFollowup).length)

const loadFavorites = async () => {
  loading.value = true
  try {
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id || 0
    console.log('加载关注列表，医生ID:', doctorId)
    
    if (doctorId === 0) {
      ElMessage.warning('未获取到医生ID')
      favorites.value = []
      return
    }
    
    const res = await axios.get('/api/doctor/favorites', {
      params: { doctor_id: doctorId }
    })
    console.log('API响应:', res.data)
    favorites.value = res.data || []
  } catch (error: any) {
    console.error('加载关注列表失败:', error)
    ElMessage.error(error.response?.data?.error || '加载关注列表失败')
    favorites.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadFavorites)

const viewDetail = (patient: any) => {
  selectedPatient.value = patient
  detailVisible.value = true
}

const quickVisit = (patient: any) => {
  ElMessage.success(`已快速接诊患者：${patient.name}`)
  router.push('/doctor/outpatient')
}

const removeFavorite = async (patient_id: number) => {
  try {
    await ElMessageBox.confirm('确定取消关注该患者吗？', '提示', { type: 'warning' })
    await axios.delete(`/api/doctor/favorites/${patient_id}`, {
      params: { doctor_id: currentUser.value?.id || 0 }
    })
    favorites.value = favorites.value.filter(f => f.patient_id !== patient_id)
    ElMessage.success('已取消关注')
  } catch {
    // 用户取消
  }
}

const addFollowup = () => {
  ElMessage.success('随访记录已添加')
  detailVisible.value = false
}

loadFavorites()
</script>

<style scoped>
.my-favorites-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 40px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1E88E5;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.filter-tabs {
  margin-bottom: 20px;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.patient-avatar {
  flex-shrink: 0;
  color: #1E88E5;
}

.patient-info {
  flex: 1;
}

.patient-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.patient-gender,
.patient-age {
  font-size: 14px;
  color: #909399;
  margin-left: 8px;
}

.patient-meta {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.patient-meta span {
  margin-right: 16px;
}

.recent-visit {
  font-size: 13px;
  color: #606266;
}

.favorite-actions {
  display: flex;
  gap: 8px;
}

.visit-history {
  margin-top: 16px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>