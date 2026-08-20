const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432
});

(async () => {
  try {
    const result = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'prescription_items' ORDER BY ordinal_position"
    );
    console.log('prescription_items表字段:');
    result.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
    await pool.end();
  } catch (err) {
    console.error('错误:', err.message);
    await pool.end();
  }
})();
