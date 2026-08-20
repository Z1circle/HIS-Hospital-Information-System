<template>
  <!-- 悬浮球（支持拖拽） -->
  <div
    v-if="!panelOpen"
    ref="fabRef"
    class="triage-fab"
    :class="{ 'fab-pulse': showPulse && !isDragging, 'fab-dragging': isDragging }"
    :style="fabStyle"
    @mousedown="onFabMouseDown"
    @touchstart="onFabTouchStart"
  >
    <div class="fab-icon">👩‍⚕️</div>
    <span class="fab-label">小护</span>
  </div>

  <!-- 对话框面板 -->
  <transition name="triage-slide">
    <div v-if="panelOpen" class="triage-panel">
      <!-- 头部 -->
      <div class="panel-header">
        <div class="panel-header-left">
          <span class="panel-icon">👩‍⚕️</span>
          <span class="panel-title">小护健康助手</span>
        </div>
        <div class="panel-header-right">
          <span class="header-btn" title="新对话" @click="startNewConversation">＋</span>
          <span class="header-btn" title="历史对话" @click="toggleHistory">🕘</span>
          <span class="human-link" @click="handleManual">转人工</span>
          <button class="close-btn" @click="closePanel">&times;</button>
        </div>
      </div>

      <!-- 历史对话侧边栏 -->
      <transition name="history-slide">
        <div v-if="historyOpen" class="history-panel">
          <div class="history-header">
            <span class="history-title">📋 历史对话</span>
            <button class="history-close" @click="historyOpen = false">&times;</button>
          </div>
          <div class="history-list" v-if="conversationList.length > 0">
            <div
              v-for="conv in conversationList"
              :key="conv.id"
              class="history-item"
              :class="{ active: currentConvId === conv.id }"
              @click="loadConversation(conv.id)"
            >
              <div class="history-item-title">{{ conv.title }}</div>
              <div class="history-item-meta">
                <span>{{ formatTime(conv.created_at) }}</span>
                <span class="history-msg-count">{{ conv.message_count }}条消息</span>
              </div>
              <span class="history-delete" @click.stop="deleteConversation(conv.id)" title="删除">🗑</span>
            </div>
          </div>
          <div v-else class="history-empty">
            <div class="empty-icon">📭</div>
            <div>暂无历史对话</div>
          </div>
        </div>
      </transition>

      <!-- 消息区域 -->
      <div class="chat-area" ref="chatAreaRef">
        <!-- 历史对话标记 -->
        <div v-if="viewingHistory" class="history-badge">
          <span>📋 查看历史对话</span>
          <button class="back-to-new" @click="backToNewConversation">返回新对话</button>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['msg-row', msg.role === 'user' ? 'msg-user' : 'msg-ai']"
        >
          <!-- AI 头像 -->
          <div v-if="msg.role === 'ai'" class="ai-avatar">👩‍⚕️</div>
          <!-- 消息气泡 -->
          <div :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
            <div class="msg-text" v-if="msg.text" v-html="formatText(msg.text)"></div>
            <!-- 快捷标签 -->
            <div v-if="msg.tags && msg.tags.length > 0 && !viewingHistory" class="quick-tags">
              <span
                v-for="tag in msg.tags"
                :key="tag"
                class="quick-tag"
                @click="sendTag(tag)"
              >{{ tag }}</span>
            </div>
            <!-- 加载状态 -->
            <div v-if="msg.loading" class="loading-dots">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="loading-text">正在分析病情...</span>
            </div>
            <!-- 推荐卡片 -->
            <div v-if="msg.recommendation" class="rec-card">
              <div class="rec-header">
                <span class="rec-badge">推荐科室</span>
                <span class="rec-confidence">{{ msg.recommendation.confidence }}% 匹配</span>
              </div>
              <div class="rec-dept">{{ msg.recommendation.dept_name }}</div>
              <div class="rec-keywords" v-if="msg.recommendation.matched_keywords">
                <span v-for="kw in msg.recommendation.matched_keywords" :key="kw" class="rec-kw-tag">{{ kw }}</span>
              </div>
              <!-- 推荐医生列表 -->
              <div v-if="msg.recommendation.doctors && msg.recommendation.doctors.length > 0" class="rec-doctors">
                <div class="rec-doctor-label">推荐医生</div>
                <div
                  v-for="doc in msg.recommendation.doctors"
                  :key="doc.id"
                  class="rec-doctor-item"
                >
                  <div class="rec-doc-name">{{ doc.name }}</div>
                  <div class="rec-doc-title">{{ doc.title }}</div>
                  <div class="rec-doc-specialty" v-if="doc.specialty">擅长：{{ doc.specialty }}</div>
                  <div class="rec-doc-slots">
                    <span>{{ doc.am_pm === 'am' ? '上午' : '下午' }}</span>
                    <span :class="['rec-remain', doc.remaining < 5 ? 'danger' : '']">余{{ doc.remaining }}号</span>
                  </div>
                </div>
              </div>
              <div v-else class="rec-no-doctor">今日暂无该科室余号医生</div>
              <!-- 操作按钮 -->
              <div v-if="!viewingHistory" class="rec-actions">
                <button class="rec-btn primary" @click="goAppointment(msg.recommendation)">
                  直接挂号
                </button>
                <button class="rec-btn secondary" @click="retryTriage">
                  换个科室看看
                </button>
              </div>
            </div>
            <!-- 备选科室 -->
            <div v-if="msg.secondary" class="rec-card secondary-card">
              <div class="rec-header">
                <span class="rec-badge alt">备选</span>
              </div>
              <div class="rec-dept">{{ msg.secondary.dept_name }}</div>
              <div v-if="!viewingHistory" class="rec-actions">
                <button class="rec-btn small" @click="goAppointment(msg.secondary)">选择此科室</button>
              </div>
            </div>
          </div>
          <!-- 用户头像 -->
          <div v-if="msg.role === 'user'" class="user-avatar">👤</div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div v-if="!viewingHistory" class="input-area">
        <div class="input-row">
          <input
            v-model="inputText"
            class="chat-input"
            placeholder="请描述您的症状..."
            @keyup.enter="sendMessage"
          />
          <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || analyzing">
            发送
          </button>
        </div>
        <div class="input-hint">
          <span class="hint-label">快捷：</span>
          <span
            v-for="tag in visibleQuickTags"
            :key="tag"
            class="hint-tag"
            @click="sendTag(tag)"
          >{{ tag }}</span>
          <span v-if="quickTags.length > 8 && !showAllTags" class="hint-more" @click="showAllTags = true">更多</span>
          <template v-if="showAllTags">
            <span
              v-for="tag in quickTags.slice(8)"
              :key="tag"
              class="hint-tag"
              @click="sendTag(tag)"
            >{{ tag }}</span>
            <span class="hint-more" @click="showAllTags = false">收起</span>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useUserStore } from '../stores/user'

const router = useRouter()
const { currentUser } = useUserStore()

// ========== 状态 ==========
const panelOpen = ref(false)
const showPulse = ref(true)
const inputText = ref('')
const analyzing = ref(false)
const chatAreaRef = ref<HTMLElement | null>(null)
const fabRef = ref<HTMLElement | null>(null)
const chatHistory = ref<string[]>([])

interface Message {
  role: 'user' | 'ai'
  text?: string
  tags?: string[]
  loading?: boolean
  recommendation?: any
  secondary?: any
}

const messages = ref<Message[]>([])

// ========== 历史对话 ==========
const historyOpen = ref(false)
const viewingHistory = ref(false)
const currentConvId = ref<number | null>(null)
const conversationList = ref<any[]>([])

// ========== 快捷标签 ==========
const quickTags = [
  '头痛', '发热咳嗽', '腹痛腹泻', '皮疹瘙痒', '失眠', '关节痛', '眼睛不适', '牙痛',
  '发热', '咳嗽咳痰', '咽痛', '恶心呕吐', '腹泻', '便秘', '胃胀', '反酸',
  '心悸心慌', '胸闷', '头晕眩晕', '血压高', '手脚麻木', '腰痛',
  '尿频尿急', '月经不调', '痛经', '白带异常',
  '儿童发热', '儿童咳嗽', '儿童腹泻',
  '视力模糊', '眼睛红肿', '耳鸣', '听力下降', '鼻塞流涕',
  '牙龈出血', '口腔溃疡', '咽喉异物感',
  '皮肤瘙痒', '痤疮疖肿', '脱发',
  '腰腿疼', '肩颈痛', '膝盖疼', '扭伤',
  '焦虑紧张', '心慌手抖'
]

const showAllTags = ref(false)
const visibleQuickTags = computed(() => quickTags.slice(0, 8))

// ========== 悬浮球拖拽 ==========
const FAB_POS_KEY = 'smart_triage_fab_pos'
const savedPos = localStorage.getItem(FAB_POS_KEY)
const initialPos = savedPos ? JSON.parse(savedPos) : null
const fabPosX = ref(initialPos?.x || 0) // 相对于视口左边的像素位置
const fabPosY = ref(initialPos?.y || 0) // 相对于视口顶部的像素位置
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragStartFabX = 0
let dragStartFabY = 0
let hasMoved = false

const fabStyle = computed(() => {
  // 初始状态使用CSS默认定位
  if (fabPosX.value === 0 && fabPosY.value === 0) return {}
  return {
    left: `${fabPosX.value}px`,
    top: `${fabPosY.value}px`,
    right: 'auto',
    bottom: 'auto',
    transition: isDragging.value ? 'none' : 'left 0.3s ease, top 0.3s ease'
  }
})

const getFabInitialPos = () => {
  // 如果fab还没有设定位置，从CSS默认位置推算
  if (fabPosX.value === 0 && fabPosY.value === 0) {
    const el = fabRef.value
    if (el) {
      const rect = el.getBoundingClientRect()
      return { x: rect.left, y: rect.top }
    }
    return { x: window.innerWidth - 84, y: window.innerHeight - 150 }
  }
  return { x: fabPosX.value, y: fabPosY.value }
}

const onFabMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  const pos = getFabInitialPos()
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartFabX = pos.x
  dragStartFabY = pos.y
  hasMoved = false
  isDragging.value = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

const onFabTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]
  const pos = getFabInitialPos()
  dragStartX = t.clientX
  dragStartY = t.clientY
  dragStartFabX = pos.x
  dragStartFabY = pos.y
  hasMoved = false
  isDragging.value = true
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
}

const onDragMove = (e: MouseEvent) => {
  doDragMove(e.clientX, e.clientY)
}

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    e.preventDefault()
    doDragMove(e.touches[0].clientX, e.touches[0].clientY)
  }
}

const doDragMove = (clientX: number, clientY: number) => {
  const dx = clientX - dragStartX
  const dy = clientY - dragStartY
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true
  // 限制在视口范围内
  const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStartFabX + dx))
  const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartFabY + dy))
  fabPosX.value = newX
  fabPosY.value = newY
}

const onDragEnd = () => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  finishDrag()
}

const onTouchEnd = () => {
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  finishDrag()
}

const finishDrag = () => {
  isDragging.value = false
  if (!hasMoved) {
    // 没有拖动，视为点击 → 打开面板，不改变位置
    openPanel()
    return
  }
  // 有实际拖拽，吸附到最近的左右边缘
  const centerX = fabPosX.value + 30
  if (centerX > window.innerWidth / 2) {
    fabPosX.value = window.innerWidth - 60 - 16 // 右边缘留16px
  } else {
    fabPosX.value = 16 // 左边缘留16px
  }
  // 保存位置到 localStorage
  localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x: fabPosX.value, y: fabPosY.value }))
}

const onWindowResize = () => {
  // 窗口大小改变时，确保悬浮球不超出视口
  if (fabPosX.value > 0 || fabPosY.value > 0) {
    fabPosX.value = Math.min(fabPosX.value, window.innerWidth - 60)
    fabPosY.value = Math.min(fabPosY.value, window.innerHeight - 60)
  }
}
window.addEventListener('resize', onWindowResize)

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('resize', onWindowResize)
})

// ========== 面板操作 ==========
const openPanel = async () => {
  panelOpen.value = true
  showPulse.value = false
  viewingHistory.value = false
  currentConvId.value = null
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'ai',
      text: '您好呀～我是小护，您的健康小助手 🌸 请问哪里不舒服？我来帮您看看～',
      tags: quickTags
    })
  }
  // 加载历史对话列表
  await loadConversationList()
}

const closePanel = () => {
  panelOpen.value = false
  historyOpen.value = false
}

// ========== 历史对话功能 ==========
const loadConversationList = async () => {
  try {
    const pid = currentUser.value?.patient_id
    if (!pid) return
    const res = await axios.get('/api/triage/conversations', { params: { patient_id: pid } })
    conversationList.value = res.data
  } catch {
    console.error('加载对话列表失败')
  }
}

const toggleHistory = () => {
  historyOpen.value = !historyOpen.value
}

const loadConversation = async (id: number) => {
  try {
    const res = await axios.get(`/api/triage/conversations/${id}`)
    const conv = res.data
    currentConvId.value = id
    viewingHistory.value = true
    // 恢复消息
    const savedMessages = conv.messages || []
    messages.value = savedMessages.map((m: any) => ({
      role: m.role,
      text: m.text,
      recommendation: m.recommendation,
      secondary: m.secondary
    }))
    historyOpen.value = false
    scrollToBottom()
  } catch {
    console.error('加载对话详情失败')
  }
}

const deleteConversation = async (id: number) => {
  try {
    await axios.delete(`/api/triage/conversations/${id}`)
    conversationList.value = conversationList.value.filter(c => c.id !== id)
    if (currentConvId.value === id) {
      backToNewConversation()
    }
  } catch {
    console.error('删除对话失败')
  }
}

const backToNewConversation = () => {
  viewingHistory.value = false
  currentConvId.value = null
  chatHistory.value = []
  messages.value = [{
    role: 'ai',
    text: '您好呀～我是小护，您的健康小助手 🌸 请问哪里不舒服？我来帮您看看～',
    tags: quickTags
  }]
}

const startNewConversation = async () => {
  // 先自动保存当前对话（如果有内容）
  await autoSaveCurrentConversation()
  // 开始新对话
  chatHistory.value = []
  messages.value = [{
    role: 'ai',
    text: '好的，新的对话开始啦～请告诉我您哪里不舒服？ 🌸',
    tags: quickTags
  }]
  viewingHistory.value = false
  currentConvId.value = null
  historyOpen.value = false
  await loadConversationList()
}

const autoSaveCurrentConversation = async () => {
  // 只保存有实际用户消息的对话
  const userMessages = messages.value.filter(m => m.role === 'user')
  if (userMessages.length === 0) return
  const pid = currentUser.value?.patient_id
  if (!pid) return

  try {
    // 构造可序列化的消息数组
    const serializable = messages.value
      .filter(m => !m.loading)
      .map(m => ({
        role: m.role,
        text: m.text,
        recommendation: m.recommendation || null,
        secondary: m.secondary || null
      }))

    // 标题：取第一条用户消息的前20个字符
    const title = userMessages[0].text?.slice(0, 20) || '导诊对话'

    if (currentConvId.value) {
      // 已有对话，暂不更新（可扩展）
    } else {
      // 新对话，保存
      const res = await axios.post('/api/triage/conversations', {
        patient_id: pid,
        title,
        messages: serializable
      })
      currentConvId.value = res.data.id
    }
  } catch {
    console.error('自动保存对话失败')
  }
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `今天 ${time}`
  if (isYesterday) return `昨天 ${time}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
}

// ========== 消息发送 ==========
const handleManual = () => {
  messages.value.push({
    role: 'ai',
    text: '如需人工分诊，建议您前往医院大厅分诊台，由护士为您指引。您也可以直接选择科室进行挂号。'
  })
  scrollToBottom()
}

const sendTag = (tag: string) => {
  inputText.value = tag
  sendMessage()
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || analyzing.value) return

  messages.value.push({ role: 'user', text })
  inputText.value = ''
  chatHistory.value.push(text)
  scrollToBottom()

  analyzing.value = true
  messages.value.push({ role: 'ai', loading: true })
  scrollToBottom()

  try {
    const startTime = Date.now()

    const res = await axios.post('/api/triage/analyze', {
      symptoms: chatHistory.value.join('，'),
      history: chatHistory.value
    })

    const elapsed = Date.now() - startTime
    if (elapsed < 800) {
      await new Promise(r => setTimeout(r, 800 - elapsed))
    }

    messages.value.pop()
    const data = res.data

    if (data.matched && data.primary) {
      messages.value.push({
        role: 'ai',
        text: data.message,
        recommendation: data.primary,
        secondary: data.secondary
      })
    } else if (data.needClarify) {
      messages.value.push({
        role: 'ai',
        text: data.message,
        tags: data.possibleDepts?.length > 0
          ? data.possibleDepts.map((d: string) => `${d}相关症状`)
          : quickTags.slice(0, 4)
      })
    } else {
      messages.value.push({
        role: 'ai',
        text: data.message || '抱歉，暂时无法分析您的症状，建议前往分诊台咨询。'
      })
    }

    // 有推荐结果时自动保存对话
    if (data.matched && data.primary) {
      await autoSaveCurrentConversation()
      await loadConversationList()
    }
  } catch {
    messages.value.pop()
    messages.value.push({
      role: 'ai',
      text: '抱歉，小护暂时连不上服务了。请稍后再试，或直接选择科室挂号哦～'
    })
  } finally {
    analyzing.value = false
    scrollToBottom()
  }
}

const retryTriage = () => {
  chatHistory.value = []
  messages.value = [{
    role: 'ai',
    text: '好的，请重新描述您的症状，小护来帮您分析～',
    tags: quickTags
  }]
}

const goAppointment = (rec: any) => {
  closePanel()
  if (rec.doctors && rec.doctors.length > 0 && rec.dept_id) {
    const today = new Date().toISOString().slice(0, 10)
    router.push({
      path: '/appointment/doctor',
      query: {
        dept_id: String(rec.dept_id),
        dept_name: rec.dept_name,
        date: today,
        triage_doctor_id: String(rec.doctors[0].id)
      }
    })
  } else if (rec.dept_id) {
    router.push({
      path: '/appointment/dept',
      query: { triage_dept_id: String(rec.dept_id) }
    })
  } else {
    router.push('/appointment/dept')
  }
}

const formatText = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
/* ===== 悬浮球 ===== */
.triage-fab {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(21, 101, 192, 0.4);
  transition: transform 0.3s, box-shadow 0.3s;
  flex-direction: column;
  gap: 2px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.triage-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px rgba(21, 101, 192, 0.55);
}

.triage-fab.fab-dragging {
  cursor: grabbing;
  transform: scale(1.08);
  box-shadow: 0 8px 32px rgba(21, 101, 192, 0.6);
  transition: none;
}

.fab-icon {
  font-size: 24px;
  line-height: 1;
}

.fab-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* 呼吸动画 */
.fab-pulse::before {
  content: '';
  position: absolute;
  top: -4px; left: -4px; right: -4px; bottom: -4px;
  border-radius: 50%;
  border: 2px solid rgba(30, 136, 229, 0.5);
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  70% { transform: scale(1.25); opacity: 0; }
  100% { transform: scale(1.25); opacity: 0; }
}

/* ===== 对话框面板 ===== */
.triage-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 440px;
  height: 640px;
  background: #F7F8FA;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(30, 136, 229, 0.1);
}

.triage-slide-enter-active, .triage-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.triage-slide-enter-from, .triage-slide-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

/* ===== 头部 ===== */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  flex-shrink: 0;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon { font-size: 20px; }

.panel-title {
  font-size: 15px;
  font-weight: 600;
}

.panel-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.header-btn:hover { background: rgba(255,255,255,0.3); }

.human-link {
  font-size: 12px;
  opacity: 0.85;
  cursor: pointer;
  text-decoration: underline;
  transition: opacity 0.2s;
}
.human-link:hover { opacity: 1; }

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 22px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.close-btn:hover { opacity: 1; }

/* ===== 历史对话侧边栏 ===== */
.history-panel {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #E0E0E0;
}

.history-slide-enter-active, .history-slide-leave-active {
  transition: all 0.25s ease;
}
.history-slide-enter-from, .history-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #F0F0F0;
  flex-shrink: 0;
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.history-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  position: relative;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}
.history-item:hover { background: #F5F7FA; }
.history-item.active { background: #E3F2FD; }

.history-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  padding-right: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
}

.history-msg-count {
  color: #1E88E5;
}

.history-delete {
  position: absolute;
  top: 12px;
  right: 8px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}
.history-item:hover .history-delete { opacity: 0.6; }
.history-delete:hover { opacity: 1 !important; }

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  gap: 8px;
}
.empty-icon { font-size: 36px; }

/* ===== 历史对话标记 ===== */
.history-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #E3F2FD;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #1565C0;
}

.back-to-new {
  padding: 4px 12px;
  border: 1px solid #1E88E5;
  background: white;
  color: #1E88E5;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.back-to-new:hover {
  background: #1E88E5;
  color: white;
}

/* ===== 消息区域 ===== */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-area::-webkit-scrollbar { width: 4px; }
.chat-area::-webkit-scrollbar-thumb { background: #C0C0C0; border-radius: 2px; }

.msg-row {
  display: flex;
  gap: 8px;
  max-width: 88%;
}

.msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-ai {
  align-self: flex-start;
}

.ai-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #E3F2FD;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1E88E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.bubble-ai {
  background: white;
  color: #333;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.bubble-user {
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  border-top-right-radius: 4px;
}

/* 加载动画 */
.loading-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1E88E5;
  animation: dot-bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.16s; }
.dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  margin-left: 6px;
  font-size: 12px;
  color: #1E88E5;
}

/* ===== 快捷标签 ===== */
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.quick-tag {
  padding: 5px 12px;
  background: #E3F2FD;
  color: #1565C0;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #BBDEFB;
}
.quick-tag:hover {
  background: #1565C0;
  color: white;
}

/* ===== 推荐卡片 ===== */
.rec-card {
  margin-top: 10px;
  background: #F8FAFF;
  border: 1px solid #E3F2FD;
  border-radius: 10px;
  padding: 12px;
}

.secondary-card {
  background: #FFF8F0;
  border-color: #FFE0B2;
  margin-top: 6px;
}

.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rec-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #1E88E5;
  color: white;
  font-weight: 500;
}

.rec-badge.alt {
  background: #FB8C00;
}

.rec-confidence {
  font-size: 12px;
  color: #43A047;
  font-weight: 600;
}

.rec-dept {
  font-size: 17px;
  font-weight: 700;
  color: #1565C0;
  margin-bottom: 4px;
}

.rec-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.rec-kw-tag {
  font-size: 11px;
  padding: 1px 6px;
  background: #E8F5E9;
  color: #2E7D32;
  border-radius: 4px;
}

.rec-doctors {
  margin-top: 6px;
}

.rec-doctor-label {
  font-size: 12px;
  color: #757575;
  margin-bottom: 6px;
  font-weight: 500;
}

.rec-doctor-item {
  padding: 8px;
  background: white;
  border-radius: 8px;
  margin-bottom: 4px;
  border: 1px solid #E0E0E0;
}

.rec-doc-name {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
}

.rec-doc-title {
  font-size: 12px;
  color: #1E88E5;
  margin: 1px 0;
}

.rec-doc-specialty {
  font-size: 11px;
  color: #757575;
  margin: 2px 0;
}

.rec-doc-slots {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #43A047;
  margin-top: 2px;
}

.rec-remain.danger {
  color: #E53935;
}

.rec-no-doctor {
  font-size: 12px;
  color: #9E9E9E;
  text-align: center;
  padding: 10px 0;
}

.rec-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.rec-btn {
  flex: 1;
  padding: 9px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.rec-btn.primary {
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
}
.rec-btn.primary:hover {
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.35);
}

.rec-btn.secondary {
  background: white;
  color: #1E88E5;
  border: 1.5px solid #1E88E5;
}
.rec-btn.secondary:hover {
  background: #E3F2FD;
}

.rec-btn.small {
  padding: 6px 12px;
  font-size: 12px;
  background: #FB8C00;
  color: white;
}
.rec-btn.small:hover {
  background: #EF6C00;
}

/* ===== 输入区域 ===== */
.input-area {
  padding: 10px 14px 14px;
  background: white;
  border-top: 1px solid #E0E0E0;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  gap: 8px;
}

.chat-input {
  flex: 1;
  height: 38px;
  padding: 0 14px;
  border: 1.5px solid #E0E0E0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input:focus {
  border-color: #1E88E5;
}

.send-btn {
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #1565C0, #1E88E5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.send-btn:not(:disabled):hover {
  opacity: 0.9;
}

.input-hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: #9E9E9E;
}

.hint-label {
  flex-shrink: 0;
}

.hint-tag {
  padding: 2px 8px;
  background: #F5F5F5;
  border-radius: 10px;
  cursor: pointer;
  color: #757575;
  transition: all 0.2s;
}
.hint-tag:hover {
  background: #E3F2FD;
  color: #1565C0;
}

.hint-more {
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  color: #1565C0;
  font-weight: 500;
  transition: all 0.2s;
}
.hint-more:hover {
  background: #E3F2FD;
}
</style>
