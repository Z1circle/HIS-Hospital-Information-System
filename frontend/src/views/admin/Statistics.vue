<template>
  <div class="statistics-page">
    <div class="page-toolbar">
      <el-button size="small" type="primary" class="config-btn" @click="showConfigModal = true">
        <el-icon :size="16"><Setting /></el-icon>
        <span>配置仪表板</span>
      </el-button>
    </div>

    <!-- 顶部核心指标卡片 -->
    <div class="metrics-row" @dragover.prevent @drop="handleMetricDrop($event)">
      <div
        v-for="(metric, index) in visibleMetrics"
        :key="metric.id"
        class="metric-card glass-card"
        :class="{ 'drag-over': dragOverMetric === metric.id }"
        draggable="true"
        @dragstart="handleMetricDragStart($event, metric, index)"
        @dragend="handleMetricDragEnd"
        @dragover.prevent="dragOverMetric = metric.id"
        @dragleave="dragOverMetric = null"
        @mouseenter="cardHover = metric.id"
        @mouseleave="cardHover = ''"
        @click="metric.onClick?.()"
      >
        <div class="metric-content">
          <div class="metric-icon-wrap" :class="metric.iconClass">
            <el-icon :size="28"><component :is="metric.icon" /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value" :class="{ 'warning-value': metric.id === 'stock' }">
              <span v-if="metric.id === 'income'" class="currency">¥</span>
              <span class="num">{{ getMetricValue(metric) }}</span>
            </div>
            <div v-if="metric.trend" class="metric-trend positive">
              <el-icon :size="14"><TrendCharts /></el-icon>
              <span>{{ metric.trend }}</span>
            </div>
            <div v-else-if="metric.id === 'income'" class="metric-pie-wrap">
              <div class="mini-pie">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#E2E8F0" stroke-width="8" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#4299E1" stroke-width="8"
                    stroke-dasharray="100.5" stroke-dashoffset="0" transform="rotate(-90 20 20)" />
                </svg>
              </div>
              <div class="pie-legend">
                <span class="legend-item"><span class="legend-dot blue"></span>医保 60%</span>
                <span class="legend-item"><span class="legend-dot gray"></span>自费 40%</span>
              </div>
            </div>
            <div v-else-if="metric.id === 'prescriptions'" class="metric-tag normal">
              <el-icon :size="12"><CheckCircle /></el-icon>
              <span>抗菌药物使用率 12%</span>
            </div>
            <div v-else-if="metric.id === 'stock'" class="metric-action">
              <span class="action-text">点击查看详情</span>
              <el-icon :size="14"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
        <div class="metric-glow" :class="metric.glowClass"></div>
      </div>
    </div>

    <!-- 中部趋势分析区 -->
    <div class="charts-section">
      <div class="chart-card glass-card">
        <div class="chart-header">
          <div class="chart-title">
            <el-icon :size="18"><PieChart /></el-icon>
            <span>近7日门诊量趋势</span>
          </div>
          <div class="time-tabs">
            <el-button-group size="small">
              <el-button :type="timeRange === '7d' ? 'primary' : ''" @click="timeRange = '7d'">近7日</el-button>
              <el-button :type="timeRange === '30d' ? 'primary' : ''" @click="timeRange = '30d'">近30日</el-button>
              <el-button :type="timeRange === 'year' ? 'primary' : ''" @click="timeRange = 'year'">本年</el-button>
            </el-button-group>
          </div>
        </div>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card glass-card">
        <div class="chart-header">
          <div class="chart-title">
            <el-icon :size="18"><PieChart /></el-icon>
            <span>今日科室就诊排行</span>
          </div>
        </div>
        <div ref="deptChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 底部运营详情区 -->
    <div class="bottom-section">
      <div class="detail-card glass-card">
        <div class="card-header">
          <div class="card-title">
            <el-icon :size="18"><Bell /></el-icon>
            <span>实时叫号监控</span>
          </div>
          <div class="live-badge">
            <span class="live-dot"></span>
            <span>实时</span>
          </div>
        </div>
        <div class="call-list">
          <div v-for="(call, index) in callingList" :key="index" class="call-item" :class="{ active: index === 0 }">
            <div class="call-rank">{{ index + 1 }}</div>
            <div class="call-info">
              <div class="call-dept">{{ call.dept }}</div>
              <div class="call-doctor">{{ call.doctor }}</div>
            </div>
            <div class="call-status">
              <span :class="call.status">{{ call.status === 'calling' ? '呼叫中' : '等待中' }}</span>
              <span class="call-num">{{ call.number }}号</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-card glass-card">
        <div class="card-header">
          <div class="card-title">
            <el-icon :size="18"><Notification /></el-icon>
            <span>系统公告</span>
          </div>
          <el-button size="small" type="primary" class="add-btn" @click="announceVisible = true">
            <el-icon :size="14"><Plus /></el-icon>
            <span>新增公告</span>
          </el-button>
        </div>
        <div class="announce-list">
          <div v-for="item in announcements" :key="item.id" class="announce-row"
            @mouseenter="hoveredAnnounce = item.id" @mouseleave="hoveredAnnounce = null">
            <div class="announce-tag" :class="item.type">{{ item.type === 'urgent' ? '紧急' : '普通' }}</div>
            <div class="announce-title">{{ item.title }}</div>
            <div class="announce-time">{{ item.created_at }}</div>
            <div class="announce-actions" :class="{ show: hoveredAnnounce === item.id }">
              <button class="delete-btn" @click.stop="delAnnounce(item)">
                <el-icon :size="16"><Delete /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 库存预警弹窗 -->
    <el-dialog v-model="showStockModal" title="库存预警药品" width="420px" :close-on-click-modal="false">
      <div class="stock-modal-content">
        <div v-for="item in stockWarningList" :key="item.id" class="stock-item">
          <div class="stock-info">
            <div class="stock-name">{{ item.name }}</div>
            <div class="stock-spec">{{ item.spec }}</div>
          </div>
          <div class="stock-status">
            <span class="stock-count">库存: {{ item.stock }}</span>
            <span class="stock-min">最低: {{ item.min_stock }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showStockModal = false">关闭</el-button>
        <el-button type="primary" @click="handleRestock">一键补货</el-button>
      </template>
    </el-dialog>

    <!-- 新增公告弹窗 -->
    <el-dialog v-model="announceVisible" title="新增公告" width="440px">
      <el-form :model="announceForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="announceForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="announceForm.content" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="announceForm.type">
            <el-radio value="normal">普通</el-radio>
            <el-radio value="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="announceVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAnnounce">发布</el-button>
      </template>
    </el-dialog>

    <!-- 仪表板配置弹窗 -->
    <el-dialog v-model="showConfigModal" title="配置仪表板" width="400px">
      <div class="config-content">
        <div class="config-section">
          <h4 class="config-title">选择显示的统计组件</h4>
          <div class="metric-checklist">
            <div v-for="metric in allMetrics" :key="metric.id" class="metric-check-item">
              <el-checkbox v-model="metric.visible" @change="saveMetricConfig">
                <div class="check-item-content">
                  <div class="check-icon" :class="metric.iconClass">
                    <el-icon :size="18"><component :is="metric.icon" /></el-icon>
                  </div>
                  <span class="check-label">{{ metric.label }}</span>
                </div>
              </el-checkbox>
            </div>
          </div>
        </div>
        <div class="config-hint">
          <el-icon :size="14" color="#63B3ED"><InfoFilled /></el-icon>
          <span>提示：指标卡片支持拖拽排序，自定义布局将自动保存</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="resetMetricConfig">重置默认</el-button>
        <el-button type="primary" @click="showConfigModal = false">确认配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type ComputedRef } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  UserFilled, Wallet, Files, Warning, TrendCharts, ArrowRight,
  PieChart, Bell, Notification, Plus, Delete, InfoFilled, Setting
} from '@element-plus/icons-vue'

//展示数据
const stats = ref({ todayPatients: 128, todayIncome: 15640, prescriptions: 87, lowStock: 3 })
const cardHover = ref('')
const showStockModal = ref(false)

const animatedPatients = ref(0)
const animatedIncome = ref(0)
const animatedPrescriptions = ref(0)
const animatedLowStock = ref(0)

const timeRange = ref('7d')
const trendChartRef = ref<HTMLDivElement>()
const deptChartRef = ref<HTMLDivElement>()
let trendChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null

const hoveredAnnounce = ref(null)
const announcements = ref<any[]>([])
const announceVisible = ref(false)
const announceForm = ref({ title: '', content: '', type: 'normal' })

const stockWarningList = ref([
  { id: 1, name: '阿莫西林胶囊', spec: '0.5g*20粒', stock: 12, min_stock: 50 },
  { id: 2, name: '布洛芬缓释胶囊', spec: '0.3g*24粒', stock: 8, min_stock: 30 },
  { id: 3, name: '生理盐水', spec: '500ml/瓶', stock: 15, min_stock: 100 },
])

const showConfigModal = ref(false)
const dragOverMetric = ref<string | null>(null)
const draggedMetric = ref<{ id: string; index: number } | null>(null)

interface MetricConfig {
  id: string
  label: string
  icon: any
  iconClass: string
  glowClass: string
  value: number | string | ComputedRef<number | string>
  trend?: string
  visible: boolean
  onClick?: () => void
}

const allMetrics = ref<MetricConfig[]>([
  {
    id: 'patients',
    label: '今日门诊人次',
    icon: UserFilled,
    iconClass: 'blue-icon',
    glowClass: 'blue-glow',
    value: computed(() => animatedPatients.value),
    trend: '较昨日 +5%',
    visible: true
  },
  {
    id: 'income',
    label: '今日总收入',
    icon: Wallet,
    iconClass: 'green-icon',
    glowClass: 'green-glow',
    value: computed(() => formatIncome.value),
    visible: true
  },
  {
    id: 'prescriptions',
    label: '今日处方数',
    icon: Files,
    iconClass: 'purple-icon',
    glowClass: 'purple-glow',
    value: computed(() => animatedPrescriptions.value),
    visible: true
  },
  {
    id: 'stock',
    label: '库存预警药品',
    icon: Warning,
    iconClass: 'red-icon',
    glowClass: 'red-glow',
    value: computed(() => animatedLowStock.value),
    visible: true,
    onClick: () => { showStockModal.value = true }
  }
])

const loadMetricConfig = () => {
  const saved = localStorage.getItem('dashboard_metrics')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      config.forEach((item: { id: string; visible: boolean; index: number }) => {
        const metric = allMetrics.value.find(m => m.id === item.id)
        if (metric) metric.visible = item.visible
      })
    } catch { /* ignore */ }
  }
}

const saveMetricConfig = () => {
  const config = allMetrics.value.map((m, index) => ({
    id: m.id,
    visible: m.visible,
    index
  }))
  localStorage.setItem('dashboard_metrics', JSON.stringify(config))
}

const visibleMetrics = computed(() => {
  return allMetrics.value.filter(m => m.visible)
})

const handleMetricDragStart = (event: DragEvent, metric: MetricConfig, index: number) => {
  draggedMetric.value = { id: metric.id, index }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', metric.id)
  }
}

const handleMetricDragEnd = () => {
  draggedMetric.value = null
  dragOverMetric.value = null
}

const handleMetricDrop = (event: DragEvent) => {
  if (!draggedMetric.value || !dragOverMetric.value) return
  
  event.preventDefault()
  const sourceIndex = draggedMetric.value.index
  const targetMetric = allMetrics.value.find(m => m.id === dragOverMetric.value)
  if (!targetMetric) return
  
  const targetIndex = allMetrics.value.findIndex(m => m.id === dragOverMetric.value)
  
  const [removed] = allMetrics.value.splice(sourceIndex, 1)
  allMetrics.value.splice(targetIndex, 0, removed)
  
  saveMetricConfig()
  handleMetricDragEnd()
}

const getMetricValue = (metric: MetricConfig) => {
  if (typeof (metric.value as any)?.value !== 'undefined') {
    return (metric.value as ComputedRef<number | string>).value
  }
  return metric.value
}

const resetMetricConfig = () => {
  allMetrics.value.forEach(m => m.visible = true)
  saveMetricConfig()
}

const callingList = ref([
  { dept: '内科', doctor: '张三', number: 'A012', status: 'calling' },
  { dept: '外科', doctor: '李四', number: 'B008', status: 'waiting' },
  { dept: '骨科', doctor: '王五', number: 'C015', status: 'waiting' },
  { dept: '儿科', doctor: '赵六', number: 'D003', status: 'waiting' },
])

const weekData = ref([
  { day: '周一', count: 98 }, { day: '周二', count: 115 }, { day: '周三', count: 132 },
  { day: '周四', count: 108 }, { day: '周五', count: 145 }, { day: '周六', count: 89 }, { day: '今日', count: 128 },
])

const monthData = ref([
  { day: '6/1', count: 112 }, { day: '6/2', count: 125 }, { day: '6/3', count: 98 }, { day: '6/4', count: 138 },
  { day: '6/5', count: 145 }, { day: '6/6', count: 120 }, { day: '6/7', count: 108 }, { day: '6/8', count: 132 },
  { day: '6/9', count: 155 }, { day: '6/10', count: 142 }, { day: '6/11', count: 118 }, { day: '6/12', count: 128 },
  { day: '6/13', count: 135 }, { day: '6/14', count: 148 }, { day: '6/15', count: 110 }, { day: '6/16', count: 125 },
  { day: '6/17', count: 138 }, { day: '6/18', count: 128 }
])

const yearData = ref([
  { day: '1月', count: 3450 }, { day: '2月', count: 2980 }, { day: '3月', count: 4120 },
  { day: '4月', count: 3850 }, { day: '5月', count: 4200 }, { day: '6月', count: 3560 },
  { day: '7月', count: 0 }, { day: '8月', count: 0 }, { day: '9月', count: 0 },
  { day: '10月', count: 0 }, { day: '11月', count: 0 }, { day: '12月', count: 0 },
])

const getCurrentTrendData = () => {
  if (timeRange.value === '30d') return monthData.value
  if (timeRange.value === 'year') return yearData.value.filter(d => d.count > 0)
  return weekData.value
}

const deptData = ref([
  { name: '内科', count: 45 }, { name: '外科', count: 28 }, { name: '骨科', count: 22 },
  { name: '儿科', count: 18 }, { name: '妇科', count: 15 },
])

const animateNumber = (target: { value: number }, end: number, duration: number = 1500) => {
  const start = target.value
  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    target.value = Math.floor(start + (end - start) * easeOut)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

const formatIncome = computed(() => {
  return animatedIncome.value.toLocaleString()
})

const initTrendChart = () => {
  if (!trendChartRef.value) return

  trendChart = echarts.init(trendChartRef.value)
  const trendData = getCurrentTrendData()
  const days = trendData.map(d => d.day)
  const counts = trendData.map(d => d.count)
  const average = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 30, bottom: 50, left: 60 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: 'rgba(66, 153, 225, 0.1)' } },
      axisLabel: { color: '#718096', fontSize: 12, fontWeight: 500 },
      axisTick: { show: false },
      axisPointer: {
        lineStyle: { color: 'rgba(66, 153, 225, 0.4)' }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#718096', fontSize: 12 },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(66, 153, 225, 0.08)', 
          type: 'dashed',
          width: 1
        } 
      }
    },
    series: [
      {
        name: '门诊量',
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { 
          color: '#4299E1', 
          width: 4,
          shadowColor: 'rgba(66, 153, 225, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        itemStyle: { 
          color: '#FFFFFF', 
          borderWidth: 3, 
          borderColor: '#4299E1',
          shadowColor: 'rgba(66, 153, 225, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(66, 153, 225, 0.25)' },
            { offset: 0.5, color: 'rgba(66, 153, 225, 0.1)' },
            { offset: 1, color: 'rgba(66, 153, 225, 0.02)' }
          ])
        },
        animationDuration: 2000,
        animationEasing: 'cubicOut',
        emphasis: {
          scale: true,
          itemStyle: {
            borderColor: '#4299E1',
            borderWidth: 4,
            shadowBlur: 15
          }
        }
      },
      {
        name: '平均值',
        type: 'line',
        data: counts.map(() => average),
        smooth: false,
        symbol: 'none',
        lineStyle: { 
          color: 'rgba(160, 174, 192, 0.4)', 
          width: 2, 
          type: 'dashed' 
        },
        animation: false
      }
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: 'rgba(66, 153, 225, 0.2)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#2D3748', fontSize: 13 },
      extraCssText: 'border-radius: 12px; box-shadow: 0 8px 24px rgba(66, 153, 225, 0.15);',
      formatter: (params: any) => {
        const data = params.find((p: any) => p.seriesName === '门诊量')
        const avg = params.find((p: any) => p.seriesName === '平均值')
        const diff = data.value - avg.value
        const diffText = diff >= 0 ? `+${diff}` : diff
        const diffColor = diff >= 0 ? '#48BB78' : '#E53E3E'
        return `
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:#1A202C">${data.name}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:10px;height:10px;border-radius:50%;background:#4299E1"></span>
            <span>门诊量: <span style="color:#4299E1;font-weight:700;font-size:16px">${data.value}</span> 人次</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:2px;background:rgba(160,174,192,0.4)"></span>
            <span>较平均值: <span style="color:${diffColor};font-weight:600">${diffText}</span></span>
          </div>
        `
      }
    },
    legend: {
      data: ['门诊量', '平均值'],
      textStyle: { color: '#718096', fontSize: 12 },
      bottom: 10,
      itemWidth: 20,
      itemHeight: 10,
      itemGap: 20
    }
  }

  trendChart.setOption(option)
}

const initDeptChart = () => {
  if (!deptChartRef.value) return

  deptChart = echarts.init(deptChartRef.value)
  const names = deptData.value.map(d => d.name)
  const counts = deptData.value.map(d => d.count)

  const rankColors = [
    { bg: ['#FFD700', '#FFA500'], glow: 'rgba(255, 215, 0, 0.6)' },
    { bg: ['#C0C0C0', '#A8A8A8'], glow: 'rgba(192, 192, 192, 0.4)' },
    { bg: ['#CD7F32', '#B87333'], glow: 'rgba(205, 127, 50, 0.5)' },
    { bg: ['#63B3ED', '#4299E1'], glow: 'rgba(99, 179, 237, 0.4)' },
    { bg: ['#4299E1', '#2B6CB0'], glow: 'rgba(66, 153, 225, 0.3)' }
  ]

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { top: 20, right: 90, bottom: 20, left: 70 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(66, 153, 225, 0.06)', 
          type: 'dashed'
        } 
      }
    },
    yAxis: {
      type: 'category',
      data: names.reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { 
        color: '#2D3748', 
        fontSize: 13,
        fontWeight: 500,
        formatter: (value: string, index: number) => {
          const rankIdx = names.length - 1 - index
          if (rankIdx === 0) return `🥇 ${value}`
          if (rankIdx === 1) return `🥈 ${value}`
          if (rankIdx === 2) return `🥉 ${value}`
          return value
        }
      }
    },
    series: [{
      type: 'bar',
      data: counts.reverse().map((count, index) => ({
        value: count,
        itemStyle: {
          borderRadius: [0, 20, 20, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: rankColors[index].bg[0] },
            { offset: 1, color: rankColors[index].bg[1] }
          ]),
          shadowColor: rankColors[index].glow,
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      })),
      barWidth: '55%',
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#1A202C',
        fontSize: 14,
        fontWeight: 'bold',
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        borderRadius: 8,
        padding: [6, 14],
        shadowColor: 'rgba(66, 153, 225, 0.1)',
        shadowBlur: 4
      },
      animationDuration: 1800,
      animationEasing: 'cubicOut',
      animationDelay: (idx: number) => idx * 120,
      emphasis: {
        itemStyle: {
          shadowBlur: 15
        }
      }
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: 'rgba(66, 153, 225, 0.2)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#2D3748', fontSize: 13 },
      extraCssText: 'border-radius: 12px; box-shadow: 0 8px 24px rgba(66, 153, 225, 0.15);',
      formatter: (params: any) => {
        const data = params[0]
        const rankIdx = names.length - 1 - data.dataIndex
        const ranks = ['冠军', '亚军', '季军', '第4名', '第5名']
        return `
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:#1A202C">${data.name}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span>就诊人数: <span style="color:#4299E1;font-weight:700;font-size:16px">${data.value}</span> 人</span>
          </div>
          <div style="margin-top:4px;color:#A0AEC0;font-size:12px">${ranks[rankIdx]}</div>
        `
      }
    }
  }

  deptChart.setOption(option)
}

const loadStats = async () => {
  try {
    const res = await axios.get('/api/admin/stats')
    if (res.data) stats.value = { ...stats.value, ...res.data }
  } catch { /* use mock */ }
}

const loadAnnouncements = async () => {
  try {
    const res = await axios.get('/api/announcements')
    announcements.value = res.data
  } catch {
    announcements.value = [
      { id: 1, title: '关于2026年春节期间门诊安排的通知', type: 'normal', created_at: '2026-06-01' },
      { id: 2, title: '【紧急】系统将于今晚22:00-24:00维护', type: 'urgent', created_at: '2026-06-15' },
      { id: 3, title: '新增医保目录对码功能上线', type: 'normal', created_at: '2026-06-10' },
    ]
  }
}

const delAnnounce = (row: any) => {
  announcements.value = announcements.value.filter(a => a.id !== row.id)
  ElMessage.success('公告已删除')
}

const submitAnnounce = async () => {
  if (!announceForm.value.title) { ElMessage.warning('请填写公告标题'); return }
  try {
    await axios.post('/api/announcements', announceForm.value)
  } catch { /* mock */ }
  announcements.value.unshift({
    id: Date.now(), ...announceForm.value,
    created_at: new Date().toLocaleDateString()
  })
  announceVisible.value = false
  announceForm.value = { title: '', content: '', type: 'normal' }
  ElMessage.success('公告已发布')
}

const handleRestock = () => {
  ElMessage.success('补货申请已提交，仓库将尽快处理')
  showStockModal.value = false
}

let refreshTimer: number | null = null

onMounted(() => {
  loadStats()
  loadAnnouncements()
  loadMetricConfig()

  setTimeout(() => {
    animateNumber(animatedPatients, stats.value.todayPatients)
    animateNumber(animatedIncome, stats.value.todayIncome)
    animateNumber(animatedPrescriptions, stats.value.prescriptions)
    animateNumber(animatedLowStock, stats.value.lowStock)
  }, 300)

  nextTick(() => {
    initTrendChart()
    initDeptChart()
  })

  window.addEventListener('resize', () => {
    trendChart?.resize()
    deptChart?.resize()
  })

  refreshTimer = window.setInterval(() => {
    stats.value.todayPatients += Math.floor(Math.random() * 3) - 1
    stats.value.todayIncome += Math.floor(Math.random() * 200) - 50
    animateNumber(animatedPatients, stats.value.todayPatients, 500)
    animateNumber(animatedIncome, stats.value.todayIncome, 500)
  }, 30000)
})

onUnmounted(() => {
  trendChart?.dispose()
  deptChart?.dispose()
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(timeRange, () => {
  nextTick(() => {
    initTrendChart()
  })
})
</script>

<style scoped>
.statistics-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(66, 153, 225, 0.05), transparent);
  transition: left 0.5s ease;
}

.glass-card:hover::before {
  left: 100%;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.98);
  transform: translateY(-4px);
  box-shadow: 
    0 12px 40px rgba(66, 153, 225, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border-color: rgba(66, 153, 225, 0.25);
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .metrics-row {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  position: relative;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%);
}

.metric-card:nth-child(1) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
}

.metric-card:nth-child(2) {
  background: linear-gradient(135deg, #E6FFFA 0%, #D1FAE5 100%);
}

.metric-card:nth-child(3) {
  background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
}

.metric-card:nth-child(4) {
  background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
}

.metric-card.warning-card {
  border-color: rgba(239, 68, 68, 0.3);
}

.metric-card.warning-card:hover {
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.2);
}

.metric-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  z-index: 2;
}

.metric-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  transform: perspective(100px) rotateX(5deg);
  transition: transform 0.3s ease;
}

.metric-icon-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  opacity: 0.5;
  filter: blur(8px);
  z-index: -1;
}

.metric-icon-wrap::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 50%;
  border-radius: 18px 18px 4px 4px;
  background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
  pointer-events: none;
}

.metric-card:hover .metric-icon-wrap {
  transform: perspective(100px) rotateX(-5deg) scale(1.05);
}

.blue-icon {
  background: linear-gradient(145deg, #4299E1 0%, #2B6CB0 100%);
  box-shadow: 
    0 8px 25px rgba(66, 153, 225, 0.4),
    0 4px 10px rgba(66, 153, 225, 0.2);
}

.blue-icon::before {
  background: linear-gradient(145deg, #4299E1 0%, #2B6CB0 100%);
}

.green-icon {
  background: linear-gradient(145deg, #48BB78 0%, #38A169 100%);
  box-shadow: 
    0 8px 25px rgba(72, 187, 120, 0.4),
    0 4px 10px rgba(72, 187, 120, 0.2);
}

.green-icon::before {
  background: linear-gradient(145deg, #48BB78 0%, #38A169 100%);
}

.purple-icon {
  background: linear-gradient(145deg, #805AD5 0%, #6B46C1 100%);
  box-shadow: 
    0 8px 25px rgba(128, 90, 213, 0.4),
    0 4px 10px rgba(128, 90, 213, 0.2);
}

.purple-icon::before {
  background: linear-gradient(145deg, #805AD5 0%, #6B46C1 100%);
}

.red-icon {
  background: linear-gradient(145deg, #F56565 0%, #E53E3E 100%);
  box-shadow: 
    0 8px 25px rgba(245, 101, 101, 0.4),
    0 4px 10px rgba(245, 101, 101, 0.2);
}

.red-icon::before {
  background: linear-gradient(145deg, #F56565 0%, #E53E3E 100%);
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 13px;
  color: #718096;
  margin-bottom: 8px;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-value .currency {
  font-size: 20px;
  font-weight: 600;
  color: #4A5568;
}

.metric-value .num {
  font-size: 42px;
  font-weight: 800;
  color: #1A202C;
  font-family: 'DIN', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -2px;
}

.warning-value .num {
  color: #E53E3E;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
}

.metric-trend.positive {
  color: #48BB78;
}

.metric-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  margin-top: 8px;
}

.metric-tag.normal {
  background: rgba(72, 187, 120, 0.1);
  color: #48BB78;
}

.metric-tag.warning {
  background: rgba(236, 201, 75, 0.1);
  color: #D69E2E;
}

.metric-action {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  cursor: pointer;
}

.action-text {
  font-size: 12px;
  color: #4299E1;
}

.metric-pie-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.mini-pie {
  width: 40px;
  height: 40px;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-item {
  font-size: 11px;
  color: #718096;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.legend-dot.blue {
  background: #4299E1;
}

.legend-dot.gray {
  background: #A0AEC0;
}

.metric-glow {
  position: absolute;
  right: -30px;
  bottom: -30px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  opacity: 0.15;
  pointer-events: none;
  filter: blur(30px);
  transition: opacity 0.3s ease;
}

.blue-glow {
  background: radial-gradient(circle, #4299E1 0%, #2B6CB0 50%, transparent 70%);
}

.green-glow {
  background: radial-gradient(circle, #48BB78 0%, #38A169 50%, transparent 70%);
}

.purple-glow {
  background: radial-gradient(circle, #805AD5 0%, #6B46C1 50%, transparent 70%);
}

.red-glow {
  background: radial-gradient(circle, #F56565 0%, #E53E3E 50%, transparent 70%);
}

.metric-card:hover .metric-glow {
  opacity: 0.25;
}


.charts-section {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 16px;
}

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  padding: 24px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
}

.time-tabs {
  display: flex;
  gap: 4px;
}

.chart-container {
  height: 300px;
}

.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1024px) {
  .bottom-section {
    grid-template-columns: 1fr;
  }
}

.detail-card {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  font-size: 12px;
  color: #E53E3E;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #FC8181;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.call-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.call-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-radius: 14px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(66, 153, 225, 0.1);
}

.call-item:hover {
  background: linear-gradient(135deg, #E6FFFA 0%, #EBF8FF 100%);
  transform: translateX(4px);
}

.call-item.active {
  background: linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 100%);
  border-left: 4px solid #4299E1;
  border-color: rgba(66, 153, 225, 0.2);
  box-shadow: 0 4px 20px rgba(66, 153, 225, 0.12);
}

.call-rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(66, 153, 225, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #718096;
  font-family: 'DIN', sans-serif;
  transition: all 0.3s ease;
}

.call-item.active .call-rank {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
}

.call-info {
  flex: 1;
}

.call-dept {
  font-size: 14px;
  font-weight: 600;
  color: #2D3748;
}

.call-doctor {
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.call-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.call-status .calling {
  color: #E53E3E;
  font-size: 12px;
  font-weight: 600;
}

.call-status .waiting {
  color: #A0AEC0;
  font-size: 12px;
}

.call-num {
  font-size: 16px;
  font-weight: 700;
  color: #1A202C;
  font-family: 'DIN', sans-serif;
}

.announce-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 12px;
}

.announce-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 18px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  background: #F7FAFC;
  border-radius: 10px;
  border: 1px solid rgba(66, 153, 225, 0.08);
}

.announce-row:hover {
  background: #EBF8FF;
  transform: translateX(4px);
  border-color: rgba(66, 153, 225, 0.15);
}

.announce-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.announce-tag.normal {
  background: rgba(66, 153, 225, 0.1);
  color: #4299E1;
  border: 1px solid rgba(66, 153, 225, 0.15);
}

.announce-tag.urgent {
  background: rgba(239, 68, 68, 0.1);
  color: #E53E3E;
  border: 1px solid rgba(239, 68, 68, 0.2);
  animation: pulse-soft 2s infinite;
}

@keyframes pulse-soft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}

.announce-title {
  flex: 1;
  font-size: 14px;
  color: #2D3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.announce-time {
  font-size: 12px;
  color: #A0AEC0;
  flex-shrink: 0;
}

.announce-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.announce-actions.show {
  opacity: 1;
}

.delete-btn {
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0AEC0;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #E53E3E;
}

.stock-modal-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  background: linear-gradient(135deg, rgba(245, 101, 101, 0.15) 0%, rgba(229, 62, 62, 0.08) 100%);
  border-radius: 14px;
  border-left: 4px solid #F56565;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(245, 101, 101, 0.1);
}

.stock-item:hover {
  background: linear-gradient(135deg, rgba(245, 101, 101, 0.2) 0%, rgba(229, 62, 62, 0.12) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(245, 101, 101, 0.15);
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-size: 15px;
  font-weight: 700;
  color: #1A202C;
  letter-spacing: 0.5px;
}

.stock-spec {
  font-size: 12px;
  color: #718096;
  margin-top: 5px;
}

.stock-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.stock-count {
  font-size: 16px;
  font-weight: 700;
  color: #E53E3E;
  font-family: 'DIN', sans-serif;
}

.stock-min {
  font-size: 12px;
  color: #A0AEC0;
  background: rgba(160, 174, 192, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 6px 25px rgba(66, 153, 225, 0.5);
  transform: translateY(-2px);
}

:deep(.el-button--primary:active) {
  transform: translateY(0);
}

:deep(.el-button--danger) {
  border-radius: 8px;
  background: linear-gradient(135deg, #F56565 0%, #E53E3E 100%);
  border: none;
  transition: all 0.3s ease;
}

:deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #FC8181 0%, #F56565 100%);
  box-shadow: 0 4px 15px rgba(245, 101, 101, 0.4);
}

:deep(.el-button--text) {
  color: #718096;
  transition: all 0.3s ease;
}

:deep(.el-button--text:hover) {
  color: #4299E1;
  background: rgba(66, 153, 225, 0.08);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #1A202C;
  font-size: 16px;
  font-weight: 700;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.15);
}

:deep(.el-radio__label) {
  color: #4A5568;
}

:deep(.el-radio__inner) {
  border-radius: 50%;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  border-color: #4299E1;
}

.page-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 0 16px 0;
}

.config-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.metric-card.drag-over {
  border: 2px dashed rgba(66, 153, 225, 0.5);
  background: rgba(66, 153, 225, 0.06);
}

.metric-card[draggable="true"] {
  cursor: grab;
}

.metric-card[draggable="true"]:active {
  cursor: grabbing;
}

.config-content {
  padding: 8px 0;
}

.config-section {
  margin-bottom: 20px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: #2D3748;
  margin-bottom: 16px;
}

.metric-checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-check-item {
  display: flex;
  align-items: center;
}

.check-item-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #F7FAFC;
  border-radius: 8px;
  flex: 1;
}

.check-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-label {
  font-size: 14px;
  color: #2D3748;
  font-weight: 500;
}

.config-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #EBF8FF;
  border-radius: 8px;
  font-size: 13px;
  color: #4A5568;
}

:deep(.config-content .el-checkbox__label) {
  padding-left: 0;
  flex: 1;
}

:deep(.config-content .el-checkbox__inner) {
  width: 18px;
  height: 18px;
  border-radius: 6px;
}

:deep(.config-content .el-checkbox__input.is-checked .el-checkbox__inner) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  border-color: #4299E1;
}
</style>