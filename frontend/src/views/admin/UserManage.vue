<template>
  <div class="manage-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input v-model="searchText" placeholder="搜索用户名/姓名/手机号" prefix-icon="Search" style="width:240px" clearable />
      <el-select v-model="filterRole" placeholder="角色筛选" clearable style="width:140px">
        <el-option label="患者" value="patient" />
        <el-option label="门诊医生" value="doctor" />
        <el-option label="住院医生" value="inpatient_doctor" />
        <el-option label="药房人员" value="pharmacist" />
        <el-option label="管理员" value="admin" />
      </el-select>
      <div style="flex:1" />
      <!-- 批量导入 -->
      <el-upload
        :show-file-list="false"
        accept=".txt"
        :before-upload="handleTxtUpload"
        drag
        style="display:inline-block"
      >
        <el-button plain>
          <el-icon style="margin-right:4px"><Upload /></el-icon>批量导入(.txt)
        </el-button>
      </el-upload>
      <el-button type="primary" @click="openAdd">
        <el-icon style="margin-right:4px"><Plus /></el-icon>新增用户
      </el-button>
    </div>

    <!-- 批量导入格式提示 -->
    <el-alert
      v-if="showTxtTip"
      title="txt 格式：每行一条，字段用逗号分隔，顺序：用户名,密码,姓名,角色,手机号,科室ID,职称,专长"
      type="info"
      show-icon
      closable
      style="margin-bottom:10px"
      @close="showTxtTip=false"
    />

    <!-- 用户表格 -->
    <el-table :data="filteredUsers" border size="small" style="margin-top:10px" v-loading="loading">
      <el-table-column label="ID" prop="id" width="60" />
      <el-table-column label="用户名" prop="username" width="120" />
      <el-table-column label="姓名" prop="real_name" width="100" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="phone" width="130" />
      <el-table-column label="科室" prop="dept_name" min-width="100">
        <template #default="{ row }">{{ row.dept_name || (row.role==='pharmacist' ? '药房' : '-') }}</template>
      </el-table-column>
      <el-table-column label="职称" prop="title" width="110">
        <template #default="{ row }">{{ row.title || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_active !== false ? 'success' : 'info'" size="small">
            {{ row.is_active !== false ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" text @click="openEdit(row)">编辑</el-button>
          <el-button size="small" :type="row.is_active !== false ? 'warning' : 'success'" text @click="toggleActive(row)">
            {{ row.is_active !== false ? '禁用' : '启用' }}
          </el-button>
          <el-popconfirm title="确认删除该用户？" @confirm="deleteUser(row)">
            <template #reference>
              <el-button size="small" type="danger" text>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="520px" @close="resetForm">
      <el-form :model="form" label-width="80px" style="padding-right:20px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!editingUser" placeholder="登录账号" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="默认 123456" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.real_name" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="手机号码" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%" @change="onRoleChange">
            <el-option label="患者" value="patient" />
            <el-option label="门诊医生" value="doctor" />
            <el-option label="住院医生" value="inpatient_doctor" />
            <el-option label="药房人员" value="pharmacist" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <!-- 医生专属字段 -->
        <template v-if="form.role === 'doctor' || form.role === 'inpatient_doctor'">
          <el-form-item label="科室">
            <el-select v-model="form.dept_id" style="width:100%" placeholder="选择科室" filterable>
              <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="职称">
            <el-select v-model="form.title" style="width:100%">
              <el-option label="主任医师" value="主任医师" />
              <el-option label="副主任医师" value="副主任医师" />
              <el-option label="主治医师" value="主治医师" />
              <el-option label="住院医师" value="住院医师" />
            </el-select>
          </el-form-item>
          <el-form-item label="专长">
            <el-input v-model="form.specialty" placeholder="擅长领域，如：糖尿病、高血压" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入预览弹窗 -->
    <el-dialog v-model="batchVisible" title="批量导入预览" width="700px">
      <el-alert type="info" show-icon style="margin-bottom:10px">
        <template #title>格式：用户名,密码,姓名,角色,手机号,科室ID,职称,专长（每行一条，#开头为注释）</template>
      </el-alert>
      <el-table :data="batchPreview" border size="small" max-height="360">
        <el-table-column label="用户名" prop="username" width="110" />
        <el-table-column label="姓名" prop="real_name" width="90" />
        <el-table-column label="角色" width="110">
          <template #default="{ row }"><el-tag size="small">{{ roleLabel(row.role) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" width="120" />
        <el-table-column label="科室ID" prop="dept_id" width="70" />
        <el-table-column label="职称" prop="title" width="100" />
        <el-table-column label="专长" prop="specialty" min-width="120" />
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row._error ? 'danger' : 'success'" size="small">
              {{ row._error || '待导入' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="batchVisible=false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="submitBatch">
          确认导入 ({{ batchPreview.filter(r => !r._error).length }} 条)
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Upload, Plus } from '@element-plus/icons-vue'

const users = ref<any[]>([])
const depts = ref<any[]>([])
const searchText = ref('')
const filterRole = ref('')
const formVisible = ref(false)
const batchVisible = ref(false)
const batchPreview = ref<any[]>([])
const batchLoading = ref(false)
const loading = ref(false)
const submitting = ref(false)
const showTxtTip = ref(false)
const editingUser = ref<any>(null)

const emptyForm = () => ({
  username: '', password: '123456', real_name: '', phone: '',
  role: 'patient', dept_id: null as number | null, title: '主治医师', specialty: ''
})
const form = ref(emptyForm())

const filteredUsers = computed(() => {
  let list = users.value
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.real_name?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    )
  }
  if (filterRole.value) list = list.filter(u => u.role === filterRole.value)
  return list
})

const roleLabel = (r: string) => ({
  patient: '患者', doctor: '门诊医生', inpatient_doctor: '住院医生',
  pharmacist: '药房人员', admin: '管理员'
}[r] || r)

const roleTagType = (r: string): any => ({
  patient: '', doctor: 'success', inpatient_doctor: 'warning', pharmacist: 'info', admin: 'danger'
}[r] || '')

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/users')
    users.value = res.data
  } catch (error) {
    ElMessage.error('加载用户列表失败')
    console.error('加载用户列表失败:', error)
  }
  loading.value = false
}

const loadDepts = async () => {
  try {
    const res = await axios.get('/api/departments')
    depts.value = res.data
  } catch { /* ignore */ }
}

const openAdd = () => {
  editingUser.value = null
  form.value = emptyForm()
  formVisible.value = true
}

const openEdit = (row: any) => {
  editingUser.value = row
  form.value = {
    username: row.username, password: '', real_name: row.real_name,
    phone: row.phone || '', role: row.role,
    dept_id: row.department_id || null,
    title: row.title || '主治医师', specialty: row.specialty || ''
  }
  formVisible.value = true
}

const resetForm = () => { editingUser.value = null; form.value = emptyForm() }

const onRoleChange = () => {
  if (form.value.role === 'patient' || form.value.role === 'admin') {
    form.value.dept_id = null
    form.value.title = '主治医师'
    form.value.specialty = ''
  }
}

const submitForm = async () => {
  if (!form.value.username || !form.value.real_name) {
    ElMessage.warning('用户名和姓名必填')
    return
  }
  submitting.value = true
  try {
    if (editingUser.value) {
      await axios.put(`/api/admin/users/${editingUser.value.id}`, form.value)
      await loadUsers()
      ElMessage.success('用户已更新')
    } else {
      await axios.post('/api/admin/users', form.value)
      await loadUsers()
      ElMessage.success('用户已创建')
    }
    formVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.detail || '操作失败')
  }
  submitting.value = false
}

const toggleActive = async (row: any) => {
  try {
    await axios.put(`/api/admin/users/${row.id}`, {
      role: row.role, real_name: row.real_name, phone: row.phone || '',
      is_active: !row.is_active
    })
    row.is_active = !row.is_active
    ElMessage.success(row.is_active ? '已启用' : '已禁用')
  } catch {
    ElMessage.error('操作失败')
  }
}

const deleteUser = async (row: any) => {
  try {
    await axios.delete(`/api/admin/users/${row.id}`)
    users.value = users.value.filter(u => u.id !== row.id)
    ElMessage.success('已删除')
  } catch {
    ElMessage.error('删除失败')
  }
}

// ======= 批量 TXT 导入 =======
const VALID_ROLES = ['patient', 'doctor', 'inpatient_doctor', 'pharmacist', 'admin']

const handleTxtUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    const preview: any[] = []
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      const [username, password, real_name, role, phone, dept_id_str, title, ...rest] = parts
      const specialty = rest.join(',')
      let err = ''
      if (!username) err = '缺少用户名'
      else if (!real_name) err = '缺少姓名'
      else if (!VALID_ROLES.includes(role)) err = `角色无效: ${role}`
      preview.push({
        username, password: password || '123456', real_name, role,
        phone: phone || '', dept_id: dept_id_str ? parseInt(dept_id_str) : null,
        title: title || '主治医师', specialty: specialty || '',
        _error: err
      })
    }
    batchPreview.value = preview
    batchVisible.value = true
    showTxtTip.value = true
  }
  reader.readAsText(file, 'utf-8')
  return false // 阻止 el-upload 自动上传
}

const submitBatch = async () => {
  const valid = batchPreview.value.filter(r => !r._error)
  if (!valid.length) { ElMessage.warning('没有可导入的数据'); return }
  batchLoading.value = true
  let ok = 0, fail = 0
  for (const item of valid) {
    try {
      const { _error, ...body } = item
      await axios.post('/api/admin/users', body)
      ok++
    } catch {
      fail++
    }
  }
  batchLoading.value = false
  batchVisible.value = false
  await loadUsers()
  ElMessage.success(`导入完成：成功 ${ok} 条${fail ? `，失败 ${fail} 条` : ''}`)
}

onMounted(() => { loadUsers(); loadDepts() })
</script>

<style scoped>
.manage-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 0;
  align-items: center;
  flex-wrap: wrap;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
  transition: all 0.2s ease;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
  transform: translateY(-1px);
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

:deep(.el-table__header-wrapper) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
}

:deep(.el-table th) {
  background: transparent;
  color: #4299E1;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid rgba(66, 153, 225, 0.2);
  padding: 14px 12px;
}

:deep(.el-table td) {
  color: #4A5568;
  font-size: 13px;
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  padding: 14px 12px;
}

:deep(.el-table tr:hover > td) {
  background: rgba(66, 153, 225, 0.06);
}

:deep(.el-button--text) {
  color: #4299E1;
  font-weight: 500;
}

:deep(.el-button--text:hover) {
  color: #3182CE;
}

:deep(.el-button--danger) {
  color: #FC8181;
}

:deep(.el-button--danger:hover) {
  color: #F56565;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-tag--success) {
  background: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-color: rgba(72, 187, 120, 0.2);
}

:deep(.el-tag--warning) {
  background: rgba(214, 158, 46, 0.1);
  color: #D69E2E;
  border-color: rgba(214, 158, 46, 0.2);
}

:deep(.el-tag--info) {
  background: rgba(66, 153, 225, 0.1);
  color: #4299E1;
  border-color: rgba(66, 153, 225, 0.2);
}

:deep(.el-tag--danger) {
  background: rgba(252, 129, 129, 0.1);
  color: #FC8181;
  border-color: rgba(252, 129, 129, 0.2);
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-bottom: 1px solid rgba(66, 153, 225, 0.15);
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #1E293B;
  font-weight: 600;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid rgba(66, 153, 225, 0.15);
  padding: 16px 24px;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.15);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-alert) {
  border-radius: 8px;
  background: rgba(66, 153, 225, 0.08);
  border-color: rgba(66, 153, 225, 0.2);
}
</style>
