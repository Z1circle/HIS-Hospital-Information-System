const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkExamReportsTable() {
  try {
    console.log('=== 检查 exam_reports 表结构 ===');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'exam_reports' 
      ORDER BY ordinal_position
    `);
    tableInfo.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} | nullable: ${r.is_nullable} | default: ${r.column_default}`);
    });
    
    // 检查主键约束
    console.log('\n=== 主键约束 ===');
    const pkConstraint = await pool.query(`
      SELECT constraint_name, column_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = 'exam_reports' AND constraint_name LIKE '%pkey%'
    `);
    console.log(JSON.stringify(pkConstraint.rows, null, 2));
    
    // 检查是否有重复的 request_id
    console.log('\n=== 检查重复的 request_id ===');
    const duplicates = await pool.query(`
      SELECT request_id, COUNT(*) as cnt 
      FROM exam_reports 
      WHERE request_id IS NOT NULL 
      GROUP BY request_id 
      HAVING COUNT(*) > 1
    `);
    if (duplicates.rows.length > 0) {
      console.log('发现重复的 request_id:', duplicates.rows);
    } else {
      console.log('没有重复的 request_id');
    }
    
    // 查看最近的几条记录
    console.log('\n=== 最近5条记录 ===');
    const recent = await pool.query(`
      SELECT id, request_id, patient_id, exam_name, status, report_date, created_at 
      FROM exam_reports 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(JSON.stringify(recent.rows, null, 2));
    
    process.exit(0);
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
}

checkExamReportsTable();
