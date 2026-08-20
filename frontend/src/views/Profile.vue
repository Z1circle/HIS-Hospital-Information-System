<template>
  <div class="profile-page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span class="top-title">个人中心</span>
    </div>

    <!-- 用户信息头部 -->
    <div class="header-section">
      <div class="header-bg"></div>
      <div class="user-row">
        <div class="avatar-wrapper" @click="openAvatarEdit">
          <div class="avatar">{{ profileForm.avatar || currentUser?.nickname?.charAt(0) || currentUser?.real_name?.charAt(0) || '用' }}</div>
          <div class="avatar-edit-icon">✏️</div>
        </div>
        <div class="user-detail">
          <div class="user-greeting">你好，{{ currentUser?.nickname || currentUser?.real_name || '游客' }}</div>
          <div class="user-role">{{ roleText }}</div>
          <div class="user-phone">{{ currentUser?.phone || '' }}</div>
        </div>
        <el-button v-if="currentUser" size="small" text style="color:rgba(255,255,255,0.8)" @click="showLogoutDialog = true">退出</el-button>
        <el-button v-else size="small" type="primary" @click="$router.push('/login')">登录</el-button>
      </div>
    </div>

    <div class="page-body">
      <!-- 就诊卡区域 -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><el-icon><CreditCard /></el-icon> 我的就诊卡</div>
          <el-button size="small" type="primary" :icon="Plus" @click="openAddCard">添加就诊卡</el-button>
        </div>

        <div v-if="ecards.length === 0" class="empty-card">
          <el-empty description="暂未添加就诊卡" :image-size="60" />
        </div>

        <div v-for="card in ecards" :key="card.id" class="ecard-row">
          <div class="ecard-icon">🏥</div>
          <div class="ecard-info">
            <div class="ecard-hospital">{{ card.hospital }}</div>
            <div class="ecard-no">
              卡号：{{ visibleCards[card.id] ? card.cardNo : maskCardNo(card.cardNo) }}
              <el-icon class="eye-icon" @click="toggleVisible(card.id)">
                <component :is="visibleCards[card.id] ? 'Hide' : 'View'" />
              </el-icon>
            </div>
            <div class="ecard-name">持卡人：{{ card.name }}</div>
          </div>
          <div class="ecard-actions">
            <el-button size="small" :icon="Edit" circle @click="openEditCard(card)" />
            <el-popconfirm title="确认删除此就诊卡？" @confirm="deleteCard(card.id)">
              <template #reference>
                <el-button size="small" :icon="Delete" circle type="danger" />
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="section-card">
        <div class="section-title" style="padding:0 0 12px 0"><el-icon><Grid /></el-icon> 我的服务</div>
        <div class="menu-grid">
          <div v-for="item in serviceItems" :key="item.name" class="menu-item" @click="item.action()">
            <div class="menu-icon" :style="{background: item.color}">{{ item.icon }}</div>
            <span>{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 设置 -->
      <div class="section-card">
        <div class="section-title" style="padding:0 0 8px 0"><el-icon><Setting /></el-icon> 账户设置</div>
        <div
          v-for="item in settingItems"
          :key="item.name"
          class="list-item"
          @click="item.action()"
        >
          <span class="list-icon">{{ item.icon }}</span>
          <span class="list-label">{{ item.name }}</span>
          <el-icon class="list-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <!-- 添加/编辑就诊卡弹窗 -->
    <el-dialog
      v-model="cardDialogVisible"
      :title="editingCard ? '编辑就诊卡' : '添加就诊卡'"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form :model="cardForm" label-width="80px">
        <el-form-item label="医院名称">
          <el-input v-model="cardForm.hospital" placeholder="如：湖北省中医院" clearable />
        </el-form-item>
        <el-form-item label="就诊卡号">
          <el-input v-model="cardForm.cardNo" placeholder="如：MR00000001" clearable />
        </el-form-item>
        <el-form-item label="持卡人">
          <el-input v-model="cardForm.name" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item label="医保类型">
          <el-select v-model="cardForm.insuranceType" style="width:100%">
            <el-option label="自费" value="自费" />
            <el-option label="居民医保" value="居民医保" />
            <el-option label="职工医保" value="职工医保" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCard">保存</el-button>
      </template>
    </el-dialog>

    <!-- 头像和昵称编辑弹窗 -->
    <el-dialog v-model="profileDialogVisible" title="编辑个人信息" width="420px" :close-on-click-modal="false">
      <el-form :model="profileForm" label-width="80px">
        <el-form-item label="头像">
          <div class="avatar-options">
            <div
              v-for="av in avatarOptions"
              :key="av"
              :class="['avatar-option', profileForm.avatar === av ? 'selected' : '']"
              @click="profileForm.avatar = av"
            >{{ av }}</div>
          </div>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" placeholder="请输入昵称" clearable maxlength="20" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="profileForm.phone" placeholder="请输入手机号" clearable maxlength="11" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="profileLoading" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px" :close-on-click-modal="false">
      <el-form :model="passwordForm" label-width="90px">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password clearable />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password clearable />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>

    <!-- 退出登录确认弹窗 -->
    <el-dialog v-model="showLogoutDialog" title="确认退出" width="320px" :close-on-click-modal="false">
      <div class="logout-dialog-content">
        <el-icon :size="48" color="#F56C6C" style="margin-bottom:16px"><SwitchButton /></el-icon>
        <p>确定要退出系统吗？</p>
        <p class="logout-hint">退出后需要重新登录才能继续操作</p>
      </div>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="handleLogout">确定退出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { ArrowLeft, ArrowRight, Plus, Edit, Delete, CreditCard, Grid, Setting, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const { currentUser, logout } = useUserStore()

// ─── 角色文案 ───────────────────────────────────────
const roleText = computed(() => {
  const m: Record<string, string> = {
    patient: '患者',
    doctor: '医生',
    inpatient_doctor: '住院医生',
    pharmacist: '药房人员',
    admin: '管理员',
    visitor: '游客'
  }
  return m[currentUser.value?.role || 'visitor']
})

const showLogoutDialog = ref(false)

const handleLogout = () => {
  showLogoutDialog.value = false
  logout()
  router.push('/')
}

// ─── 就诊卡 CRUD ─────────────────────────────────────
interface ECardItem {
  id: string
  hospital: string
  cardNo: string
  name: string
  insuranceType: string
}

const STORAGE_KEY = computed(() => `ecards_${currentUser.value?.id || 'guest'}`)
const ecards = ref<ECardItem[]>([])
const visibleCards = reactive<Record<string, boolean>>({})

const loadCards = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value)
    ecards.value = raw ? JSON.parse(raw) : []
  } catch { ecards.value = [] }
}

const saveCards = () => {
  localStorage.setItem(STORAGE_KEY.value, JSON.stringify(ecards.value))
}

const maskCardNo = (no: string) => {
  if (!no) return ''
  if (no.length <= 4) return no
  return no.slice(0, 2) + '****' + no.slice(-4)
}

const toggleVisible = (id: string) => {
  visibleCards[id] = !visibleCards[id]
}

// 弹窗
const cardDialogVisible = ref(false)
const editingCard = ref<ECardItem | null>(null)
const cardForm = reactive({ hospital: '湖北省中医院', cardNo: '', name: '', insuranceType: '自费' })

const openAddCard = () => {
  editingCard.value = null
  Object.assign(cardForm, { hospital: '湖北省中医院', cardNo: '', name: currentUser.value?.real_name || '', insuranceType: '自费' })
  cardDialogVisible.value = true
}

const openEditCard = (card: ECardItem) => {
  editingCard.value = card
  Object.assign(cardForm, { hospital: card.hospital, cardNo: card.cardNo, name: card.name, insuranceType: card.insuranceType })
  cardDialogVisible.value = true
}

const saveCard = () => {
  if (!cardForm.cardNo.trim()) { ElMessage.warning('请输入就诊卡号'); return }
  if (!cardForm.name.trim()) { ElMessage.warning('请输入持卡人姓名'); return }
  if (editingCard.value) {
    const idx = ecards.value.findIndex(c => c.id === editingCard.value!.id)
    if (idx !== -1) ecards.value[idx] = { ...editingCard.value, ...cardForm }
    ElMessage.success('修改成功')
  } else {
    ecards.value.push({ id: 'c-' + Date.now(), ...cardForm })
    ElMessage.success('添加成功')
  }
  saveCards()
  cardDialogVisible.value = false
}

const deleteCard = (id: string) => {
  ecards.value = ecards.value.filter(c => c.id !== id)
  saveCards()
  ElMessage.success('已删除')
}

// ─── 个人资料编辑 ─────────────────────────────────────
const avatarOptions = ['👤', '👨', '👩', '🧑', '👴', '👵', '👶', '🧒', '👨‍⚕️', '👩‍⚕️', '👨‍💼', '👩‍💼']
const profileDialogVisible = ref(false)
const profileLoading = ref(false)
const profileForm = reactive({ nickname: '', phone: '', avatar: '' })

const openAvatarEdit = () => {
  if (!currentUser.value) {
    ElMessage.warning('请先登录')
    return
  }
  profileForm.nickname = currentUser.value.nickname || currentUser.value.real_name || ''
  profileForm.phone = currentUser.value.phone || ''
  profileForm.avatar = currentUser.value.avatar || '👤'
  profileDialogVisible.value = true
}

const saveProfile = async () => {
  if (!currentUser.value) return
  if (!profileForm.nickname.trim()) { ElMessage.warning('请输入昵称'); return }
  profileLoading.value = true
  try {
    const res = await axios.put('/api/user/profile', {
      userId: currentUser.value.id,
      nickname: profileForm.nickname,
      phone: profileForm.phone,
      avatar: profileForm.avatar
    })
    // 更新本地用户信息
    currentUser.value = { ...currentUser.value, ...res.data }
    profileDialogVisible.value = false
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    profileLoading.value = false
  }
}

// ─── 修改密码 ─────────────────────────────────────────
const passwordDialogVisible = ref(false)
const passwordLoading = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const openPasswordChange = () => {
  if (!currentUser.value) {
    ElMessage.warning('请先登录')
    return
  }
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const changePassword = async () => {
  if (!passwordForm.oldPassword) { ElMessage.warning('请输入原密码'); return }
  if (!passwordForm.newPassword) { ElMessage.warning('请输入新密码'); return }
  if (passwordForm.newPassword.length < 6) { ElMessage.warning('新密码至少6位'); return }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) { ElMessage.warning('两次密码不一致'); return }
  passwordLoading.value = true
  try {
    await axios.put('/api/user/password', {
      userId: currentUser.value!.id,
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    passwordDialogVisible.value = false
    ElMessage.success('密码修改成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  loadCards()
})

onUnmounted(() => {
})

const serviceItems = [
  { name: '我的预约',  icon: '📅', color: '#1E88E5', action: () => router.push('/appointment/dept') },
  { name: '就诊记录',  icon: '📋', color: '#43A047', action: () => router.push('/medical-records') },
  { name: '缴费记录',  icon: '💳', color: '#FB8C00', action: () => router.push('/payment') },
  { name: '候诊状态',  icon: '⏰', color: '#8E24AA', action: () => router.push('/queue') },
  { name: '电子就诊卡',icon: '🏥', color: '#1565C0', action: () => router.push('/ecard') },
  { name: '检查报告',  icon: '🔬', color: '#00897B', action: () => router.push('/report') },
]

const settingItems = [
  { icon: '🔒', name: '修改密码',  action: openPasswordChange },
  { icon: '🔔', name: '消息通知',  action: () => ElMessage.info('功能开发中') },
  { icon: '🌐', name: '语言设置',  action: () => router.push('/language-settings') },
  { icon: '📝', name: '意见反馈',  action: () => ElMessage.info('功能开发中') },
  { icon: 'ℹ️',  name: '关于我们',  action: () => ElMessage.info('湖北省中医院 HIS v2.0') },
]
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #F0F4FF;
  max-width: 960px;
  margin: 0 auto;
}

/* 顶部栏 */
.top-bar {
  background: #1565C0;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  color: white;
  font-size: 16px;
  font-weight: 600;
}
.back-btn { cursor: pointer; font-size: 20px; color: white; }
.top-title { flex: 1; }

/* 用户头部 */
.header-section {
  position: relative;
  padding: 0 20px 24px;
  overflow: hidden;
}
.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1565C0 0%, #1E88E5 100%);
  height: 130px;
}
.user-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 20px;
  z-index: 1;
}
.avatar {
  width: 64px; height: 64px;
  background: rgba(255,255,255,0.25);
  border: 2px solid rgba(255,255,255,0.6);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; color: white;
  flex-shrink: 0;
}
.user-detail { flex: 1; color: white; }
.user-greeting { font-size: 18px; font-weight: 700; }
.user-role { font-size: 13px; opacity: 0.85; margin-top: 2px; }
.user-phone { font-size: 12px; opacity: 0.75; margin-top: 2px; }

/* 主体 */
.page-body { padding: 0 16px 24px; }

.section-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #212121;
}

/* 就诊卡行 */
.ecard-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #E3E8F0;
  border-radius: 10px;
  margin-bottom: 10px;
  transition: box-shadow .15s;
}
.ecard-row:hover { box-shadow: 0 2px 8px rgba(21,101,192,.12); }
.ecard-icon { font-size: 28px; }
.ecard-info { flex: 1; }
.ecard-hospital { font-size: 14px; font-weight: 600; color: #1565C0; }
.ecard-no { font-size: 13px; color: #555; margin: 3px 0; display: flex; align-items: center; gap: 6px; }
.eye-icon { cursor: pointer; color: #1E88E5; font-size: 16px; }
.ecard-name { font-size: 12px; color: #9E9E9E; }
.ecard-actions { display: flex; gap: 6px; }
.empty-card { padding: 12px 0; }

/* 服务网格 */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.menu-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 12px 6px;
  border-radius: 10px; cursor: pointer;
  font-size: 13px; color: #333;
  transition: background .15s;
}
.menu-item:hover { background: #F0F4FF; }
.menu-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}

/* 列表菜单 */
.list-item {
  display: flex; align-items: center;
  padding: 13px 4px;
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background .15s;
}
.list-item:last-child { border-bottom: none; }
.list-item:hover { background: #F8FAFF; }
.list-icon { font-size: 18px; margin-right: 10px; }
.list-label { flex: 1; font-size: 14px; color: #333; }
.list-arrow { color: #BDBDBD; }

/* 头像编辑 */
.avatar-wrapper {
  position: relative;
  cursor: pointer;
}
.avatar-edit-icon {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 14px;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 头像选项 */
.avatar-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.avatar-option {
  width: 50px;
  height: 50px;
  border: 2px solid #E0E0E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s;
}
.avatar-option:hover {
  border-color: #1E88E5;
  transform: scale(1.1);
}
.avatar-option.selected {
  border-color: #1565C0;
  background: #E3F2FD;
}

/* 退出确认弹窗 */
:deep(.logout-dialog-content) {
  text-align: center;
  padding: 24px 0;
}
:deep(.logout-dialog-content p) {
  margin: 10px 0;
  color: #4A5568;
  font-size: 15px;
}
:deep(.logout-hint) {
  font-size: 13px;
  color: #A0AEC0 !important;
}
</style>
