<template>
  <div class="profile-page">
    <div class="profile-layout">
      <div class="profile-sidebar glass-card">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <el-avatar :size="100" :src="userInfo.avatar">
              <el-icon :size="50"><User /></el-icon>
            </el-avatar>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display:none"
              @change="handleAvatarChange"
            />
            <el-button size="small" circle icon="Camera" class="avatar-edit-btn" @click="triggerAvatarUpload" />
          </div>
          <h3 class="user-name">{{ userInfo.real_name }}</h3>
          <p class="user-role">{{ userInfo.role }}</p>
        </div>

        <div class="info-list">
          <div class="info-item">
            <span class="label">工号:</span>
            <span class="value">{{ userInfo.employee_id }}</span>
          </div>
          <div class="info-item">
            <span class="label">部门:</span>
            <span class="value">{{ userInfo.department }}</span>
          </div>
          <div class="info-item">
            <span class="label">入职日期:</span>
            <span class="value">{{ userInfo.join_date }}</span>
          </div>
          <div class="info-item">
            <span class="label">最后登录:</span>
            <span class="value">{{ userInfo.last_login }}</span>
          </div>
        </div>
      </div>

      <div class="profile-content">
        <el-tabs v-model="activeTab" class="profile-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <div class="tab-content glass-card">
              <el-form :model="basicForm" label-width="120px">
                <el-form-item label="真实姓名">
                  <el-input v-model="basicForm.real_name" placeholder="请输入真实姓名" />
                </el-form-item>
                <el-form-item label="性别">
                  <el-radio-group v-model="basicForm.gender">
                    <el-radio value="male">男</el-radio>
                    <el-radio value="female">女</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="出生日期">
                  <el-date-picker
                    v-model="basicForm.birthday"
                    type="date"
                    placeholder="选择日期"
                    style="width: 100%"
                  />
                </el-form-item>
                <el-form-item label="联系电话">
                  <el-input v-model="basicForm.phone" placeholder="请输入联系电话" />
                </el-form-item>
                <el-form-item label="邮箱">
                  <el-input v-model="basicForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveBasicInfo">保存修改</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <el-tab-pane label="修改密码" name="password">
            <div class="tab-content glass-card">
              <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="120px">
                <el-form-item label="原密码" prop="old_password">
                  <el-input
                    v-model="passwordForm.old_password"
                    type="password"
                    show-password
                    placeholder="请输入原密码"
                  />
                </el-form-item>
                <el-form-item label="新密码" prop="new_password">
                  <el-input
                    v-model="passwordForm.new_password"
                    type="password"
                    show-password
                    placeholder="请输入新密码（至少6位）"
                  />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirm_password">
                  <el-input
                    v-model="passwordForm.confirm_password"
                    type="password"
                    show-password
                    placeholder="请再次输入新密码"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="changePassword">修改密码</el-button>
                  <el-button @click="resetPasswordForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <el-tab-pane label="绑定手机" name="phone">
            <div class="tab-content glass-card">
              <div class="bind-section">
                <div v-if="userInfo.phone" class="current-bind">
                  <div class="bind-info">
                    <el-icon :size="40" color="#68D391"><CircleCheck /></el-icon>
                    <div>
                      <h4>已绑定手机</h4>
                      <p>{{ maskPhone(userInfo.phone) }}</p>
                    </div>
                  </div>
                  <el-button type="danger" plain @click="unbindPhone">解绑</el-button>
                </div>
                <div v-else class="bind-form">
                  <el-form :model="phoneForm" :rules="phoneRules" ref="phoneFormRef" label-width="100px">
                    <el-form-item label="手机号" prop="phone">
                      <el-input v-model="phoneForm.phone" placeholder="请输入手机号" />
                    </el-form-item>
                    <el-form-item label="验证码" prop="code">
                      <div style="display: flex; gap: 10px; width: 100%">
                        <el-input v-model="phoneForm.code" placeholder="请输入验证码" />
                        <el-button
                          :disabled="phoneCountdown > 0"
                          @click="sendPhoneCode"
                        >
                          {{ phoneCountdown > 0 ? `${phoneCountdown}s` : '发送验证码' }}
                        </el-button>
                      </div>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="bindPhone">绑定手机</el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="绑定邮箱" name="email">
            <div class="tab-content glass-card">
              <div class="bind-section">
                <div v-if="userInfo.email" class="current-bind">
                  <div class="bind-info">
                    <el-icon :size="40" color="#68D391"><CircleCheck /></el-icon>
                    <div>
                      <h4>已绑定邮箱</h4>
                      <p>{{ maskEmail(userInfo.email) }}</p>
                    </div>
                  </div>
                  <el-button type="danger" plain @click="unbindEmail">解绑</el-button>
                </div>
                <div v-else class="bind-form">
                  <el-form :model="emailForm" :rules="emailRules" ref="emailFormRef" label-width="100px">
                    <el-form-item label="邮箱地址" prop="email">
                      <el-input v-model="emailForm.email" placeholder="请输入邮箱地址" />
                    </el-form-item>
                    <el-form-item label="验证码" prop="code">
                      <div style="display: flex; gap: 10px; width: 100%">
                        <el-input v-model="emailForm.code" placeholder="请输入验证码" />
                        <el-button
                          :disabled="emailCountdown > 0"
                          @click="sendEmailCode"
                        >
                          {{ emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码' }}
                        </el-button>
                      </div>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="bindEmail">绑定邮箱</el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, CircleCheck } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const activeTab = ref('basic')
const avatarInputRef = ref<HTMLInputElement>()

const triggerAvatarUpload = () => {
  avatarInputRef.value?.click()
}

const handleAvatarChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const avatarData = e.target?.result as string
    userInfo.value.avatar = avatarData
    // Save to localStorage so it persists across logins
    const userId = (userStore.currentUser as any)?.id || 'default'
    localStorage.setItem('user_avatar_' + userId, avatarData)
    // Update current user in store
    if (userStore.currentUser) {
      (userStore.currentUser as any).avatar = avatarData
    }
    ElMessage.success('头像更新成功')
    // Also save to backend if available
    try {
      import('axios').then(({ default: axios }) => {
        axios.put('/api/user/avatar', { avatar: avatarData })
      })
    } catch { /* ignore */ }
  }
  reader.readAsDataURL(file)
  // Reset input so same file can be re-selected
  input.value = ''
}

const userInfo = ref({
  avatar: '',
  real_name: userStore.currentUser.value?.real_name || '张三',
  role: '系统管理员',
  employee_id: 'EMP001',
  department: '信息科',
  join_date: '2020-03-15',
  last_login: '2026-06-18 14:30:00',
  phone: '138****8888',
  email: 'admin@hospital.com'
})

const basicForm = reactive({
  real_name: userInfo.value.real_name,
  gender: 'male',
  birthday: '',
  phone: '',
  email: userInfo.value.email
})

const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const passwordRules = {
  old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== passwordForm.new_password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const passwordFormRef = ref()

const phoneForm = reactive({
  phone: '',
  code: ''
})

const phoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const phoneFormRef = ref()
const phoneCountdown = ref(0)

const emailForm = reactive({
  email: '',
  code: ''
})

const emailRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const emailFormRef = ref()
const emailCountdown = ref(0)

const maskPhone = (phone: string) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@')
  const maskedName = name.substring(0, 2) + '***' + name.substring(name.length - 1)
  return maskedName + '@' + domain
}

const saveBasicInfo = () => {
  ElMessage.success('基本信息保存成功')
}

const changePassword = () => {
  passwordFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      ElMessage.success('密码修改成功，请重新登录')
      setTimeout(() => {
        userStore.logout()
        window.location.href = '/login'
      }, 1500)
    }
  })
}

const resetPasswordForm = () => {
  passwordFormRef.value?.resetFields()
}

const sendPhoneCode = () => {
  phoneFormRef.value?.validateField('phone', (valid: boolean) => {
    if (valid) {
      ElMessage.success('验证码已发送')
      phoneCountdown.value = 60
      const timer = setInterval(() => {
        phoneCountdown.value--
        if (phoneCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
  })
}

const bindPhone = () => {
  phoneFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      ElMessage.success('手机绑定成功')
      userInfo.value.phone = phoneForm.phone
      phoneFormRef.value?.resetFields()
    }
  })
}

const unbindPhone = () => {
  ElMessage.success('手机解绑成功')
  userInfo.value.phone = ''
}

const sendEmailCode = () => {
  emailFormRef.value?.validateField('email', (valid: boolean) => {
    if (valid) {
      ElMessage.success('验证码已发送')
      emailCountdown.value = 60
      const timer = setInterval(() => {
        emailCountdown.value--
        if (emailCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
  })
}

const bindEmail = () => {
  emailFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      ElMessage.success('邮箱绑定成功')
      userInfo.value.email = emailForm.email
      emailFormRef.value?.resetFields()
    }
  })
}

const unbindEmail = () => {
  ElMessage.success('邮箱解绑成功')
  userInfo.value.email = ''
}

// Load saved avatar on mount
onMounted(() => {
  const userId = (userStore.currentUser as any)?.id || 'default'
  const savedAvatar = localStorage.getItem('user_avatar_' + userId)
  if (savedAvatar) {
    userInfo.value.avatar = savedAvatar
    if (userStore.currentUser) {
      (userStore.currentUser as any).avatar = savedAvatar
    }
  }
})
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 28px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.2);
}

.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.avatar-wrapper {
  position: relative;
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

.user-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
}

.user-role {
  margin: 0;
  font-size: 14px;
  color: #4299E1;
  padding: 4px 12px;
  background: rgba(66, 153, 225, 0.1);
  border-radius: 12px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 10px;
}

.info-item .label {
  font-size: 13px;
  color: #64748B;
}

.info-item .value {
  font-size: 14px;
  color: #1E293B;
  font-weight: 500;
}

.profile-tabs {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  color: #64748B;
  font-size: 14px;
  font-weight: 500;
  padding: 0 24px;
  height: 40px;
  line-height: 40px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  color: #4299E1;
  background: rgba(66, 153, 225, 0.05);
}

:deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: white;
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

.tab-content {
  min-height: 400px;
}

.bind-section {
  padding: 40px 0;
}

.current-bind {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  background: rgba(72, 187, 120, 0.08);
  border: 1px solid rgba(72, 187, 120, 0.2);
  border-radius: 16px;
}

.bind-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.bind-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1E293B;
}

.bind-info p {
  margin: 0;
  font-size: 14px;
  color: #64748B;
}

.bind-form {
  max-width: 500px;
  margin: 0 auto;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-input__wrapper) {
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: none;
  border-radius: 8px;
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(66, 153, 225, 0.3);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.1);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #4299E1;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.15);
}

:deep(.el-input__inner) {
  color: #1E293B;
}

:deep(.el-input__placeholder) {
  color: #94A3B8;
}

:deep(.el-radio__label) {
  color: #4A5568;
}

:deep(.el-radio__inner) {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(66, 153, 225, 0.2);
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #4299E1;
  border-color: #4299E1;
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
  transform: translateY(-1px);
}

:deep(.el-button--danger) {
  border-radius: 8px;
  background: linear-gradient(135deg, #FC8181 0%, #F56565 100%);
  border: none;
}

:deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #FC8181 0%, #F56565 100%);
  box-shadow: 0 4px 15px rgba(245, 101, 101, 0.4);
}
</style>