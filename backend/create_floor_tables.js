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
    console.log('=== 开始创建楼层相关数据库表 ===\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS floors (
        id SERIAL PRIMARY KEY,
        floor_name VARCHAR(20) NOT NULL,
        floor_code VARCHAR(10) NOT NULL,
        description TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(floor_code)
      )
    `);
    console.log('[OK] floors 表已创建');

    await client.query(`
      CREATE TABLE IF NOT EXISTS floor_departments (
        id SERIAL PRIMARY KEY,
        floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        x_pos DECIMAL(5,2) NOT NULL,
        y_pos DECIMAL(5,2) NOT NULL,
        width DECIMAL(5,2) DEFAULT 8,
        height DECIMAL(5,2) DEFAULT 6,
        room_number VARCHAR(20) DEFAULT '',
        phone VARCHAR(20) DEFAULT '',
        is_open BOOLEAN DEFAULT true,
        department_type VARCHAR(20) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(floor_id, department_id)
      )
    `);
    console.log('[OK] floor_departments 表已创建');

    await client.query(`
      CREATE TABLE IF NOT EXISTS floor_facilities (
        id SERIAL PRIMARY KEY,
        floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
        facility_type VARCHAR(20) NOT NULL,
        name VARCHAR(50) NOT NULL,
        x_pos DECIMAL(5,2) NOT NULL,
        y_pos DECIMAL(5,2) NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[OK] floor_facilities 表已创建');

    console.log('\n=== 数据库表创建完成 ===');

  } catch (err) {
    console.error('创建表失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();