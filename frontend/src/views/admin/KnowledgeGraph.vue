<template>
  <div class="knowledge-graph-container">
    <el-card class="header-card">
      <div class="header-content">
        <div class="title-section">
          <h2>知识图谱管理</h2>
          <p class="subtitle">主任医师可在此管理热词间的语义关联关系</p>
        </div>
        <div class="filter-section">
          <div class="category-filter">
            <span class="filter-label">类别筛选：</span>
            <div class="category-buttons">
              <el-button
                v-for="cat in categories"
                :key="cat.value"
                :type="selectedCategories.includes(cat.value) ? 'primary' : 'default'"
                :size="'small'"
                @click="toggleCategory(cat.value)"
              >
                {{ cat.label }}
              </el-button>
            </div>
          </div>
          <el-select v-model="filterRelationType" placeholder="关系类型" clearable style="width: 150px" @change="loadGraphData">
            <el-option label="有症状" value="has_symptom" />
            <el-option label="用药" value="has_drug" />
            <el-option label="相关" value="related_to" />
            <el-option label="病因" value="caused_by" />
            <el-option label="检查" value="test_for" />
          </el-select>
          <el-button type="primary" @click="showAddRelationDialog">添加关系</el-button>
          <el-button @click="loadGraphData">刷新</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="18">
        <el-card class="graph-card">
          <div class="graph-header">
            <span class="graph-title">图谱可视化</span>
            <div class="graph-legend">
              <span class="legend-item disease"><span class="dot"></span>疾病</span>
              <span class="legend-item symptom"><span class="dot"></span>症状</span>
              <span class="legend-item drug"><span class="dot"></span>药品</span>
              <span class="legend-item test"><span class="dot"></span>检查</span>
            </div>
          </div>
          <div class="graph-container" ref="graphContainer" @mouseenter="handleContainerEnter" @mouseleave="handleContainerLeave">
            <svg class="graph-svg" :viewBox="viewBox" @wheel="handleZoom">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- 关系线 -->
              <g v-for="edge in sortedVisibleEdges" :key="edge.id" class="edge-group" :style="{ opacity: edge.opacity }">
                <line
                  :x1="edge.source.x"
                  :y1="edge.source.y"
                  :x2="edge.target.x"
                  :y2="edge.target.y"
                  :stroke="getRelationColor(edge.relation_type)"
                  :stroke-width="edge.weight * 1.5"
                  class="edge-line"
                  @click="selectEdge(edge)"
                />
              </g>

              <!-- 圆形节点 -->
              <g v-for="node in sortedVisibleNodes" :key="node.id" class="node-group" @click="selectNode(node)" :style="{ opacity: node.opacity }">
                <!-- 外圈光晕 -->
                <circle
                  :cx="node.x"
                  :cy="node.y"
                  :r="node.displayRadius + 6"
                  :fill="getNodeColor(node.node_type)"
                  opacity="0.2"
                  class="node-glow"
                />
                <!-- 主节点 -->
                <circle
                  :cx="node.x"
                  :cy="node.y"
                  :r="node.displayRadius"
                  :fill="getNodeColor(node.node_type)"
                  :stroke="selectedNode?.id === node.id ? '#fff' : '#333'"
                  :stroke-width="selectedNode?.id === node.id ? 3 : 1.5"
                  :class="['node-circle', node.node_type, { 'dragging': draggingNode?.id === node.id, 'hovered': hoveredNode?.id === node.id }]"
                  @mousedown.stop="startDrag(node, $event)"
                  @mouseenter="handleNodeHover(node)"
                  @mouseleave="handleNodeLeave(node)"
                  filter="url(#glow)"
                />
                <!-- 节点标签 -->
                <text
                  :x="node.x"
                  :y="node.y + node.displayRadius + 14"
                  text-anchor="middle"
                  class="node-label"
                  font-size="11"
                  fill="#ccc"
                  :opacity="node.opacity"
                  style="pointer-events: none;"
                >{{ node.keyword }}</text>
              </g>
            </svg>
          </div>
          <div class="graph-controls">
            <el-button-group>
              <el-button size="small" @click="zoomIn">放大</el-button>
              <el-button size="small" @click="zoomOut">缩小</el-button>
              <el-button size="small" @click="resetZoom">重置</el-button>
            </el-button-group>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="info-card">
          <template #header>
            <span>{{ selectedNode ? '节点详情' : selectedEdge ? '关系详情' : '统计信息' }}</span>
          </template>

          <div v-if="selectedNode" class="node-details">
            <div class="detail-row">
              <span class="label">热词：</span>
              <span class="value">{{ selectedNode.keyword }}</span>
            </div>
            <div class="detail-row">
              <span class="label">类型：</span>
              <el-tag :type="getNodeTypeTag(selectedNode.node_type)">{{ getNodeTypeLabel(selectedNode.node_type) }}</el-tag>
            </div>
            <div class="detail-row">
              <span class="label">人工权重：</span>
              <el-input-number
                v-model="selectedNode.manual_weight"
                :min="0.01"
                :max="2"
                :step="0.1"
                :precision="2"
                size="small"
                @change="updateNodeWeight"
              />
            </div>
            <div class="detail-row">
              <span class="label">使用次数：</span>
              <span class="value">{{ selectedNode.usage_count || 0 }}</span>
            </div>
            <div class="detail-actions">
              <el-button type="primary" size="small" @click="showAddRelationDialog(selectedNode)">添加关联</el-button>
              <el-button size="small" @click="selectedNode = null">关闭</el-button>
            </div>
          </div>

          <div v-else-if="selectedEdge" class="edge-details">
            <div class="detail-row">
              <span class="label">源节点：</span>
              <span class="value">{{ selectedEdge.source_keyword }}</span>
            </div>
            <div class="detail-row">
              <span class="label">关系：</span>
              <el-tag>{{ getRelationLabel(selectedEdge.relation_type) }}</el-tag>
            </div>
            <div class="detail-row">
              <span class="label">目标节点：</span>
              <span class="value">{{ selectedEdge.target_keyword }}</span>
            </div>
            <div class="detail-row">
              <span class="label">权重：</span>
              <el-input-number
                v-model="selectedEdge.weight"
                :min="0.01"
                :max="2"
                :step="0.1"
                :precision="2"
                size="small"
                @change="updateEdgeWeight"
              />
            </div>
            <div class="detail-actions">
              <el-button type="danger" size="small" @click="deleteEdge">删除关系</el-button>
              <el-button size="small" @click="selectedEdge = null">关闭</el-button>
            </div>
          </div>

          <div v-else class="stats-info">
            <div class="stat-item">
              <span class="stat-label">总节点数：</span>
              <span class="stat-value">{{ stats.totalNodes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">总关系数：</span>
              <span class="stat-value">{{ stats.totalRelations }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">疾病节点：</span>
              <span class="stat-value">{{ stats.diseaseCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">症状节点：</span>
              <span class="stat-value">{{ stats.symptomCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">药品节点：</span>
              <span class="stat-value">{{ stats.drugCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">检查节点：</span>
              <span class="stat-value">{{ stats.testCount }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="search-card" style="margin-top: 20px">
          <template #header>
            <span>搜索热词</span>
          </template>
          <el-input
            v-model="searchKeyword"
            placeholder="输入关键词搜索"
            clearable
            @input="searchKeywords"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div class="search-results" v-if="searchResults.length > 0">
            <div
              v-for="item in searchResults"
              :key="item.id"
              class="search-result-item"
              @click="selectNode(item)"
            >
              <span class="result-keyword">{{ item.keyword }}</span>
              <el-tag size="small" :type="getNodeTypeTag(item.node_type)">
                {{ getNodeTypeLabel(item.node_type) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加关系对话框 -->
    <el-dialog v-model="showAddDialog" title="添加知识图谱关系" width="500px">
      <el-form :model="relationForm" label-width="100px">
        <el-form-item label="源节点">
          <el-select
            v-model="relationForm.source_id"
            placeholder="选择源热词"
            filterable
            @change="onSourceChange"
          >
            <el-option
              v-for="item in keywordOptions"
              :key="item.id"
              :label="item.keyword"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关系类型">
          <el-select v-model="relationForm.relation_type" placeholder="选择关系类型">
            <el-option label="有症状" value="has_symptom" />
            <el-option label="用药" value="has_drug" />
            <el-option label="相关" value="related_to" />
            <el-option label="病因" value="caused_by" />
            <el-option label="检查" value="test_for" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标节点">
          <el-select
            v-model="relationForm.target_id"
            placeholder="选择目标热词"
            filterable
          >
            <el-option
              v-for="item in keywordOptions"
              :key="item.id"
              :label="item.keyword"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number
            v-model="relationForm.weight"
            :min="0.01"
            :max="2"
            :step="0.1"
            :precision="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addRelation">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import axios from 'axios'
import { useUserStore } from '@/stores/user'

interface Node {
  id: number
  keyword: string
  node_type: string
  x: number
  y: number
  z?: number
  manual_weight: number
  usage_count: number
  displayRadius?: number
  opacity?: number
  zIndex?: number
}

interface Edge {
  id: number
  source: Node
  target: Node
  relation_type: string
  weight: number
  source_keyword: string
  target_keyword: string
  opacity?: number
  zIndex?: number
}

const userStore = useUserStore()
const currentUser = userStore.currentUser

const filterNodeType = ref('')
const filterRelationType = ref('')
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const selectedNode = ref<Node | null>(null)
const selectedEdge = ref<Edge | null>(null)
const showAddDialog = ref(false)
const searchKeyword = ref('')
const searchResults = ref<Node[]>([])
const keywordOptions = ref<any[]>([])
const hoveredNode = ref<Node | null>(null)

const categories = [
  { label: '疾病', value: 'disease' },
  { label: '症状', value: 'symptom' },
  { label: '药品', value: 'drug' },
  { label: '检查', value: 'test' }
]

const selectedCategories = ref<string[]>(['disease', 'symptom', 'drug', 'test'])

const relationForm = ref({
  source_id: null as number | null,
  target_id: null as number | null,
  relation_type: '',
  weight: 1
})

const stats = ref({
  totalNodes: 0,
  totalRelations: 0,
  diseaseCount: 0,
  symptomCount: 0,
  drugCount: 0,
  testCount: 0
})

const animationFrameId = ref<number | null>(null)

const globalRotation = ref(0)
const globalRotationSpeed = ref(0.3)
const rotationCenter = { x: 400, y: 300 }
const perspective = 800
const isPaused = ref(false)

const visibleNodes = computed(() => {
  if (selectedCategories.value.length === 0) return []
  return nodes.value.filter(node => selectedCategories.value.includes(node.node_type))
})

const visibleEdges = computed(() => {
  const visibleNodeIds = new Set(visibleNodes.value.map(n => n.id))
  return edges.value.filter(edge => visibleNodeIds.has(edge.source.id) && visibleNodeIds.has(edge.target.id))
})

const projectedNodes = computed(() => {
  const rad = (globalRotation.value * Math.PI) / 180
  return visibleNodes.value.map(node => {
    const dx = node.x - rotationCenter.x
    const dy = node.y - rotationCenter.y
    const dz = (node.z || 0)
    
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)
    
    const rotatedX = dx * cos - dz * sin
    const rotatedZ = dx * sin + dz * cos
    
    const scale = perspective / (perspective + rotatedZ)
    const screenX = rotationCenter.x + rotatedX * scale
    const screenY = rotationCenter.y + dy * scale
    
    const baseRadius = getNodeRadius(node)
    const displayRadius = baseRadius * scale
    
    const opacity = Math.max(0.2, Math.min(1, (rotatedZ + 300) / 600))
    
    return {
      ...node,
      x: screenX,
      y: screenY,
      z: rotatedZ,
      displayRadius,
      opacity,
      zIndex: Math.floor(rotatedZ * 100)
    }
  })
})

const sortedVisibleNodes = computed(() => {
  return [...projectedNodes.value].sort((a, b) => a.z - b.z)
})

const sortedVisibleEdges = computed(() => {
  return visibleEdges.value.map(edge => {
    const sourceNode = projectedNodes.value.find(n => n.id === edge.source.id)
    const targetNode = projectedNodes.value.find(n => n.id === edge.target.id)
    const avgZ = ((sourceNode?.z || 0) + (targetNode?.z || 0)) / 2
    const opacity = Math.max(0.2, Math.min(1, (avgZ + 300) / 600))
    
    return {
      ...edge,
      opacity,
      zIndex: Math.floor(avgZ * 100),
      source: { ...edge.source, x: sourceNode?.x || edge.source.x, y: sourceNode?.y || edge.source.y },
      target: { ...edge.target, x: targetNode?.x || edge.target.x, y: targetNode?.y || edge.target.y }
    }
  }).sort((a, b) => a.zIndex - b.zIndex)
})

const toggleCategory = (category: string) => {
  const index = selectedCategories.value.indexOf(category)
  if (index > -1) {
    if (selectedCategories.value.length > 1) {
      selectedCategories.value.splice(index, 1)
    }
  } else {
    selectedCategories.value.push(category)
  }
}

// 图谱视图控制
const viewBox = ref('0 0 800 600')
const zoomLevel = ref(1)
const graphContainer = ref<HTMLElement>()

const initRotationSpeeds = () => {}

const startRotationAnimation = () => {
  const animate = () => {
    if (!isPaused.value) {
      globalRotation.value += globalRotationSpeed.value
      if (globalRotation.value >= 360) globalRotation.value -= 360
    }
    animationFrameId.value = requestAnimationFrame(animate)
  }
  animate()
}

const handleContainerEnter = () => {
  isPaused.value = true
}

const handleContainerLeave = () => {
  isPaused.value = false
}

const handleNodeHover = (node: Node) => {
  hoveredNode.value = node
}

const handleNodeLeave = (node: Node) => {
  if (hoveredNode.value?.id === node.id) {
    hoveredNode.value = null
  }
}

// 拖拽控制
const draggingNode = ref<Node | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)

const fibonacciSphere = (index: number, total: number, radius: number = 250) => {
  const phi = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (index / (total - 1)) * 2
  const radiusAtY = Math.sqrt(1 - y * y) * radius
  const theta = phi * index
  
  return {
    x: Math.cos(theta) * radiusAtY,
    y: y * radius * 0.6,
    z: Math.sin(theta) * radiusAtY
  }
}

const loadGraphData = async () => {
  try {
    const params: any = {}
    if (filterNodeType.value) params.node_type = filterNodeType.value
    if (filterRelationType.value) params.relation_type = filterRelationType.value

    const res = await axios.get('/api/knowledge-graph', { params })
    const relations = res.data.relations || []

    const nodeMap = new Map<number, Node>()
    const edgeList: Edge[] = []

    relations.forEach((rel: any) => {
      if (!nodeMap.has(rel.source_id)) {
        nodeMap.set(rel.source_id, {
          id: rel.source_id,
          keyword: rel.source_keyword,
          node_type: rel.source_node_type,
          x: 0,
          y: 0,
          z: 0,
          manual_weight: rel.source_manual_weight || 1,
          usage_count: rel.source_usage_count || 0
        })
      }

      if (!nodeMap.has(rel.target_id)) {
        nodeMap.set(rel.target_id, {
          id: rel.target_id,
          keyword: rel.target_keyword,
          node_type: rel.target_node_type,
          x: 0,
          y: 0,
          z: 0,
          manual_weight: rel.target_manual_weight || 1,
          usage_count: rel.target_usage_count || 0
        })
      }

      const sourceNode = nodeMap.get(rel.source_id)!
      const targetNode = nodeMap.get(rel.target_id)!

      edgeList.push({
        id: rel.id,
        source: sourceNode,
        target: targetNode,
        relation_type: rel.relation_type,
        weight: rel.weight,
        source_keyword: rel.source_keyword,
        target_keyword: rel.target_keyword
      })
    })

    const nodeArray = Array.from(nodeMap.values())
    const totalNodes = nodeArray.length
    
    nodeArray.forEach((node, index) => {
      const pos = fibonacciSphere(index, totalNodes, 220)
      node.x = rotationCenter.x + pos.x
      node.y = rotationCenter.y + pos.y
      node.z = pos.z
    })

    nodes.value = nodeArray
    edges.value = edgeList

    initRotationSpeeds()
    updateStats()
  } catch (err) {
    console.error('加载图谱数据失败:', err)
    ElMessage.error('加载图谱数据失败')
  }
}

const updateStats = () => {
  stats.value.totalNodes = nodes.value.length
  stats.value.totalRelations = edges.value.length
  stats.value.diseaseCount = nodes.value.filter(n => n.node_type === 'disease').length
  stats.value.symptomCount = nodes.value.filter(n => n.node_type === 'symptom').length
  stats.value.drugCount = nodes.value.filter(n => n.node_type === 'drug').length
  stats.value.testCount = nodes.value.filter(n => n.node_type === 'test').length
}

const loadKeywordOptions = async () => {
  try {
    const res = await axios.get('/api/hot-keywords', { params: { limit: 1000, department_id: null } })
    keywordOptions.value = (res.data.keywords || []).map((k: any) => ({
      ...k,
      manual_weight: k.manual_weight !== null ? parseFloat(k.manual_weight) : 1
    }))
  } catch (err) {
    console.error('加载热词列表失败:', err)
  }
}

const searchKeywords = async () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    const res = await axios.get('/api/hot-keywords/search', {
      params: { q: searchKeyword.value, limit: 20 }
    })
    searchResults.value = (res.data.keywords || []).map((k: any) => ({
      ...k,
      x: 0,
      y: 0,
      manual_weight: k.manual_weight !== null ? parseFloat(k.manual_weight) : 1
    }))
  } catch (err) {
    console.error('搜索热词失败:', err)
  }
}

const selectNode = (node: Node) => {
  selectedNode.value = node
  selectedEdge.value = null
}

const selectEdge = (edge: Edge) => {
  selectedEdge.value = edge
  selectedNode.value = null
}

const showAddRelationDialog = (node?: Node) => {
  if (node) {
    relationForm.value.source_id = node.id
  }
  showAddDialog.value = true
}

const onSourceChange = () => {
  relationForm.value.target_id = null
}

const addRelation = async () => {
  if (!relationForm.value.source_id || !relationForm.value.target_id || !relationForm.value.relation_type) {
    ElMessage.warning('请填写完整信息')
    return
  }

  if (relationForm.value.source_id === relationForm.value.target_id) {
    ElMessage.warning('源节点和目标节点不能相同')
    return
  }

  try {
    await axios.post('/api/knowledge-graph', {
      source_id: relationForm.value.source_id,
      target_id: relationForm.value.target_id,
      relation_type: relationForm.value.relation_type,
      weight: relationForm.value.weight,
      created_by: currentUser.value?.doctor_id || currentUser.value?.id
    })

    ElMessage.success('添加关系成功')
    showAddDialog.value = false
    loadGraphData()

    // 重置表单
    relationForm.value = {
      source_id: null,
      target_id: null,
      relation_type: '',
      weight: 1
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '添加关系失败')
  }
}

const updateNodeWeight = async () => {
  if (!selectedNode.value) return

  try {
    await axios.put(`/api/hot-keywords/${selectedNode.value.id}/weight`, {
      manual_weight: selectedNode.value.manual_weight
    })
    ElMessage.success('更新权重成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '更新权重失败')
  }
}

const updateEdgeWeight = async () => {
  if (!selectedEdge.value) return

  try {
    await axios.put(`/api/knowledge-graph/${selectedEdge.value.id}`, {
      weight: selectedEdge.value.weight
    })
    ElMessage.success('更新权重成功')
    loadGraphData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '更新权重失败')
  }
}

const deleteEdge = async () => {
  if (!selectedEdge.value) return

  try {
    await axios.delete(`/api/knowledge-graph/${selectedEdge.value.id}`)
    ElMessage.success('删除关系成功')
    selectedEdge.value = null
    loadGraphData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '删除关系失败')
  }
}

// 拖拽功能
const startDrag = (node: Node, event: MouseEvent) => {
  draggingNode.value = node
  isDragging.value = true
  
  const svg = (event.target as SVGElement).closest('svg')
  if (svg) {
    const rect = svg.getBoundingClientRect()
    const scale = 800 / rect.width
    dragOffset.value = {
      x: event.clientX - rect.left - node.x / scale,
      y: event.clientY - rect.top - node.y / scale
    }
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
}

const onDrag = (event: MouseEvent) => {
  if (!draggingNode.value || !isDragging.value) return

  const svg = document.querySelector('.graph-svg')
  if (svg) {
    const rect = svg.getBoundingClientRect()
    const scale = 800 / rect.width
    
    let newX = (event.clientX - rect.left - dragOffset.value.x) * scale
    let newY = (event.clientY - rect.top - dragOffset.value.y) * scale
    
    newX = Math.max(30, Math.min(770, newX))
    newY = Math.max(30, Math.min(570, newY))
    
    draggingNode.value.x = newX
    draggingNode.value.y = newY
  }
}

const endDrag = () => {
  if (draggingNode.value) {
    saveNodePosition(draggingNode.value)
  }
  draggingNode.value = null
  isDragging.value = false
  
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
}

const saveNodePosition = async (node: Node) => {
  try {
    await axios.put(`/api/hot-keywords/${node.id}/position`, {
      x: node.x,
      y: node.y
    })
  } catch (err) {
    console.error('保存节点位置失败:', err)
  }
}

// 图谱可视化辅助函数
const getNodeColor = (type: string) => {
  const colors: Record<string, string> = {
    disease: '#FF6347',
    symptom: '#FFA500',
    drug: '#32CD32',
    test: '#4169E1',
    other: '#999'
  }
  return colors[type] || colors.other
}

const getNodeRadius = (node: Node) => {
  const baseRadius = 15
  const weightBonus = (node.manual_weight - 1) * 5
  return Math.max(10, baseRadius + weightBonus)
}

const getRelationColor = (type: string) => {
  const colors: Record<string, string> = {
    has_symptom: '#555',
    has_drug: '#555',
    related_to: '#444',
    caused_by: '#666',
    test_for: '#555'
  }
  return colors[type] || '#555'
}

const getRelationLabel = (type: string) => {
  const labels: Record<string, string> = {
    has_symptom: '症状',
    has_drug: '用药',
    related_to: '相关',
    caused_by: '病因',
    test_for: '检查'
  }
  return labels[type] || type
}

const getNodeTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    disease: '疾病',
    symptom: '症状',
    drug: '药品',
    test: '检查',
    other: '其他'
  }
  return labels[type] || '其他'
}

const getNodeTypeTag = (type: string) => {
  const tags: Record<string, string> = {
    disease: 'danger',
    symptom: 'warning',
    drug: 'success',
    test: 'primary',
    other: 'info'
  }
  return tags[type] || 'info'
}

// 缩放控制
const handleZoom = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomLevel.value = Math.max(0.5, Math.min(3, zoomLevel.value * delta))
  updateViewBox()
}

const zoomIn = () => {
  zoomLevel.value = Math.min(3, zoomLevel.value * 1.2)
  updateViewBox()
}

const zoomOut = () => {
  zoomLevel.value = Math.max(0.5, zoomLevel.value / 1.2)
  updateViewBox()
}

const resetZoom = () => {
  zoomLevel.value = 1
  updateViewBox()
}

const updateViewBox = () => {
  const baseWidth = 800
  const baseHeight = 600
  const width = baseWidth / zoomLevel.value
  const height = baseHeight / zoomLevel.value
  const x = (baseWidth - width) / 2
  const y = (baseHeight - height) / 2
  viewBox.value = `${x} ${y} ${width} ${height}`
}

onMounted(() => {
  loadGraphData()
  loadKeywordOptions()
  startRotationAnimation()
})
</script>

<style scoped>
.knowledge-graph-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section h2 {
  margin: 0 0 5px 0;
  font-size: 20px;
  color: #333;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.filter-section {
  display: flex;
  gap: 15px;
  align-items: center;
}

.category-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-label {
  font-size: 14px;
  color: #666;
}

.category-buttons {
  display: flex;
  gap: 5px;
}

.graph-card {
  height: 600px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.graph-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.graph-legend {
  display: flex;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

.legend-item.disease .dot { background: #EF4444; box-shadow: 0 0 6px #EF4444; }
.legend-item.symptom .dot { background: #F59E0B; box-shadow: 0 0 6px #F59E0B; }
.legend-item.drug .dot { background: #10B981; box-shadow: 0 0 6px #10B981; }
.legend-item.test .dot { background: #3B82F6; box-shadow: 0 0 6px #3B82F6; }

.graph-container {
  width: 100%;
  height: 500px;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
}

.graph-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

.edge-group {
  cursor: pointer;
}

.edge-line {
  transition: stroke-width 0.2s, opacity 0.2s;
  opacity: 0.4;
}

.edge-line:hover {
  stroke-width: 2 !important;
  opacity: 0.8;
}

.edge-label {
  pointer-events: none;
  user-select: none;
  fill: #888;
}

.node-group {
  cursor: pointer;
}

.node-glow {
  transition: r 0.2s, opacity 0.2s;
}

.node-circle {
  transition: r 0.2s, stroke-width 0.2s, filter 0.2s;
}

.node-circle.disease {
  filter: drop-shadow(0 0 8px rgba(255, 99, 71, 0.6));
}

.node-circle.symptom {
  filter: drop-shadow(0 0 8px rgba(255, 165, 0, 0.6));
}

.node-circle.drug {
  filter: drop-shadow(0 0 8px rgba(50, 205, 50, 0.6));
}

.node-circle.test {
  filter: drop-shadow(0 0 8px rgba(65, 105, 225, 0.6));
}

.node-circle:hover {
  stroke-width: 3;
  filter: brightness(1.3) drop-shadow(0 0 12px currentColor) !important;
}

.node-circle.hovered {
  stroke-width: 3;
  filter: brightness(1.4) drop-shadow(0 0 15px currentColor) !important;
}

.node-circle.dragging {
  stroke: #fff !important;
  stroke-width: 3;
  filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.8)) !important;
  cursor: grabbing !important;
}

.node-label {
  pointer-events: none;
  user-select: none;
  font-weight: 500;
  fill: #ccc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.graph-controls {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.info-card {
  height: 300px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.detail-row .label {
  width: 80px;
  color: #666;
  font-size: 14px;
}

.detail-row .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.stats-info {
  padding: 10px 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #F3F4F6;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.search-card {
  height: auto;
}

.search-results {
  margin-top: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: #F3F4F6;
}

.result-keyword {
  font-size: 14px;
  color: #333;
}
</style>