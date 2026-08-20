const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkExamItems() {
  try {
    console.log('=== 检验项目表 ===');
    const result = await pool.query('SELECT id, name, exam_type, category, price FROM exam_items ORDER BY exam_type, category');
    console.log('exam_items:', result.rows.length, 'rows');
    result.rows.forEach(item => console.log(`  ID:${item.id}, name:${item.name}, exam_type:${item.exam_type}, category:${item.category}, price:${item.price}`));
    
    console.log('\n=== 处方创建接口 ===');
    const prescApi = await pool.query("SELECT * FROM information_schema.columns WHERE table_name = 'prescriptions'");
    console.log('prescriptions table columns:');
    prescApi.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkExamItems();