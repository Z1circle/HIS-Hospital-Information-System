/**
 * 创建测试收费记录数据
 */
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function createTestCharges() {
  const client = await pool.connect();

  try {
    console.log('=== 创建测试收费记录 ===');

    // 检查是否已有数据
    const existing = await client.query('SELECT COUNT(*) FROM charges');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('charges表已有数据，跳过');
      return;
    }

    // 获取患者和医生ID
    const patients = await client.query('SELECT id, name FROM patients ORDER BY id LIMIT 10');
    const doctors = await client.query('SELECT id, name FROM doctors ORDER BY id LIMIT 10');
    
    const patientIds = patients.rows;
    const doctorIds = doctors.rows;

    console.log(`可用患者: ${patientIds.length}人`);
    console.log(`可用医生: ${doctorIds.length}人`);

    // 创建测试收费记录
    const charges = [
      { receipt_no: 'SF202606180001', patient_id: patientIds[0].id, doctor_id: doctorIds[0].id, 
        charge_date: '2026-06-18', total_amount: 458.50, insurance_amount: 320.00, 
        hospital_amount: 0, patient_amount: 138.50, payment_method: 'card', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606180002', patient_id: patientIds[1].id, doctor_id: doctorIds[1].id, 
        charge_date: '2026-06-18', total_amount: 1260.80, insurance_amount: 890.00, 
        hospital_amount: 0, patient_amount: 370.80, payment_method: 'cash', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606180003', patient_id: patientIds[2].id, doctor_id: doctorIds[2].id, 
        charge_date: '2026-06-18', total_amount: 856.30, insurance_amount: 600.00, 
        hospital_amount: 0, patient_amount: 256.30, payment_method: 'wechat', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606180004', patient_id: patientIds[3].id, doctor_id: doctorIds[3].id, 
        charge_date: '2026-06-18', total_amount: 230.00, insurance_amount: 180.00, 
        hospital_amount: 0, patient_amount: 50.00, payment_method: 'card', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606180005', patient_id: patientIds[4].id, doctor_id: doctorIds[4].id, 
        charge_date: '2026-06-18', total_amount: 689.20, insurance_amount: 480.00, 
        hospital_amount: 0, patient_amount: 209.20, payment_method: 'cash', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606180006', patient_id: patientIds[5].id, doctor_id: doctorIds[5].id, 
        charge_date: '2026-06-18', total_amount: 95.50, insurance_amount: 0, 
        hospital_amount: 0, patient_amount: 95.50, payment_method: 'wechat', 
        payment_status: 'refunded', status: 'refunded' },
      { receipt_no: 'SF202606170007', patient_id: patientIds[6].id, doctor_id: doctorIds[6].id, 
        charge_date: '2026-06-17', total_amount: 1560.00, insurance_amount: 1100.00, 
        hospital_amount: 0, patient_amount: 460.00, payment_method: 'card', 
        payment_status: 'completed', status: 'completed' },
      { receipt_no: 'SF202606170008', patient_id: patientIds[7].id, doctor_id: doctorIds[7].id, 
        charge_date: '2026-06-17', total_amount: 420.00, insurance_amount: 280.00, 
        hospital_amount: 0, patient_amount: 140.00, payment_method: 'cash', 
        payment_status: 'completed', status: 'completed' },
    ];

    for (const charge of charges) {
      await client.query(`
        INSERT INTO charges (receipt_no, patient_id, doctor_id, charge_date, 
          total_amount, insurance_amount, hospital_amount, patient_amount, 
          payment_method, payment_status, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [charge.receipt_no, charge.patient_id, charge.doctor_id, charge.charge_date,
          charge.total_amount, charge.insurance_amount, charge.hospital_amount, 
          charge.patient_amount, charge.payment_method, charge.payment_status, 
          charge.status]);
    }

    console.log(`[OK] 已创建 ${charges.length} 条测试收费记录`);

    // 验证
    const count = await client.query('SELECT COUNT(*) FROM charges');
    console.log(`验证: charges表共有 ${count.rows[0].count} 条记录`);

  } catch (err) {
    console.error('创建收费记录失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestCharges();