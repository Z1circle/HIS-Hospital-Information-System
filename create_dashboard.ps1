$content = @"
<template>
  <div class="doctor-dashboard">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">⚕️</span>
          <span class="logo-text">HIS系统</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div v-for="item in menuItems" :key="item.name" :class="['nav-item', activeNav === item.name ? 'active' : '']" @click="activeNav = item.name">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </div>
      </nav>
    </aside>
    <main class="main-content">
      <header class="content-header">
        <div class="clinic-name">中医科诊所</div>
        <div class="user-info">
          <span class="user-avatar">{{ currentUser?.avatar || 'D' }}</span>
          <span class="user-name">{{ currentUser?.name || 'Doctor' }}</span>
        </div>
      </header>
      <div class="content-body">
        <div class="patient-panel">
          <div class="panel-header">
            <input type="text" v-model="searchText" placeholder="搜索患者" class="search-input" />
            <button class="btn-primary" @click="handleAddPatient">+ 接诊</button>
          </div>
          <div class="patient-tabs">
            <span :class="['tab', activePatientTab === 'all' ? 'active' : '']" @click="activePatientTab = 'all'">全部 {{ patients.length }}</span>
            <span :class="['tab', activePatientTab === 'waiting' ? 'active' : '']" @click="activePatientTab = 'waiting'">候诊 {{ waitingCount }}</span>
          </div>
          <div class="patient-list">
            <div v-for="patient in filteredPatients" :key="patient.id" :class="['patient-item', selectedPatient?.id === patient.id ? 'selected' : '']" @click="selectPatient(patient)">
              <div>
                <div class="patient-name">{{ patient.name }}</div>
                <div class="patient-status">{{ patient.status }}</div>
              </div>
              <div class="patient-time">{{ patient.time }}</div>
            </div>
          </div>
          <div class="view-all"><a href="#">查看全部患者 ></a></div>
        </div>
        <div class="workspace-panel">
          <div v-if="selectedPatient" class="patient-detail">
            <div class="detail-header">
              <div class="patient-basic">
                <span class="name-tag">{{ selectedPatient.name }}</span>
                <span class="gender-tag">{{ selectedPatient.gender }}</span>
                <span class="age-tag">{{ selectedPatient.age }}岁</span>
              </div>
              <div class="action-buttons">
                <button :class="['action-btn', activeAction === 'medical' ? 'active' : '']" @click="activeAction = 'medical'">写病历</button>
                <button :class="['action-btn', activeAction === 'template' ? 'active' : '']" @click="activeAction = 'template'">病历模板</button>
                <button class="action-btn" @click="saveMedicalRecord">💾</button>
              </div>
            </div>
            <div v-if="activeAction === 'medical'" class="medical-form">
              <div class="form-row"><label>主诉 *</label><textarea v-model="medicalRecord.chiefComplaint"></textarea></div>
              <div class="form-row"><label>现病史</label><textarea v-model="medicalRecord.history"></textarea></div>
              <div class="form-row"><label>既往史</label><textarea v-model="medicalRecord.pastHistory"></textarea></div>
              <div class="form-row"><label>体格检查</label><textarea v-model="medicalRecord.examination"></textarea></div>
              <div class="form-row"><label>诊断 *</label><textarea v-model="medicalRecord.diagnosis"></textarea></div>
            </div>
            <div v-if="activeAction === 'template'" class="template-section">
              <div class="template-list">
                <div v-for="template in templates" :key="template.name" @click="applyTemplate(template)" class="template-item">{{ template.name }}</div>
              </div>
            </div>
            <div class="prescription-section">
              <div class="section-header">
                <button :class="['action-btn', activeAction === 'prescription' ? 'active' : '']" @click="activeAction = 'prescription'">开处方</button>
                <button :class="['action-btn', activeAction === 'prescriptionTemplate' ? 'active' : '']" @click="activeAction = 'prescriptionTemplate'">处方模板</button>
              </div>
              <label><input type="radio" v-model="prescription.type" value="herbal" /> 中成药处方</label>
              <input type="text" v-model="medicineSearch" placeholder="搜索药品" class="medicine-search" />
              <div class="medicine-list">
                <div v-for="med in selectedMedicines" :key="med.name" class="medicine-item">
                  <span>{{ med.name }}</span>
                  <span>{{ med.dose }}</span>
                  <button class="remove-btn" @click="removeMedicine(med)">×</button>
                </div>
              </div>
              <div class="add-medicine">
                <select v-model="newMedicine">
                  <option value="">选择药品</option>
                  <option v-for="med in availableMedicines" :key="med" :value="med">{{ med }}</option>
                </select>
                <input type="text" v-model="newDose" placeholder="剂量" />
                <button class="btn-add" @click="addMedicine">+</button>
              </div>
              <div class="medical-order">
                <label>医嘱</label>
                <textarea v-model="prescription.order"></textarea>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div>👤</div>
            <p>请选择患者开始诊疗</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
const { currentUser } = useUserStore()
const activeNav = ref('工作台')
const searchText = ref('')
const activePatientTab = ref('all')
const selectedPatient = ref(null)
const activeAction = ref('medical')
const medicineSearch = ref('')
const newMedicine = ref('')
const newDose = ref('')
const patients = ref([
  { id: '1', name: '匿名患者', gender: '男', age: 35, status: '草稿', time: '10:39' },
  { id: '2', name: '张三', gender: '男', age: 45, status: '候诊', time: '10:45' },
  { id: '3', name: '李四', gender: '女', age: 28, status: '候诊', time: '11:00' },
])
const waitingCount = computed(() => patients.value.filter(p => p.status === '候诊').length)
const filteredPatients = computed(() => !searchText.value ? patients.value : patients.value.filter(p => p.name.includes(searchText.value)))
const menuItems = [
  { name: '工作台', icon: '📋' }, { name: '挂号预约', icon: '📅' }, { name: '问诊', icon: '💬' },
  { name: '收费', icon: '💰' }, { name: '药房', icon: '💊' }, { name: '检验', icon: '🔬' },
  { name: '库存', icon: '📦' }, { name: '采购', icon: '🛒' }, { name: '患者', icon: '👥' },
]
const medicalRecord = reactive({ chiefComplaint: '', history: '', pastHistory: '', examination: '', diagnosis: '' })
const prescription = reactive({ type: 'herbal', order: '' })
const selectedMedicines = ref([{ name: '板蓝根颗粒', dose: '1袋/次，3次/日' }])
const availableMedicines = ['板蓝根颗粒', '感冒灵颗粒', '清热解毒口服液', '牛黄解毒片', '藿香正气水', '双黄连口服液']
const templates = [
  { name: '感冒模板', chiefComplaint: '发热、咳嗽3天', diagnosis: '感冒' },
  { name: '高血压模板', chiefComplaint: '头晕、头痛', diagnosis: '高血压' },
]
const selectPatient = (patient) => { selectedPatient.value = patient }
const handleAddPatient = () => { alert('接诊功能开发中') }
const applyTemplate = (template) => { medicalRecord.chiefComplaint = template.chiefComplaint; medicalRecord.diagnosis = template.diagnosis; activeAction.value = 'medical' }
const addMedicine = () => { if (newMedicine.value && newDose.value) { selectedMedicines.value.push({ name: newMedicine.value, dose: newDose.value }); newMedicine.value = ''; newDose.value = '' } }
const removeMedicine = (med) => { selectedMedicines.value = selectedMedicines.value.filter(m => m.name !== med.name) }
const saveMedicalRecord = () => { if (!medicalRecord.chiefComplaint || !medicalRecord.diagnosis) { alert('请填写主诉和诊断'); return } alert('病历保存成功') }
</script>
<style scoped>
.doctor-dashboard { display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 200px; background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%); color: white; display: flex; flex-direction: column; }
.sidebar-header { padding: 20px; border-bottom: 1px solid #4a5568; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { font-size: 28px; }
.logo-text { font-size: 18px; font-weight: bold; }
.sidebar-nav { flex: 1; padding: 10px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; }
.nav-item:hover { background: rgba(255,255,255,0.1); }
.nav-item.active { background: #D2691E; }
.main-content { flex: 1; display: flex; flex-direction: column; background: #f5f7fa; }
.content-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: white; border-bottom: 1px solid #e0e0e0; }
.clinic-name { font-size: 18px; font-weight: bold; color: #333; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.content-body { flex: 1; display: flex; padding: 16px; gap: 16px; overflow: hidden; }
.patient-panel { width: 320px; background: white; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.panel-header { display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid #f0f0f0; }
.search-input { padding: 10px 16px; border: 1px solid #ddd; border-radius: 20px; font-size: 14px; outline: none; width: 180px; }
.btn-primary { padding: 10px 20px; background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%); color: white; border: none; border-radius: 20px; font-size: 14px; cursor: pointer; }
.patient-tabs { display: flex; padding: 12px 16px; gap: 16px; border-bottom: 1px solid #f0f0f0; }
.tab { font-size: 14px; color: #666; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
.tab.active { color: #D2691E; background: #fffaf0; }
.patient-list { flex: 1; overflow-y: auto; padding: 8px; }
.patient-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; }
.patient-item:hover { background: #f8f8f8; }
.patient-item.selected { background: #fffaf0; border-left: 3px solid #D2691E; }
.patient-name { font-size: 14px; font-weight: bold; color: #333; }
.patient-status { font-size: 12px; color: #999; }
.view-all { padding: 12px 16px; border-top: 1px solid #f0f0f0; text-align: center; }
.view-all a { font-size: 13px; color: #D2691E; text-decoration: none; }
.workspace-panel { flex: 1; background: white; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; font-size: 48px; }
.empty-state p { font-size: 14px; }
.patient-detail { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #fffaf0; border-bottom: 1px solid #ffe4c4; }
.patient-basic { display: flex; gap: 12px; }
.name-tag { padding: 6px 16px; background: #D2691E; color: white; border-radius: 20px; font-size: 14px; font-weight: bold; }
.gender-tag, .age-tag { padding: 6px 12px; background: #f0f0f0; color: #666; border-radius: 20px; font-size: 13px; }
.action-buttons { display: flex; gap: 8px; }
.action-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; font-size: 13px; cursor: pointer; }
.action-btn:hover { border-color: #D2691E; color: #D2691E; }
.action-btn.active { background: #D2691E; color: white; }
.medical-form { padding: 20px; }
.form-row { margin-bottom: 16px; }
.form-row label { display: block; font-size: 13px; font-weight: bold; color: #333; margin-bottom: 8px; }
.form-row textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; min-height: 80px; outline: none; box-sizing: border-box; }
.prescription-section { padding: 20px; border-top: 1px solid #f0f0f0; }
.section-header { display: flex; gap: 8px; margin-bottom: 16px; }
.medicine-search { width: 100%; padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 16px; outline: none; }
.medicine-list { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.medicine-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f8ff; border-radius: 20px; }
.remove-btn { width: 20px; height: 20px; background: #ff6b6b; color: white; border: none; border-radius: 50%; font-size: 14px; cursor: pointer; }
.add-medicine { display: flex; gap: 12px; margin-bottom: 20px; }
.add-medicine select, .add-medicine input { flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.btn-add { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.medical-order label { display: block; font-size: 13px; font-weight: bold; color: #333; margin-bottom: 8px; }
.medical-order textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; min-height: 60px; outline: none; }
.template-section { padding: 20px; }
.template-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.template-item { padding: 16px; background: #f8f9fa; border-radius: 8px; cursor: pointer; text-align: center; font-size: 14px; color: #333; }
</style>
"@
[System.IO.File]::WriteAllText("d:\DeskTop\coding\vueWork\HIS02\frontend\src\views\DoctorDashboard.vue", $content, [System.Text.Encoding]::UTF8)
Write-Host "DoctorDashboard.vue created successfully"