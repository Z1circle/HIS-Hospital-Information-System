<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>预约挂号</span>
    </div>

    <!-- 日期选择条 -->
    <div class="date-bar">
      <el-icon class="date-arrow" @click="shiftDates(-1)"><ArrowLeft /></el-icon>
      <div class="date-tabs">
        <div
          v-for="d in dateTabs"
          :key="d.val"
          :class="['date-tab', selectedDate === d.val ? 'active' : '']"
          @click="selectDate(d.val)"
        >
          <div class="date-tab-day">{{ d.day }}</div>
          <div class="date-tab-label">{{ d.label }}</div>
        </div>
      </div>
      <el-icon class="date-arrow" @click="shiftDates(1)"><ArrowRight /></el-icon>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input v-model="searchText" placeholder="搜索科室" prefix-icon="Search" clearable />
    </div>

    <!-- 科室网格 -->
    <div class="dept-grid" v-loading="loading">
      <el-empty v-if="!loading && filteredDepts.length === 0" description="暂无科室信息" />
      <div
        v-for="dept in filteredDepts"
        :key="dept.id"
        class="dept-card"
        @click="$router.push(`/appointment/doctor?dept_id=${dept.id}&dept_name=${dept.name}&date=${selectedDate}`)"
      >
        <div class="dept-icon">{{ dept.icon || '🏥' }}</div>
        <div class="dept-main">
          <div class="dept-name">{{ dept.name }}</div>
          <div class="dept-sub">{{ dept.sub_depts || '普通门诊、专家门诊' }}</div>
        </div>
        <div class="dept-right">
          <div v-if="dept.remaining_today > 0" class="remaining">
            <span class="num">{{ dept.remaining_today }}</span>
            <span class="unit">余号</span>
          </div>
          <div v-else class="no-num">约满</div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import axios from 'axios'

const searchText = ref('')
const loading = ref(false)
const dateOffset = ref(0)

// 生成7天日期tab
const dateTabs = computed(() => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + dateOffset.value * 7 + i)
    const val = d.toISOString().slice(0, 10)
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return {
      val,
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      label: i === 0 && dateOffset.value === 0 ? '今天' : dayNames[d.getDay()]
    }
  })
})

const selectedDate = ref(new Date().toISOString().slice(0, 10))

const selectDate = (val: string) => {
  selectedDate.value = val
  loadDepts()
}

const shiftDates = (dir: number) => {
  dateOffset.value += dir
  // 重置到新一组第一天
  const tabs = dateTabs.value
  if (tabs.length > 0) {
    selectedDate.value = tabs[0].val
    loadDepts()
  }
}

interface Dept {
  id: number
  name: string
  icon?: string
  sub_depts?: string
  remaining_today: number
}

const depts = ref<Dept[]>([])

const deptSubMap: Record<string, string> = {
  '内科': '呼吸内科、消化内科、心内科',
  '外科': '普外科、腹腔镜、微创外科',
  '中医科': '针灸科、推拿科、中医内科',
  '妇产科': '妇科、产科、计划生育',
  '儿科': '儿科门诊、儿科急诊',
  '皮肤科': '皮肤病、过敏、皮肤美容',
  '眼科': '白内障、屈光、眼底病',
  '耳鼻喉科': '耳科、鼻科、咽喉科',
}

const excludedDepts = ['急诊科', '挂号处', '药房', '手术室', 'ICU', '住院部']

const filteredDepts = computed(() =>
  depts.value.filter(d => 
    !excludedDepts.includes(d.name) && d.name.includes(searchText.value)
  )
)

const loadDepts = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/appointment/depts', {
      params: { date: selectedDate.value }
    })
    depts.value = res.data.map((d: any) => ({
      ...d,
      sub_depts: deptSubMap[d.name] || '普通门诊',
      remaining_today: parseInt(d.remaining_today) || 0
    }))
  } catch (e) {
    console.error('获取科室失败', e)
    depts.value = []
  }
  loading.value = false
}

onMounted(() => {
  loadDepts()
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    loadDepts()
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
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

/* 日期条 */
.date-bar {
  background: white;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #F0F0F0;
  gap: 6px;
}

.date-arrow {
  cursor: pointer;
  color: #1E88E5;
  font-size: 18px;
  flex-shrink: 0;
  padding: 4px;
}

.date-tabs {
  flex: 1;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.date-tabs::-webkit-scrollbar { display: none; }

.date-tab {
  flex: 1;
  min-width: 52px;
  text-align: center;
  padding: 6px 4px;
  border-radius: 8px;
  cursor: pointer;
  background: #F5F7FA;
  transition: all 0.15s;
}

.date-tab:hover { background: #E3F2FD; }

.date-tab.active {
  background: #1E88E5;
  color: white;
}

.date-tab-day { font-size: 13px; font-weight: 600; }
.date-tab-label { font-size: 11px; margin-top: 2px; opacity: 0.8; }

/* 搜索 */
.search-bar { padding: 12px 16px; background: white; margin-bottom: 1px; }

/* 科室网格 */
.dept-grid {
  padding: 12px 16px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 10px;
}

.dept-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #F0F0F0;
  transition: all 0.2s;
}

.dept-card:hover {
  box-shadow: 0 4px 16px rgba(30,136,229,0.15);
  border-color: #90CAF9;
  transform: translateY(-1px);
}

.dept-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E3F2FD;
  border-radius: 12px;
  flex-shrink: 0;
}

.dept-main { flex: 1; min-width: 0; }
.dept-name { font-size: 15px; font-weight: 600; color: #212121; margin-bottom: 4px; }
.dept-sub { font-size: 12px; color: #9E9E9E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dept-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.remaining {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.num { font-size: 18px; font-weight: 700; color: #43A047; line-height: 1.2; }
.unit { font-size: 11px; color: #757575; }

.no-num {
  font-size: 13px;
  color: #E53935;
  font-weight: 500;
  background: #FFEBEE;
  padding: 3px 8px;
  border-radius: 6px;
}

.arrow-icon { color: #BDBDBD; font-size: 16px; }
</style>
