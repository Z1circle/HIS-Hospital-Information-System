<template>
  <div class="material-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">物资管理</h2>
      <div class="header-actions">
        <el-button type="primary" icon="Plus" @click="handleAddMaterial">
          新增物资
        </el-button>
        <el-button type="success" icon="Setting" @click="handleExpirySettings">
          有效期预警设置
        </el-button>
        <el-button icon="Download" @click="handleExport">
          导出报表
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card glass-card">
        <div class="stat-icon blue-icon">
          <el-icon :size="28"><Box /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">物资总数</div>
          <div class="stat-value">{{ formatNumber(totalMaterials) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon green-icon">
          <el-icon :size="28"><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">正常库存</div>
          <div class="stat-value">{{ formatNumber(normalStock) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon yellow-icon">
          <el-icon :size="28"><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">临期预警</div>
          <div class="stat-value warning-text">{{ formatNumber(expiringSoon) }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon red-icon">
          <el-icon :size="28"><CircleClose /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">已过期</div>
          <div class="stat-value danger-text">{{ formatNumber(expired) }}</div>
        </div>
      </div>
    </div>

    <!-- 搜索筛选区 -->
    <div class="filter-section glass-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="物资名称">
          <el-input
            v-model="filterForm.name"
            placeholder="请输入物资名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="物资分类">
          <el-select
            v-model="filterForm.category"
            placeholder="请选择分类"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="注射器" value="注射器" />
            <el-option label="输液器" value="输液器" />
            <el-option label="纱布" value="纱布" />
            <el-option label="棉签" value="棉签" />
            <el-option label="手套" value="手套" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select
            v-model="filterForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="normal" />
            <el-option label="临期" value="expiring" />
            <el-option label="过期" value="expired" />
            <el-option label="库存不足" value="low_stock" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 物资列表 -->
    <div class="material-list glass-card">
      <el-table
        :data="filteredMaterials"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="code" label="物资编码" width="120" />
        <el-table-column prop="name" label="物资名称" min-width="180" />
        <el-table-column prop="spec" label="规格" width="120" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="stock" label="库存数量" width="100" align="right">
          <template #default="{ row }">
            <span :class="{ 'warning-text': row.stock <= row.min_stock }">
              {{ row.stock }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="最低库存" width="100" align="right" />
        <el-table-column prop="expiry_date" label="有效期" width="120">
          <template #default="{ row }">
            <span :class="getExpiryClass(row.expiry_date)">
              {{ row.expiry_date }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="150" />
        <el-table-column prop="price" label="单价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" icon="View" class="btn-white-text" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" icon="Edit" class="btn-white-text" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="success" icon="Plus" class="btn-white-text" @click="handleInbound(row)">入库</el-button>
            <el-button size="small" type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredMaterials.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑物资对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="materialForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="物资编码" prop="code">
          <el-input
            v-model="materialForm.code"
            placeholder="请输入物资编码"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="物资名称" prop="name">
          <el-input v-model="materialForm.name" placeholder="请输入物资名称" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="materialForm.spec" placeholder="请输入规格" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select
            v-model="materialForm.category"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option label="注射器" value="注射器" />
            <el-option label="输液器" value="输液器" />
            <el-option label="纱布" value="纱布" />
            <el-option label="棉签" value="棉签" />
            <el-option label="手套" value="手套" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="materialForm.unit" placeholder="请输入单位" />
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number
            v-model="materialForm.price"
            :min="0"
            :precision="2"
            :step="0.01"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="supplier">
          <el-input v-model="materialForm.supplier" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="最低库存" prop="min_stock">
          <el-input-number
            v-model="materialForm.min_stock"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期" prop="expiry_date">
          <el-date-picker
            v-model="materialForm.expiry_date"
            type="date"
            placeholder="选择有效期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="materialForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 有效期预警设置对话框 -->
    <el-dialog
      v-model="expirySettingsVisible"
      title="有效期预警设置"
      width="500px"
    >
      <el-form
        ref="expiryFormRef"
        :model="expirySettings"
        label-width="150px"
      >
        <el-form-item label="黄色预警天数">
          <el-input-number
            v-model="expirySettings.yellowDays"
            :min="1"
            :max="365"
            style="width: 100%"
          />
          <div class="form-tip">距离有效期多少天显示黄色预警</div>
        </el-form-item>
        <el-form-item label="红色预警天数">
          <el-input-number
            v-model="expirySettings.redDays"
            :min="1"
            :max="365"
            style="width: 100%"
          />
          <div class="form-tip">距离有效期多少天显示红色预警</div>
        </el-form-item>
        <el-form-item label="启用预警通知">
          <el-switch v-model="expirySettings.enableNotification" />
          <div class="form-tip">开启后将在物资临期时发送通知</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="expirySettingsVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveExpirySettings">
          保存设置
        </el-button>
      </template>
    </el-dialog>

    <!-- 入库对话框 -->
    <el-dialog
      v-model="inboundVisible"
      title="物资入库"
      width="500px"
    >
      <el-form
        ref="inboundFormRef"
        :model="inboundForm"
        :rules="inboundRules"
        label-width="100px"
      >
        <el-form-item label="物资名称">
          <el-input v-model="inboundForm.materialName" disabled />
        </el-form-item>
        <el-form-item label="入库数量" prop="quantity">
          <el-input-number
            v-model="inboundForm.quantity"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="批次号" prop="batch_no">
          <el-input v-model="inboundForm.batch_no" placeholder="请输入批次号" />
        </el-form-item>
        <el-form-item label="生产日期" prop="production_date">
          <el-date-picker
            v-model="inboundForm.production_date"
            type="date"
            placeholder="选择生产日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="有效期" prop="expiry_date">
          <el-date-picker
            v-model="inboundForm.expiry_date"
            type="date"
            placeholder="选择有效期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="inboundForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inboundVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitInbound">
          确认入库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Box,
  CircleCheck,
  Warning,
  CircleClose
} from '@element-plus/icons-vue'

// 统计数据
const totalMaterials = ref(156)
const normalStock = ref(142)
const expiringSoon = ref(8)
const expired = ref(6)

// 加载状态
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  name: '',
  category: '',
  status: ''
})

// 物资数据
const materials = ref([
  {
    id: 1,
    code: 'WZ001',
    name: '一次性注射器 5ml',
    spec: '5ml',
    category: '注射器',
    unit: '支',
    stock: 5000,
    min_stock: 1000,
    expiry_date: '2026-09-15',
    supplier: '上海医疗器械有限公司',
    price: 0.85,
    remark: ''
  },
  {
    id: 2,
    code: 'WZ002',
    name: '一次性输液器',
    spec: '标准型',
    category: '输液器',
    unit: '套',
    stock: 3000,
    min_stock: 500,
    expiry_date: '2026-08-20',
    supplier: '江苏医疗用品厂',
    price: 1.20,
    remark: ''
  },
  {
    id: 3,
    code: 'WZ003',
    name: '医用纱布',
    spec: '10cm×10cm',
    category: '纱布',
    unit: '包',
    stock: 800,
    min_stock: 200,
    expiry_date: '2026-07-10',
    supplier: '北京医用材料公司',
    price: 2.50,
    remark: ''
  },
  {
    id: 4,
    code: 'WZ004',
    name: '医用棉签',
    spec: '10cm',
    category: '棉签',
    unit: '包',
    stock: 1500,
    min_stock: 300,
    expiry_date: '2026-10-05',
    supplier: '广州医疗器械厂',
    price: 3.00,
    remark: ''
  },
  {
    id: 5,
    code: 'WZ005',
    name: '医用橡胶手套',
    spec: 'L号',
    category: '手套',
    unit: '双',
    stock: 2000,
    min_stock: 400,
    expiry_date: '2026-06-25',
    supplier: '深圳医疗用品公司',
    price: 0.50,
    remark: ''
  },
  {
    id: 6,
    code: 'WZ006',
    name: '一次性注射器 10ml',
    spec: '10ml',
    category: '注射器',
    unit: '支',
    stock: 4000,
    min_stock: 800,
    expiry_date: '2026-11-20',
    supplier: '上海医疗器械有限公司',
    price: 1.10,
    remark: ''
  },
  {
    id: 7,
    code: 'WZ007',
    name: '一次性注射器 2ml',
    spec: '2ml',
    category: '注射器',
    unit: '支',
    stock: 600,
    min_stock: 1000,
    expiry_date: '2026-12-01',
    supplier: '上海医疗器械有限公司',
    price: 0.65,
    remark: ''
  },
  {
    id: 8,
    code: 'WZ008',
    name: '医用酒精棉片',
    spec: '5cm×5cm',
    category: '棉签',
    unit: '片',
    stock: 10000,
    min_stock: 2000,
    expiry_date: '2027-01-15',
    supplier: '杭州医疗用品厂',
    price: 0.15,
    remark: ''
  }
])

// 过滤后的物资列表
const filteredMaterials = computed(() => {
  let result = materials.value

  // 按名称筛选
  if (filterForm.name) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(filterForm.name.toLowerCase())
    )
  }

  // 按分类筛选
  if (filterForm.category) {
    result = result.filter(item => item.category === filterForm.category)
  }

  // 按状态筛选
  if (filterForm.status) {
    result = result.filter(item => {
      const today = new Date()
      const expiryDate = new Date(item.expiry_date)
      const daysDiff = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (filterForm.status === 'normal') {
        return daysDiff > 90 && item.stock > item.min_stock
      } else if (filterForm.status === 'expiring') {
        return daysDiff > 0 && daysDiff <= 90
      } else if (filterForm.status === 'expired') {
        return daysDiff <= 0
      } else if (filterForm.status === 'low_stock') {
        return item.stock <= item.min_stock
      }
      return true
    })
  }

  return result
})

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

const handleSizeChange = (val: number) => {
  pageSize.value = val
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  ElMessage.success('搜索完成')
}

// 重置
const handleReset = () => {
  filterForm.name = ''
  filterForm.category = ''
  filterForm.status = ''
  currentPage.value = 1
  ElMessage.success('已重置筛选条件')
}

// 导出
const handleExport = () => {
  ElMessage.success('报表导出中...')
  // TODO: 实现导出逻辑
}

// 对话框相关
const dialogVisible = ref(false)
const dialogTitle = ref('新增物资')
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 物资表单
const materialForm = reactive({
  id: 0,
  code: '',
  name: '',
  spec: '',
  category: '',
  unit: '',
  price: 0,
  supplier: '',
  min_stock: 0,
  expiry_date: '',
  remark: ''
})

// 表单验证规则
const formRules: FormRules = {
  code: [{ required: true, message: '请输入物资编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入物资名称', trigger: 'blur' }],
  spec: [{ required: true, message: '请输入规格', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  min_stock: [{ required: true, message: '请输入最低库存', trigger: 'blur' }],
  expiry_date: [{ required: true, message: '请选择有效期', trigger: 'change' }]
}

// 新增物资
const handleAddMaterial = () => {
  dialogTitle.value = '新增物资'
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑物资
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑物资'
  isEdit.value = true
  Object.assign(materialForm, row)
  dialogVisible.value = true
}

// 查看物资
const handleView = (row: any) => {
  ElMessageBox.alert(
    `
    <div style="line-height: 2;">
      <strong>物资编码：</strong>${row.code}<br>
      <strong>物资名称：</strong>${row.name}<br>
      <strong>规格：</strong>${row.spec}<br>
      <strong>分类：</strong>${row.category}<br>
      <strong>单位：</strong>${row.unit}<br>
      <strong>库存数量：</strong>${row.stock}<br>
      <strong>最低库存：</strong>${row.min_stock}<br>
      <strong>有效期：</strong>${row.expiry_date}<br>
      <strong>单价：</strong>¥${row.price.toFixed(2)}<br>
      <strong>备注：</strong>${row.remark || '无'}
    </div>
    `,
    '物资详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

// 删除物资
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除物资"${row.name}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = materials.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      materials.value.splice(index, 1)
      ElMessage.success('删除成功')
      updateStats()
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true

      setTimeout(() => {
        if (isEdit.value) {
          // 编辑
          const index = materials.value.findIndex(item => item.id === materialForm.id)
          if (index > -1) {
            materials.value[index] = {
              ...materialForm,
              stock: materials.value[index].stock
            }
          }
          ElMessage.success('编辑成功')
        } else {
          // 新增
          const newMaterial = {
            ...materialForm,
            id: Date.now(),
            stock: 0
          }
          materials.value.unshift(newMaterial)
          ElMessage.success('新增成功')
        }

        dialogVisible.value = false
        submitting.value = false
        updateStats()
      }, 500)
    }
  })
}

// 关闭对话框
const handleDialogClose = () => {
  formRef.value?.resetFields()
  Object.assign(materialForm, {
    id: 0,
    code: '',
    name: '',
    spec: '',
    category: '',
    unit: '',
    price: 0,
    supplier: '',
    min_stock: 0,
    expiry_date: '',
    remark: ''
  })
}

// 有效期预警设置
const expirySettingsVisible = ref(false)
const expiryFormRef = ref<FormInstance>()

const expirySettings = reactive({
  yellowDays: 90,
  redDays: 30,
  enableNotification: true
})

const handleExpirySettings = () => {
  expirySettingsVisible.value = true
}

const handleSaveExpirySettings = () => {
  ElMessage.success('有效期预警设置已保存')
  expirySettingsVisible.value = false
}

// 入库相关
const inboundVisible = ref(false)
const inboundFormRef = ref<FormInstance>()

const inboundForm = reactive({
  materialId: 0,
  materialName: '',
  quantity: 0,
  batch_no: '',
  production_date: '',
  expiry_date: '',
  remark: ''
})

const inboundRules: FormRules = {
  quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }],
  batch_no: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  production_date: [{ required: true, message: '请选择生产日期', trigger: 'change' }],
  expiry_date: [{ required: true, message: '请选择有效期', trigger: 'change' }]
}

const handleInbound = (row: any) => {
  inboundForm.materialId = row.id
  inboundForm.materialName = row.name
  inboundVisible.value = true
}

const handleSubmitInbound = async () => {
  if (!inboundFormRef.value) return

  await inboundFormRef.value.validate((valid) => {
    if (valid) {
      // 更新库存
      const material = materials.value.find(item => item.id === inboundForm.materialId)
      if (material) {
        material.stock += inboundForm.quantity
        ElMessage.success('入库成功')
        inboundVisible.value = false
        updateStats()
      }
    }
  })
}

// 获取有效期样式类
const getExpiryClass = (expiryDate: string) => {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysDiff = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 0) {
    return 'danger-text'
  } else if (daysDiff <= 30) {
    return 'danger-text'
  } else if (daysDiff <= 90) {
    return 'warning-text'
  }
  return ''
}

// 更新统计数据
const updateStats = () => {
  totalMaterials.value = materials.value.length

  let normal = 0
  let expiring = 0
  let expiredCount = 0

  const today = new Date()

  materials.value.forEach(item => {
    const expiryDate = new Date(item.expiry_date)
    const daysDiff = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 0) {
      expiredCount++
    } else if (daysDiff <= 90) {
      expiring++
    } else {
      normal++
    }
  })

  normalStock.value = normal
  expiringSoon.value = expiring
  expired.value = expiredCount
}

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 初始化
onMounted(() => {
  updateStats()
})
</script>

<style scoped lang="scss">
// 白色文字按钮样式
.btn-white-text {
  color: #FFFFFF !important;
  &:hover {
    color: #E0E0E0 !important;
  }
}

.material-manage {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1E293B;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15);
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.blue-icon {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  color: #4299E1;
}

.green-icon {
  background: linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%);
  color: #48BB78;
}

.yellow-icon {
  background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
  color: #D69E2E;
}

.red-icon {
  background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%);
  color: #FC8181;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748B;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1E293B;
}

.warning-text {
  color: #D69E2E;
}

.danger-text {
  color: #FC8181;
}

.filter-section {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.material-list {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;

  th {
    background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
    color: #4299E1;
    border-color: rgba(66, 153, 225, 0.1);
    font-weight: 600;
  }

  td {
    border-color: rgba(66, 153, 225, 0.08);
    color: #4A5568;
  }

  tr:hover > td {
    background: rgba(66, 153, 225, 0.05);
  }

  .el-table__body tr.current-row > td {
    background: rgba(66, 153, 225, 0.08);
  }
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

:deep(.el-button--primary.is-link) {
  color: #FFFFFF;

  &:hover {
    color: #E0E0E0;
  }
}

:deep(.el-button--danger.is-link) {
  color: #FFFFFF;

  &:hover {
    color: #E0E0E0;
  }
}

:deep(.el-pagination) {
  .el-pager li {
    background: rgba(255, 255, 255, 0.95);
    color: #64748B;
    border: 1px solid rgba(66, 153, 225, 0.1);

    &.is-active {
      background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
      color: #fff;
    }
  }

  .btn-prev,
  .btn-next {
    background: rgba(255, 255, 255, 0.95);
    color: #64748B;
    border: 1px solid rgba(66, 153, 225, 0.1);

    &:hover {
      color: #4299E1;
    }
  }

  .el-pagination__total,
  .el-pagination__sizes,
  .el-pagination__jump {
    color: #64748B;
  }
}
</style>