CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(20),
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  title VARCHAR(30),
  department_id INTEGER REFERENCES departments(id),
  hospital VARCHAR(100),
  fee DECIMAL(10, 2),
  avatar VARCHAR(10),
  specialty TEXT DEFAULT '',
  is_inpatient BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  id_card VARCHAR(18) UNIQUE,
  phone VARCHAR(20),
  gender VARCHAR(10),
  birth_date DATE,
  medical_record_no VARCHAR(20),
  insurance_type VARCHAR(20) DEFAULT '自费',
  allergy TEXT DEFAULT '',
  chronic_disease TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'patient',
  real_name VARCHAR(50),
  phone VARCHAR(11),
  id_card VARCHAR(18),
  doctor_id INTEGER REFERENCES doctors(id),
  patient_id INTEGER REFERENCES patients(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INT REFERENCES doctors(id),
  schedule_date DATE NOT NULL,
  am_pm VARCHAR(10) NOT NULL,
  total INT DEFAULT 20,
  remaining INT DEFAULT 20,
  slot_type VARCHAR(20) DEFAULT 'normal',
  fee DECIMAL(10,2) DEFAULT 10,
  is_stopped BOOLEAN DEFAULT false,
  stop_reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id, schedule_date, am_pm)
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  department_id INTEGER REFERENCES departments(id),
  schedule_id INTEGER REFERENCES schedules(id),
  register_date DATE NOT NULL,
  appt_date DATE,
  am_pm VARCHAR(10),
  slot_type VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  seq INTEGER DEFAULT 0,
  visit_date DATE,
  is_revisit BOOLEAN DEFAULT false,
  original_registration_id INTEGER REFERENCES registrations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS system_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER REFERENCES registrations(id),
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  medicine_name VARCHAR(100) NOT NULL,
  dosage VARCHAR(50),
  frequency VARCHAR(50),
  quantity INTEGER DEFAULT 1,
  fee DECIMAL(10, 2),
  decoct_needed BOOLEAN DEFAULT false,
  type VARCHAR(20) DEFAULT 'western',
  review_status VARCHAR(20) DEFAULT 'pending_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  report_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 初始化数据
-- ============================================================

INSERT INTO departments (name, icon, count) VALUES
('内科', '', 12),
('外科', '', 8),
('中医科', '', 15),
('妇产科', '', 6),
('儿科', '', 10),
('皮肤科', '', 4),
('眼科', '', 5),
('耳鼻喉科', '', 3);

INSERT INTO doctors (name, title, department_id, hospital, fee, avatar, specialty, is_inpatient) VALUES
('张明华', '主任医师', 1, 'HIS系统医院', 50.00, '张', '呼吸内科', false),
('李秀英', '副主任医师', 3, 'HIS系统医院', 35.00, '李', '中医内科', false),
('王建国', '主任医师', 1, 'HIS系统医院', 50.00, '王', '心血管内科', false),
('陈玉芳', '主治医师', 3, 'HIS系统医院', 25.00, '陈', '针灸推拿', false),
('刘志强', '副主任医师', 2, 'HIS系统医院', 35.00, '刘', '普外科', false),
('赵晓燕', '主治医师', 4, 'HIS系统医院', 25.00, '赵', '妇科', false),
('孙伟', '主任医师', 5, 'HIS系统医院', 50.00, '孙', '小儿呼吸', false),
('周丽', '主治医师', 6, 'HIS系统医院', 25.00, '周', '皮肤病', false),
('吴明', '副主任医师', 7, 'HIS系统医院', 35.00, '吴', '白内障', false),
('郑军', '主治医师', 8, 'HIS系统医院', 25.00, '郑', '耳鼻喉', false),
('黄婷', '主任医师', 3, 'HIS系统医院', 50.00, '黄', '中医妇科', true),
('李强', '副主任医师', 2, 'HIS系统医院', 35.00, '李', '骨科', true);

INSERT INTO patients (name, id_card, phone, gender, birth_date, medical_record_no) VALUES
('赵伟', '110101199001011234', '13800138001', '男', '1990-01-01', 'MR000001'),
('刘芳', '110101199502022345', '13800138002', '女', '1995-02-02', 'MR000002'),
('王明', '110101198003033456', '13800138003', '男', '1980-03-03', 'MR000003');

-- 用户账号（密码都是 123456）
INSERT INTO users (username, password, role, real_name, phone, id_card, doctor_id, patient_id) VALUES
('admin', '123456', 'admin', '管理员张三', '13800138000', '110101197001010001', NULL, NULL),
('doctor1', '123456', 'doctor', '张明华', '13800138001', '110101196501010001', 1, NULL),
('doctor2', '123456', 'doctor', '李秀英', '13800138002', '110101197002020002', 2, NULL),
('inpatient_doctor1', '123456', 'inpatient_doctor', '黄婷', '13800138003', '110101197203030003', 11, NULL),
('pharmacist1', '123456', 'pharmacist', '李萍萍', '13800138004', '110101197504040004', NULL, NULL),
('patient', '123456', 'patient', '赵伟', '13800138005', '110101199001011234', NULL, 1),
('patient1', '123456', 'patient', '刘芳', '13800138006', '110101199502022345', NULL, 2),
('patient2', '123456', 'patient', '王明', '13800138007', '110101198003033456', NULL, 3);

-- ============================================================
-- 生成未来7天的排班数据
-- ============================================================
-- 内科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(1, CURRENT_DATE, '上午', 20, 15), (1, CURRENT_DATE, '下午', 15, 10),
(1, CURRENT_DATE + 1, '上午', 20, 20), (1, CURRENT_DATE + 1, '下午', 15, 15),
(1, CURRENT_DATE + 3, '上午', 20, 20), (1, CURRENT_DATE + 3, '下午', 15, 15),
(1, CURRENT_DATE + 5, '上午', 20, 20),
(3, CURRENT_DATE, '上午', 20, 18), (3, CURRENT_DATE, '下午', 15, 12),
(3, CURRENT_DATE + 2, '上午', 20, 20), (3, CURRENT_DATE + 2, '下午', 15, 15),
(3, CURRENT_DATE + 4, '上午', 20, 20), (3, CURRENT_DATE + 4, '下午', 15, 15),
(3, CURRENT_DATE + 6, '上午', 20, 20);

-- 中医科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(2, CURRENT_DATE, '上午', 20, 10), (2, CURRENT_DATE, '下午', 15, 8),
(2, CURRENT_DATE + 2, '上午', 20, 20), (2, CURRENT_DATE + 2, '下午', 15, 15),
(2, CURRENT_DATE + 4, '上午', 20, 20), (2, CURRENT_DATE + 4, '下午', 15, 15),
(4, CURRENT_DATE, '上午', 20, 16), (4, CURRENT_DATE, '下午', 15, 14),
(4, CURRENT_DATE + 1, '上午', 20, 20), (4, CURRENT_DATE + 1, '下午', 15, 15),
(4, CURRENT_DATE + 3, '上午', 20, 20), (4, CURRENT_DATE + 3, '下午', 15, 15),
(4, CURRENT_DATE + 5, '上午', 20, 20), (4, CURRENT_DATE + 5, '下午', 15, 15),
(11, CURRENT_DATE, '上午', 20, 12), (11, CURRENT_DATE, '下午', 15, 10),
(11, CURRENT_DATE + 2, '上午', 20, 20), (11, CURRENT_DATE + 2, '下午', 15, 15),
(11, CURRENT_DATE + 4, '上午', 20, 20);

-- 外科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(5, CURRENT_DATE, '上午', 20, 14), (5, CURRENT_DATE, '下午', 15, 11),
(5, CURRENT_DATE + 1, '上午', 20, 20), (5, CURRENT_DATE + 1, '下午', 15, 15),
(5, CURRENT_DATE + 3, '上午', 20, 20), (5, CURRENT_DATE + 3, '下午', 15, 15),
(12, CURRENT_DATE, '上午', 20, 18), (12, CURRENT_DATE, '下午', 15, 13),
(12, CURRENT_DATE + 2, '上午', 20, 20), (12, CURRENT_DATE + 2, '下午', 15, 15),
(12, CURRENT_DATE + 4, '上午', 20, 20);

-- 妇产科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(6, CURRENT_DATE, '上午', 20, 16), (6, CURRENT_DATE, '下午', 15, 12),
(6, CURRENT_DATE + 1, '上午', 20, 20), (6, CURRENT_DATE + 1, '下午', 15, 15),
(6, CURRENT_DATE + 3, '上午', 20, 20), (6, CURRENT_DATE + 3, '下午', 15, 15),
(6, CURRENT_DATE + 5, '上午', 20, 20);

-- 儿科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(7, CURRENT_DATE, '上午', 20, 8), (7, CURRENT_DATE, '下午', 15, 5),
(7, CURRENT_DATE + 2, '上午', 20, 20), (7, CURRENT_DATE + 2, '下午', 15, 15),
(7, CURRENT_DATE + 4, '上午', 20, 20), (7, CURRENT_DATE + 4, '下午', 15, 15),
(7, CURRENT_DATE + 6, '上午', 20, 20);

-- 皮肤科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(8, CURRENT_DATE, '上午', 20, 19),
(8, CURRENT_DATE + 2, '上午', 20, 20), (8, CURRENT_DATE + 2, '下午', 15, 15),
(8, CURRENT_DATE + 4, '上午', 20, 20), (8, CURRENT_DATE + 4, '下午', 15, 15);

-- 眼科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(9, CURRENT_DATE, '上午', 20, 17), (9, CURRENT_DATE, '下午', 15, 14),
(9, CURRENT_DATE + 1, '上午', 20, 20),
(9, CURRENT_DATE + 3, '上午', 20, 20), (9, CURRENT_DATE + 3, '下午', 15, 15),
(9, CURRENT_DATE + 5, '上午', 20, 20);

-- 耳鼻喉科医生排班
INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining) VALUES
(10, CURRENT_DATE, '上午', 20, 18),
(10, CURRENT_DATE + 2, '上午', 20, 20), (10, CURRENT_DATE + 2, '下午', 15, 15),
(10, CURRENT_DATE + 5, '上午', 20, 20), (10, CURRENT_DATE + 5, '下午', 15, 15);

INSERT INTO registrations (patient_id, doctor_id, department_id, schedule_id, register_date, status) VALUES
(1, 1, 1, 1, CURRENT_DATE, 'completed'),
(1, 2, 3, 7, CURRENT_DATE - 1, 'completed'),
(2, 3, 1, 9, CURRENT_DATE - 5, 'completed'),
(3, 4, 3, 13, CURRENT_DATE, 'pending');

INSERT INTO prescriptions (registration_id, patient_id, doctor_id, medicine_name, dosage, frequency, quantity, fee, decoct_needed) VALUES
(1, 1, 1, '感冒灵颗粒', '1袋/次', '每日3次', 3, 28.50, false),
(1, 1, 1, '阿莫西林胶囊', '2粒/次', '每日3次', 2, 50.00, false),
(2, 1, 2, '清热解毒口服液', '1支/次', '每日2次', 4, 36.00, false),
(2, 1, 2, '中药方剂', '1剂/日', '每日1次', 7, 220.00, true);

INSERT INTO reports (patient_id, type, name, status, report_date) VALUES
(1, '检查', '胸部CT平扫', 'completed', CURRENT_DATE - 1),
(1, '检查', '头颅MRI', 'completed', CURRENT_DATE - 6),
(1, '检验', '血常规', 'completed', CURRENT_DATE),
(2, '检验', '生化全套', 'completed', CURRENT_DATE);
