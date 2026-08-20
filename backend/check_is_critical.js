const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function checkIsCriticalField() {
  console.log('=== 检查 is_critical 字段 ===\n');
  
  try {
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'exam_reports' AND column_name = 'is_critical'
    `);
    
    if (columns.rows.length === 0) {
      console.log('❌ 缺少 is_critical 字段，正在添加...');
      await pool.query('ALTER TABLE exam_reports ADD COLUMN is_critical BOOLEAN DEFAULT false');
      console.log('✅ is_critical 字段已添加');
    } else {
      console.log('✅ is_critical 字段已存在');
    }
    
  } catch (err) {
    console.error('❌ 检查失败:', err.message);
  } finally {
    await pool.end();
  }
}

checkIsCriticalField();