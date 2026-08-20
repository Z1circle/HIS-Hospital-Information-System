<template>
  <div class="insurance-mapping-page">
    <div class="page-actions">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索药品/项目名称..."
          prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
        <el-select v-model="filterStatus" placeholder="对码状态" clearable style="width: 150px; margin-left: 12px">
          <el-option label="已对码" value="matched" />
          <el-option label="未对码" value="unmatched" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button icon="Refresh" @click="handleSync">同步医保目录</el-button>
        <el-button icon="Download" @click="handleExport">导出对码表</el-button>
        <el-button icon="Plus" type="primary" @click="handleAdd">新增对码</el-button>
      </div>
    </div>

    <div class="mapping-table glass-card">
      <el-table :data="filteredMappings" stripe style="width: 100%">
        <el-table-column prop="hospital_code" label="本院编码" width="120" />
        <el-table-column prop="hospital_name" label="本院名称" min-width="180" />
        <el-table-column prop="insurance_code" label="医保编码" width="120" />
        <el-table-column prop="insurance_name" label="医保名称" min-width="180" />
        <el-table-column prop="status" label="对码状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'matched' ? 'success' : 'warning'" size="small">
              {{ row.status === 'matched' ? '已对码' : '未对码' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="match_rate" label="匹配度" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="row.match_rate"
              :color="getMatchRateColor(row.match_rate)"
              :stroke-width="6"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link icon="Edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button size="small" type="success" link icon="Connection" @click="handleAutoMatch(row)">
              自动匹配
            </el-button>
            <el-button size="small" type="danger" link icon="Delete" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑对码' : '新增对码'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="mappingForm" :rules="mappingRules" ref="mappingFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="本院编码" prop="hospital_code">
              <el-input v-model="mappingForm.hospital_code" placeholder="请输入本院编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="本院名称" prop="hospital_name">
              <el-input v-model="mappingForm.hospital_name" placeholder="请输入本院名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="医保编码" prop="insurance_code">
              <el-input v-model="mappingForm.insurance_code" placeholder="请输入医保编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="医保名称" prop="insurance_name">
              <el-input v-model="mappingForm.insurance_name" placeholder="请输入医保名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="对码状态" prop="status">
          <el-radio-group v-model="mappingForm.status">
            <el-radio value="matched">已对码</el-radio>
            <el-radio value="unmatched">未对码</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="mappingForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMapping">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const searchKeyword = ref('')
const filterStatus = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const mappingFormRef = ref()

const mappingList = ref([
  { id: 1, hospital_code: 'DRG001', hospital_name: '阿莫西林胶囊', insurance_code: 'X0001', insurance_name: '阿莫西林胶囊(0.5g*24粒)', status: 'matched', match_rate: 100, remark: '' },
  { id: 2, hospital_code: 'DRG002', hospital_name: '布洛芬缓释胶囊', insurance_code: 'X0002', insurance_name: '布洛芬缓释胶囊(0.3g*24粒)', status: 'matched', match_rate: 95, remark: '' },
  { id: 3, hospital_code: 'DRG003', hospital_name: '维生素C片', insurance_code: '', insurance_name: '', status: 'unmatched', match_rate: 0, remark: '待对码' },
  { id: 4, hospital_code: 'DRG004', hospital_name: '二甲双胍片', insurance_code: 'X0004', insurance_name: '盐酸二甲双胍片(0.5g*60片)', status: 'matched', match_rate: 98, remark: '' },
  { id: 5, hospital_code: 'DRG005', hospital_name: '头孢克洛胶囊', insurance_code: 'X0005', insurance_name: '头孢克洛胶囊(0.25g*12粒)', status: 'matched', match_rate: 92, remark: '' },
  { id: 6, hospital_code: 'DRG006', hospital_name: '注射用青霉素钠', insurance_code: 'X0006', insurance_name: '注射用青霉素钠(80万U)', status: 'matched', match_rate: 100, remark: '甲类医保' },
  { id: 7, hospital_code: 'DRG007', hospital_name: '格列美脲片', insurance_code: 'X0007', insurance_name: '格列美脲片(2mg*30片)', status: 'matched', match_rate: 96, remark: '' },
  { id: 8, hospital_code: 'DRG008', hospital_name: '硝苯地平控释片', insurance_code: 'X0008', insurance_name: '硝苯地平控释片(30mg*7片)', status: 'matched', match_rate: 90, remark: '医保乙类' },
  { id: 9, hospital_code: 'DRG009', hospital_name: '奥美拉唑肠溶胶囊', insurance_code: 'X0009', insurance_name: '奥美拉唑(20mg*14粒)', status: 'matched', match_rate: 97, remark: '' },
  { id: 10, hospital_code: 'DRG010', hospital_name: '阿托伐他汀钙片', insurance_code: 'X0010', insurance_name: '阿托伐他汀(20mg*7片)', status: 'matched', match_rate: 99, remark: '' },
  { id: 11, hospital_code: 'SRG001', hospital_name: '血常规检查', insurance_code: 'Y0001', insurance_name: '血细胞分析(五分类)', status: 'matched', match_rate: 100, remark: '常规检查' },
  { id: 12, hospital_code: 'SRG002', hospital_name: '肝功能全套', insurance_code: 'Y0002', insurance_name: '肝功能检查(全套)', status: 'matched', match_rate: 95, remark: '' },
  { id: 13, hospital_code: 'SRG003', hospital_name: '胸部CT平扫', insurance_code: 'Y0003', insurance_name: 'X线计算机体层(CT)胸部扫描', status: 'matched', match_rate: 100, remark: '' },
  { id: 14, hospital_code: 'SRG004', hospital_name: '心电图检查', insurance_code: 'Y0004', insurance_name: '常规心电图检查', status: 'matched', match_rate: 100, remark: '' },
  { id: 15, hospital_code: 'SRG005', hospital_name: '心脏彩超', insurance_code: '', insurance_name: '', status: 'unmatched', match_rate: 0, remark: '医保目录更新中' },
  { id: 16, hospital_code: 'SRG006', hospital_name: '胃镜检查', insurance_code: 'Y0006', insurance_name: '电子胃镜检查', status: 'matched', match_rate: 93, remark: '' },
  { id: 17, hospital_code: 'DRG011', hospital_name: '蒙脱石散', insurance_code: '', insurance_name: '', status: 'unmatched', match_rate: 0, remark: '新进药品待对码' },
])

const mappingForm = ref({
  id: 0,
  hospital_code: '',
  hospital_name: '',
  insurance_code: '',
  insurance_name: '',
  status: 'matched',
  match_rate: 0,
  remark: ''
})

const mappingRules = {
  hospital_code: [{ required: true, message: '请输入本院编码', trigger: 'blur' }],
  hospital_name: [{ required: true, message: '请输入本院名称', trigger: 'blur' }],
  insurance_code: [{ required: true, message: '请输入医保编码', trigger: 'blur' }],
  insurance_name: [{ required: true, message: '请输入医保名称', trigger: 'blur' }]
}

const filteredMappings = computed(() => {
  return mappingList.value.filter(item => {
    const matchKeyword = !searchKeyword.value ||
      item.hospital_name.includes(searchKeyword.value) ||
      item.insurance_name?.includes(searchKeyword.value)
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchKeyword && matchStatus
  })
})

const getMatchRateColor = (rate: number) => {
  if (rate >= 90) return '#68D391'
  if (rate >= 70) return '#F6E05E'
  return '#FC8181'
}

const handleSearch = () => {}

const handleAdd = () => {
  isEdit.value = false
  mappingForm.value = {
    id: 0,
    hospital_code: '',
    hospital_name: '',
    insurance_code: '',
    insurance_name: '',
    status: 'matched',
    match_rate: 0,
    remark: ''
  }
  dialogVisible.value = true
}

const handleEdit = (item: any) => {
  isEdit.value = true
  mappingForm.value = { ...item }
  dialogVisible.value = true
}

const handleAutoMatch = (item: any) => {
  const loading = ElMessage({
    message: '正在自动匹配...',
    type: 'info',
    duration: 0
  })
  setTimeout(() => {
    loading.close()
    item.status = 'matched'
    item.match_rate = Math.floor(Math.random() * 20) + 80
    ElMessage.success('自动匹配成功')
  }, 1500)
}

const handleDelete = (item: any) => {
  ElMessageBox.confirm(`确定要删除对码"${item.hospital_name}"吗？`, '确认删除', {
    type: 'warning'
  }).then(() => {
    mappingList.value = mappingList.value.filter(m => m.id !== item.id)
    ElMessage.success('删除成功')
  })
}

const saveMapping = () => {
  mappingFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      if (isEdit.value) {
        const index = mappingList.value.findIndex(m => m.id === mappingForm.value.id)
        if (index !== -1) {
          mappingList.value[index] = { ...mappingForm.value }
        }
        ElMessage.success('修改成功')
      } else {
        mappingList.value.push({
          ...mappingForm.value,
          id: Date.now(),
          match_rate: 100
        })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const handleSync = () => {
  const loading = ElMessage({
    message: '正在同步医保目录...',
    type: 'info',
    duration: 0
  })
  setTimeout(() => {
    loading.close()
    ElMessage.success('同步成功，共更新 128 条数据')
  }, 2000)
}

const handleExport = () => {
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.insurance-mapping-page {
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

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  color: #4299E1;
  font-weight: 600;
  border-bottom: 2px solid rgba(66, 153, 225, 0.15);
}

:deep(.el-table tr) {
  background: transparent;
}

:deep(.el-table tr:hover > td) {
  background: rgba(66, 153, 225, 0.06) !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  color: #4A5568;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(66, 153, 225, 0.03);
}

:deep(.el-progress-bar__outer) {
  background: rgba(66, 153, 225, 0.1);
}

:deep(.el-button--small) {
  border-radius: 8px;
  font-size: 13px;
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

:deep(.el-input__wrapper) {
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.1);
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

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-tag--success) {
  background: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-color: rgba(72, 187, 120, 0.2);
}

:deep(.el-tag--warning) {
  background: rgba(250, 204, 21, 0.1);
  color: #ECC94B;
  border-color: rgba(250, 204, 21, 0.2);
}
</style>