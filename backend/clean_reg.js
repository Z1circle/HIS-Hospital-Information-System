const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function clean() {
  try {
    const result = await pool.query("DELETE FROM payment_orders WHERE order_type = 'registration'");
    console.log('Deleted', result.rowCount, 'registration orders');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

clean();