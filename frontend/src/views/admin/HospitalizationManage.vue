<template>
  <div class="hospitalization-manage">
    <div class="page-header">
      <h2 class="page-title">住院管理</h2>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card glass-card">
        <div class="stat-icon blue-icon">
          <el-icon :size="28"><HomeFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">总床位数</div>
          <div class="stat-value">{{ wardStats.totalBeds }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon green-icon">
          <el-icon :size="28"><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">已入住</div>
          <div class="stat-value">{{ wardStats.occupied }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon yellow-icon">
          <el-icon :size="28"><InfoFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">空闲床位</div>
          <div class="stat-value warning-text">{{ wardStats.available }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon red-icon">
          <el-icon :size="28"><CircleClose /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">预交金总额</div>
          <div class="stat-value danger-text">¥{{ formatNumber(totalPrepayment) }}</div>
        </div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-section glass-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 床位调整 -->
        <el-tab-pane label="床位调整" name="bed">
          <div class="tab-header">
            <el-select v-model="wardFilter" placeholder="选择病区" style="width: 150px">
              <el-option label="一病区" value="一病区" />
              <el-option label="二病区" value="二病区" />
              <el-option label="三病区" value="三病区" />
              <el-option label="ICU" value="ICU" />
            </el-select>
            <div class="ward-legend">
              <span class="legend-item"><span class="dot green"></span> 空闲</span>
              <span class="legend-item"><span class="dot red"></span> 已入住</span>
              <span class="legend-item"><span class="dot yellow"></span> 预留</span>
              <span class="legend-item"><span class="dot gray"></span> 维修中</span>
            </div>
          </div>

          <!-- 病区床位图 -->
          <div class="ward-map">
            <div class="ward-room" v-for="room in filteredRooms" :key="room.roomNo">
              <div class="room-header">
                <span class="room-no">{{ room.roomNo }}</span>
                <span class="room-type">{{ room.type }}</span>
              </div>
              <div class="beds-grid">
                <div
                  v-for="bed in room.beds"
                  :key="bed.id"
                  class="bed-card"
                  :class="`bed-${bed.status}`"
                  @click="handleBedClick(bed)"
                  draggable="true"
                  @dragstart="handleDragStart(bed)"
                  @dragover.prevent
                  @drop="handleDrop(bed)"
                >
                  <div class="bed-no">{{ bed.no }}</div>
                  <div class="bed-patient" v-if="bed.patient">
                    <span class="patient-name">{{ bed.patient.name }}</span>
                    <span class="patient-dept">{{ bed.patient.dept }}</span>
                  </div>
                  <div class="bed-status" v-else>
                    {{ bed.status === 'available' ? '空闲' : bed.status === 'reserved' ? '预留' : '维修中' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 预交金充值 -->
        <el-tab-pane label="预交金充值" name="prepayment">
          <div class="tab-header">
            <div class="filter-row">
              <el-input v-model="prepaymentFilter.name" placeholder="搜索患者姓名" clearable style="width: 180px" />
              <el-input v-model="prepaymentFilter.patientId" placeholder="搜索患者ID" clearable style="width: 150px" />
              <el-button type="primary" icon="Search" @click="handlePrepaymentSearch">搜索</el-button>
            </div>
            <el-button type="primary" icon="Plus" @click="handleAddPrepayment">新增充值</el-button>
          </div>
          <el-table :data="filteredPrepayments" stripe v-loading="loading">
            <el-table-column prop="patient_name" label="患者姓名" width="100" />
            <el-table-column prop="patient_id" label="患者ID" width="120" />
            <el-table-column prop="dept" label="科室" width="100" />
            <el-table-column prop="bed_no" label="床位号" width="80" />
            <el-table-column prop="total_prepayment" label="预交金总额" width="120" align="right">
              <template #default="{ row }">¥{{ row.total_prepayment.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="used_amount" label="已用金额" width="120" align="right">
              <template #default="{ row }">¥{{ row.used_amount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="balance" label="余额" width="120" align="right">
              <template #default="{ row }">
                <span :class="{ 'danger-text': row.balance < 100 }">¥{{ row.balance.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="last_recharge_time" label="最后充值时间" width="160" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="Plus" @click="handleRecharge(row)">
                  充值
                </el-button>
                <el-button size="small" type="primary" link icon="View" @click="handleViewRecords(row)">
                  记录
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 入院登记 -->
        <el-tab-pane label="入院登记" name="admission">
          <div class="tab-header">
            <div class="filter-row">
              <el-input v-model="admissionFilter.name" placeholder="搜索患者姓名" clearable style="width: 180px" />
              <el-input v-model="admissionFilter.idCard" placeholder="搜索身份证号" clearable style="width: 180px" />
              <el-button type="primary" icon="Search" @click="handleAdmissionSearch">搜索</el-button>
            </div>
            <el-button type="primary" icon="Plus" @click="handleNewAdmission">新入院登记</el-button>
          </div>
          <el-table :data="filteredAdmissions" stripe v-loading="loading">
            <el-table-column prop="patient_name" label="患者姓名" width="100" />
            <el-table-column prop="id_card" label="身份证号" width="180" />
            <el-table-column prop="gender" label="性别" width="60" />
            <el-table-column prop="age" label="年龄" width="60" />
            <el-table-column prop="dept" label="入院科室" width="100" />
            <el-table-column prop="diagnosis" label="入院诊断" width="150" />
            <el-table-column prop="bed_no" label="床位号" width="80" />
            <el-table-column prop="admit_date" label="入院日期" width="120" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '已入院' ? 'success' : 'warning'">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="View" @click="handleViewAdmission(row)">
                  详情
                </el-button>
                <el-button size="small" type="primary" link icon="Edit" @click="handleEditAdmission(row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 出院结算 -->
        <el-tab-pane label="出院结算" name="discharge">
          <div class="tab-header">
            <div class="filter-row">
              <el-input v-model="dischargeFilter.name" placeholder="搜索患者姓名" clearable style="width: 180px" />
              <el-select v-model="dischargeFilter.dept" placeholder="选择科室" clearable style="width: 150px">
                <el-option label="呼吸内科" value="呼吸内科" />
                <el-option label="心内科" value="心内科" />
                <el-option label="骨科" value="骨科" />
                <el-option label="神经内科" value="神经内科" />
                <el-option label="消化内科" value="消化内科" />
              </el-select>
              <el-button type="primary" icon="Search" @click="handleDischargeSearch">搜索</el-button>
            </div>
            <el-button type="success" icon="Document" @click="handleDischargeReport">出院报表</el-button>
          </div>
          <el-table :data="filteredDischarges" stripe v-loading="loading">
            <el-table-column prop="patient_name" label="患者姓名" width="100" />
            <el-table-column prop="dept" label="科室" width="100" />
            <el-table-column prop="bed_no" label="床位号" width="80" />
            <el-table-column prop="admit_date" label="入院日期" width="120" />
            <el-table-column prop="discharge_date" label="出院日期" width="120" />
            <el-table-column prop="days" label="住院天数" width="80" />
            <el-table-column prop="total_cost" label="总费用" width="120" align="right">
              <template #default="{ row }">¥{{ row.total_cost.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="insurance_pay" label="医保支付" width="120" align="right">
              <template #default="{ row }">¥{{ row.insurance_pay.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="self_pay" label="自费金额" width="120" align="right">
              <template #default="{ row }">
                <span :class="{ 'danger-text': row.self_pay > 5000 }">¥{{ row.self_pay.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="结算状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '已结算' ? 'success' : 'warning'">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link icon="View" @click="handleViewDischarge(row)">
                  详情
                </el-button>
                <el-button v-if="row.status === '待结算'" size="small" type="success" link icon="Check" @click="handleSettle(row)">
                  结算
                </el-button>
                <el-button size="small" type="primary" link icon="Download" @click="handlePrintDischarge(row)">
                  打印
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 床位详情对话框 -->
    <el-dialog v-model="bedDialogVisible" title="床位详情" width="500px">
      <el-form label-width="100px" v-if="selectedBed">
        <el-form-item label="床位号">{{ selectedBed.no }}</el-form-item>
        <el-form-item label="状态">
          <el-tag :type="bedStatusMap[selectedBed.status]">{{ bedStatusText[selectedBed.status] }}</el-tag>
        </el-form-item>
        <template v-if="selectedBed.patient">
          <el-form-item label="患者姓名">{{ selectedBed.patient.name }}</el-form-item>
          <el-form-item label="科室">{{ selectedBed.patient.dept }}</el-form-item>
          <el-form-item label="入院日期">{{ selectedBed.patient.admitDate }}</el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="bedDialogVisible = false">关闭</el-button>
        <el-button v-if="selectedBed?.patient" type="primary" @click="handleChangeBed">换床</el-button>
        <el-button v-if="selectedBed?.patient" type="danger" @click="handleDischarge">出院</el-button>
      </template>
    </el-dialog>

    <!-- 换床对话框 -->
    <el-dialog v-model="changeBedVisible" title="换床操作" width="450px">
      <el-form label-width="100px">
        <el-form-item label="当前床位">{{ selectedBed?.no }}</el-form-item>
        <el-form-item label="目标床位">
          <el-select v-model="targetBedId" placeholder="请选择目标床位" style="width: 100%">
            <el-option
              v-for="bed in availableBeds"
              :key="bed.id"
              :label="`${bed.no} (${bed.room})`"
              :value="bed.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeBedVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmChangeBed">确认换床</el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="预交金充值" width="500px">
      <el-form :model="rechargeForm" :rules="rechargeRules" ref="rechargeFormRef" label-width="100px">
        <el-form-item label="患者姓名">
          <el-input :model-value="rechargeForm.patient_name" disabled />
        </el-form-item>
        <el-form-item label="充值金额" prop="amount">
          <el-input-number v-model="rechargeForm.amount" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="支付方式" prop="payMethod">
          <el-select v-model="rechargeForm.payMethod" placeholder="请选择支付方式" style="width: 100%">
            <el-option label="现金" value="现金" />
            <el-option label="刷卡" value="刷卡" />
            <el-option label="扫码支付" value="扫码支付" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rechargeForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmRecharge">确认充值</el-button>
      </template>
    </el-dialog>

    <!-- 入院登记对话框 -->
    <el-dialog v-model="admissionDialogVisible" title="入院登记" width="600px">
      <el-form :model="admissionForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="患者姓名">
              <el-input v-model="admissionForm.patient_name" placeholder="请输入患者姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号">
              <el-input v-model="admissionForm.id_card" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="性别">
              <el-select v-model="admissionForm.gender" style="width: 100%">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年龄">
              <el-input-number v-model="admissionForm.age" :min="0" :max="120" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预交金">
              <el-input-number v-model="admissionForm.prepayment" :min="0" :step="1000" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="入院科室">
          <el-select v-model="admissionForm.dept" placeholder="请选择入院科室" style="width: 100%">
            <el-option label="呼吸内科" value="呼吸内科" />
            <el-option label="心内科" value="心内科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="神经内科" value="神经内科" />
            <el-option label="消化内科" value="消化内科" />
            <el-option label="ICU" value="ICU" />
          </el-select>
        </el-form-item>
        <el-form-item label="入院诊断">
          <el-input v-model="admissionForm.diagnosis" placeholder="请输入入院诊断" />
        </el-form-item>
        <el-form-item label="床位号">
          <el-select v-model="admissionForm.bed_no" placeholder="请选择床位" style="width: 100%">
            <el-option v-for="bed in availableBeds" :key="bed.id" :label="`${bed.no} (${bed.room})`" :value="bed.no" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="admissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAdmission">确认入院</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { HomeFilled, CircleCheck, InfoFilled, CircleClose } from '@element-plus/icons-vue'

const activeTab = ref('bed')
const loading = ref(false)

// 病区统计
const wardStats = reactive({ totalBeds: 520, occupied: 385, available: 98, reserved: 25, maintenance: 12 })

const wardFilter = ref('一病区')

// 床位状态
const bedStatusMap: Record<string, string> = { available: 'success', occupied: 'danger', reserved: 'warning', maintenance: 'info' }
const bedStatusText: Record<string, string> = { available: '空闲', occupied: '已入住', reserved: '预留', maintenance: '维修中' }

// 病区床位数据
const rooms = ref([
  // 一病区 - 呼吸内科
  { ward: '一病区', roomNo: '101', type: '单人间', beds: [
    { id: 1, no: '101-1', status: 'occupied', patient: { name: '张建国', dept: '呼吸内科', admitDate: '2026-06-15' } },
    { id: 2, no: '101-2', status: 'available', patient: null }
  ]},
  { ward: '一病区', roomNo: '102', type: '双人间', beds: [
    { id: 3, no: '102-1', status: 'occupied', patient: { name: '李明远', dept: '呼吸内科', admitDate: '2026-06-14' } },
    { id: 4, no: '102-2', status: 'occupied', patient: { name: '王秀兰', dept: '呼吸内科', admitDate: '2026-06-10' } }
  ]},
  { ward: '一病区', roomNo: '103', type: '三人间', beds: [
    { id: 5, no: '103-1', status: 'reserved', patient: null },
    { id: 6, no: '103-2', status: 'available', patient: null },
    { id: 7, no: '103-3', status: 'occupied', patient: { name: '赵志强', dept: '呼吸内科', admitDate: '2026-06-16' } }
  ]},
  { ward: '一病区', roomNo: '104', type: '双人间', beds: [
    { id: 8, no: '104-1', status: 'occupied', patient: { name: '陈晓燕', dept: '呼吸内科', admitDate: '2026-06-16' } },
    { id: 9, no: '104-2', status: 'available', patient: null }
  ]},
  { ward: '一病区', roomNo: '105', type: 'VIP单人间', beds: [
    { id: 10, no: '105-1', status: 'occupied', patient: { name: '刘德华', dept: '呼吸内科', admitDate: '2026-06-18' } }
  ]},
  // 二病区 - 心内科
  { ward: '二病区', roomNo: '201', type: '单人间', beds: [
    { id: 11, no: '201-1', status: 'occupied', patient: { name: '孙国栋', dept: '心内科', admitDate: '2026-06-12' } },
    { id: 12, no: '201-2', status: 'available', patient: null }
  ]},
  { ward: '二病区', roomNo: '202', type: '双人间', beds: [
    { id: 13, no: '202-1', status: 'occupied', patient: { name: '周桂英', dept: '心内科', admitDate: '2026-06-13' } },
    { id: 14, no: '202-2', status: 'maintenance', patient: null }
  ]},
  { ward: '二病区', roomNo: '203', type: '三人间', beds: [
    { id: 15, no: '203-1', status: 'occupied', patient: { name: '吴志平', dept: '心内科', admitDate: '2026-06-11' } },
    { id: 16, no: '203-2', status: 'occupied', patient: { name: '郑晓琳', dept: '心内科', admitDate: '2026-06-15' } },
    { id: 17, no: '203-3', status: 'available', patient: null }
  ]},
  // 三病区 - 骨科
  { ward: '三病区', roomNo: '301', type: '双人间', beds: [
    { id: 18, no: '301-1', status: 'occupied', patient: { name: '冯建国', dept: '骨科', admitDate: '2026-06-10' } },
    { id: 19, no: '301-2', status: 'occupied', patient: { name: '陈丽华', dept: '骨科', admitDate: '2026-06-08' } }
  ]},
  { ward: '三病区', roomNo: '302', type: '三人间', beds: [
    { id: 20, no: '302-1', status: 'reserved', patient: null },
    { id: 21, no: '302-2', status: 'available', patient: null },
    { id: 22, no: '302-3', status: 'occupied', patient: { name: '许永强', dept: '骨科', admitDate: '2026-06-14' } }
  ]},
  { ward: '三病区', roomNo: '303', type: '单人间', beds: [
    { id: 23, no: '303-1', status: 'occupied', patient: { name: '张雅琴', dept: '骨科', admitDate: '2026-06-17' } }
  ]},
  // 四病区 - 神经内科
  { ward: '四病区', roomNo: '401', type: '双人间', beds: [
    { id: 24, no: '401-1', status: 'occupied', patient: { name: '刘志强', dept: '神经内科', admitDate: '2026-06-09' } },
    { id: 25, no: '401-2', status: 'available', patient: null }
  ]},
  { ward: '四病区', roomNo: '402', type: '三人间', beds: [
    { id: 26, no: '402-1', status: 'occupied', patient: { name: '沈丽丽', dept: '神经内科', admitDate: '2026-06-13' } },
    { id: 27, no: '402-2', status: 'occupied', patient: { name: '朱明辉', dept: '神经内科', admitDate: '2026-06-16' } },
    { id: 28, no: '402-3', status: 'reserved', patient: null }
  ]},
  // 五病区 - 消化内科
  { ward: '五病区', roomNo: '501', type: '双人间', beds: [
    { id: 29, no: '501-1', status: 'occupied', patient: { name: '杨丽萍', dept: '消化内科', admitDate: '2026-06-14' } },
    { id: 30, no: '501-2', status: 'available', patient: null }
  ]},
  { ward: '五病区', roomNo: '502', type: 'VIP单人间', beds: [
    { id: 31, no: '502-1', status: 'occupied', patient: { name: '马永强', dept: '消化内科', admitDate: '2026-06-17' } }
  ]},
  // ICU病区
  { ward: 'ICU病区', roomNo: 'ICU-01', type: 'ICU床位', beds: [
    { id: 32, no: 'ICU-01', status: 'occupied', patient: { name: '韩志平', dept: 'ICU', admitDate: '2026-06-18' } },
    { id: 33, no: 'ICU-02', status: 'occupied', patient: { name: '罗志刚', dept: 'ICU', admitDate: '2026-06-18' } },
    { id: 34, no: 'ICU-03', status: 'available', patient: null },
    { id: 35, no: 'ICU-04', status: 'reserved', patient: null }
  ]},
])

const filteredRooms = computed(() => {
  if (!wardFilter.value) return rooms.value
  return rooms.value
})

// 床位操作
const bedDialogVisible = ref(false)
const selectedBed = ref<any>(null)
const changeBedVisible = ref(false)
const targetBedId = ref<number | null>(null)

const availableBeds = computed(() => {
  const result: any[] = []
  rooms.value.forEach(room => {
    room.beds.forEach(bed => {
      if (bed.status === 'available' && (!selectedBed.value || bed.id !== selectedBed.value.id)) {
        result.push({ ...bed, room: room.roomNo })
      }
    })
  })
  return result
})

const handleBedClick = (bed: any) => {
  selectedBed.value = bed
  bedDialogVisible.value = true
}

const handleDragStart = (bed: any) => {
  selectedBed.value = bed
}

const handleDrop = (targetBed: any) => {
  if (selectedBed.value && selectedBed.value.id !== targetBed.id && selectedBed.value.patient && !targetBed.patient) {
    ElMessageBox.confirm(
      `确定将患者${selectedBed.value.patient.name}从${selectedBed.value.no}换到${targetBed.no}吗？`,
      '换床确认', { type: 'info' }
    ).then(() => {
      targetBed.patient = { ...selectedBed.value.patient }
      targetBed.status = 'occupied'
      selectedBed.value.patient = null
      selectedBed.value.status = 'available'
      ElMessage.success('换床成功')
    }).catch(() => {})
  }
}

const handleChangeBed = () => {
  targetBedId.value = null
  changeBedVisible.value = true
  bedDialogVisible.value = false
}

const handleConfirmChangeBed = () => {
  if (!targetBedId.value) return
  const target = rooms.value.flatMap(r => r.beds).find(b => b.id === targetBedId.value)
  if (target && selectedBed.value) {
    target.patient = { ...selectedBed.value.patient }
    target.status = 'occupied'
    selectedBed.value.patient = null
    selectedBed.value.status = 'available'
    ElMessage.success('换床成功')
  }
  changeBedVisible.value = false
}

const handleDischarge = () => {
  ElMessageBox.confirm('确定要为该患者办理出院吗？', '出院确认', { type: 'warning' }).then(() => {
    if (selectedBed.value) {
      selectedBed.value.patient = null
      selectedBed.value.status = 'available'
      wardStats.occupied--
      wardStats.available++
    }
    bedDialogVisible.value = false
    ElMessage.success('出院办理成功')
  }).catch(() => {})
}

// 预交金数据
const totalPrepayment = ref(285000)

const prepaymentFilter = reactive({ name: '', patientId: '' })

const prepayments = ref([
  { id: 1, patient_name: '张建国', patient_id: 'P001', dept: '呼吸内科', bed_no: '101-1', total_prepayment: 25000, used_amount: 12800, balance: 12200, last_recharge_time: '2026-06-17 10:30' },
  { id: 2, patient_name: '李明远', patient_id: 'P002', dept: '呼吸内科', bed_no: '102-1', total_prepayment: 18000, used_amount: 15200, balance: 2800, last_recharge_time: '2026-06-16 15:00' },
  { id: 3, patient_name: '王秀兰', patient_id: 'P003', dept: '呼吸内科', bed_no: '102-2', total_prepayment: 22000, used_amount: 18600, balance: 3400, last_recharge_time: '2026-06-18 08:00' },
  { id: 4, patient_name: '赵志强', patient_id: 'P004', dept: '呼吸内科', bed_no: '103-3', total_prepayment: 15000, used_amount: 6200, balance: 8800, last_recharge_time: '2026-06-15 14:20' },
  { id: 5, patient_name: '陈晓燕', patient_id: 'P005', dept: '呼吸内科', bed_no: '104-1', total_prepayment: 28000, used_amount: 9100, balance: 18900, last_recharge_time: '2026-06-17 16:00' },
  { id: 6, patient_name: '刘德华', patient_id: 'P006', dept: '呼吸内科', bed_no: '105-1', total_prepayment: 50000, used_amount: 5200, balance: 44800, last_recharge_time: '2026-06-18 09:00' },
  { id: 7, patient_name: '孙国栋', patient_id: 'P007', dept: '心内科', bed_no: '201-1', total_prepayment: 30000, used_amount: 22100, balance: 7900, last_recharge_time: '2026-06-14 11:00' },
  { id: 8, patient_name: '周桂英', patient_id: 'P008', dept: '心内科', bed_no: '202-1', total_prepayment: 16000, used_amount: 13500, balance: 2500, last_recharge_time: '2026-06-15 09:30' },
  { id: 9, patient_name: '吴志平', patient_id: 'P009', dept: '心内科', bed_no: '203-1', total_prepayment: 35000, used_amount: 28800, balance: 6200, last_recharge_time: '2026-06-13 14:00' },
  { id: 10, patient_name: '郑晓琳', patient_id: 'P010', dept: '心内科', bed_no: '203-2', total_prepayment: 12000, used_amount: 4000, balance: 8000, last_recharge_time: '2026-06-16 08:30' },
  { id: 11, patient_name: '冯建国', patient_id: 'P011', dept: '骨科', bed_no: '301-1', total_prepayment: 45000, used_amount: 32000, balance: 13000, last_recharge_time: '2026-06-12 10:00' },
  { id: 12, patient_name: '陈丽华', patient_id: 'P012', dept: '骨科', bed_no: '301-2', total_prepayment: 20000, used_amount: 17500, balance: 2500, last_recharge_time: '2026-06-14 16:00' },
  { id: 13, patient_name: '许永强', patient_id: 'P013', dept: '骨科', bed_no: '302-3', total_prepayment: 32000, used_amount: 19600, balance: 12400, last_recharge_time: '2026-06-15 13:00' },
])

const filteredPrepayments = computed(() => {
  return prepayments.value.filter(p => {
    const matchName = !prepaymentFilter.name || p.patient_name.includes(prepaymentFilter.name)
    const matchId = !prepaymentFilter.patientId || p.patient_id.includes(prepaymentFilter.patientId)
    return matchName && matchId
  })
})

const handlePrepaymentSearch = () => {}
const handleAddPrepayment = () => {
  ElMessage.info('新增充值入口')
}

// 充值对话框
const rechargeDialogVisible = ref(false)
const rechargeFormRef = ref<FormInstance>()
const rechargeForm = reactive({
  patient_name: '',
  patientId: 0,
  amount: 0,
  payMethod: '',
  remark: ''
})

const rechargeRules: FormRules = {
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }],
  payMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
}

const handleRecharge = (row: any) => {
  rechargeForm.patient_name = row.patient_name
  rechargeForm.patientId = row.id
  rechargeForm.amount = 0
  rechargeForm.payMethod = '现金'
  rechargeForm.remark = ''
  rechargeDialogVisible.value = true
}

const handleConfirmRecharge = async () => {
  if (!rechargeFormRef.value) return
  await rechargeFormRef.value.validate((valid) => {
    if (valid) {
      const p = prepayments.value.find(item => item.id === rechargeForm.patientId)
      if (p) {
        p.total_prepayment += rechargeForm.amount
        p.balance += rechargeForm.amount
        p.last_recharge_time = new Date().toLocaleString()
        totalPrepayment.value += rechargeForm.amount
        ElMessage.success('充值成功')
      }
      rechargeDialogVisible.value = false
    }
  })
}

const handleViewRecords = (row: any) => {
  ElMessageBox.alert(
    `
    <div style="line-height:2">
      <strong>患者：</strong>${row.patient_name}<br>
      <strong>预交金总额：</strong>¥${row.total_prepayment.toFixed(2)}<br>
      <strong>已用金额：</strong>¥${row.used_amount.toFixed(2)}<br>
      <strong>余额：</strong>¥${row.balance.toFixed(2)}<br>
      <strong>最后充值时间：</strong>${row.last_recharge_time}
    </div>
    `, '充值记录', { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' }
  )
}

const formatNumber = (num: number) => num.toLocaleString()

// ============================================================
// 入院登记功能
// ============================================================
const admissionFilter = reactive({ name: '', idCard: '' })

const admissions = ref([
  { id: 1, patient_name: '张建国', id_card: '110101195501011234', gender: '男', age: 71, dept: '呼吸内科', diagnosis: '慢性支气管炎急性发作', bed_no: '101-1', admit_date: '2026-06-15', status: '已入院' },
  { id: 2, patient_name: '李明远', id_card: '110101196002022345', gender: '男', age: 66, dept: '呼吸内科', diagnosis: '肺炎', bed_no: '102-1', admit_date: '2026-06-14', status: '已入院' },
  { id: 3, patient_name: '王秀兰', id_card: '110101194803033456', gender: '女', age: 78, dept: '呼吸内科', diagnosis: '肺气肿', bed_no: '102-2', admit_date: '2026-06-10', status: '已入院' },
  { id: 4, patient_name: '赵志强', id_card: '110101196504044567', gender: '男', age: 61, dept: '呼吸内科', diagnosis: '哮喘', bed_no: '103-3', admit_date: '2026-06-16', status: '已入院' },
  { id: 5, patient_name: '孙国栋', id_card: '110101195805055678', gender: '男', age: 68, dept: '心内科', diagnosis: '冠心病', bed_no: '201-1', admit_date: '2026-06-12', status: '已入院' },
  { id: 6, patient_name: '周桂英', id_card: '110101196006066789', gender: '女', age: 66, dept: '心内科', diagnosis: '高血压心脏病', bed_no: '202-1', admit_date: '2026-06-13', status: '已入院' },
  { id: 7, patient_name: '冯建国', id_card: '110101195507077890', gender: '男', age: 71, dept: '骨科', diagnosis: '股骨骨折', bed_no: '301-1', admit_date: '2026-06-10', status: '已入院' },
  { id: 8, patient_name: '刘志强', id_card: '110101196508088901', gender: '男', age: 61, dept: '神经内科', diagnosis: '脑梗塞', bed_no: '401-1', admit_date: '2026-06-09', status: '已入院' },
  { id: 9, patient_name: '杨丽萍', id_card: '110101197009099012', gender: '女', age: 56, dept: '消化内科', diagnosis: '胃溃疡', bed_no: '501-1', admit_date: '2026-06-14', status: '已入院' },
  { id: 10, patient_name: '韩志平', id_card: '110101195510101123', gender: '男', age: 71, dept: 'ICU', diagnosis: '重症肺炎', bed_no: 'ICU-01', admit_date: '2026-06-18', status: '已入院' },
])

const filteredAdmissions = computed(() => {
  return admissions.value.filter(a => {
    if (admissionFilter.name && !a.patient_name.includes(admissionFilter.name)) return false
    if (admissionFilter.idCard && !a.id_card.includes(admissionFilter.idCard)) return false
    return true
  })
})

const admissionDialogVisible = ref(false)
const admissionForm = reactive({
  patient_name: '',
  id_card: '',
  gender: '男',
  age: 0,
  dept: '',
  diagnosis: '',
  bed_no: '',
  prepayment: 5000
})

const handleAdmissionSearch = () => {
  ElMessage.success('搜索完成')
}

const handleNewAdmission = () => {
  Object.assign(admissionForm, { patient_name: '', id_card: '', gender: '男', age: 0, dept: '', diagnosis: '', bed_no: '', prepayment: 5000 })
  admissionDialogVisible.value = true
}

const handleViewAdmission = (row: any) => {
  ElMessageBox.alert(
    `<div style="line-height:2">
      <strong>患者姓名：</strong>${row.patient_name}<br>
      <strong>身份证号：</strong>${row.id_card}<br>
      <strong>性别：</strong>${row.gender}<br>
      <strong>年龄：</strong>${row.age}岁<br>
      <strong>入院科室：</strong>${row.dept}<br>
      <strong>入院诊断：</strong>${row.diagnosis}<br>
      <strong>床位号：</strong>${row.bed_no}<br>
      <strong>入院日期：</strong>${row.admit_date}<br>
      <strong>状态：</strong>${row.status}
    </div>`, '入院详情', { dangerouslyUseHTMLString: true }
  )
}

const handleEditAdmission = (row: any) => {
  Object.assign(admissionForm, row)
  admissionDialogVisible.value = true
}

const handleConfirmAdmission = () => {
  if (!admissionForm.patient_name || !admissionForm.dept || !admissionForm.diagnosis) {
    ElMessage.warning('请填写完整信息')
    return
  }
  admissions.value.push({
    id: Date.now(),
    ...admissionForm,
    admit_date: new Date().toISOString().slice(0, 10),
    status: '已入院'
  })
  // 更新床位状态
  const bed = rooms.value.flatMap(r => r.beds).find(b => b.no === admissionForm.bed_no)
  if (bed) {
    bed.status = 'occupied'
    bed.patient = { name: admissionForm.patient_name, dept: admissionForm.dept, admitDate: new Date().toISOString().slice(0, 10) }
    wardStats.occupied++
    wardStats.available--
  }
  admissionDialogVisible.value = false
  ElMessage.success('入院登记成功')
}

// ============================================================
// 出院结算功能
// ============================================================
const dischargeFilter = reactive({ name: '', dept: '' })

const discharges = ref([
  { id: 1, patient_name: '陈丽华', dept: '骨科', bed_no: '301-2', admit_date: '2026-06-08', discharge_date: '2026-06-18', days: 10, total_cost: 18500, insurance_pay: 11100, self_pay: 7400, status: '待结算' },
  { id: 2, patient_name: '许永强', dept: '骨科', bed_no: '302-3', admit_date: '2026-06-14', discharge_date: '2026-06-18', days: 4, total_cost: 6200, insurance_pay: 3720, self_pay: 2480, status: '待结算' },
  { id: 3, patient_name: '沈丽丽', dept: '神经内科', bed_no: '402-1', admit_date: '2026-06-13', discharge_date: '2026-06-17', days: 4, total_cost: 8500, insurance_pay: 5100, self_pay: 3400, status: '已结算' },
  { id: 4, patient_name: '朱明辉', dept: '神经内科', bed_no: '402-2', admit_date: '2026-06-16', discharge_date: '2026-06-18', days: 2, total_cost: 3200, insurance_pay: 1920, self_pay: 1280, status: '待结算' },
  { id: 5, patient_name: '马永强', dept: '消化内科', bed_no: '502-1', admit_date: '2026-06-17', discharge_date: '2026-06-18', days: 1, total_cost: 2500, insurance_pay: 1500, self_pay: 1000, status: '已结算' },
])

const filteredDischarges = computed(() => {
  return discharges.value.filter(d => {
    if (dischargeFilter.name && !d.patient_name.includes(dischargeFilter.name)) return false
    if (dischargeFilter.dept && d.dept !== dischargeFilter.dept) return false
    return true
  })
})

const handleDischargeSearch = () => {
  ElMessage.success('搜索完成')
}

const handleDischargeReport = () => {
  ElMessage.success('出院报表导出中...')
}

const handleViewDischarge = (row: any) => {
  ElMessageBox.alert(
    `<div style="line-height:2">
      <strong>患者姓名：</strong>${row.patient_name}<br>
      <strong>科室：</strong>${row.dept}<br>
      <strong>床位号：</strong>${row.bed_no}<br>
      <strong>入院日期：</strong>${row.admit_date}<br>
      <strong>出院日期：</strong>${row.discharge_date}<br>
      <strong>住院天数：</strong>${row.days}天<br>
      <strong>总费用：</strong>¥${row.total_cost.toFixed(2)}<br>
      <strong>医保支付：</strong>¥${row.insurance_pay.toFixed(2)}<br>
      <strong>自费金额：</strong>¥${row.self_pay.toFixed(2)}<br>
      <strong>结算状态：</strong>${row.status}
    </div>`, '出院详情', { dangerouslyUseHTMLString: true }
  )
}

const handleSettle = (row: any) => {
  ElMessageBox.confirm(`确认结算？自费金额：¥${row.self_pay.toFixed(2)}`, '出院结算', { type: 'info' }).then(() => {
    row.status = '已结算'
    ElMessage.success('结算成功')
  }).catch(() => {})
}

const handlePrintDischarge = (_row: any) => {
  ElMessage.success('出院小结打印中...')
}

// ============================================================
// 入院登记对话框
// ============================================================
</script>

<style scoped lang="scss">
.hospitalization-manage {
  padding: 20px;
  background: transparent;
  min-height: 100%;
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #1E293B; }

.stats-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }

.stat-card {
  display: flex; align-items: center; padding: 20px; border-radius: 12px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  transition: all 0.3s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(66, 153, 225, 0.15); }
}

.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
.blue-icon { background: linear-gradient(135deg, #4299E1, #3182CE); color: #fff; }
.green-icon { background: linear-gradient(135deg, #48BB78, #38A169); color: #fff; }
.yellow-icon { background: linear-gradient(135deg, #ECC94B, #D69E2E); color: #fff; }
.red-icon { background: linear-gradient(135deg, #FC8181, #F56565); color: #fff; }

.stat-content { flex: 1; }
.stat-label { font-size: 13px; color: #64748B; margin-bottom: 4px; }
.stat-value { font-size: 26px; font-weight: 700; color: #1E293B; }
.warning-text { color: #ECC94B; }
.danger-text { color: #FC8181; }

.tab-section {
  padding: 0; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
  :deep(.el-tabs__header) { background: rgba(235, 248, 255, 0.8); border-bottom: 1px solid rgba(66, 153, 225, 0.1); }
  :deep(.el-tabs__content) { padding: 20px; }
  :deep(.el-tabs__item) { color: #64748B; }
  :deep(.el-tabs__item.is-active) { color: #4299E1; background: rgba(66, 153, 225, 0.1); }
}

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.filter-row { display: flex; gap: 10px; align-items: center; }

.ward-legend { display: flex; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748B; }
.dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.dot.green { background: #48BB78; }
.dot.red { background: #FC8181; }
.dot.yellow { background: #ECC94B; }
.dot.gray { background: #A0AEC0; }

.ward-map { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }

.ward-room {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(66, 153, 225, 0.1); border-radius: 12px; padding: 16px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

.room-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.room-no { font-weight: 600; color: #1E293B; }
.room-type { font-size: 13px; color: #94A3B8; }

.beds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }

.bed-card {
  padding: 12px; border-radius: 8px; text-align: center; cursor: pointer;
  transition: all 0.2s; border: 2px solid transparent;
  &:hover { transform: scale(1.05); }
  &.bed-available { background: rgba(72, 187, 120, 0.08); border-color: rgba(72, 187, 120, 0.3); }
  &.bed-occupied { background: rgba(252, 129, 129, 0.08); border-color: rgba(252, 129, 129, 0.3); }
  &.bed-reserved { background: rgba(250, 204, 21, 0.08); border-color: rgba(250, 204, 21, 0.3); }
  &.bed-maintenance { background: rgba(160, 174, 192, 0.08); border-color: rgba(160, 174, 192, 0.3); }
}

.bed-no { font-size: 12px; color: #94A3B8; margin-bottom: 6px; }
.patient-name { font-weight: 600; color: #1E293B; font-size: 14px; }
.patient-dept { font-size: 12px; color: #64748B; }
.bed-status { font-size: 13px; color: #4A5568; }

.glass-card { background: rgba(255,255,255,0.95); border: 1px solid rgba(66, 153, 225, 0.1); box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06); }

:deep(.el-table) {
  background: rgba(255,255,255,0.95); border-radius: 12px;
  th { background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%); color: #4299E1; border-color: rgba(66, 153, 225, 0.1); font-weight: 600; }
  td { border-color: rgba(66, 153, 225, 0.08); color: #4A5568; }
  tr:hover > td { background: rgba(66, 153, 225, 0.05); }
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}
</style>