# 药房处方接收与发药功能 - 数据库规范遵循说明

## 📋 重要变更说明

根据数据存储规范要求，本模块已进行以下重大调整：

### ❌ 已移除的内容
1. **删除 mockData.ts 文件** - 不再使用前端硬编码的模拟数据
2. **移除 loadMockData() 函数** - 前端代码中不再包含任何静态数据
3. **取消离线模式手工登记功能** - 所有数据必须通过后端API与数据库交互

### ✅ 新增的内容
1. **数据库迁移脚本** - `backend/migrate_pharmacy_dispense.js`
2. **新的数据库表结构** - 5个新表/修改表
3. **完整的后端API接口** - 7个新API端点
4. **真实数据交互** - 前端完全依赖后端API

---

## 🗄️ 数据库迁移

### 执行迁移脚本

```bash
cd backend
node migrate_pharmacy_dispense.js
```

### 迁移内容

#### 1. 修改 prescriptions 表
添加以下字段：
- `receipt_no` VARCHAR(50) - 缴费回执号
- `paid_time` TIMESTAMP - 缴费时间
- `received_time` TIMESTAMP - 接收时间
- `dispensed_time` TIMESTAMP - 发药时间
- `visit_code` VARCHAR(50) - 就诊码
- `allergy_history` TEXT[] - 过敏史数组
- `receive_pharmacist_id` INTEGER - 接收药师ID
- `dispense_pharmacist_id` INTEGER - 发药药师ID

添加索引：
- `idx_prescriptions_review_status` - 审核状态索引
- `idx_prescriptions_status` - 处方状态索引
- `idx_prescriptions_paid_time` - 缴费时间索引
- `idx_prescriptions_receipt_no` - 回执号索引

#### 2. 创建 prescription_receive_logs 表
记录处方接收、驳回、发药等操作日志。

```sql
CREATE TABLE prescription_receive_logs (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  pharmacist_id INTEGER REFERENCES users(id),
  action VARCHAR(20), -- 'received', 'rejected', 'dispensed'
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. 创建 prescription_exceptions 表
记录处方异常上报信息。

```sql
CREATE TABLE prescription_exceptions (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  pharmacist_id INTEGER REFERENCES users(id),
  exception_type VARCHAR(50), -- 'drug_error', 'patient_mismatch', 'dosage_error', 'other'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. 创建 drug_scan_records 表
记录药品监管码扫描记录。

```sql
CREATE TABLE drug_scan_records (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  prescription_item_id INTEGER REFERENCES prescription_items(id),
  drug_id INTEGER REFERENCES drugs(id),
  scan_code VARCHAR(100),
  scanned_by INTEGER REFERENCES users(id),
  scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT false
);
```

#### 5. 创建 patient_visit_verification 表
记录患者就诊码验证记录。

```sql
CREATE TABLE patient_visit_verification (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id),
  patient_id INTEGER REFERENCES patients(id),
  visit_code VARCHAR(50),
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_match BOOLEAN DEFAULT false
);
```

---

## 🔌 后端API接口

### 1. 获取待处理处方列表
**接口**: `GET /api/pharmacy/pending-prescriptions`

**说明**: 获取所有已缴费但未接收的处方

**响应示例**:
```json
[
  {
    "prescriptionId": "RX0000000001",
    "receiptNo": "R0000000001",
    "patientName": "张明",
    "patientAge": 35,
    "allergyHistory": ["青霉素"],
    "drugs": [
      {
        "id": 1,
        "name": "阿莫西林胶囊",
        "spec": "0.5g*24粒",
        "quantity": 2,
        "usage": "口服 每日3次",
        "price": 25.50
      }
    ],
    "status": "待接收",
    "paidTime": "2026-06-23T10:30:00.000Z",
    "visitCode": "VC20260623001"
  }
]
```

### 2. 处方接收
**接口**: `POST /api/pharmacy/receive-prescription`

**请求体**:
```json
{
  "prescriptionId": "RX0000000001",
  "operator": 5
}
```

**响应**:
```json
{
  "success": true,
  "message": "处方接收成功"
}
```

**数据库操作**:
- 更新 prescriptions.status = 'received'
- 更新 prescriptions.received_time = NOW()
- 更新 prescriptions.receive_pharmacist_id
- 插入 prescription_receive_logs 记录
- 插入 audit_logs 记录

### 3. 异常上报
**接口**: `POST /api/pharmacy/report-exception`

**请求体**:
```json
{
  "prescriptionId": "RX0000000001",
  "exceptionType": "drug_error",
  "description": "药品名称与处方不符",
  "operator": 5
}
```

**响应**:
```json
{
  "success": true,
  "message": "异常已上报，处方已退回医生端"
}
```

**数据库操作**:
- 更新 prescriptions.review_status = 'rejected'
- 更新 prescriptions.status = 'cancelled'
- 插入 prescription_exceptions 记录
- 插入 prescription_receive_logs 记录
- 插入 audit_logs 记录

### 4. 验证药品监管码
**接口**: `POST /api/pharmacy/verify-drug-code`

**请求体**:
```json
{
  "prescriptionId": "RX0000000001",
  "scanCode": "AMXL001234567",
  "itemId": 1
}
```

**响应**:
```json
{
  "success": true,
  "matched": true,
  "drugName": "阿莫西林胶囊"
}
```

**数据库操作**:
- 查询 prescription_items 获取药品信息
- 验证监管码是否匹配
- 如果匹配，插入 drug_scan_records 记录

### 5. 验证患者就诊码
**接口**: `POST /api/pharmacy/verify-visit-code`

**请求体**:
```json
{
  "prescriptionId": "RX0000000001",
  "visitCode": "VC20260623001",
  "operator": 5
}
```

**响应**:
```json
{
  "success": true,
  "matched": true,
  "patientName": "张明"
}
```

**数据库操作**:
- 查询 prescriptions 获取就诊码
- 验证就诊码是否匹配
- 插入 patient_visit_verification 记录

### 6. 完整发药操作（新版）
**接口**: `POST /api/pharmacy/dispense-v2`

**请求体**:
```json
{
  "prescriptionId": "RX0000000001",
  "operator": 5,
  "drugCodes": ["AMXL001234567", "BLF002345678"],
  "visitCode": "VC20260623001"
}
```

**响应**:
```json
{
  "success": true,
  "message": "发药成功，库存已扣减，通知患者取药"
}
```

**数据库操作**:
- 验证处方状态是否为 'received'
- 扣减 drugs 表中的库存（actual_stock, locked_stock）
- 更新 prescriptions.status = 'dispensed'
- 更新 prescriptions.dispensed_time
- 更新 prescriptions.dispense_pharmacist_id
- 插入 prescription_receive_logs 记录
- 插入 audit_logs 记录

---

## 💻 前端代码调整

### 移除的内容
1. **mockData.ts 文件** - 已删除
2. **loadMockData() 函数** - 从 PharmacyWorkbench.vue 中移除
3. **离线模式手工登记弹窗** - 已移除相关UI和逻辑
4. **手动同步按钮的降级处理** - 不再使用本地数据

### 保留的核心功能
1. **顶部状态栏** - 显示同步状态（基于API调用结果）
2. **左侧待处理队列** - 从API加载数据
3. **中央详情与核验区** - 显示API返回的处方详情
4. **底部发药操作区** - 调用API进行验证和发药
5. **超时检测** - 基于 paid_time 字段计算
6. **操作日志** - 从 prescription_receive_logs 表加载（需额外实现）

### API调用示例

```typescript
// 加载处方列表
const loadPrescriptions = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/pharmacy/pending-prescriptions')
    prescriptionList.value = res.data || []
    syncStatus.value = 'online'
  } catch (err) {
    console.error('加载失败:', err)
    ElMessage.error('网络异常，无法加载处方数据')
    prescriptionList.value = []
    syncStatus.value = 'offline'
  } finally {
    loading.value = false
  }
}

// 处方接收
const confirmReceive = async () => {
  try {
    await axios.post('/api/pharmacy/receive-prescription', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id
    })
    
    selectedPrescription.value.status = '已接收'
    selectedPrescription.value.receivedTime = new Date().toISOString()
    
    addOperationLog('接收处方', `接收处方 ${selectedPrescription.value.prescriptionId}`)
    ElMessage.success('处方接收成功')
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    ElMessage.error('接收失败，请重试')
  }
}

// 验证药品监管码
const verifyDrugCode = async () => {
  try {
    const res = await axios.post('/api/pharmacy/verify-drug-code', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      scanCode: scannedDrugCode.value,
      itemId: selectedDrugItem.value.id
    })
    
    drugCodeMatch.value = res.data.matched
    if (res.data.matched) {
      checkItems.drugName = true
      ElMessage.success('药品监管码验证通过')
    } else {
      checkItems.drugName = false
      ElMessage.error('药品监管码不匹配')
    }
  } catch (err) {
    ElMessage.error('验证失败')
  }
}

// 发药操作
const executeDispense = async () => {
  try {
    await axios.post('/api/pharmacy/dispense-v2', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id,
      drugCodes: scannedDrugCodes.value,
      visitCode: scannedVisitCode.value
    })
    
    selectedPrescription.value.status = '已发药'
    
    addOperationLog('确认发药', `发药完成：${selectedPrescription.value.prescriptionId}`)
    ElMessage.success('发药成功，库存已扣减')
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    ElMessage.error('发药失败，请重试')
  }
}
```

---

## 📊 数据流转图

```
患者缴费
    ↓
invoices.payment_status = 'paid'
    ↓
处方进入待处理队列
    ↓
GET /api/pharmacy/pending-prescriptions
    ↓
药剂师查看处方详情
    ↓
点击「确认接收」
    ↓
POST /api/pharmacy/receive-prescription
    ↓
prescriptions.status = 'received'
prescription_receive_logs 记录
    ↓
扫描药品监管码
    ↓
POST /api/pharmacy/verify-drug-code
    ↓
drug_scan_records 记录
    ↓
扫描患者就诊码
    ↓
POST /api/pharmacy/verify-visit-code
    ↓
patient_visit_verification 记录
    ↓
勾选四项确认
    ↓
点击「确认发药」
    ↓
POST /api/pharmacy/dispense-v2
    ↓
drugs.actual_stock -= quantity
prescriptions.status = 'dispensed'
prescription_receive_logs 记录
audit_logs 记录
    ↓
发药完成
```

---

## ⚠️ 注意事项

### 1. 数据一致性
- 所有写操作都使用数据库事务（BEGIN/COMMIT/ROLLBACK）
- 关键操作都有并发控制（WHERE条件检查）
- 审计日志确保操作可追溯

### 2. 错误处理
- API调用失败时显示明确错误提示
- 不降级使用本地数据，直接报错
- 网络异常时状态栏显示红色

### 3. 性能优化
- 添加了必要的数据库索引
- 使用LEFT JOIN减少查询次数
- 分页加载（未来可扩展）

### 4. 安全性
- 所有操作都记录操作人ID
- 使用参数化查询防止SQL注入
- 敏感操作需要二次确认

---

## 🧪 测试建议

### 1. 准备测试数据
在数据库中插入测试处方：

```sql
-- 插入测试患者
INSERT INTO patients (name, age, allergy) VALUES ('测试患者', 30, '{青霉素}');

-- 插入测试处方（已审核通过且已缴费）
INSERT INTO prescriptions (
  registration_id, patient_id, doctor_id, 
  review_status, status, receipt_no, 
  paid_time, visit_code, allergy_history
) VALUES (
  1, 1, 1, 
  'approved', 'pending', 'R20260623999',
  NOW(), 'VC20260623999', '{青霉素}'
);

-- 插入处方药品项
INSERT INTO prescription_items (
  presc_id, drug_id, item_name, quantity, dosage, frequency
) VALUES (
  (SELECT id FROM prescriptions WHERE receipt_no = 'R20260623999'),
  1, '阿莫西林胶囊', 2, '1粒/次', '每日3次'
);
```

### 2. 测试流程
1. 启动后端服务：`node server.js`
2. 启动前端服务：`npm run dev`
3. 使用药师账户登录
4. 访问药房工作台
5. 测试处方接收、异常上报、发药等流程

### 3. 验证数据库
检查以下表是否有正确的记录：
- prescriptions（状态变更）
- prescription_receive_logs（操作日志）
- drug_scan_records（扫描记录）
- patient_visit_verification（验证记录）
- audit_logs（审计日志）

---

## 📞 技术支持

如有问题，请检查：
1. 数据库迁移是否成功执行
2. 后端API是否正常响应
3. 前端是否正确调用API
4. 浏览器控制台是否有错误信息

---

**版本**: v2.0 (符合数据库存储规范)  
**更新日期**: 2026-06-23  
**迁移状态**: ✅ 已完成
