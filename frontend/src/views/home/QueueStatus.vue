<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.push('/')"><ArrowLeft /></el-icon>
      <span>排队叫号</span>
      <div class="refresh-btn" @click="loadQueue">
        <el-icon><Refresh /></el-icon>
        <span>刷新</span>
      </div>
      <el-button size="small" text type="primary" @click="$router.push('/')" style="margin-left:8px">回首页</el-button>
    </div>

    <!-- 顶部当前叫号大卡（全宽） -->
    <div class="current-banner">
      <div class="banner-left">
        <div class="banner-label">当前叫号</div>
        <div class="banner-no">第 <span class="no-num">{{ currentQueue?.seq || '--' }}</span> 号</div>
        <div class="banner-name">{{ currentQueue?.patient_name ? maskName(currentQueue.patient_name) : '等待中' }}</div>
      </div>
      <div class="banner-center">
        <div class="dept-badge">{{ currentQueue?.dept_name || '呼吸内科' }} 2诊室</div>
        <div class="live-dot-wrap">
          <span class="live-dot"></span>
          <span class="live-text">实时更新</span>
        </div>
      </div>
      <div class="banner-right">
        <div class="queue-count">
          <span class="count-num">{{ queue.length }}</span>
          <span class="count-label">候诊人数</span>
        </div>
      </div>
    </div>

    <!-- 下方双栏 -->
    <div class="pc-layout">
      <!-- 左列：我的排队信息 -->
      <div class="left-col">
        <div v-if="myPosition" class="my-card">
          <div class="card-header">
            <span class="card-title">我的排队信息</span>
            <el-tag type="warning" size="small">待就诊</el-tag>
          </div>

          <div class="my-no-display">
            <div class="my-no">{{ myPosition }}</div>
            <div class="my-no-label">我的号码</div>
          </div>

          <div class="my-stats">
            <div class="stat-item">
              <div class="stat-val blue">{{ Math.max(0, myPosition - (currentQueue?.seq || 0)) }}</div>
              <div class="stat-label">前面还有</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-val orange">约{{ Math.max(0, myPosition - (currentQueue?.seq || 0)) * 5 }}分</div>
              <div class="stat-label">预计等待</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-val green">3楼</div>
              <div class="stat-label">候诊位置</div>
            </div>
          </div>

          <div class="my-tips">
            <el-icon><InfoFilled /></el-icon>
            请在候诊区等候，听到叫号后及时就诊，过号需重新排队
          </div>
        </div>

        <div v-else class="no-appt-card">
          <div class="no-appt-icon">📋</div>
          <p class="no-appt-text">您今日暂无预约挂号记录</p>
          <el-button type="primary" @click="$router.push('/appointment/dept')" size="small">立即预约</el-button>
        </div>

        <!-- 诊室信息卡 -->
        <div class="room-card">
          <div class="card-title">诊室信息</div>
          <div class="room-info-row">
            <span class="room-label">科室</span><span>呼吸内科</span>
          </div>
          <div class="room-info-row">
            <span class="room-label">诊室</span><span>3楼 2诊室</span>
          </div>
          <div class="room-info-row">
            <span class="room-label">医生</span><span>张明华（主任医师）</span>
          </div>
          <div class="room-info-row">
            <span class="room-label">出诊时间</span><span>上午 08:00 - 12:00</span>
          </div>
        </div>
      </div>

      <!-- 右列：候诊队列 -->
      <div class="right-col">
        <div class="queue-panel">
          <div class="card-header">
            <span class="card-title">候诊队列</span>
            <span class="queue-count-badge">共{{ queue.length }}人</span>
          </div>
          <div v-loading="loading" class="queue-list">
            <el-empty v-if="!loading && queue.length === 0" description="暂无候诊患者" :image-size="60" />
            <div
              v-for="item in queue"
              :key="item.seq"
              :class="[
                'queue-row',
                item.seq === myPosition ? 'my-row' : '',
                item.status === 'calling' ? 'calling-row' : '',
                item.status === 'done' ? 'done-row' : ''
              ]"
            >
              <div class="q-seq-wrap">
                <span class="q-seq">{{ item.seq }}</span>
              </div>
              <span class="q-name">{{ maskName(item.patient_name) }}</span>
              <div class="q-right">
                <span v-if="item.seq === myPosition" class="q-me-badge">我</span>
                <el-tag v-if="item.status === 'calling'" type="danger" size="small" effect="dark">就诊中</el-tag>
                <el-tag v-else-if="item.status === 'done'" type="info" size="small">已完成</el-tag>
                <el-tag v-else type="warning" size="small" effect="plain">候诊</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ArrowLeft, Refresh, InfoFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const { currentUser } = useUserStore()
const loading = ref(false)
const currentQueue = ref<any>(null)
const myPosition = ref<number | null>(null)
const queue = ref<any[]>([])

const maskName = (name: string) => {
  if (!name) return '--'
  if (name.length <= 1) return name
  return name.charAt(0) + (name.length > 2 ? '*' + name.slice(-1) : '*')
}

let timer: ReturnType<typeof setInterval>

const loadQueue = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/queue/status', {
      params: { patient_id: currentUser.value?.patient_id || currentUser.value?.id }
    })
    currentQueue.value = res.data.current
    myPosition.value = res.data.myPosition
    queue.value = res.data.queue || []
  } catch {
    const myName = currentUser.value?.real_name || '我'
    queue.value = [
      { seq: 1, patient_name: '李*华', status: 'done' },
      { seq: 2, patient_name: '王*', status: 'calling' },
      { seq: 3, patient_name: '张*国', status: 'pending' },
      { seq: 4, patient_name: '赵*强', status: 'pending' },
      { seq: 5, patient_name: myName, status: 'pending' },
      { seq: 6, patient_name: '刘*', status: 'pending' },
      { seq: 7, patient_name: '陈*', status: 'pending' },
    ]
    currentQueue.value = { seq: 2, patient_name: '王*', status: 'calling', dept_name: '呼吸内科' }
    myPosition.value = 5
  }
  loading.value = false
}

onMounted(() => {
  loadQueue()
  timer = setInterval(loadQueue, 10000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg);
  max-width: 960px;
  margin: 0 auto;
}

.nav-bar {
  background: white;
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 17px;
  font-weight: 600;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

.refresh-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #1E88E5;
  cursor: pointer;
  font-weight: 400;
}

/* 顶部横幅 */
.current-banner {
  background: linear-gradient(135deg, #1565C0, #1E88E5, #42A5F5);
  color: white;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.banner-label { font-size: 13px; opacity: 0.8; margin-bottom: 6px; }

.banner-no {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.no-num { font-size: 48px; font-weight: 800; }

.banner-name { font-size: 16px; opacity: 0.9; }

.banner-center { text-align: center; }

.dept-badge {
  background: rgba(255,255,255,0.25);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.live-dot-wrap { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; opacity: 0.9; }

.live-dot {
  width: 8px;
  height: 8px;
  background: #69F0AE;
  border-radius: 50%;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.banner-right { text-align: center; }

.count-num { font-size: 40px; font-weight: 800; display: block; }
.count-label { font-size: 13px; opacity: 0.8; }

/* 双栏布局 */
.pc-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  padding: 20px 20px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout { grid-template-columns: 1fr; }
}

/* 我的卡 */
.my-card, .room-card, .queue-panel {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #F0F0F0;
  margin-bottom: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title { font-size: 15px; font-weight: 600; color: #212121; }

.my-no-display {
  text-align: center;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
  margin-bottom: 16px;
}

.my-no {
  font-size: 56px;
  font-weight: 800;
  color: #1E88E5;
  line-height: 1;
}

.my-no-label { font-size: 13px; color: #9E9E9E; margin-top: 4px; }

.my-stats { display: flex; align-items: center; justify-content: space-around; margin-bottom: 16px; }

.stat-item { text-align: center; }
.stat-val { font-size: 20px; font-weight: 700; }
.stat-val.blue { color: #1E88E5; }
.stat-val.orange { color: #FB8C00; }
.stat-val.green { color: #43A047; }
.stat-label { font-size: 12px; color: #9E9E9E; margin-top: 2px; }
.stat-divider { width: 1px; height: 36px; background: #F0F0F0; }

.my-tips {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #757575;
  background: #FFF8E1;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.6;
}

/* 无预约 */
.no-appt-card {
  background: white;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  border: 1px solid #F0F0F0;
  margin-bottom: 14px;
}

.no-appt-icon { font-size: 40px; margin-bottom: 10px; }
.no-appt-text { font-size: 14px; color: #757575; margin-bottom: 12px; }

/* 诊室信息 */
.room-info-row {
  display: flex;
  font-size: 14px;
  padding: 7px 0;
  border-bottom: 1px solid #F5F5F5;
  color: #212121;
}

.room-info-row:last-child { border-bottom: none; }
.room-label { color: #9E9E9E; width: 70px; flex-shrink: 0; }

/* 候诊队列 */
.queue-panel { min-height: 300px; }

.queue-count-badge {
  font-size: 13px;
  color: #9E9E9E;
  background: #F5F7FA;
  padding: 2px 10px;
  border-radius: 10px;
}

.queue-list { display: flex; flex-direction: column; gap: 4px; }

.queue-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #757575;
  transition: background 0.15s;
}

.queue-row:hover { background: #FAFAFA; }

.queue-row.my-row {
  background: #E3F2FD;
  color: #1565C0;
  font-weight: 600;
}

.queue-row.calling-row { background: #FFEBEE; color: #C62828; }
.queue-row.done-row { color: #BDBDBD; }

.q-seq-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.calling-row .q-seq-wrap { background: #E53935; }
.calling-row .q-seq { color: white; }

.q-seq { font-size: 14px; font-weight: 700; }
.q-name { flex: 1; }

.q-right { display: flex; align-items: center; gap: 6px; }

.q-me-badge {
  font-size: 11px;
  background: #1E88E5;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}
</style>
