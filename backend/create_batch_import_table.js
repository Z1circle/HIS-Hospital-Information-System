require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432
});

async function createBatchImportTable() {
  const client = await pool.connect();
  try {
    console.log('创建热词批量导入记录表...');

    // 创建批量导入记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS hot_keywords_batch_import (
        id SERIAL PRIMARY KEY,
        import_name VARCHAR(200) NOT NULL,
        department_id INTEGER,
        total_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        imported_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ 批量导入记录表已创建');

    // 添加索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_import_department_id ON hot_keywords_batch_import(department_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_import_imported_by ON hot_keywords_batch_import(imported_by)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_import_created_at ON hot_keywords_batch_import(created_at DESC)');
    console.log('✓ 索引已创建');

    // 添加注释
    await client.query(`COMMENT ON TABLE hot_keywords_batch_import IS '热词批量导入记录表，记录管理员的批量导入操作'`);
    console.log('✓ 注释已添加');

    console.log('\n✅ 批量导入记录表创建完成！');
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createBatchImportTable().catch(console.error);