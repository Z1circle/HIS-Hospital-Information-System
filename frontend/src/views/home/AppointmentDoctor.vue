<template>
  <div class="page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span class="top-title">{{ deptName }}</span>
      <div class="top-right">
        <el-button size="small" :icon="Calendar" @click="calendarVisible = true">日历选择</el-button>
      </div>
    </div>

    <!-- 日期横条 -->
    <div class="date-strip-wrap">
      <div class="date-strip" ref="stripRef">
        <div
          v-for="d in dateOptions"
          :key="d.value"
          :class="['date-item', selectedDate === d.value ? 'active' : '']"
          @click="selectedDate = d.value; loadDoctors()"
        >
          <div class="date-week">{{ d.week }}</div>
          <div class="date-day">{{ d.day }}</div>
        </div>
      </div>
    </div>

    <!-- 医生列表 PC双栏 -->
    <div class="content-area" v-loading="loading">
      <el-empty v-if="!loading && doctors.length === 0" description="暂无排班医生" />
      <div class="doctor-grid">
        <div v-for="doc in doctors" :key="doc.id"
          :class="['doctor-card', { 'doctor-highlight': triageDoctorId && String(doc.id) === triageDoctorId }]"
          :ref="el => { if (triageDoctorId && String(doc.id) === triageDoctorId) triageDocCardRef = el as HTMLElement }"
        >
          <div class="doc-header">
              <div class="doc-avatar">{{ doc.name.charAt(0) }}</div>
              <div class="doc-info">
              <div class="doc-name">
                {{ doc.name }}
                <span v-if="triageDoctorId && String(doc.id) === triageDoctorId" class="triage-doc-badge">✨ 导诊推荐</span>
              </div>
              <div class="doc-title">{{ doc.title }}</div>
              <div class="doc-dept" v-if="doc.dept_name">{{ doc.dept_name }}</div>
              <div class="doc-specialty" v-if="doc.specialty">{{ doc.specialty }}</div>
              <div class="doc-biography" v-if="doc.biography">{{ doc.biography }}</div>
            </div>
            <div class="doc-fee">¥{{ doc.fee || '--' }}</div>
          </div>
          <div class="schedule-row">
            <div
              v-for="sch in doc.schedules"
              :key="sch.id"
              :class="['sch-btn', sch.remaining <= 0 ? 'disabled' : '', selectedSchedule?.id === sch.id ? 'selected' : '']"
              @click="sch.remaining > 0 && selectSchedule(doc, sch)"
            >
              <span class="sch-ampm">{{ sch.am_pm === 'am' ? '上午' : '下午' }}</span>
              <span :class="['sch-remain', sch.remaining < 5 && sch.remaining > 0 ? 'danger' : '', sch.remaining <= 0 ? 'full' : '']">
                {{ sch.remaining <= 0 ? '约满' : `余${sch.remaining}` }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部确认 -->
    <div v-if="selectedSchedule" class="bottom-confirm">
      <div class="confirm-info">
        <span class="confirm-doc">{{ selectedDoctor?.name }}</span>
        <span class="confirm-tag">{{ selectedSchedule.am_pm === 'am' ? '上午' : '下午' }}</span>
        <span class="confirm-date">{{ selectedDate }}</span>
        <span class="confirm-fee">挂号费 ¥{{ selectedDoctor?.fee || '--' }}</span>
      </div>
      <el-button type="primary" size="large" @click="goConfirm">确认预约</el-button>
    </div>

    <!-- 日历弹窗 -->
    <el-dialog v-model="calendarVisible" title="选择日期" width="600px" :close-on-click-modal="true">
      <!-- 年/月切换 -->
      <div class="cal-toolbar">
        <el-radio-group v-model="calView" size="small">
          <el-radio-button value="month">月视图</el-radio-button>
          <el-radio-button value="year">年视图</el-radio-button>
        </el-radio-group>
        <span class="cal-current">{{ calView === 'month' ? calMonthLabel : calYear + '年' }}</span>
        <div class="cal-nav">
          <el-button size="small" :icon="ArrowLeft" @click="calPrev" circle />
          <el-button size="small" @click="calToday" text>今天</el-button>
          <el-button size="small" :icon="ArrowRight" @click="calNext" circle />
        </div>
      </div>

      <!-- 月视图 -->
      <div v-if="calView === 'month'" class="cal-month">
        <div class="cal-week-header">
          <span v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</span>
        </div>
        <div class="cal-days">
          <div
            v-for="cell in calCells"
            :key="cell.key"
            :class="['cal-cell',
              cell.isOtherMonth ? 'other-month' : '',
              cell.dateStr === selectedDate ? 'selected' : '',
              cell.isToday ? 'today' : '',
              cell.isPast ? 'past' : '',
              cell.hasSchedule ? 'has-schedule' : '',
            ]"
            @click="!cell.isOtherMonth && !cell.isPast && pickDate(cell.dateStr)"
          >
            <span>{{ cell.day }}</span>
            <div v-if="cell.hasSchedule" class="schedule-dot"></div>
          </div>
        </div>
      </div>

      <!-- 年视图（月份网格） -->
      <div v-else class="cal-year">
        <div
          v-for="idx in 12"
          :key="idx"
          :class="['cal-month-cell', calYear === currentYear && idx - 1 === currentMonth ? 'cur-month' : '']"
          @click="calView='month'; calMonth=idx - 1; "
        >
          {{ idx }}月
        </div>
      </div>

      <template #footer>
        <el-button @click="calendarVisible = false">取消</el-button>
      </template>
    </el-dialog>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, ArrowRight, Calendar } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const deptId = route.query.dept_id as string
const deptName = ref(route.query.dept_name as string || '选择医生')

const loading = ref(false)
const selectedDate = ref('')
const dateOptions = ref<{ value: string; week: string; day: string }[]>([])
const doctors = ref<any[]>([])
const selectedSchedule = ref<any>(null)
const selectedDoctor = ref<any>(null)
const triageDoctorId = ref(route.query.triage_doctor_id as string || '')
const triageDocCardRef = ref<HTMLElement | null>(null)

const weeks = ['周日','周一','周二','周三','周四','周五','周六']

const initDates = () => {
  const now = new Date()
  const initDateStr = route.query.date as string || ''
  for (let i = 0; i < 60; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const val = d.toISOString().slice(0, 10)
    dateOptions.value.push({
      value: val,
      week: i === 0 ? '今天' : (i === 1 ? '明天' : weeks[d.getDay()]),
      day: `${d.getMonth()+1}/${d.getDate()}`
    })
  }
  const found = dateOptions.value.find(o => o.value === initDateStr)
  selectedDate.value = found ? initDateStr : dateOptions.value[0].value
}

const loadDoctors = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/appointment/doctors', {
      params: { dept_id: deptId, date: selectedDate.value }
    })
    doctors.value = res.data || []
    // 导诊医生高亮：滚动到推荐医生
    if (triageDoctorId.value) {
      await nextTick()
      if (triageDocCardRef.value) {
        triageDocCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // 自动选中该医生的第一个可用排班
      const recDoc = doctors.value.find((d: any) => String(d.id) === triageDoctorId.value)
      if (recDoc && recDoc.schedules?.length > 0) {
        const availableSch = recDoc.schedules.find((s: any) => s.remaining > 0)
        if (availableSch) {
          selectSchedule(recDoc, availableSch)
        }
      }
    }
  } catch (error) {
    ElMessage.error('加载医生数据失败')
    console.error('加载医生数据失败:', error)
  }
  loading.value = false
}

const selectSchedule = (doc: any, sch: any) => {
  selectedDoctor.value = doc
  selectedSchedule.value = sch
}

const goConfirm = () => {
  router.push({
    path: '/appointment/confirm',
    query: {
      dept_id: deptId,
      dept_name: deptName.value,
      doctor_id: selectedDoctor.value.id,
      doctor_name: selectedDoctor.value.name,
      doctor_title: selectedDoctor.value.title,
      schedule_id: selectedSchedule.value.id,
      am_pm: selectedSchedule.value.am_pm,
      date: selectedDate.value,
      fee: selectedSchedule.value.fee || selectedDoctor.value.fee || '20',
      slot_type: selectedSchedule.value.slot_type || 'normal'
    }
  })
}

// ─── 日历逻辑 ─────────────────────────────────────────
const calendarVisible = ref(false)
const calView = ref<'month' | 'year'>('month')
const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()
const calYear = ref(currentYear)
const calMonth = ref(currentMonth)

const calMonthLabel = computed(() => `${calYear.value}年${calMonth.value + 1}月`)

const calPrev = () => {
  if (calView.value === 'month') {
    if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
    else calMonth.value--
  } else {
    calYear.value--
  }
}
const calNext = () => {
  if (calView.value === 'month') {
    if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
    else calMonth.value++
  } else {
    calYear.value++
  }
}
const calToday = () => {
  calYear.value = currentYear
  calMonth.value = currentMonth
  calView.value = 'month'
}

// 有排班的日期集合（来自 dateOptions）
const scheduledDates = computed(() => new Set(dateOptions.value.map(d => d.value)))

const calCells = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value, 1)
  const lastDay = new Date(calYear.value, calMonth.value + 1, 0)
  const cells: any[] = []
  // 补前面空格
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - (firstDay.getDay() - i))
    const dateStr = d.toISOString().slice(0, 10)
    cells.push({ key: 'prev-' + i, day: d.getDate(), dateStr, isOtherMonth: true, isToday: false, isPast: false, hasSchedule: false })
  }
  // 当月
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(calYear.value, calMonth.value, d)
    const dateStr = date.toISOString().slice(0, 10)
    const todayStr = today.toISOString().slice(0, 10)
    cells.push({
      key: dateStr,
      day: d,
      dateStr,
      isOtherMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      hasSchedule: scheduledDates.value.has(dateStr),
    })
  }
  // 补后面
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(lastDay)
    d.setDate(lastDay.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    cells.push({ key: 'next-' + i, day: d.getDate(), dateStr, isOtherMonth: true, isToday: false, isPast: false, hasSchedule: false })
  }
  return cells
})

const pickDate = (dateStr: string) => {
  // 如果不在 dateOptions 里，添加进去
  if (!dateOptions.value.find(d => d.value === dateStr)) {
    const d = new Date(dateStr)
    dateOptions.value.push({
      value: dateStr,
      week: weeks[d.getDay()],
      day: `${d.getMonth()+1}/${d.getDate()}`
    })
    dateOptions.value.sort((a, b) => a.value.localeCompare(b.value))
  }
  selectedDate.value = dateStr
  loadDoctors()
  calendarVisible.value = false
}

onMounted(() => {
  initDates()
  loadDoctors()
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    loadDoctors()
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F0F4FF;
  max-width: 960px;
  margin: 0 auto;
  padding-bottom: 100px;
}

.top-bar {
  background: #1565C0;
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
}
.back-btn { cursor: pointer; font-size: 20px; color: white; }
.top-title { flex: 1; }
.top-right { display: flex; gap: 8px; }

/* 日期条 */
.date-strip-wrap { background: white; border-bottom: 1px solid #E0E0E0; padding: 8px 12px; }
.date-strip { display: flex; overflow-x: auto; gap: 8px; scrollbar-width: none; }
.date-strip::-webkit-scrollbar { display: none; }
.date-item {
  flex-shrink: 0;
  min-width: 56px;
  text-align: center;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
  color: #555;
  transition: all .15s;
}
.date-item.active { background: #1565C0; color: white; }
.date-week { font-size: 11px; margin-bottom: 3px; }
.date-day { font-size: 14px; font-weight: 600; }

/* 医生网格 */
.content-area { padding: 16px; }
.doctor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 12px;
}

.doctor-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.doc-header { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
.doc-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg,#1565C0,#1E88E5);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.doc-info { flex: 1; }
.doc-name { font-size: 16px; font-weight: 700; color: #212121; }
.doc-title { font-size: 13px; color: #1E88E5; margin: 3px 0; }
.doc-dept { font-size: 12px; color: #43A047; margin: 2px 0; }
.doc-specialty { font-size: 12px; color: #757575; }
.doc-biography { font-size: 12px; color: #9E9E9E; line-height: 1.6; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.doc-fee { font-size: 16px; font-weight: 700; color: #E53935; white-space: nowrap; }

.schedule-row { display: flex; gap: 10px; flex-wrap: wrap; }
.sch-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 20px;
  border: 1.5px solid #1E88E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.sch-btn.disabled { border-color: #BDBDBD; cursor: not-allowed; }
.sch-btn.selected { background: #1E88E5; }
.sch-ampm { font-size: 13px; font-weight: 600; color: #1E88E5; }
.sch-btn.selected .sch-ampm { color: white; }
.sch-remain { font-size: 12px; color: #43A047; margin-top: 2px; }
.sch-remain.danger { color: #FB8C00; }
.sch-remain.full { color: #BDBDBD; }
.sch-btn.selected .sch-remain { color: rgba(255,255,255,0.9); }
.sch-btn.disabled .sch-ampm { color: #BDBDBD; }

/* 底部确认 */
.bottom-confirm {
  position: fixed;
  bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 960px;
  background: white;
  padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
  border-top: 1px solid #E0E0E0;
}
.confirm-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.confirm-doc { font-size: 15px; font-weight: 700; color: #212121; }
.confirm-tag { background: #E3F2FD; color: #1565C0; font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.confirm-date { font-size: 13px; color: #757575; }
.confirm-fee { font-size: 14px; font-weight: 700; color: #E53935; }

/* 日历弹窗 */
.cal-toolbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px;
}
.cal-current { flex: 1; font-size: 15px; font-weight: 600; text-align: center; }
.cal-nav { display: flex; align-items: center; gap: 4px; }

.cal-week-header {
  display: grid; grid-template-columns: repeat(7, 1fr);
  text-align: center; font-size: 12px;
  color: #9E9E9E; padding: 4px 0; margin-bottom: 4px;
}
.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-cell {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 44px; border-radius: 8px; cursor: pointer;
  font-size: 14px; color: #333;
  transition: background .15s;
  position: relative;
}
.cal-cell:hover:not(.past):not(.other-month) { background: #E3F2FD; }
.cal-cell.today > span { color: #1E88E5; font-weight: 700; }
.cal-cell.selected { background: #1565C0 !important; color: white; }
.cal-cell.selected > span { color: white; }
.cal-cell.other-month { color: #BDBDBD; cursor: default; }
.cal-cell.past { color: #BDBDBD; cursor: not-allowed; }
.schedule-dot {
  width: 5px; height: 5px;
  background: #1E88E5;
  border-radius: 50%;
  position: absolute; bottom: 5px;
}
.cal-cell.selected .schedule-dot { background: white; }

/* 年视图 */
.cal-year {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.cal-month-cell {
  text-align: center; padding: 14px 0;
  border-radius: 8px; cursor: pointer;
  font-size: 15px; color: #333;
  border: 1px solid #E0E0E0;
  transition: all .15s;
}
.cal-month-cell:hover { background: #E3F2FD; border-color: #1E88E5; }
.cal-month-cell.cur-month { background: #1565C0; color: white; border-color: #1565C0; }

/* 智能导诊高亮 */
.doctor-highlight {
  border: 2px solid #1E88E5 !important;
  background: #F0F7FF;
  box-shadow: 0 4px 20px rgba(30, 136, 229, 0.25);
  animation: doc-highlight-pulse 2s ease-in-out;
}

@keyframes doc-highlight-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(30, 136, 229, 0.25); }
  50% { box-shadow: 0 4px 28px rgba(30, 136, 229, 0.45); }
}

.triage-doc-badge {
  display: inline-block;
  font-size: 11px;
  color: white;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 6px;
  font-weight: 500;
  vertical-align: middle;
}

</style>
