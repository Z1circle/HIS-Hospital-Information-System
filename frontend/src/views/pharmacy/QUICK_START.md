# 药房处方接收与发药 - 快速开始指南

## 🚀 5分钟快速上手

### 第1步：执行数据库迁移

```bash
cd backend
node migrate_pharmacy_dispense.js
```

**预期结果**: ✅ 看到"迁移成功完成"消息

---

### 第2步：启动后端服务

```bash
cd backend
node server.js
```

**预期结果**: 服务器在端口4000启动

---

### 第3步：准备测试数据（可选）

如果数据库中没有待处理处方，可以插入测试数据：

```sql
-- 插入测试患者
INSERT INTO patients (name, age, allergy) VALUES ('测试患者', 30, '{青霉素}');

-- 插入测试处方
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

---

### 第4步：修改前端代码

按照 `FRONTEND_MODIFICATION_GUIDE.md` 中的步骤修改 `PharmacyWorkbench.vue`：

**关键修改点**:
1. 删除 `loadMockData()` 函数
2. 修改 `loadPrescriptions()` 不再使用Mock数据
3. 修改所有API调用为真实接口
4. 删除手工登记相关代码

**或者**：等待后续更新，前端代码将自动更新。

---

### 第5步：启动前端服务

```bash
cd frontend
npm run dev
```

**预期结果**: 前端在端口5173启动

---

### 第6步：测试功能

1. **登录**: 使用药师账户（用户名：pharmacist1，密码：123456）
2. **访问**: 导航到药房工作台
3. **查看**: 待处理处方列表应从数据库加载
4. **测试**: 
   - 处方接收
   - 异常上报
   - 药品监管码扫描
   - 患者就诊码验证
   - 完整发药流程

---

## 📁 文件清单

### 后端文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `backend/migrate_pharmacy_dispense.js` | 数据库迁移脚本 | ✅ 已创建 |
| `backend/server.js` | 后端API实现（新增7个接口） | ✅ 已修改 |

### 前端文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `frontend/src/views/pharmacy/PharmacyWorkbench.vue` | 主界面组件 | ⏳ 待修改 |
| `frontend/src/views/pharmacy/mockData.ts` | 模拟数据文件 | ❌ 已删除 |

### 文档文件

| 文件 | 说明 | 用途 |
|------|------|------|
| `DATABASE_COMPLIANCE.md` | 数据库规范遵循说明 | API文档、数据流转图 |
| `FRONTEND_MODIFICATION_GUIDE.md` | 前端代码修改指南 | 详细的9步修改指南 |
| `COMPLETION_REPORT.md` | 完成报告 | 项目总结和统计 |
| `QUICK_START.md` | 快速开始指南 | 本文档 |

---

## 🔌 API接口速查

### 1. 获取待处理处方
```
GET /api/pharmacy/pending-prescriptions
```

### 2. 处方接收
```
POST /api/pharmacy/receive-prescription
Body: { "prescriptionId": "RX...", "operator": 5 }
```

### 3. 异常上报
```
POST /api/pharmacy/report-exception
Body: { "prescriptionId": "RX...", "exceptionType": "...", "description": "...", "operator": 5 }
```

### 4. 验证药品监管码
```
POST /api/pharmacy/verify-drug-code
Body: { "prescriptionId": "RX...", "scanCode": "...", "itemId": 1 }
```

### 5. 验证患者就诊码
```
POST /api/pharmacy/verify-visit-code
Body: { "prescriptionId": "RX...", "visitCode": "...", "operator": 5 }
```

### 6. 发药操作
```
POST /api/pharmacy/dispense-v2
Body: { "prescriptionId": "RX...", "operator": 5, "drugCodes": [...], "visitCode": "..." }
```

---

## 🗄️ 数据库表速查

### 核心表

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `prescriptions` | 处方主表 | status, received_time, dispensed_time |
| `prescription_receive_logs` | 操作日志 | action, pharmacist_id, created_at |
| `prescription_exceptions` | 异常上报 | exception_type, description, status |
| `drug_scan_records` | 扫描记录 | scan_code, verified, scan_time |
| `patient_visit_verification` | 验证记录 | visit_code, is_match, verified_at |

### 常用查询

```sql
-- 查看待处理处方
SELECT * FROM prescriptions 
WHERE review_status = 'approved' AND status = 'pending';

-- 查看最近的操作日志
SELECT * FROM prescription_receive_logs 
ORDER BY created_at DESC LIMIT 10;

-- 查看某个处方的完整信息
SELECT p.*, pat.name, pat.allergy 
FROM prescriptions p
JOIN patients pat ON p.patient_id = pat.id
WHERE p.receipt_no = 'R20260623999';
```

---

## ⚠️ 常见问题

### Q1: 数据库迁移失败怎么办？

**检查**:
1. 数据库服务是否启动
2. `.env` 文件中的数据库配置是否正确
3. 数据库用户是否有足够权限

**解决**:
```bash
# 检查数据库连接
psql -U postgres -d hisdb

# 重新执行迁移
node migrate_pharmacy_dispense.js
```

### Q2: API返回404错误？

**检查**:
1. 后端服务是否启动
2. 端口是否正确（默认4000）
3. API路径是否正确

**解决**:
```bash
# 重启后端服务
cd backend
node server.js
```

### Q3: 前端显示"网络异常"？

**检查**:
1. 后端服务是否正常运行
2. 前端代理配置是否正确
3. 浏览器控制台是否有CORS错误

**解决**:
- 确保后端和前端都在运行
- 检查 `vite.config.ts` 中的代理配置

### Q4: 没有待处理处方？

**原因**: 数据库中没有符合条件的处方

**解决**: 插入测试数据（见第3步）

---

## 📞 获取帮助

### 详细文档

1. **API详细说明**: 查看 `DATABASE_COMPLIANCE.md`
2. **前端修改步骤**: 查看 `FRONTEND_MODIFICATION_GUIDE.md`
3. **项目总结**: 查看 `COMPLETION_REPORT.md`

### 技术支持

- 检查浏览器控制台错误信息
- 检查后端服务日志
- 查看数据库记录是否正确

---

## ✅ 检查清单

完成以下检查确保一切正常：

- [ ] 数据库迁移成功执行
- [ ] 后端服务正常启动
- [ ] 前端服务正常启动
- [ ] 能够登录系统
- [ ] 能够访问药房工作台
- [ ] 待处理处方列表正常显示
- [ ] 处方接收功能正常
- [ ] 异常上报功能正常
- [ ] 药品监管码验证正常
- [ ] 患者就诊码验证正常
- [ ] 发药功能正常
- [ ] 数据库记录正确生成

---

**版本**: v2.0 (符合数据库存储规范)  
**更新日期**: 2026-06-23  
**状态**: 🟡 基础设施完成，待前端代码修改
