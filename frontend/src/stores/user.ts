import { ref, computed } from 'vue'
import axios from 'axios'

export type Role = 'visitor' | 'patient' | 'doctor' | 'inpatient_doctor' | 'pharmacist' | 'admin'

export interface User {
  id: number
  username: string
  real_name: string
  nickname?: string
  role: Role
  phone: string
  id_card?: string
  doctor_id?: number
  patient_id?: number
  department_id?: number
  department_name?: string
  title?: string
  specialty?: string
  is_chief_physician?: boolean
  avatar?: string
  token: string
  can_access_inpatient?: boolean
  status?: string
}

// 每个标签页独立的 tabId（同一窗口内的 tab 共享，跨窗口独立）
const TAB_ID = (() => {
  let id = sessionStorage.getItem('his_tab_id')
  if (!id) {
    id = 'tab_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    sessionStorage.setItem('his_tab_id', id)
  }
  return id
})()

const TOKEN_KEY = `his_token_${TAB_ID}`
const USER_KEY = `his_user_${TAB_ID}`

const loadFromStorage = (): User | null => {
  try {
    const data = sessionStorage.getItem(USER_KEY)
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!data || !token) return null
    const user = JSON.parse(data) as User
    user.token = token
    return user
  } catch {
    return null
  }
}

const saveToStorage = (user: User | null) => {
  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    sessionStorage.setItem(TOKEN_KEY, user.token)
    // 兼容旧 key（仅读取时）
  } else {
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

const currentUser = ref<User | null>(loadFromStorage())
const isLoggedIn = computed(() => currentUser.value !== null)
const userRole = computed<Role>(() => currentUser.value?.role || 'visitor')

const setCurrentUser = (user: User | null) => {
  currentUser.value = user
  saveToStorage(user)
}

export const getCurrentToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY)
}

export const getTabId = (): string => TAB_ID

export function useUserStore() {
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await axios.post('/api/auth/login', { username, password })
      const user = { ...(res.data as User), token: res.data.token }
      setCurrentUser(user)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || '用户名或密码错误' }
    }
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const register = async (data: { username: string; password: string; name: string; role: Role; phone: string; idCard: string; avatar: string }): Promise<boolean> => {
    try {
      const res = await axios.post('/api/auth/register', {
        username: data.username,
        password: data.password,
        real_name: data.name,
        role: data.role,
        phone: data.phone,
        idCard: data.idCard,
        avatar: data.avatar
      })
      const user = { ...(res.data as User), token: res.data.token }
      setCurrentUser(user)
      return true
    } catch {
      return false
    }
  }

  const hasPermission = (requiredRole: Role): boolean => {
    const roles: Role[] = ['visitor', 'patient', 'doctor', 'inpatient_doctor', 'pharmacist', 'admin']
    const currentIndex = roles.indexOf(userRole.value)
    const requiredIndex = roles.indexOf(requiredRole)
    return currentIndex >= requiredIndex
  }

  return {
    currentUser,
    isLoggedIn,
    userRole,
    login,
    logout,
    register,
    hasPermission
  }
}
