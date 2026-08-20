<template>
  <div class="doctor-dict-page">
    <div class="page-actions">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索医生姓名/工号..."
          prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
        <el-select v-model="filterDept" placeholder="选择科室" clearable style="width: 200px; margin-left: 12px">
          <el-option v-for="dept in deptList" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-button icon="Upload" type="primary" @click="handleImport">批量导入</el-button>
        <el-button icon="Plus" type="primary" @click="handleAdd">新增医生</el-button>
      </div>
    </div>

    <div class="doctor-list">
      <div v-for="doctor in filteredDoctors" :key="doctor.id" class="doctor-card glass-card">
        <div class="card-header">
          <div class="doctor-avatar">
            <el-avatar :size="60">
              <el-icon :size="30"><User /></el-icon>
            </el-avatar>
            <div class="status-dot" :class="doctor.status"></div>
          </div>
          <div class="doctor-info">
            <h3 class="doctor-name">{{ doctor.name }}</h3>
            <p class="doctor-title">{{ doctor.title }} | {{ doctor.dept }}</p>
          </div>
          <div class="doctor-actions">
            <el-button size="small" type="primary" plain icon="Edit" @click="handleEdit(doctor)">
              编辑
            </el-button>
            <el-button size="small" type="danger" plain icon="Delete" @click="handleDelete(doctor)">
              删除
            </el-button>
          </div>
        </div>

        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">工号:</span>
              <span class="value">{{ doctor.employee_id }}</span>
            </div>
            <div class="info-item">
              <span class="label">职称:</span>
              <span class="value">{{ doctor.title }}</span>
            </div>
            <div class="info-item">
              <span class="label">科室:</span>
              <span class="value">{{ doctor.dept }}</span>
            </div>
            <div class="info-item">
              <span class="label">专业:</span>
              <span class="value">{{ doctor.specialty }}</span>
            </div>
            <div class="info-item">
              <span class="label">电话:</span>
              <span class="value">{{ doctor.phone }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态:</span>
              <span class="value status-tag" :class="doctor.status">
                {{ doctor.status === 'active' ? '在岗' : '离岗' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑医生信息' : '新增医生'"
      size="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="doctorForm" :rules="doctorRules" ref="doctorFormRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="doctorForm.name" placeholder="请输入医生姓名" />
        </el-form-item>
        <el-form-item label="工号" prop="employee_id">
          <el-input v-model="doctorForm.employee_id" placeholder="请输入工号" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="科室" prop="dept_id">
          <el-select v-model="doctorForm.dept_id" placeholder="请选择科室" style="width: 100%">
            <el-option v-for="dept in deptList" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="职称" prop="title">
          <el-select v-model="doctorForm.title" placeholder="请选择职称" style="width: 100%">
            <el-option label="主任医师" value="主任医师" />
            <el-option label="副主任医师" value="副主任医师" />
            <el-option label="主治医师" value="主治医师" />
            <el-option label="住院医师" value="住院医师" />
          </el-select>
        </el-form-item>
        <el-form-item label="专业" prop="specialty">
          <el-input v-model="doctorForm.specialty" placeholder="请输入专业方向" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="doctorForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="doctorForm.status">
            <el-radio value="active">在岗</el-radio>
            <el-radio value="inactive">离岗</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDoctor">保存</el-button>
      </template>
    </el-drawer>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入医生" width="500px">
      <el-upload
        drag
        action="/api/admin/doctors/import"
        accept=".xlsx,.xls"
        :on-success="handleImportSuccess"
        :on-error="handleImportError"
      >
        <el-icon :size="50" color="#409EFF"><UploadFilled /></el-icon>
        <div style="margin-top: 16px">将文件拖到此处，或点击上传</div>
        <div style="margin-top: 8px; font-size: 12px; color: #999">支持 .xlsx、.xls 格式</div>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, UploadFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const searchKeyword = ref('')
const filterDept = ref('')
const drawerVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const doctorFormRef = ref()

const deptList = ref<any[]>([])
const doctorList = ref<any[]>([])

const loadData = async () => {
  try {
    const [deptRes, doctorRes] = await Promise.all([
      axios.get('/api/departments'),
      axios.get('/api/admin/doctors')
    ])
    deptList.value = deptRes.data || []
    doctorList.value = doctorRes.data.map((d: any) => ({
      ...d,
      dept: d.dept_name || '',
      dept_id: d.department_id || 0,
      employee_id: d.employee_id || `D${String(d.id).padStart(4, '0')}`,
      phone: d.phone || '',
      status: d.status || 'active'
    }))
  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})

const doctorForm = ref({
  id: 0,
  name: '',
  employee_id: '',
  dept_id: 0,
  title: '',
  specialty: '',
  phone: '',
  status: 'active'
})

const doctorRules = {
  name: [{ required: true, message: '请输入医生姓名', trigger: 'blur' }],
  employee_id: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  dept_id: [{ required: true, message: '请选择科室', trigger: 'change' }],
  title: [{ required: true, message: '请选择职称', trigger: 'change' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const filteredDoctors = computed(() => {
  return doctorList.value.filter(doctor => {
    const matchKeyword = !searchKeyword.value ||
      doctor.name.includes(searchKeyword.value) ||
      doctor.employee_id.includes(searchKeyword.value)
    const matchDept = !filterDept.value || doctor.dept_id === Number(filterDept.value)
    return matchKeyword && matchDept
  })
})

const handleSearch = () => {}

const handleAdd = () => {
  isEdit.value = false
  doctorForm.value = {
    id: 0,
    name: '',
    employee_id: '',
    dept_id: 0,
    title: '',
    specialty: '',
    phone: '',
    status: 'active'
  }
  drawerVisible.value = true
}

const handleEdit = (doctor: any) => {
  isEdit.value = true
  doctorForm.value = {
    id: doctor.id,
    name: doctor.name,
    employee_id: doctor.employee_id || '',
    dept_id: doctor.department_id || doctor.dept_id || 0,
    title: doctor.title || '',
    specialty: doctor.specialty || '',
    phone: doctor.phone || '',
    status: doctor.status || 'active'
  }
  drawerVisible.value = true
}

const handleDelete = (doctor: any) => {
  ElMessageBox.confirm(`确定要删除医生"${doctor.name}"吗？`, '确认删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`/api/admin/doctors/${doctor.id}`)
      doctorList.value = doctorList.value.filter(d => d.id !== doctor.id)
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const saveDoctor = () => {
  doctorFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await axios.put(`/api/admin/doctors/${doctorForm.value.id}`, {
            name: doctorForm.value.name,
            title: doctorForm.value.title,
            department_id: doctorForm.value.dept_id,
            specialty: doctorForm.value.specialty,
            phone: doctorForm.value.phone
          })
          ElMessage.success('修改成功')
        } else {
          await axios.post('/api/admin/doctors', {
            name: doctorForm.value.name,
            title: doctorForm.value.title,
            department_id: doctorForm.value.dept_id,
            specialty: doctorForm.value.specialty,
            phone: doctorForm.value.phone
          })
          ElMessage.success('新增成功')
        }
        drawerVisible.value = false
        loadData()
      } catch (error) {
        ElMessage.error('保存失败')
      }
    }
  })
}

const downloadTemplate = () => {
  ElMessage.success('模板下载成功')
}

const handleImport = () => {
  importDialogVisible.value = true
}

const handleImportSuccess = () => {
  ElMessage.success('导入成功')
  importDialogVisible.value = false
}

const handleImportError = () => {
  ElMessage.error('导入失败，请检查文件格式')
}
</script>

<style scoped>
.doctor-dict-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.page-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.doctor-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 20px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.2);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.doctor-avatar {
  position: relative;
}

.status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-dot.active {
  background: #48BB78;
}

.status-dot.inactive {
  background: #A0AEC0;
}

.doctor-info {
  flex: 1;
}

.doctor-name {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1E293B;
}

.doctor-title {
  margin: 0;
  font-size: 13px;
  color: #64748B;
}

.doctor-actions {
  display: flex;
  gap: 8px;
}

.card-body {
  padding-top: 16px;
  border-top: 1px solid rgba(66, 153, 225, 0.1);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-item .label {
  color: #64748B;
}

.info-item .value {
  color: #1E293B;
  font-weight: 500;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.status-tag.active {
  background: rgba(72, 187, 120, 0.1);
  color: #48BB78;
}

.status-tag.inactive {
  background: rgba(160, 174, 192, 0.1);
  color: #A0AEC0;
}

:deep(.el-button--small) {
  border-radius: 8px;
  font-size: 13px;
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

:deep(.el-select .el-input__wrapper) {
  background: rgba(248, 250, 252, 0.8);
  border-radius: 8px;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
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

:deep(.el-upload-dragger) {
  background: rgba(248, 250, 252, 0.6);
  border: 2px dashed rgba(66, 153, 225, 0.2);
  border-radius: 12px;
}

:deep(.el-upload-dragger:hover) {
  border-color: #4299E1;
  background: rgba(66, 153, 225, 0.06);
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
}

:deep(.el-button--danger) {
  background: rgba(252, 129, 129, 0.1);
  border-color: rgba(252, 129, 129, 0.3);
  color: #FC8181;
}

:deep(.el-button--danger:hover) {
  background: rgba(252, 129, 129, 0.15);
  border-color: #FC8181;
}

:deep(.el-drawer__header) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-bottom: 1px solid rgba(66, 153, 225, 0.15);
}

:deep(.el-drawer__title) {
  color: #1E293B;
  font-weight: 600;
}
</style>