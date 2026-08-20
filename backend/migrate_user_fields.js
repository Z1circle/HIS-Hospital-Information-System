const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    // 检查并添加 nickname 字段
    const nickCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'nickname'
    `);
    if (nickCheck.rows.length === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN nickname VARCHAR(50)`);
      console.log('已添加 users.nickname 字段');
      // 将 real_name 复制到 nickname
      await client.query(`UPDATE users SET nickname = real_name WHERE nickname IS NULL`);
      console.log('已将 real_name 复制到 nickname');
    } else {
      console.log('users.nickname 字段已存在');
    }

    // 检查并添加 avatar 字段
    const avatarCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar'
    `);
    if (avatarCheck.rows.length === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN avatar VARCHAR(50) DEFAULT 'user'`);
      console.log('已添加 users.avatar 字段');
      // 为所有用户设置默认头像
      await client.query(`UPDATE users SET avatar = 'user' WHERE avatar IS NULL`);
    } else {
      console.log('users.avatar 字段已存在');
    }

    // 检查并添加 id_card 字段
    const idCardCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id_card'
    `);
    if (idCardCheck.rows.length === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN id_card VARCHAR(20)`);
      console.log('已添加 users.id_card 字段');
    } else {
      console.log('users.id_card 字段已存在');
    }

    // 查看表结构
    const columns = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'users' ORDER BY ordinal_position
    `);
    console.log('\nusers 表结构:');
    columns.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    console.log('\n迁移完成！');
  } catch (err) {
    console.error('迁移失败:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
