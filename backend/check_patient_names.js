const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function checkPatientNames() {
  console.log('=== 检查患者姓名显示一致性 ===\n');
  
  // 检查 users 表中的患者
  console.log('1. 用户表中的患者:');
  const users = await pool.query(`
    SELECT u.id, u.username, u.real_name, u.patient_id, p.name as patient_name, p.id_card
    FROM users u
    LEFT JOIN patients p ON u.patient_id = p.id
    WHERE u.role = 'patient'
    ORDER BY u.id
  `);
  
  users.rows.forEach(user => {
    console.log(`   用户ID: ${user.id}, 用户名: ${user.username}, 真实姓名: ${user.real_name}, 患者ID: ${user.patient_id}, 患者姓名: ${user.patient_name}`);
    if (user.real_name !== user.patient_name) {
      console.log(`   ⚠️ 姓名不一致！用户真实姓名: "${user.real_name}" vs 患者姓名: "${user.patient_name}"`);
    }
  });
  
  // 检查挂号记录
  console.log('\n2. 挂号记录中的患者信息:');
  const registrations = await pool.query(`
    SELECT r.id, r.patient_id, r.status, p.name as patient_name, u.real_name as user_name
    FROM registrations r
    JOIN patients p ON r.patient_id = p.id
    LEFT JOIN users u ON u.patient_id = r.patient_id AND u.role = 'patient'
    ORDER BY r.created_at DESC
    LIMIT 10
  `);
  
  registrations.rows.forEach(reg => {
    console.log(`   挂号ID: ${reg.id}, 患者ID: ${reg.patient_id}, 患者姓名: ${reg.patient_name}, 用户姓名: ${reg.user_name}`);
  });
  
  await pool.end();
}

checkPatientNames();