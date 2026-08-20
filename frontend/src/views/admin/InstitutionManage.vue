<template>
  <div class="institution-page">
    <div class="page-layout">
      <div class="tree-section glass-card">
        <div class="section-header">
          <h3>组织架构</h3>
          <el-button size="small" type="primary" icon="Plus" @click="handleAddRoot">
            新增根节点
          </el-button>
        </div>

        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="treeProps"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="tree-node">
              <span class="node-label">{{ node.label }}</span>
              <span class="node-actions">
                <el-button
                  size="small"
                  type="primary"
                  link
                  icon="Plus"
                  @click.stop="handleAddChild(data)"
                >
                  新增下级
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  link
                  icon="Edit"
                  @click.stop="handleEdit(data)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  link
                  icon="Delete"
                  @click.stop="handleDelete(data)"
                >
                  删除
                </el-button>
              </span>
            </div>
          </template>
        </el-tree>
      </div>

      <div class="detail-section glass-card">
        <div class="section-header">
          <h3>机构详情</h3>
          <el-button
            v-if="selectedNode"
            size="small"
            type="primary"
            icon="Edit"
            @click="handleEdit(selectedNode)"
          >
            编辑信息
          </el-button>
        </div>

        <div v-if="selectedNode" class="detail-content">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">机构名称:</span>
              <span class="value">{{ selectedNode.label }}</span>
            </div>
            <div class="info-item">
              <span class="label">机构编码:</span>
              <span class="value">{{ selectedNode.code }}</span>
            </div>
            <div class="info-item">
              <span class="label">机构类型:</span>
              <span class="value">{{ selectedNode.type }}</span>
            </div>
            <div class="info-item">
              <span class="label">负责人:</span>
              <span class="value">{{ selectedNode.leader }}</span>
            </div>
            <div class="info-item">
              <span class="label">联系电话:</span>
              <span class="value">{{ selectedNode.phone }}</span>
            </div>
            <div class="info-item">
              <span class="label">地址:</span>
              <span class="value">{{ selectedNode.address }}</span>
            </div>
            <div class="info-item">
              <span class="label">床位数:</span>
              <span class="value">{{ selectedNode.bed_count || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">员工数:</span>
              <span class="value">{{ selectedNode.staff_count || '-' }}</span>
            </div>
          </div>

          <div class="device-section">
            <h4>关联设备</h4>
            <el-table :data="selectedNode.devices || []" stripe style="width: 100%">
              <el-table-column prop="name" label="设备名称" min-width="150" />
              <el-table-column prop="type" label="设备类型" width="120" />
              <el-table-column prop="model" label="型号" width="150" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'normal' ? 'success' : 'warning'" size="small">
                    {{ row.status === 'normal' ? '正常' : '故障' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-else class="empty-state">
          <el-empty description="请选择左侧机构查看详情" :image-size="120" />
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="institutionForm" :rules="institutionRules" ref="institutionFormRef" label-width="100px">
        <el-form-item label="机构名称" prop="name">
          <el-input v-model="institutionForm.name" placeholder="请输入机构名称" />
        </el-form-item>
        <el-form-item label="机构编码" prop="code">
          <el-input v-model="institutionForm.code" placeholder="请输入机构编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="机构类型" prop="type">
          <el-select v-model="institutionForm.type" placeholder="请选择机构类型" style="width: 100%">
            <el-option label="总医院" value="总医院" />
            <el-option label="分院" value="分院" />
            <el-option label="社区中心" value="社区中心" />
            <el-option label="科室" value="科室" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="leader">
          <el-input v-model="institutionForm.leader" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="institutionForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="institutionForm.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="床位数" prop="bed_count">
          <el-input-number v-model="institutionForm.bed_count" :min="0" />
        </el-form-item>
        <el-form-item label="员工数" prop="staff_count">
          <el-input-number v-model="institutionForm.staff_count" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInstitution">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const treeRef = ref()
const selectedNode = ref<any>(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const parentNode = ref<any>(null)
const institutionFormRef = ref()

const treeProps = {
  label: 'label',
  children: 'children'
}

const treeData = ref([
  {
    id: 1,
    label: '市第一人民医院',
    code: 'HOSP001',
    type: '总医院',
    leader: '张院长',
    phone: '021-12345678',
    address: '上海市黄浦区南京东路100号',
    bed_count: 800,
    staff_count: 1200,
    devices: [
      { name: 'CT扫描仪', type: '影像设备', model: 'GE Revolution', status: 'normal' },
      { name: '核磁共振', type: '影像设备', model: 'Siemens 3T', status: 'normal' }
    ],
    children: [
      {
        id: 2,
        label: '浦东分院',
        code: 'HOSP001-PD',
        type: '分院',
        leader: '李院长',
        phone: '021-87654321',
        address: '上海市浦东新区世纪大道200号',
        bed_count: 300,
        staff_count: 450,
        devices: [
          { name: '超声设备', type: '诊断设备', model: 'Philips EPIQ', status: 'normal' }
        ],
        children: []
      },
      {
        id: 3,
        label: '徐汇分院',
        code: 'HOSP001-XH',
        type: '分院',
        leader: '王院长',
        phone: '021-11112222',
        address: '上海市徐汇区淮海中路300号',
        bed_count: 250,
        staff_count: 380,
        devices: [],
        children: []
      }
    ]
  },
  {
    id: 4,
    label: '社区卫生服务中心',
    code: 'COMM001',
    type: '社区中心',
    leader: '赵主任',
    phone: '021-33334444',
    address: '上海市静安区南京西路500号',
    bed_count: 50,
    staff_count: 80,
    devices: [],
    children: []
  }
])

const institutionForm = ref({
  id: 0,
  name: '',
  code: '',
  type: '',
  leader: '',
  phone: '',
  address: '',
  bed_count: 0,
  staff_count: 0
})

const institutionRules = {
  name: [{ required: true, message: '请输入机构名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入机构编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择机构类型', trigger: 'change' }],
  leader: [{ required: true, message: '请输入负责人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const dialogTitle = computed(() => {
  return isEdit.value ? '编辑机构' : '新增机构'
})

const handleNodeClick = (data: any) => {
  selectedNode.value = data
}

const handleAddRoot = () => {
  isEdit.value = false
  parentNode.value = null
  institutionForm.value = {
    id: 0,
    name: '',
    code: '',
    type: '',
    leader: '',
    phone: '',
    address: '',
    bed_count: 0,
    staff_count: 0
  }
  dialogVisible.value = true
}

const handleAddChild = (data: any) => {
  isEdit.value = false
  parentNode.value = data
  institutionForm.value = {
    id: 0,
    name: '',
    code: '',
    type: '',
    leader: '',
    phone: '',
    address: '',
    bed_count: 0,
    staff_count: 0
  }
  dialogVisible.value = true
}

const handleEdit = (data: any) => {
  isEdit.value = true
  parentNode.value = null
  institutionForm.value = {
    id: data.id,
    name: data.label,
    code: data.code,
    type: data.type,
    leader: data.leader,
    phone: data.phone,
    address: data.address,
    bed_count: data.bed_count || 0,
    staff_count: data.staff_count || 0
  }
  dialogVisible.value = true
}

const handleDelete = (data: any) => {
  ElMessageBox.confirm(`确定要删除机构"${data.label}"吗？`, '确认删除', {
    type: 'warning'
  }).then(() => {
    const removeNode = (nodes: any[], id: number): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes.splice(i, 1)
          return true
        }
        if (nodes[i].children && removeNode(nodes[i].children, id)) {
          return true
        }
      }
      return false
    }
    removeNode(treeData.value, data.id)
    if (selectedNode.value?.id === data.id) {
      selectedNode.value = null
    }
    ElMessage.success('删除成功')
  })
}

const saveInstitution = () => {
  institutionFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      const newNode = {
        id: Date.now(),
        label: institutionForm.value.name,
        code: institutionForm.value.code,
        type: institutionForm.value.type,
        leader: institutionForm.value.leader,
        phone: institutionForm.value.phone,
        address: institutionForm.value.address,
        bed_count: institutionForm.value.bed_count,
        staff_count: institutionForm.value.staff_count,
        devices: [],
        children: []
      }

      if (isEdit.value) {
        const updateNode = (nodes: any[], id: number): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
              nodes[i] = { ...nodes[i], ...newNode, id: institutionForm.value.id }
              if (selectedNode.value?.id === id) {
                selectedNode.value = nodes[i]
              }
              return true
            }
            if (nodes[i].children && updateNode(nodes[i].children, id)) {
              return true
            }
          }
          return false
        }
        updateNode(treeData.value, institutionForm.value.id)
        ElMessage.success('修改成功')
      } else {
        if (parentNode.value) {
          if (!parentNode.value.children) {
            parentNode.value.children = []
          }
          parentNode.value.children.push(newNode)
        } else {
          treeData.value.push(newNode)
        }
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}
</script>

<style scoped>
.institution-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 40px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.25);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1A202C;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}

.node-label {
  font-size: 14px;
  color: #2D3748;
  font-weight: 500;
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

:deep(.el-tree-node__content) {
  height: 44px;
  padding-left: 10px !important;
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(66, 153, 225, 0.05);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(66, 153, 225, 0.1);
}

:deep(.el-tree-node__expand-icon) {
  color: #A0AEC0;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-radius: 12px;
}

.info-item .label {
  font-size: 13px;
  color: #718096;
}

.info-item .value {
  font-size: 14px;
  color: #2D3748;
  font-weight: 500;
}

.device-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2D3748;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
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

/* 蓝色按钮白色文字 */
:deep(.el-button--primary.link-btn),
:deep(.el-button--primary.link) {
  color: #FFFFFF !important;
}
:deep(.el-button--primary.link-btn):hover,
:deep(.el-button--primary.link):hover {
  color: #E0E0E0 !important;
}

:deep(.el-button--danger.link-btn),
:deep(.el-button--danger.link) {
  color: #FFFFFF !important;
}
</style>