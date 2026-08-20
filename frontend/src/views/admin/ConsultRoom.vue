<template>
  <div class="consult-room-manage">
    <div class="page-header">
      <h2 class="page-title">诊间管理</h2>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card glass-card">
        <div class="stat-icon blue-icon">
          <el-icon :size="28"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">病历模板数</div>
          <div class="stat-value">{{ templateList.length }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon green-icon">
          <el-icon :size="28"><Files /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">处方组套数</div>
          <div class="stat-value">{{ prescriptionList.length }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon yellow-icon">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">公有模板</div>
          <div class="stat-value warning-text">{{ publicTemplates }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon red-icon">
          <el-icon :size="28"><Lock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">私有模板</div>
          <div class="stat-value danger-text">{{ privateTemplates }}</div>
        </div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 病历模板维护 -->
        <el-tab-pane label="病历模板维护" name="template">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddTemplate">
              新增模板
            </el-button>
            <div class="filter-row">
              <el-input
                v-model="templateFilter.keyword"
                placeholder="搜索模板名称"
                clearable
                style="width: 200px"
                prefix-icon="Search"
              />
              <el-select v-model="templateFilter.type" placeholder="模板类型" clearable style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="公有" value="public" />
                <el-option label="私有" value="private" />
              </el-select>
              <el-select v-model="templateFilter.dept" placeholder="适用科室" clearable style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="内科" value="内科" />
                <el-option label="外科" value="外科" />
                <el-option label="儿科" value="儿科" />
              </el-select>
            </div>
          </div>
          <el-table :data="filteredTemplates" stripe v-loading="loading">
            <el-table-column prop="name" label="模板名称" min-width="200" />
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type === 'public' ? 'success' : 'info'">
                  {{ row.type === 'public' ? '公有' : '私有' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dept" label="适用科室" width="120" />
            <el-table-column prop="creator" label="创建人" width="100" />
            <el-table-column prop="create_time" label="创建时间" width="160" />
            <el-table-column prop="update_time" label="更新时间" width="160" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="Edit" @click="handleEditTemplate(row)">
                  编辑
                </el-button>
                <el-button size="small" type="primary" link icon="View" @click="handlePreviewTemplate(row)">
                  预览
                </el-button>
                <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteTemplate(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 处方组套设置 -->
        <el-tab-pane label="处方组套设置" name="prescription">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddPrescription">
              新增组套
            </el-button>
            <el-input
              v-model="prescriptionFilter"
              placeholder="搜索组套名称"
              clearable
              style="width: 200px"
              prefix-icon="Search"
            />
          </div>
          <div class="prescription-list">
            <div
              v-for="item in filteredPrescriptions"
              :key="item.id"
              class="prescription-card glass-card"
            >
              <div class="card-header">
                <h4 class="card-name">{{ item.name }}</h4>
                <el-tag size="small" type="success">{{ item.category }}</el-tag>
              </div>
              <p class="card-desc">{{ item.description }}</p>
              <div class="card-info">
                <span class="info-label">适应症：</span>
                <span class="info-value">{{ item.indication }}</span>
              </div>
              <div class="card-info">
                <span class="info-label">用法用量：</span>
                <span class="info-value">{{ item.usage }}</span>
              </div>
              <div class="card-items">
                <span class="info-label">组套药品：</span>
                <el-tag
                  v-for="(drug, idx) in item.drugs"
                  :key="idx"
                  size="small"
                  type="info"
                  class="drug-tag"
                >
                  {{ drug }}
                </el-tag>
              </div>
              <div class="card-footer">
                <span class="creator">创建人: {{ item.creator }}</span>
                <div class="card-actions">
                  <el-button size="small" type="primary" link icon="Edit" @click="handleEditPrescription(item)">
                    编辑
                  </el-button>
                  <el-button size="small" type="danger" link icon="Delete" @click="handleDeletePrescription(item)">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 病历模板编辑对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      :title="templateDialogTitle"
      width="800px"
      @close="handleTemplateDialogClose"
    >
      <el-form :model="templateForm" :rules="templateRules" ref="templateFormRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板类型" prop="type">
          <el-radio-group v-model="templateForm.type">
            <el-radio value="public">公有</el-radio>
            <el-radio value="private">私有</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="适用科室" prop="dept">
          <el-select v-model="templateForm.dept" placeholder="请选择适用科室" style="width: 100%">
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="儿科" value="儿科" />
            <el-option label="妇产科" value="妇产科" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="templateForm.content"
            type="textarea"
            :rows="15"
            placeholder="请输入病历模板内容，支持富文本格式"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitTemplate" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 处方组套编辑对话框 -->
    <el-dialog
      v-model="prescriptionDialogVisible"
      :title="prescriptionDialogTitle"
      width="600px"
      @close="handlePrescriptionDialogClose"
    >
      <el-form :model="prescriptionForm" :rules="prescriptionRules" ref="prescriptionFormRef" label-width="100px">
        <el-form-item label="组套名称" prop="name">
          <el-input v-model="prescriptionForm.name" placeholder="请输入组套名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="prescriptionForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="感冒套餐" value="感冒套餐" />
            <el-option label="消化套餐" value="消化套餐" />
            <el-option label="心血管套餐" value="心血管套餐" />
            <el-option label="感染套餐" value="感染套餐" />
            <el-option label="皮肤套餐" value="皮肤套餐" />
            <el-option label="内分泌套餐" value="内分泌套餐" />
            <el-option label="骨伤套餐" value="骨伤套餐" />
            <el-option label="儿科套餐" value="儿科套餐" />
            <el-option label="呼吸套餐" value="呼吸套餐" />
            <el-option label="口腔套餐" value="口腔套餐" />
            <el-option label="妇科套餐" value="妇科套餐" />
            <el-option label="泌尿套餐" value="泌尿套餐" />
            <el-option label="神经套餐" value="神经套餐" />
            <el-option label="眼科套餐" value="眼科套餐" />
            <el-option label="五官套餐" value="五官套餐" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="prescriptionForm.description" type="textarea" :rows="3" placeholder="请输入组套描述" />
        </el-form-item>
        <el-form-item label="适应症" prop="indication">
          <el-input v-model="prescriptionForm.indication" placeholder="请输入适应症，如：普通感冒、流感初期" />
        </el-form-item>
        <el-form-item label="用法用量" prop="usage">
          <el-input v-model="prescriptionForm.usage" placeholder="请输入用法用量，如：口服，每日3次" />
        </el-form-item>
        <el-form-item label="药品列表" prop="drugs">
          <div class="drug-list">
            <div v-for="(_drug, idx) in prescriptionForm.drugs" :key="idx" class="drug-item">
              <el-input v-model="prescriptionForm.drugs[idx]" placeholder="请输入药品名称" style="width: 200px" />
              <el-button size="small" type="danger" icon="Delete" circle @click="removeDrug(idx)" />
            </div>
            <el-button size="small" type="primary" icon="Plus" @click="addDrug">添加药品</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="prescriptionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPrescription" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Document, Files, User, Lock } from '@element-plus/icons-vue'

const activeTab = ref('template')
const loading = ref(false)

// 模板过滤
const templateFilter = reactive({
  keyword: '',
  type: '',
  dept: ''
})

// 病历模板列表
const templateList = ref([
  { id: 1, name: '内科初诊病历', type: 'public', dept: '内科', creator: '张医生', create_time: '2026-01-15 10:30', update_time: '2026-06-01 14:00', content: '主诉：\n现病史：\n既往史：\n体格检查：\n辅助检查：\n初步诊断：\n治疗意见：' },
  { id: 2, name: '外科手术记录', type: 'public', dept: '外科', creator: '李医生', create_time: '2026-02-20 09:15', update_time: '2026-05-28 16:00', content: '手术名称：\n手术日期：\n术前诊断：\n术后诊断：\n手术经过：' },
  { id: 3, name: '儿科体检模板', type: 'private', dept: '儿科', creator: '王医生', create_time: '2026-03-10 11:00', update_time: '2026-06-10 08:30', content: '身高：\n体重：\n头围：\n心肺听诊：\n腹部触诊：\n四肢脊柱：' },
  { id: 4, name: '妇科门诊病历', type: 'public', dept: '妇产科', creator: '赵医生', create_time: '2026-04-05 14:30', update_time: '2026-05-20 10:00', content: '月经史：\n婚育史：\n妇科检查：\n辅助检查：\n诊断：' },
  { id: 5, name: '个人通用模板', type: 'private', dept: '内科', creator: '张医生', create_time: '2026-05-18 16:45', update_time: '2026-06-15 09:00', content: '主诉：\n现病史：\n诊断：\n处理：' }
])

const filteredTemplates = computed(() => {
  return templateList.value.filter(t => {
    const matchKeyword = !templateFilter.keyword || t.name.includes(templateFilter.keyword)
    const matchType = !templateFilter.type || t.type === templateFilter.type
    const matchDept = !templateFilter.dept || t.dept === templateFilter.dept
    return matchKeyword && matchType && matchDept
  })
})

const publicTemplates = computed(() => templateList.value.filter(t => t.type === 'public').length)
const privateTemplates = computed(() => templateList.value.filter(t => t.type === 'private').length)

// 处方组套
const prescriptionFilter = ref('')
const prescriptionList = ref([
  { id: 1, name: '感冒基础套餐', category: '感冒套餐', description: '适用于普通感冒的常用药物组合', drugs: ['感冒清热颗粒', '维C银翘片', '板蓝根颗粒'], usage: '口服，每日3次', indication: '普通感冒、流感初期', creator: '张医生' },
  { id: 2, name: '消化不适套餐', category: '消化套餐', description: '适用于消化不良、胃痛的药物组合', drugs: ['奥美拉唑肠溶胶囊', '铝碳酸镁片', '莫沙必利片'], usage: '餐前口服，每日2次', indication: '胃炎、消化不良', creator: '李医生' },
  { id: 3, name: '高血压套餐', category: '心血管套餐', description: '适用于高血压患者的常用降压药物组合', drugs: ['硝苯地平控释片', '卡托普利片', '氢氯噻嗪片'], usage: '晨起口服，每日1次', indication: '原发性高血压', creator: '王医生' },
  { id: 4, name: '上呼吸道感染套餐', category: '感染套餐', description: '适用于上呼吸道感染的抗感染组合', drugs: ['阿莫西林胶囊', '布洛芬缓释胶囊', '复方甘草合剂'], usage: '口服，每日3次', indication: '细菌性上呼吸道感染', creator: '张医生' },
  { id: 5, name: '糖尿病基础套餐', category: '内分泌套餐', description: '2型糖尿病患者的常用药物组合', drugs: ['二甲双胍片', '格列美脲片', '阿卡波糖片'], usage: '餐中口服，每日2次', indication: '2型糖尿病', creator: '钱主任' },
  { id: 6, name: '骨科镇痛套餐', category: '骨伤套餐', description: '适用于骨折术后镇痛及抗感染', drugs: ['布洛芬缓释胶囊', '头孢克肟片', '钙尔奇D片'], usage: '口服，每日2次', indication: '骨折、软组织损伤', creator: '王主任' },
  { id: 7, name: '皮肤过敏套餐', category: '皮肤套餐', description: '适用于过敏性皮炎的药物组合', drugs: ['氯雷他定片', '外用糠酸莫米松乳膏', '维生素C片'], usage: '口服+外用，每日2次', indication: '过敏性皮炎、湿疹', creator: '黄医生' },
  { id: 8, name: '儿科退热套餐', category: '儿科套餐', description: '适用于儿童发热的基础药物组合', drugs: ['布洛芬混悬液', '小儿氨酚黄那敏颗粒', '退热贴'], usage: '口服，体温>38.5℃时服用', indication: '儿童发热感冒', creator: '赵主任' },
  { id: 9, name: '雾化吸入套餐', category: '呼吸套餐', description: '适用于支气管炎、哮喘的雾化组合', drugs: ['布地奈德吸入剂', '异丙托溴铵溶液', '0.9%氯化钠注射液'], usage: '雾化吸入，每日2次', indication: '支气管炎、哮喘', creator: '张医生' },
  { id: 10, name: '心梗急救套餐', category: '心血管套餐', description: '适用于急性心肌梗死的紧急用药', drugs: ['阿司匹林肠溶片', '硫酸氢氯吡格雷片', '阿托伐他汀钙片', '酒石酸美托洛尔片'], usage: '立即口服', indication: '急性冠脉综合征', creator: '李主任' },
  { id: 11, name: '胃溃疡套餐', category: '消化套餐', description: '适用于胃溃疡、十二指肠溃疡', drugs: ['奥美拉唑肠溶胶囊', '阿莫西林胶囊', '克拉霉素片'], usage: '口服，每日2次，疗程14天', indication: '幽门螺杆菌感染性胃溃疡', creator: '孙医生' },
  { id: 12, name: '口腔溃疡套餐', category: '口腔套餐', description: '适用于复发性口腔溃疡', drugs: ['口腔溃疡散', '复合维生素B片', '西地碘含片'], usage: '外用+口服，每日3次', indication: '口腔溃疡', creator: '周医生' },
  { id: 13, name: '妇科炎症套餐', category: '妇科套餐', description: '适用于阴道炎、宫颈炎', drugs: ['硝呋太尔制霉素阴道软胶囊', '妇科千金片', '保妇康栓'], usage: '阴道给药+口服', indication: '细菌性阴道炎、宫颈炎', creator: '吴主任' },
  { id: 14, name: '泌尿系统感染套餐', category: '泌尿套餐', description: '适用于膀胱炎、尿道炎', drugs: ['左氧氟沙星片', '三金片', '金钱草颗粒'], usage: '口服，每日2次', indication: '急性膀胱炎、尿道炎', creator: '郑医生' },
  { id: 15, name: '骨质疏松套餐', category: '骨伤套餐', description: '适用于骨质疏松症的长期治疗', drugs: ['碳酸钙D3片', '阿仑膦酸钠片', '骨化三醇软胶囊'], usage: '晨起口服，每周一次阿仑膦酸钠', indication: '原发性骨质疏松', creator: '冯医生' },
  { id: 16, name: '慢性支气管炎套餐', category: '呼吸套餐', description: '适用于慢性支气管炎的长期管理', drugs: ['氨茶碱片', '桉柠蒎肠溶软胶囊', '吸入用布地奈德混悬液'], usage: '口服+雾化', indication: '慢性支气管炎', creator: '陈主任' },
  { id: 17, name: '痛风急性发作套餐', category: '内分泌套餐', description: '适用于痛风急性发作期', drugs: ['秋水仙碱片', '布洛芬缓释胶囊', '碳酸氢钠片'], usage: '口服，疼痛缓解后减量', indication: '痛风急性发作', creator: '林医生' },
  { id: 18, name: '脑血管意外康复套餐', category: '神经套餐', description: '适用于脑梗死后遗症的二级预防', drugs: ['阿司匹林肠溶片', '阿托伐他汀钙片', '丁苯酞软胶囊', '胞磷胆碱钠片'], usage: '口服，每日1-2次', indication: '脑梗死后遗症', creator: '神经科' },
  { id: 19, name: '眼科抗感染套餐', category: '眼科套餐', description: '适用于细菌性结膜炎、角膜炎', drugs: ['左氧氟沙星滴眼液', '红霉素眼膏', '普拉洛芬滴眼液'], usage: '滴眼，每日3-4次', indication: '细菌性结膜炎、角膜炎', creator: '眼科' },
  { id: 20, name: '耳科炎症套餐', category: '五官套餐', description: '适用于中耳炎、外耳道炎', drugs: ['头孢克肟片', '氧氟沙星滴耳液', '桉柠蒎肠溶软胶囊'], usage: '口服+滴耳，每日2-3次', indication: '中耳炎、外耳道炎', creator: '耳鼻喉科' },
])

const filteredPrescriptions = computed(() => {
  if (!prescriptionFilter.value) return prescriptionList.value
  return prescriptionList.value.filter(p => p.name.includes(prescriptionFilter.value))
})

// 模板对话框
const templateDialogVisible = ref(false)
const templateDialogTitle = ref('新增病历模板')
const templateFormRef = ref<FormInstance>()
const submitting = ref(false)
const isEditTemplate = ref(false)

const templateForm = reactive({
  id: 0,
  name: '',
  type: 'public',
  dept: '',
  content: '',
  creator: ''
})

const templateRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  dept: [{ required: true, message: '请选择适用科室', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}

const handleAddTemplate = () => {
  templateDialogTitle.value = '新增病历模板'
  isEditTemplate.value = false
  templateDialogVisible.value = true
}

const handleEditTemplate = (row: any) => {
  templateDialogTitle.value = '编辑病历模板'
  isEditTemplate.value = true
  Object.assign(templateForm, row)
  templateDialogVisible.value = true
}

const handlePreviewTemplate = (row: any) => {
  ElMessageBox.alert(row.content, `模板预览 - ${row.name}`, {
    confirmButtonText: '关闭'
  })
}

const handleDeleteTemplate = (row: any) => {
  ElMessageBox.confirm(`确定要删除模板"${row.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    templateList.value = templateList.value.filter(t => t.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitTemplate = async () => {
  if (!templateFormRef.value) return
  await templateFormRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true
      setTimeout(() => {
        if (isEditTemplate.value) {
          const idx = templateList.value.findIndex(t => t.id === templateForm.id)
          if (idx !== -1) templateList.value[idx] = { ...templateList.value[idx], ...templateForm, update_time: new Date().toLocaleString() }
          ElMessage.success('修改成功')
        } else {
          templateList.value.push({
            ...templateForm,
            id: Date.now(),
            creator: '当前用户',
            create_time: new Date().toLocaleString(),
            update_time: new Date().toLocaleString()
          })
          ElMessage.success('新增成功')
        }
        templateDialogVisible.value = false
        submitting.value = false
      }, 500)
    }
  })
}

const handleTemplateDialogClose = () => {
  templateFormRef.value?.resetFields()
  Object.assign(templateForm, { id: 0, name: '', type: 'public', dept: '', content: '', creator: '' })
}

// 处方对话框
const prescriptionDialogVisible = ref(false)
const prescriptionDialogTitle = ref('新增处方组套')
const prescriptionFormRef = ref<FormInstance>()
const isEditPrescription = ref(false)

const prescriptionForm = reactive({
  id: 0,
  name: '',
  category: '',
  description: '',
  drugs: [] as string[],
  usage: '',
  indication: '',
  creator: ''
})

const prescriptionRules: FormRules = {
  name: [{ required: true, message: '请输入组套名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  usage: [{ required: true, message: '请输入用法用量', trigger: 'blur' }],
  indication: [{ required: true, message: '请输入适应症', trigger: 'blur' }]
}

const handleAddPrescription = () => {
  prescriptionDialogTitle.value = '新增处方组套'
  isEditPrescription.value = false
  prescriptionDialogVisible.value = true
}

const handleEditPrescription = (row: any) => {
  prescriptionDialogTitle.value = '编辑处方组套'
  isEditPrescription.value = true
  Object.assign(prescriptionForm, row)
  prescriptionDialogVisible.value = true
}

const handleDeletePrescription = (row: any) => {
  ElMessageBox.confirm(`确定要删除组套"${row.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    prescriptionList.value = prescriptionList.value.filter(p => p.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const addDrug = () => {
  prescriptionForm.drugs.push('')
}

const removeDrug = (idx: number) => {
  prescriptionForm.drugs.splice(idx, 1)
}

const handleSubmitPrescription = async () => {
  if (!prescriptionFormRef.value) return
  await prescriptionFormRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true
      setTimeout(() => {
        if (isEditPrescription.value) {
          const idx = prescriptionList.value.findIndex(p => p.id === prescriptionForm.id)
          if (idx !== -1) prescriptionList.value[idx] = { ...prescriptionForm }
          ElMessage.success('修改成功')
        } else {
          prescriptionList.value.push({
            ...prescriptionForm,
            id: Date.now(),
            creator: '当前用户'
          })
          ElMessage.success('新增成功')
        }
        prescriptionDialogVisible.value = false
        submitting.value = false
      }, 500)
    }
  })
}

const handlePrescriptionDialogClose = () => {
  prescriptionFormRef.value?.resetFields()
  Object.assign(prescriptionForm, { id: 0, name: '', category: '', description: '', drugs: [], usage: '', indication: '', creator: '' })
}
</script>

<style scoped lang="scss">
.consult-room-manage {
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
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
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
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  transition: all 0.3s ease;

  &:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15); }
}

.stat-icon {
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-right: 15px;
}

.blue-icon { background: linear-gradient(135deg, #4299E1, #3182CE); color: #fff; }
.green-icon { background: linear-gradient(135deg, #48BB78, #38A169); color: #fff; }
.yellow-icon { background: linear-gradient(135deg, #ECC94B, #D69E2E); color: #fff; }
.red-icon { background: linear-gradient(135deg, #FC8181, #F56565); color: #fff; }

.stat-content { flex: 1; }
.stat-label { font-size: 13px; color: #64748B; margin-bottom: 4px; }
.stat-value { font-size: 26px; font-weight: 700; color: #1E293B; }
.warning-text { color: #ECC94B; }
.danger-text { color: #FC8181; }

.tab-section {
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);

  :deep(.el-tabs__header) {
    background: rgba(235, 248, 255, 0.8);
    border-bottom: 1px solid rgba(66, 153, 225, 0.1);
  }

  :deep(.el-tabs__content) { padding: 20px; }
  :deep(.el-tabs__item) { color: #64748B; }
  :deep(.el-tabs__item.is-active) { color: #4299E1; background: rgba(66, 153, 225, 0.1); }
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-row {
  display: flex;
  gap: 10px;
}

.prescription-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.prescription-card {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  transition: all 0.3s ease;

  &:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(66, 153, 225, 0.1); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-name { margin: 0; font-size: 16px; color: #1E293B; font-weight: 600; }
.card-desc { color: #64748B; margin-bottom: 12px; font-size: 14px; }

.card-info {
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: #64748B;
  font-weight: 500;
}

.info-value {
  color: #374151;
}

.card-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}

.drug-tag {
  background: rgba(66, 153, 225, 0.1);
  border: 1px solid rgba(66, 153, 225, 0.2);
  color: #4299E1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(66, 153, 225, 0.1);
  padding-top: 12px;
}

.creator { font-size: 13px; color: #94A3B8; }

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

.drug-list {
  width: 100%;
}

.drug-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;

  th { background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%); color: #4299E1; border-color: rgba(66, 153, 225, 0.1); font-weight: 600; }
  td { border-color: rgba(66, 153, 225, 0.08); color: #4A5568; }
  tr:hover > td { background: rgba(66, 153, 225, 0.05); }
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
</style>