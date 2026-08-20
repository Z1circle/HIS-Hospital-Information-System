const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'hisdb', password: '1234', port: 5432 });

(async () => {
  try {
    console.log('创建新的测试处方...');
    
    // 1. 创建新患者（带出生日期）
    const birthDate = new Date(1992, 4, 15); // 1992-05-15, 约34岁
    const patResult = await p.query(
      "INSERT INTO patients (name, gender, phone, birth_date) VALUES ($1, $2, $3, $4) RETURNING id",
      ['端到端测试患者', '女', '13600136000', birthDate]
    );
    const patientId = patResult.rows[0].id;
    console.log('患者ID:', patientId);
    
    // 2. 获取医生信息
    const docResult = await p.query("SELECT id, department_id FROM doctors WHERE id = 1");
    const doctorId = docResult.rows[0].id;
    const deptId = docResult.rows[0].department_id;
    
    // 3. 创建挂号记录
    const today = new Date().toISOString().slice(0, 10);
    const regResult = await p.query(
      `INSERT INTO registrations (patient_id, doctor_id, department_id, register_date, appt_date, am_pm, slot_type, status)
       VALUES ($1, $2, $3, $4, $5, 'am', '普通号', 'done') RETURNING id`,
      [patientId, doctorId, deptId, today, today]
    );
    const regId = regResult.rows[0].id;
    console.log('挂号ID:', regId);
    
    // 4. 创建处方（pending + approved + 有发票）
    const receiptNo = `R${Date.now()}`;
    const visitCode = `VC${Date.now()}`;
    const prescResult = await p.query(
      `INSERT INTO prescriptions 
       (patient_id, doctor_id, registration_id, status, review_status, payment_status, 
        total_amount, receipt_no, visit_code, allergy_history, medicine_name, created_at)
       VALUES ($1, $2, $3, 'pending', 'approved', 'paid', $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [patientId, doctorId, regId, 120.00, receiptNo, visitCode, ['青霉素'], '头孢克肟胶囊']
    );
    const prescId = prescResult.rows[0].id;
    console.log('处方ID:', prescId);
    
    // 5. 添加药品明细
    await p.query(
      `INSERT INTO prescription_items (presc_id, drug_id, item_name, quantity, dosage, frequency, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [prescId, 2, '头孢克肟胶囊', 3, '口服', '每日2次', 80.00]
    );
    await p.query(
      `INSERT INTO prescription_items (presc_id, drug_id, item_name, quantity, dosage, frequency, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [prescId, 4, '阿奇霉素片', 1, '口服', '每日1次', 40.00]
    );
    console.log('药品明细: 头孢克肟胶囊x3, 阿奇霉素片x1');
    
    // 6. 创建发票
    await p.query(
      `INSERT INTO invoices (patient_id, presc_id, amount, insurance_amount, self_amount, payment_status, payment_method)
       VALUES ($1, $2, $3, $4, $5, 'paid', 'wechat')`,
      [patientId, prescId, 120.00, 72.00, 48.00]
    );
    console.log('发票: ¥120.00 (已支付)');
    
    console.log('\n✅ 测试处方创建成功!');
    console.log(`   患者: 端到端测试患者 (女, ~34岁)`);
    console.log(`   处方ID: ${prescId}`);
    console.log(`   回执号: ${receiptNo}`);
    console.log(`   就诊码: ${visitCode}`);
    console.log(`   过敏史: 青霉素`);
    console.log(`   状态: pending (待接收)`);
    
    await p.end();
  } catch (e) {
    console.error('错误:', e.message);
    await p.end();
  }
})();
