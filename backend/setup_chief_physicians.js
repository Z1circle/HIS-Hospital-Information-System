require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432
});

async function setupChiefPhysicians() {
  const client = await pool.connect();

  try {
    console.log('开始主任医师配置...');

    // 0. 添加主任医师标识字段（如果不存在）- 在事务外执行
    try {
      await client.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_chief_physician BOOLEAN DEFAULT false');
      await client.query('COMMENT ON COLUMN doctors.is_chief_physician IS $1', ['是否为主任医师']);
      console.log('✓ 主任医师标识字段已添加');
    } catch (e) {
      console.log('- 主任医师标识字段可能已存在');
    }

    await client.query('BEGIN');

    // 1. 将现有医生改为主治医师
    const updateResult = await client.query(
      "UPDATE doctors SET title = '主治医师' WHERE title IN ('主任医师', '副主任医师') RETURNING id, name, title"
    );
    console.log(`✓ 已将 ${updateResult.rowCount} 个医生职称改为主治医师`);

    // 2. 为8个科室各新增主任医师
    const chiefDoctors = [
      { name: '内科主任医师', dept_id: 1, avatar: '内', specialty: '内科综合' },
      { name: '外科主任医师', dept_id: 2, avatar: '外', specialty: '外科综合' },
      { name: '中医科主任医师', dept_id: 3, avatar: '中', specialty: '中医综合' },
      { name: '妇产科主任医师', dept_id: 4, avatar: '妇', specialty: '妇产科综合' },
      { name: '儿科主任医师', dept_id: 5, avatar: '儿', specialty: '儿科综合' },
      { name: '皮肤科主任医师', dept_id: 6, avatar: '皮', specialty: '皮肤科综合' },
      { name: '眼科主任医师', dept_id: 7, avatar: '眼', specialty: '眼科综合' },
      { name: '耳鼻喉科主任医师', dept_id: 8, avatar: '耳', specialty: '耳鼻喉科综合' }
    ];

    for (const chief of chiefDoctors) {
      // 检查是否已存在
      const existing = await client.query(
        "SELECT id FROM doctors WHERE name = $1 AND is_chief_physician = true",
        [chief.name]
      );

      if (existing.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO doctors (name, title, department_id, hospital, fee, avatar, specialty, is_inpatient, is_chief_physician)
           VALUES ($1, '主任医师', $2, 'HIS系统医院', 60.00, $3, $4, false, true)
           RETURNING id, name`,
          [chief.name, chief.dept_id, chief.avatar, chief.specialty]
        );
        console.log(`✓ 创建主任医师: ${chief.name} (ID: ${result.rows[0].id})`);

        // 创建用户账号
        const username = `chief_${chief.dept_id}`;
        const phone = `1380013801${chief.dept_id}`;
        const idCard = `11010119600${chief.dept_id}010010`;
        const userResult = await client.query(
          `INSERT INTO users (username, password, role, real_name, phone, id_card, doctor_id)
           VALUES ($1, '123456', 'doctor', $2, $3, $4, $5)
           RETURNING id, username`,
          [username, chief.name, phone, idCard, result.rows[0].id]
        );
        console.log(`  - 用户账号: ${userResult.rows[0].username}`);
      } else {
        console.log(`- 主任医师已存在: ${chief.name}`);
      }
    }

    // 3. 为每个科室创建初始热词数据
    const hotwordsByDept = {
      1: [
        ['急性上呼吸道感染', 'diagnosis', 100, true],
        ['肺炎', 'diagnosis', 95, true],
        ['发热', 'symptom', 95, true],
        ['咳嗽', 'symptom', 90, true],
        ['高血压', 'diagnosis', 85, false],
        ['冠心病', 'diagnosis', 80, false]
      ],
      2: [
        ['阑尾炎', 'diagnosis', 100, true],
        ['胆结石', 'diagnosis', 95, true],
        ['腹痛', 'symptom', 90, true],
        ['骨折', 'diagnosis', 85, false],
        ['外伤', 'symptom', 80, false]
      ],
      3: [
        ['气血两虚', 'diagnosis', 100, true],
        ['脾胃虚弱', 'diagnosis', 95, true],
        ['失眠', 'symptom', 90, true],
        ['头痛', 'symptom', 85, false],
        ['腰痛', 'symptom', 80, false]
      ],
      4: [
        ['月经不调', 'diagnosis', 100, true],
        ['痛经', 'symptom', 95, true],
        ['妊娠期糖尿病', 'diagnosis', 90, true],
        ['子宫肌瘤', 'diagnosis', 85, false],
        ['卵巢囊肿', 'diagnosis', 80, false]
      ],
      5: [
        ['小儿肺炎', 'diagnosis', 100, true],
        ['小儿感冒', 'diagnosis', 95, true],
        ['发热', 'symptom', 90, true],
        ['咳嗽', 'symptom', 85, false],
        ['腹泻', 'symptom', 80, false]
      ],
      6: [
        ['湿疹', 'diagnosis', 100, true],
        ['皮炎', 'diagnosis', 95, true],
        ['荨麻疹', 'diagnosis', 90, true],
        ['瘙痒', 'symptom', 85, false],
        ['痤疮', 'diagnosis', 80, false]
      ],
      7: [
        ['白内障', 'diagnosis', 100, true],
        ['青光眼', 'diagnosis', 95, true],
        ['视力模糊', 'symptom', 90, true],
        ['眼干', 'symptom', 85, false],
        ['结膜炎', 'diagnosis', 80, false]
      ],
      8: [
        ['中耳炎', 'diagnosis', 100, true],
        ['鼻炎', 'diagnosis', 95, true],
        ['咽炎', 'diagnosis', 90, true],
        ['耳鸣', 'symptom', 85, false],
        ['听力下降', 'symptom', 80, false]
      ]
    };

    for (const [deptId, keywords] of Object.entries(hotwordsByDept)) {
      for (const [keyword, type, weight, isTop] of keywords) {
        try {
          await client.query(
            `INSERT INTO hot_keywords (department_id, keyword, keyword_type, weight, is_top, is_hidden, usage_count, priority)
             VALUES ($1, $2, $3, $4, $5, false, 0, $6)`,
            [parseInt(deptId), keyword, type, weight, isTop, isTop ? 100 : 0]
          );
        } catch (e) {
          // 忽略重复插入错误
          if (!e.message.includes('duplicate key')) {
            console.error(`插入热词失败: ${keyword}`, e.message);
          }
        }
      }
      console.log(`✓ 科室 ${deptId} 热词数据已创建`);
    }

    // 4. 添加优先级字段（如果不存在）- 在事务外执行
    await client.query('COMMIT');
    try {
      await client.query('ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0');
      await client.query('COMMENT ON COLUMN hot_keywords.priority IS $1', ['优先级，数字越大优先级越高，主任医师可调整']);
      console.log('✓ 热词优先级字段已添加');
    } catch (e) {
      console.log('- 优先级字段可能已存在');
    }

    // 5. 重新插入热词数据（现在priority字段已存在）
    await client.query('BEGIN');
    for (const [deptId, keywords] of Object.entries(hotwordsByDept)) {
      for (const [keyword, type, weight, isTop] of keywords) {
        try {
          await client.query(
            `INSERT INTO hot_keywords (department_id, keyword, keyword_type, weight, is_top, is_hidden, usage_count, priority)
             VALUES ($1, $2, $3, $4, $5, false, 0, $6)
             ON CONFLICT (keyword, department_id) DO NOTHING`,
            [parseInt(deptId), keyword, type, weight, isTop, isTop ? 100 : 0]
          );
        } catch (e) {
          if (!e.message.includes('duplicate key')) {
            console.error(`插入热词失败: ${keyword}`, e.message);
          }
        }
      }
      console.log(`✓ 科室 ${deptId} 热词数据已创建`);
    }
    await client.query('COMMIT');

    console.log('\n✅ 主任医师配置完成！');

    // 显示统计信息
    const stats = await client.query(`
      SELECT
        d.id,
        d.name AS department_name,
        COUNT(CASE WHEN doc.is_chief_physician = true THEN 1 END) AS chief_count,
        COUNT(*) AS total_doctors,
        COUNT(CASE WHEN hk.id IS NOT NULL THEN 1 END) AS hotword_count
      FROM departments d
      LEFT JOIN doctors doc ON d.id = doc.department_id
      LEFT JOIN hot_keywords hk ON d.id = hk.department_id
      GROUP BY d.id, d.name
      ORDER BY d.id
    `);

    console.log('\n科室统计:');
    console.log('ID | 科室名称 | 主任医师 | 总医生 | 热词数');
    console.log('---|---------|---------|--------|--------');
    for (const row of stats.rows) {
      console.log(`${row.id} | ${row.department_name} | ${row.chief_count} | ${row.total_doctors} | ${row.hotword_count}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 配置失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

setupChiefPhysicians()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });