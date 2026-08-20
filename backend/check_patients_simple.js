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
    // 检查 registrations 表中的患者数量
    const res = await pool.query(`
      SELECT COUNT(*) as count 
      FROM registrations 
      WHERE doctor_id = 1 AND status IN ('waiting', 'in_progress')
    `);
    
    console.log('医生ID=1的等待中患者数量:', res.rows[0].count);
    
    // 获取前5个患者
    const patients = await pool.query(`
      SELECT * FROM registrations 
      WHERE doctor_id = 1 AND status IN ('waiting', 'in_progress')
      ORDER BY reg_time ASC
      LIMIT 5
    `);
    
    console.log('\n前5个患者信息:');
    patients.rows.forEach(p => {
      console.log(`- ${p.name} (${p.gender}, ${p.age}岁) - ${p.status}`);
    });
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();
