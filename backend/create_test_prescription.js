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
    console.log('开始创建测试处方...');
    
    // 1. 找到刚才登记的患者
    const patientResult = await pool.query(
      'SELECT id FROM patients WHERE name = $1 AND phone = $2',
      ['测试患者王五', '13800138001']
    );
    
    if (patientResult.rows.length === 0) {
      console.error('未找到患者"测试患者王五"');
      await pool.end();
      return;
    }
    
    const patientId = patientResult.rows[0].id;
    console.log(`✓ 找到患者ID: ${patientId}`);
    
    // 2. 找到医生的挂号记录
    const regResult = await pool.query(
      `SELECT r.id as reg_id, r.doctor_id 
       FROM registrations r 
       WHERE r.patient_id = $1 AND r.status = 'in_progress'
       ORDER BY r.created_at DESC LIMIT 1`,
      [patientId]
    );
    
    if (regResult.rows.length === 0) {
      console.error('未找到就诊中的挂号记录');
      await pool.end();
      return;
    }
    
    const regId = regResult.rows[0].reg_id;
    const doctorId = regResult.rows[0].doctor_id;
    console.log(`✓ 找到挂号ID: ${regId}, 医生ID: ${doctorId}`);
    
    // 3. 获取一些药品
    const drugsResult = await pool.query(
      'SELECT id, name, specification, price FROM drugs WHERE name IN ($1, $2) LIMIT 2',
      ['阿莫西林胶囊', '布洛芬缓释胶囊']
    );
    
    if (drugsResult.rows.length < 2) {
      console.log('未找到指定药品，尝试查找其他药品...');
      const altDrugs = await pool.query(
        'SELECT id, name, specification, price FROM drugs LIMIT 2'
      );
      drugsResult.rows = altDrugs.rows;
    }
    
    console.log(`✓ 找到 ${drugsResult.rows.length} 个药品`);
    
    // 4. 创建处方
    const totalAmount = drugsResult.rows.reduce((sum, drug) => {
      const price = parseFloat(drug.price) || 25.00;
      return sum + (price * 2);
    }, 0);
    
    const prescResult = await pool.query(
      `INSERT INTO prescriptions 
       (patient_id, doctor_id, registration_id, status, review_status, payment_status, total_amount, receipt_no, visit_code, allergy_history, medicine_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id`,
      [
        patientId,
        doctorId,
        regId,
        'pending',  // status
        'approved', // review_status - 必须审核通过才能出现在药房队列
        'paid',     // payment_status - 必须已支付
        totalAmount,
        `R${Date.now()}`, // receipt_no
        `VC${Date.now()}`, // visit_code
        [],           // allergy_history
        drugsResult.rows[0].name  // medicine_name - 使用第一个药品名
      ]
    );
    
    const prescriptionId = prescResult.rows[0].id;
    console.log(`✓ 创建处方成功，ID: ${prescriptionId}, 总金额: ¥${totalAmount.toFixed(2)}`);
    
    // 5. 插入处方药品明细（使用prescription_items表）
    for (const drug of drugsResult.rows) {
      const price = parseFloat(drug.price) || 25.00;
      await pool.query(
        `INSERT INTO prescription_items 
         (presc_id, drug_id, item_name, quantity, dosage, frequency, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          prescriptionId,
          drug.id,
          drug.name,
          2,  // quantity
          '口服',  // dosage
          '每日3次',  // frequency
          price * 2  // total price for 2 units
        ]
      );
    }
    
    console.log(`✓ 已添加 ${drugsResult.rows.length} 个药品到处方`);
    
    console.log('\n✅ 测试处方创建成功！');
    console.log(`   患者: 测试患者王五`);
    console.log(`   处方ID: ${prescriptionId}`);
    console.log(`   药品数: ${drugsResult.rows.length}`);
    console.log(`   总金额: ¥${totalAmount.toFixed(2)}`);
    console.log('\n现在可以切换到药剂师账户查看该处方了。');
    
    await pool.end();
  } catch (err) {
    console.error('❌ 创建测试处方失败:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
})();
