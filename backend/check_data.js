const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function checkData() {
  try {
    console.log('=== 处方数据 ===');
    const prescResult = await pool.query('SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 10');
    console.log('prescriptions:', prescResult.rows.length, 'rows');
    prescResult.rows.forEach(p => console.log(`  ID:${p.id}, patient_id:${p.patient_id}, doctor_id:${p.doctor_id}, total_amount:${p.total_amount}, status:${p.status}`));

    console.log('\n=== 处方明细 ===');
    const prescItemsResult = await pool.query('SELECT * FROM prescription_items ORDER BY presc_id DESC LIMIT 10');
    console.log('prescription_items:', prescItemsResult.rows.length, 'rows');

    console.log('\n=== 缴费订单 ===');
    const ordersResult = await pool.query(`
      SELECT id, order_no, patient_id, order_type, source_id, total_amount, payment_status, created_at 
      FROM payment_orders 
      ORDER BY created_at DESC LIMIT 20
    `);
    console.log('payment_orders:', ordersResult.rows.length, 'rows');
    ordersResult.rows.forEach(o => console.log(`  ID:${o.id}, type:${o.order_type}, patient_id:${o.patient_id}, amount:${o.total_amount}, status:${o.payment_status}`));

    console.log('\n=== 检查申请 ===');
    const examResult = await pool.query(`
      SELECT id, patient_id, doctor_id, exam_name, exam_type, status, payment_status, created_at 
      FROM exam_requests 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log('exam_requests:', examResult.rows.length, 'rows');
    examResult.rows.forEach(e => console.log(`  ID:${e.id}, patient_id:${e.patient_id}, exam_type:${e.exam_type}, status:${e.status}, payment_status:${e.payment_status}`));

    console.log('\n=== 检验报告 ===');
    const reportResult = await pool.query(`
      SELECT id, patient_id, exam_type, exam_name, status, report_date 
      FROM exam_reports 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log('exam_reports:', reportResult.rows.length, 'rows');

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkData();