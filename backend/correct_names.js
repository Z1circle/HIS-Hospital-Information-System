const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432
});

async function correctNames() {
  // 把 patient2 改回王明
  await pool.query(
    "UPDATE users SET real_name = '王明' WHERE username = 'patient2'"
  );
  await pool.query(
    "UPDATE patients SET name = '王明' WHERE id = 3"
  );
  
  console.log('patient2 已恢复为王明');
  
  // 最终确认
  console.log('\n=== 最终患者列表 ===');
  const result = await pool.query(`
    SELECT u.id, u.username, u.real_name, u.patient_id, p.name as patient_name
    FROM users u
    JOIN patients p ON u.patient_id = p.id
    WHERE u.role = 'patient'
    ORDER BY u.id
  `);
  
  result.rows.forEach(r => {
    console.log(`用户名: ${r.username}, 真实姓名: ${r.real_name}, 患者姓名: ${r.patient_name}`);
  });

  pool.end();
}

correctNames().catch(console.error);