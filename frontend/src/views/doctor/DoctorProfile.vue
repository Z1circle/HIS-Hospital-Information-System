<template>
  <div class="doctor-profile-page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span class="top-title">医生个人中心</span>
    </div>

    <!-- 用户信息头部 -->
    <div class="header-section">
      <div class="header-bg"></div>
      <div class="user-row">
        <div class="avatar-wrapper" @click="openAvatarEdit">
          <div class="avatar">{{ profileForm.avatar || currentUser?.nickname?.charAt(0) || currentUser?.real_name?.charAt(0) || '医' }}</div>
          <div class="avatar-edit-icon">✏️</div>
        </div>
        <div class="user-detail">
          <div class="user-greeting">你好，{{ currentUser?.real_name || currentUser?.nickname || '医生' }}</div>
          <div class="user-role">医师</div>
          <div class="user-phone">{{ currentUser?.phone || '' }}</div>
        </div>
        <el-button size="small" text style="color:rgba(255,255,255,0.8)" @click="showLogoutDialog = true">退出</el-button>
      </div>
    </div>

    <div class="page-body">
      <!-- 左侧栏：个人信息和密码 -->
      <div class="left-column">
        <!-- 个人信息编辑 -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title"><el-icon><UserFilled /></el-icon> 个人信息</div>
          </div>
          <el-form :model="profileForm" label-width="100px" class="profile-form">
            <el-form-item label="姓名">
              <el-input v-model="profileForm.real_name" size="large" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="profileForm.nickname" size="large" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="profileForm.phone" size="large" />
            </el-form-item>
            <el-form-item label="头像">
              <div class="avatar-select">
                <div
                  v-for="opt in avatarOptions"
                  :key="opt"
                  :class="['avatar-option', profileForm.avatar === opt ? 'selected' : '']"
                  @click="profileForm.avatar = opt"
                >{{ opt }}</div>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="profileLoading" @click="saveProfile">保存信息</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 修改密码 -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title"><el-icon><Lock /></el-icon> 修改密码</div>
          </div>
          <el-form :model="passwordForm" label-width="100px" class="profile-form">
            <el-form-item label="旧密码">
              <el-input v-model="passwordForm.oldPassword" type="password" size="large" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="passwordForm.newPassword" type="password" size="large" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="passwordForm.confirmPassword" type="password" size="large" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="passwordLoading" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 右侧栏：快捷键和快捷操作 -->
      <div class="right-column">
        <!-- 快捷键设置 -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title"><el-icon><Setting /></el-icon> 快捷键设置</div>
            <el-button size="default" type="primary" @click="shortcutDialogVisible = true">设置快捷键</el-button>
          </div>
          <div class="shortcut-preview">
            <div v-for="item in shortcutItems" :key="item.key" class="shortcut-row">
              <div class="shortcut-info">
                <span class="shortcut-name">{{ item.name }}</span>
                <span class="shortcut-desc">{{ item.description }}</span>
              </div>
              <span class="shortcut-key">
                <span v-for="(part, idx) in formatShortcut(item.value)" :key="idx" class="key-part">{{ part }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title"><el-icon><Grid /></el-icon> 快捷操作</div>
          </div>
          <div class="action-grid">
            <div class="action-item" @click="$router.push('/doctor/outpatient')">
              <el-icon :size="32" color="#1E88E5"><List /></el-icon>
              <span>门诊工作台</span>
              <span class="action-desc">患者管理与病历录入</span>
            </div>
            <div class="action-item" @click="$router.push('/doctor/templates')">
              <el-icon :size="32" color="#43A047"><Document /></el-icon>
              <span>病历模板</span>
              <span class="action-desc">常用病历模板管理</span>
            </div>
            <div class="action-item" @click="$router.push('/doctor/prescription-templates')">
              <el-icon :size="32" color="#FB8C00"><Files /></el-icon>
              <span>处方模板</span>
              <span class="action-desc">常用处方模板管理</span>
            </div>
            <div class="action-item" @click="$router.push('/doctor/statistics')">
              <el-icon :size="32" color="#7E57C2"><TrendCharts /></el-icon>
              <span>统计分析</span>
              <span class="action-desc">工作量与收入统计</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 头像选择弹窗 -->
    <el-dialog v-model="avatarDialogVisible" title="选择头像" width="600px">
      <div class="avatar-select-grid">
        <div
          v-for="opt in avatarOptions"
          :key="opt"
          :class="['avatar-option-lg', profileForm.avatar === opt ? 'selected' : '']"
          @click="profileForm.avatar = opt"
        >{{ opt }}</div>
      </div>
    </el-dialog>

    <!-- 退出确认弹窗 -->
    <el-dialog v-model="showLogoutDialog" title="确认退出" width="300px">
      <p>确定要退出登录吗？</p>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="doLogout">确定退出</el-button>
      </template>
    </el-dialog>

    <!-- 快捷键设置弹窗 -->
    <el-dialog v-model="shortcutDialogVisible" title="快捷键设置" width="580px" :close-on-click-modal="false" @close="cancelShortcutEdit">
      <div class="shortcut-panel">
        <div class="shortcut-header">
          <span>按下快捷键组合即可修改，支持 Ctrl、Alt、Shift 修饰键</span>
          <div class="header-actions">
            <el-button size="small" @click="testShortcuts">测试快捷键</el-button>
            <el-button size="small" @click="resetShortcuts">恢复默认</el-button>
          </div>
        </div>
        <el-table :data="shortcutItems" size="small" style="margin-top: 12px" max-height="400">
          <el-table-column prop="name" label="功能名称" width="120" />
          <el-table-column prop="description" label="功能描述" width="180" />
          <el-table-column label="当前快捷键" width="200">
            <template #default="{ row }">
              <div
                :class="['shortcut-key-cell', { editing: editingKey === row.key, conflict: getConflict(row.key) }]"
                @click="startEditKey(row.key)"
                tabindex="0"
              >
                <template v-if="editingKey === row.key">
                  <span class="editing-hint">请按快捷键...</span>
                </template>
                <template v-else>
                  <span class="key-combo">
                    <span v-for="(part, idx) in formatShortcut(row.value)" :key="idx" class="key-part">{{ part }}</span>
                  </span>
                  <el-icon v-if="getConflict(row.key)" color="#F56C6C" :size="14"><Warning /></el-icon>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag v-if="getConflict(row.key)" type="danger" size="small">冲突</el-tag>
              <el-tag v-else type="success" size="small">正常</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="conflictMessage" class="conflict-warning">
          <el-icon color="#F56C6C"><Warning /></el-icon>
          <span>{{ conflictMessage }}</span>
        </div>
        <div class="shortcut-tips">
          <el-icon color="#1E88E5"><InfoFilled /></el-icon>
          <span>提示：修改后的快捷键将立即生效，无需重启系统</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelShortcutEdit">取消</el-button>
        <el-button type="primary" :loading="shortcutSaving" @click="saveShortcuts">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import {
  ArrowLeft, UserFilled, Lock, Setting, Grid,
  List, Document, Files, TrendCharts, Warning, InfoFilled
} from '@element-plus/icons-vue'
import { SHORTCUT_DEFINITIONS, DEFAULT_SHORTCUTS } from '@/composables/useShortcuts'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser

const profileForm = reactive({
  real_name: '',
  nickname: '',
  phone: '',
  avatar: '👨‍⚕️'
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileLoading = ref(false)
const passwordLoading = ref(false)
const avatarDialogVisible = ref(false)
const showLogoutDialog = ref(false)

const avatarOptions = ['👤', '👨', '👩', '🧑', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍💼', '👩‍💼']

const openAvatarEdit = () => {
  avatarDialogVisible.value = true
}

const saveProfile = async () => {
  profileLoading.value = true
  try {
    const res = await axios.put('/api/users/profile', profileForm)
    ElMessage.success('信息保存成功')
    if (res.data) {
      currentUser.value = res.data
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    profileLoading.value = false
  }
}

const changePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次密码输入不一致')
    return
  }
  passwordLoading.value = true
  try {
    await axios.put('/api/users/password', {
      old_password: passwordForm.oldPassword,
      new_password: passwordForm.newPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    doLogout()
  } catch {
    ElMessage.error('密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

const doLogout = () => {
  userStore.logout()
  router.push('/login')
}

// ─── 快捷键设置 ─────────────────────────────────────────

const shortcutItems = ref<{ key: string; name: string; description: string; value: string }[]>([])
const editingKey = ref<string | null>(null)
const conflictMessage = ref('')
const shortcutDialogVisible = ref(false)
const shortcutSaving = ref(false)

const formatShortcut = (value: string) => {
  return value.split('+')
}

const loadShortcuts = async () => {
  const userId = currentUser.value?.id || 'default'
  const saved = localStorage.getItem(`doctor_shortcuts_${userId}`)
  if (saved) {
    try {
      const savedObj = JSON.parse(saved)
      shortcutItems.value = SHORTCUT_DEFINITIONS.map(item => ({
        ...item,
        value: savedObj[item.key] || item.default
      }))
    } catch {
      shortcutItems.value = SHORTCUT_DEFINITIONS.map(item => ({ ...item, value: item.default }))
    }
  } else {
    shortcutItems.value = SHORTCUT_DEFINITIONS.map(item => ({ ...item, value: item.default }))
  }

  const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
  if (doctorId) {
    try {
      const res = await axios.get('/api/doctor/shortcuts', { params: { doctor_id: doctorId } })
      if (res.data.success && res.data.shortcuts && Object.keys(res.data.shortcuts).length > 0) {
        shortcutItems.value = SHORTCUT_DEFINITIONS.map(item => ({
          ...item,
          value: res.data.shortcuts[item.key] || item.default
        }))
        localStorage.setItem(`doctor_shortcuts_${userId}`, JSON.stringify(res.data.shortcuts))
      }
    } catch {
    }
  }
}

const startEditKey = (key: string) => {
  editingKey.value = key
  conflictMessage.value = ''
}

const cancelShortcutEdit = () => {
  editingKey.value = null
  conflictMessage.value = ''
}

const getConflict = (currentKey: string) => {
  const currentValue = shortcutItems.value.find(i => i.key === currentKey)?.value
  return shortcutItems.value.some(i => i.key !== currentKey && i.value === currentValue)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (!editingKey.value) return

  e.preventDefault()

  const keys: string[] = []
  if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')

  let key = e.key
  if (key === ' ') key = 'Space'
  if (key === 'Enter') key = 'Enter'
  if (key.startsWith('Arrow')) key = key.replace('Arrow', '')
  if (keys.length === 0 && ['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return

  keys.push(key)
  const newShortcut = keys.join('+')

  const item = shortcutItems.value.find(i => i.key === editingKey.value)
  if (item) {
    item.value = newShortcut

    const conflictItem = shortcutItems.value.find(i => i.key !== editingKey.value && i.value === newShortcut)
    if (conflictItem) {
      conflictMessage.value = `快捷键冲突：${newShortcut} 已被 "${conflictItem.name}" 使用`
    } else {
      conflictMessage.value = ''
    }
  }

  editingKey.value = null
}

const saveShortcuts = async () => {
  shortcutSaving.value = true
  try {
    const shortcuts: Record<string, string> = {}
    shortcutItems.value.forEach(item => {
      shortcuts[item.key] = item.value
    })

    const userId = currentUser.value?.id || 'default'
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id

    localStorage.setItem(`doctor_shortcuts_${userId}`, JSON.stringify(shortcuts))

    if (doctorId) {
      const res = await axios.post('/api/doctor/shortcuts', { doctor_id: doctorId, shortcuts })
      if (res.data.success) {
        ElMessage.success('快捷键设置已保存')
        shortcutDialogVisible.value = false
      } else {
        ElMessage.error(res.data.error || '保存失败')
      }
    } else {
      ElMessage.success('快捷键设置已保存（仅本地）')
      shortcutDialogVisible.value = false
    }
  } catch (err: any) {
    console.error('保存快捷键失败:', err)
    const msg = err.response?.data?.error || err.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    shortcutSaving.value = false
  }
}

const resetShortcuts = () => {
  shortcutItems.value = SHORTCUT_DEFINITIONS.map(item => ({
    ...item,
    value: DEFAULT_SHORTCUTS[item.key] || item.default
  }))
  conflictMessage.value = ''
  editingKey.value = null
}

const testShortcuts = () => {
  ElMessage.info('快捷键测试模式已开启，请按下任意快捷键测试功能')
}

onMounted(() => {
  profileForm.real_name = currentUser.value?.real_name || ''
  profileForm.nickname = currentUser.value?.nickname || ''
  profileForm.phone = currentUser.value?.phone || ''
  profileForm.avatar = currentUser.value?.avatar || '👨‍⚕️'

  console.log('Current user:', currentUser.value)
  console.log('Doctor ID:', currentUser.value?.doctor_id || currentUser.value?.id)

  loadShortcuts()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

watch(shortcutDialogVisible, (val) => {
  if (val) {
    loadShortcuts()
  }
})
</script>

<style scoped>
.doctor-profile-page {
  min-height: 100vh;
  background: #F0F2F5;
  padding-bottom: 40px;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.back-btn {
  font-size: 24px;
  cursor: pointer;
  color: #606266;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #1E88E5;
}

.top-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-section {
  position: relative;
  padding: 60px 40px 40px;
  overflow: hidden;
  max-width: 1400px;
  margin: 0 auto;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 160px;
  background: linear-gradient(135deg, #1E88E5, #42A5F5);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-wrapper:hover {
  transform: scale(1.05);
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: white;
  border: 5px solid rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.avatar-edit-icon {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: #1E88E5;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border: 3px solid white;
}

.user-detail {
  flex: 1;
}

.user-greeting {
  font-size: 24px;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
}

.user-role {
  font-size: 16px;
  color: rgba(255,255,255,0.9);
  margin-bottom: 6px;
}

.user-phone {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}

.page-body {
  padding: 0 40px;
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
}

.section-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #F0F0F0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .el-icon {
  font-size: 20px;
}

.profile-form {
  max-width: 100%;
}

.profile-form .el-form-item {
  margin-bottom: 24px;
}

.avatar-select {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.avatar-option {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.avatar-option:hover {
  background: #E3F2FD;
  transform: scale(1.1);
}

.avatar-option.selected {
  background: #1E88E5;
  border: 3px solid #1565C0;
}

.avatar-select-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.avatar-option-lg {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.avatar-option-lg:hover {
  background: #E3F2FD;
  transform: scale(1.1);
}

.avatar-option-lg.selected {
  background: #1E88E5;
  border: 4px solid #1565C0;
}

.shortcut-preview {
  max-height: 400px;
  overflow-y: auto;
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #F5F7FA;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: background 0.2s;
}

.shortcut-row:hover {
  background: #E8F4FD;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.shortcut-desc {
  font-size: 13px;
  color: #909399;
}

.shortcut-key {
  display: flex;
  gap: 6px;
}

.shortcut-key .key-part {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  background: white;
  border: 2px solid #E0E0E0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px;
  background: #F5F7FA;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.action-item:hover {
  background: #E3F2FD;
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(30, 136, 229, 0.2);
  border-color: #1E88E5;
}

.action-item span {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.action-desc {
  font-size: 13px;
  color: #909399;
  font-weight: 400;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .page-body {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .header-section {
    padding: 50px 32px 32px;
  }

  .avatar {
    width: 90px;
    height: 90px;
    font-size: 42px;
  }

  .user-greeting {
    font-size: 22px;
  }
}

@media (max-width: 768px) {
  .top-bar {
    padding: 12px 20px;
  }

  .header-section {
    padding: 40px 20px 24px;
  }

  .header-bg {
    height: 140px;
  }

  .avatar {
    width: 80px;
    height: 80px;
    font-size: 36px;
  }

  .user-greeting {
    font-size: 20px;
  }

  .page-body {
    padding: 0 20px;
  }

  .section-card {
    padding: 20px;
  }

  .section-title {
    font-size: 16px;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .action-item {
    padding: 20px;
  }

  .shortcut-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .shortcut-key {
    align-self: flex-end;
  }
}

/* 快捷键设置弹窗样式 */
.shortcut-panel {
  padding: 12px 0;
}

.shortcut-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #9E9E9E;
  padding: 8px 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.shortcut-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #F5F7FA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;
}

.shortcut-key-cell:hover {
  background: #E3F2FD;
  transform: translateY(-2px);
}

.shortcut-key-cell:focus {
  outline: 2px solid #1E88E5;
  outline-offset: 2px;
}

.shortcut-key-cell.editing {
  background: #FFF9E6;
  border: 2px dashed #FF9800;
  animation: pulse 1.5s infinite;
}

.shortcut-key-cell.conflict {
  background: #FFF0F0;
  border: 2px solid #FFCDD2;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.key-combo {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-part {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: white;
  border: 2px solid #E0E0E0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}

.editing-hint {
  color: #FF9800;
  font-size: 14px;
  font-weight: 500;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.conflict-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #FFF0F0;
  border-radius: 8px;
  font-size: 14px;
  color: #E53935;
  border: 2px solid #FFCDD2;
}

.shortcut-tips {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #E3F2FD;
  border-radius: 8px;
  font-size: 13px;
  color: #1565C0;
  border: 2px solid #BBDEFB;
}
</style>