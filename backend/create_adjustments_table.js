require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432
});

async function createAdjustmentsTable() {
  const client = await pool.connect();
  try {
    console.log('创建热词调整历史表...');

    // 创建热词调整历史表
    await client.query(`
      CREATE TABLE IF NOT EXISTS hot_keyword_adjustments (
        id SERIAL PRIMARY KEY,
        keyword_id INTEGER NOT NULL,
        keyword VARCHAR(100) NOT NULL,
        department_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        old_priority INTEGER DEFAULT 0,
        new_priority INTEGER DEFAULT 0,
        old_is_top BOOLEAN DEFAULT false,
        new_is_top BOOLEAN DEFAULT false,
        adjustment_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (keyword_id) REFERENCES hot_keywords(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ 热词调整历史表已创建');

    // 添加索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_adjustments_keyword_id ON hot_keyword_adjustments(keyword_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_adjustments_department_id ON hot_keyword_adjustments(department_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_adjustments_doctor_id ON hot_keyword_adjustments(doctor_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_adjustments_created_at ON hot_keyword_adjustments(created_at DESC)');
    console.log('✓ 索引已创建');

    // 添加注释
    await client.query(`COMMENT ON TABLE hot_keyword_adjustments IS '热词调整历史记录表，记录主任医师对热词的调整操作'`);
    await client.query(`COMMENT ON COLUMN hot_keyword_adjustments.adjustment_type IS '调整类型：priority_change-优先级调整，top_change-置顶状态调整，hidden_change-隐藏状态调整'`);
    console.log('✓ 注释已添加');

    console.log('\n✅ 热词调整历史表创建完成！');
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAdjustmentsTable().catch(console.error);