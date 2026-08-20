import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 患者端页面
import HomeIndex from '@/views/home/Index.vue'
import Appointment from '@/views/home/Appointment.vue'
import AppointmentDoctor from '@/views/home/AppointmentDoctor.vue'
import AppointmentConfirm from '@/views/home/AppointmentConfirm.vue'
import Payment from '@/views/home/Payment.vue'
import QueueStatus from '@/views/home/QueueStatus.vue'
import MedicalRecords from '@/views/home/MedicalRecords.vue'
import ECard from '@/views/home/ECard.vue'
import Revisit from '@/views/home/Revisit.vue'

// 医生端
import OutpatientWorkbench from '@/views/doctor/OutpatientWorkbench.vue'
import InpatientWorkbench from '@/views/doctor/InpatientWorkbench.vue'
import MedicalTemplates from '@/views/doctor/MedicalTemplates.vue'
import PrescriptionTemplates from '@/views/doctor/PrescriptionTemplates.vue'
import DrugDictionary from '@/views/doctor/DrugDictionary.vue'
import Statistics from '@/views/doctor/Statistics.vue'
import DoctorProfile from '@/views/doctor/DoctorProfile.vue'
import ChiefSettings from '@/views/doctor/ChiefSettings.vue'
import ChiefHotwordsManage from '@/views/doctor/ChiefHotwordsManage.vue'
import PatientSearch from '@/views/doctor/PatientSearch.vue'
import MyFavorites from '@/views/doctor/MyFavorites.vue'
import CommonTools from '@/views/doctor/CommonTools.vue'

// 药房端
import PharmacyWorkbench from '@/views/pharmacy/PharmacyWorkbench.vue'

// 检验科医师端
import LabDoctorWorkbench from '@/views/lab-doctor/LabDoctorWorkbench.vue'

// 影像师端
import RadiologistWorkbench from '@/views/radiologist/RadiologistWorkbench.vue'

// 管理员端
import AdminIndex from '@/views/admin/Index.vue'
import ReservedStats from '@/views/admin/ReservedStats.vue'
import KnowledgeGraph from '@/views/admin/KnowledgeGraph.vue'
import Hotwords from '@/views/admin/Hotwords.vue'

// 通用页面
import Login from '@/views/Login.vue'
import Report from '@/views/Report.vue'
import Profile from '@/views/Profile.vue'
import LanguageSettings from '@/views/LanguageSettings.vue'

const routes = [
  // 患者端
  { path: '/', name: 'Home', component: HomeIndex },
  { path: '/appointment/dept', name: 'Appointment', component: Appointment, meta: { requiresAuth: true } },
  { path: '/appointment/doctor', name: 'AppointmentDoctor', component: AppointmentDoctor, meta: { requiresAuth: true } },
  { path: '/appointment/confirm', name: 'AppointmentConfirm', component: AppointmentConfirm, meta: { requiresAuth: true } },
  { path: '/payment', name: 'Payment', component: Payment, meta: { requiresAuth: true } },
  { path: '/queue', name: 'QueueStatus', component: QueueStatus, meta: { requiresAuth: true } },
  { path: '/medical-records', name: 'MedicalRecords', component: MedicalRecords, meta: { requiresAuth: true } },
  { path: '/ecard', name: 'ECard', component: ECard, meta: { requiresAuth: true } },
  { path: '/revisit', name: 'Revisit', component: Revisit, meta: { requiresAuth: true } },
  { path: '/report', name: 'Report', component: Report, meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/language-settings', name: 'LanguageSettings', component: LanguageSettings, meta: { requiresAuth: true } },

  // 认证
  { path: '/login', name: 'Login', component: Login },

  // 医生端
  { path: '/doctor/outpatient', name: 'OutpatientWorkbench', component: OutpatientWorkbench, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/inpatient', name: 'InpatientWorkbench', component: InpatientWorkbench, meta: { requiresAuth: true, roles: ['inpatient_doctor', 'admin'] } },
  { path: '/doctor/templates', name: 'MedicalTemplates', component: MedicalTemplates, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/prescription-templates', name: 'PrescriptionTemplates', component: PrescriptionTemplates, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/drug-dictionary', name: 'DrugDictionary', component: DrugDictionary, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/statistics', name: 'Statistics', component: Statistics, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/profile', name: 'DoctorProfile', component: DoctorProfile, meta: { requiresAuth: true, roles: ['doctor', 'inpatient_doctor', 'lab_doctor', 'radiologist', 'admin'] } },
  { path: '/doctor/chief-settings', name: 'ChiefSettings', component: ChiefSettings, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/chief-hotwords', name: 'ChiefHotwordsManage', component: ChiefHotwordsManage, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/patient-search', name: 'PatientSearch', component: PatientSearch, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/favorites', name: 'MyFavorites', component: MyFavorites, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  { path: '/doctor/tools', name: 'CommonTools', component: CommonTools, meta: { requiresAuth: true, roles: ['doctor', 'admin'] } },
  // 兼容旧路由
  { path: '/doctor', redirect: '/doctor/outpatient' },

  // 药房端
  { path: '/pharmacy', name: 'PharmacyWorkbench', component: PharmacyWorkbench, meta: { requiresAuth: true, roles: ['pharmacist', 'admin'] } },

  // 检验科医师端
  { path: '/lab-doctor', name: 'LabDoctorWorkbench', component: LabDoctorWorkbench, meta: { requiresAuth: true, roles: ['lab_doctor', 'admin'] } },

  // 影像师端
  { path: '/radiologist', name: 'RadiologistWorkbench', component: RadiologistWorkbench, meta: { requiresAuth: true, roles: ['radiologist', 'admin'] } },

  // 管理员端
  { path: '/admin', name: 'Admin', component: AdminIndex, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/admin/reserved-stats', name: 'ReservedStats', component: ReservedStats, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/admin/knowledge-graph', name: 'KnowledgeGraph', component: KnowledgeGraph, meta: { requiresAuth: true, roles: ['admin'] } },
  { path: '/admin/hotwords', name: 'Hotwords', component: Hotwords, meta: { requiresAuth: true, roles: ['admin'] } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const { isLoggedIn, userRole } = useUserStore()

  if (to.meta.requiresAuth && !isLoggedIn.value) {
    // 使用 replace 跳转，这样登录页不会加入历史记录
    return next({ path: '/login', query: { redirect: to.path }, replace: true })
  }

  // 角色权限检查
  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && isLoggedIn.value && !allowedRoles.includes(userRole.value)) {
    // 重定向到对应角色首页
    const roleHomeMap: Record<string, string> = {
      patient: '/',
      doctor: '/doctor/outpatient',
      inpatient_doctor: '/doctor/inpatient',
      pharmacist: '/pharmacy',
      lab_doctor: '/lab-doctor',
      radiologist: '/radiologist',
      admin: '/admin',
    }
    return next(roleHomeMap[userRole.value] || '/')
  }

  // 医生身份保护：防止医生访问患者端页面
  const patientRoutes = ['/', '/appointment/dept', '/appointment/doctor', '/appointment/confirm', '/payment', '/queue', '/medical-records', '/ecard']
  const doctorRoles = ['doctor', 'inpatient_doctor', 'lab_doctor', 'radiologist']
  if (isLoggedIn.value && doctorRoles.includes(userRole.value) && patientRoutes.includes(to.path)) {
    // 医生尝试访问患者页面，重定向到对应角色首页
    const roleHomeMap: Record<string, string> = {
      doctor: '/doctor/outpatient',
      inpatient_doctor: '/doctor/inpatient',
      lab_doctor: '/lab-doctor',
      radiologist: '/radiologist',
    }
    return next(roleHomeMap[userRole.value] || '/')
  }

  next()
})

export default router
