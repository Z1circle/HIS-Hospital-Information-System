<template>
  <div class="common-tools-page">
    <div class="page-header">
      <el-button size="small" @click="$emit('back')" icon="ArrowLeft">返回</el-button>
      <h2>常用工具</h2>
    </div>

    <div class="tools-grid">
      <el-card shadow="hover" class="tool-card" @click="openTool('calculator')">
        <div class="tool-icon">🧮</div>
        <div class="tool-name">诊疗计算器</div>
        <div class="tool-desc">BMI、血糖、肌酐清除率等常用计算</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('reference')">
        <div class="tool-icon">📚</div>
        <div class="tool-name">医学参考</div>
        <div class="tool-desc">疾病指南、药品说明、检验参考值</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="$router.push('/doctor/templates')">
        <div class="tool-icon">📝</div>
        <div class="tool-name">模板管理</div>
        <div class="tool-desc">病历模板、处方模板、检查报告模板</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('dictionary')">
        <div class="tool-icon">🔍</div>
        <div class="tool-name">药品字典</div>
        <div class="tool-desc">药品查询、配伍禁忌、用药指导</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('icd')">
        <div class="tool-icon">📊</div>
        <div class="tool-name">ICD编码</div>
        <div class="tool-desc">疾病编码查询、ICD-10/ICD-9对照</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('formula')">
        <div class="tool-icon">⚗️</div>
        <div class="tool-name">处方计算器</div>
        <div class="tool-desc">用药剂量计算、儿童用药换算</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('image')">
        <div class="tool-icon">🖼️</div>
        <div class="tool-name">影像查看器</div>
        <div class="tool-desc">医学影像图片查看、标注测量</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('timer')">
        <div class="tool-icon">⏱️</div>
        <div class="tool-name">诊疗计时器</div>
        <div class="tool-desc">门诊计时、输液计时、手术计时</div>
      </el-card>

      <el-card shadow="hover" class="tool-card" @click="openTool('settings')">
        <div class="tool-icon">⚙️</div>
        <div class="tool-name">工具设置</div>
        <div class="tool-desc">自定义工具栏、快捷操作配置</div>
      </el-card>
    </div>

    <el-dialog v-model="calculatorVisible" title="诊疗计算器" width="600px">
      <el-tabs v-model="calcActiveTab">
        <el-tab-pane label="BMI计算" name="bmi">
          <el-form :model="bmiForm" label-width="80px">
            <el-form-item label="身高(cm)">
              <el-input-number v-model="bmiForm.height" :min="50" :max="250" />
            </el-form-item>
            <el-form-item label="体重(kg)">
              <el-input-number v-model="bmiForm.weight" :min="20" :max="200" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="calcBMI">计算</el-button>
            </el-form-item>
          </el-form>
          <div class="calc-result" v-if="bmiResult">
            <div>BMI指数：<strong>{{ bmiResult.value }}</strong></div>
            <div>评价：<el-tag :type="bmiResult.tagType">{{ bmiResult.eval }}</el-tag></div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="肌酐清除率" name="creatinine">
          <el-form :model="creatinineForm" label-width="120px">
            <el-form-item label="性别">
              <el-radio-group v-model="creatinineForm.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="年龄(岁)">
              <el-input-number v-model="creatinineForm.age" :min="1" :max="120" />
            </el-form-item>
            <el-form-item label="体重(kg)">
              <el-input-number v-model="creatinineForm.weight" :min="20" :max="200" />
            </el-form-item>
            <el-form-item label="血清肌酐(μmol/L)">
              <el-input-number v-model="creatinineForm.creatinine" :min="1" :max="1000" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="calcCreatinine">计算</el-button>
            </el-form-item>
          </el-form>
          <div class="calc-result" v-if="creatinineResult">
            <div>Ccr值：<strong>{{ creatinineResult }}</strong> ml/min</div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="血糖换算" name="glucose">
          <el-form :model="glucoseForm" label-width="100px">
            <el-form-item label="血糖(mg/dL)">
              <el-input-number v-model="glucoseForm.mg" :min="1" @change="calcGlucose" />
            </el-form-item>
            <el-form-item label="血糖(mmol/L)">
              <el-input-number v-model="glucoseForm.mmol" :min="0.1" step="0.1" @change="calcGlucoseReverse" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="referenceVisible" title="医学参考" width="800px">
      <el-tabs v-model="referenceActiveTab">
        <el-tab-pane label="检验参考值" name="lab">
          <el-input v-model="labSearch" placeholder="搜索检验项目" prefix-icon="Search" clearable />
          <el-table :data="filteredLabItems" border>
            <el-table-column prop="name" label="项目名称" />
            <el-table-column prop="unit" label="单位" />
            <el-table-column prop="range" label="参考范围" />
            <el-table-column prop="desc" label="说明" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="疾病指南" name="disease">
          <el-input v-model="diseaseSearch" placeholder="搜索疾病名称" prefix-icon="Search" clearable />
          <div class="disease-list">
            <el-card v-for="disease in filteredDiseases" :key="disease.name" class="disease-card">
              <div class="disease-name">{{ disease.name }}</div>
              <div class="disease-desc">{{ disease.description }}</div>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane label="药品说明" name="drug">
          <el-input v-model="drugSearch" placeholder="搜索药品名称" prefix-icon="Search" clearable />
          <el-table :data="filteredDrugs" border>
            <el-table-column prop="name" label="药品名称" />
            <el-table-column prop="dosage" label="用法用量" />
            <el-table-column prop="indications" label="适应症" />
            <el-table-column prop="contraindications" label="禁忌症" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'

const calculatorVisible = ref(false)
const referenceVisible = ref(false)
const calcActiveTab = ref('bmi')
const referenceActiveTab = ref('lab')

const bmiForm = reactive({ height: 170, weight: 65 })
const bmiResult = ref<any>(null)

const creatinineForm = reactive({ gender: '男', age: 50, weight: 60, creatinine: 80 })
const creatinineResult = ref<number | null>(null)

const glucoseForm = reactive({ mg: 100, mmol: 5.6 })

const labSearch = ref('')
const diseaseSearch = ref('')
const drugSearch = ref('')

const labItems = [
  { name: '血糖', unit: 'mmol/L', range: '3.9-6.1', desc: '空腹血糖参考值' },
  { name: '血红蛋白', unit: 'g/L', range: '男120-160,女110-150', desc: '贫血诊断指标' },
  { name: '白细胞', unit: '×10^9/L', range: '4-10', desc: '感染诊断指标' },
  { name: '肌酐', unit: 'μmol/L', range: '男57-111,女41-81', desc: '肾功能指标' },
  { name: '谷丙转氨酶', unit: 'U/L', range: '5-40', desc: '肝功能指标' },
  { name: '胆固醇', unit: 'mmol/L', range: '<5.2', desc: '血脂指标' },
  { name: '尿酸', unit: 'μmol/L', range: '男208-428,女155-357', desc: '痛风诊断指标' },
  { name: '钾', unit: 'mmol/L', range: '3.5-5.5', desc: '电解质指标' }
]

const diseases = [
  { name: '高血压', description: '收缩压≥140mmHg和(或)舒张压≥90mmHg，需非同日三次测量确认。' },
  { name: '糖尿病', description: '空腹血糖≥7.0mmol/L，或餐后2小时血糖≥11.1mmol/L，或随机血糖≥11.1mmol/L伴症状。' },
  { name: '冠心病', description: '冠状动脉粥样硬化导致心肌缺血缺氧，典型症状为心绞痛。' },
  { name: '慢性胃炎', description: '胃黏膜慢性炎症，常见症状为上腹不适、隐痛、嗳气等。' },
  { name: '肺炎', description: '肺部感染，常见症状为发热、咳嗽、咳痰、胸痛。' },
  { name: '脑血管病', description: '脑部血管病变导致的脑功能障碍，包括出血性和缺血性。' }
]

const drugs = [
  { name: '阿司匹林', dosage: '每日75-150mg', indications: '抗血小板聚集，预防心脑血管疾病', contraindications: '过敏者、活动性出血' },
  { name: '硝苯地平', dosage: '每日10-30mg', indications: '高血压、心绞痛', contraindications: '过敏者、低血压' },
  { name: '胰岛素', dosage: '根据血糖调整', indications: '糖尿病', contraindications: '低血糖' },
  { name: '阿莫西林', dosage: '每日1-4g，分3-4次', indications: '细菌感染', contraindications: '青霉素过敏' }
]

const filteredLabItems = computed(() =>
  labItems.filter(item => item.name.includes(labSearch.value))
)

const filteredDiseases = computed(() =>
  diseases.filter(d => d.name.includes(diseaseSearch.value))
)

const filteredDrugs = computed(() =>
  drugs.filter(d => d.name.includes(drugSearch.value))
)

const openTool = (tool: string) => {
  switch (tool) {
    case 'calculator':
      calculatorVisible.value = true
      break
    case 'reference':
      referenceVisible.value = true
      break
    case 'dictionary':
      ElMessage.info('正在开发中，敬请期待')
      break
    case 'icd':
      ElMessage.info('正在开发中，敬请期待')
      break
    case 'formula':
      ElMessage.info('正在开发中，敬请期待')
      break
    case 'image':
      ElMessage.info('正在开发中，敬请期待')
      break
    case 'timer':
      ElMessage.info('正在开发中，敬请期待')
      break
    case 'settings':
      ElMessage.info('正在开发中，敬请期待')
      break
  }
}

const calcBMI = () => {
  if (!bmiForm.height || !bmiForm.weight) {
    ElMessage.warning('请输入身高和体重')
    return
  }
  const heightM = bmiForm.height / 100
  const bmi = bmiForm.weight / (heightM * heightM)
  let evalText = ''
  let tagType = ''
  if (bmi < 18.5) {
    evalText = '偏瘦'
    tagType = 'info'
  } else if (bmi < 24) {
    evalText = '正常'
    tagType = 'success'
  } else if (bmi < 28) {
    evalText = '偏胖'
    tagType = 'warning'
  } else {
    evalText = '肥胖'
    tagType = 'danger'
  }
  bmiResult.value = { value: bmi.toFixed(2), eval: evalText, tagType }
}

const calcCreatinine = () => {
  if (!creatinineForm.age || !creatinineForm.creatinine) {
    ElMessage.warning('请输入完整数据')
    return
  }
  const k = creatinineForm.gender === '男' ? 1 : 0.85
  const ccr = ((140 - creatinineForm.age) * creatinineForm.weight * k) / (72 * creatinineForm.creatinine)
  creatinineResult.value = ccr.toFixed(1) as unknown as number
}

const calcGlucose = () => {
  glucoseForm.mmol = ((glucoseForm.mg || 0) / 18).toFixed(1) as unknown as number
}

const calcGlucoseReverse = () => {
  glucoseForm.mg = Math.round((glucoseForm.mmol || 0) * 18)
}
</script>

<style scoped>
.common-tools-page {
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

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.tool-card {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s;
}

.tool-card:hover {
  transform: translateY(-4px);
}

.tool-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.tool-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.tool-desc {
  font-size: 13px;
  color: #909399;
}

.calc-result {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.calc-result strong {
  font-size: 20px;
  color: #1E88E5;
}

.disease-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disease-card {
  cursor: pointer;
}

.disease-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.disease-desc {
  font-size: 14px;
  color: #606266;
}
</style>