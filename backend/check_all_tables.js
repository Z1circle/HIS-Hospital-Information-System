const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'his_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkAllTables() {
  try {
    console.log('=== 检查所有包含 "code" 或 "no" 的字段 ===\n');
    
    // 检查 prescriptions 表的所有字段
    console.log('1. prescriptions 表结构：');
    const prescCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prescriptions'
      ORDER BY ordinal_position
    `);
    console.table(prescCols.rows.map(c => ({ name: c.column_name, type: c.data_type })));

    // 检查 registrations 表的所有字段
    console.log('\n2. registrations 表结构：');
    const regCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'registrations'
      ORDER BY ordinal_position
    `);
    console.table(regCols.rows.map(c => ({ name: c.column_name, type: c.data_type })));

    // 检查 patients 表的所有字段
    console.log('\n3. patients 表结构：');
    const patientCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `);
    console.table(patientCols.rows.map(c => ({ name: c.column_name, type: c.data_type })));

    // 查看一些示例数据
    console.log('\n4. 处方表示例数据（前3条）：');
    const samplePresc = await pool.query(`
      SELECT * FROM prescriptions LIMIT 3
    `);
    console.log(JSON.stringify(samplePresc.rows, null, 2));

  } catch (err) {
    console.error('错误:', err);
  } finally {
    await pool.end();
  }
}

checkAllTables();
