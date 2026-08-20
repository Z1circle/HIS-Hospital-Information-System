<template>
  <div class="smart-input-wrapper">
    <el-input
      ref="inputRef"
      v-model="inputValue"
      :type="type"
      :rows="rows"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.up.prevent="handlePrev"
      @keydown.down.prevent="handleNext"
      @keydown.left.prevent="handlePrev"
      @keydown.right.prevent="handleNext"
      @keydown.tab.prevent="handleNext"
      @keydown.enter.prevent="handleConfirm"
      @keydown.escape="closeSuggestions"
    />
    
    <Teleport to="body">
      <div
        v-if="showSuggestions && filteredSuggestions.length > 0"
        class="suggestion-dropdown"
        :style="dropdownStyle"
      >
        <div class="suggestion-list">
          <div
            v-for="(item, index) in filteredSuggestions"
            :key="item.id"
            :class="['suggestion-item', selectedIndex === index ? 'selected' : '', item.is_related ? 'related' : '']"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <span class="suggestion-icon">{{ getNodeTypeIcon(item.node_type || item.keyword_type) }}</span>
            <span class="suggestion-text">{{ item.keyword }}</span>
            <span v-if="item.is_related" class="suggestion-tag related-tag">{{ getRelationLabel(item.relation_type) }}</span>
            <span v-else-if="item.is_top" class="suggestion-tag">TOP</span>
            <span class="suggestion-weight">{{ item.is_related ? (item.relation_weight || 1).toFixed(1) : item.weight }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { DEFAULT_SHORTCUTS } from '@/composables/useShortcuts'
import { filterByPinyin } from '@/utils/pinyinMatch'

interface SuggestionItem {
  id: number
  keyword: string
  keyword_type: string
  weight: number
  is_top: boolean
  pinyin_initials: string
  node_type?: string
  is_related?: boolean
  relation_type?: string
  relation_weight?: number
}

const props = defineProps<{
  modelValue: string
  type?: 'text' | 'textarea'
  rows?: number
  placeholder?: string
  fieldType?: 'chief' | 'history' | 'past'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const userStore = useUserStore()
const inputRef = ref<any>(null)
const inputValue = ref(props.modelValue)
const showSuggestions = ref(false)
const selectedIndex = ref(-1)
const dropdownStyle = ref({})

const medicalTerms = ref<SuggestionItem[]>([])
const loadingTerms = ref(false)
const relatedSuggestions = ref<SuggestionItem[]>([])
const currentKeywordId = ref<number | null>(null)

// 获取用户自定义快捷键
const userShortcuts = computed(() => {
  const user = userStore.currentUser
  const userId = user ? (user as any).id || 'default' : 'default'
  const cached = localStorage.getItem(`doctor_shortcuts_${userId}`)
  if (cached) {
    try {
      return { ...DEFAULT_SHORTCUTS, ...JSON.parse(cached) }
    } catch {
      return { ...DEFAULT_SHORTCUTS }
    }
  }
  return { ...DEFAULT_SHORTCUTS }
})

// 判断按键是否符合快捷键定义
const matchKey = (e: KeyboardEvent, shortcut: string): boolean => {
  const parts = shortcut.split('+')
  let keyMatch = false
  
  for (const part of parts) {
    const p = part.trim().toUpperCase()
    if (p === 'CTRL' || p === 'META') {
      if (!(e.ctrlKey || e.metaKey)) return false
    } else if (p === 'ALT') {
      if (!e.altKey) return false
    } else if (p === 'SHIFT') {
      if (!e.shiftKey) return false
    } else {
      // 普通按键匹配
      const eventKey = e.key.toUpperCase()
      const targetKey = p.toUpperCase()
      if (eventKey === targetKey) keyMatch = true
      else if (p === 'TAB' && e.key === 'Tab') keyMatch = true
      else if (p === 'ENTER' && e.key === 'Enter') keyMatch = true
      else if (p === 'SPACE' && e.key === ' ') keyMatch = true
      else if (p === 'UP' && e.key.startsWith('ArrowUp')) keyMatch = true
      else if (p === 'DOWN' && e.key.startsWith('ArrowDown')) keyMatch = true
      else if (p === 'LEFT' && e.key.startsWith('ArrowLeft')) keyMatch = true
      else if (p === 'RIGHT' && e.key.startsWith('ArrowRight')) keyMatch = true
      else if (eventKey !== targetKey) return false
    }
  }
  
  return keyMatch || parts.length === 1
}

const loadTerms = async () => {
  if (medicalTerms.value.length > 0 || loadingTerms.value) return
  loadingTerms.value = true
  try {
    const user = userStore.currentUser as any
    const department_id = user?.department_id || null
    const params: any = { limit: 500 }
    if (department_id) {
      params.department_id = department_id
    }
    const res = await axios.get('/api/hot-keywords', { params })
    medicalTerms.value = res.data.keywords || []
  } catch {
    // 网络失败时使用空数组
  }
  loadingTerms.value = false
}

onMounted(() => {
  loadTerms()
})

const localSuggestions = computed(() => {
  const input = inputValue.value.trim().toLowerCase()
  if (!input || medicalTerms.value.length === 0) return []

  // 使用拼音模糊匹配
  const filtered = filterByPinyin(medicalTerms.value, input, (item) => item.keyword)

  // 限制返回数量
  return filtered.slice(0, 10)
})

const filteredSuggestions = computed(() => {
  const local = localSuggestions.value

  // 如果有当前选中的热词，添加关联推荐
  if (currentKeywordId.value && relatedSuggestions.value.length > 0) {
    const related = relatedSuggestions.value.map(item => ({
      ...item,
      is_related: true,
      relation_type: item.relation_type || 'related_to',
      relation_weight: item.relation_weight || 1
    }))

    // 合并并去重
    const combined = [...local]
    related.forEach(rel => {
      if (!combined.find(l => l.id === rel.id)) {
        combined.push(rel)
      }
    })

    return combined.slice(0, 15)
  }

  return local
})

watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

const updateDropdownPosition = () => {
  if (inputRef.value && inputRef.value.$el) {
    const rect = inputRef.value.$el.getBoundingClientRect()
    dropdownStyle.value = {
      top: `${rect.top + rect.height + 8}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`
    }
  }
}

let inputTimeout: number | null = null

const onInput = () => {
  emit('update:modelValue', inputValue.value)
  selectedIndex.value = -1
  
  if (medicalTerms.value.length === 0) {
    loadTerms()
  }
  
  if (inputTimeout) {
    clearTimeout(inputTimeout)
  }
  
  inputTimeout = window.setTimeout(() => {
    updateDropdownPosition()
    
    if (filteredSuggestions.value.length > 0 && inputValue.value.trim().length >= 1) {
      showSuggestions.value = true
    } else {
      showSuggestions.value = false
    }
  }, 100)
}

const onFocus = () => {
  if (medicalTerms.value.length === 0) {
    loadTerms()
  }
  updateDropdownPosition()
  if (filteredSuggestions.value.length > 0 && inputValue.value.trim().length >= 1) {
    showSuggestions.value = true
  }
}

const onBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// 使用快捷键切换选择
const handlePrev = (e: KeyboardEvent) => {
  const shortcut = userShortcuts.value['hotkey_prev'] || 'Tab'
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return
  
  if (matchKey(e, shortcut) || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    selectPrev()
  }
}

const handleNext = (e: KeyboardEvent) => {
  const shortcut = userShortcuts.value['hotkey_next'] || 'Shift+Tab'
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return
  
  if (matchKey(e, shortcut) || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') {
    e.preventDefault()
    selectNext()
  }
}

const handleConfirm = (e: KeyboardEvent) => {
  const shortcut = userShortcuts.value['hotkey_confirm'] || 'Enter'
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return
  
  if (matchKey(e, shortcut) || e.key === 'Enter') {
    e.preventDefault()
    confirmSelection()
  }
}

const selectPrev = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else if (selectedIndex.value === -1 && filteredSuggestions.value.length > 0) {
    selectedIndex.value = filteredSuggestions.value.length - 1
  } else if (selectedIndex.value === 0) {
    selectedIndex.value = -1
  }
}

const selectNext = () => {
  if (selectedIndex.value < filteredSuggestions.value.length - 1) {
    selectedIndex.value++
  } else if (selectedIndex.value === -1 && filteredSuggestions.value.length > 0) {
    selectedIndex.value = 0
  } else if (selectedIndex.value === filteredSuggestions.value.length - 1) {
    selectedIndex.value = -1
  }
}

const confirmSelection = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < filteredSuggestions.value.length) {
    selectItem(filteredSuggestions.value[selectedIndex.value])
  }
}

const selectItem = async (item: SuggestionItem) => {
  inputValue.value = item.keyword
  emit('update:modelValue', item.keyword)
  currentKeywordId.value = item.id

  // 加载关联推荐
  await loadRelatedSuggestions(item.id)

  // 记录点击（如果是关联推荐）
  if (item.is_related && currentKeywordId.value) {
    try {
      await axios.post('/api/knowledge-graph/click', {
        source_keyword_id: currentKeywordId.value,
        recommended_keyword_id: item.id,
        doctor_id: userStore.currentUser.value?.doctor_id || userStore.currentUser.value?.id
      })
    } catch (err) {
      console.error('记录推荐点击失败:', err)
    }
  }

  showSuggestions.value = false
  selectedIndex.value = -1
}

const loadRelatedSuggestions = async (keywordId: number) => {
  try {
    const res = await axios.get('/api/knowledge-graph/recommendations', {
      params: {
        keyword_id: keywordId,
        limit: 5,
        doctor_id: userStore.currentUser.value?.doctor_id || userStore.currentUser.value?.id
      }
    })

    relatedSuggestions.value = (res.data.recommendations || []).map((item: any) => ({
      id: item.target_id,
      keyword: item.keyword,
      keyword_type: item.keyword_type || 'other',
      weight: item.keyword_weight || 10,
      is_top: false,
      pinyin_initials: '',
      node_type: item.node_type,
      relation_type: item.relation_type,
      relation_weight: item.weight
    }))
  } catch (err) {
    console.error('加载关联推荐失败:', err)
    relatedSuggestions.value = []
  }
}

const closeSuggestions = () => {
  showSuggestions.value = false
}

const getNodeTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    disease: '🩺',
    symptom: '😷',
    drug: '💊',
    test: '🔬',
    other: '📋'
  }
  return icons[type] || icons.other
}

const getRelationLabel = (type?: string) => {
  const labels: Record<string, string> = {
    has_symptom: '症状',
    has_drug: '用药',
    related_to: '相关',
    caused_by: '病因',
    test_for: '检查'
  }
  return labels[type || ''] || ''
}
</script>

<style scoped>
.smart-input-wrapper {
  position: relative;
  width: 100%;
}

.suggestion-dropdown {
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.suggestion-list {
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  background-color: #F5F7FA;
}

.suggestion-item.selected {
  background-color: #E3F2FD;
  border-left: 3px solid #1E88E5;
}

.suggestion-item.related {
  background-color: #F0F9FF;
  border-left: 3px solid #3B82F6;
}

.suggestion-item.related:hover {
  background-color: #E0F2FE;
}

.suggestion-icon {
  font-size: 18px;
}

.suggestion-text {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.suggestion-tag {
  font-size: 10px;
  color: #E74C3C;
  font-weight: 600;
  padding: 2px 6px;
  background: #FFF5F5;
  border: 1px solid #FFE0E0;
  border-radius: 4px;
}

.suggestion-tag.related-tag {
  color: #2563EB;
  background: #EFF6FF;
  border-color: #BFDBFE;
}

.suggestion-weight {
  font-size: 11px;
  color: #999;
  padding: 2px 8px;
  background: #F5F5F5;
  border-radius: 4px;
}
</style>
