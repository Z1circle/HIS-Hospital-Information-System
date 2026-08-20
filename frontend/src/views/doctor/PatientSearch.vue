<template>
  <div class="patient-search-page">
    <div class="page-header">
      <el-button size="small" @click="$emit('back')" icon="ArrowLeft">返回</el-button>
      <h2>患者检索</h2>
    </div>

    <div class="search-container">
      <el-card shadow="hover">
        <div class="basic-search">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入患者姓名、手机号或身份证号"
            prefix-icon="Search"
            size="large"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" size="large" @click="handleSearch">检索</el-button>
        </div>

        <div class="advanced-filter" v-if="showAdvanced">
          <el-divider content-position="left">高级筛选</el-divider>
          <el-form :model="searchForm" inline>
            <el-form-item label="性别">
              <el-select v-model="searchForm.gender" placeholder="全部" clearable>
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
            <el-form-item label="年龄范围">
              <el-input-number v-model="searchForm.minAge" :min="0" :max="150" size="small" />
              <span style="margin: 0 4px;">-</span>
              <el-input-number v-model="searchForm.maxAge" :min="0" :max="150" size="small" />
            </el-form-item>
            <el-form-item label="医保类型">
              <el-select v-model="searchForm.insuranceType" placeholder="全部" clearable>
                <el-option label="自费" value="自费" />
                <el-option label="医保" value="医保" />
                <el-option label="新农合" value="新农合" />
                <el-option label="公费医疗" value="公费医疗" />
              </el-select>
            </el-form-item>
            <el-form-item label="就诊时间">
              <el-date-picker
                v-model="searchForm.visitDate"
                type="date"
                placeholder="选择日期"
                size="small"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="filter-actions">
          <el-button size="small" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起' : '展开' }}高级筛选
          </el-button>
          <el-button size="small" @click="resetForm">重置</el-button>
        </div>
      </el-card>
    </div>

    <div class="results-container">
      <el-card shadow="hover">
        <div class="results-header">
          <span>共 <strong>{{ total }}</strong> 条记录</span>
        </div>

        <el-table
          :data="patients"
          v-loading="loading"
          stripe
          border
          :empty-text="loading ? '加载中...' : '未找到匹配的患者'"
        >
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="gender" label="性别" width="60" />
          <el-table-column prop="age" label="年龄" width="60" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column prop="insurance_type" label="医保类型" width="100" />
          <el-table-column prop="card_no" label="就诊卡号" width="150" />
          <el-table-column prop="last_visit_date" label="最近就诊" width="120" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="viewPatient(scope.row)">查看详情</el-button>
              <el-button size="small" type="primary" @click="quickVisit(scope.row)">快速接诊</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination" v-if="total > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next, jumper"
            @current-change="handleSearch"
          />
        </div>
      </el-card>
    </div>

    <el-dialog v-model="detailVisible" :title="`患者详情 - ${selectedPatient?.name}`" width="600px">
      <el-descriptions :column="2" border v-if="selectedPatient">
        <el-descriptions-item label="姓名">{{ selectedPatient.name }}</el-descriptions-item>
        <el-descriptions-item label="性别/年龄">{{ selectedPatient.gender }} / {{ selectedPatient.age }}岁</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ selectedPatient.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="就诊卡号">{{ selectedPatient.card_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ selectedPatient.id_card || '-' }}</el-descriptions-item>
        <el-descriptions-item label="医保类型">{{ selectedPatient.insurance_type }}</el-descriptions-item>
        <el-descriptions-item label="过敏史" v-if="selectedPatient.allergy">
          <el-tag type="danger" size="small">{{ selectedPatient.allergy }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="慢性病" v-if="selectedPatient.chronic_disease">
          <el-tag type="warning" size="small">{{ selectedPatient.chronic_disease }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间" :span="2">{{ selectedPatient.created_at || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="detail-actions" v-if="selectedPatient">
        <el-button type="primary" @click="quickVisit(selectedPatient)">快速接诊</el-button>
        <el-button @click="viewMedicalRecords(selectedPatient)">查看病历</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const loading = ref(false)
const showAdvanced = ref(false)
const detailVisible = ref(false)
const selectedPatient = ref<any>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const patients = ref<any[]>([])

const searchForm = reactive({
  keyword: '',
  gender: '',
  minAge: null as number | null,
  maxAge: null as number | null,
  insuranceType: '',
  visitDate: ''
})

const handleSearch = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.gender) params.gender = searchForm.gender
    if (searchForm.minAge !== null) params.minAge = searchForm.minAge
    if (searchForm.maxAge !== null) params.maxAge = searchForm.maxAge
    if (searchForm.insuranceType) params.insuranceType = searchForm.insuranceType
    if (searchForm.visitDate) params.visitDate = searchForm.visitDate

    const res = await axios.get('/api/patients/search', { params })
    patients.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('检索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  searchForm.keyword = ''
  searchForm.gender = ''
  searchForm.minAge = null
  searchForm.maxAge = null
  searchForm.insuranceType = ''
  searchForm.visitDate = ''
  currentPage.value = 1
}

const viewPatient = (patient: any) => {
  selectedPatient.value = patient
  detailVisible.value = true
}

const quickVisit = (patient: any) => {
  ElMessage.success(`已快速接诊患者：${patient.name}`)
  router.push('/doctor/outpatient')
}

const viewMedicalRecords = (patient: any) => {
  ElMessage.info(`查看患者 ${patient.name} 的病历记录`)
}
</script>

<style scoped>
.patient-search-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.search-container {
  margin-bottom: 20px;
}

.basic-search {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.basic-search .el-input {
  flex: 1;
}

.advanced-filter {
  margin-bottom: 12px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.results-container {
  min-height: 400px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>