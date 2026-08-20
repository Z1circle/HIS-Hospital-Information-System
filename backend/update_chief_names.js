require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432
});

// 主任医师真实姓名配置
const chiefDoctorNames = [
  { dept_id: 1, name: '李建国', specialty: '心血管内科' },
  { dept_id: 2, name: '王志强', specialty: '普通外科' },
  { dept_id: 3, name: '刘德明', specialty: '中医内科' },
  { dept_id: 4, name: '张秀兰', specialty: '妇科' },
  { dept_id: 5, name: '陈晓明', specialty: '儿科综合' },
  { dept_id: 6, name: '赵美玲', specialty: '皮肤科' },
  { dept_id: 7, name: '孙伟', specialty: '眼科' },
  { dept_id: 8, name: '周建华', specialty: '耳鼻喉科' }
];

async function updateChiefDoctorNames() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('更新主任医师姓名...');

    for (const chief of chiefDoctorNames) {
      const result = await client.query(
        `UPDATE doctors 
         SET name = $1, specialty = $2 
         WHERE department_id = $3 AND is_chief_physician = true 
         RETURNING id, name, department_id`,
        [chief.name, chief.specialty, chief.dept_id]
      );

      if (result.rows.length > 0) {
        console.log(`✓ 科室ID ${chief.dept_id}: ${result.rows[0].name}`);

        // 更新用户表中的real_name
        await client.query(
          `UPDATE users 
           SET real_name = $1 
           WHERE doctor_id = $2`,
          [chief.name, result.rows[0].id]
        );
      } else {
        console.log(`- 科室ID ${chief.dept_id}: 未找到主任医师`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ 主任医师姓名更新完成！');

    // 显示更新后的主任医师信息
    const stats = await client.query(`
      SELECT d.name, d.title, dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.is_chief_physician = true
      ORDER BY d.department_id
    `);

    console.log('\n更新后的主任医师信息：');
    console.log('姓名\t\t职称\t\t科室');
    console.log('----\t\t----\t\t----');
    for (const row of stats.rows) {
      console.log(`${row.name}\t\t${row.title}\t\t${row.department_name}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 更新失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateChiefDoctorNames().catch(console.error);