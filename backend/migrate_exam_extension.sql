-- ============================================================
-- HIS系统检验检查功能扩展迁移脚本
-- 执行方式：psql -U postgres -d hisdb -f migrate_exam_extension.sql
-- ============================================================

-- ============================================================
-- 1. 扩展检验项目表字段
-- ============================================================
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS professional_category VARCHAR(50);
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50);
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS sample_type VARCHAR(30);
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS sample_requirement TEXT;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS turnaround_hours INTEGER;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS need_appointment BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS precautions TEXT;

-- ============================================================
-- 2. 扩展检验申请表字段
-- ============================================================
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id);
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS started_by INTEGER REFERENCES users(id);
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50);
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS body_part VARCHAR(50);
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS notify_sent BOOLEAN DEFAULT false;

-- ============================================================
-- 3. 扩展检验报告表字段
-- ============================================================
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS image_features TEXT;
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS critical_handled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS critical_handled_at TIMESTAMP;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS critical_handled_by INTEGER REFERENCES users(id);

-- ============================================================
-- 4. 创建复诊申请表
-- ============================================================
CREATE TABLE IF NOT EXISTS revisit_requests (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  original_registration_id INTEGER REFERENCES registrations(id),
  original_doctor_id INTEGER REFERENCES doctors(id),
  exam_report_id INTEGER REFERENCES exam_reports(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  new_registration_id INTEGER REFERENCES registrations(id),
  queue_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. 扩展挂号表字段 - 支持复诊标记
-- ============================================================
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS is_revisit BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS original_registration_id INTEGER REFERENCES registrations(id);

-- ============================================================
-- 5. 创建检验结果通知表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_notifications (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES exam_reports(id),
  doctor_id INTEGER REFERENCES doctors(id),
  patient_id INTEGER REFERENCES patients(id),
  notification_type VARCHAR(20) DEFAULT 'report_completed',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. 更新现有检验项目数据 - 添加分类信息
-- ============================================================
-- 更新检验项目分类
UPDATE exam_items SET professional_category = '临床检验', sub_category = '血常规', sample_type = '血液' WHERE category = '血常规';
UPDATE exam_items SET professional_category = '临床检验', sub_category = '尿液检验', sample_type = '尿液' WHERE category = '尿液';
UPDATE exam_items SET professional_category = '临床检验', sub_category = '凝血检验', sample_type = '血液' WHERE category = '凝血';
UPDATE exam_items SET professional_category = '生化检验', sub_category = '肝功能', sample_type = '血液' WHERE name LIKE '%肝功能%';
UPDATE exam_items SET professional_category = '生化检验', sub_category = '肾功能', sample_type = '血液' WHERE name LIKE '%肾功能%';
UPDATE exam_items SET professional_category = '生化检验', sub_category = '血糖检测', sample_type = '血液' WHERE name LIKE '%血糖%';
UPDATE exam_items SET professional_category = '生化检验', sub_category = '血脂检测', sample_type = '血液' WHERE name LIKE '%血脂%';
UPDATE exam_items SET professional_category = '影像检查', sub_category = 'X线检查', need_appointment = true WHERE exam_type = 'radiology' AND category = 'X光';
UPDATE exam_items SET professional_category = '影像检查', sub_category = 'CT检查', need_appointment = true WHERE exam_type = 'radiology' AND category = 'CT';
UPDATE exam_items SET professional_category = '影像检查', sub_category = 'MRI检查', need_appointment = true WHERE exam_type = 'radiology' AND category = 'MRI';
UPDATE exam_items SET professional_category = '影像检查', sub_category = '超声检查', need_appointment = true WHERE exam_type = 'radiology' AND category = '超声';

-- ============================================================
-- 7. 添加更多检验项目数据
-- ============================================================
-- 临床检验 - 血常规扩展
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, reference_range, unit, sample_type, turnaround_hours, is_common, description) VALUES
('lab', '临床检验', '血常规', '血常规', '血常规五分类', 30.00, NULL, NULL, '血液', 2, true, '白细胞、红细胞、血红蛋白、血小板、中性粒细胞分类'),
('lab', '临床检验', '血常规', '血常规', '血小板计数', 8.00, '100-300', '×10^9/L', '血液', 2, true, NULL),
('lab', '临床检验', '血常规', '血常规', '中性粒细胞百分比', 8.00, '50-70', '%', '血液', 2, true, NULL),
('lab', '临床检验', '血常规', '血常规', '淋巴细胞百分比', 8.00, '20-40', '%', '血液', 2, true, NULL)
ON CONFLICT DO NOTHING;

-- 临床检验 - 尿液检验扩展
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, reference_range, unit, sample_type, turnaround_hours, is_common, description) VALUES
('lab', '临床检验', '尿液检验', '尿液', '尿沉渣镜检', 15.00, NULL, NULL, '尿液', 2, true, '红细胞、白细胞、管型等镜检'),
('lab', '临床检验', '尿液检验', '尿液', '尿蛋白定量', 20.00, '<150', 'mg/24h', '尿液', 4, false, NULL),
('lab', '临床检验', '尿液检验', '尿液', '尿糖测定', 10.00, '阴性', NULL, '尿液', 2, true, NULL)
ON CONFLICT DO NOTHING;

-- 生化检验扩展
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, reference_range, unit, sample_type, turnaround_hours, is_common, description) VALUES
('lab', '生化检验', '肝功能', '生化', '谷丙转氨酶(ALT)', 15.00, '0-40', 'U/L', '血液', 4, true, NULL),
('lab', '生化检验', '肝功能', '生化', '谷草转氨酶(AST)', 15.00, '0-40', 'U/L', '血液', 4, true, NULL),
('lab', '生化检验', '肝功能', '生化', '总胆红素', 15.00, '3.4-17.1', 'μmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '肝功能', '生化', '直接胆红素', 15.00, '0-6.8', 'μmol/L', '血液', 4, false, NULL),
('lab', '生化检验', '肾功能', '生化', '尿素氮', 15.00, '2.9-8.2', 'mmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '肾功能', '生化', '肌酐', 15.00, '44-133', 'μmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '肾功能', '生化', '尿酸', 15.00, '150-420', 'μmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '血糖检测', '生化', '空腹血糖', 10.00, '3.9-6.1', 'mmol/L', '血液', 2, true, NULL),
('lab', '生化检验', '血糖检测', '生化', '餐后2小时血糖', 10.00, '<7.8', 'mmol/L', '血液', 2, true, NULL),
('lab', '生化检验', '血糖检测', '生化', '糖化血红蛋白', 60.00, '4-6', '%', '血液', 24, true, '反映近3个月血糖水平'),
('lab', '生化检验', '血脂检测', '生化', '总胆固醇', 15.00, '<5.2', 'mmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '血脂检测', '生化', '甘油三酯', 15.00, '<1.7', 'mmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '血脂检测', '生化', '高密度脂蛋白', 20.00, '>1.0', 'mmol/L', '血液', 4, true, NULL),
('lab', '生化检验', '血脂检测', '生化', '低密度脂蛋白', 20.00, '<3.4', 'mmol/L', '血液', 4, true, NULL)
ON CONFLICT DO NOTHING;

-- 免疫检验
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, reference_range, unit, sample_type, turnaround_hours, is_common, description) VALUES
('lab', '免疫检验', '甲状腺功能', '免疫', '甲状腺功能五项', 200.00, NULL, NULL, '血液', 24, false, 'T3、T4、FT3、FT4、TSH'),
('lab', '免疫检验', '甲状腺功能', '免疫', '促甲状腺激素(TSH)', 40.00, '0.27-4.2', 'mIU/L', '血液', 24, false, NULL),
('lab', '免疫检验', '肿瘤标志物', '免疫', '甲胎蛋白(AFP)', 50.00, '<20', 'μg/L', '血液', 24, false, '肝癌筛查指标'),
('lab', '免疫检验', '肿瘤标志物', '免疫', '癌胚抗原(CEA)', 50.00, '<5', 'μg/L', '血液', 24, false, '广谱肿瘤标志物'),
('lab', '免疫检验', '肿瘤标志物', '免疫', '前列腺特异抗原(PSA)', 60.00, '<4', 'μg/L', '血液', 24, false, '前列腺癌筛查'),
('lab', '免疫检验', '自身抗体', '免疫', '类风湿因子', 40.00, '<20', 'IU/mL', '血液', 24, false, NULL),
('lab', '免疫检验', '自身抗体', '免疫', '抗核抗体', 80.00, '阴性', NULL, '血液', 48, false, NULL)
ON CONFLICT DO NOTHING;

-- 微生物检验
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, reference_range, unit, sample_type, turnaround_hours, is_common, description, precautions) VALUES
('lab', '微生物检验', '细菌培养', '微生物', '血培养', 120.00, NULL, NULL, '血液', 72, false, '需无菌采集', '采集前需严格消毒'),
('lab', '微生物检验', '细菌培养', '微生物', '尿培养', 80.00, NULL, NULL, '尿液', 48, false, NULL, '需清洁中段尿'),
('lab', '微生物检验', '细菌培养', '微生物', '痰培养', 80.00, NULL, NULL, '痰液', 48, false, NULL, '需晨起深咳痰'),
('lab', '微生物检验', '药敏试验', '微生物', '细菌药敏试验', 100.00, NULL, NULL, '培养物', 24, false, '需先做培养', '培养阳性后进行')
ON CONFLICT DO NOTHING;

-- 影像检查扩展
INSERT INTO exam_items (exam_type, professional_category, sub_category, category, name, price, sample_type, turnaround_hours, is_common, need_appointment, description, body_part) VALUES
('radiology', '影像检查', 'X线检查', 'X光', '胸部X光片(正位)', 80.00, NULL, 4, true, false, '胸部正位片', '胸部'),
('radiology', '影像检查', 'X线检查', 'X光', '胸部X光片(正侧位)', 120.00, NULL, 4, true, false, '胸部正侧位片', '胸部'),
('radiology', '影像检查', 'X线检查', 'X光', '腹部X光片', 80.00, NULL, 4, true, false, '腹部平片', '腹部'),
('radiology', '影像检查', 'X线检查', 'X光', '颈椎X光片', 80.00, NULL, 4, true, false, '颈椎正侧位片', '颈椎'),
('radiology', '影像检查', 'X线检查', 'X光', '腰椎X光片', 80.00, NULL, 4, true, false, '腰椎正侧位片', '腰椎'),
('radiology', '影像检查', 'CT检查', 'CT', '头颅CT平扫', 280.00, NULL, 24, true, true, '头颅CT平扫', '头颅'),
('radiology', '影像检查', 'CT检查', 'CT', '头颅CT增强', 400.00, NULL, 24, false, true, '头颅CT增强扫描', '头颅'),
('radiology', '影像检查', 'CT检查', 'CT', '胸部CT平扫', 350.00, NULL, 24, true, true, '胸部CT平扫', '胸部'),
('radiology', '影像检查', 'CT检查', 'CT', '胸部CT增强', 500.00, NULL, 24, false, true, '胸部CT增强扫描', '胸部'),
('radiology', '影像检查', 'CT检查', 'CT', '腹部CT平扫', 400.00, NULL, 24, true, true, '腹部CT平扫', '腹部'),
('radiology', '影像检查', 'CT检查', 'CT', '腹部CT增强', 600.00, NULL, 24, false, true, '腹部CT增强扫描', '腹部'),
('radiology', '影像检查', 'CT检查', 'CT', '颈椎CT', 300.00, NULL, 24, false, true, '颈椎CT扫描', '颈椎'),
('radiology', '影像检查', 'CT检查', 'CT', '腰椎CT', 300.00, NULL, 24, false, true, '腰椎CT扫描', '腰椎'),
('radiology', '影像检查', 'MRI检查', 'MRI', '头颅MRI平扫', 600.00, NULL, 48, true, true, '头颅MRI平扫', '头颅'),
('radiology', '影像检查', 'MRI检查', 'MRI', '头颅MRI增强', 800.00, NULL, 48, false, true, '头颅MRI增强扫描', '头颅'),
('radiology', '影像检查', 'MRI检查', 'MRI', '颈椎MRI', 700.00, NULL, 48, true, true, '颈椎MRI扫描', '颈椎'),
('radiology', '影像检查', 'MRI检查', 'MRI', '腰椎MRI', 700.00, NULL, 48, true, true, '腰椎MRI扫描', '腰椎'),
('radiology', '影像检查', 'MRI检查', 'MRI', '膝关节MRI', 600.00, NULL, 48, false, true, '膝关节MRI扫描', '膝关节'),
('radiology', '影像检查', '超声检查', '超声', '腹部彩超', 150.00, NULL, 4, true, false, '肝胆胰脾肾彩超', '腹部'),
('radiology', '影像检查', '超声检查', '超声', '心脏彩超', 200.00, NULL, 4, true, false, '心脏结构及功能检查', '心脏'),
('radiology', '影像检查', '超声检查', '超声', '甲状腺彩超', 120.00, NULL, 4, true, false, '甲状腺超声检查', '甲状腺'),
('radiology', '影像检查', '超声检查', '超声', '乳腺彩超', 150.00, NULL, 4, false, false, '乳腺超声检查', '乳腺'),
('radiology', '影像检查', '超声检查', '超声', '泌尿系彩超', 180.00, NULL, 4, true, false, '肾输尿管膀胱彩超', '泌尿系'),
('radiology', '影像检查', '超声检查', '超声', '妇科彩超', 150.00, NULL, 4, false, false, '子宫附件彩超', '妇科'),
('radiology', '影像检查', '超声检查', '超声', '颈动脉彩超', 160.00, NULL, 4, false, false, '颈动脉超声检查', '颈动脉')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. 添加检验科和影像科科室
-- ============================================================
INSERT INTO departments (name, icon, count) VALUES
('检验科', 'lab', 5),
('影像科', 'radiology', 8)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. 更新检验项目周转时间
-- ============================================================
UPDATE exam_items SET turnaround_hours = 2 WHERE exam_type = 'lab' AND sub_category = '血常规';
UPDATE exam_items SET turnaround_hours = 4 WHERE exam_type = 'lab' AND sub_category = '生化检验';
UPDATE exam_items SET turnaround_hours = 24 WHERE exam_type = 'lab' AND professional_category = '免疫检验';
UPDATE exam_items SET turnaround_hours = 48 WHERE exam_type = 'lab' AND professional_category = '微生物检验';
UPDATE exam_items SET turnaround_hours = 4 WHERE exam_type = 'radiology' AND sub_category = '超声检查';
UPDATE exam_items SET turnaround_hours = 24 WHERE exam_type = 'radiology' AND sub_category = 'CT检查';
UPDATE exam_items SET turnaround_hours = 48 WHERE exam_type = 'radiology' AND sub_category = 'MRI检查';

-- ============================================================
-- 10. 标记常用检验项目
-- ============================================================
UPDATE exam_items SET is_common = true WHERE name IN (
  '血常规', '尿常规', '肝功能', '肾功能', '血糖', '血脂四项',
  '胸部X光', '腹部彩超', '心脏彩超', '头颅CT平扫', '胸部CT平扫'
);

-- ============================================================
-- 完成
-- ============================================================