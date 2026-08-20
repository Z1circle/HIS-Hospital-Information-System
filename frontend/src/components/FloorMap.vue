<template>
  <div class="floor-map-container">
    <!-- ── 顶部标题栏 ── -->
    <div class="map-header">
      <div class="header-left">
        <span class="header-icon">🏥</span>
        <div>
          <div class="section-title">医院楼层导览</div>
          <div class="section-subtitle">{{ currentFloorName }} · 湖北省中医院</div>
        </div>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索科室名称"
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- ── 图例栏 ── -->
    <div class="legend-bar">
      <div class="legend-label">科室类型</div>
      <div class="legend-list">
        <div v-for="item in legendItems" :key="item.type" class="legend-item">
          <span class="legend-color" :style="{ background: item.color }"></span>
          <span class="legend-text">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- ── 楼层选择器 ── -->
    <div class="floor-selector">
      <div
        v-for="floor in floors"
        :key="floor.floor_code"
        :class="['floor-tab', { active: currentFloor === floor.floor_code }]"
        @click="currentFloor = floor.floor_code"
      >
        <span class="floor-label">{{ formatFloorLabel(floor) }}</span>
        <span class="floor-desc">{{ floor.description }}</span>
      </div>
    </div>

    <!-- ── 地图主体 ── -->
    <div class="map-content" ref="mapContainer">
      <div v-if="loading" class="map-loading">
        <div class="loading-spinner"></div>
        <span>加载地图数据...</span>
      </div>

      <template v-else>
        <svg
          class="floor-svg"
          viewBox="0 0 100 78"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <!-- 阴影滤镜 -->
            <filter id="cardShadow" x="-10%" y="-10%" width="125%" height="125%">
              <feDropShadow dx="0.4" dy="0.6" stdDeviation="0.8" flood-color="#1E293B" flood-opacity="0.15"/>
            </filter>
            <filter id="hoverShadow" x="-15%" y="-15%" width="140%" height="140%">
              <feDropShadow dx="0.6" dy="1.0" stdDeviation="1.5" flood-color="#1E293B" flood-opacity="0.3"/>
            </filter>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- 渐变 -->
            <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="30%" stop-color="#FAFBFC"/>
              <stop offset="70%" stop-color="#F1F5F9"/>
              <stop offset="100%" stop-color="#E8EEF5"/>
            </linearGradient>
            <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#1E40AF"/>
              <stop offset="100%" stop-color="#3B82F6"/>
            </linearGradient>
            <!-- 科室悬停渐变 -->
            <linearGradient id="deptHoverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#F1F5F9"/>
            </linearGradient>
            <!-- 走廊渐变 -->
            <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="50%" stop-color="#F8FAFC"/>
              <stop offset="100%" stop-color="#F1F5F9"/>
            </linearGradient>
            <!-- 入口渐变 -->
            <linearGradient id="mainEntranceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#60A5FA"/>
              <stop offset="100%" stop-color="#2563EB"/>
            </linearGradient>
            <linearGradient id="emergencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F87171"/>
              <stop offset="100%" stop-color="#DC2626"/>
            </linearGradient>
            <!-- 设施渐变 -->
            <linearGradient id="facilityGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#F8FAFC"/>
            </linearGradient>
          </defs>

          <!-- 建筑背景 -->
          <rect x="1" y="1" width="98" height="76" rx="4" fill="url(#bgGrad)"/>

          <!-- 建筑外轮廓 -->
          <rect x="1" y="1" width="98" height="76" rx="4" fill="none" stroke="#94A3B8" stroke-width="1.2" opacity="0.5"/>
          <rect x="2" y="2" width="96" height="74" rx="3" fill="none" stroke="#CBD5E1" stroke-width="0.5"/>

          <!-- 装饰边框 -->
          <rect x="0.5" y="0.5" width="99" height="77" rx="4.5" fill="none" stroke="#3B82F6" stroke-width="0.2" opacity="0.2"/>

          <!-- 内墙线 -->
          <line x1="3" y1="38" x2="97" y2="38" stroke="#CBD5E1" stroke-width="0.4" stroke-dasharray="2,1"/>
          <line x1="50" y1="3" x2="50" y2="77" stroke="#CBD5E1" stroke-width="0.4" stroke-dasharray="2,1"/>

          <!-- ── 走廊系统 ── -->
          <g class="corridor-group">
            <!-- 主走廊阴影 -->
            <rect x="4" y="35.5" width="92" height="5" rx="0.6" fill="#1E293B" opacity="0.04"/>
            <rect x="47.5" y="4" width="5" height="70" rx="0.6" fill="#1E293B" opacity="0.04"/>
            <!-- 主走廊 水平 -->
            <rect x="4" y="35.5" width="92" height="5" rx="0.6" fill="url(#corridorGrad)" stroke="#94A3B8" stroke-width="0.3" opacity="0.95"/>
            <!-- 主走廊 垂直 -->
            <rect x="47.5" y="4" width="5" height="70" rx="0.6" fill="url(#corridorGrad)" stroke="#94A3B8" stroke-width="0.3" opacity="0.95"/>
            <!-- 次级走廊 水平上 -->
            <rect x="4" y="20" width="43.5" height="3" rx="0.5" fill="#FAFBFC" stroke="#E2E8F0" stroke-width="0.2"/>
            <!-- 次级走廊 水平下 -->
            <rect x="52.5" y="52" width="43.5" height="3" rx="0.5" fill="#FAFBFC" stroke="#E2E8F0" stroke-width="0.2"/>
            <!-- 走廊装饰线 -->
            <line x1="4" y1="36" x2="96" y2="36" stroke="#E2E8F0" stroke-width="0.2"/>
            <line x1="4" y1="40" x2="96" y2="40" stroke="#E2E8F0" stroke-width="0.2"/>
            <line x1="48" y1="4" x2="48" y2="74" stroke="#E2E8F0" stroke-width="0.2"/>
            <line x1="52" y1="4" x2="52" y2="74" stroke="#E2E8F0" stroke-width="0.2"/>
          </g>

          <!-- 走廊标签 -->
          <text x="50" y="33.5" text-anchor="middle" fill="#94A3B8" font-size="1.3" font-weight="500" opacity="0.7">主走廊</text>
          <text x="50" y="75.5" text-anchor="middle" fill="#94A3B8" font-size="1.3" font-weight="500" opacity="0.7">主走廊</text>
          <text x="43" y="38.5" text-anchor="middle" fill="#94A3B8" font-size="1.3" font-weight="500" opacity="0.7">主走廊</text>
          <text x="57" y="38.5" text-anchor="middle" fill="#94A3B8" font-size="1.3" font-weight="500" opacity="0.7">主走廊</text>

          <!-- ── 分区背景色 ── -->
          <g class="zone-backgrounds" opacity="0.06">
            <rect x="4" y="4" width="43.5" height="16" rx="1" :fill="zoneColors[0]"/>
            <rect x="52.5" y="4" width="43.5" height="16" rx="1" :fill="zoneColors[1]"/>
            <rect x="4" y="23.5" width="43.5" height="12" rx="1" :fill="zoneColors[2]"/>
            <rect x="52.5" y="23.5" width="43.5" height="12" rx="1" :fill="zoneColors[3]"/>
            <rect x="4" y="41" width="43.5" height="33" rx="1" :fill="zoneColors[4]"/>
            <rect x="52.5" y="41" width="43.5" height="11" rx="1" :fill="zoneColors[5]"/>
            <rect x="52.5" y="55.5" width="43.5" height="18.5" rx="1" :fill="zoneColors[6]"/>
          </g>

          <!-- ── 区域标注 ── -->
          <g class="zone-labels">
            <text x="25.5" y="6.5" text-anchor="middle" fill="#64748B" font-size="1.5" font-weight="600" opacity="0.55">{{ zoneLabels[0] }}</text>
            <text x="74.5" y="6.5" text-anchor="middle" fill="#64748B" font-size="1.5" font-weight="600" opacity="0.55">{{ zoneLabels[1] }}</text>
            <text x="25.5" y="43" text-anchor="middle" fill="#64748B" font-size="1.5" font-weight="600" opacity="0.55">{{ zoneLabels[2] }}</text>
            <text x="74.5" y="43" text-anchor="middle" fill="#64748B" font-size="1.5" font-weight="600" opacity="0.55">{{ zoneLabels[3] }}</text>
          </g>

          <!-- ── 部门房间 ── -->
          <g v-for="dept in currentData.departments" :key="dept.id">
            <!-- 房间阴影 -->
            <rect
              :x="dept.x_pos + 0.3"
              :y="dept.y_pos + 0.3"
              :width="dept.width"
              :height="dept.height"
              :rx="0.8"
              fill="#1E293B"
              opacity="0.06"
            />
            <!-- 房间背景 -->
            <rect
              :x="dept.x_pos"
              :y="dept.y_pos"
              :width="dept.width"
              :height="dept.height"
              :rx="0.8"
              :fill="getDepartmentColor(dept.department_type)"
              :stroke="selectedDept?.id === dept.id ? '#1D4ED8' : getDarkerColor(dept.department_type)"
              stroke-width="selectedDept?.id === dept.id ? '0.6' : '0.35'"
              class="dept-room-rect"
              :filter="selectedDept?.id === dept.id ? 'url(#glow)' : 'none'"
              @click="selectDepartment(dept)"
            />
            <!-- 顶部高光条 -->
            <rect
              :x="dept.x_pos + 0.4"
              :y="dept.y_pos + 0.4"
              :width="dept.width - 0.8"
              :height="1.4"
              :rx="0.3"
              fill="#FFFFFF"
              opacity="0.6"
              class="dept-highlight-bar"
            />
            <!-- 底部装饰条 -->
            <rect
              :x="dept.x_pos"
              :y="dept.y_pos + dept.height - 1.2"
              :width="dept.width"
              :height="1.2"
              :rx="0.2"
              :fill="getDarkerColor(dept.department_type)"
              opacity="0.15"
            />
            <!-- 房间号 -->
            <text
              :x="dept.x_pos + 1.2"
              :y="dept.y_pos + dept.height - 2.2"
              text-anchor="start"
              :fill="getTextColor(dept.department_type)"
              font-size="1.2"
              font-weight="700"
              class="dept-room-no"
            >{{ dept.room_number }}</text>
            <!-- 科室名称 -->
            <text
              :x="dept.x_pos + dept.width / 2"
              :y="dept.y_pos + dept.height / 2 + 0.6"
              text-anchor="middle"
              :fill="getTextColor(dept.department_type)"
              font-size="2.2"
              font-weight="600"
              class="dept-name-text"
            >{{ getDeptDisplayName(dept) }}</text>
            <!-- 状态指示点 -->
            <circle
              :cx="dept.x_pos + dept.width - 1.5"
              :cy="dept.y_pos + dept.height - 1.8"
              r="0.5"
              :fill="dept.is_open ? '#10B981' : '#EF4444'"
              opacity="0.95"
            />
            <circle
              :cx="dept.x_pos + dept.width - 1.5"
              :cy="dept.y_pos + dept.height - 1.8"
              r="0.3"
              fill="#FFFFFF"
              opacity="0.8"
            />
          </g>

          <!-- ── 公共设施 ── -->
          <g v-for="facility in currentData.facilities" :key="facility.id" class="facility-group">
            <!-- 阴影 -->
            <circle
              :cx="facility.x_pos + 0.2"
              :cy="facility.y_pos + 0.2"
              r="2.2"
              :fill="getFacilityColor(facility.facility_type)"
              opacity="0.08"
            />
            <!-- 外圈 -->
            <circle
              :cx="facility.x_pos"
              :cy="facility.y_pos"
              r="2.0"
              fill="#FFFFFF"
              :stroke="getFacilityColor(facility.facility_type)"
              stroke-width="0.5"
              class="facility-outer"
            />
            <!-- 内圈 -->
            <circle
              :cx="facility.x_pos"
              :cy="facility.y_pos"
              r="1.2"
              :fill="getFacilityColor(facility.facility_type)"
              opacity="0.85"
              class="facility-inner"
            />
            <!-- 中心亮点 -->
            <circle
              :cx="facility.x_pos - 0.3"
              :cy="facility.y_pos - 0.3"
              r="0.4"
              fill="#FFFFFF"
              opacity="0.8"
            />
            <!-- 标签 -->
            <text
              :x="facility.x_pos"
              :y="facility.y_pos - 2.8"
              text-anchor="middle"
              fill="#475569"
              font-size="1.25"
              font-weight="500"
              class="facility-label"
            >{{ facility.name }}</text>
          </g>

          <!-- ── 出入口标记 ── -->
          <g class="entrance-markers">
            <!-- 主入口 -->
            <polygon points="44,3 46,1 54,1 56,3" fill="url(#mainEntranceGrad)"/>
            <polygon points="45,3 55,3 55,4.5 45,4.5" fill="#3B82F6" opacity="0.8"/>
            <polygon points="46,4.5 54,4.5 50,6" fill="#60A5FA" opacity="0.7"/>
            <text x="50" y="3" text-anchor="middle" fill="#FFFFFF" font-size="1.25" font-weight="600">主入口</text>
            <!-- 急诊入口 -->
            <polygon points="80,3 82,1 90,1 92,3" fill="url(#emergencyGrad)"/>
            <polygon points="81,3 91,3 91,4.5 81,4.5" fill="#EF4444" opacity="0.8"/>
            <polygon points="82,4.5 90,4.5 86,6" fill="#F87171" opacity="0.7"/>
            <text x="86" y="3" text-anchor="middle" fill="#FFFFFF" font-size="1.25" font-weight="600">急诊入口</text>
          </g>

          <!-- ── 比例尺与指北针 ── -->
          <g class="scale-compass">
            <!-- 比例尺背景 -->
            <rect x="81" y="74" width="15" height="4" rx="0.8" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="0.2"/>
            <line x1="82" y1="76" x2="94" y2="76" stroke="#3B82F6" stroke-width="0.4"/>
            <line x1="82" y1="75.3" x2="82" y2="76.7" stroke="#3B82F6" stroke-width="0.35"/>
            <line x1="88" y1="75.3" x2="88" y2="76.7" stroke="#3B82F6" stroke-width="0.35"/>
            <line x1="94" y1="75.3" x2="94" y2="76.7" stroke="#3B82F6" stroke-width="0.35"/>
            <text x="88" y="74.8" text-anchor="middle" fill="#64748B" font-size="1.0">~50m</text>
            <!-- 指北针 -->
            <polygon points="96.5,68.5 96.5,73.5 95,71 96.5,70 98,71" fill="#3B82F6" opacity="0.8"/>
            <polygon points="96.5,70 96.5,73.5 97.2,71.5" fill="#60A5FA" opacity="0.6"/>
            <text x="96.5" y="68.2" text-anchor="middle" fill="#1E40AF" font-size="1.15" font-weight="600">N</text>
          </g>
        </svg>

        <!-- 搜索结果面板 -->
        <div v-if="searchResults.length > 0" class="search-results-panel">
          <div class="results-header">
            <el-icon :size="14"><Search /></el-icon>
            <span>搜索结果 ({{ searchResults.length }})</span>
            <el-icon class="close-icon" @click="clearSearch"><Close /></el-icon>
          </div>
          <div class="results-list">
            <div
              v-for="item in searchResults"
              :key="item.id"
              class="result-item"
              @click="jumpToDepartment(item)"
            >
              <div class="result-left">
                <span class="result-name">{{ item.department_name }}</span>
                <span class="result-location">{{ item.floor_name }} · {{ item.room_number }}</span>
              </div>
              <div :class="['result-badge', item.is_open ? 'open' : 'closed']">
                {{ item.is_open ? '开诊' : '关闭' }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── 当前选中提示 ── -->
    <div v-if="selectedDept && !showDetail" class="selected-hint">
      <span class="hint-text">{{ selectedDept.department_name }} · {{ selectedDept.room_number }}</span>
      <el-button size="small" type="primary" text @click="showDetail = true">查看详情</el-button>
    </div>

    <!-- ── 科室详情弹窗 ── -->
    <el-dialog
      v-model="showDetail"
      :title="selectedDept?.department_name || '科室详情'"
      width="400px"
      class="dept-detail-dialog"
      :close-on-click-modal="false"
    >
      <div v-if="selectedDept" class="detail-content">
        <div class="detail-header-card">
          <div class="detail-status">
            <span :class="['status-dot', selectedDept.is_open ? 'open' : 'closed']"></span>
            <span class="status-text">{{ selectedDept.is_open ? '开诊中' : '已关闭' }}</span>
          </div>
          <div v-if="selectedDept.fee" class="detail-fee">
            <span class="fee-label">挂号费</span>
            <span class="fee-amount">¥{{ selectedDept.fee }}</span>
          </div>
        </div>

        <div class="detail-info-grid">
          <div class="info-item">
            <span class="info-label">所在楼层</span>
            <span class="info-value">{{ getFloorName(selectedDept.floor_id) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">房间号</span>
            <span class="info-value highlight">{{ selectedDept.room_number }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">科室类型</span>
            <span class="info-value">{{ getDepartmentTypeName(selectedDept.department_type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">联系电话</span>
            <span class="info-value">{{ selectedDept.phone || '暂无' }}</span>
          </div>
        </div>

        <div v-if="selectedDept.description" class="detail-desc">
          <div class="desc-title">科室简介</div>
          <p class="desc-text">{{ selectedDept.description }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="navigateToDept">
          <el-icon :size="14"><MapLocation /></el-icon>
          导航到此处
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { MapLocation, Search, Close } from '@element-plus/icons-vue'

interface Floor {
  id: number
  floor_name: string
  floor_code: string
  description: string
  sort_order: number
  is_active: boolean
}

interface Department {
  id: number
  floor_id: number
  department_id: number | null
  x_pos: number
  y_pos: number
  width: number
  height: number
  room_number: string
  phone: string
  is_open: boolean
  department_type: string
  department_name: string
  fee?: number
  description?: string
}

interface SearchResult extends Department {
  floor_name?: string
  floor_code?: string
}

interface Facility {
  id: number
  floor_id: number
  facility_type: string
  name: string
  x_pos: number
  y_pos: number
  description: string
}

const floors = ref<Floor[]>([])
const currentFloor = ref('F1')
const loading = ref(false)
const showDetail = ref(false)
const selectedDept = ref<Department | null>(null)
const searchKeyword = ref('')
const searchResults = ref<SearchResult[]>([])
const mapContainer = ref<HTMLElement | null>(null)

const floorData = ref<Record<string, { departments: Department[]; facilities: Facility[] }>>({})

const currentFloorName = computed(() => {
  const f = floors.value.find(f => f.floor_code === currentFloor.value)
  return f?.floor_name || ''
})

// 区域标签随楼层动态变化
const zoneLabels = computed(() => {
  const m: Record<string, string[]> = {
    F1: ['门 诊 区', '药 房', '综合服务区', '后勤区'],
    F2: ['内 科', '外 科', '妇 产 科', '儿 科'],
    F3: ['检验影像区', '眼科/ENT', '皮肤/专科', ''],
    F4: ['手 术 室', 'I C U', '住 院 部', ''],
    B1: ['停 车 场', '设备间', '食堂/后勤', ''],
  }
  return m[currentFloor.value] || ['', '', '', '']
})

const zoneColors = computed(() => {
  const m: Record<string, string[]> = {
    F1: ['#3B82F6', '#0EA5E9', '#6366F1', '#64748B'],
    F2: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
    F3: ['#CA8A04', '#06B6D4', '#EC4899', ''],
    F4: ['#7C3AED', '#BE123C', '#2563EB', ''],
    B1: ['#64748B', '#475569', '#F43F5E', ''],
  }
  return m[currentFloor.value] || ['', '', '', '']
})

const legendItems = [
  { type: 'internal', label: '内科', color: '#3B82F6' },
  { type: 'surgery', label: '外科', color: '#10B981' },
  { type: 'obstetrics', label: '妇产科', color: '#8B5CF6' },
  { type: 'pediatrics', label: '儿科', color: '#F59E0B' },
  { type: 'laboratory', label: '检验科', color: '#CA8A04' },
  { type: 'radiology', label: '影像科', color: '#EF4444' },
  { type: 'pharmacy', label: '药房', color: '#0EA5E9' },
  { type: 'emergency', label: '急诊科', color: '#DC2626' },
]

const currentData = computed(() => {
  return floorData.value[currentFloor.value] || { departments: [], facilities: [] }
})

const getDepartmentColor = (type: string) => {
  const colors: Record<string, string> = {
    internal: '#3B82F6',
    surgery: '#10B981',
    obstetrics: '#8B5CF6',
    pediatrics: '#F59E0B',
    laboratory: '#CA8A04',
    radiology: '#EF4444',
    ophthalmology: '#06B6D4',
    ent: '#F43F5E',
    dermatology: '#EC4899',
    pharmacy: '#0EA5E9',
    emergency: '#DC2626',
    service: '#6366F1',
    operation: '#7C3AED',
    icu: '#BE123C',
    inpatient: '#2563EB',
    traditional: '#D97706',
    general: '#64748B',
  }
  return colors[type] || '#64748B'
}

const getDarkerColor = (type: string) => {
  const c = getDepartmentColor(type)
  // Simple darken via opacity layering
  return c
}

const getTextColor = (type: string) => {
  // Return white for most colors, dark text for light colors
  const lightTypes = ['laboratory', 'pediatrics']
  return lightTypes.includes(type) ? '#1E293B' : '#FFFFFF'
}

const getFacilityColor = (type: string) => {
  const colors: Record<string, string> = {
    elevator: '#F59E0B',
    stairs: '#64748B',
    toilet: '#475569',
    information: '#3B82F6',
    entrance: '#10B981',
    canteen: '#F43F5E',
    atm: '#0EA5E9',
    water: '#06B6D4',
    nurse: '#EC4899',
    parking: '#8B5CF6',
  }
  return colors[type] || '#64748B'
}

const getDeptDisplayName = (dept: Department) => {
  const name = dept.department_name || ''
  if (name.length > 5) {
    return name.substring(0, 5) + '..'
  }
  return name
}

const getFloorName = (floorId: number) => {
  const floor = floors.value.find(f => f.id === floorId)
  return floor?.floor_name || ''
}

const formatFloorLabel = (floor: Floor) => {
  const code = floor.floor_code
  if (code === 'B1') return 'B1'
  // Extract number from F1, F2, etc.
  const num = code.replace(/^F/i, '')
  return `${num}F`
}

const getDepartmentTypeName = (type: string) => {
  const names: Record<string, string> = {
    internal: '内科',
    surgery: '外科',
    obstetrics: '妇产科',
    pediatrics: '儿科',
    laboratory: '检验科',
    radiology: '影像科',
    ophthalmology: '眼科',
    ent: '耳鼻喉科',
    dermatology: '皮肤科',
    pharmacy: '药房',
    emergency: '急诊科',
    service: '服务中心',
    operation: '手术室',
    icu: '重症监护',
    inpatient: '住院部',
    traditional: '中医科',
    general: '综合科',
  }
  return names[type] || type
}

// ── 数据加载 ──

const loadFloors = async () => {
  try {
    const res = await axios.get('/api/floors')
    floors.value = res.data.floors || []
    if (floors.value.length > 0) {
      currentFloor.value = floors.value[0].floor_code
    }
  } catch (err) {
    console.error('加载楼层列表失败:', err)
  }
}

const loadFloorData = async (floorCode: string) => {
  if (floorData.value[floorCode]) return

  loading.value = true
  try {
    const res = await axios.get(`/api/floors/${floorCode}`)
    if (res.data.success) {
      floorData.value[floorCode] = {
        departments: res.data.departments || [],
        facilities: res.data.facilities || [],
      }
    }
  } catch (err) {
    console.error('加载楼层数据失败:', err)
    floorData.value[floorCode] = { departments: [], facilities: [] }
  } finally {
    loading.value = false
  }
}

const selectDepartment = (dept: Department) => {
  selectedDept.value = dept
  showDetail.value = true
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    const res = await axios.get('/api/floor-search', { params: { keyword: searchKeyword.value } })
    searchResults.value = res.data.results || []
  } catch (err) {
    console.error('搜索科室失败:', err)
  }
}

const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = []
}

const jumpToDepartment = (item: SearchResult) => {
  currentFloor.value = item.floor_code || 'F1'
  selectedDept.value = item
  showDetail.value = true
  searchResults.value = []
}

const navigateToDept = () => {
  if (!selectedDept.value) return

  const deptName = selectedDept.value.department_name
  const floorName = getFloorName(selectedDept.value.floor_id)

  const url = `https://uri.amap.com/marker?position=116.397428,39.90923&name=${encodeURIComponent(deptName + '-' + floorName)}&coordinate=gaode&callnative=0`
  window.open(url, '_blank')
}

watch(currentFloor, (newVal) => {
  loadFloorData(newVal)
  searchResults.value = []
})

onMounted(() => {
  loadFloors()
})
</script>

<style scoped>
/* ============================================================
   容器
   ============================================================ */
.floor-map-container {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06);
  margin-top: 20px;
  border: 1px solid #F1F5F9;
}

/* ============================================================
   标题栏
   ============================================================ */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 26px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: 0.3px;
}

.section-subtitle {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}

.header-right {
  display: flex;
  gap: 8px;
}

.search-input {
  width: 220px;
}

:deep(.search-input .el-input__wrapper) {
  border-radius: 10px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  transition: all 0.25s;
  box-shadow: none;
}

:deep(.search-input .el-input__wrapper:hover) {
  border-color: #93C5FD;
  background: #FFFFFF;
}

:deep(.search-input .el-input__wrapper.is-focus) {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  background: #FFFFFF;
}

/* ============================================================
   图例
   ============================================================ */
.legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid #E2E8F0;
}

.legend-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  margin-right: 4px;
  white-space: nowrap;
}

.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2.5px;
  flex-shrink: 0;
}

.legend-text {
  font-size: 11px;
  color: #64748B;
  white-space: nowrap;
}

/* ============================================================
   楼层选择器
   ============================================================ */
.floor-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.floor-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 18px;
  border-radius: 12px;
  background: #F1F5F9;
  color: #64748B;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  border: 1px solid transparent;
  min-width: 72px;
}

.floor-tab:hover {
  background: #E2E8F0;
  color: #334155;
}

.floor-tab.active {
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
  color: #FFFFFF;
  border-color: #2563EB;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.floor-label {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.floor-desc {
  font-size: 10px;
  opacity: 0.75;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================================
   地图主体
   ============================================================ */
.map-content {
  position: relative;
  min-height: 420px;
  background: #F8FAFC;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 450px;
  gap: 16px;
  color: #94A3B8;
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.floor-svg {
  width: 100%;
  height: 480px;
  display: block;
}

/* ── SVG 部门房间 ── */
.dept-room-rect {
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.dept-room-rect:hover {
  filter: url(#hoverShadow);
  opacity: 0.95;
  transform-origin: center;
}

.dept-room-rect:active {
  transform: scale(0.98);
}

.dept-name-text,
.dept-room-no,
.dept-highlight-bar {
  pointer-events: none;
}

/* ── 设施标记 ── */
.facility-group {
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.facility-group:hover {
  transform: scale(1.15);
  filter: url(#glow);
}

.facility-group:active {
  transform: scale(0.95);
}

.facility-label {
  pointer-events: none;
}

.facility-outer {
  transition: stroke-width 0.25s;
}

.facility-group:hover .facility-outer {
  stroke-width: 0.8;
}

/* ============================================================
   选中提示
   ============================================================ */
.selected-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin-top: 12px;
  background: #EFF6FF;
  border-radius: 10px;
  border: 1px solid #BFDBFE;
}

.hint-text {
  font-size: 13px;
  font-weight: 500;
  color: #1E40AF;
}

/* ============================================================
   搜索结果面板
   ============================================================ */
.search-results-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 260px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 10;
  overflow: hidden;
  border: 1px solid #E2E8F0;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.results-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  border-bottom: 1px solid #BFDBFE;
}

.results-header span {
  font-size: 13px;
  font-weight: 600;
  color: #1E40AF;
}

.close-icon {
  margin-left: auto;
  cursor: pointer;
  color: #94A3B8;
  transition: color 0.2s;
}

.close-icon:hover {
  color: #475569;
}

.results-list {
  max-height: 240px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #F1F5F9;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover {
  background: #F8FAFC;
}

.result-item:last-child {
  border-bottom: none;
}

.result-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-name {
  font-size: 13px;
  font-weight: 500;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-location {
  font-size: 11px;
  color: #94A3B8;
}

.result-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.result-badge.open {
  background: #D1FAE5;
  color: #059669;
}

.result-badge.closed {
  background: #FEE2E2;
  color: #DC2626;
}

/* ============================================================
   详情弹窗
   ============================================================ */
.detail-content {
  padding: 4px 0;
}

.detail-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid #E2E8F0;
}

.detail-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.open {
  background: #10B981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.status-dot.closed {
  background: #EF4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.detail-fee {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.fee-label {
  font-size: 12px;
  color: #94A3B8;
}

.fee-amount {
  font-size: 18px;
  font-weight: 700;
  color: #EF4444;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #FFFFFF;
}

.info-item:nth-child(odd) {
  background: #F8FAFC;
}

.info-label {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
}

.info-value.highlight {
  color: #2563EB;
}

.detail-desc {
  padding: 14px 16px;
  background: #F8FAFC;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
}

.desc-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 6px;
}

.desc-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* ── 弹窗头部 ── */
:deep(.dept-detail-dialog .el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #E2E8F0;
}

:deep(.dept-detail-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
}

:deep(.dept-detail-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.dept-detail-dialog .el-dialog__footer) {
  padding: 12px 20px;
  border-top: 1px solid #F1F5F9;
}
</style>
