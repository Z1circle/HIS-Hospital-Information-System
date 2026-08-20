import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import { getCurrentToken } from './stores/user'
import './style.css'

// axios 请求拦截器：自动附带当前标签页的 token
axios.interceptors.request.use((config) => {
  const token = getCurrentToken()
  if (token) {
    config.headers['X-Auth-Token'] = token
  }
  return config
})

// axios 响应拦截器：登录失效时跳转
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 只对非登录/注册接口做处理
      const url = error.config?.url || ''
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        sessionStorage.removeItem(`his_token_${sessionStorage.getItem('his_tab_id')}`)
        sessionStorage.removeItem(`his_user_${sessionStorage.getItem('his_tab_id')}`)
      }
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

// 全局注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
