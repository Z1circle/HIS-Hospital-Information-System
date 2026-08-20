/**
 * 预约服务 - 支持多标签页并发抢号
 * 使用 localStorage + BroadcastChannel 模拟真实抢号场景
 */

export interface TimeSlot {
  id: string           // 唯一标识：doctorId + time
  doctorId: string
  doctorName: string
  time: string         // 如 "周一上午"
  total: number        // 总号源
  remaining: number    // 剩余号源
  version: number      // 版本号，用于乐观锁
  lockHolder: string | null  // 当前锁定者
  lockExpiry: number   // 锁过期时间
}

export interface BookingRecord {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  time: string
  bookedAt: number
}

const STORAGE_KEY = 'his_appointments'
const CHANNEL_NAME = 'his_appointment_channel'
const LOCK_DURATION = 5000  // 锁持续时间：5秒
const LOCK_RETRY_INTERVAL = 100  // 抢锁重试间隔：100ms
const MAX_LOCK_ATTEMPTS = 50    // 最多抢锁50次

class AppointmentService {
  private channel: BroadcastChannel
  private tabId: string
  private listeners: Map<string, Function> = new Map()

  constructor() {
    this.tabId = this.generateTabId()
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event) => this.handleMessage(event.data)
    
    // 定期清理过期锁
    setInterval(() => this.cleanExpiredLocks(), 1000)
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getAppointments(): Map<string, TimeSlot> {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return new Map()
      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    } catch {
      return new Map()
    }
  }

  private saveAppointments(appointments: Map<string, TimeSlot>): void {
    const obj = Object.fromEntries(appointments)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  }

  private handleMessage(msg: { type: string; slotId?: string; tabId?: string; data?: any }) {
    const { type, slotId, tabId, data } = msg
    
    // 忽略自己发送的消息
    if (tabId === this.tabId) return

    switch (type) {
      case 'BOOKING_START':
        // 有人开始抢号
        this.notify('booking_start', { slotId, competitorId: tabId })
        break
        
      case 'SLOT_LOCKED':
        // 有人锁定了号源
        if (slotId) {
          this.updateSlotFromMessage(slotId, data)
          this.notify('slot_locked', { slotId, lockHolder: tabId })
        }
        break
        
      case 'BOOKING_SUCCESS':
        // 预约成功
        if (slotId) {
          this.updateSlotFromMessage(slotId, data)
          this.notify('booking_success', { slotId, booker: tabId })
        }
        break
        
      case 'BOOKING_FAILED':
        // 预约失败，释放锁
        if (slotId) {
          this.updateSlotFromMessage(slotId, data)
          this.notify('booking_failed', { slotId })
        }
        break
        
      case 'SLOT_RELEASED':
        // 有人释放了锁
        if (slotId) {
          this.updateSlotFromMessage(slotId, data)
          this.notify('slot_released', { slotId })
        }
        break
        
      case 'REQUEST_STATE':
        // 请求当前状态
        if (slotId) {
          const appointments = this.getAppointments()
          const slot = appointments.get(slotId)
          if (slot) {
            this.channel.postMessage({
              type: 'STATE_RESPONSE',
              slotId,
              tabId: this.tabId,
              data: slot
            })
          }
        }
        break
        
      case 'STATE_RESPONSE':
        // 收到状态响应，更新本地
        if (slotId && data) {
          const appointments = this.getAppointments()
          appointments.set(slotId, data)
          this.saveAppointments(appointments)
          this.notify('state_updated', { slotId, slot: data })
        }
        break
    }
  }

  private updateSlotFromMessage(slotId: string, data: TimeSlot): void {
    const appointments = this.getAppointments()
    appointments.set(slotId, data)
    this.saveAppointments(appointments)
  }

  private broadcast(type: string, slotId?: string, data?: any): void {
    this.channel.postMessage({ type, slotId, tabId: this.tabId, data })
  }

  private notify(event: string, data: any): void {
    const callback = this.listeners.get(event)
    if (callback) callback(data)
  }

  /**
   * 监听事件
   */
  on(event: string, callback: Function): void {
    this.listeners.set(event, callback)
  }

  off(event: string): void {
    this.listeners.delete(event)
  }

  /**
   * 清理过期锁
   */
  private cleanExpiredLocks(): void {
    const appointments = this.getAppointments()
    let changed = false
    
    appointments.forEach((slot, slotId) => {
      if (slot.lockHolder && Date.now() > slot.lockExpiry) {
        slot.lockHolder = null
        slot.version++
        changed = true
        this.broadcast('SLOT_RELEASED', slotId, slot)
      }
    })
    
    if (changed) {
      this.saveAppointments(appointments)
    }
  }

  /**
   * 初始化号源
   */
  initSlots(doctorId: string, doctorName: string, schedules: string[], totalPerSlot: number = 5): void {
    const appointments = this.getAppointments()
    
    schedules.forEach(time => {
      const slotId = `${doctorId}_${time}`
      if (!appointments.has(slotId)) {
        appointments.set(slotId, {
          id: slotId,
          doctorId,
          doctorName,
          time,
          total: totalPerSlot,
          remaining: totalPerSlot,
          version: 0,
          lockHolder: null,
          lockExpiry: 0
        })
      }
    })
    
    this.saveAppointments(appointments)
  }

  /**
   * 获取号源信息
   */
  getSlot(doctorId: string, time: string): TimeSlot | null {
    const slotId = `${doctorId}_${time}`
    const appointments = this.getAppointments()
    return appointments.get(slotId) || null
  }

  /**
   * 获取所有号源
   */
  getAllSlots(): TimeSlot[] {
    return Array.from(this.getAppointments().values())
  }

  /**
   * 请求同步状态
   */
  requestState(slotId: string): void {
    this.broadcast('REQUEST_STATE', slotId)
  }

  /**
   * 抢号核心逻辑
   * 返回：成功 / 被抢 / 超时
   */
  async bookSlot(
    slotId: string,
    patientId: string,
    patientName: string
  ): Promise<{ success: boolean; reason?: string; competitorId?: string }> {
    
    // 通知其他人开始抢号
    this.broadcast('BOOKING_START', slotId)

    // 尝试获取锁
    const lockResult = await this.acquireLock(slotId)
    if (!lockResult.success) {
      return { success: false, reason: lockResult.reason, competitorId: lockResult.holder }
    }

    // 再次检查号源
    const appointments = this.getAppointments()
    const slot = appointments.get(slotId)
    
    if (!slot) {
      this.releaseLock(slotId)
      return { success: false, reason: '号源不存在' }
    }

    if (slot.remaining <= 0) {
      this.releaseLock(slotId)
      return { success: false, reason: '号源已被抢完' }
    }

    // 模拟挂号费支付确认时间（500-1500ms随机）
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    // 再次检查锁是否还持有（支付期间可能被抢）
    const currentSlot = appointments.get(slotId)
    if (currentSlot?.lockHolder !== this.tabId) {
      this.releaseLock(slotId)
      return { success: false, reason: '支付超时，号源已被释放' }
    }

    // 扣减号源
    slot.remaining--
    slot.version++
    slot.lockHolder = null
    slot.lockExpiry = 0

    // 保存预约记录
    const bookingRecord: BookingRecord = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      patientName,
      doctorId: slot.doctorId,
      doctorName: slot.doctorName,
      time: slot.time,
      bookedAt: Date.now()
    }
    this.saveBookingRecord(bookingRecord)

    appointments.set(slotId, slot)
    this.saveAppointments(appointments)

    // 广播成功
    this.broadcast('BOOKING_SUCCESS', slotId, slot)

    return { success: true }
  }

  /**
   * 尝试获取锁
   */
  private async acquireLock(slotId: string): Promise<{ success: boolean; reason?: string; holder?: string }> {
    const appointments = this.getAppointments()
    let attempts = 0

    while (attempts < MAX_LOCK_ATTEMPTS) {
      const slot = appointments.get(slotId)
      
      if (!slot) {
        return { success: false, reason: '号源不存在' }
      }

      // 检查锁状态
      if (slot.lockHolder && slot.lockHolder !== this.tabId) {
        if (Date.now() <= slot.lockExpiry) {
          // 锁被他人持有，等待并重试
          attempts++
          await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL))
          // 重新读取最新状态
          const refreshed = this.getAppointments().get(slotId)
          if (refreshed) appointments.set(slotId, refreshed)
          continue
        }
      }

      // 获取锁
      slot.lockHolder = this.tabId
      slot.lockExpiry = Date.now() + LOCK_DURATION
      slot.version++
      
      appointments.set(slotId, slot)
      this.saveAppointments(appointments)
      
      // 广播锁定状态
      this.broadcast('SLOT_LOCKED', slotId, slot)

      return { success: true }
    }

    return { success: false, reason: '抢号超时，请重试', holder: appointments.get(slotId)?.lockHolder || undefined }
  }

  /**
   * 释放锁
   */
  private releaseLock(slotId: string): void {
    const appointments = this.getAppointments()
    const slot = appointments.get(slotId)
    
    if (slot && slot.lockHolder === this.tabId) {
      slot.lockHolder = null
      slot.lockExpiry = 0
      slot.version++
      appointments.set(slotId, slot)
      this.saveAppointments(appointments)
      this.broadcast('SLOT_RELEASED', slotId, slot)
    }
  }

  /**
   * 保存预约记录
   */
  private saveBookingRecord(record: BookingRecord): void {
    const key = `his_bookings_${record.patientId}`
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push(record)
      localStorage.setItem(key, JSON.stringify(existing))
    } catch {
      localStorage.setItem(key, JSON.stringify([record]))
    }
  }

  /**
   * 获取用户的预约记录
   */
  getBookingRecords(patientId: string): BookingRecord[] {
    const key = `his_bookings_${patientId}`
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  }

  /**
   * 取消预约（释放号源）
   */
  cancelBooking(slotId: string, patientId: string): boolean {
    const appointments = this.getAppointments()
    const slot = appointments.get(slotId)
    
    if (!slot) return false
    
    // 检查是否是这个患者的预约
    const records = this.getBookingRecords(patientId)
    const record = records.find(r => r.doctorId === slot.doctorId && r.time === slot.time)
    
    if (!record) return false

    // 释放号源
    slot.remaining = Math.min(slot.remaining + 1, slot.total)
    slot.version++
    appointments.set(slotId, slot)
    this.saveAppointments(appointments)

    // 删除预约记录
    const updatedRecords = records.filter(r => r.id !== record.id)
    localStorage.setItem(`his_bookings_${patientId}`, JSON.stringify(updatedRecords))

    this.broadcast('SLOT_RELEASED', slotId, slot)

    return true
  }

  /**
   * 获取当前标签页ID
   */
  getTabId(): string {
    return this.tabId
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.channel.close()
    this.listeners.clear()
  }
}

// 导出单例
export const appointmentService = new AppointmentService()
