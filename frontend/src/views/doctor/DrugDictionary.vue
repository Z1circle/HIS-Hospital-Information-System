<template>
  <div class="drug-dict-page">
    <div class="page-header">
      <div class="header-left">
        <el-icon class="back-icon" @click="$router.back()"><ArrowLeft /></el-icon>
        <h2>药品字典</h2>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索药品名称或规格"
        prefix-icon="Search"
        clearable
        style="width: 300px"
        @input="debounceSearch"
      />
      <el-select v-model="filterType" placeholder="药品类型" clearable style="width: 130px" @change="loadDrugs">
        <el-option label="全部" value="" />
        <el-option label="西药" value="western" />
        <el-option label="中药" value="chinese" />
      </el-select>
      <el-select v-model="filterCategory" placeholder="药品分类" clearable style="width: 150px" @change="loadDrugs">
        <el-option label="全部分类" value="" />
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
    </div>

    <!-- 药品列表 -->
    <div class="drug-table-wrap" v-loading="loading">
      <el-table :data="drugs" stripe style="width: 100%" :default-sort="{ prop: 'category', order: 'ascending' }">
        <el-table-column prop="name" label="药品名称" min-width="160">
          <template #default="{ row }">
            <span class="drug-name-cell">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="specification" label="规格" width="140" />
        <el-table-column prop="category" label="分类" width="110">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'chinese' ? 'warning' : ''">
              {{ row.type === 'chinese' ? '中药' : '西药' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="单价(元)" width="100" sortable>
          <template #default="{ row }">
            <span class="price-text">¥{{ row.price?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="actual_stock" label="库存" width="90" sortable>
          <template #default="{ row }">
            <span :class="{ 'stock-low': row.actual_stock <= (row.min_stock || 0) }">
              {{ row.actual_stock }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="insurance_type" label="医保" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.insurance_type" size="small" :type="row.insurance_type === '甲' ? 'success' : 'warning'">
              {{ row.insurance_type }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="expiry_date" label="有效期" width="120">
          <template #default="{ row }">
            <span :class="{ 'expiry-warn': isExpiringSoon(row.expiry_date) }">
              {{ row.expiry_date || '-' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer" v-if="drugs.length > 0">
        共 {{ drugs.length }} 种药品
      </div>
      <el-empty v-if="!loading && drugs.length === 0" description="未找到匹配的药品" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const keyword = ref('')
const filterType = ref('')
const filterCategory = ref('')
const categories = ref<string[]>([])
const drugs = ref<any[]>([])
const loading = ref(false)
let searchTimer: ReturnType<typeof setTimeout>

const debounceSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadDrugs, 300)
}

const loadCategories = async () => {
  try {
    const res = await axios.get('/api/drugs/categories')
    categories.value = res.data || []
  } catch { /* ignore */ }
}

const loadDrugs = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (filterType.value) params.type = filterType.value
    if (filterCategory.value) params.category = filterCategory.value
    const res = await axios.get('/api/drugs/dictionary', { params })
    drugs.value = res.data || []
  } catch {
    ElMessage.error('加载药品数据失败')
  } finally {
    loading.value = false
  }
}

const isExpiringSoon = (date: string) => {
  if (!date) return false
  const exp = new Date(date)
  const now = new Date()
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  return exp < threeMonths
}

onMounted(() => {
  loadCategories()
  loadDrugs()
})
</script>

<style scoped>
.drug-dict-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.back-icon {
  font-size: 20px;
  cursor: pointer;
  color: #1E88E5;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #212121;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.drug-table-wrap {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.drug-name-cell {
  font-weight: 600;
  color: #212121;
}

.price-text {
  color: #F57C00;
  font-weight: 600;
}

.stock-low {
  color: #E53935;
  font-weight: 700;
}

.expiry-warn {
  color: #FB8C00;
  font-weight: 600;
}

.table-footer {
  text-align: right;
  padding-top: 12px;
  font-size: 13px;
  color: #9E9E9E;
}
</style>
