<template>
  <div class="auth-page">
    <!-- 返回按钮：优先回退，否则返回首页 -->
    <div class="back-home" @click="goBack">
      <el-icon><ArrowLeft /></el-icon>
      <span>{{ canGoBack ? '返回' : '返回首页' }}</span>
    </div>
    <div class="auth-card">
      <!-- Logo -->
      <div class="logo-section">
        <div class="logo-icon">🏥</div>
        <h1>HIS 医院信息管理系统</h1>
        <p>Medical Information System</p>
      </div>

      <!-- Tab 切换 -->
      <div class="tab-bar">
        <button :class="['tab-btn', activeTab === 'login' ? 'active' : '']" @click="switchTab('login')">登录</button>
        <button :class="['tab-btn', activeTab === 'register' ? 'active' : '']" @click="switchTab('register')">注册</button>
        <div class="tab-indicator" :style="{ left: activeTab === 'login' ? '0%' : '50%' }"></div>
      </div>

      <!-- 登录表单 -->
      <transition name="slide" mode="out-in">
        <div v-if="activeTab === 'login'" key="login" class="form-wrap">
          <el-form @submit.prevent="handleLogin">
            <el-form-item>
              <el-input v-model="loginForm.username" placeholder="用户名" size="large" prefix-icon="User" clearable />
              <div v-if="loginErrors.username" class="err-msg">{{ loginErrors.username }}</div>
            </el-form-item>
            <el-form-item>
              <el-input v-model="loginForm.password" type="password" placeholder="密码" size="large"
                prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
              <div v-if="loginErrors.password" class="err-msg">{{ loginErrors.password }}</div>
            </el-form-item>
            <div class="extra-row">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <span class="link-text" @click="switchTab('register')">没有账号？去注册</span>
            </div>
            <div class="login-actions">
              <el-button type="primary" size="large" :loading="loginLoading" class="submit-btn" @click="handleLogin">
                登录
              </el-button>
              <el-button size="large" class="visitor-btn" plain @click="asVisitor">游客浏览</el-button>
            </div>
          </el-form>

          <!-- 快捷选择 -->
          <div class="quick-select-section">
            <div class="quick-select-header">
              <span class="quick-select-title">⚡ 快捷登录</span>
              <span class="quick-select-tip">点击类别选择角色，密码统一 123456</span>
            </div>
            <div class="category-buttons">
              <div
                v-for="cat in categories"
                :key="cat.role"
                :class="['category-btn', cat.role, { active: activeCategory === cat.role }]"
                @click.stop="toggleCategory(cat.role)"
              >
                <span class="cat-label">{{ cat.label }}</span>
                <span class="cat-count">{{ getUserCount(cat.role) }}</span>
              </div>
            </div>

            <!-- 下拉面板 -->
            <transition name="dropdown">
              <div v-if="activeCategory" class="dropdown-panel" @click.stop>
                <div class="dropdown-search">
                  <el-input
                    v-model="searchText"
                    placeholder="搜索角色..."
                    size="small"
                    clearable
                    prefix-icon="Search"
                    @input="filterUsers"
                  />
                </div>
                <div class="dropdown-list" v-if="filteredUsers.length > 0">
                  <div
                    v-for="user in filteredUsers"
                    :key="user.id"
                    :class="['dropdown-item', { selected: loginForm.username === user.username }]"
                    @click="selectUser(user)"
                  >
                    <span class="user-avatar">{{ user.real_name?.charAt(0) || '?' }}</span>
                    <div class="user-info">
                      <span class="user-name">{{ user.real_name }}</span>
                      <span class="user-account">{{ user.username }}</span>
                    </div>
                    <el-icon v-if="loginForm.username === user.username" class="check-icon" color="#43A047"><CircleCheck /></el-icon>
                  </div>
                </div>
                <div v-else class="dropdown-empty">
                  <span>未找到匹配用户</span>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 注册表单 -->
        <div v-else key="register" class="form-wrap">
          <el-form @submit.prevent="handleRegister">
            <!-- 第一行：用户名 -->
            <el-form-item>
              <el-input v-model="regForm.username" placeholder="用户名（登录使用）" size="large" prefix-icon="User" clearable />
              <div v-if="regErrors.username" class="err-msg">{{ regErrors.username }}</div>
            </el-form-item>
            <!-- 第二行：密码 + 确认密码 -->
            <el-form-item>
              <el-input v-model="regForm.password" type="password" placeholder="密码（至少6位）" size="large"
                prefix-icon="Lock" show-password />
              <div v-if="regErrors.password" class="err-msg">{{ regErrors.password }}</div>
            </el-form-item>
            <el-form-item>
              <el-input v-model="regForm.confirmPwd" type="password" placeholder="确认密码" size="large"
                prefix-icon="Lock" show-password />
              <div v-if="regErrors.confirmPwd" class="err-msg">{{ regErrors.confirmPwd }}</div>
            </el-form-item>
            <!-- 真实姓名 -->
            <el-form-item>
              <el-input v-model="regForm.real_name" placeholder="真实姓名" size="large" prefix-icon="Avatar" clearable />
              <div v-if="regErrors.real_name" class="err-msg">{{ regErrors.real_name }}</div>
            </el-form-item>
            <!-- 手机号 -->
            <el-form-item>
              <el-input v-model="regForm.phone" placeholder="手机号" size="large" prefix-icon="Phone" clearable
                maxlength="11" />
              <div v-if="regErrors.phone" class="err-msg">{{ regErrors.phone }}</div>
            </el-form-item>
            <!-- 身份证（选填） -->
            <el-form-item>
              <el-input v-model="regForm.id_card" placeholder="身份证号（选填，用于医保）" size="large"
                prefix-icon="Postcard" clearable maxlength="18" />
              <div v-if="regErrors.id_card" class="err-msg">{{ regErrors.id_card }}</div>
            </el-form-item>
            <!-- 性别 + 出生日期 -->
            <div class="row-split">
              <el-form-item style="flex:1">
                <el-select v-model="regForm.gender" placeholder="性别" size="large" style="width:100%">
                  <el-option label="男" value="男" />
                  <el-option label="女" value="女" />
                </el-select>
              </el-form-item>
              <el-form-item style="flex:2">
                <el-date-picker v-model="regForm.birth_date" type="date" placeholder="出生日期（选填）"
                  size="large" style="width:100%" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
              </el-form-item>
            </div>
            <!-- 协议 -->
            <div class="agree-row">
              <el-checkbox v-model="regForm.agreed">
                我已阅读并同意
                <span class="link-text">《用户服务协议》</span>
                及
                <span class="link-text">《隐私政策》</span>
              </el-checkbox>
              <div v-if="regErrors.agreed" class="err-msg">{{ regErrors.agreed }}</div>
            </div>

            <el-button type="primary" size="large" :loading="regLoading" class="submit-btn" @click="handleRegister">
              立即注册
            </el-button>
            <div class="to-login-row">
              已有账号？<span class="link-text" @click="switchTab('login')">立即登录</span>
            </div>
          </el-form>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { login } = userStore
const userRole = userStore.userRole

// 检查是否可以回退（历史记录中是否有可回退的页面）
const canGoBack = computed(() => window.history.length > 2)

// 回退逻辑：优先回退，否则返回首页
const goBack = () => {
  if (window.history.length > 2) {
    router.back()
  } else {
    router.push('/')
  }
}

const activeTab = ref<'login' | 'register'>('login')
const rememberMe = ref(false)

// ── 登录 ──────────────────────────────────────────
const loginForm = reactive({ username: '', password: '' })
const loginErrors = reactive({ username: '', password: '' })
const loginLoading = ref(false)

// ── 快捷选择 ──────────────────────────────────────────
interface QuickUser {
  id: number
  username: string
  real_name: string
  role: string
}

const categories = [
  { role: 'patient', label: '患者', icon: '👤', color: '#43A047' },
  { role: 'doctor', label: '医生', icon: '🩺', color: '#1E88E5' },
  { role: 'pharmacist', label: '药剂师', icon: '💊', color: '#FB8C00' },
  { role: 'admin', label: '管理员', icon: '⚙️', color: '#8E24AA' },
]

const activeCategory = ref<string | null>(null)
const searchText = ref('')
const allUsers = ref<QuickUser[]>([])
const filteredUsers = ref<QuickUser[]>([])
const usersLoaded = ref(false)

const loadUsers = async () => {
  if (usersLoaded.value) return
  try {
    const res = await axios.get('/api/auth/users-by-role')
    allUsers.value = res.data.users || []
    usersLoaded.value = true
  } catch {
    // 静默降级，使用数据库真实用户数据作为后备
    allUsers.value = [
      { id: 1, username: 'admin', real_name: '管理员张三', role: 'admin' },
      { id: 9, username: '余以', real_name: '李四', role: 'admin' },
      { id: 2, username: 'doctor1', real_name: '张明华', role: 'doctor' },
      { id: 3, username: 'doctor2', real_name: '李秀英', role: 'doctor' },
      { id: 20, username: 'doctor3', real_name: '王建国', role: 'doctor' },
      { id: 21, username: 'doctor4', real_name: '陈玉芳', role: 'doctor' },
      { id: 22, username: 'doctor5', real_name: '刘志强', role: 'doctor' },
      { id: 23, username: 'doctor6', real_name: '赵晓燕', role: 'doctor' },
      { id: 24, username: 'doctor7', real_name: '孙伟', role: 'doctor' },
      { id: 25, username: 'doctor8', real_name: '周丽', role: 'doctor' },
      { id: 26, username: 'doctor9', real_name: '吴明', role: 'doctor' },
      { id: 27, username: 'doctor10', real_name: '郑军', role: 'doctor' },
      { id: 4, username: 'inpatient_doctor1', real_name: '黄婷', role: 'inpatient_doctor' },
      { id: 28, username: 'inpatient_doctor2', real_name: '李强', role: 'inpatient_doctor' },
      { id: 29, username: 'lab_doctor1', real_name: '检验科医师陈强', role: 'lab_doctor' },
      { id: 30, username: 'lab_doctor2', real_name: '检验科医师刘芳', role: 'lab_doctor' },
      { id: 31, username: 'radiologist1', real_name: '影像师王伟', role: 'radiologist' },
      { id: 32, username: 'radiologist2', real_name: '影像师赵琳', role: 'radiologist' },
      { id: 5, username: 'pharmacist1', real_name: '李萍萍', role: 'pharmacist' },
      { id: 6, username: 'patient', real_name: '赵伟', role: 'patient' },
      { id: 7, username: 'patient1', real_name: '李小红', role: 'patient' },
      { id: 8, username: 'patient2', real_name: '张大明', role: 'patient' },
    ]
    usersLoaded.value = true
  }
}

const getUserCount = (role: string) => {
  if (role === 'doctor') {
    const doctorRoles = ['doctor', 'inpatient_doctor', 'lab_doctor', 'radiologist']
    return allUsers.value.filter(u => doctorRoles.includes(u.role)).length
  }
  return allUsers.value.filter(u => u.role === role).length
}

const toggleCategory = (role: string) => {
  if (activeCategory.value === role) {
    activeCategory.value = null
    return
  }
  if (!usersLoaded.value) {
    loadUsers().then(() => showCategoryDropdown(role))
  } else {
    showCategoryDropdown(role)
  }
}

const showCategoryDropdown = (role: string) => {
  activeCategory.value = role
  searchText.value = ''
  filterUsers()
}

const filterUsers = () => {
  const role = activeCategory.value
  const keyword = searchText.value.trim().toLowerCase()
  // 医生类别包含所有医生子角色
  const doctorRoles = ['doctor', 'inpatient_doctor', 'lab_doctor', 'radiologist']
  let list: QuickUser[]
  if (role === 'doctor') {
    list = allUsers.value.filter(u => doctorRoles.includes(u.role))
  } else {
    list = allUsers.value.filter(u => u.role === role)
  }
  if (keyword) {
    list = list.filter(u =>
      u.username.toLowerCase().includes(keyword) ||
      u.real_name.toLowerCase().includes(keyword)
    )
  }
  filteredUsers.value = list
}

const selectUser = (user: QuickUser) => {
  loginForm.username = user.username
  loginForm.password = '123456'
  activeCategory.value = null
  searchText.value = ''
}

// 点击页面其他区域关闭下拉
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.quick-select-section')) {
    activeCategory.value = null
  }
}

const handleLogin = async () => {
  loginErrors.username = ''
  loginErrors.password = ''
  if (!loginForm.username) { loginErrors.username = '请输入用户名'; return }
  if (!loginForm.password) { loginErrors.password = '请输入密码'; return }
  loginLoading.value = true
  try {
    const result = await login(loginForm.username, loginForm.password)
    if (result.success) {
      const redirect = route.query.redirect as string
      const roleRouteMap: Record<string, string> = {
        patient: '/',
        doctor: '/doctor/outpatient',
        inpatient_doctor: '/doctor/inpatient',
        pharmacist: '/pharmacy',
        admin: '/admin',
      }
      
      // 获取上一页路径
      const referrer = document.referrer
      const fromAppointment = referrer && (
        referrer.includes('/appointment') || 
        referrer.includes('/dept') ||
        referrer.includes('/doctor') ||
        referrer.includes('/register')
      )
      
      // 判断目标路径
      let targetPath = ''
      if (userRole.value === 'patient') {
        // 患者：如果有 redirect 参数，使用 redirect；如果从挂号页面来的，回退到上一页
        if (redirect) {
          targetPath = redirect
        } else if (fromAppointment && window.history.length > 2) {
          router.back()
          return
        } else {
          targetPath = '/'
        }
      } else {
        // 其他角色（医生、药房、管理员）：直接跳转到工作台，忽略 redirect
        targetPath = roleRouteMap[userRole.value] || '/'
      }
      
      // 使用 replace 跳转，清除登录页的历史记录
      router.replace(targetPath)
    } else {
      loginErrors.password = result.error || '用户名或密码错误'
    }
  } finally {
    loginLoading.value = false
  }
}

const asVisitor = () => router.push('/')

// ── 注册 ──────────────────────────────────────────
const regForm = reactive({
  username: '', password: '', confirmPwd: '',
  real_name: '', phone: '', id_card: '',
  gender: '男', birth_date: '', agreed: false,
})
const regErrors = reactive({
  username: '', password: '', confirmPwd: '',
  real_name: '', phone: '', id_card: '', agreed: '',
})
const regLoading = ref(false)

const handleRegister = async () => {
  // 重置
  Object.keys(regErrors).forEach(k => (regErrors as any)[k] = '')

  let valid = true
  if (!regForm.username) { regErrors.username = '请输入用户名'; valid = false }
  else if (regForm.username.length < 4) { regErrors.username = '用户名至少4位'; valid = false }
  if (!regForm.password) { regErrors.password = '请输入密码'; valid = false }
  else if (regForm.password.length < 6) { regErrors.password = '密码至少6位'; valid = false }
  if (regForm.password !== regForm.confirmPwd) { regErrors.confirmPwd = '两次密码不一致'; valid = false }
  if (!regForm.real_name) { regErrors.real_name = '请输入真实姓名'; valid = false }
  if (!regForm.phone) { regErrors.phone = '请输入手机号'; valid = false }
  else if (!/^1[3-9]\d{9}$/.test(regForm.phone)) { regErrors.phone = '手机号格式不正确'; valid = false }
  if (regForm.id_card && !/^\d{17}[\dXx]$/.test(regForm.id_card)) {
    regErrors.id_card = '身份证格式不正确'; valid = false
  }
  if (!regForm.agreed) { regErrors.agreed = '请先阅读并同意用户协议'; valid = false }
  if (!valid) return

  regLoading.value = true
  try {
    await axios.post('/api/auth/register', {
      username: regForm.username,
      password: regForm.password,
      real_name: regForm.real_name,
      phone: regForm.phone,
      id_card: regForm.id_card,
      gender: regForm.gender,
      birth_date: regForm.birth_date,
    })
    ElMessage.success('注册成功，请登录')
    // 自动填入用户名，跳到登录
    loginForm.username = regForm.username
    loginForm.password = ''
    switchTab('login')
  } catch (e: any) {
    const msg = e?.response?.data?.detail || '注册失败，请稍后重试'
    if (msg.includes('用户名')) regErrors.username = msg
    else ElMessage.error(msg)
  } finally {
    regLoading.value = false
  }
}

const switchTab = (tab: 'login' | 'register') => {
  activeTab.value = tab
}

// 预加载用户列表 + 点击外部关闭
onMounted(() => {
  loadUsers()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  position: relative;
  z-index: 1;
}

.auth-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1A237E 0%, #1565C0 55%, #1E88E5 100%);
  z-index: -1;
}

.back-home {
  position: absolute;
  top: 20px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.15);
  transition: background .15s;
}
.back-home:hover { background: rgba(255,255,255,0.25); }
.auth-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 20px;
  padding: 36px 36px 28px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}

/* Logo */
.logo-section { text-align: center; margin-bottom: 24px; }
.logo-icon { font-size: 44px; margin-bottom: 6px; }
.logo-section h1 { font-size: 20px; color: #1565C0; font-weight: 700; margin: 0 0 4px; }
.logo-section p { font-size: 12px; color: #BDBDBD; margin: 0; }

/* Tab */
.tab-bar {
  position: relative;
  display: flex;
  border-bottom: 2px solid #E3E8F0;
  margin-bottom: 24px;
}
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 600;
  color: #9E9E9E;
  cursor: pointer;
  transition: color .2s;
}
.tab-btn.active { color: #1565C0; }
.tab-indicator {
  position: absolute;
  bottom: -2px;
  width: 50%;
  height: 2px;
  background: #1565C0;
  border-radius: 2px;
  transition: left .25s cubic-bezier(.4,0,.2,1);
}

/* 表单区 */
.login-actions { display: flex; gap: 10px; margin-top: 4px; }
.submit-btn { flex: 1; font-size: 15px; font-weight: 600; }
.visitor-btn { flex: 1; }

.extra-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -8px 0 12px;
  font-size: 13px;
}
.link-text { color: #1565C0; cursor: pointer; font-size: 13px; }
.link-text:hover { text-decoration: underline; }

.err-msg { font-size: 12px; color: #E53935; margin-top: 3px; }

/* 注册专属 */
.row-split { display: flex; gap: 10px; }
.agree-row { margin: 4px 0 14px; font-size: 13px; }
.to-login-row { text-align: center; margin-top: 14px; font-size: 13px; color: #757575; }

/* 快捷选择 */
.quick-select-section {
  margin-top: 20px;
  background: #F0F4FF;
  border-radius: 12px;
  padding: 14px;
  position: relative;
}

.quick-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.quick-select-title {
  font-size: 13px;
  font-weight: 600;
  color: #37474F;
}

.quick-select-tip {
  font-size: 11px;
  color: #90A4AE;
}

.category-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.category-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.category-btn.patient { border-color: #C8E6C9; }
.category-btn.doctor { border-color: #BBDEFB; }
.category-btn.pharmacist { border-color: #FFE0B2; }
.category-btn.admin { border-color: #E1BEE7; }

.category-btn.patient:hover,
.category-btn.patient.active { background: #E8F5E9; border-color: #43A047; box-shadow: 0 2px 12px rgba(67,160,71,0.2); }

.category-btn.doctor:hover,
.category-btn.doctor.active { background: #E3F2FD; border-color: #1E88E5; box-shadow: 0 2px 12px rgba(30,136,229,0.2); }

.category-btn.pharmacist:hover,
.category-btn.pharmacist.active { background: #FFF3E0; border-color: #FB8C00; box-shadow: 0 2px 12px rgba(251,140,0,0.2); }

.category-btn.admin:hover,
.category-btn.admin.active { background: #F3E5F5; border-color: #8E24AA; box-shadow: 0 2px 12px rgba(142,36,170,0.2); }

.cat-label { font-size: 12px; font-weight: 600; color: #424242; }
.cat-count {
  font-size: 10px;
  color: #9E9E9E;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 1px 6px;
  min-width: 18px;
  text-align: center;
}

/* 下拉面板 */
.dropdown-panel {
  position: absolute;
  left: 14px;
  right: 14px;
  top: calc(100% - 8px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  border: 1px solid #E0E0E0;
  z-index: 100;
  max-height: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dropdown-search {
  padding: 10px;
  border-bottom: 1px solid #F0F0F0;
  flex-shrink: 0;
}

.dropdown-list {
  overflow-y: auto;
  flex: 1;
  max-height: 220px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #FAFAFA;
}

.dropdown-item:hover { background: #F0F4FF; }
.dropdown-item.selected { background: #E8F5E9; }

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #E3F2FD;
  color: #1E88E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-account {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.check-icon { flex-shrink: 0; }

.dropdown-empty {
  padding: 24px;
  text-align: center;
  color: #BDBDBD;
  font-size: 13px;
}

/* 下拉动画 */
.dropdown-enter-active { transition: all 0.2s ease-out; }
.dropdown-leave-active { transition: all 0.15s ease-in; }
.dropdown-enter-from { opacity: 0; transform: translateY(-8px); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* 过渡动画 */
.slide-enter-active, .slide-leave-active { transition: all .2s ease; }
.slide-enter-from { opacity: 0; transform: translateX(20px); }
.slide-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
