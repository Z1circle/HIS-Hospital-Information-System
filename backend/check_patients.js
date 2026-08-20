const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'his_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkPatients() {
  try {
    console.log('=== 检查患者表结构 ===');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `);
    console.table(tableInfo.rows);

    console.log('\n=== 检查患者数据（前5条）===');
    const patients = await pool.query(`
      SELECT id, name, visit_code, created_at
      FROM patients
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(patients.rows);

  } catch (err) {
    console.error('错误:', err);
  } finally {
    await pool.end();
  }
}

checkPatients();
