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
    const res = await pool.query('SELECT id, name, title, specialty, biography FROM doctors WHERE name = $1', ['张明华']);
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
})();
