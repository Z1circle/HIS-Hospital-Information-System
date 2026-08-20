const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function checkAndFixExamReportsTable() {
  console.log('=== 检查并修复 exam_reports 表 ===\n');
  
  try {
    // 检查当前表结构
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_reports'
      ORDER BY ordinal_position
    `);
    
    console.log('当前 exam_reports 表结构:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${col.is_nullable}`);
    });
    
    // 检查是否缺少 findings 字段
    const hasFindings = columns.rows.some(col => col.column_name === 'findings');
    const hasImageFeatures = columns.rows.some(col => col.column_name === 'image_features');
    const hasImageUrl = columns.rows.some(col => col.column_name === 'image_url');
    
    if (!hasFindings) {
      console.log('\n❌ 缺少 findings 字段，正在添加...');
      await pool.query('ALTER TABLE exam_reports ADD COLUMN findings TEXT');
      console.log('✅ findings 字段已添加');
    }
    
    if (!hasImageFeatures) {
      console.log('\n❌ 缺少 image_features 字段，正在添加...');
      await pool.query('ALTER TABLE exam_reports ADD COLUMN image_features TEXT');
      console.log('✅ image_features 字段已添加');
    }
    
    if (!hasImageUrl) {
      console.log('\n❌ 缺少 image_url 字段，正在添加...');
      await pool.query('ALTER TABLE exam_reports ADD COLUMN image_url TEXT');
      console.log('✅ image_url 字段已添加');
    }
    
    console.log('\n=== 修复完成 ===');
    
  } catch (err) {
    console.error('❌ 修复失败:', err.message);
  } finally {
    await pool.end();
  }
}

checkAndFixExamReportsTable();