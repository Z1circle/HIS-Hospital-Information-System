<template>
  <div class="rate-setting-page">
    <div class="rate-tabs">
      <el-tabs v-model="activeTab" class="rate-tabs-content">
        <el-tab-pane label="职工医保" name="employee">
          <div class="rate-content glass-card">
            <div class="rate-header">
              <h3>职工医保费率设置</h3>
              <el-button type="primary" icon="Edit" @click="handleEdit('employee')">
                修改费率
              </el-button>
            </div>

            <div class="rate-grid">
              <div class="rate-item">
                <div class="rate-label">门诊起付线</div>
                <div class="rate-value">¥{{ employeeRates.outpatient_deductible }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">门诊报销比例</div>
                <div class="rate-value">{{ employeeRates.outpatient_ratio }}%</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">住院起付线</div>
                <div class="rate-value">¥{{ employeeRates.inpatient_deductible }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">住院报销比例</div>
                <div class="rate-value">{{ employeeRates.inpatient_ratio }}%</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">年度封顶线</div>
                <div class="rate-value">¥{{ employeeRates.annual_limit }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">大额医疗</div>
                <div class="rate-value">¥{{ employeeRates.large_amount }}</div>
              </div>
            </div>

            <div class="rate-details">
              <h4>分级报销比例</h4>
              <el-table :data="employeeRates.tiers" stripe style="width: 100%">
                <el-table-column prop="level" label="级别" width="120" />
                <el-table-column prop="amount_range" label="金额范围" min-width="200" />
                <el-table-column prop="ratio" label="报销比例" width="120">
                  <template #default="{ row }">
                    {{ row.ratio }}%
                  </template>
                </el-table-column>
                <el-table-column prop="self_pay" label="自付比例" width="120">
                  <template #default="{ row }">
                    {{ row.self_pay }}%
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="居民医保" name="resident">
          <div class="rate-content glass-card">
            <div class="rate-header">
              <h3>居民医保费率设置</h3>
              <el-button type="primary" icon="Edit" @click="handleEdit('resident')">
                修改费率
              </el-button>
            </div>

            <div class="rate-grid">
              <div class="rate-item">
                <div class="rate-label">门诊起付线</div>
                <div class="rate-value">¥{{ residentRates.outpatient_deductible }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">门诊报销比例</div>
                <div class="rate-value">{{ residentRates.outpatient_ratio }}%</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">住院起付线</div>
                <div class="rate-value">¥{{ residentRates.inpatient_deductible }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">住院报销比例</div>
                <div class="rate-value">{{ residentRates.inpatient_ratio }}%</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">年度封顶线</div>
                <div class="rate-value">¥{{ residentRates.annual_limit }}</div>
              </div>
              <div class="rate-item">
                <div class="rate-label">大病保险</div>
                <div class="rate-value">¥{{ residentRates.large_amount }}</div>
              </div>
            </div>

            <div class="rate-details">
              <h4>分级报销比例</h4>
              <el-table :data="residentRates.tiers" stripe style="width: 100%">
                <el-table-column prop="level" label="级别" width="120" />
                <el-table-column prop="amount_range" label="金额范围" min-width="200" />
                <el-table-column prop="ratio" label="报销比例" width="120">
                  <template #default="{ row }">
                    {{ row.ratio }}%
                  </template>
                </el-table-column>
                <el-table-column prop="self_pay" label="自付比例" width="120">
                  <template #default="{ row }">
                    {{ row.self_pay }}%
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 费率编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="修改费率" width="600px" :close-on-click-modal="false">
      <el-form :model="rateForm" label-width="140px">
        <el-form-item label="门诊起付线">
          <el-input-number v-model="rateForm.outpatient_deductible" :min="0" :step="100" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>
        <el-form-item label="门诊报销比例">
          <el-input-number v-model="rateForm.outpatient_ratio" :min="0" :max="100" :step="1" />
          <span style="margin-left: 8px">%</span>
        </el-form-item>
        <el-form-item label="住院起付线">
          <el-input-number v-model="rateForm.inpatient_deductible" :min="0" :step="100" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>
        <el-form-item label="住院报销比例">
          <el-input-number v-model="rateForm.inpatient_ratio" :min="0" :max="100" :step="1" />
          <span style="margin-left: 8px">%</span>
        </el-form-item>
        <el-form-item label="年度封顶线">
          <el-input-number v-model="rateForm.annual_limit" :min="0" :step="1000" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>
        <el-form-item :label="activeTab === 'employee' ? '大额医疗' : '大病保险'">
          <el-input-number v-model="rateForm.large_amount" :min="0" :step="1000" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('employee')
const editDialogVisible = ref(false)

const employeeRates = ref({
  outpatient_deductible: 500,
  outpatient_ratio: 70,
  inpatient_deductible: 1000,
  inpatient_ratio: 85,
  annual_limit: 500000,
  large_amount: 200000,
  tiers: [
    { level: '一级', amount_range: '0-10000元', ratio: 90, self_pay: 10 },
    { level: '二级', amount_range: '10001-30000元', ratio: 85, self_pay: 15 },
    { level: '三级', amount_range: '30001-50000元', ratio: 80, self_pay: 20 },
    { level: '四级', amount_range: '50001元以上', ratio: 75, self_pay: 25 }
  ]
})

const residentRates = ref({
  outpatient_deductible: 200,
  outpatient_ratio: 60,
  inpatient_deductible: 600,
  inpatient_ratio: 75,
  annual_limit: 300000,
  large_amount: 150000,
  tiers: [
    { level: '一级', amount_range: '0-10000元', ratio: 85, self_pay: 15 },
    { level: '二级', amount_range: '10001-30000元', ratio: 80, self_pay: 20 },
    { level: '三级', amount_range: '30001-50000元', ratio: 75, self_pay: 25 },
    { level: '四级', amount_range: '50001元以上', ratio: 70, self_pay: 30 }
  ]
})

const rateForm = ref({
  outpatient_deductible: 0,
  outpatient_ratio: 0,
  inpatient_deductible: 0,
  inpatient_ratio: 0,
  annual_limit: 0,
  large_amount: 0
})

const handleEdit = (type: string) => {
  const rates = type === 'employee' ? employeeRates.value : residentRates.value
  rateForm.value = { ...rates }
  editDialogVisible.value = true
}

const saveRate = () => {
  const rates = activeTab.value === 'employee' ? employeeRates.value : residentRates.value
  Object.assign(rates, rateForm.value)
  ElMessage.success('费率修改成功')
  editDialogVisible.value = false
}
</script>

<style scoped>
.rate-setting-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rate-tabs-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  color: #718096;
  font-size: 15px;
  font-weight: 500;
  padding: 0 40px;
  height: 48px;
  line-height: 48px;
  border-radius: 10px;
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  color: #4299E1;
}

:deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  color: white;
  font-weight: 600;
  padding: 0 60px;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.35);
  margin: 0 4px;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

.rate-content {
  padding: 28px;
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

.rate-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1A202C;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 40px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.25);
}

.rate-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .rate-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.rate-item {
  padding: 20px;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-radius: 14px;
  text-align: center;
  transition: all 0.3s ease;
}

.rate-item:hover {
  background: rgba(66, 153, 225, 0.1);
  transform: translateY(-2px);
}

.rate-label {
  font-size: 13px;
  color: #718096;
  margin-bottom: 12px;
}

.rate-value {
  font-size: 28px;
  font-weight: 700;
  color: #4299E1;
  font-family: 'DIN', sans-serif;
}

.rate-details {
  margin-top: 32px;
}

.rate-details h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2D3748;
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  color: #4299E1;
  font-weight: 600;
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

:deep(.el-table tr) {
  background: rgba(255, 255, 255, 0.95);
}

:deep(.el-table tr:hover > td) {
  background: rgba(66, 153, 225, 0.05) !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  color: #4A5568;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(66, 153, 225, 0.03);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-input-number .el-input__wrapper:hover) {
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.15);
}

:deep(.el-input-number .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

:deep(.el-input-number .el-input__inner) {
  color: #2D3748;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}
</style>