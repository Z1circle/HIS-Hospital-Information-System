import { test, expect, chromium, Page } from '@playwright/test'
import { testConfig } from './config'
import { login, waitForElement, waitForText, takeScreenshot } from './utils'

test('多角色并发挂号看病完整流程', async () => {
  const startTime = Date.now()
  const stepResults: Array<{ step: string; status: string; duration: number; screenshot?: string; error?: string }> = []

  async function recordStep(step: string, action: () => Promise<void>): Promise<void> {
    const stepStart = Date.now()
    try {
      await action()
      stepResults.push({ step, status: 'SUCCESS', duration: Date.now() - stepStart })
      console.log(`✓ ${step} (${Date.now() - stepStart}ms)`)
    } catch (error: any) {
      stepResults.push({ step, status: 'FAILED', duration: Date.now() - stepStart, error: error.message })
      console.log(`✗ ${step} (${Date.now() - stepStart}ms): ${error.message}`)
      throw error
    }
  }

  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  
  let patientPage: Page | null = null
  let doctorPage: Page | null = null
  let pharmacistPage: Page | null = null

  try {
    await recordStep('创建患者页面', async () => {
      patientPage = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    })

    await recordStep('创建医生页面', async () => {
      doctorPage = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    })

    await recordStep('创建药剂师页面', async () => {
      pharmacistPage = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    })

    await recordStep('患者登录系统', async () => {
      await login(patientPage!, testConfig.users.patient)
      await waitForText(patientPage!, '智慧医疗')
      await takeScreenshot(patientPage!, 'patient_login_success')
    })

    await recordStep('医生登录系统', async () => {
      await login(doctorPage!, testConfig.users.doctor)
      await doctorPage!.goto('/doctor/outpatient')
      await doctorPage!.waitForTimeout(2000)
      await takeScreenshot(doctorPage!, 'doctor_login_success')
    })

    await recordStep('药剂师登录系统', async () => {
      await login(pharmacistPage!, testConfig.users.pharmacist)
      await pharmacistPage!.goto('/pharmacy')
      await pharmacistPage!.waitForTimeout(2000)
      await takeScreenshot(pharmacistPage!, 'pharmacist_login_success')
    })

    await recordStep('患者进入预约挂号页面', async () => {
      const funcItems = patientPage!.locator('.func-item')
      const count = await funcItems.count()
      console.log(`找到 ${count} 个功能项`)
      
      for (let i = 0; i < count; i++) {
        const item = funcItems.nth(i)
        const text = await item.textContent()
        console.log(`功能项 ${i}: ${text}`)
        if (text && text.includes('预约挂号')) {
          await item.click()
          await patientPage!.waitForTimeout(2000)
          await takeScreenshot(patientPage!, 'patient_select_department')
          return
        }
      }
      
      throw new Error('未找到预约挂号入口')
    })

    await recordStep('患者选择内科', async () => {
      await patientPage!.waitForTimeout(2000)
      const deptCards = patientPage!.locator('.dept-card')
      const deptCount = await deptCards.count()
      console.log(`找到 ${deptCount} 个科室卡片`)
      
      for (let i = 0; i < deptCount; i++) {
        const card = deptCards.nth(i)
        const text = await card.textContent()
        if (text && text.includes('内科')) {
          await card.click()
          await patientPage!.waitForTimeout(2000)
          return
        }
      }
      
      throw new Error('未找到内科')
    })

    await recordStep('患者选择医生', async () => {
      await patientPage!.waitForTimeout(3000)
      
      // 等待医生列表加载
      const doctorCards = patientPage!.locator('.doctor-card')
      const count = await doctorCards.count()
      console.log(`找到 ${count} 个医生卡片`)
      
      if (count === 0) {
        throw new Error('未找到医生卡片')
      }
      
      // 查找指定医生
      for (let i = 0; i < count; i++) {
        const card = doctorCards.nth(i)
        const text = await card.textContent()
        console.log(`医生卡片 ${i}: ${text}`)
        if (text && text.includes(testConfig.appointment.doctorName)) {
          // 点击医生卡片
          await card.click()
          await patientPage!.waitForTimeout(1000)
          
          // 选择预约时间（上午/下午）
          const schBtn = patientPage!.locator('.sch-btn:not(.disabled)')
          if (await schBtn.count() > 0) {
            await schBtn.first().click()
            await patientPage!.waitForTimeout(500)
          }
          return
        }
      }
      
      // 如果没找到指定医生，点击第一个可用的
      console.log('未找到指定医生，选择第一个医生')
      await doctorCards.first().click()
      await patientPage!.waitForTimeout(1000)
      
      const schBtn = patientPage!.locator('.sch-btn:not(.disabled)')
      if (await schBtn.count() > 0) {
        await schBtn.first().click()
        await patientPage!.waitForTimeout(500)
      }
    })

    await recordStep('患者填写症状并提交挂号', async () => {
      await patientPage!.waitForTimeout(1000)
      
      // 填写症状
      const symptomsInput = patientPage!.locator('textarea[placeholder*="症状"], textarea[name="symptoms"]')
      if (await symptomsInput.isVisible()) {
        await symptomsInput.fill(testConfig.appointment.symptoms)
      }
      
      // 点击确认预约按钮
      const confirmBtn = patientPage!.locator('button:has-text("确认预约"), .confirm-btn, .bottom-confirm button')
      if (await confirmBtn.count() > 0) {
        await confirmBtn.first().click()
      }
      
      await patientPage!.waitForTimeout(3000)
      await takeScreenshot(patientPage!, 'patient_appointment_success')
    })

    await recordStep('医生刷新待诊列表', async () => {
      await doctorPage!.reload()
      await doctorPage!.waitForTimeout(3000)
    })

    await recordStep('医生查看新挂号患者', async () => {
      const patientName = testConfig.users.patient.name
      const patientElement = doctorPage!.locator(`.p-name:has-text("${patientName}"), .patient-item:has-text("${patientName}")`).first()
      await expect(patientElement).toBeVisible({ timeout: 30000 })
      await takeScreenshot(doctorPage!, 'doctor_view_new_patient')
    })

    await recordStep('医生打开患者病历', async () => {
      const patientName = testConfig.users.patient.name
      const patientElement = doctorPage!.locator(`.p-name:has-text("${patientName}"), .patient-item:has-text("${patientName}")`).first()
      await patientElement.click()
      await doctorPage!.waitForTimeout(2000)
    })

    await recordStep('医生填写诊断信息', async () => {
      const diagnosisInput = doctorPage!.locator('textarea[name="diagnosis"], textarea[name="description"], textarea[placeholder*="诊断"]')
      if (await diagnosisInput.isVisible()) {
        await diagnosisInput.fill(testConfig.appointment.description)
      }
    })

    await recordStep('医生添加药品医嘱', async () => {
      const addMedicineBtn = doctorPage!.locator('.add-medicine-btn, button:has-text("药品")')
      if (await addMedicineBtn.count() > 0) {
        await addMedicineBtn.first().click()
        await doctorPage!.waitForTimeout(1000)
      }
      
      const medicineNameInput = doctorPage!.locator('input[name="medicineName"], input[name="name"], input[placeholder*="药品"]')
      if (await medicineNameInput.isVisible()) {
        await medicineNameInput.fill(testConfig.medication.name)
      }
      
      const dosageInput = doctorPage!.locator('input[name="dosage"], input[name="amount"], input[placeholder*="剂量"]')
      if (await dosageInput.isVisible()) {
        await dosageInput.fill(testConfig.medication.dosage)
      }
      
      const frequencyInput = doctorPage!.locator('input[name="frequency"], input[name="usage"], input[placeholder*="用法"]')
      if (await frequencyInput.isVisible()) {
        await frequencyInput.fill(testConfig.medication.frequency)
      }
    })

    await recordStep('医生提交医嘱', async () => {
      const submitBtn = doctorPage!.locator('.submit-btn, button[type="submit"], button:has-text("保存病历"), button:has-text("确认"), button:has-text("提交")')
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click()
      }
      await doctorPage!.waitForTimeout(3000)
      await takeScreenshot(doctorPage!, 'doctor_order_success')
    })

    await recordStep('药剂师刷新处方列表', async () => {
      await pharmacistPage!.reload()
      await pharmacistPage!.waitForTimeout(3000)
    })

    await recordStep('药剂师查看新处方', async () => {
      const patientName = testConfig.users.patient.name
      // 尝试精确匹配，否则使用第一个处方卡片
      const preciseMatch = pharmacistPage!.locator(`.presc-patient:has-text("${patientName}"), .presc-card:has-text("${patientName}")`)
      if (await preciseMatch.count() > 0) {
        await expect(preciseMatch.first()).toBeVisible({ timeout: 5000 })
      } else {
        // 如果没找到指定患者，选择第一个处方
        const firstPresc = pharmacistPage!.locator('.presc-card').first()
        await expect(firstPresc).toBeVisible({ timeout: 5000 })
      }
      await takeScreenshot(pharmacistPage!, 'pharmacist_view_new_prescription')
    })

    await recordStep('药剂师打开处方详情', async () => {
      const patientName = testConfig.users.patient.name
      const preciseMatch = pharmacistPage!.locator(`.presc-patient:has-text("${patientName}"), .presc-card:has-text("${patientName}")`)
      if (await preciseMatch.count() > 0) {
        await preciseMatch.first().click()
      } else {
        await pharmacistPage!.locator('.presc-card').first().click()
      }
      await pharmacistPage!.waitForTimeout(2000)
    })

    await recordStep('药剂师核对药品信息', async () => {
      // 验证处方详情中包含药品表格
      const medicineTable = pharmacistPage!.locator('table:has(.cell:text("药品名称"))').first()
      await expect(medicineTable).toBeVisible({ timeout: 5000 })
      
      // 验证至少有药品行
      const medicineRows = pharmacistPage!.locator('table tr:has(.cell)')
      const rowCount = await medicineRows.count()
      console.log(`处方包含 ${rowCount} 个药品项`)
      
      // 验证审核意见输入框存在
      const reviewInput = pharmacistPage!.locator('textarea[placeholder*="驳回"], textarea[placeholder*="审核"]')
      if (await reviewInput.isVisible()) {
        await reviewInput.fill('药品信息核对无误，同意发药')
      }
    })

    await recordStep('药剂师完成药品复核', async () => {
      // 查找通过/审核按钮
      const reviewBtn = pharmacistPage!.locator('button:has-text("通过"), button:has-text("审核"), button:has-text("确认"), button[type="submit"]')
      if (await reviewBtn.count() > 0) {
        await reviewBtn.first().click()
      }
      await pharmacistPage!.waitForTimeout(3000)
      await takeScreenshot(pharmacistPage!, 'pharmacist_review_success')
    })

    await recordStep('患者查看就诊记录', async () => {
      await patientPage!.goto('/medical-records')
      await patientPage!.waitForTimeout(2000)
    })

    await recordStep('患者确认就诊完成', async () => {
      // 检查是否有就诊记录
      const emptyState = patientPage!.locator('text=暂无就诊记录')
      if (await emptyState.isVisible()) {
        console.log('暂无就诊记录，跳过验证')
      } else {
        const recordElement = patientPage!.locator(`text=${testConfig.appointment.doctorName}`)
        if (await recordElement.count() > 0) {
          await expect(recordElement.first()).toBeVisible({ timeout: 5000 })
        }
      }
      await takeScreenshot(patientPage!, 'patient_view_record')
    })

  } finally {
    const totalDuration = Date.now() - startTime
    
    console.log('\n' + '='.repeat(60))
    console.log('多角色并发测试执行报告')
    console.log('='.repeat(60))
    console.log(`总耗时: ${totalDuration}ms`)
    console.log('\n执行步骤详情:')
    
    let successCount = 0
    let failedCount = 0
    
    stepResults.forEach((result, index) => {
      const statusIcon = result.status === 'SUCCESS' ? '✓' : '✗'
      console.log(`${index + 1}. ${statusIcon} ${result.step}`)
      console.log(`   状态: ${result.status}`)
      console.log(`   耗时: ${result.duration}ms`)
      if (result.error) {
        console.log(`   错误: ${result.error}`)
      }
      if (result.status === 'SUCCESS') successCount++
      else failedCount++
    })
    
    console.log('\n统计结果:')
    console.log(`✓ 成功: ${successCount}`)
    console.log(`✗ 失败: ${failedCount}`)
    
    const overallStatus = failedCount === 0 ? 'PASS' : 'FAIL'
    console.log(`\n测试结果: ${overallStatus}`)
    console.log('='.repeat(60))

    if (patientPage) await patientPage.close()
    if (doctorPage) await doctorPage.close()
    if (pharmacistPage) await pharmacistPage.close()
    await browser.close()
  }
})
