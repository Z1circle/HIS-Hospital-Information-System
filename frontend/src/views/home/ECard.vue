<template>
  <div class="page">
    <div class="nav-bar">
      <el-icon class="back-btn" @click="$router.back()"><ArrowLeft /></el-icon>
      <span>电子就诊卡</span>
    </div>

    <div class="pc-layout">
      <!-- 左列：电子就诊卡 -->
      <div class="left-col">
        <div class="ecard">
          <div class="ecard-header">
            <div class="hospital-badge">
              <span class="hospital-icon">🏥</span>
              <span class="hospital-name">湖北省中医院</span>
            </div>
            <div class="ecard-label">电子就诊卡</div>
          </div>

          <div class="patient-info">
            <div class="avatar">{{ currentUser?.real_name?.charAt(0) || '患' }}</div>
            <div class="info">
              <div class="patient-name">{{ currentUser?.real_name }}</div>
              <div class="patient-no">
                就诊卡号：MR{{ String(currentUser?.id || '').padStart(8, '0') }}
              </div>
              <div class="patient-phone">{{ currentUser?.phone }}</div>
            </div>
          </div>

          <!-- 模拟二维码 -->
          <div class="qr-section">
            <div class="qr-wrapper">
              <div class="qr-code">
                <div v-for="i in 10" :key="i" class="qr-row">
                  <div v-for="j in 10" :key="j" :class="['qr-cell', isBlack(i, j) ? 'black' : 'white']"></div>
                </div>
              </div>
              <div class="qr-text">
                <p class="qr-tip">扫码出示就诊</p>
                <p class="qr-expire">有效期至今日24:00</p>
              </div>
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="ecard-footer">
            <div class="footer-item">
              <span class="footer-label">门诊类型</span>
              <span>普通门诊</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">医保类型</span>
              <span>居民医保</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row">
          <el-button class="action-btn" @click="saveCardBtn">
            <span class="action-icon">💾</span>保存到相册
          </el-button>
          <el-button class="action-btn" @click="shareCard">
            <span class="action-icon">📤</span>分享就诊卡
          </el-button>
        </div>
      </div>

      <!-- 右列：说明与功能 -->
      <div class="right-col">
        <!-- 快速功能 -->
        <div class="feature-card">
          <div class="feature-title">就诊卡功能</div>
          <div class="feature-grid">
            <div class="feature-item" v-for="f in features" :key="f.label" @click="f.action">
              <div class="feature-icon">{{ f.icon }}</div>
              <div class="feature-name">{{ f.label }}</div>
            </div>
          </div>
        </div>

        <!-- 使用说明 -->
        <div class="tips-card">
          <div class="tips-title">使用说明</div>
          <div class="tips-list">
            <div class="tips-item">
              <div class="tips-num">01</div>
              <div class="tips-content">
                <div class="tips-item-title">挂号就诊</div>
                <div class="tips-item-desc">预约挂号后，出示此卡扫码签到即可就诊</div>
              </div>
            </div>
            <div class="tips-item">
              <div class="tips-num">02</div>
              <div class="tips-content">
                <div class="tips-item-title">检查取药</div>
                <div class="tips-item-desc">医生开具检查或处方后，扫码至对应窗口办理</div>
              </div>
            </div>
            <div class="tips-item">
              <div class="tips-num">03</div>
              <div class="tips-content">
                <div class="tips-item-title">费用缴纳</div>
                <div class="tips-item-desc">扫码支持微信、支付宝及医保卡缴费</div>
              </div>
            </div>
            <div class="tips-item">
              <div class="tips-num">04</div>
              <div class="tips-content">
                <div class="tips-item-title">安全保护</div>
                <div class="tips-item-desc">二维码每日刷新，请勿截图给他人使用</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 就诊须知 -->
        <div class="notice-card">
          <div class="notice-title">就诊须知</div>
          <p>就诊时请携带本人身份证，首次就诊建议提前15分钟到场完成信息核验。</p>
        </div>

        <!-- 就诊卡管理 -->
        <div class="manage-card">
          <div class="manage-header">
            <span class="manage-title">绑定的就诊卡</span>
            <el-button size="small" type="primary" @click="openAddCard">+ 添加就诊卡</el-button>
          </div>
          <el-empty v-if="ecards.length === 0" description="暂无绑定就诊卡" :image-size="50" />
          <div v-for="card in ecards" :key="card.id" class="bound-card-row">
            <div class="bc-icon">🏥</div>
            <div class="bc-info">
              <div class="bc-hospital">{{ card.hospital }}</div>
              <div class="bc-no">
                {{ visibleCards[card.id] ? card.cardNo : maskCardNo(card.cardNo) }}
                <el-icon class="eye-icon" @click="toggleVisible(card.id)">
                  <component :is="visibleCards[card.id] ? 'Hide' : 'View'" />
                </el-icon>
              </div>
              <div class="bc-name">{{ card.name }} · {{ card.insuranceType }}</div>
            </div>
            <div class="bc-actions">
              <el-button size="small" :icon="Edit" circle @click="openEditCard(card)" />
              <el-popconfirm title="确认删除？" @confirm="deleteCard(card.id)">
                <template #reference>
                  <el-button size="small" :icon="Delete" circle type="danger" />
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑就诊卡弹窗 -->
    <el-dialog v-model="cardDialogVisible" :title="editingCard ? '编辑就诊卡' : '添加就诊卡'" width="400px" align-center>
      <el-form :model="cardForm" label-width="80px">
        <el-form-item label="医院名称">
          <el-input v-model="cardForm.hospital" placeholder="如：湖北省中医院" clearable />
        </el-form-item>
        <el-form-item label="就诊卡号">
          <el-input v-model="cardForm.cardNo" placeholder="如：MR00000001" clearable />
        </el-form-item>
        <el-form-item label="持卡人">
          <el-input v-model="cardForm.name" clearable />
        </el-form-item>
        <el-form-item label="医保类型">
          <el-select v-model="cardForm.insuranceType" style="width:100%">
            <el-option label="自费" value="自费" />
            <el-option label="居民医保" value="居民医保" />
            <el-option label="职工医保" value="职工医保" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCardAction">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Edit, Delete } from '@element-plus/icons-vue'

const { currentUser } = useUserStore()
const router = useRouter()

// 生成伪随机二维码图案
const seed = parseInt(String(currentUser.value?.id || 1))
const isBlack = (i: number, j: number) => {
  if ((i <= 2 && j <= 2) || (i <= 2 && j >= 9) || (i >= 9 && j <= 2)) return true
  return ((i * 7 + j * 3 + seed) % 3) === 0
}

const saveCardBtn = () => ElMessage.info('截图保存功能请使用系统截图')
const shareCard = () => ElMessage.info('分享功能开发中')

const features = [
  { icon: '📅', label: '预约挂号', action: () => router.push('/appointment/dept') },
  { icon: '💊', label: '门诊缴费', action: () => router.push('/payment') },
  { icon: '📋', label: '门诊病历', action: () => router.push('/medical-records') },
  { icon: '🔢', label: '排队叫号', action: () => router.push('/queue') },
]

// ─── 就诊卡 CRUD ───────────────────────────────
interface ECardItem { id: string; hospital: string; cardNo: string; name: string; insuranceType: string }
const STORAGE_KEY = computed(() => `ecards_${currentUser.value?.id || 'guest'}`)
const ecards = ref<ECardItem[]>([])
const visibleCards = reactive<Record<string, boolean>>({})

const loadCards = () => {
  try { ecards.value = JSON.parse(localStorage.getItem(STORAGE_KEY.value) || '[]') } catch { ecards.value = [] }
}
const persistCards = () => localStorage.setItem(STORAGE_KEY.value, JSON.stringify(ecards.value))
const maskCardNo = (no: string) => no.length <= 4 ? no : no.slice(0,2) + '****' + no.slice(-4)
const toggleVisible = (id: string) => { visibleCards[id] = !visibleCards[id] }

const cardDialogVisible = ref(false)
const editingCard = ref<ECardItem | null>(null)
const cardForm = reactive({ hospital: '湖北省中医院', cardNo: '', name: '', insuranceType: '自费' })

const openAddCard = () => {
  editingCard.value = null
  Object.assign(cardForm, { hospital: '湖北省中医院', cardNo: '', name: currentUser.value?.real_name || '', insuranceType: '自费' })
  cardDialogVisible.value = true
}
const openEditCard = (card: ECardItem) => {
  editingCard.value = card
  Object.assign(cardForm, { ...card })
  cardDialogVisible.value = true
}
const saveCardAction = () => {
  if (!cardForm.cardNo.trim()) { ElMessage.warning('请输入就诊卡号'); return }
  if (!cardForm.name.trim()) { ElMessage.warning('请输入持卡人姓名'); return }
  if (editingCard.value) {
    const idx = ecards.value.findIndex(c => c.id === editingCard.value!.id)
    if (idx !== -1) ecards.value[idx] = { ...editingCard.value, ...cardForm }
    ElMessage.success('修改成功')
  } else {
    ecards.value.push({ id: 'c-' + Date.now(), ...cardForm })
    ElMessage.success('添加成功')
  }
  persistCards()
  cardDialogVisible.value = false
}
const deleteCard = (id: string) => {
  ecards.value = ecards.value.filter(c => c.id !== id)
  persistCards()
  ElMessage.success('已删除')
}

onMounted(loadCards)
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
}

.back-btn { cursor: pointer; color: #1E88E5; font-size: 20px; }

/* PC双栏 */
.pc-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  padding: 24px 24px 40px;
  align-items: start;
}

@media (max-width: 700px) {
  .pc-layout { grid-template-columns: 1fr; }
}

/* 就诊卡 */
.ecard {
  background: linear-gradient(135deg, #1565C0, #1E88E5, #42A5F5);
  border-radius: 20px;
  padding: 24px;
  color: white;
  box-shadow: 0 12px 32px rgba(30,136,229,0.45);
  margin-bottom: 14px;
}

.ecard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.hospital-badge { display: flex; align-items: center; gap: 8px; }
.hospital-icon { font-size: 20px; }
.hospital-name { font-size: 16px; font-weight: 700; }

.ecard-label {
  font-size: 12px;
  background: rgba(255,255,255,0.2);
  padding: 3px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.3);
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.25);
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
}

.patient-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.patient-no { font-size: 12px; opacity: 0.85; margin-bottom: 4px; font-family: monospace; }
.patient-phone { font-size: 13px; opacity: 0.8; }

/* 二维码 */
.qr-section {
  background: rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 18px;
}

.qr-wrapper { display: flex; align-items: center; justify-content: center; gap: 20px; }

.qr-code {
  background: white;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.qr-row { display: flex; gap: 1px; }

.qr-cell {
  width: 9px;
  height: 9px;
  border-radius: 1px;
}

.qr-cell.black { background: #1A237E; }
.qr-cell.white { background: white; }

.qr-text { color: white; }
.qr-tip { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.qr-expire { font-size: 12px; opacity: 0.75; }

.ecard-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,0.2);
  padding-top: 14px;
}

.footer-item { font-size: 13px; display: flex; flex-direction: column; gap: 2px; }
.footer-label { font-size: 11px; opacity: 0.75; }

/* 操作按钮 */
.action-row { display: flex; gap: 12px; }

.action-btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-icon { font-size: 16px; }

/* 右列 */
.feature-card, .tips-card, .notice-card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #F0F0F0;
  margin-bottom: 14px;
}

.feature-title, .tips-title, .notice-title {
  font-size: 15px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F5F5F5;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  background: #F5F7FA;
  transition: all 0.15s;
}

.feature-item:hover {
  background: #E3F2FD;
  transform: translateY(-2px);
}

.feature-icon { font-size: 24px; }
.feature-name { font-size: 12px; color: #424242; font-weight: 500; }

/* 使用说明 */
.tips-list { display: flex; flex-direction: column; gap: 14px; }

.tips-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.tips-num {
  width: 28px;
  height: 28px;
  background: #1E88E5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.tips-item-title { font-size: 14px; font-weight: 600; color: #212121; margin-bottom: 3px; }
.tips-item-desc { font-size: 13px; color: #757575; line-height: 1.5; }

/* 就诊须知 */
.notice-card {
  background: #FFF3E0;
  border-color: #FFB74D;
}

.notice-title { color: #E65100; border-color: #FFE0B2; }
.notice-card p { font-size: 13px; color: #5D4037; line-height: 1.7; }

/* 就诊卡管理面板 */
.manage-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  border: 1px solid #F0F0F0;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}

.manage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.manage-title { font-size: 14px; font-weight: 600; color: #212121; }

.bound-card-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #F5F5F5;
}
.bound-card-row:last-child { border-bottom: none; }

.bc-icon { font-size: 24px; flex-shrink: 0; }
.bc-info { flex: 1; min-width: 0; }
.bc-hospital { font-size: 13px; font-weight: 600; color: #1565C0; }
.bc-no { font-size: 12px; color: #555; display: flex; align-items: center; gap: 6px; margin: 2px 0; }
.bc-name { font-size: 12px; color: #9E9E9E; }
.bc-actions { display: flex; gap: 6px; flex-shrink: 0; }
.eye-icon { cursor: pointer; color: #1E88E5; font-size: 15px; }
</style>
