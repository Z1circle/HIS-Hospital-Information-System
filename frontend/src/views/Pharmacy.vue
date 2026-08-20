﻿<template>
  <div class="pharmacy-page">
    <header class="page-header">
      <div class="back-btn" @click="goBack">←</div>
      <h1>取药查询</h1>
      <div class="placeholder"></div>
    </header>

    <div class="card-section">
      <div class="card-item">
        <div class="card-icon"></div>
        <div class="card-info">
          <p class="card-title">就诊人信息</p>
          <p class="card-text">点击选择就诊人</p>
        </div>
        <div class="card-arrow"></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">取药记录</h2>
      <div class="record-list">
        <div class="record-item" v-for="record in records" :key="record.id">
          <div class="record-header">
            <span class="record-date">{{ record.date }}</span>
            <span :class="['record-status', record.status]">{{ record.statusText }}</span>
          </div>
          <div class="record-content">
            <div class="record-info">
              <p class="record-doctor">{{ record.doctor }}</p>
              <p class="record-dept">{{ record.department }}</p>
            </div>
            <div class="record-medicine">
              <p class="medicine-count">共 {{ record.medicineCount }} 种药品</p>
            </div>
          </div>
          <div class="record-footer">
            <span class="record-fee">费用: {{ record.fee }}</span>
            <button class="detail-btn" @click="viewDetail(record)">查看详情</button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">代煎查询</h2>
      <div class="decoct-list">
        <div class="decoct-item">
          <div class="decoct-status">
            <div class="status-dot decocting"></div>
            <span>煎药中</span>
          </div>
          <div class="decoct-info">
            <p>处方号: CF20240615001</p>
            <p>预计取药时间: 2024-06-17 14:00</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const records = [
  { id: 1, date: '2024-06-15', doctor: '张明华', department: '内科', medicineCount: 3, fee: 128.50, status: 'completed', statusText: '已取药' },
  { id: 2, date: '2024-06-14', doctor: '李秀英', department: '中医科', medicineCount: 5, fee: 256.00, status: 'completed', statusText: '已取药' },
  { id: 3, date: '2024-06-10', doctor: '王建国', department: '内科', medicineCount: 2, fee: 85.00, status: 'completed', statusText: '已取药' }
]

const goBack = () => {
  router.back()
}

const viewDetail = (record: typeof records[0]) => {
  alert(`查看取药详情: ${record.date} - ${record.doctor}`)
}
</script>

<style scoped>
.pharmacy-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background: linear-gradient(180deg, #8B4513 0%, #D2691E 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  font-size: 24px;
  cursor: pointer;
}

.page-header h1 {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.placeholder {
  width: 24px;
}

.card-section {
  padding: 16px;
}

.card-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.card-text {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #999;
}

.card-arrow {
  font-size: 20px;
  color: #999;
}

.section {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
}

.record-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.record-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.record-item:last-child {
  border-bottom: none;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.record-date {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.record-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}

.record-status.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.record-status.pending {
  background: #fff3e0;
  color: #e65100;
}

.record-content {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.record-info {
  flex: 1;
}

.record-doctor {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.record-dept {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #999;
}

.record-medicine {
  text-align: right;
}

.medicine-count {
  font-size: 12px;
  margin: 0;
  color: #8B4513;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-fee {
  font-size: 14px;
  color: #D2691E;
  font-weight: bold;
}

.detail-btn {
  background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%);
  border: none;
  color: white;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
}

.decoct-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.decoct-item {
  padding: 16px;
}

.decoct-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.decocting {
  background: #D2691E;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.decoct-status span {
  font-size: 14px;
  font-weight: bold;
  color: #D2691E;
}

.decoct-info p {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #666;
}
</style>
