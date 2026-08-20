<template>
  <div class="language-settings-page">
    <div class="page-header">
      <el-button @click="goBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </el-button>
      <h2>语言设置</h2>
      <div class="header-spacer"></div>
    </div>

    <div class="settings-content">
      <div class="language-section">
        <div class="section-header">
          <span style="font-size:20px">🌐</span>
          <span>选择语言</span>
        </div>
        
        <div class="language-grid">
          <div
            v-for="lang in languages"
            :key="lang.code"
            :class="['language-card', { active: currentLanguage === lang.code }]"
            @click="selectLanguage(lang.code)"
          >
            <div class="lang-flag">{{ lang.flag }}</div>
            <div class="lang-info">
              <div class="lang-name">{{ lang.name }}</div>
              <div class="lang-native">{{ lang.native }}</div>
            </div>
            <el-icon v-if="currentLanguage === lang.code" color="#1E88E5"><Check /></el-icon>
          </div>
        </div>

        <div class="language-tip">
          <el-icon color="#1E88E5"><InfoFilled /></el-icon>
          <span>切换语言后，系统将在下一次登录时生效</span>
        </div>
      </div>

      <div class="action-bar">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveLanguage">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, InfoFilled } from '@element-plus/icons-vue'
import axios from 'axios'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const { currentUser } = useUserStore()

const languages = [
  { code: 'zh-CN', name: '简体中文', native: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁体中文', native: '繁體中文', flag: '🇹🇼' },
  { code: 'en-US', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', native: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', native: '한국어', flag: '🇰🇷' },
  { code: 'fr-FR', name: 'Français', native: 'Français', flag: '🇫🇷' },
]

const currentLanguage = ref('zh-CN')
const saving = ref(false)

onMounted(() => {
  const savedLang = localStorage.getItem('app_language')
  if (savedLang) {
    currentLanguage.value = savedLang
  }
})

const selectLanguage = (code: string) => {
  currentLanguage.value = code
}

const saveLanguage = async () => {
  saving.value = true
  try {
    localStorage.setItem('app_language', currentLanguage.value)
    
    if (currentUser.value) {
      await axios.put('/api/user/language', {
        userId: currentUser.value.id,
        language: currentLanguage.value
      })
    }
    
    ElMessage.success('语言设置已保存')
    goBack()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.language-settings-page {
  min-height: 100vh;
  background: #F0F4FF;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-spacer {
  width: 80px;
}

.settings-content {
  max-width: 600px;
  margin: 24px auto;
  padding: 0 24px;
}

.language-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.language-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.language-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid #F0F0F0;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #FAFAFA;
}

.language-card:hover {
  border-color: #D9D9D9;
  background: #FFFFFF;
}

.language-card.active {
  border-color: #1E88E5;
  background: #F5F9FF;
}

.lang-flag {
  font-size: 32px;
}

.lang-info {
  flex: 1;
}

.lang-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.lang-native {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.language-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 12px 16px;
  background: #F5F9FF;
  border-radius: 8px;
  font-size: 13px;
  color: #606266;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding: 16px 24px;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

.action-bar .el-button {
  padding: 10px 28px;
  font-size: 14px;
}
</style>