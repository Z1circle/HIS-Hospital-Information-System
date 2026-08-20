-- ============================================================
-- 主任医师配置和热词优先级展示机制 - 数据库迁移脚本
-- ============================================================

-- 1. 将现有医生改为主治医师
UPDATE doctors SET title = '主治医师' WHERE title IN ('主任医师', '副主任医师');

-- 2. 为8个科室各新增主任医师
INSERT INTO doctors (name, title, department_id, hospital, fee, avatar, specialty, is_inpatient, is_chief_physician) VALUES
('内科主任医师', '主任医师', 1, 'HIS系统医院', 60.00, '内', '内科综合', false, true),
('外科主任医师', '主任医师', 2, 'HIS系统医院', 60.00, '外', '外科综合', false, true),
('中医科主任医师', '主任医师', 3, 'HIS系统医院', 60.00, '中', '中医综合', false, true),
('妇产科主任医师', '主任医师', 4, 'HIS系统医院', 60.00, '妇', '妇产科综合', false, true),
('儿科主任医师', '主任医师', 5, 'HIS系统医院', 60.00, '儿', '儿科综合', false, true),
('皮肤科主任医师', '主任医师', 6, 'HIS系统医院', 60.00, '皮', '皮肤科综合', false, true),
('眼科主任医师', '主任医师', 7, 'HIS系统医院', 60.00, '眼', '眼科综合', false, true),
('耳鼻喉科主任医师', '主任医师', 8, 'HIS系统医院', 60.00, '耳', '耳鼻喉科综合', false, true)
ON CONFLICT DO NOTHING;

-- 3. 为主任医师创建用户账号（密码都是123456）
INSERT INTO users (username, password, role, real_name, phone, id_card, doctor_id) VALUES
('chief_1', '123456', 'doctor', '内科主任医师', '13800138010', '110101196001010010', (SELECT id FROM doctors WHERE name = '内科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_2', '123456', 'doctor', '外科主任医师', '13800138011', '110101196002020011', (SELECT id FROM doctors WHERE name = '外科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_3', '123456', 'doctor', '中医科主任医师', '13800138012', '110101196003030012', (SELECT id FROM doctors WHERE name = '中医科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_4', '123456', 'doctor', '妇产科主任医师', '13800138013', '110101196004040013', (SELECT id FROM doctors WHERE name = '妇产科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_5', '123456', 'doctor', '儿科主任医师', '13800138014', '110101196005050014', (SELECT id FROM doctors WHERE name = '儿科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_6', '123456', 'doctor', '皮肤科主任医师', '13800138015', '110101196006060015', (SELECT id FROM doctors WHERE name = '皮肤科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_7', '123456', 'doctor', '眼科主任医师', '13800138016', '110101196007070016', (SELECT id FROM doctors WHERE name = '眼科主任医师' AND is_chief_physician = true LIMIT 1)),
('chief_8', '123456', 'doctor', '耳鼻喉科主任医师', '13800138017', '110101196008080017', (SELECT id FROM doctors WHERE name = '耳鼻喉科主任医师' AND is_chief_physician = true LIMIT 1))
ON CONFLICT (username) DO NOTHING;

-- 4. 为每个科室创建初始热词数据
INSERT INTO hot_keywords (department_id, keyword, keyword_type, weight, is_top, is_hidden, usage_count) VALUES
-- 内科热词
(1, '急性上呼吸道感染', 'diagnosis', 100, true, false, 0),
(1, '肺炎', 'diagnosis', 95, true, false, 0),
(1, '发热', 'symptom', 95, true, false, 0),
(1, '咳嗽', 'symptom', 90, true, false, 0),
(1, '高血压', 'diagnosis', 85, false, false, 0),
(1, '冠心病', 'diagnosis', 80, false, false, 0),
(1, '糖尿病', 'diagnosis', 75, false, false, 0),
(1, '胸痛', 'symptom', 70, false, false, 0),

-- 外科热词
(2, '阑尾炎', 'diagnosis', 100, true, false, 0),
(2, '胆结石', 'diagnosis', 95, true, false, 0),
(2, '腹痛', 'symptom', 90, true, false, 0),
(2, '骨折', 'diagnosis', 85, false, false, 0),
(2, '外伤', 'symptom', 80, false, false, 0),
(2, '疝气', 'diagnosis', 75, false, false, 0),
(2, '胃穿孔', 'diagnosis', 70, false, false, 0),

-- 中医科热词
(3, '气血两虚', 'diagnosis', 100, true, false, 0),
(3, '脾胃虚弱', 'diagnosis', 95, true, false, 0),
(3, '失眠', 'symptom', 90, true, false, 0),
(3, '头痛', 'symptom', 85, false, false, 0),
(3, '腰痛', 'symptom', 80, false, false, 0),
(3, '风湿', 'diagnosis', 75, false, false, 0),
(3, '颈椎病', 'diagnosis', 70, false, false, 0),

-- 妇产科热词
(4, '月经不调', 'diagnosis', 100, true, false, 0),
(4, '痛经', 'symptom', 95, true, false, 0),
(4, '妊娠期糖尿病', 'diagnosis', 90, true, false, 0),
(4, '子宫肌瘤', 'diagnosis', 85, false, false, 0),
(4, '卵巢囊肿', 'diagnosis', 80, false, false, 0),
(4, '阴道炎', 'diagnosis', 75, false, false, 0),
(4, '盆腔炎', 'diagnosis', 70, false, false, 0),

-- 儿科热词
(5, '小儿肺炎', 'diagnosis', 100, true, false, 0),
(5, '小儿感冒', 'diagnosis', 95, true, false, 0),
(5, '发热', 'symptom', 90, true, false, 0),
(5, '咳嗽', 'symptom', 85, false, false, 0),
(5, '腹泻', 'symptom', 80, false, false, 0),
(5, '手足口病', 'diagnosis', 75, false, false, 0),
(5, '水痘', 'diagnosis', 70, false, false, 0),

-- 皮肤科热词
(6, '湿疹', 'diagnosis', 100, true, false, 0),
(6, '皮炎', 'diagnosis', 95, true, false, 0),
(6, '荨麻疹', 'diagnosis', 90, true, false, 0),
(6, '瘙痒', 'symptom', 85, false, false, 0),
(6, '痤疮', 'diagnosis', 80, false, false, 0),
(6, '银屑病', 'diagnosis', 75, false, false, 0),
(6, '带状疱疹', 'diagnosis', 70, false, false, 0),

-- 眼科热词
(7, '白内障', 'diagnosis', 100, true, false, 0),
(7, '青光眼', 'diagnosis', 95, true, false, 0),
(7, '视力模糊', 'symptom', 90, true, false, 0),
(7, '眼干', 'symptom', 85, false, false, 0),
(7, '结膜炎', 'diagnosis', 80, false, false, 0),
(7, '角膜炎', 'diagnosis', 75, false, false, 0),
(7, '视网膜脱落', 'diagnosis', 70, false, false, 0),

-- 耳鼻喉科热词
(8, '中耳炎', 'diagnosis', 100, true, false, 0),
(8, '鼻炎', 'diagnosis', 95, true, false, 0),
(8, '咽炎', 'diagnosis', 90, true, false, 0),
(8, '耳鸣', 'symptom', 85, false, false, 0),
(8, '听力下降', 'symptom', 80, false, false, 0),
(8, '扁桃体炎', 'diagnosis', 75, false, false, 0),
(8, '鼻窦炎', 'diagnosis', 70, false, false, 0)
ON CONFLICT DO NOTHING;

-- 5. 添加优先级字段用于热词排序
ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
COMMENT ON COLUMN hot_keywords.priority IS '优先级，数字越大优先级越高，主任医师可调整';

-- 6. 为置顶热词设置高优先级
UPDATE hot_keywords SET priority = 100 WHERE is_top = true;

-- ============================================================
-- 迁移完成
-- ============================================================