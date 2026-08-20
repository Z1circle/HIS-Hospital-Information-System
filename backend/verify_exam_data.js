const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function verifyData() {
  try {
    console.log('=== 乙肝五项报告示例 ===');
    const data = await pool.query("SELECT id, patient_id, exam_name, result, conclusion FROM exam_reports WHERE exam_name = '乙肝五项' LIMIT 1");
    console.log(JSON.stringify(data.rows[0], null, 2));
    
    // 检查result字段是否为有效的JSON数组
    if (data.rows[0]) {
      try {
        const parsed = JSON.parse(data.rows[0].result);
        console.log('\n✅ Result字段解析成功，包含', parsed.length, '个项目');
        console.log('项目列表:', parsed.map(item => item.item_name).join(', '));
      } catch(e) {
        console.error('\n❌ Result字段不是有效的JSON:', e.message);
      }
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
}

verifyData();
