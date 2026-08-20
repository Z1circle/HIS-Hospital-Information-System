<template>
  <div class="workbench">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="doctor-info">
        <el-icon :size="20"><UserFilled /></el-icon>
        <span class="doctor-name">{{ currentUser?.real_name }}（{{ currentUser?.department_name || '未分配科室' }} - {{ currentUser?.title || '医师' }}）</span>
      </div>
      <div class="top-actions">
        <el-badge :value="rejectedCount" :hidden="rejectedCount === 0">
          <el-button :icon="Bell" circle @click="msgVisible = true" />
        </el-badge>
        <el-dropdown trigger="click" @command="setStatus">
          <el-tag :type="(currentStatusOpt.tagType as any)" size="small" style="cursor:pointer">
            {{ currentStatusOpt.label }} <el-icon style="margin-left:2px"><ArrowDown /></el-icon>
          </el-tag>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="opt in statusOptions" :key="opt.value" :command="opt.value">
                <el-tag :type="(opt.tagType as any)" size="small" style="margin-right:6px">{{ opt.label }}</el-tag>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button v-if="canSwitchInpatient" size="small" @click="$router.push('/doctor/inpatient')">切换住院工作台</el-button>
        <el-button v-if="currentUser?.is_chief_physician" size="small" type="primary" @click="$router.push('/doctor/chief-hotwords')">热词管理</el-button>
        <el-button size="small" @click="openProfile">个人中心</el-button>
        <el-button size="small" type="danger" @click="showLogoutDialog = true">退出</el-button>
      </div>
    </div>

    <div class="main-layout">
      <!-- 最左侧导航栏 -->
      <div class="sidebar">
        <div class="sidebar-menu">
          <div 
            :class="['menu-item', activeSidebarTab === 'queue' ? 'active' : '']"
            @click="activeSidebarTab = 'queue'"
          >
            <el-icon><List /></el-icon>
            <span>候诊队列</span>
          </div>
          <div 
            :class="['menu-item', activeSidebarTab === 'search' ? 'active' : '']"
            @click="activeSidebarTab = 'search'"
          >
            <el-icon><Search /></el-icon>
            <span>患者检索</span>
          </div>
          <div 
            :class="['menu-item', activeSidebarTab === 'favorites' ? 'active' : '']"
            @click="activeSidebarTab = 'favorites'"
          >
            <el-icon><Star /></el-icon>
            <span>我的关注</span>
          </div>
          <div 
            :class="['menu-item', activeSidebarTab === 'tools' ? 'active' : '']"
            @click="activeSidebarTab = 'tools'"
          >
            <el-icon><Tools /></el-icon>
            <span>常用工具</span>
          </div>
        </div>
      </div>

      <!-- 主工作区 -->
      <div class="work-main">
        <!-- 左中列：费用清单 + 患者信息 + 队列 -->
        <div class="left-column">
          <!-- 费用总计 - 最上面 -->
          <div class="fee-panel" :class="{ 'panel-empty-state': !currentPatient }">
            <div class="panel-header">
              <span>💰 费用清单</span>
            </div>
            <div class="panel-body">
              <div v-if="currentPatient">
                <div class="fee-total">¥ {{ feeInfo.total }}</div>
                <div class="fee-split">
                  <div>医保支付预估：<span class="fee-insurance">¥ {{ feeInfo.insurance }}</span></div>
                  <div>个人支付预估：<span class="fee-self">¥ {{ feeInfo.self }}</span></div>
                </div>
                <div class="fee-detail-title">费用明细</div>
                <div class="fee-detail-list">
                  <div v-for="(item, i) in currentOrders.slice(0, 5)" :key="i" class="fee-detail-row">
                    <span>{{ item.item_name }}</span>
                    <span>¥{{ (item.price * item.quantity).toFixed(2) }}</span>
                  </div>
                  <div v-if="currentOrders.length > 5" class="fee-more">...共{{ currentOrders.length }}项</div>
                </div>
              </div>
              <div v-else class="panel-empty">
                <el-empty description="请选择患者查看费用" />
              </div>
            </div>
          </div>
        
          <!-- 当前患者详细信息 - 中间 -->
          <div class="patient-detail-panel" :class="{ 'panel-empty-state': !currentPatient }">
            <div class="panel-header">
              <span>👤 当前患者详细信息</span>
              <div class="panel-actions" v-if="currentPatient">
                <el-button type="primary" size="small" @click="handleReceiveConsultation" :disabled="currentPatient.status === 'in_progress' || currentPatient.status === 'completed'">接诊</el-button>
                <el-button size="small" @click="admitVisible = true">办理入院</el-button>
              </div>
            </div>
            <div class="panel-body">
              <div v-if="currentPatient">
                <el-descriptions :column="2" border size="small" class="patient-detail-table">
                  <el-descriptions-item label="姓名">{{ currentPatient.name }}</el-descriptions-item>
                  <el-descriptions-item label="性别/年龄">{{ currentPatient.gender }} / {{ currentPatient.age }}岁</el-descriptions-item>
                  <el-descriptions-item label="医保类型">{{ currentPatient.insurance_type }}</el-descriptions-item>
                  <el-descriptions-item label="手机号">{{ currentPatient.phone || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="过敏史" v-if="currentPatient.allergy">
                    <el-tag type="danger" size="small">{{ currentPatient.allergy }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="慢性病" v-if="currentPatient.chronic_disease">
                    <el-tag type="warning" size="small">{{ currentPatient.chronic_disease }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else class="panel-empty">
                <el-empty description="请从队列中选择患者" />
              </div>
            </div>
          </div>
          
          <!-- 患者队列 -->
          <div class="queue-panel">
            <div class="panel-header">
              <span>📋 候诊队列</span>
            </div>
            
            <div class="panel-actions">
              <el-button size="small" type="primary" @click="loadTodayPatients(String(currentUser?.doctor_id || currentUser?.id || '1'))">F2刷新</el-button>
              <el-button size="small" @click="callNext(parseInt(String(currentUser?.id || '2')))">下一位</el-button>
              <el-button size="small" @click="skipCurrent">过号</el-button>
              <el-button size="small" type="primary" @click="quickRegVisible = true">快速登记</el-button>
            </div>
            
            <div class="panel-body">
              <div class="panel-search">
                <el-input v-model="searchText" placeholder="姓名/手机号" prefix-icon="Search" size="small" clearable />
              </div>
              
              <div v-if="filteredPatients.length === 0" class="empty-queue">
                <el-empty description="暂无候诊人员" />
              </div>
              
              <div v-else class="queue-table">
                <div class="queue-table-header">
                  <span class="queue-th">序号</span>
                  <span class="queue-th">姓名</span>
                  <span class="queue-th">性别</span>
                  <span class="queue-th">年龄</span>
                  <span class="queue-th">类型</span>
                  <span class="queue-th">状态</span>
                </div>
                <div 
                  v-for="p in paginatedPatients" 
                  :key="p.reg_id"
                  :class="['queue-table-row', currentPatient?.reg_id === p.reg_id ? 'active' : '']"
                  @click="selectPatient(p)"
                >
                  <span class="queue-td">{{ p.seq }}</span>
                  <span class="queue-td">{{ p.name }}</span>
                  <span class="queue-td">{{ p.gender }}</span>
                  <span class="queue-td">{{ p.age }}岁</span>
                  <span class="queue-td">{{ p.insurance_type }}</span>
                  <span class="queue-td">
                    <el-tag :type="statusTagType(p.status)" size="mini">{{ statusLabel(p.status) }}</el-tag>
                  </span>
                </div>
              </div>
              
              <div v-if="filteredPatients.length > 0" class="expand-pagination">
                <el-pagination
                  v-model:current-page="queuePage"
                  :page-size="queuePageSize"
                  :total="filteredPatients.length"
                  layout="prev, pager, next"
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 中间列：始终显示病历书写模块 -->
        <div class="middle-column">
          <!-- 辅助功能区域：根据导航切换显示 -->
          <div v-if="activeSidebarTab === 'search' || activeSidebarTab === 'favorites' || activeSidebarTab === 'tools'" class="auxiliary-panel">
            <PatientSearch v-if="activeSidebarTab === 'search'" @back="activeSidebarTab = 'queue'" />
            <MyFavorites v-else-if="activeSidebarTab === 'favorites'" @back="activeSidebarTab = 'queue'" />
            <CommonTools v-else-if="activeSidebarTab === 'tools'" @back="activeSidebarTab = 'queue'" />
          </div>
          
          <!-- 病历书写模块：始终显示 -->
          <div v-if="!currentPatient" class="no-patient">
            <el-empty description="请从左侧选择患者" />
          </div>
          <!-- 功能导航栏 -->
          <div class="work-nav-bar">
            <div
              v-for="tab in navTabs"
              :key="tab.name"
              :class="['nav-item', activeTab === tab.name ? 'active' : '']"
              @click="scrollToSection(tab.name)"
            >{{ tab.label }}</div>
          </div>

          <!-- 功能区域（中间可滚动，所有栏目平铺） -->
          <div class="work-content-scroll" ref="workContentRef" @scroll="onWorkScroll">
              <!-- Section1: 病历书写 -->
              <section id="section-record" class="work-section">
                <div class="section-header">
                  <el-icon color="#1E88E5"><Document /></el-icon>
                  <span>病历书写</span>
                </div>
                <div class="section-body">
                  <div class="form-row">
                    <label class="field-label req">主诉</label>
                    <SmartInput v-model="record.chief" type="textarea" :rows="2" placeholder="请输入主诉（支持拼音首字母检索）" field-type="chief" />
                  </div>
                  <div class="form-row">
                    <label class="field-label req">现病史</label>
                    <SmartInput v-model="record.history" type="textarea" :rows="4" placeholder="请输入现病史（支持拼音首字母检索）" field-type="history" />
                  </div>
                  <div class="form-row">
                    <label class="field-label">既往史</label>
                    <SmartInput v-model="record.past" type="textarea" :rows="2" placeholder="既往史（支持拼音首字母检索）" field-type="past" />
                  </div>
                  <div class="form-row">
                    <label class="field-label">体格检查</label>
                    <el-input v-model="record.physical" type="textarea" :rows="2" placeholder="T:℃ P:次/分 R:次/分 BP:mmHg" />
                  </div>
                  <div class="form-row">
                    <label class="field-label">过敏史</label>
                    <el-input v-model="record.allergy" placeholder="过敏史" />
                  </div>
                </div>
              </section>

              <!-- Section2: 医嘱录入 -->
              <section id="section-order" class="work-section">
                <div class="section-header">
                  <el-icon color="#43A047"><FirstAidKit /></el-icon>
                  <span>医嘱录入</span>
                </div>
                <div class="section-body order-tab-content">
                  <div class="drug-search-panel">
                    <el-tabs v-model="orderType" class="order-type-tabs" type="card">
                      <el-tab-pane label="西药" name="western" />
                      <el-tab-pane label="中药" name="chinese" />
                      <el-tab-pane label="治疗" name="treatment" />
                    </el-tabs>
                    <div class="drug-search-row">
                      <el-input
                        v-model="drugKeyword"
                        :placeholder="isTreatment ? '搜索项目名称' : isChinese ? '搜索中药名称或功效' : '搜索药品名称'"
                        @input="onDrugSearch" clearable style="flex:1"
                      />
                      <el-select v-if="!isTreatment" v-model="drugCategoryFilter" placeholder="分类" style="width:110px" clearable @change="onDrugSearch">
                        <el-option v-for="cat in drugCategories" :key="cat" :label="cat" :value="cat" />
                      </el-select>
                      <el-select v-if="!isTreatment" v-model="drugSortMode" style="width:90px" @change="onDrugSearch">
                        <el-option label="按分类" value="category_sort" />
                        <el-option label="按名称" value="alpha" />
                        <el-option label="按价格" value="price" />
                      </el-select>
                      <el-button size="small" @click="drugGroupByCategory = !drugGroupByCategory; onDrugSearch(false)" :type="drugGroupByCategory ? 'primary' : ''">
                        {{ drugGroupByCategory ? '分组' : '列表' }}
                      </el-button>
                      <el-button size="small" @click="toggleDrugSort">
                        <el-icon v-if="drugSortOrder === 'asc'"><ArrowUp /></el-icon>
                        <el-icon v-else><ArrowDown /></el-icon>
                      </el-button>
                      <el-button size="small" @click="resetDrugSearch">重置</el-button>
                    </div>
                    <div class="drug-list-wrap">
                      <template v-if="drugGroupByCategory">
                        <div v-for="(group, cat) in groupedDrugResults" :key="String(cat)" class="drug-category-group">
                          <div class="drug-category-label">{{ cat }} <span class="cat-count">({{ group.length }})</span></div>
                          <div v-for="drug in group" :key="drug.id" class="drug-result-row" @click="selectDrug(drug)">
                            <div class="drug-row-main">
                              <span class="drug-name">{{ drug.name }}</span>
                              <span class="drug-spec">{{ drug.specification }}</span>
                            </div>
                            <div class="drug-row-sub">
                              <span class="drug-price">&yen;{{ drug.price }}</span>
                              <el-tag v-if="drug.need_skin_test" type="danger" size="small" effect="dark">皮试</el-tag>
                              <el-tag :type="drug.insurance_type === '甲' ? 'success' : drug.insurance_type === '乙' ? 'warning' : 'info'" size="small">{{ drug.insurance_type }}类</el-tag>
                              <el-button size="small" type="primary" link @click.stop="selectDrug(drug)">选择</el-button>
                            </div>
                          </div>
                        </div>
                        <el-empty v-if="Object.keys(groupedDrugResults).length === 0" description="暂无药品" :image-size="48" />
                      </template>
                      <template v-else>
                        <div v-for="drug in sortedDrugResults" :key="drug.id" class="drug-result-row" @click="selectDrug(drug)">
                          <div class="drug-row-main">
                            <el-tag size="small" type="info" style="margin-right:6px;flex-shrink:0">{{ drug.category }}</el-tag>
                            <span class="drug-name">{{ drug.name }}</span>
                            <span class="drug-spec">{{ drug.specification }}</span>
                          </div>
                          <div class="drug-row-sub">
                            <span class="drug-price">&yen;{{ drug.price }}</span>
                            <el-tag v-if="drug.need_skin_test" type="danger" size="small" effect="dark">皮试</el-tag>
                            <el-tag :type="drug.insurance_type === '甲' ? 'success' : drug.insurance_type === '乙' ? 'warning' : 'info'" size="small">{{ drug.insurance_type }}类</el-tag>
                            <el-button size="small" type="primary" link @click.stop="selectDrug(drug)">选择</el-button>
                          </div>
                        </div>
                        <el-empty v-if="sortedDrugResults.length === 0" description="暂无药品" :image-size="48" />
                      </template>
                    </div>
                    <div v-if="drugTotal > drugPageSize" class="drug-pagination">
                      <el-pagination
                        background
                        layout="prev, pager, next, jumper"
                        :total="drugTotal"
                        :page-size="drugPageSize"
                        v-model:current-page="drugPage"
                        @current-change="onDrugSearch(false)"
                        style="justify-content: center"
                      />
                    </div>
                  </div>
                  <div class="order-bottom">
                    <div class="order-list-title">当前医嘱
                      <span v-if="currentOrders.length > 0" style="font-size:12px;color:#1E88E5;margin-left:8px">共{{ currentOrders.length }}项</span>
                    </div>
                    <el-table :data="currentOrders" size="small" class="order-table">
                      <el-table-column prop="item_name" label="药品/项目" min-width="120" />
                      <el-table-column prop="quantity" label="数量" width="60" />
                      <el-table-column prop="unit" label="单位" width="50" />
                      <el-table-column prop="dosage" label="用法" width="80" />
                      <el-table-column prop="frequency" label="频次" width="70" />
                      <el-table-column prop="days" label="天数" width="60" />
                      <el-table-column label="金额" width="80">
                        <template #default="{ row }">¥{{ (row.price * row.quantity * (row.days||1)).toFixed(2) }}</template>
                      </el-table-column>
                      <el-table-column label="操作" width="60">
                        <template #default="{ $index }">
                          <el-button size="small" type="danger" text @click="removeOrder($index)">删除</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </section>

              <!-- Section3: 检验检查申请 -->
              <section id="section-exam-request" class="work-section">
                <div class="section-header">
                  <el-icon color="#FB8C00"><View /></el-icon>
                  <span>检验检查申请</span>
                </div>
                <div class="section-body">
                  <div class="exam-request-panel">
                    <div class="exam-request-header">
                      <el-select v-model="examTypeFilter" placeholder="选择类型" style="width:120px" @change="searchExamItems">
                        <el-option label="全部" value="" />
                        <el-option label="检验" value="lab" />
                        <el-option label="影像" value="radiology" />
                      </el-select>
                      <el-select v-model="examCategoryFilter" placeholder="选择分类" style="width:140px" @change="searchExamItems">
                        <el-option label="全部" value="" />
                        <el-option v-for="cat in examCategories" :key="cat.value" :label="cat.label" :value="cat.value" />
                      </el-select>
                      <el-input v-model="examKeyword" placeholder="搜索项目" style="width:200px" @input="searchExamItems" clearable />
                    </div>
                    <div class="exam-items-list">
                      <div v-for="item in filteredExamItems" :key="item.id" class="exam-item-card" @click="selectExamItem(item)">
                        <div class="exam-item-header">
                          <span class="exam-item-name">{{ item.name }}</span>
                          <el-tag :type="item.exam_type === 'lab' ? 'success' : 'warning'" size="small">
                            {{ item.exam_type === 'lab' ? '检验' : '影像' }}
                          </el-tag>
                        </div>
                        <div class="exam-item-info">
                          <span class="exam-price">¥{{ Number(item.price || 0).toFixed(2) }}</span>
                          <span class="exam-category">{{ item.category }}</span>
                        </div>
                        <div v-if="item.reference_range" class="exam-reference">参考范围: {{ item.reference_range }}</div>
                        <el-button size="small" type="primary" @click.stop="showExamRequestForm = true; selectedExamItem = item">申请</el-button>
                      </div>
                      <el-empty v-if="filteredExamItems.length === 0" description="暂无项目" :image-size="50" />
                    </div>
                  </div>
                </div>
              </section>

              <!-- Section4: 检查结果 -->
              <section id="section-exam-results" class="work-section">
                <div class="section-header">
                  <el-icon color="#7B1FA2"><DataAnalysis /></el-icon>
                  <span>检查结果</span>
                  <div class="header-actions">
                    <el-date-picker
                      v-model="examDateFilter"
                      type="date"
                      placeholder="筛选日期"
                      size="small"
                      clearable
                      style="width: 150px; margin-left: auto;"
                    />
                  </div>
                </div>
                <div class="section-body">
                  <div v-if="!currentPatient" class="empty-tip">请先选择患者</div>
                  <div v-else-if="examResultsLoading" class="loading-tip">加载中...</div>
                  <div v-else-if="filteredExamResults.length === 0" class="empty-tip">
                    {{ examDateFilter ? '该日期暂无检查结果' : '暂无检查结果' }}
                  </div>
                  <div v-else class="exam-results-list">
                    <!-- 翻页导航 -->
                    <div class="exam-pagination">
                      <el-button size="small" :disabled="examCurrentPage <= 1" @click="examCurrentPage--">
                        ← 上一个
                      </el-button>
                      <span class="exam-page-info">第 {{ examCurrentPage }} / {{ filteredExamResults.length }} 份</span>
                      <el-button size="small" :disabled="examCurrentPage >= filteredExamResults.length" @click="examCurrentPage++">
                        下一个 →
                      </el-button>
                    </div>
                    <!-- 当前检查单 -->
                    <div v-if="currentExamReport" :class="['exam-result-card', currentExamReport.isAbnormal ? 'abnormal' : '']">
                      <div class="exam-result-header">
                        <div class="exam-result-icon">{{ currentExamReport.exam_type === 'lab' ? '🩸' : '📷' }}</div>
                        <div class="exam-result-info">
                          <div class="exam-result-name">{{ currentExamReport.exam_name }}</div>
                          <div class="exam-result-meta">
                            <span>{{ currentExamReport.exam_type === 'lab' ? '检验科' : '放射科' }}</span>
                            <span>{{ formatDate(currentExamReport.report_date || currentExamReport.created_at) }}</span>
                          </div>
                        </div>
                        <el-tag v-if="currentExamReport.isAbnormal" type="danger" size="small">异常</el-tag>
                        <el-tag size="small" type="info">{{ currentExamReport.status || '已报告' }}</el-tag>
                      </div>
                      <div v-if="currentExamReport.exam_type === 'lab'" class="exam-result-body">
                        <el-table :data="currentExamReport.labItems" size="small" border>
                          <el-table-column prop="item" label="检验项目" min-width="120" />
                          <el-table-column prop="result" label="结果" width="80" />
                          <el-table-column prop="unit" label="单位" width="60" />
                          <el-table-column prop="reference" label="参考范围" width="120" />
                          <el-table-column prop="flag" label="提示" width="60">
                            <template #default="{ row }">
                              <span v-if="row.flag" :class="row.flag">{{ row.flag }}</span>
                            </template>
                          </el-table-column>
                        </el-table>
                      </div>
                      <div v-else class="exam-result-body">
                        <div class="imaging-section">
                          <div class="imaging-title">检查所见</div>
                          <div class="imaging-content">{{ currentExamReport.findings || currentExamReport.result || '-' }}</div>
                        </div>
                        <div class="imaging-section">
                          <div class="imaging-title">诊断意见</div>
                          <div class="imaging-content">{{ currentExamReport.conclusion || '-' }}</div>
                        </div>
                      </div>
                      <div v-if="currentExamReport.conclusion" class="exam-result-footer">
                        <span class="conclusion-text">结论：{{ currentExamReport.conclusion }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Section5: 转诊申请 -->
              <section id="section-referral" class="work-section">
                <div class="section-header">
                  <el-icon color="#00ACC1"><Share /></el-icon>
                  <span>转诊申请</span>
                </div>
                <div class="section-body">
                  <div class="referral-panel">
                    <el-button type="primary" @click="showReferralForm = true">新建转诊单</el-button>
                    <div v-if="currentPatient" class="referral-form-preview">
                      <el-descriptions :column="2" border>
                        <el-descriptions-item label="患者姓名">{{ currentPatient.name }}</el-descriptions-item>
                        <el-descriptions-item label="年龄">{{ currentPatient.age }}岁</el-descriptions-item>
                        <el-descriptions-item label="当前科室">{{ currentPatient.department_name || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="就诊医生">{{ currentUser?.real_name || '-' }}</el-descriptions-item>
                      </el-descriptions>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Section6: 住院证 -->
              <section id="section-hospitalization" class="work-section">
                <div class="section-header">
                  <el-icon color="#E53935"><HomeFilled /></el-icon>
                  <span>住院证</span>
                </div>
                <div class="section-body">
                  <div class="hospitalization-panel">
                    <el-button type="primary" @click="showHospitalizationForm = true">开具住院证</el-button>
                    <div v-if="currentPatient" class="hospitalization-form-preview">
                      <el-descriptions :column="2" border>
                        <el-descriptions-item label="患者姓名">{{ currentPatient.name }}</el-descriptions-item>
                        <el-descriptions-item label="性别/年龄">{{ currentPatient.gender }} / {{ currentPatient.age }}岁</el-descriptions-item>
                        <el-descriptions-item label="诊断">{{ record.diagnosis || '未诊断' }}</el-descriptions-item>
                      </el-descriptions>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Section7: 历史记录 -->
              <section id="section-history" class="work-section">
                <div class="section-header">
                  <el-icon color="#607D8B"><Clock /></el-icon>
                  <span>历史记录</span>
                </div>
                <div class="section-body">
                  <el-empty description="暂无历史记录" :image-size="60" />
                </div>
              </section>
            </div>
          </div>
        </div>

        <!-- 右列：诊断录入 + 热词 -->
        <div class="right-column">
          <!-- 诊断录入 -->
          <div class="diagnosis-panel">
            <div class="panel-header">
              <span>📋 诊断录入</span>
            </div>
            <div class="panel-body">
              <!-- 常用诊断快捷标签 -->
              <div v-if="commonDiagnoses.length > 0" class="diag-common-section">
                <div class="section-title">常用诊断（当前科室）</div>
                <div class="diag-common-tags">
                  <el-tag
                    v-for="d in commonDiagnoses"
                    :key="d.icd_code"
                    :type="isDiagAdded(d.icd_code) ? 'info' : 'primary'"
                    :effect="isDiagAdded(d.icd_code) ? 'plain' : 'light'"
                    class="diag-common-tag"
                    @click="addDiag({ icd: d.icd_code, name: d.name, isMain: true, isSuspect: false })"
                    :disabled="isDiagAdded(d.icd_code)"
                  >{{ d.name }}</el-tag>
                </div>
              </div>

              <!-- 搜索框 + ICD分类筛选 -->
              <div class="diag-search-row">
                <el-input v-model="diagKeyword" placeholder="搜索疾病名称/ICD编码/拼音首字母" @keyup.enter="searchDiag" clearable size="small" style="flex:1">
                  <template #append>
                    <el-button size="small" @click="searchDiag">搜索</el-button>
                  </template>
                </el-input>
                <el-select v-model="diagCategoryFilter" placeholder="ICD分类" size="small" clearable style="width:140px;margin-left:8px" @change="filterByCategory">
                  <el-option v-for="cat in diagCategories" :key="cat.category" :label="cat.category + ' (' + cat.count + ') '" :value="cat.category" />
                </el-select>
              </div>

              <!-- 搜索结果 -->
              <div v-if="diagResults.length > 0" class="diag-results">
                <div v-for="d in diagResults" :key="d.icd" class="diag-result-row">
                  <span class="icd-code">{{ d.icd }}</span>
                  <span class="diag-result-name">{{ d.name }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    :disabled="isDiagAdded(d.icd)"
                    @click="addDiag(d)"
                  >{{ isDiagAdded(d.icd) ? '已添加' : '添加' }}</el-button>
                </div>
              </div>

              <!-- 已选诊断 -->
              <div class="diag-selected">
                <div class="section-title">已选诊断 <span v-if="record.diagnoses.length > 0" style="font-size:11px;color:#909399;font-weight:normal">（主诊断将排在第一位）</span></div>
                <div v-for="(d, i) in record.diagnoses" :key="i" :class="['diag-row', d.isMain ? 'diag-main' : '']">
                  <el-radio-group v-model="d.isMain" size="small" style="flex-shrink:0" @change="onMainDiagChange(i)">
                    <el-radio-button :value="true">主诊</el-radio-button>
                    <el-radio-button :value="false">疑似</el-radio-button>
                  </el-radio-group>
                  <span class="diag-icd">{{ d.icd }}</span>
                  <span class="diag-name">{{ d.name }}</span>
                  <el-button size="small" type="danger" text @click="removeDiag(i)">删除</el-button>
                </div>
                <el-empty v-if="record.diagnoses.length === 0" description="无诊断" :image-size="32" />
              </div>

              <!-- 快速诊断录入按钮 -->
              <div class="quick-diag-btn">
                <el-button 
                  type="success" 
                  size="small" 
                  @click="quickDiagnosis"
                  :loading="quickDiagLoading"
                >
                  <el-icon><MagicStick /></el-icon>
                  快速诊断录入
                </el-button>
              </div>

              <!-- 诊断意见 -->
              <div class="field-label">诊断意见</div>
              <el-input v-model="record.diagnosis" placeholder="综合诊断描述（可点击「快速诊断录入」自动填充）" size="small" />
              
              <!-- 底部操作栏 -->
              <div class="action-bar">
                <el-button type="primary" size="small" @click="doSendOrders">发送</el-button>
                <el-button size="small" @click="saveRecord">暂存</el-button>
                <el-button size="small">打印</el-button>
                <el-button type="danger" size="small" @click="doCancelOrders">作废</el-button>
                <el-button type="warning" size="small" @click="doSignRecord">签名</el-button>
              </div>

          <!-- 科室热点词条 -->
          <div class="hot-keywords-wrapper">
            <HotKeywords :department-id="currentUser?.department_id || 1" :can-manage="currentUser?.is_chief_physician || false" @keyword-click="handleKeywordClick" />
          </div>
        </div>
      </div>
    </div>

    <!-- 消息中心弹窗 -->
    <el-dialog v-model="msgVisible" title="消息中心" width="500px">
      <el-tabs v-model="msgTab">
        <el-tab-pane label="退回处方" name="rejected">
          <el-empty description="暂无退回处方" :image-size="60" />
        </el-tab-pane>
        <el-tab-pane label="检验报告" name="exam-reports">
          <div v-if="examNotifications.length > 0">
            <div v-for="n in examNotifications" :key="n.id" class="exam-notification-item" @click="viewExamReport(n)">
              <div class="en-header">
                <span class="en-patient">{{ n.patient_name }}</span>
                <el-tag :type="n.exam_type === 'lab' ? 'success' : 'warning'" size="small">
                  {{ n.exam_type === 'lab' ? '检验' : '影像' }}
                </el-tag>
                <el-tag v-if="n.is_critical" type="danger" size="small">危急值</el-tag>
              </div>
              <div class="en-exam">{{ n.exam_name }}</div>
              <div class="en-conclusion">{{ n.conclusion }}</div>
              <div class="en-date">{{ formatDate(n.report_date) }}</div>
            </div>
          </div>
          <el-empty v-else description="暂无检验报告通知" :image-size="60" />
        </el-tab-pane>
        <el-tab-pane label="复诊患者" name="revisit">
          <div v-if="revisitPatients.length > 0">
            <div v-for="p in revisitPatients" :key="p.id" class="revisit-patient-item" @click="selectRevisitPatient(p)">
              <div class="rp-header">
                <span class="rp-name">{{ p.patient_name }}</span>
                <el-tag type="success" size="small">复诊</el-tag>
                <span class="rp-queue">排队号: {{ p.queue_number }}</span>
              </div>
              <div class="rp-exam">{{ p.exam_name }}</div>
              <div class="rp-conclusion">{{ p.report_conclusion }}</div>
              <div class="rp-phone">电话: {{ p.phone }}</div>
            </div>
          </div>
          <el-empty v-else description="暂无复诊患者" :image-size="60" />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 检验报告详情弹窗 -->
    <el-dialog v-model="examReportDetailVisible" title="检验报告详情" width="650px">
      <div v-if="dialogExamReport">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="患者">{{ dialogExamReport.patient_name }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ dialogExamReport.exam_name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="dialogExamReport.exam_type === 'lab' ? 'success' : 'warning'" size="small">
              {{ dialogExamReport.exam_type === 'lab' ? '检验' : '影像' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="日期">{{ formatDate(dialogExamReport.report_date) }}</el-descriptions-item>
          <el-descriptions-item label="报告人">{{ dialogExamReport.reporter_name }}</el-descriptions-item>
          <el-descriptions-item label="危急值">
            <el-tag v-if="dialogExamReport.is_critical" type="danger" size="small">是</el-tag>
            <el-tag v-else type="success" size="small">否</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px;">
          <template v-if="dialogExamReport.exam_type === 'lab'">
            <div class="detail-title">检验结果</div>
            <pre class="detail-pre">{{ dialogExamReport.result }}</pre>
            <div class="detail-title">参考范围</div>
            <pre class="detail-pre">{{ dialogExamReport.reference_range }}</pre>
          </template>
          <template v-else>
            <div class="detail-title">检查所见</div>
            <pre class="detail-pre">{{ dialogExamReport.findings }}</pre>
            <div class="detail-title">影像表现</div>
            <pre class="detail-pre">{{ dialogExamReport.image_features }}</pre>
          </template>
          <div class="detail-title">结论</div>
          <pre class="detail-pre">{{ dialogExamReport.conclusion }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="markExamReportRead">标记已读</el-button>
        <el-button type="primary" @click="examReportDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 办理入院弹窗 -->
    <el-dialog v-model="admitVisible" title="办理入院" width="360px">
      <p>确认为 <b>{{ currentPatient?.name }}</b> 办理入院手续？</p>
      <template #footer>
        <el-button @click="admitVisible = false">取消</el-button>
        <el-button type="primary" @click="doAdmit">确认办理</el-button>
      </template>
    </el-dialog>

    <!-- 快速登记弹窗 -->
    <el-dialog v-model="quickRegVisible" title="快速登记" width="400px">
      <el-form :model="quickForm" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="quickForm.name" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="quickForm.gender">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄"><el-input-number v-model="quickForm.age" :min="1" :max="120" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="quickForm.phone" /></el-form-item>
        <el-form-item label="使用预留号">
          <el-switch v-model="quickForm.useReserved" />
          <span style="font-size:12px;color:#999;margin-left:8px">使用预留号源</span>
        </el-form-item>
        <el-form-item label="预留号类型" v-if="quickForm.useReserved">
          <el-select v-model="quickForm.reserved_type" style="width:100%">
            <el-option label="医生自留号" value="doctor" />
            <el-option label="急诊预留号" value="emergency" />
            <el-option label="VIP特需号" value="vip" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickRegVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuickReg">登记</el-button>
      </template>
    </el-dialog>

    <!-- 药品/项目配置弹窗 -->
    <el-dialog v-model="drugConfigVisible" :title="`添加医嘱：${selectedDrugInfo?.name}`" width="440px">
      <el-form :model="drugForm" label-width="75px">
        <!-- 公共：规格提示 -->
        <el-form-item label="规格">
          <span style="color:#757575">{{ selectedDrugInfo?.specification }}</span>
          <el-tag v-if="selectedDrugInfo?.need_skin_test" type="danger" size="small" style="margin-left:8px">需皮试</el-tag>
          <el-tag :type="selectedDrugInfo?.insurance_type==='甲'?'success':selectedDrugInfo?.insurance_type==='乙'?'warning':'info'" size="small" style="margin-left:6px">{{ selectedDrugInfo?.insurance_type }}类</el-tag>
        </el-form-item>

        <!-- 中药饮片：剂数+煎法 -->
        <template v-if="isChinese">
          <el-form-item label="剂数">
            <el-input-number v-model="drugForm.pieces" :min="1" :max="30" />剂
          </el-form-item>
          <el-form-item label="每剂用量">
            <el-input-number v-model="drugForm.quantity" :min="1" :max="60" />克
          </el-form-item>
          <el-form-item label="煎法">
            <el-select v-model="drugForm.decoct" style="width:140px">
              <el-option label="常规煎" value="常规煎" />
              <el-option label="先煎" value="先煎" />
              <el-option label="后下" value="后下" />
              <el-option label="包煎" value="包煎" />
              <el-option label="另煞" value="另煞" />
              <el-option label="烙化" value="烙化" />
            </el-select>
          </el-form-item>
          <el-form-item label="服法">
            <el-select v-model="drugForm.dosage" style="width:140px">
              <el-option label="水煎服" value="水煎服" />
              <el-option label="分水煎服" value="分水煎服" />
            </el-select>
          </el-form-item>
          <el-form-item label="频次">
            <el-select v-model="drugForm.frequency" style="width:140px">
              <el-option label="bid(日二剂)" value="bid" />
              <el-option label="tid(日三剂)" value="tid" />
              <el-option label="qd(日一剂)" value="qd" />
            </el-select>
          </el-form-item>
          <el-form-item label="天数">
            <el-input-number v-model="drugForm.days" :min="1" :max="30" />天
          </el-form-item>
        </template>

        <!-- 治疗项目 -->
        <template v-else-if="isTreatment">
          <el-form-item label="次数">
            <el-input-number v-model="drugForm.quantity" :min="1" :max="10" />次
          </el-form-item>
          <el-form-item label="执行科室">
            <el-select v-model="drugForm.dosage" style="width:160px">
              <el-option label="门诊治疗室" value="门诊治疗室" />
              <el-option label="诊室" value="诊室" />
              <el-option label="就近化疗室" value="就近化疗室" />
              <el-option label="中医理疗室" value="中医理疗室" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="drugForm.frequency" placeholder="适当填写备注" style="width:200px" />
          </el-form-item>
        </template>

        <!-- 西药 -->
        <template v-else>
          <el-form-item label="数量">
            <el-input-number v-model="drugForm.quantity" :min="1" :max="100" />盒
          </el-form-item>
          <el-form-item label="用法">
            <el-select v-model="drugForm.dosage" style="width:140px">
              <el-option label="口服" value="口服" />
              <el-option label="静脉注射" value="静脉注射" />
              <el-option label="肌肉注射" value="肌肉注射" />
              <el-option label="皮下注射" value="皮下注射" />
              <el-option label="外用" value="外用" />
              <el-option label="雾化吸入" value="雾化吸入" />
            </el-select>
          </el-form-item>
          <el-form-item label="频次">
            <el-select v-model="drugForm.frequency" style="width:140px">
              <el-option label="qd(每日1次)" value="qd" />
              <el-option label="bid(每日2次)" value="bid" />
              <el-option label="tid(每日3次)" value="tid" />
              <el-option label="qid(每日4次)" value="qid" />
              <el-option label="prn(必要时)" value="prn" />
              <el-option label="st(立即)" value="st" />
            </el-select>
          </el-form-item>
          <el-form-item label="天数">
            <el-input-number v-model="drugForm.days" :min="1" :max="90" />天
          </el-form-item>
          <el-form-item v-if="selectedDrugInfo?.need_skin_test" label="皮试">
            <el-tag type="danger">此药需皮试，请先开具皮试医嘱</el-tag>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="drugConfigVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddOrder">确定添加</el-button>
      </template>
    </el-dialog>

    <!-- 检验检查申请弹窗 -->
    <el-dialog v-model="showExamRequestForm" :title="`申请${selectedExamItem?.name}`" width="500px">
      <el-form :model="examRequestForm" label-width="100px">
        <el-form-item label="项目名称">
          <el-input :value="selectedExamItem?.name" disabled />
        </el-form-item>
        <el-form-item label="患者姓名">
          <el-input :value="currentPatient?.name" disabled />
        </el-form-item>
        <el-form-item label="临床诊断">
          <el-input v-model="examRequestForm.clinical_diagnosis" type="textarea" :rows="3" placeholder="请输入临床诊断..." />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="examRequestForm.urgency">
            <el-radio label="normal">普通</el-radio>
            <el-radio label="urgent">加急</el-radio>
            <el-radio label="emergency">急诊</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="examRequestForm.remark" type="textarea" :rows="2" placeholder="请输入备注..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExamRequestForm = false">取消</el-button>
        <el-button type="primary" @click="submitExamRequest">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 转诊申请弹窗 -->
    <el-dialog v-model="showReferralForm" title="转诊申请" width="550px">
      <el-form :model="referralForm" label-width="100px">
        <el-form-item label="患者姓名">
          <el-input :value="currentPatient?.name" disabled />
        </el-form-item>
        <el-form-item label="原诊断" required>
          <el-input v-model="referralForm.diagnosis" placeholder="请输入原诊断" />
        </el-form-item>
        <el-form-item label="建议转诊科室" required>
          <el-select v-model="referralForm.target_department" placeholder="选择转诊科室">
            <el-option label="心内科" value="心内科" />
            <el-option label="呼吸内科" value="呼吸内科" />
            <el-option label="消化内科" value="消化内科" />
            <el-option label="神经内科" value="神经内科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="外科" value="外科" />
            <el-option label="肿瘤科" value="肿瘤科" />
            <el-option label="急诊科" value="急诊科" />
          </el-select>
        </el-form-item>
        <el-form-item label="转诊原因" required>
          <el-input v-model="referralForm.reason" type="textarea" :rows="3" placeholder="请输入转诊原因..." />
        </el-form-item>
        <el-form-item label="建议医生">
          <el-input v-model="referralForm.target_doctor" placeholder="请输入建议医生姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="referralForm.remark" type="textarea" :rows="2" placeholder="请输入备注..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReferralForm = false">取消</el-button>
        <el-button type="primary" @click="submitReferral">提交转诊申请</el-button>
      </template>
    </el-dialog>

    <!-- 住院证开具弹窗 -->
    <el-dialog v-model="showHospitalizationForm" title="开具住院证" width="550px">
      <el-form :model="hospitalizationForm" label-width="100px">
        <el-form-item label="患者姓名">
          <el-input :value="currentPatient?.name" disabled />
        </el-form-item>
        <el-form-item label="性别/年龄">
          <el-input :value="`${currentPatient?.gender} / ${currentPatient?.age}岁`" disabled />
        </el-form-item>
        <el-form-item label="入院诊断" required>
          <el-input v-model="hospitalizationForm.diagnosis" placeholder="请输入入院诊断" />
        </el-form-item>
        <el-form-item label="入院科室" required>
          <el-select v-model="hospitalizationForm.department" placeholder="选择入院科室">
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="心内科" value="心内科" />
            <el-option label="呼吸内科" value="呼吸内科" />
            <el-option label="消化内科" value="消化内科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="肿瘤科" value="肿瘤科" />
          </el-select>
        </el-form-item>
        <el-form-item label="床位类型">
          <el-select v-model="hospitalizationForm.bed_type">
            <el-option label="普通床位" value="普通" />
            <el-option label="单人病房" value="单人" />
            <el-option label="VIP病房" value="VIP" />
          </el-select>
        </el-form-item>
        <el-form-item label="入院时间">
          <el-date-picker v-model="hospitalizationForm.admit_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="选择入院时间" />
        </el-form-item>
        <el-form-item label="病情摘要" required>
          <el-input v-model="hospitalizationForm.summary" type="textarea" :rows="4" placeholder="请输入病情摘要..." />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="hospitalizationForm.remark" type="textarea" :rows="2" placeholder="请输入备注..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHospitalizationForm = false">取消</el-button>
        <el-button type="primary" @click="submitHospitalization">开具住院证</el-button>
      </template>
    </el-dialog>

    <!-- 退出登录确认弹窗 -->
    <el-dialog v-model="showLogoutDialog" title="确认退出" width="320px" :close-on-click-modal="false">
      <div class="logout-dialog-content">
        <el-icon :size="48" color="#F56C6C" style="margin-bottom:16px"><SwitchButton /></el-icon>
        <p>确定要退出系统吗？</p>
        <p class="logout-hint">退出后需要重新登录才能继续操作</p>
      </div>
      <template #footer>
        <el-button @click="showLogoutDialog = false">取消</el-button>
        <el-button type="danger" @click="logout">确定退出</el-button>
      </template>
    </el-dialog>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useShortcuts } from '@/composables/useShortcuts'
import { useHisStore } from '@/stores/his'
import { useUserStore } from '@/stores/user'
import HotKeywords from '@/components/HotKeywords.vue'
import SmartInput from '@/components/SmartInput.vue'
import PatientSearch from './PatientSearch.vue'
import MyFavorites from './MyFavorites.vue'
import CommonTools from './CommonTools.vue'
import {
  UserFilled, Bell, ArrowDown, ArrowUp, List, Search, Star, Tools, Document, FirstAidKit, DataAnalysis, View, Share, HomeFilled, Clock, SwitchButton, MagicStick
} from '@element-plus/icons-vue'

const router = useRouter()
const his = useHisStore()
const userStore = useUserStore()

// 状态变量
const currentUser = ref<any>(userStore.currentUser.value)
const searchText = ref('')
// 使用 store 中的 todayPatients 和 currentPatient
const { todayPatients, currentPatient } = his
const activeSidebarTab = ref('queue')
const activeTab = ref('record')
const workContentRef = ref<HTMLElement | null>(null)
const rejectedCount = ref(0)
const msgVisible = ref(false)
const msgTab = ref('rejected')
const examNotifications = ref<any[]>([])
const revisitPatients = ref<any[]>([])
const admitVisible = ref(false)
const quickRegVisible = ref(false)
const quickForm = reactive({
  name: '',
  gender: '男',
  age: 18,
  phone: '',
  useReserved: false,
  reserved_type: 'doctor'
})
const drugConfigVisible = ref(false)
const selectedDrugInfo = ref<any>(null)
const drugForm = reactive({
  quantity: 1,
  dosage: '',
  frequency: '',
  days: 1,
  pieces: 1,
  decoct: '常规煎'
})
const showExamRequestForm = ref(false)
const selectedExamItem = ref<any>(null)
const examRequestForm = reactive({
  clinical_diagnosis: '',
  urgency: 'normal',
  remark: ''
})
const showReferralForm = ref(false)
const referralForm = reactive({
  diagnosis: '',
  target_department: '',
  reason: '',
  target_doctor: '',
  remark: ''
})
const showHospitalizationForm = ref(false)
const hospitalizationForm = reactive({
  diagnosis: '',
  department: '',
  bed_type: '普通',
  admit_date: '',
  summary: '',
  remark: ''
})
const showLogoutDialog = ref(false)
const examReportDetailVisible = ref(false)
const dialogExamReport = ref<any>(null)

// 病历记录
const record = reactive({
  chief: '',
  history: '',
  past: '',
  physical: '',
  allergy: '',
  diagnosis: '',
  diagnoses: [] as any[]
})

// 医嘱相关
const orderType = ref('western')
const drugKeyword = ref('')
const drugCategoryFilter = ref('')
const drugSpecFilter = ref('')
const drugManufacturerFilter = ref('')
const drugSortMode = ref('category')
const drugSortOrder = ref('asc')
const drugGroupByCategory = ref(true)
const drugResults = ref<any[]>([])
const drugTotal = ref(0)
const drugPage = ref(1)
const drugPageSize = ref(20)
const drugCategories = ref<any[]>([])
const currentOrders = ref<any[]>([])

// 检验检查相关
const examTypeFilter = ref('')
const examCategoryFilter = ref('')
const examKeyword = ref('')
const examCategories = ref<any[]>([])
const examItems = ref<any[]>([])
const examResults = ref<any[]>([])
const examResultsLoading = ref(false)
const examDateFilter = ref<Date | null>(null)
const examCurrentPage = ref(1)

// 诊断相关
const diagKeyword = ref('')
const diagCategoryFilter = ref('')
const diagCategories = ref<any[]>([])
const diagResults = ref<any[]>([])
const commonDiagnoses = ref<any[]>([])
const diagnosisCollapsed = ref(false)
const quickDiagLoading = ref(false)



// 导航标签
const navTabs = [
  { name: 'record', label: '病历书写' },
  { name: 'order', label: '医嘱录入' },
  { name: 'exam-request', label: '检验检查申请' },
  { name: 'exam-results', label: '检查结果' },
  { name: 'referral', label: '转诊申请' },
  { name: 'hospitalization', label: '住院证' },
  { name: 'history', label: '历史记录' }
]

// 费用信息
const feeInfo = computed(() => {
  const total = currentOrders.value.reduce((sum, item) => sum + item.price * item.quantity * (item.days || 1), 0)
  return {
    total: total.toFixed(2),
    insurance: (total * 0.7).toFixed(2),
    self: (total * 0.3).toFixed(2)
  }
})

// 计算属性
const filteredPatients = computed(() => {
  if (!searchText.value) return todayPatients.value
  const keyword = searchText.value.toLowerCase()
  return todayPatients.value.filter(p => 
    p.name.toLowerCase().includes(keyword) || 
    (p.phone && p.phone.includes(keyword))
  )
})

const isChinese = computed(() => orderType.value === 'chinese')
const isTreatment = computed(() => orderType.value === 'treatment')

const groupedDrugResults = computed(() => {
  const groups: Record<string, any[]> = {}
  drugResults.value.forEach(drug => {
    const cat = drug.category || '其他'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(drug)
  })
  return groups
})

const sortedDrugResults = computed(() => {
  let results = [...drugResults.value]
  if (drugSortMode.value === 'alpha') {
    results.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  } else if (drugSortMode.value === 'price') {
    results.sort((a, b) => a.price - b.price)
  }
  return results
})

const filteredExamItems = computed(() => {
  let items = [...examItems.value]
  if (examTypeFilter.value) {
    items = items.filter(item => item.exam_type === examTypeFilter.value)
  }
  if (examCategoryFilter.value) {
    items = items.filter(item => item.category === examCategoryFilter.value)
  }
  if (examKeyword.value) {
    const keyword = examKeyword.value.toLowerCase()
    items = items.filter(item => 
      item.name.toLowerCase().includes(keyword) ||
      (item.code && item.code.toLowerCase().includes(keyword))
    )
  }
  return items
})

const canSwitchInpatient = computed(() => {
  return currentUser.value?.role === 'doctor' || currentUser.value?.can_access_inpatient
})

const currentStatusOpt = computed(() => {
  return statusOptions.find(opt => opt.value === currentUser.value?.status) || statusOptions[0]
})

const statusOptions = [
  { value: 'online', label: '在线', tagType: 'success' },
  { value: 'busy', label: '忙碌', tagType: 'warning' },
  { value: 'offline', label: '离线', tagType: 'info' }
]

// 方法
const setStatus = async (status: string) => {
  if (!currentUser.value) return
  try {
    await axios.put('/api/user/status', { userId: currentUser.value.id, status })
    currentUser.value.status = status
    ElMessage.success(`状态已更新为：${statusOptions.find(o => o.value === status)?.label}`)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '更新失败')
  }
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const openProfile = () => {
  router.push('/doctor/profile')
}

const { selectPatient, loadTodayPatients, callNext } = his

const { registerHandler, unregisterHandler, loadShortcuts } = useShortcuts()

let midnightResetTimer: number | null = null

const setupMidnightReset = () => {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const msUntilMidnight = tomorrow.getTime() - now.getTime()
  
  midnightResetTimer = window.setTimeout(() => {
    todayPatients.value = []
    currentPatient.value = null
    ElMessage.info('已进入新的一天，候诊队列已重置')
    setupMidnightReset()
  }, msUntilMidnight)
}

onMounted(() => {
  searchExamItems()
  loadExamNotifications()
  loadRevisitPatients()
  loadDiagCategories()
  loadCommonDiagnoses()
  loadDrugCategories()
  onDrugSearch()

  loadShortcuts()

  setupMidnightReset()
  
  registerHandler('save_record', saveRecord)
  registerHandler('send_orders', doSendOrders)
  registerHandler('refresh_queue', () => {
    if (currentUser.value?.doctor_id) {
      loadTodayPatients(String(currentUser.value.doctor_id))
      ElMessage.info('已刷新患者列表')
    }
  })
  registerHandler('prev_patient', () => {
    if (currentPatient.value && todayPatients.value.length > 0) {
      const currentIndex = todayPatients.value.findIndex(p => p.reg_id === currentPatient.value?.reg_id)
      const newIndex = currentIndex > 0 ? currentIndex - 1 : todayPatients.value.length - 1
      selectPatient(todayPatients.value[newIndex])
    }
  })
  registerHandler('next_patient', () => {
    if (currentPatient.value && todayPatients.value.length > 0) {
      const currentIndex = todayPatients.value.findIndex(p => p.reg_id === currentPatient.value?.reg_id)
      const newIndex = currentIndex < todayPatients.value.length - 1 ? currentIndex + 1 : 0
      selectPatient(todayPatients.value[newIndex])
    }
  })
  registerHandler('toggle_diagnosis', toggleDiagnosisCollapse)
  registerHandler('focus_drug_search', () => {
    const searchInput = document.querySelector('.drug-search-input') as HTMLInputElement
    if (searchInput) searchInput.focus()
  })
})

onUnmounted(() => {
  if (midnightResetTimer) {
    clearTimeout(midnightResetTimer)
    midnightResetTimer = null
  }
  unregisterHandler('save_record')
  unregisterHandler('send_orders')
  unregisterHandler('refresh_queue')
  unregisterHandler('prev_patient')
  unregisterHandler('next_patient')
  unregisterHandler('toggle_diagnosis')
  unregisterHandler('toggle_queue')
  unregisterHandler('focus_drug_search')
})

// 切换到检验检查申请tab时自动加载项目
watch(activeTab, (val) => {
  if (val === 'exam-request') {
    searchExamItems()
    loadExamCategories()
  } else if (val === 'exam-results') {
    loadExamResults()
  }
})

// 切换药品类型标签时自动搜索
watch(orderType, () => {
  onDrugSearch()
})

// 热点词条点击处理
const handleKeywordClick = (keyword: string) => {
  if (!record.chief) {
    record.chief = keyword
  } else if (!record.diagnosis) {
    record.diagnosis = keyword
  } else {
    record.history += (record.history ? ' ' : '') + keyword
  }
  ElMessage.success(`已填入：${keyword}`)
}

const queuePage = ref(1)
const queuePageSize = ref(8)

const paginatedPatients = computed(() => {
  const start = (queuePage.value - 1) * queuePageSize.value
  const end = start + queuePageSize.value
  return filteredPatients.value.slice(start, end)
})



// 切换诊断折叠
const toggleDiagnosisCollapse = () => {
  diagnosisCollapsed.value = !diagnosisCollapsed.value
}

// 滚动到指定区域
const scrollToSection = (sectionName: string) => {
  activeTab.value = sectionName
  const element = document.getElementById(`section-${sectionName}`)
  if (element && workContentRef.value) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 监听滚动更新activeTab
const onWorkScroll = () => {
  if (!workContentRef.value) return
  const sections = navTabs.map(tab => ({
    name: tab.name,
    element: document.getElementById(`section-${tab.name}`)
  }))
  
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i]
    if (section.element) {
      const rect = section.element.getBoundingClientRect()
      const containerRect = workContentRef.value.getBoundingClientRect()
      if (rect.top <= containerRect.top + 100) {
        activeTab.value = section.name
        break
      }
    }
  }
}

// 状态相关方法
const statusTagType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    calling: 'warning',
    in_progress: 'primary',
    completed: 'success'
  }
  return map[status] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待就诊',
    calling: '呼叫中',
    in_progress: '就诊中',
    completed: '已完成'
  }
  return map[status] || status
}

// 接诊处理
const handleReceiveConsultation = async () => {
  if (!currentPatient.value) return
  try {
    await axios.post('/api/registration/receive', { regId: currentPatient.value.reg_id })
    currentPatient.value.status = 'in_progress'
    const doctorId = currentUser.value?.doctor_id || currentUser.value?.id
    if (doctorId) {
      await axios.post('/api/revisit/enable', {
        patientId: currentPatient.value.patient_id,
        doctorId: doctorId
      })
    }
    ElMessage.success('接诊成功，已开启复诊功能')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '接诊失败')
  }
}

// 过号
const skipCurrent = async () => {
  if (!currentPatient.value) return
  try {
    await axios.post('/api/registration/skip', { regId: currentPatient.value.reg_id })
    ElMessage.success('已过号')
    loadTodayPatients(String(currentUser.value?.doctor_id || currentUser.value?.id || '1'))
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

// 快速登记
const submitQuickReg = async () => {
  if (!quickForm.name) { ElMessage.warning('请输入姓名'); return }
  if (!quickForm.phone) { ElMessage.warning('请输入手机号'); return }
  try {
    // 添加医生ID到请求中
    const registerData = {
      ...quickForm,
      doctorId: currentUser.value?.doctor_id || currentUser.value?.id
    }
    await axios.post('/api/patient/register', registerData)
    ElMessage.success('登记成功')
    quickRegVisible.value = false
    // 重置表单
    quickForm.name = ''
    quickForm.gender = '男'
    quickForm.age = 18
    quickForm.phone = ''
    quickForm.useReserved = false
    quickForm.reserved_type = 'doctor'
    // 刷新列表
    loadTodayPatients(String(currentUser.value?.doctor_id || currentUser.value?.id || '1'))
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '登记失败')
  }
}

// 药品搜索
const onDrugSearch = async (resetPage = true) => {
  if (resetPage) {
    drugPage.value = 1
  }
  try {
    const sortBy = drugSortMode.value === 'category_sort' ? 'category' : drugSortMode.value === 'alpha' ? 'name' : 'price'
    const res = await axios.get('/api/drugs/search', {
      params: {
        q: drugKeyword.value,
        category: drugCategoryFilter.value,
        specification: drugSpecFilter.value,
        manufacturer: drugManufacturerFilter.value,
        type: orderType.value === 'chinese' ? 'chinese' : orderType.value === 'treatment' ? 'treatment' : 'western',
        page: drugPage.value,
        page_size: drugPageSize.value,
        sort_by: sortBy,
        sort_order: drugSortOrder.value
      }
    })
    drugResults.value = res.data.data || res.data || []
    drugTotal.value = res.data.total || 0
  } catch (err: any) {
    console.error('搜索药品失败:', err)
    drugResults.value = []
    drugTotal.value = 0
  }
}

// 加载药品分类列表
const loadDrugCategories = async () => {
  try {
    const res = await axios.get('/api/drugs/categories')
    drugCategories.value = res.data || []
  } catch (err) {
    console.error('加载药品分类失败:', err)
  }
}

// 重置药品搜索条件
const resetDrugSearch = () => {
  drugKeyword.value = ''
  drugCategoryFilter.value = ''
  drugSpecFilter.value = ''
  drugManufacturerFilter.value = ''
  drugSortMode.value = 'category_sort'
  drugSortOrder.value = 'asc'
  drugGroupByCategory.value = true
  drugPage.value = 1
  onDrugSearch()
}

// 切换药品排序
const toggleDrugSort = () => {
  drugSortOrder.value = drugSortOrder.value === 'asc' ? 'desc' : 'asc'
  onDrugSearch(false)
}

// 选择药品
const selectDrug = (drug: any) => {
  selectedDrugInfo.value = drug
  drugForm.quantity = 1
  drugForm.dosage = ''
  drugForm.frequency = ''
  drugForm.days = 1
  drugForm.pieces = 1
  drugForm.decoct = '常规煎'
  drugConfigVisible.value = true
}

// 确认添加医嘱
const confirmAddOrder = () => {
  if (!selectedDrugInfo.value) return
  
  const order = {
    item_name: selectedDrugInfo.value.name,
    price: selectedDrugInfo.value.price,
    quantity: drugForm.quantity,
    unit: isChinese.value ? '剂' : isTreatment.value ? '次' : '盒',
    dosage: drugForm.dosage,
    frequency: drugForm.frequency,
    days: drugForm.days,
    pieces: drugForm.pieces,
    decoct: drugForm.decoct
  }
  
  currentOrders.value.push(order)
  drugConfigVisible.value = false
  ElMessage.success('已添加到医嘱')
}

// 删除医嘱
const removeOrder = (index: number) => {
  currentOrders.value.splice(index, 1)
}

// 检验检查项目搜索
const searchExamItems = async () => {
  try {
    const res = await axios.get('/api/exam-items', {
      params: {
        type: examTypeFilter.value,
        category: examCategoryFilter.value,
        keyword: examKeyword.value
      }
    })
    examItems.value = res.data || []
  } catch (err: any) {
    console.error('加载检验检查项目失败:', err)
  }
}

// 加载检验分类
const loadExamCategories = async () => {
  try {
    const res = await axios.get('/api/exam-categories')
    examCategories.value = res.data || []
  } catch (err: any) {
    console.error('加载检验分类失败:', err)
  }
}

// 选择检验检查项目
const selectExamItem = (item: any) => {
  selectedExamItem.value = item
  showExamRequestForm.value = true
}

// 提交检验检查申请
const submitExamRequest = async () => {
  if (!currentPatient.value) {
    ElMessage.warning('请先选择患者')
    return
  }
  if (!selectedExamItem.value) {
    ElMessage.warning('请选择检查项目')
    return
  }
  if (!examRequestForm.clinical_diagnosis) {
    ElMessage.warning('请输入临床诊断')
    return
  }
  try {
    await axios.post('/api/doctor/exam-request', {
      patient_id: currentPatient.value?.patient_id,
      doctor_id: currentUser.value?.doctor_id || currentUser.value?.id || 0,
      registration_id: currentPatient.value?.reg_id,
      exam_type: selectedExamItem.value.exam_type,
      exam_name: selectedExamItem.value.name,
      clinical_diagnosis: examRequestForm.clinical_diagnosis,
      urgency: examRequestForm.urgency
    })
    ElMessage.success('申请提交成功')
    showExamRequestForm.value = false
    examRequestForm.clinical_diagnosis = ''
    examRequestForm.urgency = 'normal'
    examRequestForm.remark = ''
    loadExamResults()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '提交失败')
  }
}

// 加载检查结果
const loadExamResults = async () => {
  if (!currentPatient.value) return
  examResultsLoading.value = true
  examCurrentPage.value = 1
  try {
    const res = await axios.get('/api/doctor/exam-reports', {
      params: { patient_id: currentPatient.value?.patient_id }
    })
    // 解析 result 字段为 labItems
    examResults.value = (res.data || []).map((report: any) => {
      let labItems: any[] = []
      if (report.exam_type === 'lab' && report.result) {
        try {
          // result 字段可能是 JSON 字符串或已经是对象
          const parsed = typeof report.result === 'string' ? JSON.parse(report.result) : report.result
          if (Array.isArray(parsed)) {
            labItems = parsed.map((item: any) => ({
              item: item.item_name,
              result: item.result,
              unit: item.unit || '',
              reference: item.reference_range || '',
              flag: item.flag || ''
            }))
          }
        } catch (e) {
          console.error('解析检验结果失败:', e, report.result)
        }
      }
      // 判断是否异常
      const isAbnormal = labItems.some(item => item.flag && item.flag !== '')
      return {
        ...report,
        labItems,
        isAbnormal
      }
    })
  } catch (err: any) {
    console.error('加载检查结果失败:', err)
  } finally {
    examResultsLoading.value = false
  }
}

// 格式化日期显示
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  
  if (date >= today) {
    return `今天 ${timeStr}`
  } else if (date >= yesterday) {
    return `昨天 ${timeStr}`
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${timeStr}`
  }
}

// 按日期筛选检查结果
const filteredExamResults = computed(() => {
  if (!examResults.value.length) return []
  
  // 先按日期排序，最新的在前
  const sorted = [...examResults.value].sort((a, b) => {
    const dateA = new Date(a.report_date || a.created_at || 0)
    const dateB = new Date(b.report_date || b.created_at || 0)
    return dateB.getTime() - dateA.getTime()
  })
  
  // 如果有日期筛选，则按日期过滤
  if (examDateFilter.value) {
    const filterDate = new Date(examDateFilter.value)
    const filterYear = filterDate.getFullYear()
    const filterMonth = filterDate.getMonth()
    const filterDay = filterDate.getDate()
    
    return sorted.filter(report => {
      const reportDate = new Date(report.report_date || report.created_at || 0)
      return (
        reportDate.getFullYear() === filterYear &&
        reportDate.getMonth() === filterMonth &&
        reportDate.getDate() === filterDay
      )
    })
  }
  
  return sorted
})

// 日期筛选变化时重置翻页
watch(examDateFilter, () => {
  examCurrentPage.value = 1
})

// 当前显示的检查报告（一次一个）
const currentExamReport = computed(() => {
  if (filteredExamResults.value.length === 0) return null
  const idx = Math.min(examCurrentPage.value - 1, filteredExamResults.value.length - 1)
  return filteredExamResults.value[Math.max(0, idx)]
})

// 转诊申请
const submitReferral = async () => {
  if (!referralForm.diagnosis) {
    ElMessage.warning('请输入原诊断')
    return
  }
  if (!referralForm.target_department) {
    ElMessage.warning('请选择转诊科室')
    return
  }
  if (!referralForm.reason) {
    ElMessage.warning('请输入转诊原因')
    return
  }
  try {
    await axios.post('/api/referrals', {
      patientId: currentPatient.value?.patient_id,
      ...referralForm
    })
    ElMessage.success('转诊申请提交成功')
    showReferralForm.value = false
    referralForm.diagnosis = ''
    referralForm.target_department = ''
    referralForm.reason = ''
    referralForm.target_doctor = ''
    referralForm.remark = ''
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '提交失败')
  }
}

// 住院证开具
const submitHospitalization = async () => {
  if (!hospitalizationForm.diagnosis) {
    ElMessage.warning('请输入入院诊断')
    return
  }
  if (!hospitalizationForm.department) {
    ElMessage.warning('请选择入院科室')
    return
  }
  if (!hospitalizationForm.summary) {
    ElMessage.warning('请输入病情摘要')
    return
  }
  try {
    await axios.post('/api/hospitalizations', {
      patientId: currentPatient.value?.patient_id,
      ...hospitalizationForm
    })
    ElMessage.success('住院证开具成功')
    showHospitalizationForm.value = false
    hospitalizationForm.diagnosis = ''
    hospitalizationForm.department = ''
    hospitalizationForm.bed_type = '普通'
    hospitalizationForm.admit_date = ''
    hospitalizationForm.summary = ''
    hospitalizationForm.remark = ''
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '开具失败')
  }
}

// 办理入院
const doAdmit = async () => {
  if (!currentPatient.value) return
  try {
    await axios.post('/api/admissions', { patientId: currentPatient.value?.patient_id })
    ElMessage.success('办理入院成功')
    admitVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '办理失败')
  }
}

// 保存病历
const saveRecord = async () => {
  if (!currentPatient.value) return
  if (!record.chief) {
    ElMessage.warning('请填写主诉')
    return
  }
  try {
    await axios.post('/api/doctor/medical-record', {
      patient_id: currentPatient.value?.patient_id,
      doctor_id: currentUser.value?.doctor_id || currentUser.value?.id || 0,
      registration_id: currentPatient.value?.reg_id,
      ...record
    })
    ElMessage.success('病历保存成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  }
}

// 发送医嘱
const doSendOrders = async () => {
  if (!currentPatient.value) return
  if (currentOrders.value.length === 0) {
    ElMessage.warning('请至少添加一条医嘱')
    return
  }
  try {
    await axios.post('/api/orders', {
      patientId: currentPatient.value?.patient_id,
      doctorId: currentUser.value?.doctor_id || currentUser.value?.id || 0,
      orders: currentOrders.value
    })
    ElMessage.success('医嘱发送成功')
    currentOrders.value = []
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '发送失败')
  }
}

// 作废医嘱
const doCancelOrders = () => {
  currentOrders.value = []
  ElMessage.info('已清空当前医嘱')
}

// 签名
const doSignRecord = async () => {
  if (!currentPatient.value) return
  try {
    await axios.post('/api/medical-records/sign', {
      patientId: currentPatient.value?.patient_id,
      doctorId: currentUser.value?.doctor_id || currentUser.value?.id || 0
    })
    ElMessage.success('签名成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '签名失败')
  }
}

// 加载消息通知
const loadExamNotifications = async () => {
  try {
    const res = await axios.get('/api/doctor/exam-notifications', {
      params: { doctor_id: currentUser.value?.doctor_id || currentUser.value?.id }
    })
    examNotifications.value = res.data || []
    rejectedCount.value = examNotifications.value.filter(n => n.is_critical).length
  } catch (err: any) {
    console.error('加载消息通知失败:', err)
  }
}

// 查看检验报告
const viewExamReport = (notification: any) => {
  dialogExamReport.value = notification
  examReportDetailVisible.value = true
}

// 标记已读
const markExamReportRead = async () => {
  if (!dialogExamReport.value) return
  try {
    await axios.put(`/api/doctor/exam-notification/${dialogExamReport.value.id}/read`)
    ElMessage.success('已标记为已读')
    loadExamNotifications()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

// 加载复诊患者
const loadRevisitPatients = async () => {
  try {
    const res = await axios.get('/api/doctor/revisit-patients', {
      params: { doctor_id: currentUser.value?.id }
    })
    revisitPatients.value = res.data || []
  } catch (err: any) {
    console.error('加载复诊患者失败:', err)
  }
}

// 选择复诊患者
const selectRevisitPatient = (patient: any) => {
  // TODO: 实现复诊患者选择逻辑
  ElMessage.info(`选择复诊患者：${patient.patient_name}`)
}


// 诊断相关方法
const loadDiagCategories = async () => {
  try {
    const res = await axios.get('/api/diagnosis-categories')
    diagCategories.value = res.data || []
  } catch (err: any) {
    console.error('加载诊断分类失败:', err)
  }
}

const loadCommonDiagnoses = async () => {
  try {
    const res = await axios.get('/api/common-diagnoses', {
      params: { departmentId: currentUser.value?.department_id }
    })
    commonDiagnoses.value = res.data || []
  } catch (err: any) {
    console.error('加载常用诊断失败:', err)
  }
}

const searchDiag = async () => {
  if (!diagKeyword.value.trim()) {
    diagResults.value = []
    return
  }
  try {
    const res = await axios.get('/api/diagnosis/search', {
      params: {
        keyword: diagKeyword.value,
        category: diagCategoryFilter.value
      }
    })
    diagResults.value = res.data || []
  } catch (err: any) {
    console.error('搜索诊断失败:', err)
  }
}

const filterByCategory = () => {
  searchDiag()
}

const isDiagAdded = (icd: string) => {
  return record.diagnoses.some(d => d.icd === icd)
}

const addDiag = (diag: any) => {
  if (isDiagAdded(diag.icd)) return
  record.diagnoses.push({
    icd: diag.icd,
    name: diag.name,
    isMain: diag.isMain || false,
    isSuspect: diag.isSuspect || false
  })
  ElMessage.success(`已添加诊断：${diag.name}`)
}

const removeDiag = (index: number) => {
  record.diagnoses.splice(index, 1)
}

const onMainDiagChange = (index: number) => {
  record.diagnoses.forEach((d, i) => {
    d.isMain = i === index
  })
}

// 快速诊断录入
const quickDiagnosis = async () => {
  if (!currentPatient.value) {
    ElMessage.warning('请先选择患者')
    return
  }
  if (!record.chief && !record.history) {
    ElMessage.warning('请先填写主诉或现病史')
    return
  }

  quickDiagLoading.value = true
  try {
    console.log('快速诊断请求参数:', {
      chief: record.chief,
      history: record.history,
      past: record.past,
      age: currentPatient.value?.age,
      gender: currentPatient.value?.gender,
      department_id: currentUser.value?.department_id
    })
    
    const res = await axios.post('/api/diagnosis/quick', {
      chief: record.chief,
      history: record.history,
      past: record.past,
      age: currentPatient.value?.age,
      gender: currentPatient.value?.gender,
      department_id: currentUser.value?.department_id
    })
    
    console.log('快速诊断响应:', res.data)
    
    const suggestions = res.data || []
    if (suggestions.length === 0) {
      ElMessage.info('暂无匹配的诊断建议，请手动录入')
      return
    }

    suggestions.forEach((suggestion: any) => {
      if (!isDiagAdded(suggestion.icd)) {
        addDiag({
          icd: suggestion.icd,
          name: suggestion.name,
          isMain: suggestion.is_main || false,
          isSuspect: suggestion.is_suspect || false
        })
      }
    })

    if (suggestions.length > 0 && !record.diagnosis) {
      record.diagnosis = suggestions.map((s: any) => s.name).join('；')
    }

    ElMessage.success(`已自动生成 ${suggestions.length} 条诊断建议`)
  } catch (err: any) {
    console.error('快速诊断错误:', err.response?.data || err.message)
    ElMessage.error(err.response?.data?.error || '快速诊断失败')
  } finally {
    quickDiagLoading.value = false
  }
}

</script>

<style scoped>
.workbench {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  font-size: 14px;
}

.top-bar {
  height: 56px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.doctor-info { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #212121; }
.top-actions { display: flex; align-items: center; gap: 10px; }

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 最左侧导航栏 */
.sidebar {
  width: 80px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #1565C0, #1E88E5);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s;
  gap: 4px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.menu-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
}

.menu-item .el-icon {
  font-size: 20px;
}

.menu-item span {
  font-size: 12px;
}

/* 主工作区 */
.work-main {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  height: 100%;
}

/* 左中列 */
.left-column {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

/* 中间列 */
.middle-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 右列 */
.right-column {
  width: 350px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 面板通用样式 */
.patient-detail-panel,
.fee-panel,
.queue-panel,
.diagnosis-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: #FAFCFF;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: #FAFCFF;
  border-bottom: 1px solid #E8F4FD;
}

.panel-body {
  padding: 12px;
  overflow-y: auto;
}

/* 患者详细信息面板 */
.patient-detail-panel {
  flex: 1;
  border: 2px solid transparent;
}

.patient-detail-table {
  width: 100%;
}

.patient-detail-table :deep(.el-descriptions__label) {
  font-weight: 500;
  color: #606266;
}

.patient-detail-table :deep(.el-descriptions__content) {
  font-weight: 400;
  color: #303133;
}

/* 面板空状态 */
.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

/* 费用面板 */
.fee-panel {
  flex: 1;
}

.fee-total {
  font-size: 24px;
  font-weight: 700;
  color: #E53935;
  text-align: center;
  margin-bottom: 12px;
}

.fee-split {
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 12px;
}

.fee-insurance { color: #67C23A; font-weight: 600; }
.fee-self { color: #E53935; font-weight: 600; }

.fee-detail-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  padding-top: 8px;
  border-top: 1px solid #F0F0F0;
}

.fee-detail-list {
  max-height: 120px;
  overflow-y: auto;
}

.fee-detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  color: #606266;
}

.fee-more {
  font-size: 11px;
  color: #909399;
  text-align: center;
  padding: 4px 0;
}

/* 队列面板 */
.queue-panel {
  flex: 1;
  overflow: hidden;
}

.panel-empty-state .panel-body {
  overflow-y: hidden;
}

.queue-panel .panel-body {
  padding: 12px;
  overflow-y: auto;
}

.queue-popover {
  padding: 0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.queue-item {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #E8F4FD;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-item:hover {
  border-color: #1E88E5;
  background: #F0F7FF;
}

.queue-item.active {
  border-color: #1E88E5;
  background: #E3F2FD;
  border-left: 3px solid #1E88E5;
}

.queue-item.current {
  border-color: #67C23A;
  background: #F0F9EB;
}

.queue-seq {
  width: 28px;
  height: 28px;
  background: #1E88E5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.queue-item.current .queue-seq {
  background: #67C23A;
}

.queue-info { flex: 1; }

.queue-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
}

.queue-gender, .queue-age {
  font-size: 12px;
  color: #909399;
}

.queue-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.queue-expand-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  margin-bottom: 8px;
  overflow: hidden;
}

.expand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FAFCFF;
  border-bottom: 1px solid #EBEEF5;
}

.expand-header span {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.expand-search {
  display: flex;
  gap: 8px;
  align-items: center;
}

.expand-search .el-input {
  width: 150px;
}

.expand-body {
  padding: 12px;
}

.expand-table {
  border: 1px solid #EBEEF5;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.expand-table-header {
  display: flex;
  background: #F5F7FA;
  border-bottom: 1px solid #EBEEF5;
}

.expand-th {
  flex: 1;
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-align: center;
  min-width: 60px;
}

.expand-table-row {
  display: flex;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  transition: background 0.2s;
}

.expand-table-row:last-child {
  border-bottom: none;
}

.expand-table-row:hover {
  background: #F5F7FA;
}

.expand-table-row.active {
  background: #E3F2FD;
}

.expand-td {
  flex: 1;
  padding: 10px 8px;
  font-size: 12px;
  color: #303133;
  text-align: center;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-pagination {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.queue-table {
  border: 1px solid #EBEEF5;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.queue-table-header {
  display: flex;
  background: #F5F7FA;
  border-bottom: 1px solid #EBEEF5;
}

.queue-th {
  flex: 1;
  padding: 8px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #606266;
  text-align: center;
  min-width: 40px;
}

.queue-table-row {
  display: flex;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  transition: background 0.2s;
}

.queue-table-row:last-child {
  border-bottom: none;
}

.queue-table-row:hover {
  background: #F5F7FA;
}

.queue-table-row.active {
  background: #E3F2FD;
}

.queue-td {
  flex: 1;
  padding: 8px 6px;
  font-size: 11px;
  color: #303133;
  text-align: center;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 中间列样式 */
.no-patient {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.work-nav-bar {
  display: flex;
  gap: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  padding: 4px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.nav-item {
  padding: 8px 20px;
  font-size: 13px;
  color: #606266;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #F5F7FA;
  color: #303133;
}

.nav-item.active {
  background: #1E88E5;
  color: white;
  font-weight: 500;
}

.work-content-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #F5F7FA;
  border-radius: 8px;
  padding: 12px;
}

.work-section {
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #FAFCFF;
  border-bottom: 1px solid #E8F4FD;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.section-body {
  padding: 16px;
}

.form-row {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.field-label.req::before {
  content: '*';
  color: #E53935;
  margin-right: 4px;
}

/* 医嘱录入 */
.order-tab-content {
  padding: 0;
}

.drug-search-panel {
  padding: 12px;
  border-bottom: 1px solid #F0F0F0;
}

.order-type-tabs {
  margin-bottom: 12px;
}

.drug-search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.drug-list-wrap {
  max-height: 300px;
  overflow-y: auto;
}

.drug-category-group {
  border-bottom: 1px solid #F0F0F0;
}

.drug-category-label {
  background: #F5F7FA;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.cat-count {
  font-weight: 400;
  color: #909399;
  font-size: 11px;
}

.drug-result-row {
  padding: 10px 12px;
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background 0.15s;
}

.drug-result-row:last-child {
  border-bottom: none;
}

.drug-result-row:hover {
  background: #F0F7FF;
}

.drug-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.drug-row-sub {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drug-name {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
  white-space: nowrap;
}

.drug-spec {
  font-size: 11px;
  color: #909399;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drug-price {
  font-size: 13px;
  color: #E53935;
  font-weight: 600;
  min-width: 48px;
}

.drug-pagination {
  padding: 12px;
  border-top: 1px solid #F0F0F0;
}

.order-bottom {
  padding: 12px;
}

.order-list-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.order-table {
  font-size: 12px;
}

/* 检验检查申请 */
.exam-request-panel {
  padding: 0;
}

.exam-request-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.exam-items-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.exam-item-card {
  background: #fff;
  border: 1px solid #E0E6ED;
  border-radius: 8px;
  padding: 16px;
  padding-bottom: 48px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.exam-item-card:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
}

.exam-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exam-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.exam-item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exam-price {
  font-size: 16px;
  font-weight: 700;
  color: #E53935;
}

.exam-category {
  font-size: 12px;
  color: #909399;
}

.exam-reference {
  font-size: 12px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.5;
}

.exam-item-card .el-button {
  position: absolute;
  bottom: 12px;
  right: 12px;
}

/* 检查结果 */
.exam-results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-result-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
  border-left: 4px solid #1565C0;
}

.exam-result-card.abnormal {
  border-left-color: #E53935;
}

.exam-result-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #FAFAFA;
  gap: 12px;
}

.exam-result-icon {
  font-size: 24px;
}

.exam-result-info {
  flex: 1;
}

.exam-result-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.exam-result-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.exam-result-body {
  padding: 16px;
}

.imaging-section {
  margin-bottom: 16px;
}

.imaging-section:last-child {
  margin-bottom: 0;
}

.imaging-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.imaging-content {
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  background: #F9F9F9;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
}

.exam-result-card.abnormal .imaging-content {
  background: #FFF5F5;
}

.exam-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #F5F8FF;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid #E8EEF7;
}

.exam-page-info {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.exam-result-footer {
  padding: 10px 16px;
  background: #FAFCFF;
  border-top: 1px dashed #E8F4FD;
}

.conclusion-text {
  font-size: 13px;
  color: #5A3E85;
  font-weight: 500;
}

/* 转诊申请 */
.referral-panel {
  padding: 0;
}

.referral-form-preview {
  margin-top: 16px;
}

/* 住院证 */
.hospitalization-panel {
  padding: 0;
}

.hospitalization-form-preview {
  margin-top: 16px;
}

/* 右列面板 */
.diagnosis-panel {
  flex: 1;
  overflow: hidden;
  min-height: 400px;
}

.diag-common-section {
  margin-bottom: 12px;
  padding: 8px;
  background: #F0F9FF;
  border-radius: 4px;
  border: 1px solid #E0F2FE;
}

.diag-common-section .section-title {
  font-size: 12px;
  font-weight: 600;
  color: #1E88E5;
  margin-bottom: 8px;
}

.diag-common-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diag-common-tag {
  cursor: pointer;
  font-size: 12px;
}

.diag-common-tag:hover {
  opacity: 0.8;
}

.diag-search-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.diag-results {
  margin-bottom: 12px;
  max-height: 120px;
  overflow-y: auto;
}

.diag-result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-size: 12px;
  background: #FAFAFA;
  border-radius: 4px;
  margin-bottom: 6px;
}

.icd-code {
  font-size: 11px;
  color: #909399;
  width: 60px;
  flex-shrink: 0;
  font-family: monospace;
}

.diag-result-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diag-selected {
  margin-bottom: 20px;
}

.diag-selected .section-title {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 45px;
}

/* 减小无诊断空状态的高度 */
.diag-selected :deep(.el-empty) {
  padding: 10px 0;
}

.diag-selected :deep(.el-empty__image) {
  width: 32px !important;
  height: 32px !important;
}

.diag-selected :deep(.el-empty__description) {
  margin-top: 4px;
  font-size: 12px;
}

.diag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-size: 12px;
  line-height: 1.5;
  background: #FAFAFA;
  border-radius: 4px;
  margin-bottom: 6px;
}

.diag-row.diag-main {
  background: #F0F9FF;
  border-left: 2px solid #1E88E5;
}

.diag-icd {
  font-size: 11px;
  color: #909399;
  width: 60px;
  flex-shrink: 0;
  font-family: monospace;
}

.diag-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-diag-btn {
  margin-bottom: 12px;
}

.action-bar {
  padding: 8px 0;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  border-top: 1px solid #F0F0F0;
  margin-top: 8px;
}

.action-bar kbd {
  font-size: 10px;
  background: rgba(0,0,0,0.1);
  padding: 1px 3px;
  border-radius: 2px;
  margin-left: 4px;
}

/* 热词包装器 */
.hot-keywords-wrapper {
  flex: 1;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  min-height: 200px;
}

/* 退出确认弹窗 */
:deep(.logout-dialog-content) {
  text-align: center;
  padding: 24px 0;
}
:deep(.logout-dialog-content p) {
  margin: 10px 0;
  color: #4A5568;
  font-size: 15px;
}
:deep(.logout-hint) {
  font-size: 13px;
  color: #A0AEC0 !important;
}

/* 检验报告通知样式 */
.exam-notification-item {
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.exam-notification-item:hover {
  border-color: #409EFF;
  background: #F0F7FF;
}

.en-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.en-patient {
  font-weight: 600;
  color: #303133;
}

.en-exam {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.en-conclusion {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.en-date {
  font-size: 11px;
  color: #C0C4CC;
  margin-top: 4px;
}

/* 复诊患者样式 */
.revisit-patient-item {
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.revisit-patient-item:hover {
  border-color: #67C23A;
  background: #F0F9EB;
}

.rp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rp-name {
  font-weight: 600;
  color: #303133;
}

.rp-queue {
  margin-left: auto;
  font-size: 12px;
  color: #67C23A;
  font-weight: 600;
}

.rp-exam {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.rp-conclusion {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-phone {
  font-size: 11px;
  color: #C0C4CC;
  margin-top: 4px;
}

.detail-title {
  font-weight: 600;
  font-size: 14px;
  margin: 12px 0 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #409EFF;
  display: inline-block;
}

.detail-pre {
  background: #F8F9FA;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
}

.flag {
  color: #E53935;
  font-weight: 600;
}
</style>