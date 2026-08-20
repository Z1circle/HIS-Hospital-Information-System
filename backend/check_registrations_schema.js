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
    // 查询 registrations 表结构
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'registrations'
      ORDER BY ordinal_position
    `);
    
    console.log('registrations 表结构:');
    console.log('列名\t\t\t数据类型\t\t可空');
    console.log('-'.repeat(60));
    res.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(20)} ${row.data_type.padEnd(15)} ${row.is_nullable}`);
    });
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();
