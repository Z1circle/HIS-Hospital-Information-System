# 前端代码修改指南 - 符合数据库规范

## 📝 需要修改的文件

### PharmacyWorkbench.vue

需要移除所有Mock数据相关代码，改为完全依赖后端API。

---

## 🔧 具体修改步骤

### 1. 删除 loadMockData 函数

**位置**: 约第527-574行

**操作**: 删除整个 `loadMockData()` 函数

```typescript
// ❌ 删除此函数
const loadMockData = () => {
  const now = new Date()
  prescriptionList.value = [
    // ... 所有模拟数据
  ]
}
```

### 2. 修改 loadPrescriptions 函数

**位置**: 约第505-525行

**原代码**:
```typescript
const loadPrescriptions = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/pharmacy/pending-prescriptions')
    prescriptionList.value = res.data || []
    
    // 如果API失败，使用模拟数据
    if (!prescriptionList.value.length) {
      loadMockData()
    }
  } catch (err) {
    console.error('加载处方数据失败:', err)
    ElMessage.warning('网络异常，使用本地数据')
    loadMockData()
    syncStatus.value = 'offline'
  } finally {
    loading.value = false
  }
}
```

**修改为**:
```typescript
const loadPrescriptions = async () => {
  loading.value = true
  try {
    // 调用真实API获取待处理处方列表
    const res = await axios.get('/api/pharmacy/pending-prescriptions')
    prescriptionList.value = res.data || []
    
    if (prescriptionList.value.length === 0) {
      ElMessage.info('暂无待处理处方')
    }
    
    syncStatus.value = 'online'
  } catch (err) {
    console.error('加载处方数据失败:', err)
    ElMessage.error('网络异常，无法加载处方数据')
    prescriptionList.value = []
    syncStatus.value = 'offline'
  } finally {
    loading.value = false
  }
}
```

### 3. 修改 confirmReceive 函数

**位置**: 约第585-610行

**原代码**:
```typescript
const confirmReceive = async () => {
  if (!selectedPrescription.value) return
  
  receiveLoading.value = true
  try {
    // 模拟API调用
    await axios.post('/api/pharmacy/receive-prescription', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id
    })
    
    // 更新状态
    selectedPrescription.value.status = '已接收'
    selectedPrescription.value.receivedTime = new Date().toISOString()
    
    // 记录操作日志
    addOperationLog('接收处方', `接收处方 ${selectedPrescription.value.prescriptionId}`)
    
    ElMessage.success('处方接收成功，可进行发药操作')
  } catch (err) {
    console.error('接收失败:', err)
    ElMessage.error('接收失败，请重试')
  } finally {
    receiveLoading.value = false
  }
}
```

**修改为**:
```typescript
const confirmReceive = async () => {
  if (!selectedPrescription.value) return
  
  receiveLoading.value = true
  try {
    // 调用真实API
    await axios.post('/api/pharmacy/receive-prescription', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id
    })
    
    // 记录操作日志
    addOperationLog('接收处方', `接收处方 ${selectedPrescription.value.prescriptionId}`)
    
    ElMessage.success('处方接收成功')
    
    // 刷新列表以获取最新状态
    await loadPrescriptions()
    
    // 清除选中状态
    selectedPrescription.value = null
  } catch (err: any) {
    console.error('接收失败:', err)
    ElMessage.error(err.response?.data?.error || '接收失败，请重试')
  } finally {
    receiveLoading.value = false
  }
}
```

### 4. 修改 submitException 函数

**位置**: 约第625-660行

**原代码**:
```typescript
const submitException = async () => {
  if (!exceptionForm.type || !exceptionForm.description) {
    ElMessage.warning('请填写完整的异常信息')
    return
  }
  
  try {
    // 模拟API调用
    await axios.post('/api/pharmacy/report-exception', {
      prescriptionId: selectedPrescription.value!.prescriptionId,
      exceptionType: exceptionForm.type,
      description: exceptionForm.description,
      operator: currentUser.value?.id
    })
    
    // 更新状态
    selectedPrescription.value!.status = '已驳回'
    
    // 记录操作日志
    addOperationLog('异常上报', `上报异常：${exceptionForm.type} - ${exceptionForm.description}`)
    
    ElMessage.success('异常已上报，处方已退回医生端')
    exceptionDialogVisible.value = false
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    console.error('上报失败:', err)
    ElMessage.error('上报失败，请重试')
  }
}
```

**修改为**:
```typescript
const submitException = async () => {
  if (!exceptionForm.type || !exceptionForm.description) {
    ElMessage.warning('请填写完整的异常信息')
    return
  }
  
  try {
    // 调用真实API
    await axios.post('/api/pharmacy/report-exception', {
      prescriptionId: selectedPrescription.value!.prescriptionId,
      exceptionType: exceptionForm.type,
      description: exceptionForm.description,
      operator: currentUser.value?.id
    })
    
    // 记录操作日志
    addOperationLog('异常上报', `上报异常：${exceptionForm.type} - ${exceptionForm.description}`)
    
    ElMessage.success('异常已上报，处方已退回医生端')
    exceptionDialogVisible.value = false
    
    // 刷新列表
    await loadPrescriptions()
    
    // 清除选中状态
    selectedPrescription.value = null
  } catch (err: any) {
    console.error('上报失败:', err)
    ElMessage.error(err.response?.data?.error || '上报失败，请重试')
  }
}
```

### 5. 修改 verifyDrugCode 函数

**位置**: 约第690-720行

**原代码**:
```typescript
const verifyDrugCode = () => {
  if (!scannedDrugCode.value || !selectedPrescription.value) {
    drugCodeMatch.value = null
    return
  }
  
  // 模拟验证逻辑
  const matched = selectedPrescription.value.drugs.some(drug => {
    return scannedDrugCode.value.includes(drug.name.substring(0, 2))
  })
  
  drugCodeMatch.value = matched
  if (matched) {
    checkItems.drugName = true
    ElMessage.success('药品监管码验证通过')
  } else {
    checkItems.drugName = false
    ElMessage.error('药品监管码不匹配，请核对')
  }
}
```

**修改为**:
```typescript
const verifyDrugCode = async () => {
  if (!scannedDrugCode.value || !selectedPrescription.value) {
    drugCodeMatch.value = null
    return
  }
  
  try {
    // 调用真实API验证
    const res = await axios.post('/api/pharmacy/verify-drug-code', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      scanCode: scannedDrugCode.value,
      itemId: selectedDrugItem.value?.id // 需要先选择要验证的药品项
    })
    
    drugCodeMatch.value = res.data.matched
    if (res.data.matched) {
      checkItems.drugName = true
      ElMessage.success('药品监管码验证通过')
    } else {
      checkItems.drugName = false
      ElMessage.error('药品监管码不匹配，请核对')
    }
  } catch (err: any) {
    console.error('验证失败:', err)
    ElMessage.error(err.response?.data?.error || '验证失败')
    drugCodeMatch.value = false
  }
}
```

### 6. 修改 verifyVisitCode 函数

**位置**: 约第722-745行

**原代码**:
```typescript
const verifyVisitCode = () => {
  if (!scannedVisitCode.value || !selectedPrescription.value) {
    visitCodeMatch.value = null
    return
  }
  
  // 验证就诊码是否与处方中的患者匹配
  const matched = scannedVisitCode.value === selectedPrescription.value.visitCode
  
  visitCodeMatch.value = matched
  if (matched) {
    checkItems.identity = true
    ElMessage.success('患者身份验证通过')
  } else {
    checkItems.identity = false
    ElMessage.error('就诊码不匹配，请核对患者身份')
  }
}
```

**修改为**:
```typescript
const verifyVisitCode = async () => {
  if (!scannedVisitCode.value || !selectedPrescription.value) {
    visitCodeMatch.value = null
    return
  }
  
  try {
    // 调用真实API验证
    const res = await axios.post('/api/pharmacy/verify-visit-code', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      visitCode: scannedVisitCode.value,
      operator: currentUser.value?.id
    })
    
    visitCodeMatch.value = res.data.matched
    if (res.data.matched) {
      checkItems.identity = true
      ElMessage.success('患者身份验证通过')
    } else {
      checkItems.identity = false
      ElMessage.error('就诊码不匹配，请核对患者身份')
    }
  } catch (err: any) {
    console.error('验证失败:', err)
    ElMessage.error(err.response?.data?.error || '验证失败')
    visitCodeMatch.value = false
  }
}
```

### 7. 修改 executeDispense 函数

**位置**: 约第790-830行

**原代码**:
```typescript
const executeDispense = async () => {
  if (!selectedPrescription.value) return
  
  dispenseLoading.value = true
  try {
    // 模拟API调用
    await axios.post('/api/pharmacy/dispense', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id,
      drugCodes: selectedPrescription.value.drugs.map(d => d.scannedCode).filter(Boolean),
      visitCode: scannedVisitCode.value
    })
    
    // 更新状态
    selectedPrescription.value.status = '已发药'
    
    // 记录操作日志
    addOperationLog('确认发药', `发药完成：${selectedPrescription.value.prescriptionId}`)
    
    ElMessage.success('发药成功，库存已扣减，通知患者取药')
    dispenseConfirmVisible.value = false
    
    // 重置状态
    resetDispenseState()
    
    // 刷新列表
    loadPrescriptions()
  } catch (err) {
    console.error('发药失败:', err)
    ElMessage.error('发药失败，请重试')
  } finally {
    dispenseLoading.value = false
  }
}
```

**修改为**:
```typescript
const executeDispense = async () => {
  if (!selectedPrescription.value) return
  
  dispenseLoading.value = true
  try {
    // 调用真实API（新版）
    await axios.post('/api/pharmacy/dispense-v2', {
      prescriptionId: selectedPrescription.value.prescriptionId,
      operator: currentUser.value?.id,
      drugCodes: selectedPrescription.value.drugs.map(d => d.scannedCode).filter(Boolean),
      visitCode: scannedVisitCode.value
    })
    
    // 记录操作日志
    addOperationLog('确认发药', `发药完成：${selectedPrescription.value.prescriptionId}`)
    
    ElMessage.success('发药成功，库存已扣减')
    dispenseConfirmVisible.value = false
    
    // 重置状态
    resetDispenseState()
    
    // 刷新列表
    await loadPrescriptions()
    
    // 清除选中状态
    selectedPrescription.value = null
  } catch (err: any) {
    console.error('发药失败:', err)
    ElMessage.error(err.response?.data?.error || '发药失败，请重试')
  } finally {
    dispenseLoading.value = false
  }
}
```

### 8. 删除手工登记相关代码

**需要删除的内容**:
- `manualRegisterVisible` 变量
- `manualForm` 变量
- `addManualDrug()` 函数
- `submitManualRegister()` 函数
- 手工登记表单弹窗（template部分）
- 离线模式提示中的手工登记按钮引用

### 9. 修改手动同步功能

**位置**: 约第860-875行

**原代码**:
```typescript
const manualSync = async () => {
  try {
    ElMessage.info('正在同步数据...')
    await loadPrescriptions()
    syncStatus.value = 'online'
    ElMessage.success('数据同步成功')
  } catch (err) {
    ElMessage.error('同步失败，请检查网络连接')
  }
}
```

**保持不变**（已经是正确的实现）

---

## ✅ 修改完成检查清单

- [ ] 删除了 `loadMockData()` 函数
- [ ] 修改了 `loadPrescriptions()` 不再降级使用Mock数据
- [ ] 修改了 `confirmReceive()` 调用真实API
- [ ] 修改了 `submitException()` 调用真实API
- [ ] 修改了 `verifyDrugCode()` 调用真实API
- [ ] 修改了 `verifyVisitCode()` 调用真实API
- [ ] 修改了 `executeDispense()` 调用新API `/api/pharmacy/dispense-v2`
- [ ] 删除了手工登记相关的所有代码
- [ ] 更新了错误提示信息
- [ ] 添加了API响应数据的正确处理

---

## 🧪 测试步骤

1. **启动后端服务**
   ```bash
   cd backend
   node server.js
   ```

2. **准备测试数据**
   - 在数据库中插入测试处方
   - 确保处方状态为 `review_status='approved'` 且 `status='pending'`
   - 确保有对应的缴费记录（invoices表中payment_status='paid'）

3. **启动前端服务**
   ```bash
   cd frontend
   npm run dev
   ```

4. **测试流程**
   - 使用药师账户登录
   - 访问药房工作台
   - 查看待处理处方列表（应从数据库加载）
   - 测试处方接收功能
   - 测试异常上报功能
   - 测试药品监管码扫描
   - 测试患者就诊码验证
   - 测试完整发药流程

5. **验证数据库**
   ```sql
   -- 检查处方状态是否更新
   SELECT * FROM prescriptions WHERE receipt_no = 'R20260623999';
   
   -- 检查操作日志
   SELECT * FROM prescription_receive_logs ORDER BY created_at DESC LIMIT 10;
   
   -- 检查扫描记录
   SELECT * FROM drug_scan_records ORDER BY scan_time DESC LIMIT 10;
   
   -- 检查验证记录
   SELECT * FROM patient_visit_verification ORDER BY verified_at DESC LIMIT 10;
   
   -- 检查审计日志
   SELECT * FROM audit_logs WHERE action LIKE '%处方%' ORDER BY created_at DESC LIMIT 10;
   ```

---

## ⚠️ 注意事项

1. **不再有离线模式**：所有数据必须从数据库获取，网络异常时直接报错
2. **API错误处理**：需要正确显示后端返回的错误信息
3. **数据刷新**：关键操作后应刷新列表以获取最新状态
4. **事务一致性**：后端API已使用事务，确保数据一致性

---

**文档版本**: v1.0  
**更新日期**: 2026-06-23
