const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: '1234', host: 'localhost', port: 5432, database: 'hisdb' });

(async () => {
  const r = await pool.query('SELECT schedule_date, COUNT(*) as cnt, SUM(remaining) as total_remaining, SUM(total) as total_slots FROM schedules GROUP BY schedule_date ORDER BY schedule_date');
  console.log('Schedule remaining slots by date:');
  r.rows.forEach(row => {
    console.log(`${row.schedule_date}: ${row.cnt} records, total=${row.total_slots}, remaining=${row.total_remaining}`);
  });
  
  const fullSlots = await pool.query('SELECT schedule_date, COUNT(*) as cnt FROM schedules WHERE remaining <= 0 GROUP BY schedule_date');
  console.log('\nDates with fully booked slots:');
  if (fullSlots.rows.length === 0) {
    console.log('  None');
  } else {
    fullSlots.rows.forEach(row => console.log(`  ${row.schedule_date}: ${row.cnt} slots`));
  }
  
  await pool.end();
})();