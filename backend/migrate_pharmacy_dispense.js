/**
 * 药房处方接收与发药功能 - 数据库迁移脚本
 * 
 * 说明：
 * 1. 为现有 prescriptions 表添加新字段以支持处方接收与发药流程
 * 2. 创建新的处方接收日志表
 * 3. 创建处方异常上报表
 * 4. 创建药品监管码扫描记录表
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

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('开始执行药房处方接收与发药功能迁移...');
    
    await client.query('BEGIN');
    
    // ============================================================
    // 1. 修改 prescriptions 表，添加新字段
    // ============================================================
    console.log('1. 修改 prescriptions 表...');
    
    // 添加缴费回执号字段
    await client.query(`
      ALTER TABLE prescriptions 
      ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS paid_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS received_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispensed_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS visit_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS allergy_history TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS receive_pharmacist_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS dispense_pharmacist_id INTEGER REFERENCES users(id)
    `);
    
    // 添加状态索引以优化查询性能
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_review_status 
      ON prescriptions(review_status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_status 
      ON prescriptions(status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_paid_time 
      ON prescriptions(paid_time DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_receipt_no 
      ON prescriptions(receipt_no)
    `);
    
    console.log('   ✓ prescriptions 表修改完成');
    
    // ============================================================
    // 2. 创建处方接收日志表
    // ============================================================
    console.log('2. 创建 prescription_receive_logs 表...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescription_receive_logs (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        pharmacist_id INTEGER REFERENCES users(id),
        action VARCHAR(20) NOT NULL, -- 'received', 'rejected', 'dispensed'
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receive_logs_prescription_id 
      ON prescription_receive_logs(prescription_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receive_logs_pharmacist_id 
      ON prescription_receive_logs(pharmacist_id)
    `);
    
    console.log('   ✓ prescription_receive_logs 表创建完成');
    
    // ============================================================
    // 3. 创建处方异常上报表
    // ============================================================
    console.log('3. 创建 prescription_exceptions 表...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescription_exceptions (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        pharmacist_id INTEGER REFERENCES users(id),
        exception_type VARCHAR(50) NOT NULL, -- 'drug_error', 'patient_mismatch', 'dosage_error', 'other'
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'closed'
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exceptions_prescription_id 
      ON prescription_exceptions(prescription_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exceptions_status 
      ON prescription_exceptions(status)
    `);
    
    console.log('   ✓ prescription_exceptions 表创建完成');
    
    // ============================================================
    // 4. 创建药品监管码扫描记录表
    // ============================================================
    console.log('4. 创建 drug_scan_records 表...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS drug_scan_records (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        prescription_item_id INTEGER REFERENCES prescription_items(id) ON DELETE CASCADE,
        drug_id INTEGER REFERENCES drugs(id),
        scan_code VARCHAR(100) NOT NULL,
        scanned_by INTEGER REFERENCES users(id),
        scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified BOOLEAN DEFAULT false
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_prescription_id 
      ON drug_scan_records(prescription_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_records_scan_code 
      ON drug_scan_records(scan_code)
    `);
    
    console.log('   ✓ drug_scan_records 表创建完成');
    
    // ============================================================
    // 5. 创建患者就诊码验证记录表
    // ============================================================
    console.log('5. 创建 patient_visit_verification 表...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_visit_verification (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES patients(id),
        visit_code VARCHAR(50) NOT NULL,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_match BOOLEAN DEFAULT false
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_verification_prescription_id 
      ON patient_visit_verification(prescription_id)
    `);
    
    console.log('   ✓ patient_visit_verification 表创建完成');
    
    await client.query('COMMIT');
    
    console.log('\n✅ 迁移成功完成！');
    console.log('\n新增/修改的表结构：');
    console.log('  1. prescriptions - 添加了接收与发药相关字段');
    console.log('  2. prescription_receive_logs - 处方接收日志');
    console.log('  3. prescription_exceptions - 处方异常上报');
    console.log('  4. drug_scan_records - 药品监管码扫描记录');
    console.log('  5. patient_visit_verification - 患者就诊码验证记录');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ 迁移失败:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行迁移
migrate().catch(err => {
  console.error('迁移执行错误:', err);
  process.exit(1);
});
