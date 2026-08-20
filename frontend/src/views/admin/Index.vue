<template>
  <div class="admin-layout">
    <div class="top-bar">
      <div class="logo-section">
        <div class="logo-icon">🏥</div>
        <div class="logo-text">
          <span class="system-name">HIS 管理后台</span>
          <span class="system-subtitle">Hospital Information System</span>
        </div>
      </div>
      <div class="top-actions">
        <el-button icon="Bell" text size="default" class="notification-btn" />
        <el-dropdown @command="handleUserAction">
          <div class="user-info">
            <el-icon :size="20"><User /></el-icon>
            <span>{{ currentUser?.real_name }}</span>
            <el-icon :size="12" class="caret-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout" type="danger">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="main-body">
      <el-aside width="240px" class="sidebar">
        <div class="search-box">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索菜单..."
            prefix-icon="Search"
            clearable
            size="small"
            @input="handleSearch"
            @keyup.enter="handleEnter"
          />
        </div>

        <el-menu
          ref="menuRef"
          :default-active="activeMenu"
          :default-openeds="openedMenus"
          class="admin-menu"
          @select="onMenuSelect"
          :unique-opened="true"
        >
          <template v-for="item in filteredMenuItems" :key="item.id">
            <el-sub-menu v-if="item.children && item.children.length" :index="item.id">
              <template #title>
                <el-icon :size="18"><component :is="getIcon(item.icon)" /></el-icon>
                <span>{{ item.label }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.id" :index="child.id">
                <span>{{ child.label }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.id">
              <el-icon :size="18"><component :is="getIcon(item.icon)" /></el-icon>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <el-main class="main-content">
        <div class="content-wrapper">
          <div class="page-header">
            <div class="header-left">
              <el-breadcrumb separator="/" class="breadcrumb">
                <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
                <el-breadcrumb-item>{{ breadcrumbLabel }}</el-breadcrumb-item>
              </el-breadcrumb>
              <h1 class="page-title">{{ pageTitle }}</h1>
            </div>
          </div>

          <div class="content-area">
            <transition name="fade" mode="out-in">
              <Statistics v-if="activeMenu === 'dashboard'" />
              <InterfaceManage v-else-if="activeMenu === 'interface'" />
              <Profile v-else-if="activeMenu === 'profile'" />
              <DoctorDict v-else-if="activeMenu === 'doctors'" />
              <DiagnosisDict v-else-if="activeMenu === 'diagnosis'" />
              <InsuranceMapping v-else-if="activeMenu === 'insurance-mapping'" />
              <RateSetting v-else-if="activeMenu === 'rate-setting'" />
              <InstitutionManage v-else-if="activeMenu === 'institution'" />
              <StorageManage v-else-if="activeMenu === 'storage'" />
              <MaterialManage v-else-if="activeMenu === 'materials'" />
              <OutpatientManage v-else-if="activeMenu === 'outpatient'" />
              <ScheduleManage v-else-if="activeMenu === 'schedules'" />
              <LimitSetting v-else-if="activeMenu === 'limit-setting'" />
              <HospitalizationManage v-else-if="activeMenu === 'bed-adjust' || activeMenu === 'prepayment'" />
              <NurseManage v-else-if="activeMenu === 'triage-rule' || activeMenu === 'call-screen'" :defaultTab="activeMenu === 'call-screen' ? 'screen' : 'triage'" />
              <ReportManage v-else-if="activeMenu === 'custom-report' || activeMenu === 'schedule-send'" :defaultTab="activeMenu === 'schedule-send' ? 'schedule' : 'custom'" />
              <AdverseEvent v-else-if="activeMenu === 'adverse-event'" />
              <UserManage v-else-if="activeMenu === 'users'" />
              <DeptManage v-else-if="activeMenu === 'depts'" />
              <DrugDict v-else-if="activeMenu === 'drugs'" />
              <ChargeItemDict v-else-if="activeMenu === 'charge'" />
              <SystemConfig v-else-if="activeMenu === 'config'" />
              <ChargeManage v-else-if="activeMenu === 'charge-manage'" />
              <ReservedStats v-else-if="activeMenu === 'reserved-stats'" />
              <Hotwords v-else-if="activeMenu === 'hotwords-list'" />
              <KnowledgeGraph v-else-if="activeMenu === 'knowledge-graph'" />
              <div v-else class="empty-page">
                <el-empty description="暂无内容" :image-size="120" />
              </div>
            </transition>
          </div>
        </div>
      </el-main>
    </div>

    <el-dialog v-model="showLogoutDialog" title="确认退出" width="320px" :close-on-click-modal="false">
      <div class="logout-dialog-content">
        <el-icon :size="48" color="#F56C6C" style="margin-bottom:16px"><SwitchButton /></el-icon>
        <p>确定要退出系统吗？</p>
        <p class="logout-hint">退出后需要重新登录才能继续操作</p>
      </div>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="logout">确定退出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  DataAnalysis, Link, User, Box, Document, Setting, SwitchButton,
  Warning, DataLine, OfficeBuilding, Lock, ArrowDown, MagicStick
} from '@element-plus/icons-vue'
import Statistics from './Statistics.vue'
import UserManage from './UserManage.vue'
import DeptManage from './DeptManage.vue'
import DrugDict from './DrugDict.vue'
import SystemConfig from './SystemConfig.vue'
import ChargeManage from './ChargeManage.vue'
import ChargeItemDict from './ChargeItemDict.vue'
import MaterialManage from './MaterialManage.vue'
import OutpatientManage from './OutpatientManage.vue'
import ScheduleManage from './ScheduleManage.vue'
import LimitSetting from './LimitSetting.vue'
import InterfaceManage from './InterfaceManage.vue'
import Profile from './Profile.vue'
import DoctorDict from './DoctorDict.vue'
import DiagnosisDict from './DiagnosisDict.vue'
import InsuranceMapping from './InsuranceMapping.vue'
import RateSetting from './RateSetting.vue'
import InstitutionManage from './InstitutionManage.vue'
import StorageManage from './StorageManage.vue'
import HospitalizationManage from './HospitalizationManage.vue'
import NurseManage from './NurseManage.vue'
import ReportManage from './ReportManage.vue'
import AdverseEvent from './AdverseEvent.vue'
import ReservedStats from './ReservedStats.vue'
import Hotwords from './Hotwords.vue'
import KnowledgeGraph from './KnowledgeGraph.vue'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser

const activeMenu = ref('dashboard')
const searchKeyword = ref('')
const showLogoutDialog = ref(false)
const menuRef = ref()

const iconMap: Record<string, any> = {
  DataAnalysis, Link, User, Box, Document, Setting, Warning, DataLine, OfficeBuilding, Lock, MagicStick
}

const getIcon = (iconName: string) => {
  return iconMap[iconName] || User
}

const menuItems = [
  { id: 'dashboard', label: '数据统计', icon: 'DataAnalysis' },
  { id: 'interface', label: '接口管理', icon: 'Link' },
  { id: 'profile', label: '个人中心', icon: 'User' },
  {
    id: 'hotwords',
    label: '热词管理',
    icon: 'MagicStick',
    children: [
      { id: 'hotwords-list', label: '热词列表' },
      { id: 'knowledge-graph', label: '知识图谱' }
    ]
  },
  {
        id: 'basic-data',
        label: '基础数据',
        icon: 'DataLine',
        children: [
          { id: 'depts', label: '科室字典' },
          { id: 'doctors', label: '医生字典' },
          { id: 'charge', label: '收费项目字典' },
          { id: 'diagnosis', label: '诊断字典' },
          { id: 'drugs', label: '药品字典' }
        ]
      },
  {
    id: 'medical-insurance',
    label: '医保管理',
    icon: 'Lock',
    children: [
      { id: 'insurance-mapping', label: '医保目录对码' },
      { id: 'rate-setting', label: '费率设置' }
    ]
  },
  { id: 'institution', label: '机构管理', icon: 'OfficeBuilding' },
  { id: 'storage', label: '库房管理', icon: 'Box' },
  { id: 'materials', label: '物资管理', icon: 'Box' },
  {
    id: 'finance',
    label: '财务管理',
    icon: 'DataAnalysis',
    children: [
      { id: 'charge-manage', label: '收费记录管理' }
    ]
  },
  {
    id: 'outpatient',
    label: '门诊管理',
    icon: 'DataLine',
    children: [
      { id: 'schedules', label: '排班管理' },
      { id: 'limit-setting', label: '限号设置' },
      { id: 'reserved-stats', label: '预留号统计' }
    ]
  },

  {
    id: 'hospitalization',
    label: '住院管理',
    icon: 'Box',
    children: [
      { id: 'bed-adjust', label: '床位调整' },
      { id: 'prepayment', label: '预交金充值' }
    ]
  },
  {
    id: 'nurse-management',
    label: '护士管理',
    icon: 'User',
    children: [
      { id: 'triage-rule', label: '分诊规则配置' },
      { id: 'call-screen', label: '呼叫屏设置' }
    ]
  },

  {
    id: 'report',
    label: '报表管理',
    icon: 'DataAnalysis',
    children: [
      { id: 'custom-report', label: '自定义报表' },
      { id: 'schedule-send', label: '定时发送' }
    ]
  },
  { id: 'adverse-event', label: '不良事件', icon: 'Warning' },
  { id: 'config', label: '系统配置', icon: 'Setting' },
  { id: 'users', label: '用户管理', icon: 'User' },
]

const filteredMenuItems = computed(() => {
  if (!searchKeyword.value.trim()) return menuItems
  const keyword = searchKeyword.value.toLowerCase()
  const result: any[] = []
  for (const item of menuItems) {
    const matchSelf = item.label.toLowerCase().includes(keyword)
    if (matchSelf) {
      result.push({ ...item })
      continue
    }
    if (item.children) {
      const matchedChildren = item.children.filter(child => child.label.toLowerCase().includes(keyword))
      if (matchedChildren.length > 0) {
        result.push({ ...item, children: matchedChildren })
      }
    }
  }
  return result
})

const openedMenus = computed(() => {
  if (!searchKeyword.value.trim()) return []
  return filteredMenuItems.value
    .filter(item => item.children && item.children.length)
    .map(item => item.id)
})

const titleMap: Record<string, string> = {
  dashboard: '数据统计',
  interface: '接口管理',
  profile: '个人中心',
  depts: '科室字典',
  doctors: '医生字典',
  charge: '收费项目',
  diagnosis: '诊断字典',
  'insurance-mapping': '医保目录对码',
  'rate-setting': '费率设置',
  institution: '机构管理',
  storage: '库房管理',
  materials: '物资管理',
  schedules: '排班管理',
  'limit-setting': '限号设置',
  'record-template': '病历模板维护',
  'prescription-set': '处方组套设置',
  'bed-adjust': '床位调整',
  prepayment: '预交金充值',
  'triage-rule': '分诊规则配置',
  'call-screen': '呼叫屏设置',
  'critical-value': '危急值设置',
  'report-template': '报告模板',
  'custom-report': '自定义报表',
  'schedule-send': '定时发送',
  'adverse-event': '不良事件',
  config: '系统配置',
  users: '用户管理',
}

const pageTitle = computed(() => titleMap[activeMenu.value] || '')

const breadcrumbLabel = computed(() => {
  for (const item of menuItems) {
    if (item.id === activeMenu.value) return item.label
    if (item.children) {
      const found = item.children.find(child => child.id === activeMenu.value)
      if (found) return item.label
    }
  }
  return ''
})

const onMenuSelect = (key: string) => {
  activeMenu.value = key
}

const handleSearch = () => {}

const handleEnter = () => {
  const filtered = filteredMenuItems.value
  if (filtered.length === 1 && !filtered[0].children) {
    activeMenu.value = filtered[0].id
  } else if (filtered.length === 1 && filtered[0].children && filtered[0].children.length === 1) {
    activeMenu.value = filtered[0].children[0].id
  }
}

const handleUserAction = (command: string) => {
  if (command === 'logout') {
    showLogoutDialog.value = true
  } else if (command === 'profile') {
    activeMenu.value = 'profile'
  }
}

const logout = () => {
  showLogoutDialog.value = false
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F5F7FA;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: linear-gradient(135deg, #1E293B 0%, #1A202C 100%);
  color: #FFFFFF;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.system-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #FFFFFF;
}

.system-subtitle {
  font-size: 11px;
  color: #94A3B8;
  letter-spacing: 1px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  color: #A0AEC0 !important;
  font-size: 20px;
  padding: 8px;
}

.notification-btn:hover {
  color: #FFFFFF !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 6px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-info span {
  font-size: 14px;
  font-weight: 500;
  color: #E2E8F0;
}

.caret-icon {
  color: #A0AEC0;
}

.main-body {
  display: flex;
  flex: 1;
  height: calc(100vh - 64px);
  overflow: hidden;
  margin-top: 64px;
}

.sidebar {
  background: #2D3748;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.search-box {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.search-box .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

:deep(.search-box .el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.15);
}

:deep(.search-box .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.3);
}

:deep(.search-box .el-input__inner) {
  color: #E2E8F0;
  font-size: 13px;
}

:deep(.search-box .el-input__placeholder) {
  color: rgba(226, 232, 240, 0.4);
}

:deep(.search-box .el-input__prefix-inner) {
  color: rgba(226, 232, 240, 0.5);
}

.admin-menu {
  flex: 1;
  background: transparent;
  border-right: none;
  overflow-y: auto;
  padding: 8px 0;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  color: #A0AEC0;
  height: 46px;
  line-height: 46px;
  font-size: 14px;
  margin: 2px 12px;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  padding-left: 20px !important;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.06) !important;
  color: #E2E8F0;
}

:deep(.el-menu-item.is-active),
:deep(.el-sub-menu__title.is-active) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%) !important;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
}

:deep(.el-menu-item.is-active::before),
:deep(.el-sub-menu__title.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 0 4px 4px 0;
}

:deep(.el-sub-menu .el-menu-item) {
  padding-left: 56px !important;
  height: 42px;
  line-height: 42px;
  font-size: 13px;
  color: #718096;
  background: #1A202C !important;
  margin: 1px 12px 1px 24px !important;
  border-radius: 6px;
}

:deep(.el-sub-menu .el-menu-item:hover) {
  background: rgba(66, 153, 225, 0.15) !important;
  color: #CBD5E0;
}

:deep(.el-sub-menu .el-menu-item.is-active) {
  background: rgba(66, 153, 225, 0.25) !important;
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.2);
}

:deep(.el-sub-menu .el-menu-item.is-active::before) {
  width: 3px;
  height: 18px;
}

:deep(.el-sub-menu__icon-arrow) {
  color: #718096;
  font-size: 12px;
}

:deep(.el-sub-menu.is-active .el-sub-menu__icon-arrow) {
  color: #4299E1;
}

:deep(.el-sub-menu .el-menu) {
  background: transparent !important;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: linear-gradient(135deg, #F0F9FF 0%, #EBF8FF 100%);
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 1px 8px rgba(66, 153, 225, 0.06);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breadcrumb {
  font-size: 13px;
  color: #64748B;
}

:deep(.breadcrumb .el-breadcrumb__item) {
  font-weight: 400;
}

:deep(.breadcrumb .el-breadcrumb__item:last-child) {
  color: #4299E1;
  font-weight: 600;
}

:deep(.breadcrumb .el-breadcrumb__separator) {
  color: #94A3B8;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.5px;
}

.content-area {
  flex: 1;
  padding: 20px 28px;
}

.empty-page {
  padding: 80px;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

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

:deep(.el-dialog__header) {
  border-bottom: 1px solid #E2E8F0;
  padding: 16px 20px;
}

:deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
}

:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #E2E8F0;
  padding: 16px 20px;
}

:deep(.el-dropdown-menu) {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #E2E8F0;
  padding: 4px 0;
}

:deep(.el-dropdown-menu__item) {
  padding: 10px 16px;
  font-size: 14px;
  color: #4A5568;
}

:deep(.el-dropdown-menu__item:hover) {
  background: #EBF8FF;
  color: #3182CE;
}

:deep(.el-dropdown-menu__item--divided) {
  border-top: 1px solid #E2E8F0;
  margin-top: 4px;
  padding-top: 14px;
}
</style>