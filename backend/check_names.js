const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432
});

async function checkZhaoWei() {
  // 检查用户表中所有患者
  console.log('=== 用户表所有患者 ===');
  const usersResult = await pool.query(`
    SELECT u.id as user_id, u.username, u.real_name, u.patient_id,
           p.id as patient_id, p.name as patient_name
    FROM users u
    LEFT JOIN patients p ON u.patient_id = p.id
    WHERE u.role = 'patient'
    ORDER BY u.id
  `);
  
  usersResult.rows.forEach(row => {
    const match = row.real_name === row.patient_name;
    console.log(`用户ID: ${row.user_id}, 用户名: ${row.username}, 真实姓名: ${row.real_name}, patient_id: ${row.patient_id}, 患者姓名: ${row.patient_name}, 匹配: ${match}`);
  });

  // 检查患者表
  console.log('\n=== 患者表 ===');
  const patientsResult = await pool.query(`
    SELECT id, name, gender, phone
    FROM patients
    ORDER BY id
  `);
  
  patientsResult.rows.forEach(p => {
    console.log(`患者ID: ${p.id}, 姓名: ${p.name}, 性别: ${p.gender}, 电话: ${p.phone}`);
  });

  pool.end();
}

checkZhaoWei().catch(console.error);