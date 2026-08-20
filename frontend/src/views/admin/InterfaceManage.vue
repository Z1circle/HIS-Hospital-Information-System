<template>
  <div class="interface-page">
    <div class="page-header-actions">
      <el-button type="primary" icon="Plus" @click="handleAdd">新增接口</el-button>
    </div>

    <div class="interface-list">
      <div v-for="item in interfaceList" :key="item.id" class="interface-card glass-card">
        <div class="card-header">
          <div class="interface-icon" :class="item.status">
            <el-icon :size="24"><Link /></el-icon>
          </div>
          <div class="interface-info">
            <h3 class="interface-name">{{ item.name }}</h3>
            <p class="interface-desc">{{ item.description }}</p>
          </div>
          <div class="status-badge" :class="item.status">
            <span class="status-dot"></span>
            <span>{{ statusText[item.status] }}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">API地址:</span>
            <span class="value">{{ item.api_url }}</span>
          </div>
          <div class="info-row">
            <span class="label">端口:</span>
            <span class="value">{{ item.port }}</span>
          </div>
          <div class="info-row">
            <span class="label">最后连接:</span>
            <span class="value">{{ item.last_connect }}</span>
          </div>
        </div>

        <div class="card-actions">
          <el-button size="small" type="primary" plain icon="Setting" @click="handleConfig(item)">
            参数配置
          </el-button>
          <el-button
            size="small"
            :type="item.testing ? '' : 'success'"
            :plain="!item.testing"
            :icon="item.testing ? 'Loading' : 'Connection'"
            :loading="item.testing"
            @click="handleTest(item)"
          >
            {{ item.testing ? '测试中...' : '连通性测试' }}
          </el-button>
          <el-button size="small" type="info" plain icon="Document" @click="handleViewLogs(item)">
            日志查看
          </el-button>
        </div>
      </div>
    </div>

    <!-- 参数配置抽屉 -->
    <el-drawer v-model="configDrawerVisible" title="接口参数配置" size="500px" :close-on-click-modal="false">
      <el-form :model="configForm" label-width="100px">
        <el-form-item label="接口名称">
          <el-input v-model="configForm.name" placeholder="请输入接口名称" />
        </el-form-item>
        <el-form-item label="API地址">
          <el-input v-model="configForm.api_url" placeholder="https://api.example.com" />
        </el-form-item>
        <el-form-item label="端口号">
          <el-input-number v-model="configForm.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="密钥">
          <el-input v-model="configForm.secret_key" type="password" show-password placeholder="请输入密钥" />
        </el-form-item>
        <el-form-item label="超时时间(秒)">
          <el-input-number v-model="configForm.timeout" :min="1" :max="300" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="configForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'

const statusText: Record<string, string> = {
  online: '在线',
  offline: '离线',
  testing: '测试中'
}

const interfaceList = ref([
  {
    id: 1,
    name: '医保接口',
    description: '医保局数据对接接口',
    api_url: 'https://api.medical.gov.cn',
    port: 443,
    last_connect: '2026-06-18 14:30:25',
    status: 'online',
    testing: false,
    secret_key: '',
    timeout: 30,
    enabled: true
  },
  {
    id: 2,
    name: 'LIS检验接口',
    description: '实验室信息系统对接',
    api_url: 'https://lis.hospital.com',
    port: 8080,
    last_connect: '2026-06-18 14:28:10',
    status: 'online',
    testing: false,
    secret_key: '',
    timeout: 30,
    enabled: true
  },
  {
    id: 3,
    name: 'PACS影像接口',
    description: '医学影像存档与通信系统',
    api_url: 'https://pacs.hospital.com',
    port: 8081,
    last_connect: '2026-06-18 10:15:00',
    status: 'offline',
    testing: false,
    secret_key: '',
    timeout: 60,
    enabled: true
  },
  {
    id: 4,
    name: '电子病历接口',
    description: '区域卫生信息平台对接',
    api_url: 'https://ehr.health.gov.cn',
    port: 443,
    last_connect: '2026-06-18 14:32:45',
    status: 'online',
    testing: false,
    secret_key: '',
    timeout: 30,
    enabled: true
  }
])

const configDrawerVisible = ref(false)
const configForm = ref({
  id: 0,
  name: '',
  api_url: '',
  port: 443,
  secret_key: '',
  timeout: 30,
  enabled: true
})

const handleAdd = () => {
  configForm.value = {
    id: 0,
    name: '',
    api_url: '',
    port: 443,
    secret_key: '',
    timeout: 30,
    enabled: true
  }
  configDrawerVisible.value = true
}

const handleConfig = (item: any) => {
  configForm.value = { ...item }
  configDrawerVisible.value = true
}

const saveConfig = () => {
  ElMessage.success('配置保存成功')
  configDrawerVisible.value = false
}

const handleTest = async (item: any) => {
  item.testing = true
  item.status = 'testing'

  setTimeout(() => {
    const success = Math.random() > 0.3
    item.testing = false
    item.status = success ? 'online' : 'offline'
    item.last_connect = new Date().toLocaleString()

    if (success) {
      ElMessage.success(`${item.name} 连接成功`)
    } else {
      ElMessage.error(`${item.name} 连接失败，请检查网络和配置`)
    }
  }, 2000)
}

const handleViewLogs = (item: any) => {
  window.open(`/api/interface/logs/${item.id}`, '_blank')
}
</script>

<style scoped>
.interface-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header-actions {
  display: flex;
  justify-content: flex-end;
}

.interface-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.98);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.25);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.interface-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #4299E1 0%, #2B6CB0 100%);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 8px 25px rgba(66, 153, 225, 0.35);
}

.interface-icon.offline {
  background: linear-gradient(145deg, #A0AEC0 0%, #718096 100%);
  box-shadow: 0 8px 25px rgba(113, 128, 150, 0.35);
}

.interface-icon.testing {
  background: linear-gradient(145deg, #ECC94B 0%, #D69E2E 100%);
  box-shadow: 0 8px 25px rgba(236, 201, 75, 0.35);
}

.interface-info {
  flex: 1;
}

.interface-name {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1A202C;
}

.interface-desc {
  margin: 0;
  font-size: 13px;
  color: #718096;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.online {
  background: rgba(104, 211, 145, 0.1);
  color: #38A169;
  border: 1px solid rgba(104, 211, 145, 0.2);
}

.status-badge.offline {
  background: rgba(245, 101, 101, 0.1);
  color: #E53E3E;
  border: 1px solid rgba(245, 101, 101, 0.2);
}

.status-badge.testing {
  background: rgba(236, 201, 75, 0.1);
  color: #D69E2E;
  border: 1px solid rgba(236, 201, 75, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.status-badge.online .status-dot {
  background: #48BB78;
}

.status-badge.offline .status-dot {
  background: #FC8181;
  animation: none;
}

.status-badge.testing .status-dot {
  background: #ECC94B;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-radius: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.info-row .label {
  color: #718096;
}

.info-row .value {
  color: #2D3748;
  font-family: 'Consolas', monospace;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

:deep(.el-button--small) {
  border-radius: 8px;
  font-size: 13px;
}

:deep(.el-drawer__header) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
  padding: 20px 24px;
}

:deep(.el-drawer__title) {
  color: #1A202C;
  font-size: 16px;
  font-weight: 700;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.15);
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