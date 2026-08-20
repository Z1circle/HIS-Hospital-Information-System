<template>
  <div class="manage-page">
    <div class="toolbar">
      <el-input v-model="searchText" placeholder="搜索药品名称" prefix-icon="Search" style="width:220px" clearable />
      <el-select v-model="filterInsurance" placeholder="医保类型" clearable style="width:130px">
        <el-option label="甲类" value="甲" />
        <el-option label="乙类" value="乙" />
        <el-option label="自费" value="自费" />
      </el-select>
      <el-button icon="Download" @click="handleExportDrugs">导出数据</el-button>
      <el-button icon="Upload" @click="handleImportDrugs">导入数据</el-button>
      <el-button type="primary" @click="openAdd">+ 新增药品</el-button>
    </div>
    <el-table :data="filteredDrugs" border size="small" style="margin-top:10px">
      <el-table-column label="ID" prop="id" width="100" />
      <el-table-column label="药品名称" prop="name" min-width="140" />
      <el-table-column label="规格" prop="specification" width="130" />
      <el-table-column label="单价(元)" width="90">
        <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="库存" prop="actual_stock" width="80" />
      <el-table-column label="警戒线" prop="min_stock" width="80" />
      <el-table-column label="有效期" prop="expiry_date" width="110" />
      <el-table-column label="医保" prop="insurance_type" width="70" />
      <el-table-column label="皮试" width="70">
        <template #default="{ row }">
          <el-tag v-if="row.need_skin_test" type="danger" size="small">需要</el-tag>
          <span v-else style="color:#9E9E9E">无</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.actual_stock <= row.min_stock ? 'danger' : 'success'" size="small">
            {{ row.actual_stock <= row.min_stock ? '库存不足' : '正常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" text @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" text @click="delDrug(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" :title="editing ? '编辑药品' : '新增药品'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="药品名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="规格"><el-input v-model="form.specification" placeholder="如：0.5g*20粒" /></el-form-item>
        <el-form-item label="单价(元)"><el-input-number v-model="form.price" :min="0" :precision="2" :step="0.1" /></el-form-item>
        <el-form-item label="库存数量"><el-input-number v-model="form.actual_stock" :min="0" /></el-form-item>
        <el-form-item label="库存警戒线"><el-input-number v-model="form.min_stock" :min="0" /></el-form-item>
        <el-form-item label="有效期">
          <el-date-picker v-model="form.expiry_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="医保类型">
          <el-radio-group v-model="form.insurance_type">
            <el-radio value="甲">甲类</el-radio>
            <el-radio value="乙">乙类</el-radio>
            <el-radio value="自费">自费</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="需要皮试">
          <el-switch v-model="form.need_skin_test" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入药品对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入药品数据" width="500px">
      <el-upload
        drag
        action="/api/admin/drugs/import"
        accept=".csv,.xlsx,.xls"
        :on-success="handleImportSuccess"
        :on-error="handleImportError"
        :show-file-list="true"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 CSV、Excel 格式，请确保文件包含：药品名称、规格、单价、库存等字段
          </div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const drugs = ref<any[]>([])
const searchText = ref('')
const filterInsurance = ref('')
const formVisible = ref(false)
const editing = ref<any>(null)
const form = ref({ name: '', specification: '', price: 0, actual_stock: 0, min_stock: 10, expiry_date: '', insurance_type: '乙', need_skin_test: false })

const filteredDrugs = computed(() => {
  let list = drugs.value
  if (searchText.value) list = list.filter(d => d.name?.includes(searchText.value))
  if (filterInsurance.value) list = list.filter(d => d.insurance_type === filterInsurance.value)
  return list
})

const mockDrugs = [
  { id: 1, name: '阿莫西林胶囊', specification: '0.5g*20粒', price: 25.00, actual_stock: 50, locked_stock: 4, min_stock: 10, expiry_date: '2027-01-15', insurance_type: '乙', need_skin_test: false },
  { id: 2, name: '二甲双胍片', specification: '0.5g*30片', price: 12.00, actual_stock: 80, locked_stock: 2, min_stock: 20, expiry_date: '2027-06-01', insurance_type: '甲', need_skin_test: false },
  { id: 3, name: '头孢克肟片', specification: '0.1g*10片', price: 38.00, actual_stock: 30, locked_stock: 1, min_stock: 10, expiry_date: '2026-12-01', insurance_type: '乙', need_skin_test: false },
  { id: 4, name: '布洛芬胶囊', specification: '0.2g*24粒', price: 8.00, actual_stock: 120, locked_stock: 5, min_stock: 30, expiry_date: '2027-03-10', insurance_type: '甲', need_skin_test: false },
  { id: 5, name: '注射用青霉素钠', specification: '80万U/支', price: 1.50, actual_stock: 8, locked_stock: 4, min_stock: 10, expiry_date: '2025-12-01', insurance_type: '甲', need_skin_test: true },
  { id: 6, name: '罗红霉素分散片', specification: '0.15g*12片', price: 9.00, actual_stock: 40, locked_stock: 2, min_stock: 15, expiry_date: '2027-04-01', insurance_type: '乙', need_skin_test: false },
  { id: 7, name: '复方氨酚烷胺片', specification: '10片/盒', price: 6.00, actual_stock: 60, locked_stock: 3, min_stock: 20, expiry_date: '2027-02-01', insurance_type: '乙', need_skin_test: false },
  { id: 8, name: '清热解毒口服液', specification: '10ml*6支', price: 18.00, actual_stock: 35, locked_stock: 2, min_stock: 10, expiry_date: '2027-05-01', insurance_type: '甲', need_skin_test: false },
  { id: 9, name: '氨溴索片', specification: '30mg*20片', price: 15.00, actual_stock: 45, locked_stock: 2, min_stock: 15, expiry_date: '2027-08-01', insurance_type: '乙', need_skin_test: false },
  { id: 10, name: '地塞米松注射液', specification: '5mg/ml*1ml', price: 2.50, actual_stock: 25, locked_stock: 5, min_stock: 10, expiry_date: '2026-11-01', insurance_type: '甲', need_skin_test: false },
  { id: 11, name: '硝苯地平控释片', specification: '30mg*7片', price: 42.50, actual_stock: 30, locked_stock: 1, min_stock: 10, expiry_date: '2027-07-20', insurance_type: '甲', need_skin_test: false },
  { id: 12, name: '奥美拉唑肠溶胶囊', specification: '20mg*14粒', price: 28.80, actual_stock: 40, locked_stock: 2, min_stock: 15, expiry_date: '2027-09-15', insurance_type: '乙', need_skin_test: false },
  { id: 13, name: '阿托伐他汀钙片', specification: '20mg*7片', price: 65.00, actual_stock: 25, locked_stock: 1, min_stock: 10, expiry_date: '2027-06-30', insurance_type: '甲', need_skin_test: false },
  { id: 14, name: '蒙脱石散', specification: '3g*10袋', price: 12.00, actual_stock: 50, locked_stock: 3, min_stock: 20, expiry_date: '2027-04-25', insurance_type: '甲', need_skin_test: false },
  { id: 15, name: '板蓝根颗粒', specification: '10g*20袋', price: 15.00, actual_stock: 60, locked_stock: 4, min_stock: 20, expiry_date: '2027-08-10', insurance_type: '甲', need_skin_test: false },
  { id: 16, name: '连花清瘟胶囊', specification: '0.35g*36粒', price: 28.50, actual_stock: 45, locked_stock: 2, min_stock: 15, expiry_date: '2027-05-18', insurance_type: '乙', need_skin_test: false },
  { id: 17, name: '蒲地蓝消炎口服液', specification: '10ml*12支', price: 35.00, actual_stock: 35, locked_stock: 1, min_stock: 10, expiry_date: '2027-03-22', insurance_type: '乙', need_skin_test: false },
  { id: 18, name: '胰岛素注射液', specification: '300IU/3ml', price: 58.00, actual_stock: 20, locked_stock: 2, min_stock: 10, expiry_date: '2026-12-01', insurance_type: '甲', need_skin_test: false },
  { id: 19, name: '氯雷他定片', specification: '10mg*6片', price: 15.50, actual_stock: 55, locked_stock: 3, min_stock: 15, expiry_date: '2027-10-05', insurance_type: '乙', need_skin_test: false },
  { id: 20, name: '氯化钠注射液', specification: '0.9% 500ml', price: 4.80, actual_stock: 200, locked_stock: 20, min_stock: 50, expiry_date: '2026-08-15', insurance_type: '甲', need_skin_test: false },
  { id: 21, name: '葡萄糖注射液', specification: '5% 500ml', price: 5.20, actual_stock: 180, locked_stock: 15, min_stock: 50, expiry_date: '2026-09-20', insurance_type: '甲', need_skin_test: false },
  { id: 22, name: '布地奈德吸入剂', specification: '200μg*100吸', price: 96.00, actual_stock: 15, locked_stock: 1, min_stock: 5, expiry_date: '2027-02-28', insurance_type: '甲', need_skin_test: false },
  { id: 23, name: '复方丹参滴丸', specification: '27mg*180丸', price: 32.00, actual_stock: 40, locked_stock: 2, min_stock: 10, expiry_date: '2027-11-12', insurance_type: '甲', need_skin_test: false },
  { id: 24, name: '阿司匹林肠溶片', specification: '100mg*30片', price: 12.50, actual_stock: 70, locked_stock: 5, min_stock: 20, expiry_date: '2027-06-18', insurance_type: '甲', need_skin_test: false },
  { id: 25, name: '氢氯噻嗪片', specification: '25mg*100片', price: 8.60, actual_stock: 45, locked_stock: 3, min_stock: 15, expiry_date: '2027-09-30', insurance_type: '甲', need_skin_test: false },
  { id: 26, name: '格列美脲片', specification: '2mg*30片', price: 35.00, actual_stock: 30, locked_stock: 2, min_stock: 10, expiry_date: '2027-04-08', insurance_type: '甲', need_skin_test: false },
  { id: 27, name: '维生素C片', specification: '100mg*100片', price: 5.00, actual_stock: 100, locked_stock: 10, min_stock: 30, expiry_date: '2027-12-01', insurance_type: '甲', need_skin_test: false },
  { id: 28, name: '云南白药胶囊', specification: '0.25g*16粒', price: 35.00, actual_stock: 25, locked_stock: 1, min_stock: 10, expiry_date: '2027-07-15', insurance_type: '乙', need_skin_test: false },
  { id: 29, name: '感冒清热颗粒', specification: '12g*10袋', price: 18.00, actual_stock: 50, locked_stock: 3, min_stock: 15, expiry_date: '2027-08-22', insurance_type: '甲', need_skin_test: false },
  { id: 30, name: '感冒灵颗粒', specification: '10g*9袋', price: 12.00, actual_stock: 55, locked_stock: 4, min_stock: 20, expiry_date: '2027-06-15', insurance_type: '乙', need_skin_test: false },
]

const load = async () => {
  try {
    const res = await axios.get('/api/admin/drugs')
    drugs.value = res.data
  } catch {
    drugs.value = mockDrugs
  }
}

const openAdd = () => {
  editing.value = null
  form.value = { name: '', specification: '', price: 0, actual_stock: 0, min_stock: 10, expiry_date: '', insurance_type: '乙', need_skin_test: false }
  formVisible.value = true
}

const openEdit = (row: any) => {
  editing.value = row
  form.value = { name: row.name, specification: row.specification, price: row.price, actual_stock: row.actual_stock, min_stock: row.min_stock, expiry_date: row.expiry_date, insurance_type: row.insurance_type, need_skin_test: row.need_skin_test }
  formVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name) { ElMessage.warning('请填写药品名称'); return }
  try {
    if (editing.value) {
      await axios.put(`/api/admin/drugs/${editing.value.id}`, form.value)
      const idx = drugs.value.findIndex(d => d.id === editing.value.id)
      if (idx >= 0) drugs.value[idx] = { ...drugs.value[idx], ...form.value }
    } else {
      const res = await axios.post('/api/admin/drugs', form.value)
      drugs.value.push({ id: res.data?.id || Date.now(), locked_stock: 0, ...form.value })
    }
  } catch {
    if (editing.value) {
      const idx = drugs.value.findIndex(d => d.id === editing.value.id)
      if (idx >= 0) drugs.value[idx] = { ...drugs.value[idx], ...form.value }
    } else {
      drugs.value.push({ id: Date.now(), locked_stock: 0, ...form.value })
    }
  }
  ElMessage.success('保存成功')
  formVisible.value = false
}

const delDrug = async (row: any) => {
  await ElMessageBox.confirm(`确认删除药品「${row.name}」？`, '提示', { type: 'warning' })
  try { await axios.delete(`/api/admin/drugs/${row.id}`) } catch { /* mock */ }
  drugs.value = drugs.value.filter(d => d.id !== row.id)
  ElMessage.success('已删除')
}

// 导出药品数据
const handleExportDrugs = () => {
  const headers = ['ID', '药品名称', '规格', '单价', '库存', '警戒线', '有效期', '医保类型', '需皮试']
  const csvContent = headers.join(',') + '\n' +
    drugs.value.map(d => 
      `${d.id},${d.name},${d.specification},${d.price},${d.actual_stock},${d.min_stock},${d.expiry_date},${d.insurance_type},${d.need_skin_test ? '是' : '否'}`
    ).join('\n')
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `药品字典_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 导入药品数据
const importDialogVisible = ref(false)
const handleImportDrugs = () => {
  importDialogVisible.value = true
}

const handleImportSuccess = (response: any) => {
  ElMessage.success(`成功导入 ${response.count || 0} 条药品数据`)
  importDialogVisible.value = false
  load()
}

const handleImportError = () => {
  ElMessage.error('导入失败，请检查文件格式')
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
  margin-bottom: 0;
  align-items: center;
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

:deep(.el-input-number__wrapper) {
  border-radius: 8px;
}
</style>
