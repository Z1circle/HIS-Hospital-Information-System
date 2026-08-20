<template>
  <div class="outpatient-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">门诊管理</h2>
      <div class="header-actions">
        <el-button type="primary" icon="Plus" @click="handleAddSchedule">
          新增排班
        </el-button>
        <el-button icon="Download" @click="handleExport">
          导出报表
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card glass-card">
        <div class="stat-icon blue-icon">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">今日挂号</div>
          <div class="stat-value">{{ formatNumber(todayRegistrations) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon green-icon">
          <el-icon :size="28"><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">排班医生</div>
          <div class="stat-value">{{ formatNumber(scheduledDoctors) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon yellow-icon">
          <el-icon :size="28"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">停诊记录</div>
          <div class="stat-value warning-text">{{ formatNumber(canceledSchedules) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon red-icon">
          <el-icon :size="28"><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">替诊记录</div>
          <div class="stat-value danger-text">{{ formatNumber(substitutedSchedules) }}</div>
        </div>
      </div>
    </div>

    <!-- 日期选择和筛选 -->
    <div class="filter-section glass-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="选择日期">
          <el-date-picker
            v-model="filterForm.date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item label="科室">
          <el-select
            v-model="filterForm.department"
            placeholder="请选择科室"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option v-for="dept in deptList" :key="dept.id" :label="dept.name" :value="dept.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="医生">
          <el-select
            v-model="filterForm.doctor"
            placeholder="请选择医生"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="张医生" value="张医生" />
            <el-option label="李医生" value="李医生" />
            <el-option label="王医生" value="王医生" />
            <el-option label="赵医生" value="赵医生" />
          </el-select>
        </el-form-item>
        <el-form-item label="班次">
          <el-select
            v-model="filterForm.shift"
            placeholder="请选择班次"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="上午" value="上午" />
            <el-option label="下午" value="下午" />
            <el-option label="晚上" value="晚上" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 排班日历视图 -->
    <div class="schedule-calendar glass-card">
      <div class="calendar-header">
        <div class="calendar-title">
          <el-button icon="ArrowLeft" @click="handlePrevWeek" circle />
          <span class="current-week">{{ currentWeekRange }}</span>
          <el-button icon="ArrowRight" @click="handleNextWeek" circle />
        </div>
        <div class="calendar-actions">
          <el-button-group>
            <el-button :type="viewMode === 'week' ? 'primary' : ''" @click="viewMode = 'week'">
              周视图
            </el-button>
            <el-button :type="viewMode === 'day' ? 'primary' : ''" @click="viewMode = 'day'">
              日视图
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 周视图 -->
      <div v-if="viewMode === 'week'" class="week-view">
        <div class="week-header">
          <div class="time-column">时间</div>
          <div
            v-for="day in weekDays"
            :key="day.date"
            class="day-column"
            :class="{ 'is-today': day.isToday }"
          >
            <div class="day-name">{{ day.name }}</div>
            <div class="day-date">{{ day.date }}</div>
          </div>
        </div>
        <div class="week-body">
          <div
            v-for="timeSlot in timeSlots"
            :key="timeSlot"
            class="time-row"
          >
            <div class="time-cell">{{ timeSlot }}</div>
            <div
              v-for="day in weekDays"
              :key="`${day.date}-${timeSlot}`"
              class="schedule-cell"
              @click="handleCellClick(day.date, timeSlot)"
            >
              <div
                v-for="schedule in getSchedulesForSlot(day.date, timeSlot)"
                :key="schedule.id"
                class="schedule-item"
                :class="{
                  'is-canceled': schedule.status === 'canceled',
                  'is-substituted': schedule.status === 'substituted'
                }"
                @click.stop="handleScheduleClick(schedule)"
              >
                <div class="schedule-doctor">{{ schedule.doctor }}</div>
                <div class="schedule-dept">{{ schedule.department }}</div>
                <div class="schedule-quota">
                  {{ schedule.registered }}/{{ schedule.quota }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 日视图 -->
      <div v-else class="day-view">
        <div class="day-header">
          <div class="time-column">时间</div>
          <div class="schedule-column">排班信息</div>
        </div>
        <div class="day-body">
          <div
            v-for="timeSlot in timeSlots"
            :key="timeSlot"
            class="time-row"
          >
            <div class="time-cell">{{ timeSlot }}</div>
            <div class="schedule-cell">
              <div
                v-for="schedule in getSchedulesForSlot(filterForm.date || today, timeSlot)"
                :key="schedule.id"
                class="schedule-item"
                :class="{
                  'is-canceled': schedule.status === 'canceled',
                  'is-substituted': schedule.status === 'substituted'
                }"
                @click="handleScheduleClick(schedule)"
              >
                <div class="schedule-doctor">{{ schedule.doctor }}</div>
                <div class="schedule-dept">{{ schedule.department }}</div>
                <div class="schedule-quota">
                  {{ schedule.registered }}/{{ schedule.quota }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 挂号记录列表 -->
    <div class="registration-list glass-card">
      <div class="list-header">
        <h3 class="list-title">挂号记录</h3>
        <el-button type="text" icon="View" @click="handleViewAllRegistrations">
          查看全部
        </el-button>
      </div>
      <el-table
        :data="registrations"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="patient_name" label="患者姓名" width="100" />
        <el-table-column prop="patient_id" label="患者ID" width="120" />
        <el-table-column prop="department" label="科室" width="100" />
        <el-table-column prop="doctor" label="医生" width="100" />
        <el-table-column prop="shift" label="班次" width="80" />
        <el-table-column prop="time_slot" label="时段" width="100" />
        <el-table-column prop="register_time" label="挂号时间" width="160" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              icon="View"
              @click="handleViewRegistration(row)"
            >
              查看
            </el-button>
            <el-button
              size="small"
              type="danger"
              link
              icon="Delete"
              @click="handleCancelRegistration(row)"
            >
              退号
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑排班对话框 -->
    <el-dialog
      v-model="scheduleDialogVisible"
      :title="scheduleDialogTitle"
      width="600px"
      @close="handleScheduleDialogClose"
    >
      <el-form
        ref="scheduleFormRef"
        :model="scheduleForm"
        :rules="scheduleFormRules"
        label-width="100px"
      >
        <el-form-item label="医生" prop="doctor">
          <el-select
            v-model="scheduleForm.doctor"
            placeholder="请选择医生"
            style="width: 100%"
          >
            <el-option label="张医生" value="张医生" />
            <el-option label="李医生" value="李医生" />
            <el-option label="王医生" value="王医生" />
            <el-option label="赵医生" value="赵医生" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室" prop="department">
          <el-input v-model="scheduleForm.department" disabled />
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="scheduleForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="班次" prop="shift">
          <el-select
            v-model="scheduleForm.shift"
            placeholder="请选择班次"
            style="width: 100%"
          >
            <el-option label="上午" value="上午" />
            <el-option label="下午" value="下午" />
            <el-option label="晚上" value="晚上" />
          </el-select>
        </el-form-item>
        <el-form-item label="时段" prop="time_slot">
          <el-select
            v-model="scheduleForm.time_slot"
            placeholder="请选择时段"
            style="width: 100%"
          >
            <el-option label="08:00-09:00" value="08:00-09:00" />
            <el-option label="09:00-10:00" value="09:00-10:00" />
            <el-option label="10:00-11:00" value="10:00-11:00" />
            <el-option label="11:00-12:00" value="11:00-12:00" />
            <el-option label="14:00-15:00" value="14:00-15:00" />
            <el-option label="15:00-16:00" value="15:00-16:00" />
            <el-option label="16:00-17:00" value="16:00-17:00" />
            <el-option label="18:00-19:00" value="18:00-19:00" />
            <el-option label="19:00-20:00" value="19:00-20:00" />
          </el-select>
        </el-form-item>
        <el-form-item label="限号数量" prop="quota">
          <el-input-number
            v-model="scheduleForm.quota"
            :min="1"
            :max="50"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="scheduleForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitSchedule" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 停诊/替诊对话框 -->
    <el-dialog
      v-model="operationDialogVisible"
      :title="operationDialogTitle"
      width="500px"
    >
      <el-form
        ref="operationFormRef"
        :model="operationForm"
        :rules="operationFormRules"
        label-width="100px"
      >
        <el-form-item label="医生">
          <el-input v-model="operationForm.doctor" disabled />
        </el-form-item>
        <el-form-item label="科室">
          <el-input v-model="operationForm.department" disabled />
        </el-form-item>
        <el-form-item label="日期">
          <el-input v-model="operationForm.date" disabled />
        </el-form-item>
        <el-form-item label="时段">
          <el-input v-model="operationForm.time_slot" disabled />
        </el-form-item>
        <el-form-item
          v-if="operationType === 'substitute'"
          label="替诊医生"
          prop="substitute_doctor"
        >
          <el-select
            v-model="operationForm.substitute_doctor"
            placeholder="请选择替诊医生"
            style="width: 100%"
          >
            <el-option label="张医生" value="张医生" />
            <el-option label="李医生" value="李医生" />
            <el-option label="王医生" value="王医生" />
            <el-option label="赵医生" value="赵医生" />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="operationType === 'cancel'"
          label="停诊原因"
          prop="reason"
        >
          <el-input
            v-model="operationForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入停诊原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="operationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitOperation">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 限号设置对话框 -->
    <el-dialog
      v-model="quotaSettingsVisible"
      title="限号设置"
      width="600px"
    >
      <el-form
        ref="quotaFormRef"
        :model="quotaSettings"
        label-width="150px"
      >
        <el-form-item label="上午时段限号">
          <el-input-number
            v-model="quotaSettings.morning"
            :min="1"
            :max="50"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="下午时段限号">
          <el-input-number
            v-model="quotaSettings.afternoon"
            :min="1"
            :max="50"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="晚上时段限号">
          <el-input-number
            v-model="quotaSettings.evening"
            :min="1"
            :max="50"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="启用超额挂号">
          <el-switch v-model="quotaSettings.allowOverbook" />
          <div class="form-tip">开启后允许超过限号数量的挂号</div>
        </el-form-item>
        <el-form-item label="超额比例">
          <el-input-number
            v-model="quotaSettings.overbookRatio"
            :min="0"
            :max="100"
            :precision="0"
            style="width: 100%"
          />
          <div class="form-tip">允许超额的百分比（如20表示允许超额20%）</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaSettingsVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveQuotaSettings">
          保存设置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  User,
  Calendar,
  Clock,
  Warning
} from '@element-plus/icons-vue'
import axios from 'axios'

// 统计数据
const todayRegistrations = ref(128)
const scheduledDoctors = ref(24)
const canceledSchedules = ref(3)
const substitutedSchedules = ref(5)

// 加载状态
const loading = ref(false)

// 科室列表
const deptList = ref<any[]>([])

const loadDepts = async () => {
  try {
    const res = await axios.get('/api/departments')
    deptList.value = res.data
  } catch {
    deptList.value = []
  }
}

// 筛选表单
const filterForm = reactive({
  date: '',
  department: '',
  doctor: '',
  shift: ''
})

// 当前日期
const today = new Date().toISOString().split('T')[0]
filterForm.date = today

// 视图模式
const viewMode = ref('week')

// 当前周
const currentWeekStart = ref(getWeekStart(new Date()))

// 计算当前周范围
const currentWeekRange = computed(() => {
  const start = formatDate(currentWeekStart.value)
  const end = formatDate(new Date(currentWeekStart.value.getTime() + 6 * 24 * 60 * 60 * 1000))
  return `${start} ~ ${end}`
})

// 周日期
const weekDays = computed(() => {
  const days = []
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const todayStr = today

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value.getTime() + i * 24 * 60 * 60 * 1000)
    days.push({
      name: dayNames[date.getDay()],
      date: formatDate(date),
      isToday: formatDate(date) === todayStr
    })
  }
  return days
})

// 时段
const timeSlots = [
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '18:00-19:00',
  '19:00-20:00'
]

// 排班数据
const schedules = ref([
  {
    id: 1,
    doctor: '张医生',
    department: '内科',
    date: today,
    shift: '上午',
    time_slot: '08:00-09:00',
    quota: 10,
    registered: 8,
    status: 'normal'
  },
  {
    id: 2,
    doctor: '李医生',
    department: '外科',
    date: today,
    shift: '上午',
    time_slot: '09:00-10:00',
    quota: 10,
    registered: 10,
    status: 'normal'
  },
  {
    id: 3,
    doctor: '王医生',
    department: '儿科',
    date: today,
    shift: '下午',
    time_slot: '14:00-15:00',
    quota: 10,
    registered: 6,
    status: 'canceled'
  },
  {
    id: 4,
    doctor: '赵医生',
    department: '妇产科',
    date: today,
    shift: '下午',
    time_slot: '15:00-16:00',
    quota: 10,
    registered: 7,
    status: 'substituted'
  },
  {
    id: 5,
    doctor: '张医生',
    department: '内科',
    date: today,
    shift: '晚上',
    time_slot: '18:00-19:00',
    quota: 10,
    registered: 4,
    status: 'normal'
  }
])

// 挂号记录
const registrations = ref([
  {
    id: 1,
    patient_name: '张三',
    patient_id: 'P001',
    department: '内科',
    doctor: '张医生',
    shift: '上午',
    time_slot: '08:00-09:00',
    register_time: '2026-06-18 07:30:00',
    status: 'waiting'
  },
  {
    id: 2,
    patient_name: '李四',
    patient_id: 'P002',
    department: '外科',
    doctor: '李医生',
    shift: '上午',
    time_slot: '09:00-10:00',
    register_time: '2026-06-18 08:45:00',
    status: 'waiting'
  },
  {
    id: 3,
    patient_name: '王五',
    patient_id: 'P003',
    department: '儿科',
    doctor: '王医生',
    shift: '下午',
    time_slot: '14:00-15:00',
    register_time: '2026-06-18 13:20:00',
    status: 'completed'
  },
  {
    id: 4,
    patient_name: '赵六',
    patient_id: 'P004',
    department: '妇产科',
    doctor: '赵医生',
    shift: '下午',
    time_slot: '15:00-16:00',
    register_time: '2026-06-18 14:50:00',
    status: 'waiting'
  }
])

// 获取指定时段的排班
const getSchedulesForSlot = (date: string, timeSlot: string) => {
  return schedules.value.filter(s => s.date === date && s.time_slot === timeSlot)
}

// 获取状态类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, any> = {
    waiting: 'warning',
    completed: 'success',
    canceled: 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    waiting: '候诊中',
    completed: '已完成',
    canceled: '已取消'
  }
  return statusMap[status] || '未知'
}

// 日期变化
const handleDateChange = () => {
  viewMode.value = 'day'
}

// 搜索
const handleSearch = () => {
  ElMessage.success('搜索完成')
}

// 重置
const handleReset = () => {
  filterForm.date = today
  filterForm.department = ''
  filterForm.doctor = ''
  filterForm.shift = ''
  viewMode.value = 'week'
  ElMessage.success('已重置筛选条件')
}

// 导出
const handleExport = () => {
  ElMessage.success('报表导出中...')
}

// 上一周
const handlePrevWeek = () => {
  currentWeekStart.value = new Date(currentWeekStart.value.getTime() - 7 * 24 * 60 * 60 * 1000)
}

// 下一周
const handleNextWeek = () => {
  currentWeekStart.value = new Date(currentWeekStart.value.getTime() + 7 * 24 * 60 * 60 * 1000)
}

// 点击单元格
const handleCellClick = (date: string, timeSlot: string) => {
  scheduleForm.date = date
  scheduleForm.time_slot = timeSlot
  scheduleDialogVisible.value = true
}

// 点击排班项
const handleScheduleClick = (schedule: any) => {
  ElMessageBox.confirm(
    `请选择操作`,
    '排班操作',
    {
      confirmButtonText: '停诊',
      cancelButtonText: '替诊',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    operationType.value = 'cancel'
    operationDialogTitle.value = '停诊设置'
    Object.assign(operationForm, {
      doctor: schedule.doctor,
      department: schedule.department,
      date: schedule.date,
      time_slot: schedule.time_slot,
      reason: ''
    })
    operationDialogVisible.value = true
  }).catch((action) => {
    if (action === 'cancel') {
      operationType.value = 'substitute'
      operationDialogTitle.value = '替诊设置'
      Object.assign(operationForm, {
        doctor: schedule.doctor,
        department: schedule.department,
        date: schedule.date,
        time_slot: schedule.time_slot,
        substitute_doctor: ''
      })
      operationDialogVisible.value = true
    }
  })
}

// 新增排班
const handleAddSchedule = () => {
  scheduleDialogTitle.value = '新增排班'
  scheduleDialogVisible.value = true
}

// 排班对话框
const scheduleDialogVisible = ref(false)
const scheduleDialogTitle = ref('新增排班')
const scheduleFormRef = ref<FormInstance>()
const submitting = ref(false)

const scheduleForm = reactive({
  doctor: '',
  department: '',
  date: '',
  shift: '',
  time_slot: '',
  quota: 10,
  remark: ''
})

const scheduleFormRules: FormRules = {
  doctor: [{ required: true, message: '请选择医生', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  shift: [{ required: true, message: '请选择班次', trigger: 'change' }],
  time_slot: [{ required: true, message: '请选择时段', trigger: 'change' }],
  quota: [{ required: true, message: '请输入限号数量', trigger: 'blur' }]
}

// 提交排班
const handleSubmitSchedule = async () => {
  if (!scheduleFormRef.value) return

  await scheduleFormRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true

      setTimeout(() => {
        const newSchedule = {
          id: Date.now(),
          ...scheduleForm,
          registered: 0,
          status: 'normal'
        }
        schedules.value.push(newSchedule)
        ElMessage.success('新增排班成功')
        scheduleDialogVisible.value = false
        submitting.value = false
      }, 500)
    }
  })
}

// 关闭排班对话框
const handleScheduleDialogClose = () => {
  scheduleFormRef.value?.resetFields()
  Object.assign(scheduleForm, {
    doctor: '',
    department: '',
    date: '',
    shift: '',
    time_slot: '',
    quota: 10,
    remark: ''
  })
}

// 操作对话框
const operationDialogVisible = ref(false)
const operationDialogTitle = ref('')
const operationFormRef = ref<FormInstance>()
const operationType = ref<'cancel' | 'substitute'>('cancel')

const operationForm = reactive({
  doctor: '',
  department: '',
  date: '',
  time_slot: '',
  reason: '',
  substitute_doctor: ''
})

const operationFormRules: FormRules = {
  reason: [{ required: true, message: '请输入停诊原因', trigger: 'blur' }],
  substitute_doctor: [{ required: true, message: '请选择替诊医生', trigger: 'change' }]
}

// 提交操作
const handleSubmitOperation = async () => {
  if (!operationFormRef.value) return

  await operationFormRef.value.validate((valid) => {
    if (valid) {
      const schedule = schedules.value.find(s =>
        s.doctor === operationForm.doctor &&
        s.date === operationForm.date &&
        s.time_slot === operationForm.time_slot
      )

      if (schedule) {
        if (operationType.value === 'cancel') {
          schedule.status = 'canceled'
          ElMessage.success('停诊设置成功')
        } else {
          schedule.status = 'substituted'
          ElMessage.success('替诊设置成功')
        }
      }

      operationDialogVisible.value = false
    }
  })
}

// 限号设置
const quotaSettingsVisible = ref(false)
const quotaFormRef = ref<FormInstance>()

const quotaSettings = reactive({
  morning: 10,
  afternoon: 10,
  evening: 10,
  allowOverbook: false,
  overbookRatio: 20
})

const handleSaveQuotaSettings = () => {
  ElMessage.success('限号设置已保存')
  quotaSettingsVisible.value = false
}

// 查看全部挂号记录
const handleViewAllRegistrations = () => {
  ElMessage.info('跳转到挂号记录详情页')
}

// 查看挂号详情
const handleViewRegistration = (row: any) => {
  ElMessageBox.alert(
    `
    <div style="line-height: 2;">
      <strong>患者姓名：</strong>${row.patient_name}<br>
      <strong>患者ID：</strong>${row.patient_id}<br>
      <strong>科室：</strong>${row.department}<br>
      <strong>医生：</strong>${row.doctor}<br>
      <strong>班次：</strong>${row.shift}<br>
      <strong>时段：</strong>${row.time_slot}<br>
      <strong>挂号时间：</strong>${row.register_time}<br>
      <strong>状态：</strong>${getStatusText(row.status)}
    </div>
    `,
    '挂号详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

// 退号
const handleCancelRegistration = (row: any) => {
  ElMessageBox.confirm(
    `确定要为患者"${row.patient_name}"办理退号吗？`,
    '退号确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = registrations.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      registrations.value.splice(index, 1)
      ElMessage.success('退号成功')
    }
  }).catch(() => {
    // 用户取消退号
  })
}

// 格式化日期
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取周的开始日期（周一）
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 初始化
onMounted(() => {
  loadDepts()
})
</script>

<style scoped lang="scss">
.outpatient-manage {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15);
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.blue-icon {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: #fff;
}

.green-icon {
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  color: #fff;
}

.yellow-icon {
  background: linear-gradient(135deg, #ECC94B 0%, #D69E2E 100%);
  color: #fff;
}

.red-icon {
  background: linear-gradient(135deg, #FC8181 0%, #F56565 100%);
  color: #fff;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748B;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1E293B;
}

.warning-text {
  color: #ECC94B;
}

.danger-text {
  color: #FC8181;
}

.filter-section {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.schedule-calendar {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-title {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
}

.current-week {
  min-width: 200px;
  text-align: center;
}

.week-view,
.day-view {
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.week-header,
.day-header {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

.day-header {
  grid-template-columns: 100px 1fr;
}

.time-column,
.day-column,
.schedule-column {
  padding: 12px;
  text-align: center;
  border-right: 1px solid rgba(66, 153, 225, 0.08);
  color: #4A5568;
}

.day-column:last-child {
  border-right: none;
}

.day-column.is-today {
  background: rgba(66, 153, 225, 0.1);
}

.day-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.day-date {
  font-size: 12px;
  color: #94A3B8;
}

.week-body,
.day-body {
  max-height: 500px;
  overflow-y: auto;
}

.time-row {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
}

.day-body .time-row {
  grid-template-columns: 100px 1fr;
}

.time-cell,
.schedule-cell {
  padding: 10px;
  border-right: 1px solid rgba(66, 153, 225, 0.08);
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
}

.schedule-cell {
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(66, 153, 225, 0.05);
  }
}

.schedule-item {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  background: rgba(66, 153, 225, 0.1);
  border: 1px solid rgba(66, 153, 225, 0.2);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(66, 153, 225, 0.15);
    transform: scale(1.02);
  }

  &.is-canceled {
    background: rgba(252, 129, 129, 0.1);
    border-color: rgba(252, 129, 129, 0.2);
  }

  &.is-substituted {
    background: rgba(250, 204, 21, 0.1);
    border-color: rgba(250, 204, 21, 0.2);
  }
}

.schedule-doctor {
  font-weight: 600;
  margin-bottom: 3px;
  color: #1E293B;
}

.schedule-dept {
  font-size: 12px;
  color: #64748B;
  margin-bottom: 3px;
}

.schedule-quota {
  font-size: 12px;
  text-align: right;
  color: #94A3B8;
}

.registration-list {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

.form-tip {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 5px;
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;

  th {
    background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
    color: #4299E1;
    border-color: rgba(66, 153, 225, 0.1);
    font-weight: 600;
  }

  td {
    border-color: rgba(66, 153, 225, 0.08);
    color: #4A5568;
  }

  tr:hover > td {
    background: rgba(66, 153, 225, 0.05);
  }

  .el-table__body tr.current-row > td {
    background: rgba(66, 153, 225, 0.08);
  }
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

:deep(.el-button--primary.is-link) {
  color: #4299E1;

  &:hover {
    color: #3182CE;
  }
}

:deep(.el-button--danger.is-link) {
  color: #F56565;

  &:hover {
    color: #E53E3E;
  }
}

:deep(.el-button--text) {
  color: #4299E1;

  &:hover {
    color: #3182CE;
  }
}
</style>