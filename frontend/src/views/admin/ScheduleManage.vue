<template>
  <div class="manage-page">
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="schedule-tabs" @tab-change="onTabChange">
      <el-tab-pane label="排班管理" name="calendar" />
      <el-tab-pane label="预约管理" name="appointments" />
      <el-tab-pane label="放号规则设置" name="rules" />
    </el-tabs>

    <!-- ==================== Tab1: 排班管理（课程表式布局） ==================== -->
    <div v-show="activeTab === 'calendar'" class="calendar-layout">
      <!-- 顶部筛选和导航 -->
      <div class="calendar-header">
        <div class="header-left">
          <el-select v-model="selectedDeptId" placeholder="选择科室" clearable style="width: 160px">
            <el-option label="全部科室" :value="0" />
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
          <el-select v-model="filterDoctor" placeholder="筛选医生" clearable style="width: 140px">
            <el-option v-for="d in filteredDoctors" :key="d.id" :label="d.real_name || d.name" :value="d.id" />
          </el-select>
        </div>

        <div class="header-center">
          <div class="date-nav">
            <el-button size="small" circle @click="prevWeek">◀</el-button>
            <div class="date-range-display">
              <span class="week-label">{{ weekRangeText }}</span>
              <span class="today-hint" v-if="isCurrentWeek">今天</span>
            </div>
            <el-button size="small" circle @click="nextWeek">▶</el-button>
          </div>
          <el-button size="small" @click="goToday">回到今天</el-button>
        </div>

        <div class="header-right">
          <el-button type="primary" size="small" @click="openAdd">+ 生成排班</el-button>
          <el-button size="small" @click="batchStopVisible = true">批量停诊</el-button>
          <el-button size="small" @click="copyLastWeek">复制上周</el-button>
          <el-button size="small" @click="loadData" :loading="loading">刷新</el-button>
        </div>
      </div>

      <!-- 课程表式排班视图 -->
      <div class="schedule-grid-wrapper">
        <div class="schedule-grid">
          <!-- 左侧时间列 -->
          <div class="time-column">
            <div class="time-header-cell">时间</div>
            <div v-for="period in timePeriods" :key="period.key" class="time-cell">
              <span class="time-label">{{ period.label }}</span>
            </div>
          </div>

          <!-- 日期列 -->
          <div class="date-columns">
            <div v-for="day in weekDays" :key="day.date" :class="['date-column', { today: day.isToday }]">
              <div class="date-header">
                <div class="date-day">{{ day.label }}</div>
                <div class="date-full">{{ day.date }}</div>
              </div>
              <div v-for="period in timePeriods" :key="period.key" class="schedule-cell">
                <div v-if="getScheduleForDayPeriod(day.date, period.key).length > 0" class="schedule-card">
                  <div
                    v-for="s in getScheduleForDayPeriod(day.date, period.key)"
                    :key="s.id"
                    :class="['schedule-item', getScheduleClass(s)]"
                  >
                    <div class="schedule-doctor">{{ s.doctor_name }}</div>
                    <div class="schedule-dept">{{ s.dept_name }}</div>
                    <div class="schedule-status">
                      <span class="remaining">{{ s.remaining || (s.total - (s.booked || 0)) }}/{{ s.total }}</span>
                      <el-tag size="small" :type="getSlotTypeTag(s.slot_type)" class="slot-tag">{{ getSlotTypeText(s.slot_type) }}</el-tag>
                    </div>
                    <el-button size="small" text type="primary" class="edit-btn" @click="openEditBySchedule(s)">编辑</el-button>
                  </div>
                </div>
                <div v-else class="empty-cell">
                  <span class="empty-text">无排班</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部统计 -->
      <div class="calendar-footer">
        <div class="legend">
          <span class="legend-item"><span class="legend-color am"></span> 上午</span>
          <span class="legend-item"><span class="legend-color pm"></span> 下午</span>
          <span class="legend-item"><span class="legend-color full"></span> 已满</span>
          <span class="legend-item"><span class="legend-color rest"></span> 无排班</span>
        </div>
        <div class="stats">
          <span>当前科室：{{ selectedDeptName || '全部' }}</span>
          <span>医生数：{{ filteredDoctors.length }}</span>
          <span>本周总号源：{{ weekTotalSlots }}</span>
          <span>已预约：{{ weekBooked }}</span>
          <span>剩余：{{ weekRemaining }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== Tab2: 预约管理 ==================== -->
    <div v-show="activeTab === 'appointments'">
      <div class="filter-bar">
        <el-date-picker v-model="apptDateRange" type="daterange" range-separator="~" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:240px" />
        <el-select v-model="apptFilterDept" placeholder="科室" clearable style="width:140px">
          <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.name" />
        </el-select>
        <el-select v-model="apptFilterStatus" placeholder="状态" clearable style="width:120px">
          <el-option label="全部" value="" />
          <el-option label="待就诊" value="pending" />
          <el-option label="已就诊" value="visited" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="过号" value="missed" />
        </el-select>
        <el-input v-model="apptSearchPatient" placeholder="患者姓名" clearable style="width:140px" />
        <el-input v-model="apptSearchDoctor" placeholder="医生姓名" clearable style="width:140px" />
        <el-button type="primary" size="small" @click="loadAppointments">搜索</el-button>
        <el-button size="small" @click="resetApptFilters">重置</el-button>
        <div class="right-actions">
          <el-button size="small" @click="loadAppointments">刷新</el-button>
          <el-button size="small">导出Excel</el-button>
        </div>
      </div>

      <el-table :data="filteredAppointments" border size="small" v-loading="apptLoading">
        <el-table-column label="预约号" prop="id" width="80" />
        <el-table-column label="患者" prop="patient_name" width="100" />
        <el-table-column label="科室" prop="dept_name" width="110" />
        <el-table-column label="医生" prop="doctor_name" width="100" />
        <el-table-column label="日期" prop="appt_date" width="100" />
        <el-table-column label="时段" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.am_pm === 'am' ? '' : 'warning'">{{ row.am_pm === 'am' ? '上午' : '下午' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="号源类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getSlotTypeTag(row.slot_type)">{{ getSlotTypeText(row.slot_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="getApptStatusTag(row.status)">{{ getApptStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" text type="primary" @click="rescheduleAppt(row)">改约</el-button>
              <el-button size="small" text type="danger" @click="cancelAppt(row)">取消</el-button>
            </template>
            <el-button v-else size="small" text @click="viewAppt(row)">查看</el-button>
            <el-button v-if="row.status === 'cancelled'" size="small" text type="danger" @click="deleteAppt(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="apptPage"
          :page-size="10"
          :total="apptTotal"
          layout="total, prev, pager, next"
          @current-change="loadAppointments"
        />
        <div class="appt-stats">
          待就诊 {{ getApptCount('pending') }} | 已就诊 {{ getApptCount('visited') }} | 已取消 {{ getApptCount('cancelled') }} | 过号 {{ getApptCount('missed') }}
        </div>
      </div>
    </div>

    <!-- ==================== Tab3: 放号规则设置 ==================== -->
    <div v-show="activeTab === 'rules'" class="rules-section">
      <div class="config-card">
        <h3>基础规则</h3>
        <el-form :model="releaseRules" label-width="180px">
          <el-form-item label="放号提前天数">
            <el-input-number v-model="releaseRules.advance_days" :min="1" :max="30" /> 天（患者可预约未来X天的号源）
          </el-form-item>
          <el-form-item label="每日放号时间">
            <el-time-picker v-model="releaseRules.daily_time" format="HH:mm" value-format="HH:mm" placeholder="选择时间" />
          </el-form-item>
          <el-form-item label="每名患者限挂">
            <el-input-number v-model="releaseRules.max_per_patient" :min="1" :max="10" /> 个/天（防止囤号）
          </el-form-item>
          <el-form-item label="取消预约时限">
            <el-input-number v-model="releaseRules.cancel_hours" :min="0" :max="72" /> 小时（就诊前X小时可取消）
          </el-form-item>
          <el-form-item label="号源释放周期">
            <el-input-number v-model="releaseRules.release_minutes" :min="5" :max="120" /> 分钟（锁定后未支付自动释放）
          </el-form-item>
        </el-form>
      </div>

      <div class="config-card">
        <h3>默认号源配额（按科室）</h3>
        <el-table :data="deptQuotas" border size="small">
          <el-table-column label="科室" prop="dept_name" width="140" />
          <el-table-column label="普通号">
            <template #default="{ row }">
              <el-input-number v-model="row.normal" :min="1" :max="100" size="small" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column label="专家号">
            <template #default="{ row }">
              <el-input-number v-model="row.expert" :min="1" :max="100" size="small" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column label="知名专家号">
            <template #default="{ row }">
              <el-input-number v-model="row.famous" :min="1" :max="50" size="small" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="editQuota(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:16px; text-align:right">
          <el-button type="primary" @click="saveRules">保存</el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 编辑号源弹窗 ==================== -->
    <el-dialog v-model="editVisible" :title="editTitle" width="700px" top="5vh">
      <div class="edit-dialog">
        <div class="edit-header-info">
          {{ editDoctorName }} | {{ editDoctorTitle }} | {{ editDateStr }}
        </div>
        <div class="status-row">
          <span class="status-label">排班状态：</span>
          <el-radio-group v-model="editSchedule.status">
            <el-radio value="1">出诊</el-radio>
            <el-radio value="0">停诊</el-radio>
            <el-radio value="-1">休息</el-radio>
          </el-radio-group>
        </div>
        <div class="am-pm-row">
          <div class="slot-card">
            <h4>上午</h4>
            <el-form label-width="90px" size="small">
              <el-form-item label="号源类型">
                <el-select v-model="editSchedule.am.slot_type" style="width:100%">
                  <el-option label="普通号" value="normal" />
                  <el-option label="专家号" value="expert" />
                  <el-option label="知名专家号" value="famous" />
                </el-select>
              </el-form-item>
              <el-form-item label="总号源数">
                <el-input-number v-model="editSchedule.am.total" :min="0" :max="100" />
              </el-form-item>
              <el-form-item label="预留号源">
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">医生自留号</span>
                    <el-input-number v-model="editSchedule.am.reserved" :min="0" :max="editSchedule.am.total" style="width:100px" />
                  </div>
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">急诊预留号</span>
                    <el-input-number v-model="editSchedule.am.reserved_emergency" :min="0" :max="editSchedule.am.total" style="width:100px" />
                  </div>
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">VIP特需号</span>
                    <el-input-number v-model="editSchedule.am.reserved_vip" :min="0" :max="editSchedule.am.total" style="width:100px" />
                  </div>
                </div>
                <span style="font-size:12px;color:#999">（预留号不对外放号）</span>
              </el-form-item>
              <el-form-item label="已预约">
                <span>{{ editSchedule.am.booked }}</span>
              </el-form-item>
              <el-form-item label="剩余">
                <span :style="{ color: editSchedule.am.total - editSchedule.am.booked <= 0 ? '#E53935' : '' }">
                  {{ Math.max(editSchedule.am.total - editSchedule.am.booked, 0) }}
                </span>
                <span style="font-size:12px;color:#999;margin-left:8px">
                  （对外{{ Math.max(editSchedule.am.total - editSchedule.am.booked - (editSchedule.am.reserved || 0) - (editSchedule.am.reserved_emergency || 0) - (editSchedule.am.reserved_vip || 0), 0) }} + 预留{{ (editSchedule.am.reserved || 0) + (editSchedule.am.reserved_emergency || 0) + (editSchedule.am.reserved_vip || 0) }}）
                </span>
              </el-form-item>
              <el-form-item label="挂号费">
                <el-input v-model="editSchedule.am.fee" style="width:120px"><template #append>元</template></el-input>
              </el-form-item>
              <el-button size="small" @click="openSlotAdjust('am')">调整号源</el-button>
            </el-form>
          </div>
          <div class="slot-card">
            <h4>下午</h4>
            <el-form label-width="90px" size="small">
              <el-form-item label="号源类型">
                <el-select v-model="editSchedule.pm.slot_type" style="width:100%">
                  <el-option label="普通号" value="normal" />
                  <el-option label="专家号" value="expert" />
                  <el-option label="知名专家号" value="famous" />
                </el-select>
              </el-form-item>
              <el-form-item label="总号源数">
                <el-input-number v-model="editSchedule.pm.total" :min="0" :max="100" />
              </el-form-item>
              <el-form-item label="预留号源">
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">医生自留号</span>
                    <el-input-number v-model="editSchedule.pm.reserved" :min="0" :max="editSchedule.pm.total" style="width:100px" />
                  </div>
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">急诊预留号</span>
                    <el-input-number v-model="editSchedule.pm.reserved_emergency" :min="0" :max="editSchedule.pm.total" style="width:100px" />
                  </div>
                  <div style="display:flex;align-items:center;">
                    <span style="width:80px;font-size:12px;color:#666">VIP特需号</span>
                    <el-input-number v-model="editSchedule.pm.reserved_vip" :min="0" :max="editSchedule.pm.total" style="width:100px" />
                  </div>
                </div>
                <span style="font-size:12px;color:#999">（预留号不对外放号）</span>
              </el-form-item>
              <el-form-item label="已预约">
                <span>{{ editSchedule.pm.booked }}</span>
              </el-form-item>
              <el-form-item label="剩余">
                <span :style="{ color: editSchedule.pm.total - editSchedule.pm.booked <= 0 ? '#E53935' : '' }">
                  {{ Math.max(editSchedule.pm.total - editSchedule.pm.booked, 0) }}
                </span>
                <span style="font-size:12px;color:#999;margin-left:8px">
                  （对外{{ Math.max(editSchedule.pm.total - editSchedule.pm.booked - (editSchedule.pm.reserved || 0) - (editSchedule.pm.reserved_emergency || 0) - (editSchedule.pm.reserved_vip || 0), 0) }} + 预留{{ (editSchedule.pm.reserved || 0) + (editSchedule.pm.reserved_emergency || 0) + (editSchedule.pm.reserved_vip || 0) }}）
                </span>
              </el-form-item>
              <el-form-item label="挂号费">
                <el-input v-model="editSchedule.pm.fee" style="width:120px"><template #append>元</template></el-input>
              </el-form-item>
              <el-button size="small" @click="openSlotAdjust('pm')">调整号源</el-button>
            </el-form>
          </div>
        </div>
        <div v-if="editSchedule.status === '0'" style="margin-top:12px">
          <el-form label-width="130px">
            <el-form-item label="停诊原因（必填）">
              <el-input v-model="editSchedule.stop_reason" type="textarea" :rows="2" placeholder="请填写停诊原因" />
            </el-form-item>
            <el-form-item label=" ">
              <el-checkbox v-model="editSchedule.notify_patients">发送停诊通知短信给已预约患者</el-checkbox>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 调整号源子弹窗 ==================== -->
    <el-dialog v-model="slotAdjustVisible" :title="`调整号源 - ${slotAdjustPeriod === 'am' ? '上午' : '下午'}`" width="500px">
      <div class="adjust-dialog">
        <div class="adjust-info">
          当前总号源：{{ currentAdjustSlot.total }} | 已预约：{{ currentAdjustSlot.booked }} | 剩余：{{ Math.max(currentAdjustSlot.total - currentAdjustSlot.booked, 0) }}
        </div>
        <el-form label-width="80px" style="margin-top:12px">
          <el-form-item label="调整操作">
            <el-radio-group v-model="adjustAction">
              <el-radio value="add">增加号源</el-radio>
              <el-radio value="reduce">减少号源</el-radio>
              <el-radio value="close">关闭预约</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="调整数量" v-if="adjustAction !== 'close'">
            <el-input-number v-model="adjustCount" :min="1" :max="adjustAction === 'reduce' ? currentAdjustSlot.booked : 100" />
          </el-form-item>
          <el-form-item label="调整原因">
            <el-input v-model="adjustReason" type="textarea" :rows="2" placeholder="请输入调整原因" />
          </el-form-item>
          <el-form-item label="调整后">
            <span style="font-weight:700">
              总号源 {{ getAdjustedTotal() }} → 剩余 {{ getAdjustedTotal() - currentAdjustSlot.booked }}
            </span>
          </el-form-item>
          <el-alert
            v-if="adjustAction === 'reduce' && getAdjustedTotal() < currentAdjustSlot.booked"
            title="注意：减少号源时，如号源数少于已预约数，将锁定患者预约状态"
            type="warning" :closable="false" show-icon style="margin-bottom:8px"
          />
        </el-form>
      </div>
      <template #footer>
        <el-button @click="slotAdjustVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSlotAdjust">确认</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新增排班弹窗 ==================== -->
    <el-dialog v-model="addVisible" title="新增排班" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="科室">
          <el-select v-model="addForm.dept_name" @change="onAddDeptChange" style="width:100%">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="医生">
          <el-select v-model="addForm.doctor_id" style="width:100%">
            <el-option v-for="d in addDoctorOptions" :key="d.id" :label="d.real_name || d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="addForm.dateRange" type="daterange" range-separator="~" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="上午号源">
          <el-input-number v-model="addForm.am_total" :min="0" :max="100" /> 个
          <el-select v-model="addForm.am_type" style="width:130px;margin-left:8px">
            <el-option label="普通号" value="normal" />
            <el-option label="专家号" value="expert" />
            <el-option label="知名专家号" value="famous" />
          </el-select>
        </el-form-item>
        <el-form-item label="下午号源">
          <el-input-number v-model="addForm.pm_total" :min="0" :max="100" /> 个
          <el-select v-model="addForm.pm_type" style="width:130px;margin-left:8px">
            <el-option label="普通号" value="normal" />
            <el-option label="专家号" value="expert" />
            <el-option label="知名专家号" value="famous" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">生成排班</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 批量停诊弹窗 ==================== -->
    <el-dialog v-model="batchStopVisible" title="批量停诊" width="500px">
      <el-form label-width="80px">
        <el-form-item label="科室">
          <el-select v-model="batchStopForm.dept_name" style="width:100%">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="batchStopForm.dateRange" type="daterange" range-separator="~" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="停诊原因">
          <el-input v-model="batchStopForm.reason" type="textarea" :rows="2" placeholder="如：医生出差、节假日停诊等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchStopVisible = false">取消</el-button>
        <el-button type="danger" @click="submitBatchStop">确认停诊</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 改约弹窗 ==================== -->
    <el-dialog v-model="rescheduleVisible" title="改约" width="460px">
      <el-form label-width="80px">
        <el-form-item label="当前预约">
          {{ rescheduleRow?.doctor_name }} | {{ rescheduleRow?.appt_date }} | {{ rescheduleRow?.am_pm === 'am' ? '上午' : '下午' }}
        </el-form-item>
        <el-form-item label="新日期">
          <el-date-picker v-model="rescheduleForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="新时段">
          <el-radio-group v-model="rescheduleForm.am_pm">
            <el-radio value="am">上午</el-radio>
            <el-radio value="pm">下午</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescheduleVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReschedule">确认改约</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// ==================== 数据状态 ====================
const activeTab = ref('calendar')
const loading = ref(false)

// 基础数据
const depts = ref<any[]>([])
const allDoctors = ref<any[]>([])
const allSchedules = ref<any[]>([])
const allAppointments = ref<any[]>([])

const filterDoctor = ref<any>(null)

const selectedDeptId = ref<number>(0)

const weekOffset = ref(0)

// 弹窗控制
const editVisible = ref(false)
const addVisible = ref(false)
const batchStopVisible = ref(false)
const slotAdjustVisible = ref(false)
const rescheduleVisible = ref(false)

// 编辑号源
const editDoctorId = ref<number>(0)
const editDoctorName = ref('')
const editDoctorTitle = ref('')
const editDateStr = ref('')
const editSchedule = reactive({
  status: '1',
  am: { slot_type: 'normal', total: 20, booked: 0, fee: '10', reserved: 0, reserved_emergency: 0, reserved_vip: 0 },
  pm: { slot_type: 'normal', total: 15, booked: 0, fee: '10', reserved: 0, reserved_emergency: 0, reserved_vip: 0 },
  stop_reason: '',
  notify_patients: false,
})

// 调整号源
const slotAdjustPeriod = ref<'am' | 'pm'>('am')
const adjustAction = ref('add')
const adjustCount = ref(5)
const adjustReason = ref('')

// 新增排班
const addForm = reactive({
  dept_name: '',
  doctor_id: null as number | null,
  dateRange: [] as string[],
  am_total: 20,
  pm_total: 15,
  am_type: 'normal',
  pm_type: 'normal',
})

// 批量停诊
const batchStopForm = reactive({ dept_name: '', dateRange: [] as string[], reason: '' })

// 预约管理
const apptLoading = ref(false)
const apptPage = ref(1)
const apptTotal = ref(0)
const apptDateRange = ref<string[]>([])
const apptFilterDept = ref('')
const apptFilterStatus = ref('')
const apptSearchPatient = ref('')
const apptSearchDoctor = ref('')

// 改约
const rescheduleRow = ref<any>(null)
const rescheduleForm = reactive({ date: '', am_pm: 'am' })

// 放号规则
const releaseRules = reactive({
  advance_days: 7,
  daily_time: '08:00',
  max_per_patient: 1,
  cancel_hours: 2,
  release_minutes: 30,
})
const deptQuotas = ref<any[]>([])

// ==================== 计算属性 ====================

const timePeriods = [
  { key: 'morning', label: '08:00-12:00' },
  { key: 'afternoon', label: '14:00-18:00' },
]

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value) return ''
  const d = depts.value.find((d: any) => d.id === selectedDeptId.value)
  return d ? d.name : ''
})

const filteredDoctors = computed(() => {
  let docs = allDoctors.value
  if (selectedDeptId.value) {
    const dept = depts.value.find((d: any) => d.id === selectedDeptId.value)
    if (dept) docs = docs.filter((d: any) => d.dept_name === dept.name)
  }
  return docs
})

const weekStart = computed(() => {
  const now = new Date()
  now.setDate(now.getDate() - now.getDay() + 1 + weekOffset.value * 7)
  now.setHours(0, 0, 0, 0)
  return now
})

const weekDays = computed(() => {
  const days = []
  const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const start = new Date(weekStart.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    days.push({
      date: ds,
      label: weekDayNames[i],
      short: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: ds === today.toISOString().split('T')[0],
    })
  }
  return days
})

const weekRangeText = computed(() => {
  if (!weekDays.value.length) return ''
  const start = weekDays.value[0].date
  const end = weekDays.value[6].date
  return `${start} ~ ${end}`
})

const isCurrentWeek = computed(() => {
  const now = new Date()
  const todayWeekStart = new Date(now)
  todayWeekStart.setDate(todayWeekStart.getDate() - todayWeekStart.getDay() + 1)
  todayWeekStart.setHours(0, 0, 0, 0)
  return weekStart.value.getTime() === todayWeekStart.getTime()
})

const weekTotalSlots = computed(() => {
  let total = 0
  allSchedules.value.forEach((s: any) => {
    const isInWeek = weekDays.value.some((d: any) => d.date === s.schedule_date)
    if (isInWeek) total += s.total || 0
  })
  return total
})

const weekBooked = computed(() => {
  let total = 0
  allSchedules.value.forEach((s: any) => {
    const isInWeek = weekDays.value.some((d: any) => d.date === s.schedule_date)
    if (isInWeek) total += s.booked || (s.total - (s.remaining || 0))
  })
  return total
})

const weekRemaining = computed(() => weekTotalSlots.value - weekBooked.value)

const addDoctorOptions = computed(() => {
  if (!addForm.dept_name) return []
  return allDoctors.value.filter((d: any) => d.dept_name === addForm.dept_name)
})

const currentAdjustSlot = computed(() => {
  const period = slotAdjustPeriod.value
  return editSchedule[period]
})

const filteredAppointments = computed(() => {
  let list = allAppointments.value
  if (apptFilterDept.value) list = list.filter((a: any) => a.dept_name === apptFilterDept.value)
  if (apptFilterStatus.value) list = list.filter((a: any) => a.status === apptFilterStatus.value)
  if (apptSearchPatient.value) list = list.filter((a: any) => a.patient_name?.includes(apptSearchPatient.value))
  if (apptSearchDoctor.value) list = list.filter((a: any) => a.doctor_name?.includes(apptSearchDoctor.value))
  return list
})

// ==================== 辅助函数 ====================

const getScheduleForDayPeriod = (date: string, period: string) => {
  // 将数据库返回的 ISO 日期（如 "2026-06-22T16:00:00.000Z"）转换为纯日期字符串（"2026-06-22"）
  const normalizeDate = (isoDate: string) => {
    if (!isoDate) return ''
    // 如果是 ISO 格式，提取日期部分
    if (isoDate.includes('T')) {
      return isoDate.split('T')[0]
    }
    return isoDate
  }
  
  const schedules = allSchedules.value.filter((s: any) => normalizeDate(s.schedule_date) === date)
  if (period === 'morning') {
    return schedules.filter((s: any) => s.am_pm === 'am')
  } else {
    return schedules.filter((s: any) => s.am_pm === 'pm')
  }
}

const getScheduleClass = (schedule: any) => {
  const remaining = schedule.remaining || (schedule.total - (schedule.booked || 0))
  if (remaining <= 0) return 'full'
  return schedule.am_pm === 'am' ? 'am' : 'pm'
}

const getSlotTypeTag = (type: string) => {
  if (type === 'famous') return 'warning'
  if (type === 'expert') return ''
  return 'info'
}

const getSlotTypeText = (type: string) => {
  if (type === 'famous') return '知名专家号'
  if (type === 'expert') return '专家号'
  return '普通号'
}

const getApptStatusTag = (status: string) => {
  const map: Record<string, string> = { pending: '', visited: 'success', cancelled: 'info', missed: 'danger' }
  return map[status] || 'info'
}

const getApptStatusText = (status: string) => {
  const map: Record<string, string> = { pending: '待就诊', visited: '已就诊', cancelled: '已取消', missed: '过号' }
  return map[status] || status
}

const getApptCount = (status: string) => allAppointments.value.filter((a: any) => a.status === status).length

const getAdjustedTotal = () => {
  const cur = currentAdjustSlot.value.total
  if (adjustAction.value === 'add') return cur + adjustCount.value
  if (adjustAction.value === 'reduce') return Math.max(cur - adjustCount.value, 0)
  return 0
}

const editTitle = computed(() => `编辑排班 - ${editDoctorName.value}`)

// ==================== 数据加载 ====================

const loadData = async () => {
  loading.value = true
  try {
    const [sRes, dRes, uRes] = await Promise.all([
      axios.get('/api/admin/schedules'),
      axios.get('/api/appointment/depts'),
      axios.get('/api/admin/users'),
    ])
    allSchedules.value = (sRes.data || []).map((s: any) => ({
      ...s,
      am_pm: s.am_pm === '上午' ? 'am' : s.am_pm === '下午' ? 'pm' : s.am_pm,
      remaining: s.remaining ?? (s.total - (s.booked || 0)),
      slot_type: s.slot_type || 'normal',
    }))
    depts.value = dRes.data || []
    allDoctors.value = (uRes.data || []).filter((u: any) => u.role === 'doctor')
  } catch (error) {
    ElMessage.error('加载排班数据失败')
    console.error('加载排班数据失败:', error)
  }
  if (!selectedDeptId.value && depts.value.length > 0) {
    selectedDeptId.value = depts.value[0].id
  }
  loading.value = false
}

const loadAppointments = async () => {
  apptLoading.value = true
  try {
    const res = await axios.get('/api/admin/appointments', {
      params: {
        page: apptPage.value,
        dept: apptFilterDept.value || undefined,
        status: apptFilterStatus.value || undefined,
        patient: apptSearchPatient.value || undefined,
        doctor: apptSearchDoctor.value || undefined,
      },
    })
    allAppointments.value = res.data.rows || res.data || []
    apptTotal.value = res.data.total || allAppointments.value.length
  } catch {
    allAppointments.value = [
      { id: 1, patient_name: '赵伟', dept_name: '呼吸内科', doctor_name: '张医生', appt_date: '2026-06-17', am_pm: 'am', slot_type: 'expert', status: 'pending' },
      { id: 2, patient_name: '李四', dept_name: '呼吸内科', doctor_name: '张医生', appt_date: '2026-06-17', am_pm: 'pm', slot_type: 'normal', status: 'visited' },
      { id: 3, patient_name: '赵六', dept_name: '心内科', doctor_name: '李医生', appt_date: '2026-06-18', am_pm: 'am', slot_type: 'normal', status: 'pending' },
      { id: 4, patient_name: '张三', dept_name: '心内科', doctor_name: '李医生', appt_date: '2026-06-18', am_pm: 'am', slot_type: 'normal', status: 'cancelled' },
      { id: 5, patient_name: '钱七', dept_name: '儿科', doctor_name: '赵医生', appt_date: '2026-06-19', am_pm: 'pm', slot_type: 'famous', status: 'missed' },
    ]
    apptTotal.value = allAppointments.value.length
  }
  apptLoading.value = false
}

const loadRules = async () => {
  try {
    const res = await axios.get('/api/admin/release-rules')
    if (res.data) {
      Object.assign(releaseRules, res.data)
    }
  } catch { /* use defaults */ }
  try {
    const res = await axios.get('/api/admin/dept-quotas')
    if (res.data?.length) {
      deptQuotas.value = res.data
    }
  } catch {
    deptQuotas.value = depts.value.map((d: any) => ({
      dept_id: d.id, dept_name: d.name, normal: 25, expert: 20, famous: 8,
    }))
  }
}

const onTabChange = (tab: string) => {
  if (tab === 'appointments') loadAppointments()
  if (tab === 'rules') loadRules()
}

// ==================== 日期导航 ====================

const prevWeek = () => { weekOffset.value-- }
const nextWeek = () => { weekOffset.value++ }
const goToday = () => { weekOffset.value = 0 }

// ==================== 编辑号源 ====================

const openEditBySchedule = (schedule: any) => {
  editDoctorId.value = schedule.doctor_id
  editDoctorName.value = schedule.doctor_name
  editDoctorTitle.value = schedule.title || '主治医师'
  editDateStr.value = schedule.schedule_date

  const amData = allSchedules.value.find((s: any) => s.doctor_id === schedule.doctor_id && s.schedule_date === schedule.schedule_date && s.am_pm === 'am')
  const pmData = allSchedules.value.find((s: any) => s.doctor_id === schedule.doctor_id && s.schedule_date === schedule.schedule_date && s.am_pm === 'pm')

  editSchedule.status = amData || pmData ? '1' : '-1'
  editSchedule.am = { slot_type: amData?.slot_type || 'normal', total: amData?.total || 20, booked: amData?.booked || 0, fee: '10', reserved: amData?.reserved || 0, reserved_emergency: amData?.reserved_emergency || 0, reserved_vip: amData?.reserved_vip || 0 }
  editSchedule.pm = { slot_type: pmData?.slot_type || 'normal', total: pmData?.total || 15, booked: pmData?.booked || 0, fee: '10', reserved: pmData?.reserved || 0, reserved_emergency: pmData?.reserved_emergency || 0, reserved_vip: pmData?.reserved_vip || 0 }
  editSchedule.stop_reason = ''
  editSchedule.notify_patients = false
  editVisible.value = true
}

const submitEdit = async () => {
  try {
    await axios.put(`/api/admin/schedules/batch`, {
      doctor_id: editDoctorId.value,
      schedule_date: editDateStr.value,
      status: editSchedule.status,
      am: editSchedule.am,
      pm: editSchedule.pm,
      stop_reason: editSchedule.stop_reason,
      notify_patients: editSchedule.notify_patients,
    })
    ElMessage.success('排班已更新')
    editVisible.value = false
    loadData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败，请重试')
  }
}

const openSlotAdjust = (period: 'am' | 'pm') => {
  slotAdjustPeriod.value = period
  adjustAction.value = 'add'
  adjustCount.value = 5
  adjustReason.value = ''
  slotAdjustVisible.value = true
}

const submitSlotAdjust = () => {
  const slot = editSchedule[slotAdjustPeriod.value]
  if (adjustAction.value === 'add') {
    slot.total += adjustCount.value
  } else if (adjustAction.value === 'reduce') {
    slot.total = Math.max(slot.total - adjustCount.value, 0)
  } else {
    slot.total = 0
  }
  ElMessage.success('号源已调整')
  slotAdjustVisible.value = false
}

// ==================== 新增排班 ====================

const openAdd = () => {
  addForm.dept_name = ''
  addForm.doctor_id = null
  addForm.dateRange = []
  addForm.am_total = 20
  addForm.pm_total = 15
  addForm.am_type = 'normal'
  addForm.pm_type = 'normal'
  addVisible.value = true
}

const onAddDeptChange = () => { addForm.doctor_id = null }

const submitAdd = async () => {
  if (!addForm.dept_name || !addForm.doctor_id || !addForm.dateRange.length) {
    ElMessage.warning('请填写完整信息'); return
  }
  try {
    await axios.post('/api/admin/schedules/batch-generate', {
      doctor_id: addForm.doctor_id,
      start_date: addForm.dateRange[0],
      end_date: addForm.dateRange[1],
      am_total: addForm.am_total,
      pm_total: addForm.pm_total,
      am_type: addForm.am_type,
      pm_type: addForm.pm_type,
    })
    ElMessage.success('排班已生成')
    addVisible.value = false
    loadData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '生成失败，请重试')
  }
}

// ==================== 批量停诊 ====================

const submitBatchStop = async () => {
  if (!batchStopForm.dept_name || !batchStopForm.dateRange.length) {
    ElMessage.warning('请选择科室和日期范围'); return
  }
  try {
    await axios.post('/api/admin/schedules/batch-stop', {
      dept_name: batchStopForm.dept_name,
      start_date: batchStopForm.dateRange[0],
      end_date: batchStopForm.dateRange[1],
      reason: batchStopForm.reason,
    })
    ElMessage.success('批量停诊已生效')
    batchStopVisible.value = false
    batchStopForm.dept_name = ''
    batchStopForm.dateRange = []
    batchStopForm.reason = ''
    loadData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '停诊失败，请重试')
  }
}

// ==================== 复制上周排班 ====================

const copyLastWeek = async () => {
  try {
    await axios.post('/api/admin/schedules/copy-last-week')
    ElMessage.success('已复制上周排班')
    loadData()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '复制失败，请重试')
  }
}

// ==================== 预约管理 ====================

const resetApptFilters = () => {
  apptFilterDept.value = ''
  apptFilterStatus.value = ''
  apptSearchPatient.value = ''
  apptSearchDoctor.value = ''
  apptDateRange.value = []
  loadAppointments()
}

const rescheduleAppt = (row: any) => {
  rescheduleRow.value = row
  rescheduleForm.date = row.appt_date
  rescheduleForm.am_pm = row.am_pm
  rescheduleVisible.value = true
}

const submitReschedule = async () => {
  try {
    await axios.put(`/api/admin/appointments/${rescheduleRow.value.id}`, {
      new_date: rescheduleForm.date,
      new_am_pm: rescheduleForm.am_pm,
    })
    ElMessage.success('已改约')
    rescheduleVisible.value = false
    loadAppointments()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '改约失败，请重试')
  }
}

const cancelAppt = async (row: any) => {
  await ElMessageBox.confirm(`确认取消患者「${row.patient_name}」的预约？`, '提示', { type: 'warning' })
  try {
    await axios.put(`/api/admin/appointments/${row.id}/cancel`)
    row.status = 'cancelled'
    ElMessage.success('已取消')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '取消失败，请重试')
  }
}

const viewAppt = (row: any) => {
  ElMessage.info(`预约详情：${row.patient_name} - ${row.dept_name} - ${row.doctor_name}`)
}

const deleteAppt = async (row: any) => {
  await ElMessageBox.confirm('确认删除此预约记录？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/appointments/${row.id}`)
    allAppointments.value = allAppointments.value.filter((a: any) => a.id !== row.id)
    ElMessage.success('已删除')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '删除失败，请重试')
  }
}

// ==================== 放号规则 ====================

const editQuota = (row: any) => {
  ElMessage.info(`编辑 ${row.dept_name} 配额`)
}

const saveRules = async () => {
  try {
    await axios.put('/api/admin/release-rules', releaseRules)
    await axios.put('/api/admin/dept-quotas', deptQuotas.value)
    ElMessage.success('放号规则已保存')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败，请重试')
  }
}

// ==================== 初始化与定时刷新 ====================
let refreshTimer: any = null

onMounted(() => {
  loadData()
  refreshTimer = setInterval(() => {
    if (activeTab.value === 'calendar') {
      loadData()
    }
  }, 60000) // 每60秒自动刷新
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.manage-page { padding: 16px 20px; }

/* 课程表式布局 */
.calendar-layout { display: flex; flex-direction: column; gap: 16px; }

/* 顶部筛选和导航 */
.calendar-header {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255, 255, 255, 0.95); padding: 12px 20px;
  border-radius: 12px; box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  border: 1px solid rgba(66, 153, 225, 0.1);
  flex-wrap: wrap; gap: 12px;
}

.header-left { display: flex; gap: 8px; }
.header-center { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; gap: 8px; }

.date-nav { display: flex; align-items: center; gap: 4px; }
.date-range-display {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; font-size: 14px; color: #1E293B;
}
.week-label { font-weight: 600; }
.today-hint {
  background: #4299E1; color: #fff; font-size: 11px;
  padding: 2px 8px; border-radius: 10px; font-weight: 500;
}

/* 课程表网格 */
.schedule-grid-wrapper {
  overflow-x: auto; background: rgba(255, 255, 255, 0.95);
  border-radius: 12px; box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
}

.schedule-grid { display: flex; min-width: 900px; }

/* 时间列 */
.time-column {
  width: 120px; flex-shrink: 0; border-right: 2px solid #EBF8FF;
}

.time-header-cell {
  height: 60px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  font-weight: 600; color: #4299E1; font-size: 14px;
  border-bottom: 2px solid rgba(66, 153, 225, 0.1);
}

.time-cell {
  height: 320px; display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  background: #FAFBFC;
}

.time-label {
  font-size: 12px; color: #64748B; font-weight: 500;
}

/* 日期列 */
.date-columns { display: flex; flex: 1; }

.date-column {
  flex: 1; min-width: 150px; border-right: 1px solid rgba(66, 153, 225, 0.08);
}

.date-column:last-child { border-right: none; }
.date-column.today { background: rgba(219, 234, 254, 0.3); }

.date-header {
  height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-bottom: 2px solid rgba(66, 153, 225, 0.1);
}

.date-header .date-day {
  font-weight: 600; color: #4299E1; font-size: 14px;
}

.date-header .date-full {
  font-size: 11px; color: #64748B; margin-top: 2px;
}

.date-column.today .date-header { background: #DBEAFE; }
.date-column.today .date-header .date-day { color: #3182CE; }

/* 排班单元格 */
.schedule-cell {
  height: 320px; padding: 6px; border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
}

.empty-cell {
  display: flex; align-items: center; justify-content: center; height: 100%;
}

.empty-text { font-size: 12px; color: #94A3B8; }

.schedule-card { display: flex; flex-direction: column; gap: 4px; }

.schedule-item {
  padding: 6px 8px; border-radius: 8px;
  background: rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.15);
  transition: all 0.2s; cursor: pointer;
}

.schedule-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
}

.schedule-item.am {
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.12) 0%, rgba(49, 130, 206, 0.06) 100%);
  border-color: rgba(66, 153, 225, 0.25);
}

.schedule-item.pm {
  background: linear-gradient(135deg, rgba(214, 158, 46, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%);
  border-color: rgba(214, 158, 46, 0.25);
}

.schedule-item.full {
  background: linear-gradient(135deg, rgba(252, 129, 129, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%);
  border-color: rgba(252, 129, 129, 0.3);
}

.schedule-doctor { font-weight: 600; font-size: 12px; color: #1E293B; }
.schedule-dept { font-size: 10px; color: #64748B; }

.schedule-status {
  display: flex; align-items: center; gap: 4px; margin-top: 2px;
}

.schedule-status .remaining {
  font-weight: 700; font-size: 13px; color: #4299E1;
}

.schedule-item.full .remaining { color: #FC8181; }

.slot-tag { transform: scale(0.75); transform-origin: left; }

.edit-btn {
  font-size: 10px; padding: 2px 4px;
  margin-top: 2px; align-self: flex-end;
}

/* 底部统计 */
.calendar-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: rgba(255, 255, 255, 0.95);
  border-radius: 10px; border: 1px solid rgba(66, 153, 225, 0.1);
  flex-wrap: wrap; gap: 10px; font-size: 12px;
}

.legend { display: flex; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 4px; color: #64748B; }
.legend-color { width: 10px; height: 10px; border-radius: 2px; }
.legend-color.am { background: #4299E1; }
.legend-color.pm { background: #D69E2E; }
.legend-color.full { background: #FC8181; }
.legend-color.rest { background: #CBD5E1; }

.stats { display: flex; gap: 16px; color: #64748B; }

.schedule-tabs { margin-bottom: 12px; }
.schedule-tabs :deep(.el-tabs__header) { margin-bottom: 0; }
.schedule-tabs :deep(.el-tabs__nav-wrap::after) { background: rgba(66, 153, 225, 0.1); }
.schedule-tabs :deep(.el-tabs__active-bar) { background: #4299E1; }
.schedule-tabs :deep(.el-tab-item.is-active) { color: #4299E1; }

/* 筛选区 */
.filter-bar {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.95); padding: 12px 16px; border-radius: 10px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
  border: 1px solid rgba(66, 153, 225, 0.1);
}
.right-actions { margin-left: auto; display: flex; gap: 6px; }

/* 分页 */
.pagination-wrap {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px;
}
.appt-stats { font-size: 12px; color: #64748B; }

/* 编辑弹窗 */
.edit-header-info { color: #64748B; margin-bottom: 12px; font-size: 13px; }
.status-row { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.status-label { font-weight: 600; color: #1E293B; }
.am-pm-row { display: flex; gap: 16px; }
.slot-card {
  flex: 1; border: 1px solid rgba(66, 153, 225, 0.15); border-radius: 10px;
  padding: 12px 16px; background: rgba(248, 250, 252, 0.8);
}
.slot-card h4 { margin: 0 0 8px 0; font-size: 15px; color: #1E293B; }

/* 调整弹窗 */
.adjust-info { padding: 8px 12px; background: rgba(66, 153, 225, 0.08); border-radius: 8px; font-size: 13px; }

/* 分页 */
.pagination-wrap {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px;
}
.appt-stats { font-size: 12px; color: #64748B; }

/* 规则 */
.rules-section { display: flex; flex-direction: column; gap: 16px; }
.config-card {
  background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
  border: 1px solid rgba(66, 153, 225, 0.1);
}
.config-card h3 { margin: 0 0 16px 0; font-size: 16px; color: #1E293B; }

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
  transition: all 0.2s ease;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
  transform: translateY(-1px);
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

:deep(.el-table__header-wrapper) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
}

:deep(.el-table th) {
  background: transparent;
  color: #4299E1;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid rgba(66, 153, 225, 0.2);
  padding: 14px 12px;
}

:deep(.el-table td) {
  color: #4A5568;
  font-size: 13px;
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  padding: 14px 12px;
}

:deep(.el-table tr:hover > td) {
  background: rgba(66, 153, 225, 0.06);
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border-bottom: 1px solid rgba(66, 153, 225, 0.15);
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #1E293B;
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.15);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}
</style>
