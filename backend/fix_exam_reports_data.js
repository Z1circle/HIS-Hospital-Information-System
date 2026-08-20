const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

async function fixExamReports() {
  try {
    console.log('开始修复检查报告数据...\n');

    // 1. 删除所有现有的错误数据
    console.log('1. 清理现有数据...');
    // 先删除依赖的通知记录
    await pool.query('DELETE FROM exam_notifications WHERE report_id IN (SELECT id FROM exam_reports)');
    console.log('   已清空 exam_notifications 相关记录');
    await pool.query('DELETE FROM exam_reports');
    console.log('   已清空 exam_reports 表\n');

    // 2. 获取患者列表
    const patients = await pool.query('SELECT id, name FROM patients LIMIT 10');
    console.log(`2. 找到 ${patients.rows.length} 个患者\n`);

    // 3. 为每个患者生成检验报告
    let reportId = 1;
    
    for (const patient of patients.rows) {
      console.log(`为患者 ${patient.name}(ID:${patient.id}) 生成报告...`);
      
      // 血常规报告
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '血常规',
          JSON.stringify([
            { item_name: '白细胞(WBC)', result: (4.0 + Math.random() * 6).toFixed(2), reference_range: '4.0-10.0', unit: '×10⁹/L', flag: '' },
            { item_name: '红细胞(RBC)', result: (3.5 + Math.random() * 2).toFixed(2), reference_range: '3.5-5.5', unit: '×10¹²/L', flag: '' },
            { item_name: '血红蛋白(Hb)', result: (110 + Math.random() * 50).toFixed(0), reference_range: '110-160', unit: 'g/L', flag: '' },
            { item_name: '血小板(PLT)', result: (100 + Math.random() * 200).toFixed(0), reference_range: '100-300', unit: '×10⁹/L', flag: '' },
            { item_name: '中性粒细胞%', result: (40 + Math.random() * 30).toFixed(1), reference_range: '50-70', unit: '%', flag: '↓' }
          ]),
          '血常规检查结果基本正常，建议定期复查。',
          '见各项指标参考范围',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 血常规');

      // 肝功能报告
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '肝功能',
          JSON.stringify([
            { item_name: '谷丙转氨酶(ALT)', result: (10 + Math.random() * 30).toFixed(1), reference_range: '0-40', unit: 'U/L', flag: '' },
            { item_name: '谷草转氨酶(AST)', result: (10 + Math.random() * 30).toFixed(1), reference_range: '0-40', unit: 'U/L', flag: '' },
            { item_name: '总胆红素(TBIL)', result: (5 + Math.random() * 12).toFixed(1), reference_range: '3.4-17.1', unit: 'μmol/L', flag: '' },
            { item_name: '直接胆红素(DBIL)', result: (1 + Math.random() * 5).toFixed(1), reference_range: '0-6.8', unit: 'μmol/L', flag: '' },
            { item_name: '白蛋白(ALB)', result: (35 + Math.random() * 15).toFixed(1), reference_range: '40-55', unit: 'g/L', flag: '↓' }
          ]),
          '肝功能指标基本正常，白蛋白略低，建议加强营养。',
          '见各项指标参考范围',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 肝功能');

      // 肾功能报告
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '肾功能',
          JSON.stringify([
            { item_name: '尿素氮(BUN)', result: (2.9 + Math.random() * 5).toFixed(2), reference_range: '2.9-8.2', unit: 'mmol/L', flag: '' },
            { item_name: '肌(Cr)', result: (44 + Math.random() * 89).toFixed(1), reference_range: '44-133', unit: 'μmol/L', flag: '' },
            { item_name: '尿酸(UA)', result: (150 + Math.random() * 270).toFixed(1), reference_range: '150-420', unit: 'μmol/L', flag: '' }
          ]),
          '肾功能指标均在正常范围内。',
          '见各项指标参考范围',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 肾功能');

      // 血糖报告
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '血糖',
          JSON.stringify([
            { item_name: '空腹血糖(GLU)', result: (3.9 + Math.random() * 2.2).toFixed(2), reference_range: '3.9-6.1', unit: 'mmol/L', flag: '' },
            { item_name: '糖化血红蛋白(HbA1c)', result: (4.0 + Math.random() * 2).toFixed(1), reference_range: '4.0-6.0', unit: '%', flag: '' }
          ]),
          '血糖控制良好，继续维持健康生活方式。',
          '见各项指标参考范围',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 血糖');

      // 乙肝五项报告（重点修复）
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '乙肝五项',
          JSON.stringify([
            { item_name: 'HBsAg(表面抗原)', result: '阴性(-)', reference_range: '阴性', unit: '', flag: '' },
            { item_name: 'HBsAb(表面抗体)', result: '阳性(+)', reference_range: '阴性/阳性', unit: '', flag: '' },
            { item_name: 'HBeAg(e抗原)', result: '阴性(-)', reference_range: '阴性', unit: '', flag: '' },
            { item_name: 'HBeAb(e抗体)', result: '阴性(-)', reference_range: '阴性', unit: '', flag: '' },
            { item_name: 'HBcAb(核心抗体)', result: '阴性(-)', reference_range: '阴性', unit: '', flag: '' }
          ]),
          '乙肝表面抗体阳性，提示有免疫力。其余指标均为阴性，未见异常。',
          '定性检测：阴性/阳性',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 乙肝五项');

      // 血脂四项报告
      await pool.query(
        `INSERT INTO exam_reports 
         (id, request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          reportId++,
          null,
          patient.id,
          'lab',
          '血脂四项',
          JSON.stringify([
            { item_name: '总胆固醇(TC)', result: (3.0 + Math.random() * 2.2).toFixed(2), reference_range: '<5.2', unit: 'mmol/L', flag: '' },
            { item_name: '甘油三酯(TG)', result: (0.5 + Math.random() * 1.2).toFixed(2), reference_range: '<1.7', unit: 'mmol/L', flag: '' },
            { item_name: '高密度脂蛋白(HDL-C)', result: (1.0 + Math.random() * 0.5).toFixed(2), reference_range: '>1.0', unit: 'mmol/L', flag: '' },
            { item_name: '低密度脂蛋白(LDL-C)', result: (2.0 + Math.random() * 1.4).toFixed(2), reference_range: '<3.4', unit: 'mmol/L', flag: '' }
          ]),
          '血脂指标正常，建议继续保持健康饮食和运动习惯。',
          '见各项指标参考范围',
          29,
          '检验科医师陈强',
          'completed',
          new Date().toISOString()
        ]
      );
      console.log('   ✓ 血脂四项');

      console.log('');
    }

    // 4. 验证结果
    console.log('\n=== 验证结果 ===');
    const count = await pool.query('SELECT COUNT(*) as total FROM exam_reports');
    console.log(`总共生成了 ${count.rows[0].total} 条检查报告记录`);
    
    const sampleData = await pool.query(`
      SELECT patient_id, exam_name, 
             CASE WHEN jsonb_typeof(result::jsonb) = 'array' THEN 'JSON格式正确' ELSE '格式错误' END as format_status
      FROM exam_reports 
      LIMIT 5
    `);
    console.log('\n数据格式验证：');
    sampleData.rows.forEach(row => {
      console.log(`  患者${row.patient_id} - ${row.exam_name}: ${row.format_status}`);
    });

    console.log('\n✅ 数据修复完成！');
    process.exit(0);
  } catch(e) {
    console.error('❌ 错误:', e.message);
    console.error(e);
    process.exit(1);
  }
}

fixExamReports();
