-- ============================================================
-- HIS系统数据库迁移脚本 - 扩展检验检查、转诊、住院功能
-- 执行方式：psql -U postgres -d hisdb -f migrate_full.sql
-- ============================================================

-- ============================================================
-- 0. 确保基础字段存在
-- ============================================================
ALTER TABLE IF NOT EXISTS doctors ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);

-- ============================================================
-- 1. 检验检查项目字典表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_items (
  id SERIAL PRIMARY KEY,
  exam_type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  reference_range VARCHAR(200),
  unit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_common BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. 检验检查申请表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_requests (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  registration_id INTEGER REFERENCES registrations(id),
  exam_type VARCHAR(20) NOT NULL,
  exam_name VARCHAR(100) NOT NULL,
  clinical_diagnosis TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  urgency VARCHAR(10) DEFAULT 'normal',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  amount DECIMAL(10, 2) DEFAULT 0,
  started_at TIMESTAMP,
  received_at TIMESTAMP,
  received_by INTEGER,
  notify_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. 检验检查报告表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_reports (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES exam_requests(id),
  patient_id INTEGER REFERENCES patients(id),
  exam_type VARCHAR(20) NOT NULL,
  exam_name VARCHAR(100) NOT NULL,
  result TEXT,
  conclusion TEXT,
  reference_range VARCHAR(200),
  image_url VARCHAR(500),
  reporter_id INTEGER REFERENCES users(id),
  reporter_name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  report_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. 转诊单表
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  source_doctor_id INTEGER REFERENCES doctors(id),
  source_dept_id INTEGER REFERENCES departments(id),
  target_dept_id INTEGER REFERENCES departments(id),
  target_doctor_id INTEGER REFERENCES doctors(id),
  diagnosis TEXT NOT NULL,
  reason TEXT NOT NULL,
  suggestions TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  accept_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. 住院证表
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitalization_certificates (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  registration_id INTEGER REFERENCES registrations(id),
  diagnosis TEXT NOT NULL,
  admission_reason TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  ward VARCHAR(50),
  bed_id INTEGER REFERENCES beds(id),
  status VARCHAR(20) DEFAULT 'pending',
  amount DECIMAL(10, 2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  admit_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. 住院记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS inpatient_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  certificate_id INTEGER REFERENCES hospitalization_certificates(id),
  doctor_id INTEGER REFERENCES doctors(id),
  bed_id INTEGER REFERENCES beds(id),
  ward VARCHAR(50),
  admit_date DATE NOT NULL,
  discharge_date DATE,
  diagnosis TEXT,
  treatment_summary TEXT,
  status VARCHAR(20) DEFAULT 'admitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. 住院医嘱表
-- ============================================================
CREATE TABLE IF NOT EXISTS inpatient_orders (
  id SERIAL PRIMARY KEY,
  record_id INTEGER REFERENCES inpatient_records(id),
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  dosage VARCHAR(50),
  frequency VARCHAR(50),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. 初始化检验检查项目数据
-- ============================================================
INSERT INTO exam_items (exam_type, category, name, price, reference_range, unit) VALUES
('lab', '血常规', '血常规', 25.00, NULL, NULL),
('lab', '血常规', '白细胞计数', 5.00, '4.0-10.0', '×10^9/L'),
('lab', '血常规', '红细胞计数', 5.00, '3.5-5.5', '×10^12/L'),
('lab', '血常规', '血红蛋白', 5.00, '120-160', 'g/L'),
('lab', '生化', '肝功能', 80.00, NULL, NULL),
('lab', '生化', '肾功能', 60.00, NULL, NULL),
('lab', '生化', '血糖', 15.00, '3.9-6.1', 'mmol/L'),
('lab', '生化', '血脂四项', 100.00, NULL, NULL),
('lab', '尿液', '尿常规', 20.00, NULL, NULL),
('lab', '凝血', '凝血功能', 80.00, NULL, NULL),
('radiology', 'X光', '胸部X光', 80.00, NULL, NULL),
('radiology', 'X光', '腹部X光', 80.00, NULL, NULL),
('radiology', 'CT', '头颅CT平扫', 280.00, NULL, NULL),
('radiology', 'CT', '胸部CT平扫', 350.00, NULL, NULL),
('radiology', 'CT', '腹部CT平扫', 400.00, NULL, NULL),
('radiology', 'MRI', '头颅MRI', 600.00, NULL, NULL),
('radiology', 'MRI', '脊柱MRI', 700.00, NULL, NULL),
('radiology', '超声', '腹部彩超', 150.00, NULL, NULL),
('radiology', '超声', '心脏彩超', 200.00, NULL, NULL),
('radiology', '超声', '甲状腺彩超', 120.00, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. 添加检验科医师和影像师用户
-- ============================================================
INSERT INTO users (username, password, role, real_name, phone) VALUES
('lab_doctor1', '123456', 'lab_doctor', '检验科医师陈强', '13800138020'),
('lab_doctor2', '123456', 'lab_doctor', '检验科医师刘芳', '13800138021'),
('radiologist1', '123456', 'radiologist', '影像师王伟', '13800138022'),
('radiologist2', '123456', 'radiologist', '影像师赵琳', '13800138023')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 10. 添加检验科医师到doctors表
-- ============================================================
INSERT INTO doctors (name, title, department_id, hospital, fee, avatar, specialty, is_inpatient) VALUES
('陈强', '主管检验师', 1, 'HIS系统医院', 0.00, '陈', '临床检验', false),
('刘芳', '检验师', 1, 'HIS系统医院', 0.00, '刘', '生化检验', false),
('王伟', '副主任医师', 1, 'HIS系统医院', 0.00, '王', '医学影像', false),
('赵琳', '主治医师', 1, 'HIS系统医院', 0.00, '赵', '超声诊断', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. 关联检验科医师用户和医生信息
-- ============================================================
ALTER TABLE IF NOT EXISTS doctors ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
UPDATE doctors SET user_id = (SELECT id FROM users WHERE username = 'lab_doctor1') WHERE name = '陈强';
UPDATE doctors SET user_id = (SELECT id FROM users WHERE username = 'lab_doctor2') WHERE name = '刘芳';
UPDATE doctors SET user_id = (SELECT id FROM users WHERE username = 'radiologist1') WHERE name = '王伟';
UPDATE doctors SET user_id = (SELECT id FROM users WHERE username = 'radiologist2') WHERE name = '赵琳';

-- ============================================================
-- 12. 扩展beds表字段
-- ============================================================
ALTER TABLE IF EXISTS beds ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);
ALTER TABLE IF EXISTS beds ADD COLUMN IF NOT EXISTS bed_type VARCHAR(20) DEFAULT 'general';

-- ============================================================
-- 13. 更新床位数据
-- ============================================================
UPDATE beds SET department_id = 1, bed_type = 'general' WHERE ward = '呼吸科病区';
UPDATE beds SET department_id = 2, bed_type = 'general' WHERE ward = '心内科病区';

-- ============================================================
-- 14. 添加更多住院床位
-- ============================================================
INSERT INTO beds (bed_no, ward, department_id, bed_type, patient_id, status, admit_date) VALUES
('06', '呼吸科病区', 1, 'general', NULL, 'empty', NULL),
('07', '呼吸科病区', 1, 'general', NULL, 'empty', NULL),
('08', '呼吸科病区', 1, 'general', NULL, 'empty', NULL),
('03', '心内科病区', 2, 'general', NULL, 'empty', NULL),
('04', '心内科病区', 2, 'general', NULL, 'empty', NULL),
('01', '外科病区', 2, 'general', NULL, 'empty', NULL),
('02', '外科病区', 2, 'general', NULL, 'empty', NULL),
('03', '外科病区', 2, 'general', NULL, 'empty', NULL),
('01', '中医科病区', 3, 'general', NULL, 'empty', NULL),
('02', '中医科病区', 3, 'general', NULL, 'empty', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 15. 扩展schedules表 - 添加预留号源功能
-- ============================================================
ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS reserved INT DEFAULT 0;
ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS reserved_type VARCHAR(20) DEFAULT 'doctor';
ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS reserved_emergency INT DEFAULT 0;
ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS reserved_vip INT DEFAULT 0;

-- 更新现有排班的预留号源（默认每个排班预留2个号给医生）
UPDATE schedules SET reserved = 2 WHERE reserved IS NULL;

-- ============================================================
-- 15.1 预留号使用记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS reserved_usage_records (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES schedules(id),
  registration_id INTEGER REFERENCES registrations(id),
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  reserved_type VARCHAR(20) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  remark TEXT
);

-- ============================================================
-- 16. 扩展registrations表 - 添加is_reserved字段
-- ============================================================
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS reserved_type VARCHAR(20);

-- ============================================================
-- 17. 科室热点词条表
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_keywords (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  keyword VARCHAR(100) NOT NULL,
  keyword_type VARCHAR(20) DEFAULT 'diagnosis',
  weight INTEGER DEFAULT 10,
  is_top BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 18. 热点词条使用记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS keyword_usage_logs (
  id SERIAL PRIMARY KEY,
  keyword_id INTEGER REFERENCES hot_keywords(id),
  doctor_id INTEGER REFERENCES doctors(id),
  patient_id INTEGER REFERENCES patients(id),
  usage_type VARCHAR(20) DEFAULT 'click',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 19. 初始化科室热点词条数据
-- ============================================================
INSERT INTO hot_keywords (department_id, keyword, keyword_type, weight, is_top) VALUES
-- 呼吸内科
(1, '急性上呼吸道感染', 'diagnosis', 100, true),
(1, '肺炎', 'diagnosis', 95, true),
(1, '慢性阻塞性肺疾病', 'diagnosis', 90, false),
(1, '哮喘', 'diagnosis', 85, false),
(1, '慢性支气管炎', 'diagnosis', 80, false),
(1, '发热', 'symptom', 95, true),
(1, '咳嗽', 'symptom', 90, true),
(1, '咳痰', 'symptom', 85, false),
(1, '胸闷', 'symptom', 80, false),
(1, '喘息', 'symptom', 75, false),
-- 心血管内科
(2, '高血压', 'diagnosis', 100, true),
(2, '冠心病', 'diagnosis', 95, true),
(2, '心绞痛', 'diagnosis', 90, false),
(2, '心力衰竭', 'diagnosis', 85, false),
(2, '心律失常', 'diagnosis', 80, false),
(2, '胸痛', 'symptom', 95, true),
(2, '心悸', 'symptom', 90, false),
(2, '头晕', 'symptom', 85, false),
(2, '头痛', 'symptom', 80, false),
-- 内分泌科
(3, '2型糖尿病', 'diagnosis', 100, true),
(3, '1型糖尿病', 'diagnosis', 85, false),
(3, '高脂血症', 'diagnosis', 90, false),
(3, '甲状腺功能亢进', 'diagnosis', 80, false),
(3, '甲状腺功能减退', 'diagnosis', 75, false),
(3, '多饮', 'symptom', 85, false),
(3, '多食', 'symptom', 80, false),
(3, '多尿', 'symptom', 80, false),
(3, '体重下降', 'symptom', 90, true),
-- 通用症状
(0, '乏力', 'symptom', 85, false),
(0, '恶心', 'symptom', 80, false),
(0, '呕吐', 'symptom', 80, false),
(0, '腹泻', 'symptom', 85, false),
(0, '腹痛', 'symptom', 90, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 20. 医生快捷键设置表
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_shortcuts (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  shortcut_key VARCHAR(50) NOT NULL,
  shortcut_value VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(doctor_id, shortcut_key)
);

-- ============================================================
-- 21. 扩展exam_reports表 - 添加影像报告所需字段
-- ============================================================
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS image_features TEXT;
ALTER TABLE IF EXISTS exam_reports ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- ============================================================
-- 21.1 扩展exam_items表 - 添加is_common字段
-- ============================================================
ALTER TABLE IF EXISTS exam_items ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT false;

-- 标记常用检验检查项目
UPDATE exam_items SET is_common = true WHERE name IN (
  '血常规', '尿常规', '肝功能', '肾功能', '血糖', '血脂四项',
  '凝血功能', 'C反应蛋白', '甲状腺功能五项',
  '胸部X光', '头颅CT平扫', '腹部彩超', '心脏彩超'
);

-- ============================================================
-- 22. 扩展exam_requests表 - 添加completed_at字段
-- ============================================================
ALTER TABLE IF EXISTS exam_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ============================================================
-- 23. 扩展registrations表 - 添加复诊标识字段
-- ============================================================
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS is_revisit BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS original_registration_id INTEGER;
ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS visit_date DATE;

-- ============================================================
-- 24. exam_notifications通知表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_notifications (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES exam_reports(id),
  doctor_id INTEGER REFERENCES doctors(id),
  patient_id INTEGER REFERENCES patients(id),
  notification_type VARCHAR(30) DEFAULT 'report_completed',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 25. 复诊申请表
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
-- 26. 补充更多检验检查项目数据
-- ============================================================
INSERT INTO exam_items (exam_type, category, name, price, reference_range, unit) VALUES
-- 更多检验项目
('lab', '生化', '糖化血红蛋白', 45.00, '4.0-6.0', '%'),
('lab', '生化', '电解质六项', 60.00, NULL, NULL),
('lab', '生化', '心肌酶谱', 80.00, NULL, NULL),
('lab', '生化', 'C反应蛋白', 25.00, '0-10', 'mg/L'),
('lab', '免疫', '甲状腺功能五项', 150.00, NULL, NULL),
('lab', '免疫', '乙肝两对半', 80.00, NULL, NULL),
('lab', '免疫', '肿瘤标志物', 200.00, NULL, NULL),
('lab', '免疫', '风湿三项', 60.00, NULL, NULL),
('lab', '尿液', '尿微量白蛋白', 30.00, '0-20', 'mg/L'),
('lab', '粪便', '大便常规+隐血', 25.00, NULL, NULL),
('lab', '凝血', 'D-二聚体', 40.00, '0-0.5', 'mg/L'),
('lab', '血型', 'ABO血型鉴定', 20.00, NULL, NULL),
-- 更多影像项目
('radiology', 'X光', '颈椎正侧位X光', 80.00, NULL, NULL),
('radiology', 'X光', '腰椎正侧位X光', 80.00, NULL, NULL),
('radiology', 'X光', '膝关节正侧位X光', 80.00, NULL, NULL),
('radiology', 'CT', '颈椎CT', 300.00, NULL, NULL),
('radiology', 'CT', '腰椎CT', 300.00, NULL, NULL),
('radiology', 'CT', '腹部CT增强', 600.00, NULL, NULL),
('radiology', 'CT', '胸部CT增强', 550.00, NULL, NULL),
('radiology', 'MRI', '腰椎MRI', 700.00, NULL, NULL),
('radiology', 'MRI', '膝关节MRI', 600.00, NULL, NULL),
('radiology', 'MRI', '颈椎MRI', 650.00, NULL, NULL),
('radiology', 'MRI', '肩关节MRI', 600.00, NULL, NULL),
('radiology', '超声', '颈动脉彩超', 150.00, NULL, NULL),
('radiology', '超声', '乳腺彩超', 120.00, NULL, NULL),
('radiology', '超声', '泌尿系彩超', 130.00, NULL, NULL),
('radiology', '超声', '妇科彩超', 130.00, NULL, NULL)
ON CONFLICT DO NOTHING;