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
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `);
    
    console.log('patients表字段:');
    res.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });
    
    // 检查revisit_requests表
    const revisitRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'revisit_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nrevisit_requests表字段:');
    revisitRes.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    console.error(e);
  }
})();
