<template>
  <div class="home-page">
    <!-- 顶部导航栏 PC版 -->
    <div class="top-bar">
      <div class="hospital-name">🏥 湖北省中医院 HIS 系统</div>
      <div class="search-wrapper">
        <el-input 
          v-model="searchText" 
          placeholder="搜索医生 / 科室 / 药品" 
          prefix-icon="Search" 
          class="search-input"
          @keyup.enter="handleSearch"
          @focus="showSearchHistory = true"
          @blur="hideSearchHistory"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
        <!-- 搜索历史下拉 -->
        <div v-if="showSearchHistory && searchHistory.length > 0 && !searchText" class="search-history-dropdown">
        <div class="history-header">
          <span>搜索历史</span>
          <el-button size="small" text type="danger" @click="clearSearchHistory">清空</el-button>
        </div>
        <div v-for="(h, i) in searchHistory" :key="i" class="history-item" @mousedown.prevent="searchFromHistory(h)">
          <el-icon><Clock /></el-icon>
          <span>{{ h }}</span>
        </div>
        </div>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="scrollToSection('section-func')">常用功能</span>
        <span class="nav-link" @click="scrollToSection('section-floor')">楼层导览</span>
        <span class="nav-link" @click="scrollToSection('section-doctors')">医生风采</span>
      </div>
      <div class="top-user">
        <template v-if="isLoggedIn">
          <span class="welcome-text">👋 你好，<b>{{ currentUser?.real_name }}</b></span>
          <el-button size="small" :icon="Setting" circle @click="$router.push('/profile')" title="个人设置" />
          <el-button size="small" text type="danger" @click="handleLogout">退出</el-button>
        </template>
        <template v-else>
          <el-button size="small" @click="$router.push('/login')">登录</el-button>
        </template>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="page-body">
      <!-- Banner -->
      <div class="banner">
        <div class="banner-content">
          <div class="banner-title">智慧医疗 · 便捷服务</div>
          <div class="banner-sub">随时随地，轻松就医</div>
          <el-button v-if="!isLoggedIn" type="primary" size="large" style="margin-top:16px" @click="$router.push('/login')">
            立即登录
          </el-button>
        </div>
      </div>

      <!-- 两栏布局：功能入口 + 公告 -->
      <div class="content-row" id="section-func">
        <!-- 功能入口 -->
        <div class="func-card">
          <div class="card-title">
            <el-icon><Grid /></el-icon>
            <span>常用功能</span>
            <span class="drag-tip">拖拽可排序</span>
          </div>
          <div class="func-grid" ref="gridRef">
            <div
              v-for="(item, index) in funcItems"
              :key="item.key"
              class="func-item"
              draggable="true"
              :class="{
                'dragging': dragIndex === index,
                'drag-before': dragOverIndex === index && insertBefore,
                'drag-after':  dragOverIndex === index && !insertBefore
              }"
              @click="handleFuncClick(item)"
              @dragstart="onDragStart(index, $event)"
              @dragover.prevent="onDragOver(index, $event)"
              @dragend="onDragEnd"
              @drop.prevent="onDrop"
            >
              <div class="func-icon" :style="{ background: item.color }">
                <el-icon :size="26" color="white"><component :is="item.icon" /></el-icon>
              </div>
              <span class="func-label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- 通知公告 -->
        <div class="notice-card">
          <div class="card-title">
            <el-icon><Bell /></el-icon>
            <span>通知公告</span>
          </div>
          <div class="notice-list">
            <div
              v-for="item in announcements"
              :key="item.id"
              class="notice-item"
            >
              <span class="notice-dot"></span>
              <span class="notice-text">{{ item.title }}</span>
              <span class="notice-date">{{ item.publish_date?.slice(5) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 楼层地图 -->
      <div id="section-floor">
        <FloorMap />
      </div>

      <!-- 名医展示 -->
      <div class="famous-doctors-card" id="section-doctors">
        <div class="card-title">
          <el-icon><User /></el-icon>
          <span>名医专家</span>
        </div>
        <div class="doctors-grid">
          <div
            v-for="doctor in famousDoctors"
            :key="doctor.id"
            class="doctor-card"
          >
            <div class="doctor-avatar">
              {{ doctor.avatar || doctor.name.charAt(0) }}
              <div v-if="doctor.title === '主任医师'" class="title-badge">主任医师</div>
            </div>
            <div class="doctor-info">
              <div class="doctor-name">{{ doctor.name }}</div>
              <div class="doctor-title">{{ doctor.title }} · {{ doctor.dept_name }}</div>
              <div class="doctor-specialty-label">专业擅长</div>
              <div class="doctor-specialty">{{ doctor.specialty }}</div>
              <div class="doctor-bio-label">专家简介</div>
              <div class="doctor-bio">{{ doctor.biography }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未登录提示弹窗 -->
    <el-dialog
      v-model="showLoginGuide"
      title=""
      :show-close="false"
      width="400px"
      class="login-guide-dialog"
      align-center
    >
      <div class="login-guide-body">
        <el-icon :size="40" color="#1E88E5"><Lock /></el-icon>
        <h3>请先登录</h3>
        <p>登录后可使用预约挂号、门诊缴费等功能</p>
      </div>
      <template #footer>
        <el-button @click="showLoginGuide = false">暂不登录</el-button>
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </template>
    </el-dialog>

    <!-- 智能导诊悬浮球 -->
    <SmartTriage />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Setting, Search, Clock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import FloorMap from '@/components/FloorMap.vue'
import SmartTriage from '@/components/SmartTriage.vue'

const router = useRouter()
const userStore = useUserStore()
const { isLoggedIn } = userStore
const currentUser = userStore.currentUser

const handleLogout = () => {
  userStore.logout()
  router.push('/')
}
const searchText = ref('')
const showSearchHistory = ref(false)
const searchHistory = ref<string[]>([])

// 搜索历史管理（localStorage）
const HISTORY_KEY = 'patient_search_history'
const MAX_HISTORY = 10

const loadSearchHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    searchHistory.value = stored ? JSON.parse(stored) : []
  } catch { searchHistory.value = [] }
}

const saveSearchHistory = (keyword: string) => {
  const trimmed = keyword.trim()
  if (!trimmed) return
  // 去重，最新的放前面
  const filtered = searchHistory.value.filter(h => h !== trimmed)
  filtered.unshift(trimmed)
  searchHistory.value = filtered.slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value))
}

const clearSearchHistory = () => {
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
}

const searchFromHistory = (keyword: string) => {
  searchText.value = keyword
  showSearchHistory.value = false
  handleSearch()
}

const hideSearchHistory = () => {
  // 延迟隐藏以允许点击事件触发
  setTimeout(() => { showSearchHistory.value = false }, 200)
}

const handleSearch = () => {
  const trimmed = searchText.value.trim()
  if (!trimmed) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  saveSearchHistory(trimmed)
  showSearchHistory.value = false
  router.push(`/appointment/dept?keyword=${encodeURIComponent(trimmed)}`)
}

const showLoginGuide = ref(false)
const pendingPath = ref('')

interface Announcement {
  id: number
  title: string
  publish_date: string
}

const announcements = ref<Announcement[]>([
  { id: 1, title: '关于门诊时间调整的通知', publish_date: '2026-06-05' },
  { id: 2, title: '端午节放假安排', publish_date: '2026-06-01' },
  { id: 3, title: '新增大便常规线上预约功能', publish_date: '2026-05-28' },
])

interface FuncItem {
  key: string
  label: string
  icon: string
  color: string
  path: string
  needAuth: boolean
}

const funcItems = ref<FuncItem[]>([
  { key: 'appointment', label: '预约挂号',   icon: 'Calendar',   color: '#1E88E5', path: '/appointment/dept',  needAuth: true },
  { key: 'payment',     label: '门诊缴费',   icon: 'CreditCard', color: '#43A047', path: '/payment',            needAuth: true },
  { key: 'internet',    label: '互联网复诊', icon: 'Monitor',    color: '#7B1FA2', path: '/profile',            needAuth: true },
  { key: 'report',      label: '报告查询',   icon: 'Document',   color: '#FB8C00', path: '/report',             needAuth: true },
  { key: 'records',     label: '门诊病历',   icon: 'Notebook',   color: '#E53935', path: '/medical-records',    needAuth: true },
  { key: 'queue',       label: '排队叫号',   icon: 'Tickets',    color: '#00897B', path: '/queue',              needAuth: true },
  { key: 'revisit',     label: '复诊挂号',   icon: 'Refresh',    color: '#F57C00', path: '/revisit',             needAuth: true },
  { key: 'ecard',       label: '添加就诊卡', icon: 'CreditCard', color: '#0277BD', path: '/ecard',              needAuth: true },
])

// 拖拽排序
const gridRef = ref<HTMLElement | null>(null)
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)
const insertBefore = ref(true)  // true=插到目标左/上方, false=插到右/下方

const onDragStart = (index: number, e: DragEvent) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // 自定义拖拽预览图（透明像素）
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-9999px;opacity:0;'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }
}

const onDragOver = (index: number, e: DragEvent) => {
  if (dragIndex.value === index) return
  dragOverIndex.value = index
  // 根据鼠标在目标元素内的中点左右决定插入方向
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  insertBefore.value = e.clientX < rect.left + rect.width / 2
}

const onDrop = () => {
  const from = dragIndex.value
  let to = dragOverIndex.value
  if (from < 0 || to < 0 || from === to) { onDragEnd(); return }
  const arr = [...funcItems.value]
  const [moved] = arr.splice(from, 1)
  // 重新计算 to（splice 后索引发生变化）
  const realTo = from < to ? (insertBefore.value ? to - 1 : to) : (insertBefore.value ? to : to + 1)
  arr.splice(Math.max(0, Math.min(realTo, arr.length)), 0, moved)
  funcItems.value = arr
  onDragEnd()
}

const onDragEnd = () => {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

const handleFuncClick = (item: FuncItem) => {
  if (item.needAuth && !isLoggedIn.value) {
    pendingPath.value = item.path
    showLoginGuide.value = true
    return
  }
  router.push(item.path)
}

const goLogin = () => {
  showLoginGuide.value = false
  router.push(pendingPath.value ? `/login?redirect=${pendingPath.value}` : '/login')
}

const scrollToSection = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

interface Doctor {
  id: number
  name: string
  title: string
  specialty: string
  biography: string
  fee: number
  avatar: string
  dept_name: string
  dept_id: number
}

const famousDoctors = ref<Doctor[]>([])

onMounted(async () => {
  loadSearchHistory()
  try {
    const res = await axios.get('/api/announcements')
    if (res.data?.length) announcements.value = res.data
  } catch { /* 使用默认mock数据 */ }
  
  // 获取名医列表
  try {
    const res = await axios.get('/api/doctors/famous')
    if (res.data?.length) famousDoctors.value = res.data
  } catch { /* 使用默认mock数据 */ }
  
  // 如果已登录，重新获取最新用户信息
  if (isLoggedIn.value && currentUser.value) {
    try {
      const res = await axios.get('/api/user/profile', { params: { userId: currentUser.value.id } })
      if (res.data) {
        Object.assign(currentUser.value!, res.data)
      }
    } catch { /* 忽略错误 */ }
  }
})
</script>

<style scoped>
/* ===== 整体布局 ===== */
.home-page {
  min-height: 100vh;
  background: #F0F4F8;
  display: flex;
  flex-direction: column;
}

/* ===== 顶部导航 ===== */
.top-bar {
  background: #1E88E5;
  padding: 0 40px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.hospital-name {
  color: white;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.nav-links {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: rgba(255,255,255,0.9);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: white;
  background: rgba(255,255,255,0.15);
}

.search-wrapper {
  flex: 1;
  max-width: 400px;
  position: relative;
}

.search-input {
  width: 100%;
  --el-input-border-radius: 20px;
  --el-input-border-color: rgba(255,255,255,0.3);
  --el-input-bg-color: rgba(255,255,255,0.95);
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: none;
}

.search-input :deep(.el-input__inner) {
  background: transparent;
}

/* 搜索历史下拉 */
.search-history-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  width: 100%;
  background: white;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 200;
  padding: 8px 0;
  margin-top: 0;
  border: 1px solid #E8E8E8;
  border-top: none;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  font-size: 13px;
  color: #888;
  border-bottom: 1px solid #F0F0F0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.15s;
}

.history-item:hover {
  background: #F5F7FA;
  color: #1E88E5;
}

.top-user {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  margin-left: auto;
}

.welcome-text {
  color: white;
  font-size: 14px;
}

.welcome-text b {
  font-weight: 700;
}

/* ===== Banner ===== */
.page-body {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 40px;
  box-sizing: border-box;
}

.banner {
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.85) 0%, rgba(30, 136, 229, 0.75) 40%, rgba(66, 165, 245, 0.65) 100%), url('/OIP-C.jpg');
  background-size: cover;
  background-position: center 69%;
  border-radius: 16px;
  padding: 40px 48px;
  color: white;
  margin-bottom: 24px;
}

.banner-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 1px;
}

.banner-sub {
  font-size: 16px;
  opacity: 0.85;
  margin-top: 8px;
}

/* ===== 两栏内容区 ===== */
.content-row {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;
}

/* ===== 功能卡片 ===== */
.func-card {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F0F0F0;
}

.func-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.drag-tip {
  margin-left: auto;
  font-size: 11px;
  color: #BDBDBD;
  font-weight: 400;
  cursor: default;
}

.func-item.dragging {
  opacity: 0.25;
  cursor: grabbing;
  transform: scale(0.95);
  box-shadow: none;
  border-color: transparent;
}

/* 插入位置指示线：左侧 */
.func-item.drag-before {
  border-left: 3px solid #1E88E5;
  background: #F0F7FF;
  transform: translateX(3px);
}

/* 插入位置指示线：右侧 */
.func-item.drag-after {
  border-right: 3px solid #1E88E5;
  background: #F0F7FF;
  transform: translateX(-3px);
}

.func-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: grab;
  padding: 16px 8px;
  border-radius: 10px;
  border: 1px solid #F0F0F0;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.1s, border-color 0.1s, opacity 0.1s;
  user-select: none;
  will-change: transform;
}

.func-item:hover {
  background: #F0F7FF;
  border-color: #90CAF9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(30,136,229,0.15);
}

.func-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.func-label {
  font-size: 13px;
  color: #424242;
  text-align: center;
  font-weight: 500;
}

/* ===== 公告卡片 ===== */
.notice-card {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notice-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background 0.15s;
}

.notice-item:last-child { border-bottom: none; }
.notice-item:hover .notice-text { color: #1E88E5; }

.notice-dot {
  width: 7px;
  height: 7px;
  background: #1E88E5;
  border-radius: 50%;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
  font-size: 14px;
  color: #424242;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.notice-date {
  font-size: 12px;
  color: #9E9E9E;
  flex-shrink: 0;
}

/* ===== 登录引导弹窗 ===== */
.login-guide-body {
  text-align: center;
  padding: 20px 0 8px;
}

.login-guide-body h3 {
  margin: 12px 0 6px;
  font-size: 18px;
  color: #212121;
}

.login-guide-body p {
  color: #757575;
  font-size: 14px;
}

/* ===== 名医展示卡片 ===== */
.famous-doctors-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-top: 24px;
}

.famous-doctors-card .card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #F0F4F8;
}

.doctors-grid {
  column-count: 3;
  column-gap: 20px;
}

.doctor-card {
  break-inside: avoid;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid #E8EEF4;
  background: #FFF;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.doctor-card:hover {
  border-color: #1E88E5;
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(30,136,229,0.15);
}

.doctor-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1E88E5 0%, #64B5F6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 4px 12px rgba(30,136,229,0.25);
}

.title-badge {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #E53935 0%, #EF5350 100%);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(229,57,53,0.3);
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.doctor-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.doctor-title {
  font-size: 13px;
  color: #546E7A;
  margin-top: 3px;
}

.doctor-specialty-label {
  font-size: 12px;
  color: #1E88E5;
  font-weight: 500;
  margin-top: 12px;
}

.doctor-specialty {
  font-size: 13px;
  color: #455A64;
  margin-top: 4px;
  line-height: 1.5;
}

.doctor-bio-label {
  font-size: 12px;
  color: #546E7A;
  font-weight: 500;
  margin-top: 12px;
}

.doctor-bio {
  font-size: 13px;
  color: #607D8B;
  margin-top: 4px;
  line-height: 1.7;
}
</style>
