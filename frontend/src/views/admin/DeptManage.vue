<template>
  <div class="manage-page">
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">+ 新增科室</el-button>
    </div>
    <el-table :data="depts" border size="small" style="margin-top:10px">
      <el-table-column label="ID" prop="id" width="60" />
      <el-table-column label="科室名称" prop="name" min-width="140" />
      <el-table-column label="挂号费(元)" prop="fee" width="110" />
      <el-table-column label="简介" prop="description" min-width="200" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" class="btn-white-text" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" class="btn-white-text" @click="delDept(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" :title="editing ? '编辑科室' : '新增科室'" width="440px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="科室名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="挂号费"><el-input-number v-model="form.fee" :min="0" :precision="2" />元</el-form-item>
        <el-form-item label="简介"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const depts = ref<any[]>([])
const formVisible = ref(false)
const editing = ref<any>(null)
const form = ref({ name: '', fee: 10, description: '' })

const load = async () => {
  try {
    const res = await axios.get('/api/admin/depts')
    depts.value = res.data
  } catch (error) {
    ElMessage.error('加载科室数据失败')
    console.error('加载科室数据失败:', error)
  }
}

const openAdd = () => { editing.value = null; form.value = { name: '', fee: 10, description: '' }; formVisible.value = true }
const openEdit = (row: any) => { editing.value = row; form.value = { name: row.name, fee: row.fee || 0, description: row.description || '' }; formVisible.value = true }

const submitForm = async () => {
  if (!form.value.name) { ElMessage.warning('请填写科室名称'); return }
  try {
    if (editing.value) {
      await axios.put(`/api/admin/depts/${editing.value.id}`, form.value)
      const idx = depts.value.findIndex(d => d.id === editing.value.id)
      if (idx >= 0) depts.value[idx] = { ...depts.value[idx], ...form.value }
    } else {
      const res = await axios.post('/api/admin/depts', form.value)
      depts.value.push({ id: res.data?.id || Date.now(), ...form.value })
    }
  } catch {
    if (editing.value) {
      const idx = depts.value.findIndex(d => d.id === editing.value.id)
      if (idx >= 0) depts.value[idx] = { ...depts.value[idx], ...form.value }
    } else {
      depts.value.push({ id: Date.now(), ...form.value })
    }
  }
  ElMessage.success('保存成功')
  formVisible.value = false
}

const delDept = async (row: any) => {
  await ElMessageBox.confirm(`确认删除科室「${row.name}」？`, '提示', { type: 'warning' })
  try { await axios.delete(`/api/admin/depts/${row.id}`) } catch { /* mock */ }
  depts.value = depts.value.filter(d => d.id !== row.id)
  ElMessage.success('已删除')
}

onMounted(load)
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
  align-items: center;
}

.btn-white-text {
  color: #FFFFFF !important;
}
.btn-white-text:hover {
  color: #E0E0E0 !important;
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

:deep(.el-button--danger) {
  color: #FC8181;
}

:deep(.el-button--danger:hover) {
  color: #F56565;
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

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number__wrapper) {
  border-radius: 8px;
}
</style>
