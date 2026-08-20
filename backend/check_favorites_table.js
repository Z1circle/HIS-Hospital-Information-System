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
    // 检查 favorite_patients 表是否存在
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'favorite_patients'
      )
    `);
    
    if (res.rows[0].exists) {
      console.log('favorite_patients 表存在');
      
      // 获取表结构
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'favorite_patients' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n表字段:');
      cols.rows.forEach(r => {
        console.log(`  - ${r.column_name} (${r.data_type})`);
      });
    } else {
      console.log('favorite_patients 表不存在，需要创建');
      
      // 创建表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS favorite_patients (
          id SERIAL PRIMARY KEY,
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          remark TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(doctor_id, patient_id)
        )
      `);
      
      console.log('表已创建');
    }
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    console.error(e);
  }
})();
