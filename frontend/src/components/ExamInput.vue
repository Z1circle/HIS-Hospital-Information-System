<template>
  <div class="exam-input-wrapper">
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
            :class="['suggestion-item', selectedIndex === index ? 'selected' : '']"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <span class="suggestion-icon">{{ getExamTypeIcon(item.type) }}</span>
            <div class="suggestion-content">
              <span class="suggestion-text">{{ item.name }}</span>
              <span v-if="item.code" class="suggestion-code">{{ item.code }}</span>
              <span v-if="item.category" class="suggestion-category">{{ item.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { filterByPinyin } from '@/utils/pinyinMatch'

interface ExamSuggestionItem {
  id: number
  name: string
  code?: string
  type: 'exam_item' | 'body_part' | 'diagnosis'
  category?: string
  pinyin_initials?: string
}

const props = defineProps<{
  modelValue: string
  type?: 'text' | 'textarea'
  rows?: number
  placeholder?: string
  examType?: 'lab' | 'radiology' // 检验科或影像科
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', item: ExamSuggestionItem): void
}>()

const inputRef = ref<any>(null)
const inputValue = ref(props.modelValue)
const showSuggestions = ref(false)
const selectedIndex = ref(-1)
const dropdownStyle = ref({})

const examItems = ref<ExamSuggestionItem[]>([])
const bodyParts = ref<ExamSuggestionItem[]>([])
const diagnoses = ref<ExamSuggestionItem[]>([])
const loading = ref(false)

onMounted(() => {
  loadExamData()
})

const loadExamData = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const examType = props.examType === 'lab' ? 'lab' : 'radiology'

    // 加载检查项目
    const itemsRes = await axios.get(`/api/exam/items`, {
      params: { type: examType, limit: 200 }
    })
    examItems.value = (itemsRes.data.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      type: 'exam_item',
      category: item.category,
      pinyin_initials: item.pinyin_initials || ''
    }))

    // 加载检查部位
    const partsRes = await axios.get(`/api/exam/body-parts`, {
      params: { limit: 100 }
    })
    bodyParts.value = (partsRes.data.parts || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: 'body_part',
      category: item.category,
      pinyin_initials: item.pinyin_initials || ''
    }))

    // 加载常见诊断
    const diagRes = await axios.get(`/api/exam/common-diagnoses`, {
      params: { type: examType, limit: 100 }
    })
    diagnoses.value = (diagRes.data.diagnoses || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: 'diagnosis',
      category: item.category,
      pinyin_initials: item.pinyin_initials || ''
    }))
  } catch (err) {
    console.error('加载检查数据失败:', err)
  }
  loading.value = false
}

const allSuggestions = computed(() => {
  return [...examItems.value, ...bodyParts.value, ...diagnoses.value]
})

const filteredSuggestions = computed(() => {
  const input = inputValue.value.trim()
  if (!input || allSuggestions.value.length === 0) return []

  // 使用拼音模糊匹配
  const filtered = filterByPinyin(allSuggestions.value, input, (item) => item.name)

  // 限制返回数量
  return filtered.slice(0, 10)
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

  if (allSuggestions.value.length === 0) {
    loadExamData()
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
  if (allSuggestions.value.length === 0) {
    loadExamData()
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

const handlePrev = () => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else if (selectedIndex.value === -1 && filteredSuggestions.value.length > 0) {
    selectedIndex.value = filteredSuggestions.value.length - 1
  } else if (selectedIndex.value === 0) {
    selectedIndex.value = -1
  }
}

const handleNext = () => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (selectedIndex.value < filteredSuggestions.value.length - 1) {
    selectedIndex.value++
  } else if (selectedIndex.value === -1 && filteredSuggestions.value.length > 0) {
    selectedIndex.value = 0
  } else if (selectedIndex.value === filteredSuggestions.value.length - 1) {
    selectedIndex.value = -1
  }
}

const handleConfirm = () => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (selectedIndex.value >= 0 && selectedIndex.value < filteredSuggestions.value.length) {
    selectItem(filteredSuggestions.value[selectedIndex.value])
  }
}

const selectItem = (item: ExamSuggestionItem) => {
  inputValue.value = item.name
  emit('update:modelValue', item.name)
  emit('select', item)
  showSuggestions.value = false
  selectedIndex.value = -1
}

const closeSuggestions = () => {
  showSuggestions.value = false
}

const getExamTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    exam_item: '🔬',
    body_part: '🎯',
    diagnosis: '📋'
  }
  return icons[type] || '📝'
}
</script>

<style scoped>
.exam-input-wrapper {
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

.suggestion-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.suggestion-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.suggestion-code {
  font-size: 12px;
  color: #666;
}

.suggestion-category {
  font-size: 11px;
  color: #999;
  background: #F5F5F5;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}
</style>