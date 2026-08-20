const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

const addPositionColumns = async () => {
  try {
    await pool.query(`
      ALTER TABLE hot_keywords 
      ADD COLUMN IF NOT EXISTS x_position NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS y_position NUMERIC DEFAULT 0
    `);
    console.log('添加坐标字段成功');
    
    await pool.query(`
      UPDATE hot_keywords 
      SET x_position = (id * 80) % 600 + 100,
          y_position = (id * 60) % 400 + 100
      WHERE x_position = 0 AND y_position = 0
    `);
    console.log('初始化坐标成功');
    
    const count = await pool.query('SELECT COUNT(*) as cnt FROM hot_keywords WHERE x_position > 0');
    console.log(`已设置 ${count.rows[0].cnt} 个节点的坐标`);
  } catch (e) {
    console.log('错误:', e);
  } finally {
    pool.end();
  }
};

addPositionColumns();