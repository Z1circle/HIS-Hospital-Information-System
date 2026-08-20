/**
 * 数据库检查和修复脚本
 * 1. 检查并添加科室简介字段
 * 2. 创建收费记录测试数据
 * 3. 检查排班数据
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
    // 1. 检查并添加科室简介字段
    console.log('=== 1. 检查科室表结构 ===');
    const deptColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'departments' ORDER BY ordinal_position
    `);
    console.log('departments表字段:', deptColumns.rows.map(c => c.column_name));

    const hasDescription = deptColumns.rows.some(c => c.column_name === 'description');
    if (!hasDescription) {
      console.log('添加description字段...');
      await client.query('ALTER TABLE departments ADD COLUMN description TEXT DEFAULT \'\'');
      console.log('[OK] description字段已添加');

      // 更新科室简介数据
      console.log('更新科室简介数据...');
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
    } else {
      console.log('[OK] description字段已存在');
    }

    // 2. 检查收费记录表
    console.log('\n=== 2. 检查收费记录表 ===');
    try {
      const chargeCount = await client.query('SELECT COUNT(*) FROM charges');
      console.log(`charges表记录数: ${chargeCount.rows[0].count}`);

      if (parseInt(chargeCount.rows[0].count) === 0) {
        console.log('创建测试收费记录...');
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
        console.log('[OK] 测试收费记录已创建');
      }
    } catch (err) {
      console.log('charges表不存在，创建表...');
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
      console.log('[OK] charges表已创建');
    }

    // 3. 检查排班表
    console.log('\n=== 3. 检查排班表 ===');
    const scheduleCount = await client.query('SELECT COUNT(*) FROM schedules');
    console.log(`schedules表记录数: ${scheduleCount.rows[0].count}`);

    // 查看最近一周的排班
    const recentSchedules = await client.query(`
      SELECT s.*, d.name as doctor_name, dept.name as dept_name
      FROM schedules s
      JOIN doctors d ON s.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      ORDER BY s.schedule_date DESC, s.am_pm
      LIMIT 20
    `);
    console.log('最近排班记录:');
    recentSchedules.rows.forEach(s => {
      console.log(`  ${s.schedule_date} ${s.am_pm} - ${s.doctor_name}(${s.dept_name}) - 总号:${s.total} 剩余:${s.remaining}`);
    });

    // 4. 检查医生表
    console.log('\n=== 4. 检查医生表 ===');
    const doctorCount = await client.query('SELECT COUNT(*) FROM doctors');
    console.log(`doctors表记录数: ${doctorCount.rows[0].count}`);

    const doctors = await client.query('SELECT id, name, title, department_id, status FROM doctors ORDER BY id');
    doctors.rows.forEach(d => {
      console.log(`  ID:${d.id} ${d.name} - ${d.title} - 科室ID:${d.department_id} - 状态:${d.status || 'active'}`);
    });

    console.log('\n=== 数据库检查完成 ===');

  } catch (err) {
    console.error('数据库操作失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();