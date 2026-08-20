<template>
  <div class="settings-page">
    <header class="page-header">
      <div class="back-btn" @click="goBack">←</div>
      <div class="header-bg"></div>
      <h1 class="page-title">{{ currentLang === 'zh' ? '设置' : 'Settings' }}</h1>
    </header>

    <div class="settings-content">
      <div class="section">
        <h2 class="section-title">{{ currentLang === 'zh' ? '语言设置' : 'Language' }}</h2>
        <div class="language-options">
          <div 
            :class="['lang-option', currentLang === 'zh' ? 'active' : '']" 
            @click="changeLang('zh')"
          >
            <span class="lang-flag"></span>
            <span class="lang-name">中文</span>
            <div v-if="currentLang === 'zh'" class="check-mark"></div>
          </div>
          <div 
            :class="['lang-option', currentLang === 'en' ? 'active' : '']" 
            @click="changeLang('en')"
          >
            <span class="lang-flag"></span>
            <span class="lang-name">English</span>
            <div v-if="currentLang === 'en'" class="check-mark"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">{{ currentLang === 'zh' ? '账户设置' : 'Account' }}</h2>
        <div class="setting-item" @click="handleEditProfile">
          <span class="item-icon"></span>
          <span class="item-text">{{ currentLang === 'zh' ? '编辑个人资料' : 'Edit Profile' }}</span>
          <span class="item-arrow"></span>
        </div>
        <div class="setting-item" @click="handleChangePassword">
          <span class="item-icon"></span>
          <span class="item-text">{{ currentLang === 'zh' ? '修改密码' : 'Change Password' }}</span>
          <span class="item-arrow"></span>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">{{ currentLang === 'zh' ? '通知设置' : 'Notifications' }}</h2>
        <div class="setting-item">
          <span class="item-icon"></span>
          <span class="item-text">{{ currentLang === 'zh' ? '消息通知' : 'Message Notifications' }}</span>
          <div class="toggle" :class="{ active: messageNotifications }" @click="messageNotifications = !messageNotifications"></div>
        </div>
        <div class="setting-item">
          <span class="item-icon"></span>
          <span class="item-text">{{ currentLang === 'zh' ? '预约提醒' : 'Appointment Reminders' }}</span>
          <div class="toggle" :class="{ active: appointmentReminders }" @click="appointmentReminders = !appointmentReminders"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentLang = ref('zh')
const messageNotifications = ref(true)
const appointmentReminders = ref(true)

const goBack = () => {
  router.back()
}

const changeLang = (lang: string) => {
  currentLang.value = lang
  alert(lang === 'zh' ? '语言已切换为中文' : 'Language changed to English')
}

const handleEditProfile = () => {
  alert(currentLang.value === 'zh' ? '编辑个人资料功能开发中' : 'Edit profile feature coming soon')
}

const handleChangePassword = () => {
  alert(currentLang.value === 'zh' ? '修改密码功能开发中' : 'Change password feature coming soon')
}
</script>
<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  position: relative;
  padding: 40px 16px 20px;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 24px;
  color: white;
  cursor: pointer;
  z-index: 2;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, #8B4513 0%, #D2691E 100%);
}

.page-title {
  position: relative;
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  z-index: 1;
}

.settings-content {
  padding: 16px;
  margin-top: -10px;
}

.section {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.section-title {
  font-size: 12px;
  color: #999;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #D2691E;
}

.language-options {
  display: flex;
  gap: 12px;
}

.lang-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-option:hover {
  border-color: #D2691E;
}

.lang-option.active {
  border-color: #D2691E;
  background: #fffaf0;
}

.lang-flag {
  font-size: 24px;
}

.lang-name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.check-mark {
  width: 20px;
  height: 20px;
  background: #D2691E;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.setting-item:last-child {
  border-bottom: none;
}

.item-icon {
  font-size: 20px;
}

.item-text {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.item-arrow {
  font-size: 20px;
  color: #999;
}

.toggle {
  width: 44px;
  height: 24px;
  background: #ddd;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: left 0.2s;
}

.toggle.active {
  background: #D2691E;
}

.toggle.active::after {
  left: 22px;
}
</style>
