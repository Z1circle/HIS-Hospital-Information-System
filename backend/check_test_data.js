const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'hisdb', password: '1234', port: 5432 });

(async () => {
  try {
    // 检查测试处方的详细信息
    const presc = await p.query(
      "SELECT id, status, review_status, receipt_no, visit_code, patient_id, total_amount FROM prescriptions WHERE id = 29"
    );
    console.log('测试处方(29):', presc.rows);
    
    // 检查是否有发票记录
    const inv = await p.query("SELECT * FROM invoices WHERE presc_id = 29");
    console.log('\n发票记录:', inv.rows.length > 0 ? inv.rows : '无发票记录');
    
    // 检查处方药品明细
    const items = await p.query(
      "SELECT id, presc_id, item_name, quantity, dosage, frequency, price FROM prescription_items WHERE presc_id = 29"
    );
    console.log('\n处方药品:', items.rows);
    
    // 检查患者信息
    const pat = await p.query("SELECT id, name, gender, birth_date FROM patients WHERE id = 13");
    console.log('\n患者信息:', pat.rows);
    
    // 测试 pending-prescriptions 查询是否能找到这条处方
    const pendingCheck = await p.query(`
      SELECT p.id, p.status, p.review_status, pat.name as patient_name,
             EXTRACT(YEAR FROM AGE(pat.birth_date)) as patient_age
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      WHERE p.review_status = 'approved' 
        AND p.status IN ('pending', 'received')
        AND EXISTS (
          SELECT 1 FROM invoices inv 
          WHERE inv.presc_id = p.id AND inv.payment_status = 'paid'
        )
      AND p.id = 29
    `);
    console.log('\npending-prescriptions 查询结果:', pendingCheck.rows.length > 0 ? pendingCheck.rows : '未找到（缺少发票）');
    
    await p.end();
  } catch (e) {
    console.error('错误:', e.message);
    await p.end();
  }
})();
