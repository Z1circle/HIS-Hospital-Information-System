<template>
  <div class="records-page">
    <header class="page-header">
      <div class="back-btn" @click="router.back()">←</div>
      <h1>我的病历</h1>
      <div></div>
    </header>

    <div class="records-content">
      <!-- 无病历 -->
      <div v-if="!myRecords.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无病历记录</p>
        <p class="sub">就诊后医生会为您写入电子病历</p>
      </div>

      <!-- 病历列表 -->
      <div v-else>
        <div v-for="record in myRecords" :key="record.id" class="record-card">
          <div class="record-header" @click="toggleRecord(record.id ?? 0)">
            <div class="record-meta">
              <span class="visit-type tag-first">门诊</span>
              <span class="record-date">{{ record.visit_date || '—' }}</span>
              <span class="record-doctor">医生 #{{ record.doctor_id || '—' }}</span>
              <span :class="['record-status', 'rs-'+record.status]">{{ statusLabel(record.status) }}</span>
            </div>
            <div class="record-diag">
              <span class="diag-main">诊断：{{ record.diagnosis || '（待填写）' }}</span>
            </div>
            <span class="expand-icon">{{ expandedId===record.id ? '▲' : '▼' }}</span>
          </div>

          <div v-if="expandedId===record.id" class="record-detail">
            <div v-for="field in displayFields" :key="field.key" class="rd-row">
              <div class="rd-label">{{ field.label }}</div>
              <div class="rd-value">{{ (record as any)[field.key] || '（未记录）' }}</div>
            </div>

            <!-- 诊断列表 -->
            <div class="rd-row" v-if="record.diagnoses.length">
              <div class="rd-label">诊断记录</div>
              <div class="rd-value">
                <div v-for="(d, i) in record.diagnoses.filter((d: any) => !d.abolished)" :key="i" class="diag-item">
                  <span v-if="d.icd" class="diag-icd">{{ d.icd }}</span>
                  <span class="diag-name">{{ d.name }}</span>
                  <span v-if="d.isMain" class="diag-tag-main">主诊</span>
                </div>
              </div>
            </div>

            <!-- 相关医嘱 -->
            <div class="rd-row" v-if="getRecordOrders(record.id).length">
              <div class="rd-label">医嘱处方</div>
              <div class="rd-value">
                <div v-for="(o, oi) in getRecordOrders(record.id)" :key="oi" class="order-row">
                  <span class="o-name">{{ o.item_name }}</span>
                  <span class="o-sub">{{ o.dosage }} {{ o.frequency }}</span>
                  <span class="o-status">{{ o.quantity }}{{ o.unit }}</span>
                </div>
              </div>
            </div>

            <div class="record-footer">
              <span class="rf-time">就诊日期：{{ record.visit_date || '—' }}</span>
              <button class="btn-print" @click="printRecord(record)">🖨 打印病历</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHisStore } from '@/stores/his'

const router = useRouter()
const hisStore = useHisStore()
const currentRecord = hisStore.currentRecord
const currentOrders = hisStore.currentOrders

const expandedId = ref<number | null>(null)

// 展示当前就诊记录（将单个 currentRecord 包装为数组展示）
const myRecords = computed(() => {
  if (!currentRecord.value) return []
  return [currentRecord.value]
})

const getRecordOrders = (_recordId: any) =>
  currentOrders.value

const displayFields = [
  { key: 'chief', label: '主诉' },
  { key: 'history', label: '现病史' },
  { key: 'past', label: '既往史' },
  { key: 'allergy', label: '过敏史' },
  { key: 'physical', label: '体格检查' },
  { key: 'auxiliary', label: '辅助检查' },
  { key: 'suggestion', label: '处理意见' },
]

const statusLabel = (s: string) => {
  const map: Record<string, string> = { draft: '草稿', saved: '已保存', signed: '已签名' }
  return map[s] || s
}

const toggleRecord = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}

const printRecord = (_record: any) => {
  window.print()
}
</script>

<style scoped>
.records-page { min-height: 100vh; background: #f5f7fa; }
.page-header { background: #1677ff; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; color: white; position: sticky; top: 0; z-index: 100; }
.back-btn { font-size: 22px; cursor: pointer; }
.page-header h1 { font-size: 17px; font-weight: bold; margin: 0; }
.records-content { padding: 16px; max-width: 800px; margin: 0 auto; }

.empty-state { text-align: center; padding: 60px 20px; color: #bbb; }
.empty-icon { font-size: 60px; margin-bottom: 12px; }
.empty-state p { font-size: 16px; color: #999; margin: 0 0 6px; }
.empty-state .sub { font-size: 13px; color: #bbb; }

.record-card { background: white; border-radius: 12px; margin-bottom: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }

.record-header { display: flex; align-items: center; padding: 14px 16px; cursor: pointer; gap: 12px; }
.record-header:hover { background: #f5f7ff; }
.record-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
.visit-type { padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
.tag-first { background: #e6f4ff; color: #1677ff; }
.tag-revisit { background: #f6ffed; color: #52c41a; }
.record-date { font-size: 13px; color: #333; font-weight: 600; }
.record-doctor { font-size: 12px; color: #666; }
.record-status { font-size: 11px; padding: 1px 6px; border-radius: 3px; }
.rs-draft { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
.rs-saved { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.rs-signed { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; }
.record-diag { flex: 1; }
.diag-main { font-size: 14px; font-weight: 600; color: #333; }
.expand-icon { color: #999; font-size: 12px; }

.record-detail { padding: 0 16px 16px; border-top: 1px solid #f0f0f0; }
.rd-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; gap: 12px; }
.rd-row:last-of-type { border-bottom: none; }
.rd-label { width: 80px; font-size: 12px; color: #999; flex-shrink: 0; padding-top: 2px; }
.rd-value { flex: 1; font-size: 13px; color: #333; line-height: 1.6; }

.diag-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.diag-icd { font-size: 11px; background: #f0f0f0; color: #666; padding: 1px 5px; border-radius: 3px; }
.diag-name { font-size: 13px; color: #333; font-weight: 500; }
.diag-tag-main { font-size: 11px; background: #e6f4ff; color: #1677ff; padding: 1px 6px; border-radius: 3px; }

.order-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.o-name { font-size: 13px; font-weight: 500; color: #333; }
.o-sub { font-size: 12px; color: #999; }
.o-status { font-size: 11px; padding: 1px 6px; border-radius: 3px; }
.status-dispensed { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.status-executed { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; }
.status-abolished { background: #f5f5f5; color: #999; }

.record-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.rf-time { font-size: 12px; color: #bbb; }
.btn-print { background: white; border: 1px solid #d9d9d9; border-radius: 6px; padding: 5px 14px; cursor: pointer; font-size: 12px; color: #666; }
.btn-print:hover { border-color: #1677ff; color: #1677ff; }
</style>
