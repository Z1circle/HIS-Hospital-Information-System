<template>
  <div class="queue-page">
    <header class="page-header">
      <div class="back-btn" @click="goBack">←</div>
      <h1>排队叫号</h1>
      <div class="placeholder"></div>
    </header>

    <div class="current-queue">
      <div class="queue-card">
        <div class="queue-header">
          <span class="queue-title">当前就诊</span>
          <span class="queue-number">{{ currentQueue.number }}</span>
        </div>
        <div class="queue-info">
          <p class="queue-doctor">{{ currentQueue.doctor }}</p>
          <p class="queue-dept">{{ currentQueue.department }}</p>
          <p class="queue-room">诊室: {{ currentQueue.room }}</p>
        </div>
        <div class="queue-status">
          <div class="status-indicator"></div>
          <span>正在就诊</span>
        </div>
      </div>
    </div>

    <div class="my-queue">
      <div class="section-title">我的排队</div>
      <div class="my-queue-card">
        <div class="my-queue-header">
          <span class="my-number">第 {{ myQueue.position }} 位</span>
          <span class="my-status">{{ myQueue.status }}</span>
        </div>
        <div class="my-queue-info">
          <p class="my-doctor">{{ myQueue.doctor }}</p>
          <p class="my-dept">{{ myQueue.department }}</p>
          <p class="my-time">预计等待时间: {{ myQueue.waitTime }}</p>
        </div>
      </div>
    </div>

    <div class="queue-list">
      <div class="section-title">排队列表</div>
      <div class="list-container">
        <div class="list-item" v-for="item in queueList" :key="item.number">
          <span class="item-number">{{ item.number }}</span>
          <span class="item-name">{{ item.name }}</span>
          <span class="item-status">{{ item.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const currentQueue = {
  number: '012',
  doctor: '张明华',
  department: '内科',
  room: '302'
}

const myQueue = {
  position: 5,
  status: '等待中',
  doctor: '李秀英',
  department: '中医科',
  waitTime: '约30分钟'
}

const queueList = [
  { number: '013', name: '王*明', status: '待诊' },
  { number: '014', name: '李*华', status: '待诊' },
  { number: '015', name: '张*芳', status: '待诊' },
  { number: '016', name: '陈*强', status: '待诊' },
  { number: '017', name: '刘*英', status: '待诊' }
]

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.queue-page {
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

.current-queue {
  padding: 16px;
}

.queue-card {
  background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
  border-radius: 16px;
  padding: 20px;
  color: white;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.queue-title {
  font-size: 14px;
  opacity: 0.9;
}

.queue-number {
  font-size: 32px;
  font-weight: bold;
}

.queue-info {
  margin-bottom: 16px;
}

.queue-doctor {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.queue-dept {
  font-size: 14px;
  margin: 4px 0 0 0;
  opacity: 0.9;
}

.queue-room {
  font-size: 14px;
  margin: 4px 0 0 0;
  opacity: 0.9;
}

.queue-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.my-queue {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
}

.my-queue-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.my-queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.my-number {
  font-size: 24px;
  font-weight: bold;
  color: #D2691E;
}

.my-status {
  font-size: 12px;
  padding: 4px 10px;
  background: #fff3e0;
  color: #D2691E;
  border-radius: 12px;
}

.my-queue-info {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.my-doctor {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.my-dept {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #999;
}

.my-time {
  font-size: 12px;
  margin: 4px 0 0 0;
  color: #D2691E;
}

.queue-list {
  padding: 0 16px 16px;
}

.list-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.list-item:last-child {
  border-bottom: none;
}

.item-number {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.item-name {
  font-size: 14px;
  color: #666;
}

.item-status {
  font-size: 12px;
  color: #999;
}
</style>
