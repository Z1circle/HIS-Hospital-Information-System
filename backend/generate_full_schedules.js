require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432
});

/**
 * 全面排班数据生成脚本
 * 目标：从当前日期到 2026-07-03，每个科室每天都有可预约号源
 * 避免所有诊室同时约满，合理分配剩余号源
 */
async function generateScheduleData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 获取所有医生（排除住院医生）
    const docResult = await client.query(`
      SELECT d.id, d.department_id, d.title, d.name, dept.name as dept_name
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      WHERE d.is_inpatient = false
      ORDER BY d.department_id, d.id
    `);
    const doctors = docResult.rows;

    // 2. 设定日期范围：今天 → 2026-07-03
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date('2026-07-03');
    endDate.setHours(0, 0, 0, 0);

    // 3. 按科室分组
    const deptDoctors = {};
    for (const doc of doctors) {
      if (!deptDoctors[doc.department_id]) deptDoctors[doc.department_id] = [];
      deptDoctors[doc.department_id].push(doc);
    }

    let createdCount = 0;
    let updatedCount = 0;

    console.log(`=== 全面排班数据生成 ===`);
    console.log(`日期范围: ${today.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}`);
    console.log(`科室数: ${Object.keys(deptDoctors).length}, 医生数: ${doctors.length}\n`);

    // 4. 为每一天、每个科室、每个医生生成排班
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay(); // 0=周日

      // 周日全院休息，但至少有一个急诊值班
      if (dayOfWeek === 0) {
        // 为每个科室的第一个医生安排半天急诊
        for (const [deptId, docs] of Object.entries(deptDoctors)) {
          const doc = docs[0]; // 每个科室第一个医生值班
          const r = await client.query(
            `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
             VALUES ($1,$2,'am',5,5,'emergency',10)
             ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
             SET total=EXCLUDED.total, remaining=5, slot_type='emergency', fee=10, is_stopped=false
             RETURNING id`,
            [doc.id, ds]
          );
          if (r.rows[0]) createdCount++;
          console.log(`  [周日值班] ${ds} ${doc.dept_name} - ${doc.name}（上午急诊 5号）`);
        }
        continue;
      }

      // 工作日：每个医生都安排上午和下午
      for (const doc of doctors) {
        // 随机号源数（15-25），避免全是20
        const amTotal = 15 + Math.floor(Math.random() * 11); // 15~25
        const pmTotal = 12 + Math.floor(Math.random() * 9);  // 12~20

        // 随机剩余号源（确保有号可约）
        // 部分号源约满一半，部分几乎全满，部分很空
        const rand = Math.random();
        let amRemaining, pmRemaining;
        if (rand < 0.3) {
          // 30%概率：热门医生，号源偏少
          amRemaining = Math.floor(amTotal * 0.1) + 1;
          pmRemaining = Math.floor(pmTotal * 0.1) + 1;
        } else if (rand < 0.7) {
          // 40%概率：正常
          amRemaining = Math.floor(amTotal * (0.3 + Math.random() * 0.5));
          pmRemaining = Math.floor(pmTotal * (0.3 + Math.random() * 0.5));
        } else {
          // 30%概率：冷门医生，号源充足
          amRemaining = Math.floor(amTotal * (0.6 + Math.random() * 0.4));
          pmRemaining = Math.floor(pmTotal * (0.6 + Math.random() * 0.4));
        }

        // 确保每个科室每天至少有一个医生有 >=5 个可预约号源（避免全部约满）
        if (amRemaining < 3) amRemaining = 3;
        if (pmRemaining < 2) pmRemaining = 2;

        // 上午排班
        const amSlotType = ['normal', 'normal', 'normal', 'expert', 'famous'][Math.floor(Math.random() * 5)];
        const amR = await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
           VALUES ($1,$2,'am',$3,$4,$5,$6)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=$4, slot_type=$5, fee=$6, is_stopped=false
           RETURNING id`,
          [doc.id, ds, amTotal, amRemaining, amSlotType, doc.title === '主任医师' ? 50 : (doc.title === '副主任医师' ? 35 : 25)]
        );
        if (amR.rows[0]) createdCount++;

        // 下午排班
        const pmSlotType = Math.random() < 0.7 ? 'normal' : 'expert';
        const pmR = await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
           VALUES ($1,$2,'pm',$3,$4,$5,$6)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=$4, slot_type=$5, fee=$6, is_stopped=false
           RETURNING id`,
          [doc.id, ds, pmTotal, pmRemaining, pmSlotType, doc.title === '主任医师' ? 50 : 35]
        );
        if (pmR.rows[0]) createdCount++;
      }
    }

    // 5. 统计结果
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_schedules,
        COUNT(DISTINCT schedule_date) as total_days,
        SUM(CASE WHEN remaining > 0 AND is_stopped = false THEN 1 ELSE 0 END) as available_slots,
        SUM(CASE WHEN remaining = 0 AND is_stopped = false THEN 1 ELSE 0 END) as full_slots
      FROM schedules
      WHERE schedule_date >= CURRENT_DATE AND schedule_date <= '2026-07-03'
    `);

    await client.query('COMMIT');

    console.log(`\n=== 生成完成 ===`);
    console.log(`新建/更新排班: ${createdCount} 条`);
    console.log(`总排班记录: ${stats.rows[0].total_schedules}`);
    console.log(`覆盖天数: ${stats.rows[0].total_days}`);
    console.log(`可预约号源: ${stats.rows[0].available_slots}`);
    console.log(`已约满号源: ${stats.rows[0].full_slots}`);

    // 6. 按科室汇总今日号源
    const todayStats = await pool.query(`
      SELECT dept.name as dept_name, 
        COUNT(*) as schedule_count,
        SUM(total) as total_quota,
        SUM(remaining) as total_remaining,
        MIN(remaining) as min_remaining
      FROM schedules s
      JOIN doctors d ON s.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE s.schedule_date = CURRENT_DATE AND s.is_stopped = false
      GROUP BY dept.id, dept.name
      ORDER BY dept.id
    `);

    console.log(`\n=== 今日(${today.toISOString().slice(0, 10)})科室号源汇总 ===`);
    console.log('科室\t\t排班数\t总号源\t剩余\t最小余量');
    for (const row of todayStats.rows) {
      console.log(`${row.dept_name}\t\t${row.schedule_count}\t${row.total_quota}\t${row.total_remaining}\t${row.min_remaining}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 生成排班失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateScheduleData().catch(console.error);
