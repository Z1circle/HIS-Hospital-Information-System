/**
 * 数据库修复脚本 - 完成所有必要的修复
 */
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function run() {
  const client = await pool.connect();

  try {
    // 1. 添加医生表的status字段
    console.log('=== 1. 添加医生表status字段 ===');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'doctors' AND column_name = 'status'
        ) THEN
          ALTER TABLE doctors ADD COLUMN status VARCHAR(20) DEFAULT 'active';
          RAISE NOTICE '已添加 doctors.status 字段';
        ELSE
          RAISE NOTICE 'doctors.status 字段已存在';
        END IF;
      END $$;
    `);
    console.log('[OK] 医生表status字段处理完成');

    // 2. 创建收费记录表并添加测试数据
    console.log('\n=== 2. 创建收费记录表 ===');
    await client.query(`
      CREATE TABLE IF NOT EXISTS charges (
        id SERIAL PRIMARY KEY,
        receipt_no VARCHAR(50) UNIQUE NOT NULL,
        patient_name VARCHAR(100) NOT NULL,
        doctor_name VARCHAR(100),
        total_amount DECIMAL(10,2) NOT NULL,
        insurance_amount DECIMAL(10,2) DEFAULT 0,
        patient_amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(20) DEFAULT 'cash',
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 添加测试数据
    const existingCharges = await client.query('SELECT COUNT(*) FROM charges');
    if (parseInt(existingCharges.rows[0].count) === 0) {
      console.log('添加测试收费记录...');
      const charges = [
        { receipt_no: 'SF202606180001', patient_name: '王建国', doctor_name: '张明华', total_amount: 458.50, insurance_amount: 320.00, patient_amount: 138.50, payment_method: 'card', status: 'completed', created_at: '2026-06-18 08:30:00' },
        { receipt_no: 'SF202606180002', patient_name: '李秀英', doctor_name: '王建国', total_amount: 1260.80, insurance_amount: 890.00, patient_amount: 370.80, payment_method: 'cash', status: 'completed', created_at: '2026-06-18 09:15:00' },
        { receipt_no: 'SF202606180003', patient_name: '赵文博', doctor_name: '刘志强', total_amount: 856.30, insurance_amount: 600.00, patient_amount: 256.30, payment_method: 'wechat', status: 'completed', created_at: '2026-06-18 10:00:00' },
        { receipt_no: 'SF202606180004', patient_name: '孙晓红', doctor_name: '李秀英', total_amount: 230.00, insurance_amount: 180.00, patient_amount: 50.00, payment_method: 'card', status: 'completed', created_at: '2026-06-18 10:45:00' },
        { receipt_no: 'SF202606180005', patient_name: '陈志明', doctor_name: '陈玉芳', total_amount: 689.20, insurance_amount: 480.00, patient_amount: 209.20, payment_method: 'cash', status: 'completed', created_at: '2026-06-18 11:30:00' },
        { receipt_no: 'SF202606180006', patient_name: '吴桂香', doctor_name: '赵晓燕', total_amount: 95.50, insurance_amount: 0, patient_amount: 95.50, payment_method: 'wechat', status: 'refunded', created_at: '2026-06-18 13:00:00' },
        { receipt_no: 'SF202606170007', patient_name: '刘志强', doctor_name: '孙伟', total_amount: 1560.00, insurance_amount: 1100.00, patient_amount: 460.00, payment_method: 'card', status: 'completed', created_at: '2026-06-17 15:20:00' },
        { receipt_no: 'SF202606170008', patient_name: '张丽华', doctor_name: '周丽', total_amount: 420.00, insurance_amount: 280.00, patient_amount: 140.00, payment_method: 'cash', status: 'completed', created_at: '2026-06-17 16:10:00' },
      ];
      for (const charge of charges) {
        await client.query(`
          INSERT INTO charges (receipt_no, patient_name, doctor_name, total_amount, 
            insurance_amount, patient_amount, payment_method, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [charge.receipt_no, charge.patient_name, charge.doctor_name, charge.total_amount,
            charge.insurance_amount, charge.patient_amount, charge.payment_method, 
            charge.status, charge.created_at]);
      }
      console.log('[OK] 测试收费记录已添加');
    } else {
      console.log('[OK] 收费记录表已有数据');
    }

    // 3. 确保科室表有description字段
    console.log('\n=== 3. 确保科室表有description字段 ===');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'departments' AND column_name = 'description'
        ) THEN
          ALTER TABLE departments ADD COLUMN description TEXT DEFAULT '';
          RAISE NOTICE '已添加 departments.description 字段';
        ELSE
          RAISE NOTICE 'departments.description 字段已存在';
        END IF;
      END $$;
    `);

    // 更新科室简介
    const deptDescriptions = [
      { id: 1, desc: '呼吸系统、心血管、内分泌等疾病的诊断与治疗' },
      { id: 2, desc: '外科手术、创伤处理、肿瘤外科等诊疗服务' },
      { id: 3, desc: '中医辨证施治、针灸推拿、中药调理' },
      { id: 4, desc: '妇科、产科疾病诊治，孕期保健与分娩' },
      { id: 5, desc: '儿童常见病、多发病及疑难病症诊疗' },
      { id: 6, desc: '皮肤病、性病的诊断与治疗' },
      { id: 7, desc: '眼科疾病诊疗、白内障手术、近视矫正' },
      { id: 8, desc: '耳鼻咽喉疾病诊疗，听力检测与康复' },
    ];
    for (const { id, desc } of deptDescriptions) {
      await client.query('UPDATE departments SET description=$1 WHERE id=$2', [desc, id]);
    }
    console.log('[OK] 科室简介已更新');

    // 4. 添加历史排班数据
    console.log('\n=== 4. 添加历史排班数据 ===');
    const today = new Date();
    const historySchedules = [];
    
    // 获取医生列表
    const doctors = await client.query('SELECT id, department_id FROM doctors WHERE is_inpatient = false ORDER BY id');
    const doctorIds = doctors.rows.map(d => d.id);

    // 生成过去7天的排班
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const ds = date.toISOString().slice(0, 10);
      
      for (const docId of doctorIds) {
        // 随机跳过一些日期
        if (Math.random() > 0.7) continue;
        
        const amTotal = Math.floor(Math.random() * 15) + 10;
        const pmTotal = Math.floor(Math.random() * 10) + 5;
        const amBooked = Math.floor(Math.random() * amTotal);
        const pmBooked = Math.floor(Math.random() * pmTotal);
        
        historySchedules.push({
          doctor_id: docId,
          schedule_date: ds,
          am_pm: 'am',
          total: amTotal,
          remaining: amTotal - amBooked,
          booked: amBooked,
          slot_type: 'normal',
          fee: 10,
          is_stopped: false
        });
        
        historySchedules.push({
          doctor_id: docId,
          schedule_date: ds,
          am_pm: 'pm',
          total: pmTotal,
          remaining: pmTotal - pmBooked,
          booked: pmBooked,
          slot_type: 'normal',
          fee: 10,
          is_stopped: false
        });
      }
    }

    // 批量插入历史排班
    for (const schedule of historySchedules) {
      await client.query(`
        INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, booked, slot_type, fee, is_stopped)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (doctor_id, schedule_date, am_pm) DO NOTHING
      `, [schedule.doctor_id, schedule.schedule_date, schedule.am_pm, schedule.total, 
          schedule.remaining, schedule.booked, schedule.slot_type, schedule.fee, schedule.is_stopped]);
    }
    console.log(`[OK] 添加了 ${historySchedules.length} 条历史排班记录`);

    // 5. 验证数据
    console.log('\n=== 5. 验证数据 ===');
    const deptCount = await client.query('SELECT COUNT(*) FROM departments');
    const chargeCount = await client.query('SELECT COUNT(*) FROM charges');
    const scheduleCount = await client.query('SELECT COUNT(*) FROM schedules');
    const doctorCount = await client.query('SELECT COUNT(*) FROM doctors');

    console.log(`科室数: ${deptCount.rows[0].count}`);
    console.log(`收费记录数: ${chargeCount.rows[0].count}`);
    console.log(`排班记录数: ${scheduleCount.rows[0].count}`);
    console.log(`医生数: ${doctorCount.rows[0].count}`);

    // 检查科室是否有description
    const sampleDept = await client.query('SELECT id, name, description FROM departments LIMIT 2');
    console.log('\n科室示例:');
    sampleDept.rows.forEach(d => console.log(`  ${d.name}: ${d.description.substring(0, 30)}...`));

    console.log('\n=== 数据库修复完成 ===');

  } catch (err) {
    console.error('数据库操作失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();