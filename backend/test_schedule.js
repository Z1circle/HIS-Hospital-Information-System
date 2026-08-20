const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: '1234', host: 'localhost', database: 'hisdb' });

(async () => {
  console.log('=== 排班系统完整性检查 ===\n');

  // 1. 检查数据库中的排班数据格式
  console.log('1. 检查排班数据格式...');
  const schedules = await pool.query(`
    SELECT id, doctor_id, schedule_date, am_pm, total, remaining, slot_type, is_stopped
    FROM schedules
    ORDER BY schedule_date DESC, doctor_id, am_pm
    LIMIT 10
  `);
  console.log(`找到 ${schedules.rows.length} 条排班记录:`);
  schedules.rows.forEach(s => {
    console.log(`  ID:${s.id} 医生:${s.doctor_id} 日期:${s.schedule_date} 时段:${s.am_pm} 总数:${s.total} 剩余:${s.remaining} 类型:${s.slot_type} 停诊:${s.is_stopped}`);
  });

  // 2. 检查是否有中文格式的am_pm
  console.log('\n2. 检查中文格式am_pm...');
  const chineseFormat = await pool.query(`
    SELECT COUNT(*) as count FROM schedules WHERE am_pm IN ('上午', '下午')
  `);
  console.log(`中文格式记录数: ${chineseFormat.rows[0].count}`);

  // 3. 检查是否有重复记录
  console.log('\n3. 检查重复记录...');
  const duplicates = await pool.query(`
    SELECT doctor_id, schedule_date, am_pm, COUNT(*) as count
    FROM schedules
    GROUP BY doctor_id, schedule_date, am_pm
    HAVING COUNT(*) > 1
  `);
  if (duplicates.rows.length > 0) {
    console.log('发现重复记录:');
    duplicates.rows.forEach(d => {
      console.log(`  医生:${d.doctor_id} 日期:${d.schedule_date} 时段:${d.am_pm} 重复数:${d.count}`);
    });
  } else {
    console.log('无重复记录 ✓');
  }

  // 4. 检查患者端API查询逻辑
  console.log('\n4. 测试患者端科室号源查询...');
  const today = new Date().toISOString().slice(0, 10);
  const depts = await pool.query(`
    SELECT d.id, d.name, d.icon,
      COALESCE(SUM(s.remaining),0) AS remaining_today
    FROM departments d
    LEFT JOIN doctors doc ON doc.department_id = d.id
    LEFT JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
    GROUP BY d.id ORDER BY d.id
    LIMIT 5
  `, [today]);
  console.log(`今日(${today})科室号源:`);
  depts.rows.forEach(d => {
    console.log(`  ${d.name}: 剩余号源 ${d.remaining_today}`);
  });

  // 5. 测试医生排班查询
  console.log('\n5. 测试医生排班查询...');
  if (depts.rows.length > 0) {
    const testDeptId = depts.rows[0].id;
    const doctors = await pool.query(`
      SELECT doc.id, doc.name, doc.title,
        json_agg(json_build_object(
          'id', s.id, 'am_pm', s.am_pm, 'remaining', s.remaining, 'total', s.total,
          'slot_type', COALESCE(s.slot_type,'normal'), 'fee', COALESCE(s.fee, doc.fee, 10)
        )) AS schedules
      FROM doctors doc
      JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
      WHERE doc.department_id = $2
      GROUP BY doc.id
    `, [today, testDeptId]);
    console.log(`${depts.rows[0].name} 医生排班:`);
    doctors.rows.forEach(doc => {
      console.log(`  ${doc.name} (${doc.title}):`);
      if (doc.schedules) {
        doc.schedules.forEach(s => {
          console.log(`    ${s.am_pm === 'am' ? '上午' : '下午'}: 总数${s.total} 剩余${s.remaining} 类型${s.slot_type}`);
        });
      }
    });
  }

  // 6. 测试排班保存逻辑（模拟）
  console.log('\n6. 测试排班保存逻辑...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const testDoctorId = 2;
    const testDate = '2026-06-20';
    const testAmTotal = 25;
    const testPmTotal = 20;

    // 删除旧记录
    await client.query(`
      DELETE FROM schedules WHERE doctor_id=$1 AND schedule_date=$2
      AND am_pm IN ('上午', '下午')
    `, [testDoctorId, testDate]);

    // 插入上午排班
    await client.query(
      `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, is_stopped)
       VALUES ($1,$2,'am',$3,$3,$4,$5,false)
       ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
       SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false`,
      [testDoctorId, testDate, testAmTotal, 'normal', 10]
    );

    // 插入下午排班
    await client.query(
      `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, is_stopped)
       VALUES ($1,$2,'pm',$3,$3,$4,$5,false)
       ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
       SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false`,
      [testDoctorId, testDate, testPmTotal, 'normal', 10]
    );

    await client.query('COMMIT');
    console.log(`测试排班保存成功: 医生${testDoctorId} ${testDate} 上午${testAmTotal} 下午${testPmTotal}`);

    // 验证保存结果
    const saved = await pool.query(`
      SELECT am_pm, total, remaining, slot_type
      FROM schedules
      WHERE doctor_id=$1 AND schedule_date=$2
      ORDER BY am_pm
    `, [testDoctorId, testDate]);
    console.log('保存结果:');
    saved.rows.forEach(s => {
      console.log(`  ${s.am_pm === 'am' ? '上午' : '下午'}: 总数${s.total} 剩余${s.remaining} 类型${s.slot_type}`);
    });

    // 清理测试数据
    await pool.query(`DELETE FROM schedules WHERE doctor_id=$1 AND schedule_date=$2`, [testDoctorId, testDate]);
    console.log('已清理测试数据');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('测试失败:', err.message);
  } finally {
    client.release();
  }

  console.log('\n=== 检查完成 ===');
  await pool.end();
})();
