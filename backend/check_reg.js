const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkRegistrations() {
  try {
    console.log('=== 挂号记录 ===');
    const result = await pool.query(`
      SELECT id, patient_id, doctor_id, department_id, status, register_date 
      FROM registrations 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log('registrations:', result.rows.length, 'rows');
    result.rows.forEach(r => console.log(`  ID:${r.id}, patient_id:${r.patient_id}, doctor_id:${r.doctor_id}, status:${r.status}`));

    console.log('\n=== 患者记录 ===');
    const patientsResult = await pool.query('SELECT id, name FROM patients LIMIT 5');
    patientsResult.rows.forEach(p => console.log(`  ID:${p.id}, name:${p.name}`));

    console.log('\n=== 医生记录 ===');
    const doctorsResult = await pool.query('SELECT id, name, department_id FROM doctors LIMIT 5');
    doctorsResult.rows.forEach(d => console.log(`  ID:${d.id}, name:${d.name}, department_id:${d.department_id}`));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkRegistrations();