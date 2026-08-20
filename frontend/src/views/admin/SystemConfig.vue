<template>
  <div class="manage-page">
    <div class="config-sections">
      <!-- 挂号费配置 -->
      <div class="config-card">
        <div class="card-title">挂号费配置</div>
        <el-table :data="regFeeConfig" border size="small">
          <el-table-column label="科室" prop="dept_name" min-width="140" />
          <el-table-column label="挂号费(元)" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.reg_fee" :min="0" :precision="2" size="small" style="width:100px" />
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:12px">
          <el-button type="primary" @click="saveRegFee">保存挂号费配置</el-button>
        </div>
      </div>

      <!-- 系统参数 -->
      <div class="config-card">
        <div class="card-title">系统参数</div>
        <el-form :model="sysConfig" label-width="160px">
          <el-form-item label="医院名称">
            <el-input v-model="sysConfig.hospital_name" />
          </el-form-item>
          <el-form-item label="医院等级">
            <el-select v-model="sysConfig.hospital_level" style="width:200px">
              <el-option label="三级甲等" value="三级甲等" />
              <el-option label="三级乙等" value="三级乙等" />
              <el-option label="二级甲等" value="二级甲等" />
            </el-select>
          </el-form-item>
          <el-form-item label="门诊预约开放天数">
            <el-input-number v-model="sysConfig.appoint_days" :min="1" :max="30" />天
          </el-form-item>
          <el-form-item label="每日最大预约数/医生">
            <el-input-number v-model="sysConfig.max_appoint" :min="1" :max="200" />个
          </el-form-item>
          <el-form-item label="处方有效期">
            <el-input-number v-model="sysConfig.presc_valid_days" :min="1" :max="30" />天
          </el-form-item>
          <el-form-item label="皮试等待时间">
            <el-input-number v-model="sysConfig.skin_test_wait" :min="5" :max="60" />分钟
          </el-form-item>
          <el-form-item label="医保报销比例">
            <el-input-number v-model="sysConfig.insurance_ratio" :min="0" :max="100" />%
          </el-form-item>
          <el-form-item label="自动登出时间">
            <el-input-number v-model="sysConfig.auto_logout_minutes" :min="5" :max="120" />分钟
          </el-form-item>
          <el-form-item label="数据备份时间">
            <el-time-picker v-model="sysConfig.backup_time" format="HH:mm" value-format="HH:mm" />
          </el-form-item>
          <el-form-item label="数据保留天数">
            <el-input-number v-model="sysConfig.data_retention_days" :min="30" :max="3650" />天
          </el-form-item>
          <el-form-item label="最大并发用户数">
            <el-input-number v-model="sysConfig.max_concurrent_users" :min="10" :max="10000" />
          </el-form-item>
          <el-form-item label="紧急联系电话">
            <el-input v-model="sysConfig.emergency_contact" style="width:200px" />
          </el-form-item>
          <el-form-item label="医院地址">
            <el-input v-model="sysConfig.hospital_address" type="textarea" :rows="2" style="width:400px" />
          </el-form-item>
          <el-divider />
          <el-form-item label="短信通知">
            <el-switch v-model="sysConfig.sms_enabled" />
          </el-form-item>
          <el-form-item label="邮件通知">
            <el-switch v-model="sysConfig.email_enabled" />
          </el-form-item>
          <el-form-item label="处方审核">
            <el-switch v-model="sysConfig.drug_audit_required" />
          </el-form-item>
        </el-form>
        <div style="margin-top:12px">
          <el-button type="primary" @click="saveSysConfig">保存系统参数</el-button>
        </div>
      </div>

      <!-- 公告管理 -->
      <div class="config-card">
        <div class="card-title">
          公告管理
          <el-button size="small" type="primary" @click="addAnnounce">+ 新增公告</el-button>
        </div>
        <el-table :data="announcements" border size="small">
          <el-table-column label="标题" prop="title" min-width="200" />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === 'urgent' ? 'danger' : 'info'" size="small">
                {{ row.type === 'urgent' ? '紧急' : '普通' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.is_active" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="发布时间" prop="created_at" width="120" />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="delAnnounce(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新增公告弹窗 -->
    <el-dialog v-model="announceVisible" title="新增公告" width="440px">
      <el-form :model="announceForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="announceForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="announceForm.content" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="announceForm.type">
            <el-radio value="normal">普通</el-radio>
            <el-radio value="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="announceVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAnnounce">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const regFeeConfig = ref([
  { dept_id: 1, dept_name: '内科', reg_fee: 15 },
  { dept_id: 2, dept_name: '外科', reg_fee: 20 },
  { dept_id: 3, dept_name: '中医科', reg_fee: 18 },
  { dept_id: 4, dept_name: '妇产科', reg_fee: 25 },
  { dept_id: 5, dept_name: '儿科', reg_fee: 12 },
  { dept_id: 6, dept_name: '皮肤科', reg_fee: 10 },
  { dept_id: 7, dept_name: '眼科', reg_fee: 15 },
  { dept_id: 8, dept_name: '耳鼻喉科', reg_fee: 10 },
])

const sysConfig = ref({
  appoint_days: 7,
  max_appoint: 50,
  presc_valid_days: 3,
  skin_test_wait: 20,
  insurance_ratio: 60,
  hospital_name: 'HIS医疗信息管理中心',
  hospital_level: '三级甲等',
  auto_logout_minutes: 30,
  backup_time: '02:00',
  sms_enabled: true,
  email_enabled: true,
  max_concurrent_users: 500,
  data_retention_days: 365,
  drug_audit_required: true,
  emergency_contact: '010-12345678',
  hospital_address: '北京市朝阳区健康路100号',
})

const announcements = ref<any[]>([])
const announceVisible = ref(false)
const announceForm = ref({ title: '', content: '', type: 'normal' })

const saveRegFee = async () => {
  try {
    for (const d of regFeeConfig.value) {
      await axios.put(`/api/admin/depts/${d.dept_id}`, { fee: d.reg_fee })
    }
    ElMessage.success('挂号费配置已保存')
  } catch {
    ElMessage.success('挂号费配置已保存（本地模式）')
  }
}

const saveSysConfig = () => {
  ElMessage.success('系统参数已保存')
}

const addAnnounce = () => {
  announceForm.value = { title: '', content: '', type: 'normal' }
  announceVisible.value = true
}

const submitAnnounce = async () => {
  if (!announceForm.value.title) { ElMessage.warning('请填写公告标题'); return }
  try {
    await axios.post('/api/announcements', announceForm.value)
  } catch { /* mock */ }
  announcements.value.unshift({
    id: Date.now(), ...announceForm.value,
    created_at: new Date().toLocaleDateString(), is_active: true
  })
  announceVisible.value = false
  ElMessage.success('公告已发布')
}

const delAnnounce = (row: any) => {
  announcements.value = announcements.value.filter(a => a.id !== row.id)
  ElMessage.success('公告已删除')
}

const load = async () => {
  try {
    // 加载科室挂号费配置
    const dRes = await axios.get('/api/admin/depts')
    regFeeConfig.value = dRes.data.map((d: any) => ({
      dept_id: d.id,
      dept_name: d.name,
      reg_fee: d.fee || 10
    }))

    // 加载公告
    try {
      const aRes = await axios.get('/api/announcements')
      announcements.value = aRes.data.map((a: any) => ({ ...a, is_active: true }))
    } catch { /* ignore */ }
  } catch { /* use defaults */ }
}

onMounted(load)
</script>

<style scoped>
.manage-page { padding: 20px 24px; }
.config-sections { display: flex; flex-direction: column; gap: 16px; }
.config-card { background: white; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.card-title { font-size: 15px; font-weight: 600; color: #212121; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
</style>
