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
    // 查找所有包含exam的表
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%exam%'
      ORDER BY table_name
    `);
    
    console.log('包含"exam"的表:');
    res.rows.forEach(r => {
      console.log(`  - ${r.table_name}`);
    });
    
    // 查找所有包含order的表
    const orderRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%order%'
      ORDER BY table_name
    `);
    
    console.log('\n包含"order"的表:');
    orderRes.rows.forEach(r => {
      console.log(`  - ${r.table_name}`);
    });
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    console.error(e);
  }
})();
