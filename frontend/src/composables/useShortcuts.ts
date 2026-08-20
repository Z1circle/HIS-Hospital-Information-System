import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useUserStore } from '@/stores/user'

export interface ShortcutDef {
  key: string
  name: string
  description: string
  default: string
}

export const SHORTCUT_DEFINITIONS: ShortcutDef[] = [
  { key: 'save_record', name: '快速保存', description: '暂存当前病历', default: 'Ctrl+S' },
  { key: 'send_orders', name: '发送医嘱', description: '提交处方到药房', default: 'Ctrl+Enter' },
  { key: 'refresh_queue', name: '刷新患者', description: '重新加载候诊队列', default: 'F2' },
  { key: 'prev_patient', name: '上一患者', description: '切换到上一位患者', default: 'Alt+P' },
  { key: 'next_patient', name: '下一患者', description: '切换到下一位患者', default: 'Alt+N' },
  { key: 'toggle_diagnosis', name: '诊断面板', description: '展开/折叠诊断录入区域', default: 'Ctrl+D' },
  { key: 'toggle_queue', name: '队列面板', description: '展开/折叠候诊队列', default: 'Ctrl+Q' },
  { key: 'focus_drug_search', name: '搜索药品', description: '聚焦药品搜索框', default: 'Ctrl+F' },
  { key: 'hotkey_prev', name: '热词上选', description: '热词匹配中选中上一个', default: 'Tab' },
  { key: 'hotkey_next', name: '热词下选', description: '热词匹配中选中下一个', default: 'Shift+Tab' },
  { key: 'hotkey_confirm', name: '热词确认', description: '使用选中的热词填入输入框', default: 'Enter' }
]

export const DEFAULT_SHORTCUTS: Record<string, string> = {}
SHORTCUT_DEFINITIONS.forEach(item => {
  DEFAULT_SHORTCUTS[item.key] = item.default
})

type ShortcutHandler = () => void

const registeredHandlers: Record<string, ShortcutHandler> = {}

export function useShortcuts() {
  const userStore = useUserStore()
  const currentUser = userStore.currentUser
  
  const shortcuts = ref<Record<string, string>>({ ...DEFAULT_SHORTCUTS })

  const parseShortcut = (shortcut: string): { modifiers: string[]; key: string } => {
    const parts = shortcut.split('+')
    const modifiers: string[] = []
    let key = ''
    
    parts.forEach(part => {
      const upper = part.trim().toUpperCase()
      if (['CTRL', 'ALT', 'SHIFT', 'META'].includes(upper)) {
        modifiers.push(upper)
      } else {
        key = upper
      }
    })
    
    return { modifiers, key }
  }

  const matchShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
    const { modifiers, key } = parseShortcut(shortcut)
    
    if (e.key.toUpperCase() !== key && 
        !(key === 'SPACE' && e.key === ' ') &&
        !(key === 'ENTER' && e.key === 'Enter') &&
        !(key.startsWith('ARROW') && e.key.startsWith('Arrow'))) {
      return false
    }
    
    const ctrlPressed = e.ctrlKey || e.metaKey
    const altPressed = e.altKey
    const shiftPressed = e.shiftKey
    
    const requiresCtrl = modifiers.includes('CTRL') || modifiers.includes('META')
    const requiresAlt = modifiers.includes('ALT')
    const requiresShift = modifiers.includes('SHIFT')
    
    return ctrlPressed === requiresCtrl && 
           altPressed === requiresAlt && 
           shiftPressed === requiresShift
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable) {
      return
    }

    for (const [actionKey, shortcut] of Object.entries(shortcuts.value)) {
      if (matchShortcut(e, shortcut)) {
        e.preventDefault()
        e.stopPropagation()
        const handler = registeredHandlers[actionKey]
        if (handler) {
          handler()
        }
        break
      }
    }
  }

  const registerHandler = (actionKey: string, handler: ShortcutHandler) => {
    registeredHandlers[actionKey] = handler
  }

  const unregisterHandler = (actionKey: string) => {
    delete registeredHandlers[actionKey]
  }

  const loadShortcuts = async () => {
    const userId = currentUser.value?.id || 'default'
    const cached = localStorage.getItem(`doctor_shortcuts_${userId}`)
    
    if (cached) {
      try {
        const cachedObj = JSON.parse(cached)
        shortcuts.value = { ...DEFAULT_SHORTCUTS, ...cachedObj }
      } catch {
        shortcuts.value = { ...DEFAULT_SHORTCUTS }
      }
    }

    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
    if (doctorId) {
      try {
        const res = await axios.get('/api/doctor/shortcuts', { params: { doctor_id: doctorId } })
        if (res.data.success && res.data.shortcuts) {
          shortcuts.value = { ...DEFAULT_SHORTCUTS, ...res.data.shortcuts }
          localStorage.setItem(`doctor_shortcuts_${userId}`, JSON.stringify(res.data.shortcuts))
        }
      } catch {
        // 数据库加载失败，使用缓存或默认值
      }
    }
  }

  const saveShortcuts = async (newShortcuts: Record<string, string>) => {
    shortcuts.value = { ...DEFAULT_SHORTCUTS, ...newShortcuts }
    
    const userId = currentUser.value?.id || 'default'
    localStorage.setItem(`doctor_shortcuts_${userId}`, JSON.stringify(newShortcuts))
    
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
    if (doctorId) {
      try {
        await axios.post('/api/doctor/shortcuts', { doctor_id: doctorId, shortcuts: newShortcuts })
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.response?.data?.error || err.message }
      }
    }
    return { success: true }
  }

  const getShortcut = (actionKey: string): string => {
    return shortcuts.value[actionKey] || DEFAULT_SHORTCUTS[actionKey] || ''
  }

  onMounted(() => {
    loadShortcuts()
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    shortcuts,
    loadShortcuts,
    saveShortcuts,
    getShortcut,
    registerHandler,
    unregisterHandler,
    DEFAULT_SHORTCUTS,
    SHORTCUT_DEFINITIONS
  }
}