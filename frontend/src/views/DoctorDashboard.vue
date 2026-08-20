<template>
  <div class="his-layout">
    <!-- 全局 Toast 提示 -->
    <div v-if="toastMsg" :class="['global-toast', 'toast-'+toastType]">{{ toastMsg }}</div>

    <!-- 顶部主导航栏 -->
    <header class="top-bar">
      <div class="top-left">
        <div class="menu-icon">☰</div>
        <div class="system-logo">
          <span class="logo-icon">⊕</span>
          <span class="logo-text">医院信息系统</span>
        </div>
        <div class="tab-list">
          <div v-for="tab in workTabs" :key="tab.id"
            :class="['work-tab', activeTab === tab.id ? 'active' : '']"
            @click="activeTab = tab.id">
            {{ tab.label }}
            <span class="tab-close" @click.stop="closeTab(tab.id)">×</span>
          </div>
        </div>
      </div>
      <div class="top-right">
        <span class="top-icon" title="通知">🔔</span>
        <span class="top-divider">|</span>
        <span class="top-icon" title="设置" @click="activeModule='settings'">⚙</span>
        <div class="user-avatar-wrap" @click="showUserMenu = !showUserMenu">
          <span class="user-dept">{{ currentUser?.nickname || currentUser?.real_name || '医生' }}</span>
          <span class="dropdown-arrow">▾</span>
          <div v-if="showUserMenu" class="user-menu">
            <div class="user-menu-item" @click="openProfile">个人中心</div>
            <div class="user-menu-item" @click="handleLogout">退出登录</div>
          </div>
        </div>
      </div>
    </header>

    <div class="body-wrap">
      <!-- 左侧图标导航栏 -->
      <nav class="icon-nav">
        <div v-for="item in iconNavItems" :key="item.id"
          :class="['icon-nav-item', activeModule === item.id ? 'active' : '']"
          :title="item.label" @click="activeModule = item.id">
          <span class="icon">{{ item.icon }}</span>
        </div>
      </nav>

      <!-- 主内容区 -->
      <div class="main-area">

        <!-- ============ 门诊工作台 ============ -->
        <div v-if="activeModule === 'clinic'" class="clinic-wrap">
          <!-- 顶部操作栏 -->
          <div class="clinic-topbar">
            <div class="clinic-search-wrap">
              <input v-model="clinicSearch" @keyup.enter="searchPatient"
                placeholder="请输入姓名/身份证/手机号码" class="clinic-search" />
              <button class="btn-blue" @click="searchPatient">🔍 搜索</button>
              <button class="btn-gray">🪪 读卡</button>
            </div>
            <div class="clinic-actions">
              <button class="btn-outline" @click="handleFinishVisit" title="结束当前就诊">诊出</button>
              <button class="btn-outline btn-red" @click="handleRecall" title="重新叫号">重呼</button>
              <button class="btn-outline" @click="handleCallNext" title="呼叫下一位">下一位</button>
              <button class="btn-outline" @click="handleSkip" title="跳过当前">过号</button>
              <button class="btn-outline" @click="showQuickRegModal = true">快速登记</button>
            </div>
          </div>

          <!-- 三栏内容区 -->
          <div class="clinic-body">
            <!-- 左侧：患者列表 -->
            <div class="clinic-left">
              <div class="panel-tabs">
                <span :class="['ptab', clinicLeftTab==='list'?'active':'']" @click="clinicLeftTab='list'">
                  患者列表 <b>{{ queueList.length }}</b>
                </span>
                <span :class="['ptab', clinicLeftTab==='current'?'active':'']" @click="clinicLeftTab='current'">
                  当前患者
                </span>
              </div>

              <!-- 患者列表 -->
              <div v-if="clinicLeftTab==='list'" class="patient-scroll">
                <div v-for="p in filteredQueue" :key="p.reg_id"
                  :class="['patient-row', selectedPatient?.reg_id===p.reg_id?'selected':'']"
                  @click="selectPatient(p)">
                  <div class="p-num">{{ p.seq }}</div>
                  <div class="p-info">
                    <div class="p-name">{{ p.name }}</div>
                    <div class="p-sub">{{ p.gender }} {{ p.age }}岁 · {{ p.insurance_type }}</div>
                  </div>
                  <div class="p-right">
                    <div class="p-time"></div>
                    <div :class="['p-status', p.status==='calling'?'status-active':p.status==='skip'?'status-skip':'status-wait']">{{ p.status==='calling'?'就诊中':p.status==='done'?'已完成':p.status==='skip'?'过号':'候诊' }}</div>
                  </div>
                </div>
                <div v-if="filteredQueue.length===0" class="empty-tip">暂无患者</div>
              </div>

              <!-- 当前患者详情 -->
              <div v-if="clinicLeftTab==='current'" class="current-patient">
                <template v-if="selectedPatient">
                  <div class="cp-header">
                    <div class="cp-avatar">👤</div>
                    <div class="cp-base">
                      <div class="cp-name">{{ selectedPatient.name }}</div>
                      <div class="cp-meta">
                        {{ selectedPatient.gender }} {{ selectedPatient.age }}岁
                        <span class="tag-first">{{ selectedPatient.visitType }}</span>
                      </div>
                      <div class="cp-id">{{ selectedPatient.insurance_type }} | ID: {{ selectedPatient.patient_id }}</div>
                    </div>
                  </div>
                  <div class="cp-tags">
                    <span v-if="selectedPatient.chronic_disease" class="cp-tag">{{ selectedPatient.chronic_disease }}</span>
                    <span v-if="selectedPatient.allergy" class="cp-tag">过敏: {{ selectedPatient.allergy }}</span>
                  </div>
                  <div class="func-menu">
                    <div v-for="menu in leftMenus" :key="menu.label"
                      class="func-menu-item" @click="menu.action && menu.action()">
                      {{ menu.label }} <span class="arrow">›</span>
                    </div>
                  </div>
                  <div v-if="(selectedPatient as any).historyDiag?.length" class="history-diag">
                    <div class="hd-title">历史诊断</div>
                    <div v-for="hd in (selectedPatient as any).historyDiag" :key="hd.date" class="hd-item">
                      <div class="hd-dot"></div>
                      <div class="hd-content">
                        <div class="hd-meta"><span class="hd-date">{{ hd.date }}</span><span class="hd-dept">{{ hd.dept }}</span></div>
                        <div class="hd-desc">{{ hd.desc }}</div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="empty-tip">请从患者列表选择患者</div>
              </div>
            </div>

            <!-- 中栏：医嘱区域 -->
            <div class="clinic-mid">
              <div class="order-type-tabs">
                <span v-for="ot in orderTypes" :key="ot.key"
                  :class="['otab', activeOrderType===ot.key?'active':'']"
                  @click="activeOrderType=ot.key">
                  <span class="otab-icon">{{ ot.icon }}</span> {{ ot.label }}
                </span>
                <span class="otab refresh" @click="refreshOrders">🔄 刷新</span>
              </div>

              <div class="order-actions">
                <button class="oa-btn" @click="printOrders">🖨 打印</button>
                <button class="oa-btn" @click="showAddOrderModal=true">✏ 添加</button>
                <button class="oa-btn" @click="abolishSelected">🗑 作废</button>
                <button class="oa-btn" @click="sendSelected">📤 发送</button>
                <button class="oa-btn" @click="recallSelected">↩ 撤回</button>
                <button class="oa-btn" @click="saveAsTemplate">📋 存为组套</button>
              </div>

              <div class="order-table-wrap">
                <table class="order-table">
                  <thead>
                    <tr>
                      <th width="30"><input type="checkbox" @change="toggleAllOrders" /></th>
                      <th>医嘱内容</th>
                      <th>数量</th>
                      <th>金额</th>
                      <th>医嘱状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in currentOrders" :key="order.id"
                      :class="selectedOrderIds.includes(order.id)?'order-selected':''">
                      <td><input type="checkbox" :checked="selectedOrderIds.includes(order.id)"
                        @change="toggleOrder(order.id)" /></td>
                      <td>
                        <div class="order-name">{{ order.name }}</div>
                        <div class="order-sub">{{ order.sub }}</div>
                      </td>
                      <td>{{ order.qty }}</td>
                      <td>{{ order.fee }}</td>
                      <td><span :class="['order-status', order.statusClass]">{{ order.statusLabel }}</span></td>
                      <td>
                        <span v-if="order.status==='pending'" class="op-link" @click="abolishOrder(order.id)">作废</span>
                        <span v-if="order.status==='sent'" class="op-link" @click="recallOrder(order.id)">撤回</span>
                      </td>
                    </tr>
                    <tr v-if="!currentOrders.length">
                      <td colspan="6" class="empty-tip">暂无医嘱，点击"添加"开始开医嘱</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="order-total">总计：<span class="total-amount">¥ {{ orderTotal }}</span></div>
            </div>

            <!-- 右栏：病历区域 -->
            <div class="clinic-right">
              <div class="record-type-tabs">
                <span v-for="rt in recordTypes" :key="rt"
                  :class="['rtab', activeRecordType===rt?'active':'']"
                  @click="activeRecordType=rt">{{ rt }}</span>
              </div>

              <div class="record-actions">
                <button class="ra-btn" @click="signRecord">✒ 签名</button>
                <button class="ra-btn" @click="draftRecord">📋 暂存</button>
                <button class="ra-btn" @click="printRecord">🖨 打印</button>
                <button :class="['ra-btn', recordEditing?'ra-active':'']" @click="recordEditing=!recordEditing">
                  {{ recordEditing ? '👁 预览' : '✏ 编辑' }}
                </button>
                <button class="ra-btn ra-save" @click="saveRecord">💾 保存</button>
              </div>

              <!-- 病历展示模式 -->
              <div v-if="!recordEditing" class="record-content">
                <div v-for="field in recordDisplayFields" :key="field.key" class="rc-field">
                  <span class="rc-label">{{ field.label }}：</span>
                  <span class="rc-value">{{ currentRecord[field.key as keyof typeof currentRecord] || '（未填写）' }}</span>
                </div>
              </div>

              <!-- 病历编辑模式 -->
              <div v-if="recordEditing" class="record-edit">
                <div v-for="field in recordDisplayFields" :key="field.key" class="re-field">
                  <label class="re-label">{{ field.label }}</label>
                  <textarea v-model="(currentRecord as any)[field.key]"
                    :placeholder="'请输入' + field.label"
                    class="re-textarea" :rows="field.rows || 2"></textarea>
                </div>
              </div>

              <!-- 诊断区 -->
              <div class="diag-section">
                <div class="diag-actions">
                  <button class="da-btn" @click="saveRecord">💾 保存病历</button>
                  <button class="da-btn" @click="addDiagRow">+ 添加诊断</button>
                </div>
                <table class="diag-table">
                  <thead>
                    <tr><th>ICD</th><th>诊断名称</th><th>主诊</th><th>疑似</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(diag, idx) in currentRecord.diagnoses" :key="idx">
                      <td><input v-model="diag.icd" class="diag-input" /></td>
                      <td><input v-model="diag.name" class="diag-input wide" /></td>
                      <td><input type="radio" :name="'main'+idx" :checked="diag.isMain" @change="diag.isMain=true" /></td>
                      <td><input type="checkbox" v-model="diag.abolished" /></td>
                      <td><span class="op-link red" @click="removeDiag(idx)">删除</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ 挂号工作台 ============ -->
        <div v-if="activeModule==='register'" class="register-wrap">
          <div class="reg-left">
            <div class="panel-tabs">
              <span :class="['ptab', regLeftTab==='info'?'active':'']" @click="regLeftTab='info'">挂号信息</span>
              <span :class="['ptab', regLeftTab==='patient'?'active':'']" @click="regLeftTab='patient'">患者信息</span>
              <span class="clear-btn" @click="clearRegForm">清空</span>
            </div>
            <div class="reg-form">
              <div class="rf-row">
                <label>身份类别：</label>
                <select v-model="regForm.idType" class="rf-select">
                  <option>自费</option><option>居民医保</option><option>职工医保</option><option>商业保险</option>
                </select>
              </div>
              <div class="rf-row">
                <label>就 诊 卡：</label>
                <div class="rf-card-wrap">
                  <input v-model="regForm.cardNo" class="rf-input" @keyup.enter="lookupPatient" />
                  <button class="btn-blue sm" @click="lookupPatient">🔍</button>
                  <button class="btn-blue sm">🪪 读卡</button>
                </div>
              </div>
              <div class="rf-hint">按 <b class="key-f2">F2</b> 键读卡 | 按 <b class="key-enter">Enter</b> 键查询</div>
              <div class="rf-row">
                <label>姓　　名：</label>
                <input v-model="regForm.name" class="rf-input" />
                <label class="ml">性　　别：</label>
                <input v-model="regForm.gender" class="rf-input sm" />
              </div>
              <div class="rf-row">
                <label>出生日期：</label>
                <input v-model="regForm.birthDate" class="rf-input" type="date" />
                <label class="ml">年　　龄：</label>
                <input v-model="regForm.age" class="rf-input sm" />
              </div>
              <div class="rf-row">
                <label>联系电话：</label>
                <input v-model="regForm.phone" class="rf-input full" />
              </div>
              <div class="rf-row">
                <label>身份证号：</label>
                <input v-model="regForm.idCard" class="rf-input full" />
              </div>
              <div class="rf-row">
                <label>现住地址：</label>
                <input v-model="regForm.address" class="rf-input full" />
              </div>
              <div class="rf-row">
                <label>联系人关系：</label>
                <select v-model="regForm.contactRel" class="rf-select sm">
                  <option>父亲</option><option>母亲</option><option>配偶</option><option>子女</option>
                </select>
                <label class="ml">联系人姓名：</label>
                <input v-model="regForm.contactName" class="rf-input sm" />
              </div>
              <div class="rf-row">
                <label>联系人电话：</label>
                <input v-model="regForm.contactPhone" class="rf-input full" />
              </div>
              <div class="rf-row">
                <label>挂号费别：</label>
                <select v-model="regForm.feeType" class="rf-select sm">
                  <option>免费号</option><option>普通号</option><option>专家号</option>
                </select>
                <label class="ml">结算类别：</label>
                <select v-model="regForm.settleType" class="rf-select sm">
                  <option>自费</option><option>居民医保</option><option>职工医保</option>
                </select>
              </div>
              <div class="rf-serial">
                <div>当前流水号 <span class="serial-num">{{ regForm.serialNo }}</span></div>
                <div>当前发票号 <span class="serial-link">{{ regForm.invoiceNo }}</span></div>
              </div>
              <div class="rf-operator">
                <div>操作员：{{ currentUser?.real_name || '操作员' }}</div>
                <div>工　号：{{ currentUser?.id || '000' }}</div>
              </div>
            </div>
          </div>

          <div class="reg-right">
            <div class="panel-tabs">
              <span :class="['ptab', regRightTab==='schedule'?'active':'']" @click="regRightTab='schedule'">号表信息</span>
              <span :class="['ptab', regRightTab==='registered'?'active':'']" @click="regRightTab='registered'">已挂号</span>
            </div>
            <div class="reg-filter">
              <label><input type="checkbox" v-model="regFilter.afternoon" /> 下午</label>
              <div class="filter-item">
                <span>挂号科室</span>
                <input v-model="regFilter.dept" class="filter-input" placeholder="呼吸内科" />
              </div>
              <div class="filter-item">
                <span>挂号医生</span>
                <input v-model="regFilter.doctor" class="filter-input" placeholder="李*晓" />
              </div>
            </div>

            <!-- 号表网格 -->
            <div v-if="regRightTab==='schedule'" class="schedule-grid">
              <div v-for="dept in scheduleData" :key="dept.name"
                :class="['sch-card', selectedDept===dept.name?'selected':'']"
                @click="selectedDept=dept.name">
                <div class="sch-card-title">{{ dept.name }}</div>
                <div class="sch-nums">
                  <div class="sch-num-item"><span class="num">{{ dept.normal }}</span><span class="nlabel">普</span></div>
                  <div class="sch-num-item"><span class="num">{{ dept.expert }}</span><span class="nlabel">专</span></div>
                  <div class="sch-num-item"><span :class="['num', dept.famous===0?'zero':'']">{{ dept.famous }}</span><span class="nlabel">名</span></div>
                </div>
                <div class="sch-nums">
                  <div class="sch-num-item"><span class="num">{{ dept.emergency }}</span><span class="nlabel">急</span></div>
                  <div class="sch-num-item"><span class="num">{{ dept.simple }}</span><span class="nlabel">简</span></div>
                </div>
              </div>
            </div>

            <!-- 医生号源卡片 -->
            <div v-if="regRightTab==='schedule'" class="doctor-cards">
              <div v-for="dc in doctorCards" :key="dc.name"
                :class="['doc-card', dc.typeClass?'type-'+dc.typeClass:'', selectedDoctor===dc.name?'doc-selected':'']"
                @click="selectedDoctor=dc.name; regFee=String(dc.fee)">
                <div v-if="dc.type" :class="['doc-type-tag','tag-'+dc.typeClass]">{{ dc.type }}</div>
                <div class="doc-avatar">👤</div>
                <div class="doc-name">{{ dc.name }}</div>
                <div class="doc-count"><span>👥</span> {{ dc.count }}</div>
              </div>
            </div>

            <!-- 已挂号列表 -->
            <div v-if="regRightTab==='registered'" class="registered-list">
              <table class="bill-table">
                <thead><tr><th>序号</th><th>患者姓名</th><th>科室</th><th>医生</th><th>时间</th><th>状态</th></tr></thead>
                <tbody>
                  <tr v-for="r in registrations" :key="r.id">
                    <td>{{ r.seq }}</td>
                    <td>{{ r.patientName }}</td>
                    <td>{{ r.dept }}</td>
                    <td>{{ r.doctor }}</td>
                    <td>{{ r.registerDate }}</td>
                    <td><span :class="['bill-status', r.status==='done'?'status-paid':'status-pending-bill']">{{ r.statusLabel }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="reg-footer">
              <div class="reg-fee">收款：<span class="fee-amount">¥ {{ regFee }}</span></div>
              <button class="btn-register" @click="handleRegister">挂号 (Ctrl+Enter)</button>
            </div>
          </div>
        </div>

        <!-- ============ 收费工作台 ============ -->
        <div v-if="activeModule==='billing'" class="billing-wrap">
          <div class="bill-left">
            <div class="panel-tabs">
              <span :class="['ptab', billLeftTab==='patient'?'active':'']" @click="billLeftTab='patient'">患者信息</span>
              <span :class="['ptab', billLeftTab==='pending'?'active':'']" @click="billLeftTab='pending'">待缴费列表</span>
              <span class="clear-btn" @click="clearBillForm">清空</span>
            </div>
            <div class="bill-form">
              <div class="bf-row">
                <label>身份类别：</label>
                <select v-model="billForm.idType" class="bf-select">
                  <option>请选择身份类别</option><option>自费</option><option>居民医保</option><option>职工医保</option>
                </select>
              </div>
              <div class="bf-row">
                <label>就 诊 卡</label>
                <input v-model="billForm.cardNo" class="bf-input" @keyup.enter="lookupBillPatient" />
                <button class="btn-blue sm" @click="lookupBillPatient">🔍</button>
              </div>
              <div class="bf-hint">按 <b class="key-enter">Enter</b> 键读取患者信息</div>
              <div class="bf-row"><label>患者姓名：</label><input v-model="billForm.name" class="bf-input full" /></div>
              <div class="bf-row"><label>性别：</label><input v-model="billForm.gender" class="bf-input full" /></div>
              <div class="bf-row"><label>年龄：</label><input v-model="billForm.age" class="bf-input full" /></div>
              <div class="bf-row">
                <label>结算类别：</label>
                <select v-model="billForm.settleType" class="bf-select">
                  <option>请选择结算类别</option><option>自费</option><option>医保</option>
                </select>
              </div>
              <div class="bf-serial">
                <div>流水号：<span class="serial-num">{{ billForm.serialNo }}</span></div>
                <div>发票号：<span class="serial-link">{{ billForm.invoiceNo }}</span></div>
              </div>
              <div class="bf-operator">
                <div>操作员：{{ currentUser?.real_name }}</div>
                <div>工　号：{{ currentUser?.id }}</div>
              </div>
              <button class="btn-blue full-btn" style="margin-top:12px" @click="handleCharge">💰 收费</button>
            </div>
          </div>

          <div class="bill-right">
            <div class="bill-right-title">已收费列表</div>
            <div class="bill-filter">
              <div class="bf-item">
                <select v-model="billFilter.status" class="bf-filter-select">
                  <option>全部收费状态</option><option>已收费</option><option>已退费</option>
                </select>
              </div>
              <div class="bf-item">
                <input v-model="billFilter.dateRange" class="bf-date-input" placeholder="日期范围" />
              </div>
              <div class="bf-item">
                <input v-model="billFilter.keyword" class="bf-kw-input" placeholder="患者姓名/流水号/发票号" />
                <button class="btn-blue" @click="doSearchBilling">🔍 搜索</button>
              </div>
            </div>

            <div class="bill-table-wrap">
              <table class="bill-table">
                <thead>
                  <tr>
                    <th></th><th>序号</th><th>就诊号</th><th>流水号</th><th>患者姓名</th>
                    <th>身份类型</th><th>总金额</th><th>自付金额</th>
                    <th>发票号</th><th>收费日期</th><th>收费员</th><th>收费状态</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in displayedBillingList" :key="row.id"
                    :class="selectedBillRow===idx?'selected-row':''" @click="selectBillRow(idx)">
                    <td><input type="radio" :checked="selectedBillRow===idx" /></td>
                    <td>{{ (idx as number)+1 }}</td>
                    <td>{{ row.visitNo }}</td>
                    <td>{{ row.serialNo }}</td>
                    <td>{{ row.patientName }}</td>
                    <td>{{ row.idType }}</td>
                    <td>{{ row.total }}</td>
                    <td :class="['bold-amt', row.selfAmt>0?'red-amt':'']">{{ row.selfAmt }}</td>
                    <td>{{ row.invoiceNo }}</td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.cashier }}</td>
                    <td><span :class="['bill-status', row.statusClass]">{{ row.statusLabel }}</span></td>
                    <td>
                      <span v-if="row.canRefund" class="op-link" @click.stop="doRefund(row.id)">退费</span>
                      <span v-else class="op-disabled">退费</span>
                    </td>
                  </tr>
                  <tr v-if="!displayedBillingList.length">
                    <td colspan="13" class="empty-tip">暂无收费记录</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 收费明细 -->
            <div class="bill-detail">
              <div class="bd-title">| 收费明细</div>
              <table class="bill-table">
                <thead>
                  <tr><th>序号</th><th>费用名称</th><th>数量</th><th>单位</th><th>单价</th><th>总金额</th><th>折扣</th><th>自付金额</th><th>执行科室</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(d, idx) in currentBillDetails" :key="idx">
                    <td>{{ (idx as number)+1 }}</td><td>{{ d.name }}</td><td>{{ d.qty }}</td><td>{{ d.unit }}</td>
                    <td>{{ d.price }}</td><td>{{ d.total }}</td><td>{{ d.discount }}</td>
                    <td class="bold-amt">{{ d.selfAmt }}</td><td>{{ d.dept }}</td>
                  </tr>
                  <tr v-if="!currentBillDetails.length">
                    <td colspan="9" class="empty-tip">请选择左侧收费记录查看明细</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ===== 添加医嘱弹窗 ===== -->
    <div v-if="showAddOrderModal" class="modal-overlay" @click.self="showAddOrderModal=false">
      <div class="modal-box">
        <div class="modal-header">
          <span>添加医嘱</span>
          <span class="modal-close" @click="showAddOrderModal=false">×</span>
        </div>
        <div class="modal-body">
          <div class="mf-row"><label>医嘱名称</label><input v-model="newOrder.name" placeholder="如：阿莫西林胶囊" /></div>
          <div class="mf-row"><label>用法说明</label><input v-model="newOrder.sub" placeholder="如：口服 每日三次 西药房" /></div>
          <div class="mf-row">
            <label>数量</label><input v-model.number="newOrder.qty" type="number" min="1" />
            <label style="margin-left:12px">金额</label><input v-model="newOrder.fee" placeholder="0.00" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="mbtn cancel" @click="showAddOrderModal=false">取消</button>
          <button class="mbtn submit" @click="submitAddOrder">确认添加</button>
        </div>
      </div>
    </div>

    <!-- ===== 快速登记弹窗 ===== -->
    <div v-if="showQuickRegModal" class="modal-overlay" @click.self="showQuickRegModal=false">
      <div class="modal-box">
        <div class="modal-header">
          <span>快速登记就诊</span>
          <span class="modal-close" @click="showQuickRegModal=false">×</span>
        </div>
        <div class="modal-body">
          <div class="mf-row"><label>患者姓名 *</label><input v-model="quickReg.name" placeholder="请输入姓名" /></div>
          <div class="mf-row">
            <label>性别</label>
            <select v-model="quickReg.gender"><option>男</option><option>女</option></select>
            <label style="margin-left:12px">年龄</label>
            <input v-model="quickReg.age" placeholder="岁" style="width:60px" />
          </div>
          <div class="mf-row"><label>科室</label><input v-model="quickReg.dept" placeholder="如：内科" /></div>
        </div>
        <div class="modal-footer">
          <button class="mbtn cancel" @click="showQuickRegModal=false">取消</button>
          <button class="mbtn submit" @click="submitQuickReg">确认登记</button>
        </div>
      </div>
    </div>

    <!-- 个人资料编辑弹窗 -->
    <el-dialog v-model="profileDialogVisible" title="个人中心" width="450px" :close-on-click-modal="false">
      <el-form :model="profileForm" label-width="80px">
        <el-form-item label="头像">
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <div
              v-for="av in avatarOptions"
              :key="av"
              :class="['avatar-chip', profileForm.avatar === av ? 'selected' : '']"
              @click="profileForm.avatar = av"
              style="width:40px;height:40px;border:2px solid #ddd;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer"
            >{{ av }}</div>
          </div>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" placeholder="请输入昵称" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="profileForm.phone" placeholder="请输入手机号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="openPasswordChange">修改密码</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="profileLoading" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px" :close-on-click-modal="false">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useHisStore, type QueuePatient } from '@/stores/his'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const currentUser = userStore.currentUser
const logout = userStore.logout

const hisStore = useHisStore()
const queue = hisStore.todayPatients
const registrations = ref<any[]>([])
const billingRecords = ref<any[]>([])

// 用户菜单显示状态
const showUserMenu = ref(false)

// 本地 Toast
const toastMsg = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
  toastMsg.value = msg; toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

// 医啡相关：本地存档
// 医啡数据已经存在于 hisStore.currentRecord
const saveMedicalRecord = (_record: any) => { showToast('病历已保存', 'success') }
const signMedicalRecord = (_id: any) => { showToast('病历已签名', 'success') }

// 医嘱相关：本地存档
const orderList = ref<any[]>([])
const addOrder = (item: any) => { orderList.value.push({ ...item, id: 'o-' + Date.now(), statusClass: '' }) }
const storeAbolishOrder = (id: string) => {
  const o = orderList.value.find(x => x.id === id)
  if (o) { o.status = 'abolished'; o.statusLabel = '已作废'; o.statusClass = 'status-abolished' }
}
const storeRecallOrder = (id: string) => {
  const o = orderList.value.find(x => x.id === id)
  if (o) { o.status = 'pending'; o.statusLabel = '未发送'; o.statusClass = '' }
}
const sendOrders = (ids: string[]) => {
  ids.forEach(id => {
    const o = orderList.value.find(x => x.id === id)
    if (o) { o.status = 'sent'; o.statusLabel = '已发送'; o.statusClass = 'status-executed' }
  })
  showToast('医嘱已发送', 'success')
}

// 挂号相关：本地存档
const addRegistration = (item: any) => {
  registrations.value.push({ ...item, id: 'reg-' + Date.now() })
  // 同时加入候诊队列
  queue.value.push({
    reg_id: registrations.value.length,
    patient_id: registrations.value.length,
    name: item.patientName, gender: item.patientGender, age: parseInt(item.patientAge) || 0,
    insurance_type: item.settleType, allergy: '', chronic_disease: '',
    status: 'pending', seq: queue.value.length + 1,
  } as any)
  showToast(`挂号成功：${item.patientName}`, 'success')
}

// 收费相关：本地存档
const refundBilling = (id: string) => {
  const row = billingRecords.value.find((r: any) => r.id === id)
  if (row) { row.statusLabel = '已退费'; row.statusClass = 'status-refunded'; row.canRefund = false }
  showToast('退费成功', 'success')
}
const searchBilling = (kw: string, status: string) => {
  return billingRecords.value.filter((r: any) => {
    const matchKw = !kw || r.patientName?.includes(kw) || r.serialNo?.includes(kw)
    const matchStatus = status === '全部收费状态' || r.statusLabel === status
    return matchKw && matchStatus
  })
}

// 候诊相关
// 以 hisStore 方法为基础
const startVisit = (_id: any) => { /* 无操作 */ }
const callNext = () => { hisStore.callNext(0) }
const skipPatient = (id: any) => { hisStore.skipPatient(Number(id)) }
const finishVisit = (id: any) => { hisStore.finishVisit(Number(id)) }
const activeTab = ref('clinic')
const activeModule = ref('clinic')

const workTabs = ref([
  { id: 'clinic', label: '门诊医生工作台' },
  { id: 'inpatient', label: '住院医生工作台' },
])
const iconNavItems = [
  { id: 'clinic', label: '门诊工作台', icon: '👤' },
  { id: 'register', label: '挂号工作台', icon: '📋' },
  { id: 'billing', label: '收费工作台', icon: '💰' },
  { id: 'pharmacy', label: '药房', icon: '💊' },
  { id: 'lab', label: '检验', icon: '🔬' },
  { id: 'report', label: '报表', icon: '📊' },
]

const closeTab = (id: string) => {
  if (workTabs.value.length > 1) {
    workTabs.value = workTabs.value.filter(t => t.id !== id)
    if (activeTab.value === id) activeTab.value = workTabs.value[0].id
  }
}
const handleLogout = () => { logout(); router.push('/login') }

// 个人中心弹窗
const profileDialogVisible = ref(false)
const profileLoading = ref(false)
const profileForm = reactive({ nickname: '', phone: '', avatar: '' })
const passwordDialogVisible = ref(false)
const passwordLoading = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const avatarOptions = ['👤', '👨', '👩', '🧑', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍💼', '👩‍💼']

const openProfile = () => {
  showUserMenu.value = false
  profileForm.nickname = currentUser.value?.nickname || currentUser.value?.real_name || ''
  profileForm.phone = currentUser.value?.phone || ''
  profileForm.avatar = currentUser.value?.avatar || '👨‍⚕️'
  profileDialogVisible.value = true
}

const saveProfile = async () => {
  if (!currentUser.value) return
  profileLoading.value = true
  try {
    const res = await axios.put('/api/user/profile', {
      userId: currentUser.value.id,
      nickname: profileForm.nickname,
      phone: profileForm.phone,
      avatar: profileForm.avatar
    })
    currentUser.value = { ...currentUser.value, ...res.data }
    profileDialogVisible.value = false
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    profileLoading.value = false
  }
}

const openPasswordChange = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const changePassword = async () => {
  if (!passwordForm.oldPassword) { ElMessage.warning('请输入原密码'); return }
  if (!passwordForm.newPassword) { ElMessage.warning('请输入新密码'); return }
  if (passwordForm.newPassword.length < 6) { ElMessage.warning('新密码至少6位'); return }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) { ElMessage.warning('两次密码不一致'); return }
  passwordLoading.value = true
  try {
    await axios.put('/api/user/password', {
      userId: currentUser.value!.id,
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    passwordDialogVisible.value = false
    ElMessage.success('密码修改成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.error || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

// ===== 门诊工作台 =====
const clinicSearch = ref('')
const clinicLeftTab = ref<'list' | 'current'>('current')
const activeOrderType = ref('western')
const activeRecordType = ref('初诊')
const selectedPatient = ref<QueuePatient | null>(queue.value[0] || null)
const selectedOrderIds = ref<string[]>([])
const showAddOrderModal = ref(false)
const showQuickRegModal = ref(false)
const recordEditing = ref(false)

const queueList = computed(() => queue.value)
const filteredQueue = computed(() => {
  if (!clinicSearch.value) return queueList.value
  return queueList.value.filter(p => p.name.includes(clinicSearch.value))
})

const orderTypes = [
  { key: 'western', label: '西药', icon: '💊' },
  { key: 'chinese', label: '中药', icon: '🌿' },
  { key: 'lab', label: '检验', icon: '❤' },
  { key: 'exam', label: '检查', icon: '📷' },
  { key: 'treat', label: '治疗', icon: '🔄' },
  { key: 'history', label: '历史医嘱', icon: '🕐' },
]
const recordTypes = ['初诊', '复诊', '2型糖尿病病历', '高血压病历']

const leftMenus = [
  { label: '门诊', action: null },
  { label: '历史就诊', action: () => clinicLeftTab.value = 'current' },
  { label: '检验检查结果', action: () => activeModule.value = 'lab' },
  { label: '办理入院', action: () => showToast('办理入院功能开发中', 'info') },
  { label: '询问预约', action: () => showToast('预约查询功能开发中', 'info') },
  { label: '门诊小手术', action: () => showToast('小手术模块开发中', 'info') },
]

// 当前医嘱（来自本地 orderList）
const currentOrders = computed(() => {
  if (!selectedPatient.value) return orderList.value
  return orderList.value.filter((o: any) => o.patientId === selectedPatient.value!.reg_id)
})
const orderTotal = computed(() =>
  currentOrders.value.reduce((s: number, o: any) => s + parseFloat(o.fee || '0'), 0).toFixed(2)
)

// 当前病历（可编辑）—— 用 any 类型避免与 his.ts MedicalRecord 类型冲突
type LocalRecord = {
  id: string; patientId: string; patientName: string; doctorName: string;
  visitDate: string; visitType: string; chief: string; history: string;
  past: string; family: string; personal: string; allergy: string;
  physical: string; auxiliary: string; diagnosis: string; suggestion: string;
  diagnoses: { icd: string; name: string; isMain: boolean; abolished: boolean }[];
  status: 'draft' | 'saved' | 'signed'; createdAt: string; updatedAt: string;
}
const defaultRecord = (): LocalRecord => ({
  id: 'r-' + Date.now(),
  patientId: String(selectedPatient.value?.reg_id || ''),
  patientName: selectedPatient.value?.name || '',
  doctorName: currentUser.value?.real_name || 'Dr.',
  visitDate: new Date().toLocaleDateString('zh-CN'),
  visitType: activeRecordType.value,
  chief: '', history: '', past: '', family: '', personal: '',
  allergy: '', physical: '', auxiliary: '', diagnosis: '', suggestion: '',
  diagnoses: [{ icd: '', name: '', isMain: true, abolished: false }],
  status: 'draft', createdAt: '', updatedAt: '',
})

const currentRecord = ref<LocalRecord>(defaultRecord())

const recordDisplayFields = [
  { key: 'chief', label: '主诉', rows: 2 },
  { key: 'history', label: '现病史', rows: 4 },
  { key: 'past', label: '既往史', rows: 2 },
  { key: 'family', label: '家族史', rows: 2 },
  { key: 'personal', label: '个人史', rows: 2 },
  { key: 'allergy', label: '过敏史', rows: 1 },
  { key: 'physical', label: '体格检查', rows: 2 },
  { key: 'auxiliary', label: '辅助检查', rows: 2 },
  { key: 'diagnosis', label: '门诊诊断', rows: 1 },
  { key: 'suggestion', label: '处理意见', rows: 2 },
]

const selectPatient = (p: QueuePatient) => {
  selectedPatient.value = p
  clinicLeftTab.value = 'current'
  startVisit(p.reg_id)
  currentRecord.value = defaultRecord()
}

const searchPatient = () => {
  if (!clinicSearch.value) { showToast('请输入搜索关键词', 'info'); return }
  clinicLeftTab.value = 'list'
}

const handleCallNext = () => { callNext() }
const handleRecall = () => {
  if (selectedPatient.value) {
    showToast(`重呼：${selectedPatient.value.name}，请到诊室就诊`)
  }
}
const handleSkip = () => {
  if (selectedPatient.value) { skipPatient(selectedPatient.value.reg_id); selectedPatient.value = null }
  else showToast('请先选择患者', 'info')
}
const handleFinishVisit = () => {
  if (selectedPatient.value) {
    finishVisit(selectedPatient.value.reg_id)
    selectedPatient.value = null
    currentRecord.value = defaultRecord()
  } else showToast('请先选择患者', 'info')
}

// 医嘱操作
const refreshOrders = () => showToast('医嘱已刷新', 'info')
const toggleAllOrders = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  selectedOrderIds.value = checked ? currentOrders.value.map((o: any) => o.id) : []
}
const toggleOrder = (id: string) => {
  const idx = selectedOrderIds.value.indexOf(id)
  if (idx >= 0) selectedOrderIds.value.splice(idx, 1)
  else selectedOrderIds.value.push(id)
}
const abolishSelected = () => {
  if (!selectedOrderIds.value.length) { showToast('请先勾选医嘱', 'info'); return }
  selectedOrderIds.value.forEach(id => storeAbolishOrder(id))
  selectedOrderIds.value = []
}
const sendSelected = () => {
  if (!selectedOrderIds.value.length) { showToast('请先勾选医嘱', 'info'); return }
  sendOrders(selectedOrderIds.value)
  selectedOrderIds.value = []
}
const recallSelected = () => {
  if (!selectedOrderIds.value.length) { showToast('请先勾选医嘱', 'info'); return }
  selectedOrderIds.value.forEach(id => storeRecallOrder(id))
  selectedOrderIds.value = []
}
const printOrders = () => showToast('打印医嘱单...', 'info')
const saveAsTemplate = () => showToast('已存为组套', 'success')

const abolishOrder = (id: string) => storeAbolishOrder(id)
const recallOrder = (id: string) => storeRecallOrder(id)

// 添加医嘱
const newOrder = reactive({ name: '', sub: '', qty: 1, fee: '' })
const submitAddOrder = () => {
  if (!newOrder.name) { showToast('请输入医嘱名称', 'error'); return }
  if (!selectedPatient.value) { showToast('请先选择患者', 'error'); return }
  addOrder({
    patientId: selectedPatient.value.reg_id,
    recordId: currentRecord.value.id,
    name: newOrder.name, sub: newOrder.sub, qty: newOrder.qty, fee: newOrder.fee || '0.00',
    status: 'pending', statusLabel: '未发送', statusClass: '',
  })
  Object.assign(newOrder, { name: '', sub: '', qty: 1, fee: '' })
  showAddOrderModal.value = false
}

// 病历操作
const saveRecord = () => {
  if (!selectedPatient.value) { showToast('请先选择患者', 'error'); return }
  currentRecord.value.patientId = String(selectedPatient.value.reg_id)
  currentRecord.value.patientName = selectedPatient.value.name
  currentRecord.value.visitType = activeRecordType.value
  currentRecord.value.status = 'saved'
  saveMedicalRecord({ ...currentRecord.value })
  recordEditing.value = false
}
const draftRecord = () => {
  if (!selectedPatient.value) { showToast('请先选择患者', 'error'); return }
  currentRecord.value.status = 'draft'
  saveMedicalRecord({ ...currentRecord.value })
  showToast('病历已暂存为草稿')
}
const signRecord = () => {
  if (!selectedPatient.value) { showToast('请先选择患者', 'error'); return }
  saveRecord()
  signMedicalRecord(currentRecord.value.id)
}
const printRecord = () => showToast('病历打印中...', 'info')

const addDiagRow = () => {
  currentRecord.value.diagnoses.push({ icd: '', name: '', isMain: false, abolished: false })
}
const removeDiag = (idx: number) => { currentRecord.value.diagnoses.splice(idx, 1) }

// 快速登记
const quickReg = reactive({ name: '', gender: '男', age: '', dept: '内科' })
const submitQuickReg = () => {
  if (!quickReg.name) { showToast('请输入患者姓名', 'error'); return }
  addRegistration({
    patientId: 'q-' + Date.now(),
    patientName: quickReg.name,
    patientGender: quickReg.gender,
    patientAge: quickReg.age + '岁',
    dept: quickReg.dept || '内科',
    doctor: currentUser.value?.real_name || '当前医生',
    feeType: '普通号',
    settleType: '自费',
    serialNo: '000' + Date.now(),
    invoiceNo: '00' + Math.floor(Math.random() * 99999),
    fee: '25.00',
    status: 'pending',
    statusLabel: '候诊',
    registerDate: new Date().toLocaleDateString('zh-CN'),
    seq: queue.value.length + 1,
  })
  Object.assign(quickReg, { name: '', gender: '男', age: '', dept: '内科' })
  showQuickRegModal.value = false
}

// ===== 挂号工作台 =====
const regLeftTab = ref<'info' | 'patient'>('info')
const regRightTab = ref<'schedule' | 'registered'>('schedule')
const selectedDept = ref('内科-呼吸内科')
const selectedDoctor = ref('李*')
const regFee = ref('25.00')

const regForm = reactive({
  idType: '自费', cardNo: '', name: '', gender: '男', birthDate: '', age: '',
  phone: '', idCard: '', address: '', contactRel: '父亲', contactName: '', contactPhone: '',
  feeType: '普通号', settleType: '自费',
  serialNo: '0001' + Date.now(), invoiceNo: '0026' + Math.floor(Math.random() * 99999),
})
const regFilter = reactive({ afternoon: false, dept: '', doctor: '' })

const scheduleData = ref([
  { name: '内科-高血压门诊', normal: 100, expert: 40, famous: 10, emergency: 100, simple: 40 },
  { name: '中医综合门诊', normal: 100, expert: 40, famous: 10, emergency: 100, simple: 40 },
  { name: '内科-呼吸内科', normal: 100, expert: 40, famous: 0, emergency: 100, simple: 40 },
  { name: '内科-高血压门诊', normal: 100, expert: 40, famous: 10, emergency: 100, simple: 40 },
  { name: '外科-普外科', normal: 80, expert: 30, famous: 5, emergency: 50, simple: 20 },
  { name: '儿科门诊', normal: 60, expert: 20, famous: 0, emergency: 40, simple: 30 },
])
const doctorCards = ref([
  { name: '普通号', type: '', typeClass: '', count: 48, fee: 10 },
  { name: '李*', type: '专家号', typeClass: 'expert', count: 48, fee: 30 },
  { name: '欧**丽', type: '知名专家号', typeClass: 'famous', count: 0, fee: 80 },
  { name: '吴*', type: '专家号', typeClass: 'expert', count: 20, fee: 30 },
  { name: '李*依', type: '急诊号', typeClass: 'emergency', count: 40, fee: 25 },
  { name: '王*', type: '简易门诊', typeClass: 'simple', count: 48, fee: 5 },
])

const lookupPatient = () => {
  if (!regForm.cardNo) return
  showToast('查询患者：' + regForm.cardNo, 'info')
  // 模拟填充
  regForm.name = '赵伟'; regForm.gender = '男'; regForm.age = '34'
}

const clearRegForm = () => {
  Object.assign(regForm, { cardNo: '', name: '', gender: '男', birthDate: '', age: '', phone: '', idCard: '', address: '', contactName: '', contactPhone: '' })
}

const handleRegister = () => {
  if (!regForm.name) { showToast('请填写患者姓名', 'error'); return }
  if (!selectedDept.value) { showToast('请选择挂号科室', 'error'); return }
  const serial = '000' + Date.now()
  const invoice = '0026' + Math.floor(Math.random() * 99999)
  addRegistration({
    patientId: 'patient-' + Date.now(),
    patientName: regForm.name,
    patientGender: regForm.gender,
    patientAge: regForm.age + '岁',
    dept: selectedDept.value,
    doctor: selectedDoctor.value,
    feeType: regForm.feeType,
    settleType: regForm.settleType,
    serialNo: serial, invoiceNo: invoice, fee: regFee.value,
    status: 'pending', statusLabel: '候诊',
    registerDate: new Date().toLocaleDateString('zh-CN'),
    seq: registrations.value.length + 1,
  })
  regForm.serialNo = serial; regForm.invoiceNo = invoice
}

// ===== 收费工作台 =====
const billLeftTab = ref<'patient' | 'pending'>('patient')
const selectedBillRow = ref(-1)
const displayedBillingList = ref([...billingRecords.value])

const billForm = reactive({
  idType: '请选择身份类别', cardType: '就诊卡', cardNo: '',
  name: '', gender: '', age: '', settleType: '请选择结算类别',
  serialNo: '00000001992001', invoiceNo: '00000001992131',
})

const billFilter = reactive({ status: '全部收费状态', allOps: false, dateRange: '', keyword: '' })

const currentBillDetails = computed(() => {
  if (selectedBillRow.value < 0) return []
  const row = displayedBillingList.value[selectedBillRow.value]
  return row?.details || []
})

const lookupBillPatient = () => {
  if (!billForm.cardNo) return
  showToast('查询患者信息...', 'info')
  billForm.name = '赵伟'; billForm.gender = '男'; billForm.age = '34'
}

const clearBillForm = () => {
  Object.assign(billForm, { cardNo: '', name: '', gender: '', age: '' })
}

const doSearchBilling = () => {
  displayedBillingList.value = searchBilling(billFilter.keyword, billFilter.status)
}

const selectBillRow = (idx: number) => { selectedBillRow.value = idx }

const doRefund = (id: string) => {
  refundBilling(id)
  displayedBillingList.value = [...billingRecords.value]
}

const handleCharge = () => {
  if (!billForm.name) { showToast('请先查询患者信息', 'error'); return }
  showToast('收费成功', 'success')
  displayedBillingList.value = [...billingRecords.value]
}
</script>

<style scoped>
/* ===== 整体布局 ===== */
* { box-sizing: border-box; margin: 0; padding: 0; }
.his-layout { display: flex; flex-direction: column; height: 100vh; font-size: 13px; font-family: 'Microsoft YaHei', sans-serif; background: #f0f2f5; }

/* ===== Toast ===== */
.global-toast { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); padding: 10px 24px; border-radius: 6px; font-size: 13px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.toast-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.toast-error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
.toast-info { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; }

/* ===== 顶部导航栏 ===== */
.top-bar { display: flex; justify-content: space-between; align-items: center; height: 48px; background: #1677ff; color: white; padding: 0 12px; flex-shrink: 0; }
.top-left { display: flex; align-items: center; gap: 12px; }
.menu-icon { font-size: 18px; cursor: pointer; padding: 4px; }
.system-logo { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: bold; }
.logo-icon { font-size: 20px; }
.tab-list { display: flex; align-items: center; gap: 2px; margin-left: 8px; }
.work-tab { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(255,255,255,0.15); border-radius: 4px 4px 0 0; cursor: pointer; font-size: 13px; }
.work-tab.active { background: white; color: #1677ff; }
.tab-close { margin-left: 4px; font-size: 14px; color: rgba(255,255,255,0.7); }
.work-tab.active .tab-close { color: #999; }
.top-right { display: flex; align-items: center; gap: 10px; position: relative; }
.top-icon { font-size: 16px; cursor: pointer; }
.top-divider { color: rgba(255,255,255,0.4); }
.user-avatar-wrap { display: flex; align-items: center; gap: 4px; cursor: pointer; position: relative; }
.dropdown-arrow { font-size: 11px; }
.user-menu { position: absolute; top: 28px; right: 0; background: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 120px; z-index: 999; }
.user-menu-item { padding: 10px 16px; color: #333; font-size: 13px; cursor: pointer; }
.user-menu-item:hover { background: #f5f5f5; color: #ff4d4f; }

/* ===== 身体区域 ===== */
.body-wrap { display: flex; flex: 1; overflow: hidden; }

/* ===== 左侧图标导航 ===== */
.icon-nav { width: 48px; background: #e8f0fe; border-right: 1px solid #d9d9d9; display: flex; flex-direction: column; align-items: center; padding: 8px 0; gap: 4px; flex-shrink: 0; }
.icon-nav-item { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; font-size: 18px; }
.icon-nav-item:hover { background: #d0e4ff; }
.icon-nav-item.active { background: #1677ff; }

/* ===== 主内容区 ===== */
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ===== 通用 Tab 样式 ===== */
.panel-tabs { display: flex; align-items: center; border-bottom: 1px solid #e8e8e8; padding: 0 12px; background: white; flex-shrink: 0; }
.ptab { padding: 10px 16px; cursor: pointer; color: #666; position: relative; white-space: nowrap; }
.ptab.active { color: #1677ff; }
.ptab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #1677ff; }
.ptab b { background: #1677ff; color: white; border-radius: 10px; padding: 1px 6px; font-size: 11px; margin-left: 4px; }
.clear-btn { margin-left: auto; color: #1677ff; cursor: pointer; padding: 8px; font-size: 12px; }

/* ===== 通用按钮 ===== */
.btn-blue { background: #1677ff; color: white; border: none; border-radius: 4px; padding: 5px 12px; cursor: pointer; font-size: 12px; }
.btn-blue.sm { padding: 4px 8px; }
.btn-gray { background: #f0f0f0; color: #333; border: 1px solid #d9d9d9; border-radius: 4px; padding: 5px 12px; cursor: pointer; font-size: 12px; }
.btn-outline { background: white; color: #333; border: 1px solid #d9d9d9; border-radius: 4px; padding: 5px 12px; cursor: pointer; font-size: 12px; }
.btn-outline:hover { border-color: #1677ff; color: #1677ff; }
.btn-outline.btn-red { color: #ff4d4f; border-color: #ff4d4f; }
.full-btn { width: 100%; padding: 8px; }
.empty-tip { text-align: center; padding: 20px; color: #bbb; font-size: 12px; }

/* ============ 门诊工作台 ============ */
.clinic-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.clinic-topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: white; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; gap: 12px; }
.clinic-search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; }
.clinic-search { flex: 1; max-width: 320px; padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; }
.clinic-actions { display: flex; gap: 6px; }
.clinic-body { flex: 1; display: flex; overflow: hidden; }

/* 左侧患者列表 */
.clinic-left { width: 260px; border-right: 1px solid #e8e8e8; background: white; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
.patient-scroll { flex: 1; overflow-y: auto; }
.patient-row { display: flex; align-items: flex-start; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f5f5f5; gap: 8px; }
.patient-row:hover { background: #f5f7ff; }
.patient-row.selected { background: #e6f4ff; border-left: 3px solid #1677ff; }
.p-num { width: 20px; color: #999; font-size: 12px; padding-top: 2px; }
.p-info { flex: 1; }
.p-name { font-weight: 600; color: #333; font-size: 13px; }
.p-sub { font-size: 11px; color: #999; margin-top: 2px; }
.p-right { text-align: right; }
.p-time { font-size: 11px; color: #999; }
.p-status { font-size: 11px; margin-top: 2px; }
.status-active { color: #1677ff; }
.status-wait { color: #faad14; }
.status-skip { color: #ff4d4f; }

/* 当前患者 */
.current-patient { flex: 1; overflow-y: auto; padding: 12px; }
.cp-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
.cp-avatar { font-size: 40px; }
.cp-name { font-size: 14px; font-weight: bold; color: #333; }
.cp-meta { font-size: 12px; color: #666; margin: 4px 0; display: flex; align-items: center; gap: 8px; }
.tag-first { background: #1677ff; color: white; border-radius: 3px; padding: 1px 6px; font-size: 11px; }
.cp-id { font-size: 12px; color: #666; }
.cp-tags { display: flex; gap: 6px; margin-bottom: 10px; }
.cp-tag { padding: 2px 8px; border-radius: 3px; font-size: 11px; background: #fff2e8; color: #fa541c; border: 1px solid #ffbb96; }
.func-menu { border-top: 1px solid #f0f0f0; }
.func-menu-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-bottom: 1px solid #f5f5f5; cursor: pointer; color: #333; font-size: 13px; }
.func-menu-item:hover { color: #1677ff; }
.arrow { color: #999; }
.history-diag { margin-top: 12px; }
.hd-title { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 8px; }
.hd-item { display: flex; gap: 8px; margin-bottom: 12px; }
.hd-dot { width: 8px; height: 8px; border-radius: 50%; background: #1677ff; margin-top: 4px; flex-shrink: 0; }
.hd-meta { display: flex; gap: 8px; margin-bottom: 4px; }
.hd-date { font-size: 12px; color: #666; }
.hd-dept { font-size: 12px; color: #1677ff; }
.hd-desc { font-size: 12px; color: #666; line-height: 1.6; }

/* 中栏医嘱 */
.clinic-mid { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #e8e8e8; background: white; overflow: hidden; }
.order-type-tabs { display: flex; align-items: center; padding: 0 12px; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; background: #fafafa; }
.otab { padding: 9px 10px; cursor: pointer; color: #666; font-size: 12px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.otab.active { color: #1677ff; border-bottom: 2px solid #1677ff; }
.otab.refresh { margin-left: auto; color: #1677ff; }
.order-actions { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; flex-wrap: wrap; }
.oa-btn { background: white; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; color: #333; }
.oa-btn:hover { border-color: #1677ff; color: #1677ff; }
.order-table-wrap { flex: 1; overflow-y: auto; }
.order-table { width: 100%; border-collapse: collapse; }
.order-table th { background: #fafafa; padding: 8px 12px; border-bottom: 1px solid #e8e8e8; text-align: left; font-weight: 500; color: #666; font-size: 12px; white-space: nowrap; }
.order-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; vertical-align: top; }
.order-selected td { background: #f0f7ff; }
.order-name { font-weight: 500; color: #333; }
.order-sub { color: #999; font-size: 11px; margin-top: 2px; }
.order-status { padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.status-abolished { color: #999; background: #f5f5f5; }
.status-refund { color: #ff4d4f; background: #fff1f0; }
.status-dispensed { color: #52c41a; background: #f6ffed; }
.status-pending { color: #faad14; background: #fffbe6; }
.status-executed { color: #1677ff; background: #e6f4ff; }
.order-total { padding: 10px 16px; border-top: 1px solid #e8e8e8; font-size: 13px; color: #333; flex-shrink: 0; }
.total-amount { color: #ff4d4f; font-size: 16px; font-weight: bold; }
.op-link { color: #1677ff; cursor: pointer; font-size: 12px; }
.op-link.red { color: #ff4d4f; }
.op-disabled { color: #d9d9d9; font-size: 12px; }

/* 右栏病历 */
.clinic-right { width: 360px; display: flex; flex-direction: column; background: white; overflow: hidden; flex-shrink: 0; }
.record-type-tabs { display: flex; align-items: center; padding: 0 8px; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; overflow-x: auto; }
.rtab { padding: 9px 10px; cursor: pointer; color: #666; font-size: 12px; white-space: nowrap; }
.rtab.active { color: #1677ff; border-bottom: 2px solid #1677ff; }
.record-actions { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; flex-wrap: wrap; }
.ra-btn { background: white; border: 1px solid #d9d9d9; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 12px; color: #333; }
.ra-btn:hover { border-color: #1677ff; color: #1677ff; }
.ra-active { background: #e6f4ff; border-color: #1677ff; color: #1677ff; }
.ra-save { background: #1677ff; color: white; border-color: #1677ff; }
.record-content { flex: 1; overflow-y: auto; padding: 10px 12px; }
.rc-field { margin-bottom: 8px; font-size: 12px; line-height: 1.6; }
.rc-label { font-weight: bold; color: #333; }
.rc-value { color: #555; }
.record-edit { flex: 1; overflow-y: auto; padding: 8px 12px; }
.re-field { margin-bottom: 10px; }
.re-label { display: block; font-size: 12px; font-weight: bold; color: #333; margin-bottom: 4px; }
.re-textarea { width: 100%; border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; resize: vertical; font-family: inherit; }
.re-textarea:focus { border-color: #1677ff; outline: none; }
.diag-section { padding: 8px 12px; border-top: 1px solid #e8e8e8; flex-shrink: 0; }
.diag-actions { display: flex; gap: 8px; margin-bottom: 8px; }
.da-btn { background: white; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; color: #333; }
.da-btn:hover { border-color: #1677ff; color: #1677ff; }
.diag-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.diag-table th { background: #fafafa; padding: 6px 8px; border: 1px solid #e8e8e8; font-weight: 500; color: #666; }
.diag-table td { padding: 5px 6px; border: 1px solid #f0f0f0; }
.diag-input { width: 50px; border: 1px solid #d9d9d9; padding: 2px 4px; border-radius: 3px; font-size: 12px; }
.diag-input.wide { width: 100px; }

/* ============ 挂号工作台 ============ */
.register-wrap { flex: 1; display: flex; overflow: hidden; }
.reg-left { width: 500px; border-right: 1px solid #e8e8e8; background: white; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
.reg-form { flex: 1; overflow-y: auto; padding: 12px 16px; }
.rf-row { display: flex; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px; }
.rf-row label { width: 80px; color: #666; font-size: 13px; flex-shrink: 0; }
label.ml { width: 70px; }
.rf-select { flex: 1; padding: 5px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; min-width: 120px; }
.rf-select.sm { width: 100px; flex: none; }
.rf-input { flex: 1; padding: 5px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; min-width: 80px; }
.rf-input.sm { width: 80px; flex: none; }
.rf-input.full { flex: 1; }
.rf-card-wrap { display: flex; gap: 6px; align-items: center; flex: 1; }
.rf-hint { color: #999; font-size: 12px; padding: 4px 0 8px 80px; }
.key-f2 { background: #1677ff; color: white; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.key-enter { background: #52c41a; color: white; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.rf-serial { padding: 10px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #666; margin-top: 8px; line-height: 2; }
.serial-num { color: #333; font-weight: bold; }
.serial-link { color: #1677ff; font-weight: bold; cursor: pointer; }
.rf-operator { color: #666; font-size: 13px; line-height: 2; padding-top: 8px; }
.reg-right { flex: 1; display: flex; flex-direction: column; background: white; overflow: hidden; }
.reg-filter { display: flex; align-items: center; gap: 16px; padding: 8px 16px; background: #fafafa; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; }
.filter-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666; }
.filter-input { padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; width: 90px; }
.schedule-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px 16px; flex-shrink: 0; }
.sch-card { border: 1px solid #e8e8e8; border-radius: 6px; padding: 8px; cursor: pointer; background: white; }
.sch-card:hover { border-color: #1677ff; }
.sch-card.selected { border-color: #1677ff; background: #e6f4ff; }
.sch-card-title { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 6px; line-height: 1.4; }
.sch-nums { display: flex; gap: 8px; margin-bottom: 3px; }
.sch-num-item { display: flex; flex-direction: column; align-items: center; }
.num { font-size: 14px; font-weight: bold; color: #333; }
.num.zero { color: #d9d9d9; }
.nlabel { font-size: 10px; color: #999; }
.doctor-cards { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; overflow-y: auto; flex: 1; align-content: flex-start; }
.doc-card { width: calc(20% - 8px); min-width: 90px; border: 1px solid #e8e8e8; border-radius: 6px; padding: 10px 8px; cursor: pointer; text-align: center; background: white; position: relative; }
.doc-card:hover { border-color: #1677ff; }
.doc-card.doc-selected { border-color: #1677ff; background: #e6f4ff; }
.doc-type-tag { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 10px; padding: 2px 4px; border-radius: 6px 6px 0 0; }
.tag-expert { background: #1677ff; color: white; }
.tag-famous { background: #ff7a00; color: white; }
.tag-emergency { background: #ff4d4f; color: white; }
.tag-simple { background: #52c41a; color: white; }
.doc-avatar { font-size: 28px; margin: 8px 0 4px; }
.doc-name { font-size: 12px; font-weight: 600; color: #333; }
.doc-count { font-size: 12px; color: #666; margin-top: 4px; }
.registered-list { flex: 1; overflow-y: auto; padding: 12px 16px; }
.reg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 16px; padding: 12px 16px; background: white; border-top: 1px solid #e8e8e8; flex-shrink: 0; }
.reg-fee { font-size: 14px; color: #333; }
.fee-amount { color: #ff4d4f; font-size: 18px; font-weight: bold; }
.btn-register { background: #1677ff; color: white; border: none; border-radius: 6px; padding: 10px 28px; font-size: 16px; font-weight: bold; cursor: pointer; }
.btn-register:hover { background: #0958d9; }

/* ============ 收费工作台 ============ */
.billing-wrap { flex: 1; display: flex; overflow: hidden; }
.bill-left { width: 260px; border-right: 1px solid #e8e8e8; background: white; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
.bill-form { flex: 1; overflow-y: auto; padding: 12px 16px; }
.bf-row { display: flex; align-items: center; margin-bottom: 8px; gap: 6px; }
.bf-row label { color: #666; font-size: 13px; white-space: nowrap; }
.bf-select { flex: 1; padding: 5px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; }
.bf-input { flex: 1; padding: 5px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; }
.bf-input.full { width: 100%; }
.bf-hint { color: #999; font-size: 12px; padding: 2px 0 8px; line-height: 2; }
.bf-serial { padding: 8px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #666; margin-top: 8px; line-height: 2.2; }
.bf-operator { color: #666; font-size: 13px; line-height: 2.2; padding-top: 8px; }
.bill-right { flex: 1; display: flex; flex-direction: column; background: white; overflow: hidden; }
.bill-right-title { font-size: 15px; font-weight: bold; color: #333; padding: 12px 16px 8px; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; }
.bill-filter { display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: #fafafa; border-bottom: 1px solid #e8e8e8; flex-shrink: 0; flex-wrap: wrap; }
.bf-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333; }
.bf-filter-select { padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; }
.bf-date-input { padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; width: 160px; }
.bf-kw-input { padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; width: 160px; }
.bill-table-wrap { overflow-y: auto; max-height: 240px; border-bottom: 1px solid #e8e8e8; }
.bill-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 800px; }
.bill-table th { background: #fafafa; padding: 8px 10px; border: 1px solid #e8e8e8; font-weight: 500; color: #666; white-space: nowrap; text-align: left; }
.bill-table td { padding: 7px 10px; border: 1px solid #f0f0f0; vertical-align: middle; }
.selected-row td { background: #e6f4ff; }
.bold-amt { font-weight: bold; }
.red-amt { color: #ff4d4f; }
.bill-status { padding: 2px 8px; border-radius: 3px; font-size: 11px; }
.status-paid { color: #52c41a; background: #f6ffed; border: 1px solid #b7eb8f; }
.status-refunded { color: #999; background: #f5f5f5; border: 1px solid #d9d9d9; }
.status-pending-bill { color: #faad14; background: #fffbe6; border: 1px solid #ffe58f; }
.bill-detail { flex: 1; overflow-y: auto; }
.bd-title { font-size: 14px; font-weight: bold; color: #333; padding: 10px 16px 8px; border-bottom: 1px solid #e8e8e8; border-left: 3px solid #1677ff; }

/* ===== 弹窗 ===== */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: white; border-radius: 10px; width: 440px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: bold; color: #333; }
.modal-close { font-size: 22px; color: #999; cursor: pointer; }
.modal-body { padding: 16px 18px; }
.mf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.mf-row label { width: 80px; font-size: 13px; color: #666; flex-shrink: 0; }
.mf-row input, .mf-row select { flex: 1; padding: 6px 10px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; min-width: 80px; }
.modal-footer { display: flex; gap: 10px; padding: 12px 18px; border-top: 1px solid #f0f0f0; justify-content: flex-end; }
.mbtn { padding: 7px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.mbtn.cancel { background: #f5f5f5; color: #666; }
.mbtn.submit { background: #1677ff; color: white; }
.mbtn.submit:hover { background: #0958d9; }
</style>
