const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'his_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkRegistrations() {
  try {
    console.log('=== 检查挂号表结构 ===');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'registrations'
      ORDER BY ordinal_position
    `);
    console.table(tableInfo.rows);

    console.log('\n=== 检查挂号数据（前5条）===');
    const registrations = await pool.query(`
      SELECT 
        id,
        patient_id,
        visit_code,
        created_at
      FROM registrations
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(registrations.rows);

    // 关联查询：从挂号记录获取就诊码
    console.log('\n=== 关联查询处方和挂号记录的就诊码 ===');
    const joinResult = await pool.query(`
      SELECT 
        p.id as prescription_id,
        p.receipt_no,
        p.patient_id,
        p.visit_code as presc_visit_code,
        r.visit_code as reg_visit_code,
        r.created_at as reg_created
      FROM prescriptions p
      LEFT JOIN registrations r ON p.patient_id = r.patient_id 
        AND DATE(p.created_at) = DATE(r.created_at)
      WHERE p.status IN ('pending', 'received')
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.table(joinResult.rows);

  } catch (err) {
    console.error('错误:', err);
  } finally {
    await pool.end();
  }
}

checkRegistrations();
