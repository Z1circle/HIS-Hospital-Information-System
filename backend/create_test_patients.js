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
    // 先获取现有的患者ID列表
    const patientsRes = await pool.query('SELECT id FROM patients LIMIT 10');
    const patientIds = patientsRes.rows.map(p => p.id);
    
    console.log(`找到 ${patientIds.length} 个患者`);
    
    // 为医生ID=1创建挂号记录
    for (let i = 0; i < Math.min(5, patientIds.length); i++) {
      await pool.query(`
        INSERT INTO registrations 
        (patient_id, doctor_id, department_id, register_date, status, created_at)
        VALUES 
        ($1, 1, 1, CURRENT_DATE, 'waiting', NOW())
        ON CONFLICT DO NOTHING
      `, [patientIds[i]]);
    }

    console.log('已为患者创建挂号记录');
    
    // 查询当前等待中的患者（通过JOIN）
    const res = await pool.query(`
      SELECT r.*, p.name, p.gender, 
             EXTRACT(YEAR FROM AGE(p.birth_date)) as age,
             p.phone, p.insurance_type, p.allergy, p.chronic_disease
      FROM registrations r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.doctor_id = 1 AND r.status = 'waiting'
      ORDER BY r.created_at ASC
      LIMIT 5
    `);
    
    console.log('\n当前等待中的患者:');
    res.rows.forEach(p => {
      console.log(`- ${p.name} (${p.gender}, ${p.age}岁) - ${p.insurance_type}`);
    });
    
    await pool.end();
  } catch(e) {
    console.error('错误:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
