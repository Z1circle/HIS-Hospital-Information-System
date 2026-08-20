<template>
  <div class="home-page">
    <header class="header">
      <div class="header-top">
        <div class="hospital-info">
          <img src="https://neeko-copilot.bytedance.net/api/text2image?prompt=traditional%20chinese%20medicine%20hospital%20logo%20red%20color%20elegant&image_size=square" 
               alt="医院logo" class="logo" />
          <div class="hospital-text">
            <h1>HIS系统</h1>
            <p>医院信息管理系统</p>
          </div>
        </div>
        <div class="search-box">
          <input type="text" v-model="searchText" placeholder="搜索" class="search-input" />
          <button class="search-btn">搜索</button>
        </div>
        <div v-if="isLoggedIn" class="header-actions">
          <button class="logout-btn" @click="showLogoutDialog = true">退出</button>
        </div>
      </div>
      <div class="banner">
        <div class="banner-content">
          <p class="banner-title">HIS智慧医疗系统</p>
          <p class="banner-subtitle">智慧医疗 · 便捷服务</p>
        </div>
      </div>
    </header>

    <div class="quick-actions">
      <div class="action-item" @click="handleRegister">
        <div class="action-icon register-icon">
          <span class="icon-text">+</span>
        </div>
        <span>预约挂号</span>
      </div>
      <div class="action-item" @click="handlePayment">
        <div class="action-icon payment-icon">
          <span class="icon-text">$</span>
        </div>
        <span>门诊缴费</span>
      </div>
      <div class="action-item" @click="goTo('/report')">
        <div class="action-icon report-icon">
          <span class="icon-text"></span>
        </div>
        <span>报告查询</span>
      </div>
      <div class="action-item" @click="goTo('/profile')">
        <div class="action-icon profile-icon">
          <span class="icon-text">👤</span>
        </div>
        <span>个人中心</span>
      </div>
    </div>

    <div class="notice-section">
      <div class="notice-tabs">
        <span :class="['tab', activeTab === 'notice' ? 'active' : '']" @click="activeTab = 'notice'">通知公告</span>
        <span :class="['tab', activeTab === 'qa' ? 'active' : '']" @click="activeTab = 'qa'">互联网医院问答</span>
      </div>
      <div class="notice-date">2026-06-05</div>
    </div>

    <div class="services-section">
      <div class="services-tabs">
        <span :class="['service-tab', activeServiceTab === 'outpatient' ? 'active' : '']" 
              @click="activeServiceTab = 'outpatient'">门诊</span>
        <span :class="['service-tab', activeServiceTab === 'hospital' ? 'active' : '']" 
              @click="activeServiceTab = 'hospital'">住院</span>
        <span :class="['service-tab', activeServiceTab === 'convenience' ? 'active' : '']" 
              @click="activeServiceTab = 'convenience'">便民</span>
        <span class="more-link" @click="showAllServices = true">更多</span>
      </div>
      <div class="services-grid">
        <div class="service-item" v-for="service in currentServices" :key="service.name" @click="handleServiceClick(service)">
          <div :class="['service-icon', service.iconClass]">
            <span>{{ service.icon }}</span>
          </div>
          <span>{{ service.name }}</span>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showAllServices" @click="showAllServices = false">
      <div class="modal-content services-modal" @click.stop>
        <div class="modal-header">
          <h3>全部功能</h3>
          <span class="modal-close" @click="showAllServices = false">×</span>
        </div>
        <div class="modal-body">
          <div v-for="(services, key) in allServices" :key="key" class="service-group">
            <h4>{{ key === 'outpatient' ? '门诊服务' : key === 'hospital' ? '住院服务' : '便民服务' }}</h4>
            <div class="service-grid">
              <div class="service-item-large" v-for="service in services" :key="service.name" @click="handleServiceClick(service)">
                <div :class="['service-icon', service.iconClass]">
                  <span>{{ service.icon }}</span>
                </div>
                <span>{{ service.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-item active" @click="goTo('/')">
        <div class="footer-icon home-icon"></div>
        <span>首页</span>
      </div>
      <div class="footer-item" @click="goTo('/queue')">
        <div class="footer-icon message-icon"></div>
        <span>消息</span>
      </div>
      <div v-if="isLoggedIn" class="footer-item center" @click="goTo('/register')">
        <div class="footer-icon card-icon"></div>
        <span>电子就诊卡</span>
      </div>
      <div class="footer-item" @click="goTo('/report')">
        <div class="footer-icon calendar-icon"></div>
        <span>日程</span>
      </div>
      <div class="footer-item" @click="goTo('/profile')">
        <div class="footer-icon user-icon"></div>
        <span>个人</span>
      </div>
    </footer>

    <div class="modal-overlay" v-if="showPaymentModal" @click="showPaymentModal = false">
      <div class="modal-content payment-modal" @click.stop>
        <div class="modal-header">
          <h3>门诊缴费</h3>
          <span class="modal-close" @click="showPaymentModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="payment-form">
            <div class="form-item">
              <label>就诊卡号</label>
              <input type="text" v-model="paymentForm.cardNo" placeholder="请输入就诊卡号" />
            </div>
            <div class="form-item">
              <label>缴费金额</label>
              <input type="number" v-model="paymentForm.amount" placeholder="请输入缴费金额" />
            </div>
            <div class="form-item">
              <label>支付方式</label>
              <div class="payment-methods">
                <div :class="['method-item', paymentForm.method === 'wechat' ? 'active' : '']" 
                     @click="paymentForm.method = 'wechat'">
                  <span class="method-icon">💚</span>
                  <span>微信支付</span>
                </div>
                <div :class="['method-item', paymentForm.method === 'alipay' ? 'active' : '']" 
                     @click="paymentForm.method = 'alipay'">
                  <span class="method-icon">💙</span>
                  <span>支付宝</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showPaymentModal = false">取消</button>
          <button class="modal-btn submit" @click="submitPayment">确认缴费</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showPaymentSuccess" @click="showPaymentSuccess = false">
      <div class="modal-content success-modal" @click.stop>
        <div class="success-icon">✓</div>
        <h3>缴费成功</h3>
        <p>缴费金额: ¥{{ paymentForm.amount }}</p>
        <button class="modal-btn submit" @click="closePaymentSuccess">确定</button>
      </div>
    </div>

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

    <!-- 登录提示弹窗 -->
    <el-dialog
      v-model="showLoginGuide"
      title=""
      :show-close="false"
      width="320px"
      align-center
      :close-on-click-modal="false"
    >
      <div class="login-guide-body">
        <el-icon :size="40" color="#D2691E"><Lock /></el-icon>
        <h3>请先登录</h3>
        <p>登录后可使用报告查询、门诊缴费等功能</p>
      </div>
      <template #footer>
        <el-button @click="showLoginGuide = false">暂不登录</el-button>
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { SwitchButton, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const isLoggedIn = userStore.isLoggedIn
const searchText = ref('')
const activeTab = ref('notice')
const activeServiceTab = ref('outpatient')

const showLogoutDialog = ref(false)
const showLoginGuide = ref(false)
const pendingPath = ref('')

const showAllServices = ref(false)

const allServices = {
  outpatient: [
    { name: '门诊报到', icon: '', iconClass: 'report-icon', path: '/register', action: 'register' },
    { name: '报告查询', icon: '', iconClass: 'report-icon', path: '/report', action: 'report' },
    { name: '门诊病历', icon: '', iconClass: 'record-icon', path: '/profile', action: 'record' },
    { name: '预约缴费', icon: '', iconClass: 'payment-icon', path: '/register', action: 'payment' },
    { name: '费用清单', icon: '', iconClass: 'bill-icon', path: '/profile', action: 'bill' },
    { name: '门诊预约', icon: '', iconClass: 'register-icon', path: '/register', action: 'booking' },
    { name: '检查预约', icon: '', iconClass: 'check-icon', path: '/register', action: 'check' },
    { name: '检验预约', icon: '', iconClass: 'lab-icon', path: '/register', action: 'lab' }
  ],
  hospital: [
    { name: '住院查询', icon: '', iconClass: 'hospital-icon', path: '/profile', action: 'hospitalQuery' },
    { name: '住院费用', icon: '', iconClass: 'bill-icon', path: '/profile', action: 'hospitalBill' },
    { name: '住院清单', icon: '', iconClass: 'record-icon', path: '/profile', action: 'hospitalList' },
    { name: '出院办理', icon: '', iconClass: 'discharge-icon', path: '/profile', action: 'discharge' },
    { name: '床位查询', icon: '', iconClass: 'bed-icon', path: '/profile', action: 'bedQuery' },
    { name: '探视预约', icon: '', iconClass: 'visit-icon', path: '/profile', action: 'visit' },
    { name: '住院病历', icon: '', iconClass: 'record-icon', path: '/profile', action: 'hospitalRecord' },
    { name: '转科申请', icon: '', iconClass: 'transfer-icon', path: '/profile', action: 'transfer' }
  ],
  convenience: [
    { name: '健康体检', icon: '', iconClass: 'check-icon', path: '/register', action: 'checkup' },
    { name: '疫苗接种', icon: '', iconClass: 'vaccine-icon', path: '/register', action: 'vaccine' },
    { name: '慢病管理', icon: '', iconClass: 'chronic-icon', path: '/profile', action: 'chronic' },
    { name: '健康教育', icon: '', iconClass: 'edu-icon', path: '/profile', action: 'education' },
    { name: '健康评估', icon: '', iconClass: 'health-icon', path: '/profile', action: 'health' },
    { name: '家庭医生', icon: '', iconClass: 'family-icon', path: '/profile', action: 'family' },
    { name: '用药指导', icon: '', iconClass: 'medicine-icon', path: '/pharmacy', action: 'medicine' },
    { name: '体检报告', icon: '', iconClass: 'report-icon', path: '/report', action: 'checkupReport' }
  ]
}

const currentServices = computed(() => {
  return allServices[activeServiceTab.value as keyof typeof allServices].slice(0, 8)
})

const goTo = (path: string) => {
  if (!isLoggedIn) {
    pendingPath.value = path
    showLoginGuide.value = true
    return
  }
  router.push(path)
}

const goLogin = () => {
  showLoginGuide.value = false
  router.push(pendingPath.value ? `/login?redirect=${pendingPath.value}` : '/login')
}

const showPaymentModal = ref(false)
const showPaymentSuccess = ref(false)

const handleRegister = () => {
  if (!isLoggedIn) {
    pendingPath.value = '/register'
    showLoginGuide.value = true
    return
  }
  router.push('/register')
}

const handlePayment = () => {
  if (!isLoggedIn) {
    pendingPath.value = '/payment'
    showLoginGuide.value = true
    return
  }
  showPaymentModal.value = true
}

const paymentForm = ref({
  cardNo: '',
  amount: '',
  method: 'wechat'
})

const submitPayment = () => {
  if (!paymentForm.value.cardNo) {
    ElMessage.warning('请输入就诊卡号')
    return
  }
  if (!paymentForm.value.amount || parseFloat(paymentForm.value.amount) <= 0) {
    ElMessage.warning('请输入有效的缴费金额')
    return
  }
  showPaymentModal.value = false
  showPaymentSuccess.value = true
}

const closePaymentSuccess = () => {
  showPaymentSuccess.value = false
  paymentForm.value = {
    cardNo: '',
    amount: '',
    method: 'wechat'
  }
}

const handleServiceClick = (service: { name: string; path: string; action: string }) => {
  if (service.path) {
    if (!isLoggedIn) {
      pendingPath.value = service.path
      showLoginGuide.value = true
      return
    }
    router.push(service.path)
  }
}

const handleLogout = () => {
  showLogoutDialog.value = false
  userStore.logout()
  router.push('/')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}

.header {
  background: linear-gradient(180deg, #8B4513 0%, #D2691E 100%);
  padding: 16px;
  color: white;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hospital-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.hospital-text h1 {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.hospital-text p {
  font-size: 12px;
  margin: 2px 0 0 0;
  opacity: 0.9;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 4px 8px;
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  width: 80px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-btn {
  background: #D2691E;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.banner {
  margin-top: 16px;
  background: url(https://neeko-copilot.bytedance.net/api/text2image?prompt=traditional%20chinese%20medicine%20background%20elegant%20mountains%20bamboo&image_size=landscape_16_9) no-repeat center;
  background-size: cover;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(139, 69, 19, 0.7);
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
}

.banner-subtitle {
  font-size: 20px;
  font-weight: bold;
  margin: 8px 0 0 0;
}

.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: 20px 16px;
  background: white;
  margin: -10px 16px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.action-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.register-icon {
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  color: white;
}

.payment-icon {
  background: linear-gradient(135deg, #CD853F 0%, #8B4513 100%);
  color: white;
}

.follow-icon {
  background: linear-gradient(135deg, #BC8F8F 0%, #8B4513 100%);
  color: white;
}

.consult-icon {
  background: linear-gradient(135deg, #DEB887 0%, #8B4513 100%);
  color: white;
}

.icon-text {
  font-weight: bold;
}

.action-item span {
  font-size: 12px;
  color: #333;
}

.notice-section {
  background: white;
  margin: 0 16px 16px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.notice-tabs {
  display: flex;
  gap: 24px;
}

.tab {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #8B4513;
  border-bottom-color: #8B4513;
  font-weight: bold;
}

.notice-date {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.services-section {
  background: white;
  margin: 0 16px 16px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.services-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.service-tab {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
}

.service-tab.active {
  color: #8B4513;
  border-bottom-color: #8B4513;
  font-weight: bold;
}

.more-link {
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.service-icon {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.report-icon {
  background: linear-gradient(135deg, #D2691E 0%, #A0522D 100%);
}

.queue-icon {
  background: linear-gradient(135deg, #CD853F 0%, #8B4513 100%);
}

.record-icon {
  background: linear-gradient(135deg, #BC8F8F 0%, #8B4513 100%);
}

.decoct-icon {
  background: linear-gradient(135deg, #F4A460 0%, #D2691E 100%);
}

.bill-icon {
  background: linear-gradient(135deg, #DEB887 0%, #BC8F8F 100%);
}

.add-icon {
  background: linear-gradient(135deg, #FAEBD7 0%, #DEB887 100%);
  color: #8B4513;
}

.service-item span {
  font-size: 11px;
  color: #333;
  text-align: center;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  justify-content: space-around;
  padding: 8px 0 16px;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  flex: 1;
}

.footer-item.center {
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  position: relative;
  top: -15px;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
}

.footer-item.center span {
  color: white;
  font-size: 10px;
}

.footer-icon {
  font-size: 20px;
  color: #999;
}

.footer-item.active .footer-icon {
  color: #8B4513;
}

.footer-item.center .footer-icon {
  color: white;
}

.footer-item span {
  font-size: 11px;
  color: #666;
}

.footer-item.active span {
  color: #8B4513;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.modal-close {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.submit {
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  color: white;
}

.services-modal {
  max-height: 80vh;
  overflow-y: auto;
}

.service-group {
  margin-bottom: 20px;
}

.service-group h4 {
  font-size: 14px;
  color: #333;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #D2691E;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.service-item-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
}

.service-item-large:hover {
  background: #f5f5f5;
  border-radius: 8px;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.form-item input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.form-item input:focus {
  border-color: #D2691E;
}

.payment-methods {
  display: flex;
  gap: 12px;
}

.method-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-item.active {
  border-color: #D2691E;
  background: #fffaf0;
}

.method-icon {
  font-size: 20px;
}

.success-modal {
  text-align: center;
  padding: 32px 16px;
}

.success-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin: 0 auto 16px;
}

.success-modal h3 {
  font-size: 18px;
  color: #333;
  margin: 0 0 8px 0;
}

.success-modal p {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.report-icon {
  background: linear-gradient(135deg, #D2691E 0%, #A0522D 100%);
}

.profile-icon {
  background: linear-gradient(135deg, #BC8F8F 0%, #8B4513 100%);
}

.check-icon {
  background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
}

.lab-icon {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

.hospital-icon {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.discharge-icon {
  background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%);
}

.bed-icon {
  background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
}

.visit-icon {
  background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
}

.transfer-icon {
  background: linear-gradient(135deg, #607D8B 0%, #546E7A 100%);
}

.vaccine-icon {
  background: linear-gradient(135deg, #8BC34A 0%, #689F38 100%);
}

.chronic-icon {
  background: linear-gradient(135deg, #FFC107 0%, #FFA000 100%);
}

.edu-icon {
  background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
}

.health-icon {
  background: linear-gradient(135deg, #03A9F4 0%, #0288D1 100%);
}

.family-icon {
  background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%);
}

.medicine-icon {
  background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%);
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  gap: 8px;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
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

/* 登录提示弹窗 */
:deep(.login-guide-body) {
  text-align: center;
  padding: 24px 0;
}
:deep(.login-guide-body h3) {
  margin: 16px 0 8px;
  font-size: 18px;
  color: #333;
}
:deep(.login-guide-body p) {
  color: #666;
  font-size: 14px;
  margin: 0;
}
</style>
