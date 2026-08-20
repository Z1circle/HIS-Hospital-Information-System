<template>
  <div class="register-page">
    <div class="register-container">
      <div class="logo-section">
        <h1>用户注册</h1>
        <p>创建您的HIS系统账号</p>
      </div>
      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-item">
          <label>用户名</label>
          <input type="text" v-model="form.username" placeholder="请输入用户名" />
          <span v-if="errors.username" class="error">{{ errors.username }}</span>
        </div>
        <div class="form-item">
          <label>密码</label>
          <input type="password" v-model="form.password" placeholder="请输入密码" />
          <span v-if="errors.password" class="error">{{ errors.password }}</span>
        </div>
        <div class="form-item">
          <label>确认密码</label>
          <input type="password" v-model="form.confirmPassword" placeholder="请再次输入密码" />
          <span v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</span>
        </div>
        <div class="form-item">
          <label>真实姓名</label>
          <input type="text" v-model="form.name" placeholder="请输入真实姓名" />
          <span v-if="errors.name" class="error">{{ errors.name }}</span>
        </div>
        <div class="form-item">
          <label>身份证号</label>
          <input type="text" v-model="form.idCard" placeholder="请输入18位身份证号" />
          <span v-if="errors.idCard" class="error">{{ errors.idCard }}</span>
        </div>
        <div class="form-item">
          <label>手机号</label>
          <input type="text" v-model="form.phone" placeholder="请输入11位手机号" />
          <span v-if="errors.phone" class="error">{{ errors.phone }}</span>
        </div>
        <button type="submit" class="register-btn">注册</button>
        <div class="form-links">
          <span @click="goToLogin" class="link">已有账号，去登录</span>
        </div>
      </form>
    </div>
  </div>
</template>
<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { validatePhone, validateIdCard, validateUsername, validatePassword, validateName } from '@/utils/validation'

const router = useRouter()
const { register } = useUserStore()

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  idCard: '',
  phone: ''
})

const errors = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  idCard: '',
  phone: ''
})

const handleRegister = async () => {
  clearErrors()
  
  if (!validateForm()) {
    return
  }
  
  const success = await register({
    username: form.username,
    password: form.password,
    name: form.name,
    role: 'patient',
    phone: form.phone,
    idCard: form.idCard,
    avatar: form.name.charAt(0)
  })
  
  if (success) {
    alert('注册成功')
    router.push('/')
  } else {
    errors.username = '用户名已存在'
  }
}

const clearErrors = () => {
  errors.username = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.name = ''
  errors.idCard = ''
  errors.phone = ''
}

const validateForm = () => {
  let isValid = true
  
  if (!form.username) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (!validateUsername(form.username)) {
    errors.username = '用户名必须是3-20位字母、数字或下划线'
    isValid = false
  }
  
  if (!form.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (!validatePassword(form.password)) {
    errors.password = '密码必须是6-20位'
    isValid = false
  }
  
  if (!form.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  if (!form.name) {
    errors.name = '请输入真实姓名'
    isValid = false
  } else if (!validateName(form.name)) {
    errors.name = '请输入有效的中文姓名'
    isValid = false
  }
  
  if (!form.idCard) {
    errors.idCard = '请输入身份证号'
    isValid = false
  } else if (!validateIdCard(form.idCard)) {
    errors.idCard = '请输入有效的18位身份证号'
    isValid = false
  }
  
  if (!form.phone) {
    errors.phone = '请输入手机号'
    isValid = false
  } else if (!validatePhone(form.phone)) {
    errors.phone = '请输入有效的11位手机号'
    isValid = false
  }
  
  return isValid
}

const goToLogin = () => {
  router.push('/login')
}
</script>
<style scoped>
.register-page { min-height: 100vh; background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); display: flex; align-items: center; justify-content: center; padding: 20px; }
.register-container { width: 100%; max-width: 400px; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
.logo-section { text-align: center; margin-bottom: 24px; }
.logo-section h1 { font-size: 22px; color: #8B4513; margin: 0 0 8px 0; }
.logo-section p { font-size: 14px; color: #999; margin: 0; }
.register-form { display: flex; flex-direction: column; gap: 16px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item label { font-size: 14px; font-weight: bold; color: #333; }
.form-item input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.form-item input:focus { border-color: #D2691E; }
.error { font-size: 12px; color: #f44336; }
.register-btn { background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%); color: white; border: none; padding: 16px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
.form-links { text-align: center; margin-top: 8px; }
.link { font-size: 14px; color: #D2691E; cursor: pointer; }
</style>