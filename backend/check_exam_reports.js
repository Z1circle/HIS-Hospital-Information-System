const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkExamReports() {
  try {
    console.log('=== exam_reports表字段 ===');
    const tableInfo = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exam_reports' ORDER BY ordinal_position");
    tableInfo.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    console.log('\n=== 数据总数 ===');
    const count = await pool.query('SELECT COUNT(*) FROM exam_reports');
    console.log('总记录数:', count.rows[0].count);
    
    console.log('\n=== 示例数据（前5条） ===');
    const data = await pool.query('SELECT id, patient_id, exam_type, exam_name, status, report_date, result, conclusion FROM exam_reports LIMIT 5');
    console.log(JSON.stringify(data.rows, null, 2));
    
    // 检查是否有乙肝五项相关的数据
    console.log('\n=== 乙肝五项相关数据 ===');
    const hepatitisB = await pool.query("SELECT * FROM exam_reports WHERE exam_name LIKE '%乙肝%' OR exam_name LIKE '%hepatitis%'");
    console.log('乙肝相关记录数:', hepatitisB.rows.length);
    if (hepatitisB.rows.length > 0) {
      console.log(JSON.stringify(hepatitisB.rows, null, 2));
    }
    
    process.exit(0);
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
}

checkExamReports();
