/**
 * 药房处方接收与发药功能 - 测试数据插入脚本
 * 
 * 用途：在数据库中插入测试处方数据，用于验证药房工作台功能
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function insertTestData() {
  const client = await pool.connect();
  
  try {
    console.log('开始插入药房测试数据...\n');
    
    await client.query('BEGIN');
    
    // 1. 确保有测试患者
    console.log('1. 检查/创建测试患者...');
    let patientResult = await client.query(
      'SELECT id FROM patients WHERE name = $1',
      ['测试患者张三']
    );
    
    let patientId;
    if (patientResult.rows.length === 0) {
      patientResult = await client.query(`
        INSERT INTO patients (name, birth_date, gender, phone, allergy)
        VALUES ('测试患者张三', '1991-01-15', '男', '13800138099', '{青霉素,磺胺类}')
        RETURNING id
      `);
      patientId = patientResult.rows[0].id;
      console.log('   ✓ 创建测试患者，ID:', patientId);
    } else {
      patientId = patientResult.rows[0].id;
      console.log('   ✓ 使用现有患者，ID:', patientId);
    }
    
    // 2. 确保有测试医生
    console.log('\n2. 检查/创建测试医生...');
    let doctorResult = await client.query(
      'SELECT id FROM doctors WHERE name = $1',
      ['测试医生李四']
    );
    
    let doctorId;
    if (doctorResult.rows.length === 0) {
      doctorResult = await client.query(`
        INSERT INTO doctors (name, title, department_id, hospital, fee)
        VALUES ('测试医生李四', '主治医师', 1, 'HIS系统医院', 25.00)
        RETURNING id
      `);
      doctorId = doctorResult.rows[0].id;
      console.log('   ✓ 创建测试医生，ID:', doctorId);
    } else {
      doctorId = doctorResult.rows[0].id;
      console.log('   ✓ 使用现有医生，ID:', doctorId);
    }
    
    // 3. 确保有挂号记录
    console.log('\n3. 检查/创建挂号记录...');
    let regResult = await client.query(`
      SELECT id FROM registrations 
      WHERE patient_id = $1 AND doctor_id = $2 
      ORDER BY created_at DESC LIMIT 1
    `, [patientId, doctorId]);
    
    let registrationId;
    if (regResult.rows.length === 0) {
      regResult = await client.query(`
        INSERT INTO registrations (patient_id, doctor_id, department_id, register_date, status)
        VALUES ($1, $2, 1, CURRENT_DATE, 'completed')
        RETURNING id
      `, [patientId, doctorId]);
      registrationId = regResult.rows[0].id;
      console.log('   ✓ 创建挂号记录，ID:', registrationId);
    } else {
      registrationId = regResult.rows[0].id;
      console.log('   ✓ 使用现有关号记录，ID:', registrationId);
    }
    
    // 4. 创建待处理处方（已审核通过、已缴费、待接收）
    console.log('\n4. 创建待处理处方...');
    
    const testPrescriptions = [
      {
        receiptNo: 'R20260624001',
        visitCode: 'VC20260624001',
        drugs: [
          { name: '阿莫西林胶囊', dosage: '2粒/次', frequency: '每日3次', quantity: 2 },
          { name: '布洛芬缓释胶囊', dosage: '1粒/次', frequency: '疼痛时服用', quantity: 1 }
        ]
      },
      {
        receiptNo: 'R20260624002',
        visitCode: 'VC20260624002',
        drugs: [
          { name: '维生素C片', dosage: '2片/次', frequency: '每日3次', quantity: 1 }
        ]
      }
    ];
    
    for (const presc of testPrescriptions) {
      // 检查是否已存在
      const existing = await client.query(
        'SELECT id FROM prescriptions WHERE receipt_no = $1',
        [presc.receiptNo]
      );
      
      if (existing.rows.length > 0) {
        console.log(`   ⊘ 处方 ${presc.receiptNo} 已存在，跳过`);
        continue;
      }
      
      // 插入处方主记录
      const prescResult = await client.query(`
        INSERT INTO prescriptions (
          registration_id, patient_id, doctor_id,
          review_status, status, receipt_no,
          paid_time, visit_code, allergy_history,
          type, total_amount, medicine_name
        ) VALUES ($1, $2, $3, 'approved', 'pending', $4, NOW(), $5, $6, 'western', 100.00, $7)
        RETURNING id
      `, [
        registrationId,
        patientId,
        doctorId,
        presc.receiptNo,
        presc.visitCode,
        '{青霉素,磺胺类}',
        presc.drugs[0].name // 使用第一个药品名称
      ]);
      
      const prescId = prescResult.rows[0].id;
      console.log(`   ✓ 创建处方 ${presc.receiptNo}，ID: ${prescId}`);
      
      // 插入处方药品项
      for (const drug of presc.drugs) {
        await client.query(`
          INSERT INTO prescription_items (
            presc_id, item_name, quantity, dosage, frequency, price
          ) VALUES ($1, $2, $3, $4, $5, 25.00)
        `, [prescId, drug.name, drug.quantity, drug.dosage, drug.frequency]);
        
        console.log(`     - 添加药品: ${drug.name} x${drug.quantity}`);
      }
      
      // 创建缴费记录
      await client.query(`
        INSERT INTO invoices (
          presc_id, patient_id, amount, payment_status, payment_method
        ) VALUES ($1, $2, 100.00, 'paid', 'wechat')
      `, [prescId, patientId]);
      
      console.log(`     - 创建缴费记录（已支付）`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ 测试数据插入成功！\n');
    console.log('测试数据摘要:');
    console.log('  - 患者: 测试患者张三 (ID:', patientId + ')');
    console.log('  - 医生: 测试医生李四 (ID:', doctorId + ')');
    console.log('  - 处方: 2个待处理处方');
    console.log('  - 状态: review_status=approved, status=pending');
    console.log('  - 缴费: 已支付\n');
    console.log('现在可以登录药师账户测试药房工作台功能了！');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ 插入测试数据失败:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行
insertTestData().catch(err => {
  console.error('执行错误:', err);
  process.exit(1);
});
