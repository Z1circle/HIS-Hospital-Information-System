<template>
  <div class="nurse-manage">
    <div class="page-header">
      <h2 class="page-title">护士管理</h2>
    </div>

    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 分诊规则配置 -->
        <el-tab-pane label="分诊规则配置" name="triage">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddRule">新增规则</el-button>
            <el-select v-model="triageFilter" placeholder="筛选取向" clearable style="width: 160px">
              <el-option label="全部" value="" />
              <el-option label="发热" value="发热" />
              <el-option label="外伤" value="外伤" />
              <el-option label="内科" value="内科" />
              <el-option label="儿科" value="儿科" />
            </el-select>
          </div>

          <div class="rule-list">
            <div v-for="rule in filteredTriageRules" :key="rule.id" class="rule-card glass-card">
              <div class="rule-header">
                <div class="rule-title">
                  <el-icon :size="20"><Warning /></el-icon>
                  <span class="rule-name">{{ rule.symptom }}</span>
                </div>
                <el-switch v-model="rule.enabled" active-text="启用" inactive-text="停用" />
              </div>
              <div class="rule-body">
                <div class="rule-row">
                  <span class="label">分诊去向:</span>
                  <el-tag type="warning">{{ rule.target_dept }}</el-tag>
                </div>
                <div class="rule-row">
                  <span class="label">优先级:</span>
                  <el-rate v-model="rule.priority" :max="3" disabled show-score text-color="#fff" />
                </div>
                <div class="rule-row">
                  <span class="label">触发条件:</span>
                  <span class="value">{{ rule.condition }}</span>
                </div>
                <div v-if="rule.auto_notify" class="rule-row">
                  <span class="label">自动通知:</span>
                  <span class="value">到达分诊科室时通知值班医生</span>
                </div>
              </div>
              <div class="rule-footer">
                <span class="update-time">更新于: {{ rule.update_time }}</span>
                <div class="rule-actions">
                  <el-button size="small" type="primary" link icon="Edit" @click="handleEditRule(rule)">编辑</el-button>
                  <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteRule(rule)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 呼叫屏设置 -->
        <el-tab-pane label="呼叫屏设置" name="screen">
          <div class="tab-header">
            <el-button type="primary" icon="Plus" @click="handleAddScreen">新增屏幕配置</el-button>
          </div>

          <div class="screen-grid">
            <div v-for="screen in screenList" :key="screen.id" class="screen-card glass-card">
              <div class="screen-preview">
                <div class="preview-header">{{ screen.title }}</div>
                <div class="preview-body">
                  <div class="preview-item" v-for="item in screen.display_items.slice(0, 5)" :key="item">
                    {{ item }}
                  </div>
                </div>
              </div>
              <div class="screen-info">
                <h4 class="screen-name">{{ screen.name }}</h4>
                <div class="screen-details">
                  <div class="detail-row">
                    <span class="label">位置:</span>
                    <span>{{ screen.location }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">分辨率:</span>
                    <span>{{ screen.resolution }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">语音播报:</span>
                    <el-tag :type="screen.voice_enabled ? 'success' : 'info'" size="small">
                      {{ screen.voice_enabled ? '开启' : '关闭' }}
                    </el-tag>
                  </div>
                </div>
                <div class="screen-actions">
                  <el-button size="small" type="primary" link icon="Edit" @click="handleEditScreen(screen)">编辑</el-button>
                  <el-button size="small" type="primary" link icon="VideoPlay" @click="handlePreview(screen)">预览</el-button>
                  <el-button size="small" type="danger" link icon="Delete" @click="handleDeleteScreen(screen)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 新增/编辑分诊规则对话框 -->
    <el-dialog
      v-model="ruleDialogVisible"
      :title="ruleDialogTitle"
      width="600px"
      @close="handleRuleDialogClose"
    >
      <el-form :model="ruleForm" :rules="ruleRules" ref="ruleFormRef" label-width="100px">
        <el-form-item label="症状名称" prop="symptom">
          <el-input v-model="ruleForm.symptom" placeholder="如：发热≥38.5℃" />
        </el-form-item>
        <el-form-item label="分诊去向" prop="target_dept">
          <el-select v-model="ruleForm.target_dept" placeholder="请选择分诊科室" style="width: 100%">
            <el-option label="发热门诊" value="发热门诊" />
            <el-option label="急诊科" value="急诊科" />
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="儿科" value="儿科" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-rate v-model="ruleForm.priority" :max="3" />
        </el-form-item>
        <el-form-item label="触发条件" prop="condition">
          <el-input v-model="ruleForm.condition" type="textarea" :rows="3" placeholder="如：体温≥38.5℃ 且 持续超过2小时" />
        </el-form-item>
        <el-form-item label="自动通知">
          <el-switch v-model="ruleForm.auto_notify" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRule">确定</el-button>
      </template>
    </el-dialog>

    <!-- 呼叫屏设置对话框 -->
    <el-dialog
      v-model="screenDialogVisible"
      :title="screenDialogTitle"
      width="700px"
      @close="handleScreenDialogClose"
    >
      <el-form :model="screenForm" :rules="screenRules" ref="screenFormRef" label-width="100px">
        <el-form-item label="屏幕名称" prop="name">
          <el-input v-model="screenForm.name" placeholder="如：一楼候诊大厅" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="screenForm.location" placeholder="如：1楼大厅东侧" />
        </el-form-item>
        <el-form-item label="分辨率" prop="resolution">
          <el-select v-model="screenForm.resolution" placeholder="请选择分辨率" style="width: 100%">
            <el-option label="1920×1080" value="1920×1080" />
            <el-option label="1366×768" value="1366×768" />
            <el-option label="1280×720" value="1280×720" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="screenForm.title" placeholder="如：候诊大厅叫号屏" />
        </el-form-item>
        <el-form-item label="显示内容" prop="display_items">
          <div class="display-items">
            <div v-for="(item, idx) in screenForm.display_items" :key="idx" class="display-item">
              <el-checkbox v-model="screenForm.display_items" :label="item" @change="(val: any) => toggleDisplayItem(item, val)">
                {{ item }}
              </el-checkbox>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="语音播报">
          <el-switch v-model="screenForm.voice_enabled" />
        </el-form-item>
        <el-form-item v-if="screenForm.voice_enabled" label="播报内容">
          <el-input v-model="screenForm.voice_text" placeholder="请输入播报内容模板" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="screenDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitScreen">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Warning
} from '@element-plus/icons-vue'

const props = defineProps<{ defaultTab?: string }>()

const activeTab = ref(props.defaultTab || 'triage')

// 分诊规则
const triageFilter = ref('')

const triageRules = ref([
  { id: 1, symptom: '发热≥38.5℃', target_dept: '发热门诊', priority: 3, condition: '体温≥38.5℃ 且 持续超过2小时', auto_notify: true, enabled: true, update_time: '2026-06-15 10:30' },
  { id: 2, symptom: '头部外伤出血', target_dept: '急诊科', priority: 3, condition: '头部开放性伤口伴活动性出血', auto_notify: true, enabled: true, update_time: '2026-06-10 14:00' },
  { id: 3, symptom: '胸痛', target_dept: '内科', priority: 3, condition: '持续胸痛≥10分钟', auto_notify: true, enabled: true, update_time: '2026-06-12 09:00' },
  { id: 4, symptom: '儿童高热', target_dept: '儿科', priority: 2, condition: '年龄≤14岁 且 体温≥39℃', auto_notify: false, enabled: true, update_time: '2026-06-08 16:30' },
  { id: 5, symptom: '咳嗽伴呼吸困难', target_dept: '内科', priority: 2, condition: '持续咳嗽伴呼吸频率>30次/分', auto_notify: false, enabled: true, update_time: '2026-06-05 11:00' }
])

const filteredTriageRules = computed(() => {
  if (!triageFilter.value) return triageRules.value
  return triageRules.value.filter(r => r.target_dept === triageFilter.value || r.symptom.includes(triageFilter.value))
})

// 规则对话框
const ruleDialogVisible = ref(false)
const ruleDialogTitle = ref('新增分诊规则')
const ruleFormRef = ref<FormInstance>()
const isEditRule = ref(false)

const ruleForm = reactive({
  id: 0,
  symptom: '',
  target_dept: '',
  priority: 2,
  condition: '',
  auto_notify: false,
  enabled: true
})

const ruleRules: FormRules = {
  symptom: [{ required: true, message: '请输入症状名称', trigger: 'blur' }],
  target_dept: [{ required: true, message: '请选择分诊去向', trigger: 'change' }],
  condition: [{ required: true, message: '请输入触发条件', trigger: 'blur' }]
}

const handleAddRule = () => {
  ruleDialogTitle.value = '新增分诊规则'
  isEditRule.value = false
  ruleDialogVisible.value = true
}

const handleEditRule = (rule: any) => {
  ruleDialogTitle.value = '编辑分诊规则'
  isEditRule.value = true
  Object.assign(ruleForm, rule)
  ruleDialogVisible.value = true
}

const handleDeleteRule = (rule: any) => {
  ElMessageBox.confirm(`确定要删除规则"${rule.symptom}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    triageRules.value = triageRules.value.filter(r => r.id !== rule.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSubmitRule = async () => {
  if (!ruleFormRef.value) return
  await ruleFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditRule.value) {
        const idx = triageRules.value.findIndex(r => r.id === ruleForm.id)
        if (idx !== -1) {
          triageRules.value[idx] = { ...ruleForm, update_time: new Date().toLocaleString() }
        }
        ElMessage.success('修改成功')
      } else {
        triageRules.value.push({ ...ruleForm, id: Date.now(), update_time: new Date().toLocaleString() })
        ElMessage.success('新增成功')
      }
      ruleDialogVisible.value = false
    }
  })
}

const handleRuleDialogClose = () => {
  ruleFormRef.value?.resetFields()
  Object.assign(ruleForm, { id: 0, symptom: '', target_dept: '', priority: 2, condition: '', auto_notify: false, enabled: true })
}

// 呼叫屏设置
const screenList = ref([
  { id: 1, name: '一楼候诊大厅', location: '1楼大厅东侧', resolution: '1920×1080', title: '候诊大厅叫号屏', display_items: ['科室名称', '当前叫号', '候诊列表', '医生信息', '时间日期'], voice_enabled: true, voice_text: '请{number}号{name}到{dept}就诊' },
  { id: 2, name: '呼吸内科候诊屏', location: '2楼呼吸内科候诊区', resolution: '1920×1080', title: '呼吸内科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到呼吸内科{room}就诊' },
  { id: 3, name: '心内科候诊屏', location: '3楼心内科候诊区', resolution: '1920×1080', title: '心内科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到心内科{room}就诊' },
  { id: 4, name: '骨科候诊屏', location: '2楼骨科候诊区', resolution: '1920×1080', title: '骨科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到骨科{room}就诊' },
  { id: 5, name: '儿科候诊屏', location: '1楼儿科诊区', resolution: '1366×768', title: '儿科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 6, name: '神经内科候诊屏', location: '3楼神经内科候诊区', resolution: '1920×1080', title: '神经内科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到神经内科{room}就诊' },
  { id: 7, name: '消化内科候诊屏', location: '2楼消化内科候诊区', resolution: '1920×1080', title: '消化内科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到消化内科{room}就诊' },
  { id: 8, name: '妇产科候诊屏', location: '4楼妇产科候诊区', resolution: '1920×1080', title: '妇产科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到妇产科{room}就诊' },
  { id: 9, name: '泌尿外科候诊屏', location: '3楼泌尿外科候诊区', resolution: '1920×1080', title: '泌尿外科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到泌尿外科{room}就诊' },
  { id: 10, name: '皮肤科候诊屏', location: '2楼皮肤科候诊区', resolution: '1366×768', title: '皮肤科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 11, name: '眼科候诊屏', location: '3楼眼科候诊区', resolution: '1920×1080', title: '眼科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到眼科{room}就诊' },
  { id: 12, name: '耳鼻喉科候诊屏', location: '3楼耳鼻喉科候诊区', resolution: '1366×768', title: '耳鼻喉科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 13, name: '口腔科候诊屏', location: '3楼口腔科候诊区', resolution: '1366×768', title: '口腔科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 14, name: '内分泌科候诊屏', location: '4楼内分泌科候诊区', resolution: '1920×1080', title: '内分泌科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到内分泌科{room}就诊' },
  { id: 15, name: '急诊科候诊屏', location: '1楼急诊大厅', resolution: '1920×1080', title: '急诊科叫号屏', display_items: ['科室名称', '当前叫号', '候诊列表', '医生信息', '时间日期'], voice_enabled: true, voice_text: '请{number}号{name}到急诊科{room}' },
  { id: 16, name: '中医科候诊屏', location: '4楼中医科候诊区', resolution: '1366×768', title: '中医科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: true, voice_text: '请{number}号到中医科{room}就诊' },
  { id: 17, name: '康复医学科候诊屏', location: '5楼康复科候诊区', resolution: '1366×768', title: '康复科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 18, name: '肿瘤科候诊屏', location: '5楼肿瘤科候诊区', resolution: '1920×1080', title: '肿瘤科叫号屏', display_items: ['当前叫号', '候诊列表', '医生信息'], voice_enabled: true, voice_text: '请{number}号到肿瘤科{room}就诊' },
  { id: 19, name: '血液科候诊屏', location: '5楼血液科候诊区', resolution: '1366×768', title: '血液科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 20, name: '风湿免疫科候诊屏', location: '4楼风湿免疫科候诊区', resolution: '1366×768', title: '风湿免疫科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
  { id: 21, name: '精神心理科候诊屏', location: '5楼心理科候诊区', resolution: '1366×768', title: '心理科叫号屏', display_items: ['当前叫号', '候诊列表'], voice_enabled: false, voice_text: '' },
])

// 屏幕对话框
const screenDialogVisible = ref(false)
const screenDialogTitle = ref('新增屏幕配置')
const screenFormRef = ref<FormInstance>()
const isEditScreen = ref(false)

const screenForm = reactive({
  id: 0,
  name: '',
  location: '',
  resolution: '1920×1080',
  title: '',
  display_items: [] as string[],
  voice_enabled: false,
  voice_text: ''
})

const screenRules: FormRules = {
  name: [{ required: true, message: '请输入屏幕名称', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }],
  resolution: [{ required: true, message: '请选择分辨率', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
}

const toggleDisplayItem = (item: string, val: any) => {
  if (val) {
    if (!screenForm.display_items.includes(item)) screenForm.display_items.push(item)
  } else {
    screenForm.display_items = screenForm.display_items.filter(i => i !== item)
  }
}

const handleAddScreen = () => {
  screenDialogTitle.value = '新增屏幕配置'
  isEditScreen.value = false
  screenDialogVisible.value = true
}

const handleEditScreen = (screen: any) => {
  screenDialogTitle.value = '编辑屏幕配置'
  isEditScreen.value = true
  Object.assign(screenForm, screen)
  screenDialogVisible.value = true
}

const handleDeleteScreen = (screen: any) => {
  ElMessageBox.confirm(`确定要删除"${screen.name}"吗？`, '删除确认', { type: 'warning' }).then(() => {
    screenList.value = screenList.value.filter(s => s.id !== screen.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handlePreview = (screen: any) => {
  ElMessageBox.alert(`
    <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px;text-align:center">
      <h3 style="margin:0 0 15px;font-size:24px">${screen.title}</h3>
      <div style="font-size:16px;line-height:2">
        ${screen.display_items.map((item: string) => `<div>${item}: ---</div>`).join('')}
      </div>
    </div>
  `, '屏幕预览', { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' })
}

const handleSubmitScreen = async () => {
  if (!screenFormRef.value) return
  await screenFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditScreen.value) {
        const idx = screenList.value.findIndex(s => s.id === screenForm.id)
        if (idx !== -1) screenList.value[idx] = { ...screenForm }
        ElMessage.success('修改成功')
      } else {
        screenList.value.push({ ...screenForm, id: Date.now() })
        ElMessage.success('新增成功')
      }
      screenDialogVisible.value = false
    }
  })
}

const handleScreenDialogClose = () => {
  screenFormRef.value?.resetFields()
  Object.assign(screenForm, { id: 0, name: '', location: '', resolution: '1920×1080', title: '', display_items: [], voice_enabled: false, voice_text: '' })
}
</script>

<style scoped lang="scss">
.nurse-manage {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #1E293B; }

.tab-section {
  padding: 0; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  :deep(.el-tabs__header) { background: rgba(235, 248, 255, 0.8); border-bottom: 1px solid rgba(66, 153, 225, 0.1); }
  :deep(.el-tabs__content) { padding: 20px; }
  :deep(.el-tabs__item) { color: #64748B; }
  :deep(.el-tabs__item.is-active) { color: #4299E1; background: rgba(66, 153, 225, 0.1); }
}

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }

.rule-list { display: flex; flex-direction: column; gap: 16px; }

.rule-card {
  padding: 20px; border-radius: 12px;
  transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(66, 153, 225, 0.12); }
}

.rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.rule-title { display: flex; align-items: center; gap: 8px; }
.rule-name { font-size: 16px; font-weight: 600; color: #1E293B; }

.rule-body { margin-bottom: 15px; }
.rule-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rule-row .label { color: #64748B; min-width: 80px; }
.rule-row .value { color: #1E293B; }

.rule-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(66, 153, 225, 0.1); padding-top: 12px; }
.update-time { font-size: 13px; color: #94A3B8; }

.screen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }

.screen-card {
  border-radius: 12px; overflow: hidden; transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(66, 153, 225, 0.12); }
}

.screen-preview {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%); padding: 20px; text-align: center;
  .preview-header { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1E293B; }
  .preview-body { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #4A5568; }
}

.screen-info { padding: 16px; }
.screen-name { margin: 0 0 12px; font-size: 16px; color: #1E293B; }
.screen-details { margin-bottom: 12px; }
.detail-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #4A5568; }
.detail-row .label { color: #94A3B8; min-width: 60px; }
.screen-actions { display: flex; gap: 8px; }

.glass-card { background: rgba(255,255,255,0.95); border: 1px solid rgba(66, 153, 225, 0.1); box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06); }

:deep(.el-tag) { border: 1px solid rgba(66, 153, 225, 0.2); border-radius: 6px; }
:deep(.el-tag--warning) { background: rgba(250, 204, 21, 0.1); color: #ECC94B; }
:deep(.el-rate) { .el-rate__icon { margin-right: 4px; } }

:deep(.el-table) {
  background: rgba(255,255,255,0.95); border-radius: 12px;
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

:deep(.el-switch__label) { color: #64748B; }
:deep(.el-switch.is-active .el-switch__label) { color: #4299E1; }
</style>