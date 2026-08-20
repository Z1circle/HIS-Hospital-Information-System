/**
 * 创建必要的数据库表（如果不存在）
 */
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function createTables() {
  const client = await pool.connect();

  try {
    console.log('=== 开始创建必要的数据库表 ===\n');

    // 1. 创建 users 表的 avatar 字段（如果不存在）
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'avatar'
        ) THEN
          ALTER TABLE users ADD COLUMN avatar VARCHAR(20);
          RAISE NOTICE '已添加 users.avatar 字段';
        ELSE
          RAISE NOTICE 'users.avatar 字段已存在，跳过';
        END IF;
      END $$;
    `);

    // 2. 创建 inventory_checks 表（药房盘点表）
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_checks (
        id SERIAL PRIMARY KEY,
        drug_id INTEGER REFERENCES drugs(id),
        system_stock INTEGER NOT NULL,
        actual_stock INTEGER NOT NULL,
        difference INTEGER NOT NULL,
        operator_id INTEGER REFERENCES users(id),
        remark TEXT DEFAULT '',
        check_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] inventory_checks 表已创建');

    // 3. 创建 medical_records 表（如果不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        doctor_id INTEGER REFERENCES doctors(id),
        registration_id INTEGER REFERENCES registrations(id),
        visit_date DATE DEFAULT CURRENT_DATE,
        chief TEXT DEFAULT '',
        history TEXT DEFAULT '',
        past TEXT DEFAULT '',
        family TEXT DEFAULT '',
        personal TEXT DEFAULT '',
        allergy TEXT DEFAULT '',
        physical TEXT DEFAULT '',
        auxiliary TEXT DEFAULT '',
        diagnosis TEXT DEFAULT '',
        suggestion TEXT DEFAULT '',
        diagnoses JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] medical_records 表已创建');

    // 4. 创建 prescription_items 表（处方明细表）
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        presc_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        drug_id INTEGER REFERENCES drugs(id),
        item_name VARCHAR(100) NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit VARCHAR(20) DEFAULT '盒',
        price DECIMAL(10, 2) DEFAULT 0,
        dosage VARCHAR(50) DEFAULT '',
        frequency VARCHAR(50) DEFAULT '',
        days INTEGER DEFAULT 1,
        need_skin_test BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] prescription_items 表已创建');

    // 5. 创建 templates 表（模板表）
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        type VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        content TEXT DEFAULT '',
        diagnoses JSONB DEFAULT '[]',
        prescriptions JSONB DEFAULT '[]',
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] templates 表已创建');

    // 6. 创建 favorites 表（常用患者表）
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        patient_id INTEGER REFERENCES patients(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, patient_id)
      )
    `);
    console.log('[OK] favorites 表已创建');

    // 7. 创建 announcements 表（公告表）
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT DEFAULT '',
        priority VARCHAR(20) DEFAULT 'normal',
        start_date DATE,
        end_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] announcements 表已创建');

    // 8. 创建 doctor_favorites 表（医生常用患者）
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_favorites (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        patient_id INTEGER REFERENCES patients(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, patient_id)
      )
    `);
    console.log('[OK] doctor_favorites 表已创建');

    console.log('\n=== 数据库表创建完成 ===');
    console.log('所有必要的表已创建或已存在');

  } catch (err) {
    console.error('创建表失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();