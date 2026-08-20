const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'his_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function generateVisitCodes() {
  try {
    console.log('=== 开始为处方生成就诊码 ===\n');
    
    // 1. 查询所有没有 visit_code 的处方
    const prescriptionsWithoutCode = await pool.query(`
      SELECT 
        p.id,
        p.registration_id,
        p.patient_id,
        r.visit_date,
        pat.name as patient_name,
        pat.medical_record_no
      FROM prescriptions p
      LEFT JOIN registrations r ON p.registration_id = r.id
      LEFT JOIN patients pat ON p.patient_id = pat.id
      WHERE p.visit_code IS NULL OR p.visit_code = ''
      ORDER BY p.created_at ASC
    `);
    
    console.log(`找到 ${prescriptionsWithoutCode.rows.length} 条需要生成就诊码的处方\n`);
    
    // 2. 为每条处方生成就诊码
    for (const presc of prescriptionsWithoutCode.rows) {
      // 使用 medical_record_no 或生成新的就诊码
      let visitCode = presc.medical_record_no;
      
      if (!visitCode) {
        // 如果没有病历号，生成基于日期和ID的就诊码
        const date = presc.visit_date || new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        visitCode = `${dateStr}${String(presc.id).padStart(6, '0')}`;
      }
      
      // 更新处方的 visit_code
      await pool.query(`
        UPDATE prescriptions 
        SET visit_code = $1 
        WHERE id = $2
      `, [visitCode, presc.id]);
      
      console.log(`✓ 处方 ID=${presc.id}, 患者=${presc.patient_name}, 就诊码=${visitCode}`);
    }
    
    console.log('\n=== 就诊码生成完成 ===');
    
    // 3. 验证结果
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN visit_code IS NOT NULL AND visit_code != '' THEN 1 ELSE 0 END) as with_code,
             SUM(CASE WHEN visit_code IS NULL OR visit_code = '' THEN 1 ELSE 0 END) as without_code
      FROM prescriptions
    `);
    
    console.log('\n验证结果：');
    console.log(`总处方数: ${verifyResult.rows[0].total}`);
    console.log(`有就诊码: ${verifyResult.rows[0].with_code}`);
    console.log(`无就诊码: ${verifyResult.rows[0].without_code}`);
    
  } catch (err) {
    console.error('错误:', err);
  } finally {
    await pool.end();
  }
}

generateVisitCodes();
