<template>
  <div class="reserved-stats-page">
    <div class="page-header">
      <h2>预留号使用统计报表</h2>
      <div class="filter-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" />
        <el-select v-model="departmentId" placeholder="选择科室" size="small" style="width:150px">
          <el-option label="全部科室" :value="''" />
          <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
        <el-button type="primary" size="small" @click="loadStats">查询</el-button>
        <el-button size="small" @click="loadUsageRecords">查看使用记录</el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ totalUsed }}</div>
        <div class="stat-label">预留号总使用次数</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-value">{{ doctorUsed }}</div>
        <div class="stat-label">医生自留号使用</div>
      </div>
      <div class="stat-card red">
        <div class="stat-value">{{ emergencyUsed }}</div>
        <div class="stat-label">急诊预留号使用</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-value">{{ vipUsed }}</div>
        <div class="stat-label">VIP特需号使用</div>
      </div>
    </div>

    <!-- 使用趋势图 -->
    <div class="chart-section">
      <div class="chart-card">
        <h3>预留号使用趋势（按日期）</h3>
        <div class="trend-chart">
          <div v-for="item in dailyStats" :key="item.date" class="chart-bar-item">
            <div class="bar-container">
              <div class="bar-stack">
                <div class="bar doctor" :style="{ height: getBarHeight(item.doctor) + '%' }" title="医生自留号"></div>
                <div class="bar emergency" :style="{ height: getBarHeight(item.emergency) + '%' }" title="急诊预留号"></div>
                <div class="bar vip" :style="{ height: getBarHeight(item.vip) + '%' }" title="VIP特需号"></div>
              </div>
            </div>
            <div class="bar-label">{{ formatDate(item.date) }}</div>
            <div class="bar-total">{{ item.total }}</div>
          </div>
        </div>
        <div class="chart-legend">
          <span><span class="legend-dot doctor"></span>医生自留号</span>
          <span><span class="legend-dot emergency"></span>急诊预留号</span>
          <span><span class="legend-dot vip"></span>VIP特需号</span>
        </div>
      </div>
    </div>

    <!-- 医生使用排行 -->
    <div class="table-section">
      <div class="section-header">
        <h3>医生预留号使用排行</h3>
      </div>
      <el-table :data="doctorStats" stripe size="small">
        <el-table-column prop="rank" label="排名" width="60" />
        <el-table-column prop="doctor_name" label="医生姓名" />
        <el-table-column prop="total_used" label="总使用次数" />
        <el-table-column prop="doctor_used" label="医生自留号" />
        <el-table-column prop="emergency_used" label="急诊预留号" />
        <el-table-column prop="vip_used" label="VIP特需号" />
      </el-table>
    </div>

    <!-- 使用记录弹窗 -->
    <el-dialog v-model="usageVisible" title="预留号使用记录" width="800px">
      <div class="filter-bar" style="margin-bottom:16px">
        <el-select v-model="filterType" placeholder="选择类型" size="small">
          <el-option label="全部" :value="''" />
          <el-option label="医生自留号" value="doctor" />
          <el-option label="急诊预留号" value="emergency" />
          <el-option label="VIP特需号" value="vip" />
        </el-select>
      </div>
      <el-table :data="filteredRecords" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="patient_name" label="患者姓名" />
        <el-table-column prop="doctor_name" label="医生姓名" />
        <el-table-column prop="reserved_type" label="预留号类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.reserved_type)" size="small">{{ getTypeLabel(row.reserved_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="schedule_date" label="就诊日期" />
        <el-table-column prop="am_pm" label="时段" width="80" />
        <el-table-column prop="used_at" label="使用时间" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'

const dateRange = ref<any>([])
const departmentId = ref('')
const filterType = ref('')
const usageVisible = ref(false)

const departments = ref<any[]>([])
const statsData = ref<any>({})
const dailyStats = ref<any[]>([])
const doctorStats = ref<any[]>([])
const usageRecords = ref<any[]>([])

const totalUsed = computed(() => {
  const typeStats = statsData.value.type_stats || []
  return typeStats.reduce((sum: number, item: any) => sum + (parseInt(item.period_used) || 0), 0)
})

const doctorUsed = computed(() => {
  const typeStats = statsData.value.type_stats || []
  const item = typeStats.find((t: any) => t.reserved_type === 'doctor')
  return item ? (item.period_used || 0) : 0
})

const emergencyUsed = computed(() => {
  const typeStats = statsData.value.type_stats || []
  const item = typeStats.find((t: any) => t.reserved_type === 'emergency')
  return item ? (item.period_used || 0) : 0
})

const vipUsed = computed(() => {
  const typeStats = statsData.value.type_stats || []
  const item = typeStats.find((t: any) => t.reserved_type === 'vip')
  return item ? (item.period_used || 0) : 0
})

const filteredRecords = computed(() => {
  let records = usageRecords.value
  if (filterType.value) {
    records = records.filter((r: any) => r.reserved_type === filterType.value)
  }
  return records
})

const loadStats = async () => {
  const start = dateRange.value[0] ? dateRange.value[0].toISOString().slice(0, 10) : ''
  const end = dateRange.value[1] ? dateRange.value[1].toISOString().slice(0, 10) : ''
  
  try {
    const res = await axios.get('/api/admin/reserved-stats', {
      params: {
        start_date: start,
        end_date: end,
        department_id: departmentId.value
      }
    })
    statsData.value = res.data
    dailyStats.value = res.data.daily_stats || []
    doctorStats.value = (res.data.doctor_stats || []).map((item: any, index: number) => ({
      ...item,
      rank: index + 1
    }))
  } catch {
    // 错误处理
  }
}

const loadUsageRecords = async () => {
  const start = dateRange.value[0] ? dateRange.value[0].toISOString().slice(0, 10) : ''
  const end = dateRange.value[1] ? dateRange.value[1].toISOString().slice(0, 10) : ''
  
  try {
    const res = await axios.get('/api/admin/reserved-usage', {
      params: {
        start_date: start,
        end_date: end
      }
    })
    usageRecords.value = res.data
    usageVisible.value = true
  } catch {
    // 错误处理
  }
}

const loadDepartments = async () => {
  try {
    const res = await axios.get('/api/appointment/depts')
    departments.value = res.data
  } catch {
    // 错误处理
  }
}

const getBarHeight = (value: number) => {
  const max = Math.max(...dailyStats.value.map((d: any) => d.total || 0), 1)
  return (value / max) * 100
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    doctor: '医生自留号',
    emergency: '急诊预留号',
    vip: 'VIP特需号'
  }
  return map[type] || type
}

const getTypeTagType = (type: string) => {
  const map: Record<string, string> = {
    doctor: 'info',
    emergency: 'danger',
    vip: 'warning'
  }
  return map[type] || 'info'
}

loadDepartments()
loadStats()
</script>

<style scoped>
.reserved-stats-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stats-overview {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 12px;
  color: white;
  text-align: center;
}

.stat-card.blue {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.red {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.purple {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.chart-section {
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
}

.trend-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 200px;
  padding-bottom: 30px;
}

.chart-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-container {
  height: 150px;
  width: 40px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-stack {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
}

.bar {
  width: 100%;
  transition: height 0.3s;
}

.bar.doctor {
  background: #4facfe;
}

.bar.emergency {
  background: #f5576c;
}

.bar.vip {
  background: #43e97b;
}

.bar-label {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.bar-total {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

.legend-dot.doctor {
  background: #4facfe;
}

.legend-dot.emergency {
  background: #f5576c;
}

.legend-dot.vip {
  background: #43e97b;
}

.table-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
}
</style>