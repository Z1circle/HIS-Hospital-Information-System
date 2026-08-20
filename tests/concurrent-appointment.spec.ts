import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:4000/api'

test('多人并发抢同一号源-FOR UPDATE锁验证', async ({ request }) => {
  const TOTAL_USERS = 3
  const startTime = Date.now()

  console.log('\n' + '='.repeat(60))
  console.log('并发抢号压力测试 - 仅1个号源')
  console.log('='.repeat(60))

  // ============================================================
  // 1. 登录所有患者
  // ============================================================
  console.log('\n1. 登录患者...')

  const patients = [
    { u: 'patient', p: '123456', name: '王小明' },
    { u: 'patient1', p: '123456', name: '李小红' },
    { u: 'patient2', p: '123456', name: '张大明' },
  ]

  const users: { name: string; id: number; patient_id: number }[] = []

  for (const p of patients) {
    const r = await request.post(`${API_BASE}/auth/login`, {
      data: { username: p.u, password: p.p }
    })
    const body = await r.json()
    expect(r.status()).toBe(200)
    users.push({ name: body.real_name || p.name, id: body.id, patient_id: body.patient_id })
    console.log(`   ${body.real_name} (user_id=${body.id}, patient_id=${body.patient_id}) ✓`)
  }

  // ============================================================
  // 2. 找排班 + 重置号源为1
  // ============================================================
  console.log('\n2. 准备号源...')

  const docResp = await request.get(`${API_BASE}/appointment/doctors?dept_id=1`)
  const doctors = await docResp.json()

  // 拿第一个有排班的医生
  let scheduleId = 0
  let doctorId = 0

  for (const d of doctors) {
    if (d.schedules?.length > 0) {
      doctorId = d.id
      scheduleId = d.schedules[0].id
      console.log(`   医生: ${d.name} (id=${doctorId}), schedule_id=${scheduleId}`)
      break
    }
  }
  if (!scheduleId) throw new Error('未找到可用排班')

  // 直接重置为1
  await request.put(`${API_BASE}/test/set-schedule-remaining`, {
    data: { schedule_id: scheduleId, remaining: 1 }
  })

  // 验证
  const v = await request.get(`${API_BASE}/appointment/doctors?dept_id=1`)
  const vData = await v.json()
  let actualRemaining = 0
  for (const d of vData) {
    for (const s of d.schedules || []) {
      if (s.id === scheduleId) actualRemaining = s.remaining
    }
  }
  console.log(`   schedule_id=${scheduleId}, remaining=${actualRemaining}`)
  expect(actualRemaining).toBe(1)

  // ============================================================
  // 3. 并发抢号！3人同时发起
  // ============================================================
  console.log(`\n3. 并发抢号（${TOTAL_USERS}人抢1个号）...`)

  const raceStart = Date.now()

  const results = await Promise.all(
    users.map(async (user) => {
      const reqStart = Date.now()
      const resp = await request.post(`${API_BASE}/appointment/create`, {
        data: {
          patient_id: user.patient_id,
          schedule_id: scheduleId,
          doctor_id: doctorId,
          department_id: 1
        }
      })
      const body = await resp.json()
      return {
        name: user.name,
        status: resp.status(),
        success: resp.status() === 200,
        error: body.error || '',
        elapsed: Date.now() - reqStart
      }
    })
  )

  const raceDuration = Date.now() - raceStart

  // ============================================================
  // 4. 分析
  // ============================================================
  console.log('')
  let successCount = 0

  for (const r of results.sort((a, b) => a.elapsed - b.elapsed)) {
    if (r.success) {
      successCount++
      console.log(`   ✅ ${r.name}: 抢号成功！(HTTP 200) 耗时 ${r.elapsed}ms`)
    } else {
      console.log(`   ❌ ${r.name}: ${r.error} (HTTP ${r.status}) 耗时 ${r.elapsed}ms`)
    }
  }

  const failCount = TOTAL_USERS - successCount

  console.log('\n' + '='.repeat(60))
  console.log('测试结论')
  console.log('='.repeat(60))
  console.log(`   号源数量: 1`)
  console.log(`   并发人数: ${TOTAL_USERS}`)
  console.log(`   成功人数: ${successCount}`)
  console.log(`   失败人数: ${failCount}`)
  console.log(`   并发耗时: ${raceDuration}ms`)
  console.log(`   总耗时:   ${Date.now() - startTime}ms`)

  if (successCount === 1) {
    console.log('\n   🟢 FOR UPDATE 锁生效！仅1人抢到号，其余被正确拦截。')
  } else if (successCount > 1) {
    console.log(`\n   � 超卖！${successCount}人抢到了仅有1个号的号源！FOR UPDATE 锁未生效！`)
  } else {
    console.log('\n   � 无人抢到号，请检查日志。')
  }

  expect(successCount).toBe(1)
  expect(failCount).toBe(2)
})
