const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432,
});

const ensureChiefPhysicians = async () => {
  try {
    console.log('开始确保每个科室至少有1个主任医师...');

    // 1. 获取所有科室
    const deptsResult = await pool.query('SELECT id, name FROM departments ORDER BY id');
    const departments = deptsResult.rows;

    console.log(`找到 ${departments.length} 个科室`);

    for (const dept of departments) {
      // 2. 检查该科室是否已有主任医师
      const chiefResult = await pool.query(
        'SELECT id, name FROM doctors WHERE department_id = $1 AND is_chief_physician = true',
        [dept.id]
      );

      if (chiefResult.rows.length > 0) {
        console.log(`科室 "${dept.name}" 已有主任医师: ${chiefResult.rows.map(d => d.name).join(', ')}`);
        continue;
      }

      // 3. 如果没有主任医师，检查该科室是否有医生
      const doctorsResult = await pool.query(
        'SELECT id, name, title FROM doctors WHERE department_id = $1 ORDER BY id LIMIT 1',
        [dept.id]
      );

      if (doctorsResult.rows.length === 0) {
        console.log(`科室 "${dept.name}" 没有医生，需要创建主任医师`);

        // 创建主任医师
        const chiefName = `${dept.name}主任医师`;
        const insertResult = await pool.query(
          `INSERT INTO doctors (name, title, department_id, is_chief_physician, specialty, fee)
           VALUES ($1, '主任医师', $2, true, $3, 50)
           RETURNING id, name`,
          [chiefName, dept.id, `${dept.name}专业领域`]
        );

        console.log(`✓ 为科室 "${dept.name}" 创建主任医师: ${insertResult.rows[0].name} (ID: ${insertResult.rows[0].id})`);

        // 为主任医师创建用户账号
        const username = `chief_${dept.id}`;
        const password = '123456';
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        await pool.query(
          `INSERT INTO users (username, password, role, real_name, doctor_id)
           VALUES ($1, $2, 'doctor', $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [username, hashedPassword, insertResult.rows[0].name, insertResult.rows[0].id]
        );

        console.log(`  - 用户名: ${username}, 密码: ${password}`);
      } else {
        // 将第一个医生设为主任医师
        const doctor = doctorsResult.rows[0];
        await pool.query(
          'UPDATE doctors SET is_chief_physician = true, title = COALESCE(NULLIF(title, \'\'), \'主任医师\') WHERE id = $1',
          [doctor.id]
        );

        console.log(`✓ 将科室 "${dept.name}" 的医生 "${doctor.name}" 设为主任医师 (ID: ${doctor.id})`);
      }
    }

    console.log('\n所有科室主任医师设置完成！');

    // 输出统计信息
    const statsResult = await pool.query(`
      SELECT
        d.id,
        d.name AS department_name,
        COUNT(CASE WHEN doc.is_chief_physician = true THEN 1 END) AS chief_count,
        COUNT(*) AS total_doctors
      FROM departments d
      LEFT JOIN doctors doc ON d.id = doc.department_id
      GROUP BY d.id, d.name
      ORDER BY d.id
    `);

    console.log('\n科室统计:');
    console.log('ID | 科室名称 | 主任医师数 | 总医生数');
    console.log('---|---------|-----------|--------');
    statsResult.rows.forEach(row => {
      console.log(`${row.id.toString().padEnd(2)} | ${row.department_name.padEnd(8)} | ${row.chief_count.toString().padEnd(9)} | ${row.total_doctors}`);
    });

  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

ensureChiefPhysicians();