const {Pool} = require('pg');
const pool = new Pool({user:'postgres',host:'localhost',database:'hisdb',password:'1234',port:5432});

async function checkData() {
  const client = await pool.connect();
  try {
    // Check exam items for duplicates
    const examResult = await client.query(`
      SELECT name, exam_type, category, COUNT(*) as count
      FROM exam_items
      WHERE is_active = true
      GROUP BY name, exam_type, category
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    console.log('Exam items duplicates:', examResult.rows);
    
    // Check drugs count
    const drugResult = await client.query('SELECT COUNT(*) as total FROM drugs');
    console.log('Total drugs:', drugResult.rows[0].total);
    
    // Check exam requests for duplicates
    const requestResult = await client.query(`
      SELECT patient_id, exam_name, COUNT(*) as count
      FROM exam_requests
      WHERE exam_type = 'lab'
      GROUP BY patient_id, exam_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('Exam requests duplicates:', requestResult.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
checkData();
