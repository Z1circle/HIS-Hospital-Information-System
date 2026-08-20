const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkSequence() {
  try {
    console.log('=== 检查序列当前值 ===');
    const seq = await pool.query("SELECT last_value, is_called FROM exam_reports_id_seq");
    console.log('序列状态:', JSON.stringify(seq.rows[0], null, 2));
    
    console.log('\n=== 最大ID ===');
    const maxId = await pool.query('SELECT MAX(id) as max_id FROM exam_reports');
    console.log('最大ID:', maxId.rows[0].max_id);
    
    // 如果序列值小于最大ID，需要重置序列
    if (seq.rows[0].last_value < maxId.rows[0].max_id) {
      console.log('\n⚠️  序列值落后于最大ID，需要修复！');
      const nextVal = maxId.rows[0].max_id + 1;
      await pool.query(`ALTER SEQUENCE exam_reports_id_seq RESTART WITH ${nextVal}`);
      console.log(`✅ 序列已重置为: ${nextVal}`);
    } else {
      console.log('\n✅ 序列正常');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
}

checkSequence();
