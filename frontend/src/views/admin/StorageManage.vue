<template>
  <div class="storage-page">
    <div class="storage-overview">
      <div class="overview-card glass-card">
        <div class="card-icon blue-icon">
          <el-icon :size="28"><Box /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">总库存金额</div>
          <div class="card-value">¥{{ formatNumber(totalAmount) }}</div>
        </div>
      </div>

      <div class="overview-card glass-card">
        <div class="card-icon green-icon">
          <el-icon :size="28"><Files /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">药品品种数</div>
          <div class="card-value">{{ formatNumber(totalVarieties) }}</div>
        </div>
      </div>

      <div class="overview-card glass-card">
        <div class="card-icon yellow-icon">
          <el-icon :size="28"><Warning /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">预警药品</div>
          <div class="card-value warning">{{ formatNumber(warningCount) }}</div>
        </div>
      </div>

      <div class="overview-card glass-card">
        <div class="card-icon purple-icon">
          <el-icon :size="28"><DataLine /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">本月入库</div>
          <div class="card-value">¥{{ formatNumber(monthlyInbound) }}</div>
        </div>
      </div>
    </div>

    <div class="storage-actions">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索药品名称/编码..."
          prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
        <el-select v-model="filterCategory" placeholder="药品分类" clearable style="width: 150px; margin-left: 12px">
          <el-option label="西药" value="western" />
          <el-option label="中成药" value="chinese" />
          <el-option label="中药饮片" value="herbal" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button icon="Document" @click="handleInbound">入库单</el-button>
        <el-button icon="Switch" @click="handleTransfer">调拨申请</el-button>
        <el-button icon="Notebook" @click="handleInventory">盘点</el-button>
        <el-button icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </div>

    <div class="storage-table glass-card">
      <el-table :data="filteredStock" stripe style="width: 100%">
        <el-table-column prop="code" label="药品编码" width="120" />
        <el-table-column prop="name" label="药品名称" min-width="180" />
        <el-table-column prop="spec" label="规格" width="120" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="stock" label="库存数量" width="100" align="right">
          <template #default="{ row }">
            <span :class="{ 'warning-text': row.stock <= row.min_stock }">
              {{ row.stock }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="最低库存" width="100" align="right" />
        <el-table-column prop="unit_price" label="单价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.unit_price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_value" label="库存金额" width="120" align="right">
          <template #default="{ row }">
            ¥{{ (row.stock * row.unit_price).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stock <= row.min_stock ? 'danger' : 'success'" size="small">
              {{ row.stock <= row.min_stock ? '预警' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link icon="View" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button size="small" type="success" link icon="ShoppingCart" @click="handlePurchase(row)">
              采购
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 入库单弹窗 -->
    <el-dialog v-model="inboundDialogVisible" title="入库单" width="800px" :close-on-click-modal="false">
      <el-form :model="inboundForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库单号">
              <el-input v-model="inboundForm.order_no" placeholder="自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入库类型">
              <el-select v-model="inboundForm.type" placeholder="请选择入库类型" style="width: 100%">
                <el-option label="采购入库" value="purchase" />
                <el-option label="调拨入库" value="transfer" />
                <el-option label="退货入库" value="return" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="供应商">
          <el-input v-model="inboundForm.supplier" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="inboundForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inboundDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInbound">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Box, Files, Warning, DataLine } from '@element-plus/icons-vue'

const searchKeyword = ref('')
const filterCategory = ref('')
const inboundDialogVisible = ref(false)

const totalAmount = ref(1256800)
const totalVarieties = ref(328)
const warningCount = ref(12)
const monthlyInbound = ref(356000)

const stockList = ref([
  { id: 1, code: 'DRG001', name: '阿莫西林胶囊', spec: '0.5g*20粒', category: 'western', stock: 1200, min_stock: 500, unit_price: 25.00, status: 'normal' },
  { id: 2, code: 'DRG002', name: '头孢克肟片', spec: '0.1g*10片', category: 'western', stock: 800, min_stock: 300, unit_price: 38.00, status: 'warning' },
  { id: 3, code: 'DRG003', name: '布洛芬胶囊', spec: '0.2g*24粒', category: 'western', stock: 1500, min_stock: 500, unit_price: 8.00, status: 'normal' },
  { id: 4, code: 'DRG004', name: '注射用青霉素钠', spec: '80万U/支', category: 'western', stock: 800, min_stock: 300, unit_price: 1.50, status: 'warning' },
  { id: 5, code: 'DRG005', name: '二甲双胍片', spec: '0.5g*30片', category: 'western', stock: 500, min_stock: 200, unit_price: 12.00, status: 'normal' },
  { id: 6, code: 'DRG006', name: '罗红霉素分散片', spec: '0.15g*12片', category: 'western', stock: 400, min_stock: 150, unit_price: 9.00, status: 'normal' },
  { id: 7, code: 'DRG007', name: '复方氨酚烷胺片', spec: '10片/盒', category: 'western', stock: 320, min_stock: 120, unit_price: 6.00, status: 'normal' },
  { id: 8, code: 'DRG008', name: '清热解毒口服液', spec: '10ml*6支', category: 'chinese', stock: 600, min_stock: 200, unit_price: 18.00, status: 'normal' },
  { id: 9, code: 'DRG009', name: '氨溴索片', spec: '30mg*20片', category: 'western', stock: 180, min_stock: 80, unit_price: 15.00, status: 'normal' },
  { id: 10, code: 'DRG010', name: '地塞米松注射液', spec: '5mg/ml*1ml', category: 'western', stock: 45, min_stock: 50, unit_price: 2.50, status: 'warning' },
  { id: 11, code: 'DRG011', name: '硝苯地平控释片', spec: '30mg*7片', category: 'western', stock: 30, min_stock: 10, unit_price: 42.50, status: 'normal' },
  { id: 12, code: 'DRG012', name: '奥美拉唑肠溶胶囊', spec: '20mg*14粒', category: 'western', stock: 40, min_stock: 15, unit_price: 28.80, status: 'normal' },
  { id: 13, code: 'DRG013', name: '阿托伐他汀钙片', spec: '20mg*7片', category: 'western', stock: 25, min_stock: 10, unit_price: 65.00, status: 'normal' },
  { id: 14, code: 'DRG014', name: '蒙脱石散', spec: '3g*10袋', category: 'western', stock: 50, min_stock: 20, unit_price: 12.00, status: 'normal' },
  { id: 15, code: 'TCM001', name: '板蓝根颗粒', spec: '10g*20袋', category: 'chinese', stock: 60, min_stock: 20, unit_price: 15.00, status: 'normal' },
  { id: 16, code: 'TCM002', name: '连花清瘟胶囊', spec: '0.35g*36粒', category: 'chinese', stock: 45, min_stock: 15, unit_price: 28.50, status: 'normal' },
  { id: 17, code: 'TCM003', name: '蒲地蓝消炎口服液', spec: '10ml*12支', category: 'chinese', stock: 35, min_stock: 10, unit_price: 35.00, status: 'normal' },
  { id: 18, code: 'DRG015', name: '胰岛素注射液', spec: '300IU/3ml', category: 'western', stock: 20, min_stock: 10, unit_price: 58.00, status: 'normal' },
  { id: 19, code: 'DRG016', name: '氯雷他定片', spec: '10mg*6片', category: 'western', stock: 55, min_stock: 15, unit_price: 15.50, status: 'normal' },
  { id: 20, code: 'DRG017', name: '氯化钠注射液', spec: '0.9% 500ml', category: 'western', stock: 2000, min_stock: 500, unit_price: 4.80, status: 'normal' },
  { id: 21, code: 'DRG018', name: '葡萄糖注射液', spec: '5% 500ml', category: 'western', stock: 1800, min_stock: 500, unit_price: 5.20, status: 'normal' },
  { id: 22, code: 'DRG019', name: '布地奈德吸入剂', spec: '200μg*100吸', category: 'western', stock: 15, min_stock: 5, unit_price: 96.00, status: 'normal' },
  { id: 23, code: 'TCM004', name: '复方丹参滴丸', spec: '27mg*180丸', category: 'chinese', stock: 40, min_stock: 10, unit_price: 32.00, status: 'normal' },
  { id: 24, code: 'DRG020', name: '阿司匹林肠溶片', spec: '100mg*30片', category: 'western', stock: 70, min_stock: 20, unit_price: 12.50, status: 'normal' },
  { id: 25, code: 'DRG021', name: '氢氯噻嗪片', spec: '25mg*100片', category: 'western', stock: 45, min_stock: 15, unit_price: 8.60, status: 'normal' },
  { id: 26, code: 'DRG022', name: '格列美脲片', spec: '2mg*30片', category: 'western', stock: 30, min_stock: 10, unit_price: 35.00, status: 'normal' },
  { id: 27, code: 'DRG023', name: '维生素C片', spec: '100mg*100片', category: 'western', stock: 100, min_stock: 30, unit_price: 5.00, status: 'normal' },
  { id: 28, code: 'TCM005', name: '云南白药胶囊', spec: '0.25g*16粒', category: 'chinese', stock: 25, min_stock: 10, unit_price: 35.00, status: 'normal' },
  { id: 29, code: 'TCM006', name: '感冒清热颗粒', spec: '12g*10袋', category: 'chinese', stock: 50, min_stock: 15, unit_price: 18.00, status: 'normal' },
])

const inboundForm = ref({
  order_no: 'IN' + Date.now(),
  type: 'purchase',
  supplier: '',
  remark: ''
})

const filteredStock = computed(() => {
  return stockList.value.filter(item => {
    const matchKeyword = !searchKeyword.value ||
      item.name.includes(searchKeyword.value) ||
      item.code.includes(searchKeyword.value)
    const matchCategory = !filterCategory.value || item.category === filterCategory.value
    return matchKeyword && matchCategory
  })
})

const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const handleSearch = () => {}

const handleInbound = () => {
  inboundForm.value = {
    order_no: 'IN' + Date.now(),
    type: 'purchase',
    supplier: '',
    remark: ''
  }
  inboundDialogVisible.value = true
}

const handleTransfer = () => {
  ElMessage.info('调拨申请功能开发中')
}

const handleInventory = () => {
  ElMessage.info('盘点功能开发中')
}

const handleExport = () => {
  ElMessage.success('报表导出成功')
}

const handleViewDetail = (row: any) => {
  ElMessage.info(`查看${row.name}详情`)
}

const handlePurchase = (row: any) => {
  ElMessage.info(`采购${row.name}`)
}

const saveInbound = () => {
  ElMessage.success('入库单保存成功')
  inboundDialogVisible.value = false
}
</script>

<style scoped>
.storage-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.storage-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .storage-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .storage-overview {
    grid-template-columns: 1fr;
  }
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
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
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.25);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.blue-icon {
  background: linear-gradient(145deg, #4299E1 0%, #2B6CB0 100%);
  box-shadow: 0 8px 25px rgba(66, 153, 225, 0.35);
}

.green-icon {
  background: linear-gradient(145deg, #48BB78 0%, #38A169 100%);
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.35);
}

.yellow-icon {
  background: linear-gradient(145deg, #ECC94B 0%, #D69E2E 100%);
  box-shadow: 0 8px 25px rgba(236, 201, 75, 0.35);
}

.purple-icon {
  background: linear-gradient(145deg, #805AD5 0%, #6B46C1 100%);
  box-shadow: 0 8px 25px rgba(128, 90, 213, 0.35);
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 13px;
  color: #718096;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1A202C;
  font-family: 'DIN', sans-serif;
}

.card-value.warning {
  color: #E53E3E;
}

.storage-actions {
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

.storage-table {
  padding: 24px;
}

.warning-text {
  color: #E53E3E;
  font-weight: 600;
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

:deep(.el-button--small) {
  border-radius: 8px;
  font-size: 13px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.15);
}

:deep(.el-input__inner) {
  color: #2D3748;
}

:deep(.el-input__placeholder) {
  color: #A0AEC0;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
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
</style>