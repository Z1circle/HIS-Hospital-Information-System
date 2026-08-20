<template>
  <div class="stats-page">
    <div class="page-header">
      <div class="header-left">
        <el-icon class="back-icon" @click="$router.back()"><ArrowLeft /></el-icon>
        <h2>统计报表</h2>
      </div>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        placeholder="选择日期"
        value-format="YYYY-MM-DD"
        @change="loadStatistics"
        style="width: 180px"
      />
    </div>

    <!-- 核心指标卡片 -->
    <div class="stats-cards" v-loading="loading">
      <div class="stat-card blue">
        <div class="stat-icon"><el-icon :size="28"><User /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.today?.total_patients || 0 }}</div>
          <div class="stat-label">今日挂号</div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon"><el-icon :size="28"><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.today?.completed || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon"><el-icon :size="28"><Loading /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.today?.in_progress || 0 }}</div>
          <div class="stat-label">就诊中</div>
        </div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon"><el-icon :size="28"><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.today?.waiting || 0 }}</div>
          <div class="stat-label">候诊中</div>
        </div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon"><el-icon :size="28"><Money /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ stats.fee?.total_fee || '0.00' }}</div>
          <div class="stat-label">今日费用</div>
        </div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon"><el-icon :size="28"><Document /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.fee?.presc_count || 0 }}</div>
          <div class="stat-label">处方数</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 本周趋势 -->
      <div class="chart-card">
        <h3 class="chart-title">本周接诊趋势</h3>
        <div class="bar-chart">
          <div v-for="day in weekDays" :key="day.date" class="bar-item">
            <div class="bar-wrapper">
              <div
                class="bar"
                :style="{ height: getBarHeight(day.count) + '%' }"
              ></div>
            </div>
            <div class="bar-label">{{ day.label }}</div>
            <div class="bar-count">{{ day.count }}</div>
          </div>
        </div>
      </div>

      <!-- 疾病分布 -->
      <div class="chart-card">
        <h3 class="chart-title">今日疾病分布</h3>
        <div v-if="stats.diseaseDist?.length" class="disease-list">
          <div v-for="(item, idx) in stats.diseaseDist" :key="idx" class="disease-row">
            <div class="disease-name">{{ item.diagnosis || '未诊断' }}</div>
            <div class="disease-bar-wrap">
              <div
                class="disease-bar"
                :style="{ width: getDiseasePercent(item.count) + '%' }"
              ></div>
            </div>
            <div class="disease-count">{{ item.count }}例</div>
          </div>
        </div>
        <el-empty v-else description="暂无诊断数据" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ArrowLeft, User, CircleCheck, Loading, Clock, Money, Document } from '@element-plus/icons-vue'
import axios from 'axios'

const userStore = useUserStore()
const currentUser = userStore.currentUser

const loading = ref(false)
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const stats = ref<any>({
  today: {},
  weekTrend: [],
  fee: {},
  diseaseDist: []
})

const weekDays = computed(() => {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const trendMap = new Map<string, number>()
  for (const item of stats.value.weekTrend || []) {
    trendMap.set(item.date, parseInt(item.count))
  }
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push({
      date: dateStr,
      label: `周${days[d.getDay()]}`,
      count: trendMap.get(dateStr) || 0
    })
  }
  return result
})

const maxWeekCount = computed(() => {
  return Math.max(...weekDays.value.map(d => d.count), 1)
})

const maxDiseaseCount = computed(() => {
  if (!stats.value.diseaseDist?.length) return 1
  return Math.max(...stats.value.diseaseDist.map((d: any) => parseInt(d.count)))
})

const getBarHeight = (count: number) => {
  return (count / maxWeekCount.value) * 100
}

const getDiseasePercent = (count: number | string) => {
  return (Number(count) / maxDiseaseCount.value) * 100
}

const loadStatistics = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/doctor/statistics', {
      params: {
        doctor_id: currentUser.value?.doctor_id || currentUser.value?.id,
        date: selectedDate.value
      }
    })
    stats.value = res.data || { today: {}, weekTrend: [], fee: {}, diseaseDist: [] }
  } catch {
    // 静默失败
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-icon {
  font-size: 20px;
  cursor: pointer;
  color: #1E88E5;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #212121;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border-left: 4px solid;
}

.stat-card.blue { border-left-color: #1E88E5; }
.stat-card.green { border-left-color: #43A047; }
.stat-card.orange { border-left-color: #FB8C00; }
.stat-card.red { border-left-color: #E53935; }
.stat-card.purple { border-left-color: #7B1FA2; }
.stat-card.cyan { border-left-color: #00897B; }

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.blue .stat-icon { background: #E3F2FD; color: #1E88E5; }
.stat-card.green .stat-icon { background: #E8F5E9; color: #43A047; }
.stat-card.orange .stat-icon { background: #FFF3E0; color: #FB8C00; }
.stat-card.red .stat-icon { background: #FFEBEE; color: #E53935; }
.stat-card.purple .stat-icon { background: #F3E5F5; color: #7B1FA2; }
.stat-card.cyan .stat-icon { background: #E0F2F1; color: #00897B; }

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: #212121;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #9E9E9E;
  margin-top: 2px;
}

/* 图表区域 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.chart-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: #212121;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0F0F0;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 220px;
  padding-top: 20px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}

.bar-wrapper {
  flex: 1;
  width: 36px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #42A5F5, #1E88E5);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
}

.bar-label {
  margin-top: 8px;
  font-size: 12px;
  color: #757575;
}

.bar-count {
  font-size: 13px;
  font-weight: 700;
  color: #1E88E5;
  margin-top: 4px;
}

/* 疾病分布 */
.disease-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disease-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.disease-name {
  width: 160px;
  font-size: 14px;
  color: #424242;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.disease-bar-wrap {
  flex: 1;
  height: 20px;
  background: #F5F7FA;
  border-radius: 10px;
  overflow: hidden;
}

.disease-bar {
  height: 100%;
  background: linear-gradient(90deg, #42A5F5, #1E88E5);
  border-radius: 10px;
  transition: width 0.5s ease;
  min-width: 4px;
}

.disease-count {
  width: 60px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #1E88E5;
  flex-shrink: 0;
}
</style>
