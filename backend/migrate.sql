-- ============================================================
-- HIS系统数据库迁移脚本
-- 执行方式：psql -U postgres -d hisdb -f migrate.sql
-- ============================================================

-- ============================================================
-- 1. 用户认证表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'patient',
  real_name VARCHAR(50),
  phone VARCHAR(11),
  id_card VARCHAR(18),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. patients 表扩展
-- ============================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_record_no VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_type VARCHAR(20) DEFAULT '自费';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergy TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_disease TEXT DEFAULT '';

-- ============================================================
-- 3. doctors 表扩展
-- ============================================================
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT '';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_inpatient BOOLEAN DEFAULT FALSE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ============================================================
-- 4. 排班表
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INT REFERENCES doctors(id),
  schedule_date DATE NOT NULL,
  am_pm VARCHAR(2) NOT NULL,
  total INT DEFAULT 20,
  remaining INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. prescriptions 表扩展（支持审方流程）
-- ============================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_id INT REFERENCES patients(id);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_id INT REFERENCES doctors(id);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'western';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending_review';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS review_remark TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS review_time TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;

-- ============================================================
-- 6. 处方明细表
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_items (
  id SERIAL PRIMARY KEY,
  presc_id INT REFERENCES prescriptions(id) ON DELETE CASCADE,
  item_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(10) DEFAULT '盒',
  price DECIMAL(10,2) DEFAULT 0,
  dosage VARCHAR(50) DEFAULT '',
  frequency VARCHAR(50) DEFAULT '',
  days INT DEFAULT 1,
  drug_id INT
);

-- ============================================================
-- 7. 药品表
-- ============================================================
CREATE TABLE IF NOT EXISTS drugs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specification VARCHAR(50) DEFAULT '',
  price DECIMAL(10,2) DEFAULT 0,
  actual_stock INT DEFAULT 0,
  locked_stock INT DEFAULT 0,
  expiry_date DATE,
  min_stock INT DEFAULT 10,
  insurance_type VARCHAR(20) DEFAULT '丙',
  need_skin_test BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. 皮试表
-- ============================================================
CREATE TABLE IF NOT EXISTS skin_tests (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL,
  drug_id INT NOT NULL,
  drug_name VARCHAR(100),
  result VARCHAR(10) NOT NULL,
  test_time TIMESTAMP NOT NULL DEFAULT NOW(),
  expiry_date DATE NOT NULL,
  nurse_id INT,
  remark TEXT
);

-- ============================================================
-- 9. 病历表
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(id),
  doctor_id INT REFERENCES doctors(id),
  registration_id INT REFERENCES registrations(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  chief TEXT DEFAULT '',
  history TEXT DEFAULT '',
  past TEXT DEFAULT '',
  family TEXT DEFAULT '',
  personal TEXT DEFAULT '',
  allergy TEXT DEFAULT '',
  physical TEXT DEFAULT '',
  auxiliary TEXT DEFAULT '',
  diagnosis TEXT DEFAULT '',
  suggestion TEXT DEFAULT '',
  diagnoses JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. 费用发票表
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(id),
  presc_id INT REFERENCES prescriptions(id),
  amount DECIMAL(10,2) DEFAULT 0,
  insurance_amount DECIMAL(10,2) DEFAULT 0,
  self_amount DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 11. 住院床位表
-- ============================================================
CREATE TABLE IF NOT EXISTS beds (
  id SERIAL PRIMARY KEY,
  bed_no VARCHAR(10) NOT NULL,
  ward VARCHAR(50) DEFAULT '呼吸科病区',
  patient_id INT REFERENCES patients(id),
  status VARCHAR(20) DEFAULT 'empty',
  admit_date DATE
);

-- ============================================================
-- 12. 操作审计日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INT,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. 通知公告表
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  publish_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- 14. departments表添加fee字段（科室挂号费）
-- ============================================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 10.00;

-- 更新现有科室的挂号费
UPDATE departments SET fee = 10.00 WHERE id = 1;  -- 内科
UPDATE departments SET fee = 15.00 WHERE id = 2;  -- 外科
UPDATE departments SET fee = 20.00 WHERE id = 3;  -- 中医科
UPDATE departments SET fee = 25.00 WHERE id = 4;  -- 妇产科
UPDATE departments SET fee = 15.00 WHERE id = 5;  -- 儿科
UPDATE departments SET fee = 10.00 WHERE id = 6;  -- 皮肤科
UPDATE departments SET fee = 15.00 WHERE id = 7;  -- 眼科
UPDATE departments SET fee = 10.00 WHERE id = 8;  -- 耳鼻喉科

-- ============================================================
-- 初始数据
-- ============================================================

-- 用户数据
INSERT INTO users (username, password, role, real_name, phone) VALUES
('admin',    '123456', 'admin',            '管理员张三', '13800138000'),
('doctor',   '123456', 'doctor',           '张明华',     '13800138001'),
('indoctor', '123456', 'inpatient_doctor', '李秀英',     '13800138005'),
('pharma',   '123456', 'pharmacist',       '李萍萍',     '13800138004'),
('patient',  '123456', 'patient',          '王小明',     '13800138002')
ON CONFLICT (username) DO NOTHING;

-- 药品数据
INSERT INTO drugs (name, specification, price, actual_stock, min_stock, insurance_type, need_skin_test, expiry_date) VALUES
('阿莫西林胶囊',   '0.5g*20粒',  25.00, 50, 10, '乙', FALSE, '2027-01-15'),
('头孢克肟片',     '0.1g*10片',  38.00,  8, 10, '乙', FALSE, '2025-06-20'),
('布洛芬胶囊',     '0.2g*24粒',   8.00,  3, 10, '甲', FALSE, '2027-03-10'),
('注射用青霉素钠', '80万U/支',    1.50, 20,  5, '甲', TRUE,  '2025-12-01'),
('二甲双胍片',     '0.5g*30片',  12.00, 35, 10, '甲', FALSE, '2027-06-01'),
('罗红霉素分散片', '0.15g*12片',  9.00, 25, 10, '乙', FALSE, '2027-04-01'),
('复方氨酚烷胺片', '10片/盒',     6.00, 40, 10, '乙', FALSE, '2027-02-01'),
('清热解毒口服液', '10ml*6支',   18.00, 30, 10, '甲', FALSE, '2027-05-01'),
('氨溴索片',       '30mg*20片',  15.00, 20, 10, '乙', FALSE, '2027-08-01'),
('地塞米松注射液', '5mg/ml*1ml',  2.50, 15,  5, '甲', FALSE, '2026-11-01'),
('硝苯地平控释片', '30mg*7片',   42.50, 30, 10, '甲', FALSE, '2027-07-20'),
('奥美拉唑肠溶胶囊', '20mg*14粒', 28.80, 40, 15, '乙', FALSE, '2027-09-15'),
('阿托伐他汀钙片', '20mg*7片',   65.00, 25, 10, '甲', FALSE, '2027-06-30'),
('蒙脱石散',       '3g*10袋',   12.00, 50, 20, '甲', FALSE, '2027-04-25'),
('板蓝根颗粒',     '10g*20袋',   15.00, 60, 20, '甲', FALSE, '2027-08-10'),
('连花清瘟胶囊',   '0.35g*36粒', 28.50, 45, 15, '乙', FALSE, '2027-05-18'),
('蒲地蓝消炎口服液', '10ml*12支', 35.00, 35, 10, '乙', FALSE, '2027-03-22'),
('胰岛素注射液',   '300IU/3ml',  58.00, 20, 10, '甲', FALSE, '2026-12-01'),
('氯雷他定片',     '10mg*6片',   15.50, 55, 15, '乙', FALSE, '2027-10-05'),
('氯化钠注射液',   '0.9% 500ml',  4.80, 200, 50, '甲', FALSE, '2026-08-15'),
('葡萄糖注射液',   '5% 500ml',    5.20, 180, 50, '甲', FALSE, '2026-09-20'),
('布地奈德吸入剂', '200μg*100吸', 96.00, 15, 5, '甲', FALSE, '2027-02-28'),
('复方丹参滴丸',   '27mg*180丸', 32.00, 40, 10, '甲', FALSE, '2027-11-12'),
('阿司匹林肠溶片', '100mg*30片', 12.50, 70, 20, '甲', FALSE, '2027-06-18'),
('氢氯噻嗪片',     '25mg*100片',  8.60, 45, 15, '甲', FALSE, '2027-09-30'),
('格列美脲片',     '2mg*30片',   35.00, 30, 10, '甲', FALSE, '2027-04-08'),
('维生素C片',       '100mg*100片',  5.00, 100, 30, '甲', FALSE, '2027-12-01'),
('云南白药胶囊',   '0.25g*16粒', 35.00, 25, 10, '乙', FALSE, '2027-07-15'),
('感冒清热颗粒',   '12g*10袋',   18.00, 50, 15, '甲', FALSE, '2027-08-22')
ON CONFLICT DO NOTHING;

-- 排班数据（未来7天）
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(1, CURRENT_DATE, 'am', 20, 12),
(1, CURRENT_DATE, 'pm', 20, 8),
(2, CURRENT_DATE, 'am', 20, 15),
(3, CURRENT_DATE, 'am', 20, 5),
(1, CURRENT_DATE + 1, 'am', 20, 20),
(1, CURRENT_DATE + 1, 'pm', 20, 20),
(2, CURRENT_DATE + 2, 'am', 20, 18),
(4, CURRENT_DATE + 2, 'pm', 20, 10)
ON CONFLICT DO NOTHING;

-- 住院床位数据
INSERT INTO beds (bed_no, ward, patient_id, status, admit_date) VALUES
('01', '呼吸科病区', 1, 'occupied', CURRENT_DATE - 5),
('02', '呼吸科病区', 2, 'occupied', CURRENT_DATE - 3),
('03', '呼吸科病区', NULL, 'empty', NULL),
('04', '呼吸科病区', 3, 'occupied', CURRENT_DATE - 1),
('05', '呼吸科病区', NULL, 'empty', NULL),
('01', '心内科病区', NULL, 'empty', NULL),
('02', '心内科病区', NULL, 'empty', NULL)
ON CONFLICT DO NOTHING;

-- 通知公告数据
INSERT INTO announcements (title, content, publish_date) VALUES
('关于门诊时间调整的通知', '经研究决定，自即日起门诊时间调整为周一至周六8:00-17:00。', '2026-06-05'),
('端午节放假安排', '端午节期间（6月1日-3日）正常出诊，急诊24小时开放。', '2026-06-01'),
('新增大便常规线上预约功能', '为方便患者，现增加大便常规检查线上预约服务，请关注公众号操作。', '2026-05-28')
ON CONFLICT DO NOTHING;

-- 更新doctors表关联user_id
UPDATE doctors SET user_id = (SELECT id FROM users WHERE username = 'doctor') WHERE id = 1;

-- 更新patients表关联user_id
UPDATE patients SET user_id = (SELECT id FROM users WHERE username = 'patient'),
  medical_record_no = 'MR20240001',
  insurance_type = '芜湖医保',
  allergy = '磺胺类药物',
  chronic_disease = '2型糖尿病'
WHERE id = 1;
