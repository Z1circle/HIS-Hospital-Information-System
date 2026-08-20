<template>
  <div class="charge-item-dict">
    <div class="page-actions">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索收费项目名称/编码..."
          prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
        <el-select v-model="filterCategory" placeholder="选择分类" clearable style="width: 160px; margin-left: 12px">
          <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
        <el-select v-model="filterInsurance" placeholder="医保类型" clearable style="width: 120px; margin-left: 12px">
          <el-option label="医保" :value="true" />
          <el-option label="自费" :value="false" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button icon="Download" @click="handleExport">导出数据</el-button>
        <el-button icon="Upload" @click="handleImport">批量导入</el-button>
        <el-button icon="Plus" type="primary" @click="handleAdd">新增收费项目</el-button>
      </div>
    </div>

    <el-table :data="filteredItems" border stripe size="small" v-loading="loading">
      <el-table-column prop="code" label="项目编码" width="120" />
      <el-table-column prop="name" label="项目名称" min-width="200" />
      <el-table-column prop="category" label="分类" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="单价(元)" width="100">
        <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="医保" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_insurance ? 'success' : 'info'" size="small">
            {{ row.is_insurance ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="insurance_ratio" label="医保比例" width="100">
        <template #default="{ row }">
          {{ row.is_insurance ? (Number(row.insurance_ratio) * 100).toFixed(0) + '%' : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="hospital_ratio" label="医院比例" width="100">
        <template #default="{ row }">
          {{ (Number(row.hospital_ratio) * 100).toFixed(0) + '%' }}
        </template>
      </el-table-column>
      <el-table-column prop="patient_ratio" label="个人比例" width="100">
        <template #default="{ row }">
          {{ (Number(row.patient_ratio) * 100).toFixed(0) + '%' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" text icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" text icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑收费项目' : '新增收费项目'" width="550px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="项目编码" prop="code">
          <el-input v-model="form.code" :disabled="isEdit" placeholder="如：REG001" />
        </el-form-item>
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价(元)" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否医保">
          <el-switch v-model="form.is_insurance" @change="onInsuranceChange" />
        </el-form-item>
        <el-form-item v-if="form.is_insurance" label="医保比例">
          <el-input-number v-model="form.insurance_ratio" :min="0" :max="1" :precision="2" :step="0.05" style="width: 100%" />
        </el-form-item>
        <el-form-item label="医院比例">
          <el-input-number v-model="form.hospital_ratio" :min="0" :max="1" :precision="2" :step="0.05" style="width: 100%" />
        </el-form-item>
        <el-form-item label="个人比例">
          <el-input-number v-model="form.patient_ratio" :min="0" :max="1" :precision="2" :step="0.05" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入收费项目" width="500px">
      <el-upload
        drag
        action="/api/admin/charge-items/import"
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
            支持 CSV、Excel 格式，请确保文件包含：项目编码、项目名称、分类、单价等字段
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

const searchKeyword = ref('')
const filterCategory = ref('')
const filterInsurance = ref('')
const loading = ref(false)
const formVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const chargeItems = ref<any[]>([])

const categories = ['挂号费', '诊疗费', '药品费', '检查费', '治疗费', '其他费用']

const filteredItems = computed(() => {
  return chargeItems.value.filter(item => {
    const matchKeyword = !searchKeyword.value ||
      item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      item.code.toLowerCase().includes(searchKeyword.value.toLowerCase())
    const matchCategory = !filterCategory.value || item.category === filterCategory.value
    const matchInsurance = filterInsurance.value === '' || 
      (filterInsurance.value === 'true' ? item.is_insurance : !item.is_insurance)
    return matchKeyword && matchCategory && matchInsurance
  })
})

const form = ref({
  id: 0,
  code: '',
  name: '',
  category: '',
  price: 0,
  is_insurance: true,
  insurance_ratio: 0.8,
  hospital_ratio: 0,
  patient_ratio: 0.2
})

const formRules = {
  code: [{ required: true, message: '请输入项目编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/charge/items')
    chargeItems.value = res.data || []
  } catch {
    chargeItems.value = [
      { id: 1, code: 'REG001', name: '普通门诊挂号费', category: '挂号费', price: 10.00, is_insurance: true, insurance_ratio: 0.5, hospital_ratio: 0, patient_ratio: 0.5 },
      { id: 2, code: 'REG002', name: '专家门诊挂号费', category: '挂号费', price: 30.00, is_insurance: true, insurance_ratio: 0.5, hospital_ratio: 0, patient_ratio: 0.5 },
      { id: 3, code: 'REG003', name: '知名专家挂号费', category: '挂号费', price: 50.00, is_insurance: true, insurance_ratio: 0.3, hospital_ratio: 0, patient_ratio: 0.7 },
      { id: 4, code: 'CON001', name: '门诊诊疗费', category: '诊疗费', price: 20.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 5, code: 'CON002', name: '专家诊疗费', category: '诊疗费', price: 40.00, is_insurance: true, insurance_ratio: 0.6, hospital_ratio: 0, patient_ratio: 0.4 },
      { id: 6, code: 'EXA001', name: '血常规检查', category: '检查费', price: 25.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 7, code: 'EXA002', name: '尿常规检查', category: '检查费', price: 15.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 8, code: 'EXA003', name: '生化全套', category: '检查费', price: 350.00, is_insurance: true, insurance_ratio: 0.7, hospital_ratio: 0, patient_ratio: 0.3 },
      { id: 9, code: 'EXA004', name: '胸部X光片', category: '检查费', price: 80.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 10, code: 'EXA005', name: '胸部CT平扫', category: '检查费', price: 420.00, is_insurance: true, insurance_ratio: 0.6, hospital_ratio: 0, patient_ratio: 0.4 },
      { id: 11, code: 'EXA006', name: '心电图', category: '检查费', price: 30.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 12, code: 'TRE001', name: '肌肉注射费', category: '治疗费', price: 5.00, is_insurance: true, insurance_ratio: 0.9, hospital_ratio: 0, patient_ratio: 0.1 },
      { id: 13, code: 'TRE002', name: '静脉输液费', category: '治疗费', price: 10.00, is_insurance: true, insurance_ratio: 0.9, hospital_ratio: 0, patient_ratio: 0.1 },
      { id: 14, code: 'TRE003', name: '雾化吸入治疗', category: '治疗费', price: 20.00, is_insurance: true, insurance_ratio: 0.85, hospital_ratio: 0, patient_ratio: 0.15 },
      { id: 15, code: 'TRE004', name: '针灸治疗', category: '治疗费', price: 45.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
      { id: 16, code: 'TRE005', name: '推拿按摩', category: '治疗费', price: 60.00, is_insurance: true, insurance_ratio: 0.7, hospital_ratio: 0, patient_ratio: 0.3 },
      { id: 17, code: 'MED001', name: '西药费', category: '药品费', price: 0.00, is_insurance: true, insurance_ratio: 0.85, hospital_ratio: 0, patient_ratio: 0.15 },
      { id: 18, code: 'MED002', name: '中药费', category: '药品费', price: 0.00, is_insurance: true, insurance_ratio: 0.9, hospital_ratio: 0, patient_ratio: 0.1 },
      { id: 19, code: 'MED003', name: '中成药费', category: '药品费', price: 0.00, is_insurance: true, insurance_ratio: 0.85, hospital_ratio: 0, patient_ratio: 0.15 },
      { id: 20, code: 'OTH001', name: '病历工本费', category: '其他费用', price: 1.00, is_insurance: false, insurance_ratio: 0, hospital_ratio: 0, patient_ratio: 1 },
      { id: 21, code: 'OTH002', name: '输液护理费', category: '其他费用', price: 15.00, is_insurance: true, insurance_ratio: 0.8, hospital_ratio: 0, patient_ratio: 0.2 },
    ]
  }
  loading.value = false
}

const handleSearch = () => {}

const handleAdd = () => {
  isEdit.value = false
  form.value = {
    id: 0,
    code: '',
    name: '',
    category: '',
    price: 0,
    is_insurance: true,
    insurance_ratio: 0.8,
    hospital_ratio: 0,
    patient_ratio: 0.2
  }
  formVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    price: row.price || 0,
    is_insurance: row.is_insurance || false,
    insurance_ratio: row.insurance_ratio || 0,
    hospital_ratio: row.hospital_ratio || 0,
    patient_ratio: row.patient_ratio || 0
  }
  formVisible.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除收费项目"${row.name}"吗？`, '确认删除', { type: 'warning' })
    .then(async () => {
      try {
        await axios.delete(`/api/admin/charge-items/${row.id}`)
        chargeItems.value = chargeItems.value.filter(item => item.id !== row.id)
        ElMessage.success('删除成功')
      } catch {
        ElMessage.error('删除失败')
      }
    })
}

const onInsuranceChange = () => {
  if (!form.value.is_insurance) {
    form.value.insurance_ratio = 0
  } else if (form.value.insurance_ratio === 0) {
    form.value.insurance_ratio = 0.8
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (isEdit.value) {
        await axios.put(`/api/admin/charge-items/${form.value.id}`, form.value)
      } else {
        await axios.post('/api/admin/charge-items', form.value)
      }
      ElMessage.success('保存成功')
      formVisible.value = false
      loadData()
    } catch {
      ElMessage.error('保存失败')
    }
  })
}

const handleExport = () => {
  const headers = ['项目编码', '项目名称', '分类', '单价', '是否医保', '医保比例', '医院比例', '个人比例']
  const csvContent = headers.join(',') + '\n' +
    chargeItems.value.map(item => 
      `${item.code},${item.name},${item.category},${item.price},${item.is_insurance ? '是' : '否'},${item.insurance_ratio},${item.hospital_ratio},${item.patient_ratio}`
    ).join('\n')
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `收费项目字典_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const handleImport = () => {
  importDialogVisible.value = true
}

const handleImportSuccess = (response: any) => {
  ElMessage.success(`成功导入 ${response.count || 0} 条收费项目数据`)
  importDialogVisible.value = false
  loadData()
}

const handleImportError = () => {
  ElMessage.error('导入失败，请检查文件格式')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.charge-item-dict { padding: 0; }
.page-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.search-bar { display: flex; align-items: center; }
.action-buttons { display: flex; gap: 12px; }
</style>