const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT || 5432,
});

(async () => {
  try {
    // 查询 patients 表结构
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `);
    
    console.log('patients 表结构:');
    console.log('列名\t\t\t数据类型\t\t可空');
    console.log('-'.repeat(60));
    res.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(20)} ${row.data_type.padEnd(15)} ${row.is_nullable}`);
    });
    
    // 检查是否有测试患者
    const countRes = await pool.query('SELECT COUNT(*) FROM patients');
    console.log('\n患者总数:', countRes.rows[0].count);
    
    // 显示前5个患者
    if (parseInt(countRes.rows[0].count) > 0) {
      const patients = await pool.query('SELECT * FROM patients LIMIT 5');
      console.log('\n前5个患者:');
      patients.rows.forEach(p => {
        console.log(JSON.stringify(p, null, 2));
      });
    }
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();
