/**
 * 为系统中缺少用户账户的医生批量创建用户账户
 * 用户名规则：doctor3, doctor4, ... 或 inpatient_doctor2, ...
 * 密码统一设置为"123456"
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function createDoctorAccounts() {
  const client = await pool.connect();

  try {
    console.log('=== 开始为医生创建用户账户 ===\n');

    // 查询所有缺少用户账户的医生
    const missingDoctorsQuery = `
      SELECT d.id, d.name, d.title, d.is_inpatient
      FROM doctors d
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.doctor_id = d.id
      )
      ORDER BY d.id
    `;

    const result = await client.query(missingDoctorsQuery);
    const missingDoctors = result.rows;

    console.log(`找到 ${missingDoctors.length} 位医生需要创建用户账户:\n`);

    if (missingDoctors.length === 0) {
      console.log('所有医生都已有用户账户！');
      return;
    }

    // 为每位医生创建用户账户
    const createdAccounts = [];
    let doctorCounter = 3; // 从doctor3开始
    let inpatientDoctorCounter = 2; // 从inpatient_doctor2开始

    for (const doc of missingDoctors) {
      const { id: docId, name: docName, title: docTitle, is_inpatient: isInpatient } = doc;

      // 确定角色和用户名
      const role = isInpatient ? 'inpatient_doctor' : 'doctor';
      let username;

      if (isInpatient) {
        username = `inpatient_doctor${inpatientDoctorCounter}`;
        inpatientDoctorCounter++;
      } else {
        username = `doctor${doctorCounter}`;
        doctorCounter++;
      }

      try {
        const insertQuery = `
          INSERT INTO users (username, password, role, real_name, doctor_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;

        const insertResult = await client.query(insertQuery, [
          username,
          '123456',
          role,
          docName,
          docId
        ]);

        const userId = insertResult.rows[0].id;

        createdAccounts.push({
          user_id: userId,
          username: username,
          password: '123456',
          role: role,
          real_name: docName,
          doctor_id: docId,
          title: docTitle,
          is_inpatient: isInpatient
        });

        console.log(`[OK] 创建成功: 用户名=${username}, 医生=${docName}(${docTitle}), 角色=${role}, 医生ID=${docId}`);

      } catch (err) {
        console.error(`[FAIL] 创建失败: 医生=${docName}, 错误=${err.message}`);
      }
    }

    console.log(`\n=== 创建完成 ===`);
    console.log(`成功创建 ${createdAccounts.length} 个用户账户\n`);

    // 显示所有创建的账户信息
    console.log('=== 新创建的账户详情 ===\n');
    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. 医生姓名: ${account.real_name}`);
      console.log(`   职称: ${account.title}`);
      console.log(`   医生ID: ${account.doctor_id}`);
      console.log(`   用户ID: ${account.user_id}`);
      console.log(`   登录账号: ${account.username}`);
      console.log(`   登录密码: ${account.password}`);
      console.log(`   用户角色: ${account.role}`);
      console.log(`   住院医生: ${account.is_inpatient ? '是' : '否'}`);
      console.log();
    });

    // 验证所有医生是否都有用户账户
    console.log('=== 验证结果 ===\n');
    const allDoctorsQuery = `
      SELECT d.id, d.name, d.title, d.is_inpatient, u.id as user_id, u.username, u.role
      FROM doctors d
      LEFT JOIN users u ON u.doctor_id = d.id
      ORDER BY d.id
    `;

    const allDoctorsResult = await client.query(allDoctorsQuery);
    const allDoctors = allDoctorsResult.rows;

    console.log(`系统中共有 ${allDoctors.length} 位医生:\n`);
    allDoctors.forEach(doc => {
      const status = doc.user_id ? '[OK] 有账户' : '[FAIL] 无账户';
      console.log(`${status} - ID:${doc.id}, 姓名:${doc.name}, 职称:${doc.title}, 住院医生:${doc.is_inpatient}, 用户名:${doc.username}, 角色:${doc.role}`);
    });

  } catch (err) {
    console.error('执行出错:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行脚本
createDoctorAccounts();

console.log('\n=== 账户创建脚本执行完毕 ===');