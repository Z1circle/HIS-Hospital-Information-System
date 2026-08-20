const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'his_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkPrescriptions() {
  try {
    console.log('=== 检查处方表结构 ===');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prescriptions'
      ORDER BY ordinal_position
    `);
    console.table(tableInfo.rows);

    console.log('\n=== 检查处方数据（前10条）===');
    const prescriptions = await pool.query(`
      SELECT 
        id,
        receipt_no,
        patient_id,
        visit_code,
        status,
        created_at
      FROM prescriptions
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(prescriptions.rows);

    console.log('\n=== 检查有visit_code的处方数量 ===');
    const withVisitCode = await pool.query(`
      SELECT COUNT(*) as count
      FROM prescriptions
      WHERE visit_code IS NOT NULL AND visit_code != ''
    `);
    console.log('有就诊码的处方数:', withVisitCode.rows[0].count);

    console.log('\n=== 检查没有visit_code的处方数量 ===');
    const withoutVisitCode = await pool.query(`
      SELECT COUNT(*) as count
      FROM prescriptions
      WHERE visit_code IS NULL OR visit_code = ''
    `);
    console.log('没有就诊码的处方数:', withoutVisitCode.rows[0].count);

    // 如果有处方但没有visit_code，尝试从关联的registrations表获取
    console.log('\n=== 尝试从挂号记录获取就诊码 ===');
    const joinCheck = await pool.query(`
      SELECT 
        p.id as prescription_id,
        p.visit_code as presc_visit_code,
        r.visit_code as reg_visit_code,
        p.patient_id,
        r.id as registration_id
      FROM prescriptions p
      LEFT JOIN registrations r ON p.patient_id = r.patient_id 
        AND DATE(p.created_at) = DATE(r.created_at)
      WHERE p.visit_code IS NULL OR p.visit_code = ''
      LIMIT 5
    `);
    console.table(joinCheck.rows);

  } catch (err) {
    console.error('错误:', err);
  } finally {
    await pool.end();
  }
}

checkPrescriptions();
