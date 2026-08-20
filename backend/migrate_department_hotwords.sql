-- ============================================================
-- 科室热词分类和主任医师功能 - 数据库迁移脚本
-- ============================================================

-- 1. 给doctors表添加主任医师标识字段
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_chief_physician BOOLEAN DEFAULT false;
COMMENT ON COLUMN doctors.is_chief_physician IS '是否为主任医师';

-- 2. 给hot_keywords表添加科室关联字段（如果不存在）
ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);
COMMENT ON COLUMN hot_keywords.department_id IS '所属科室ID，用于按科室分类显示';

-- 3. 创建热词批量导入记录表
CREATE TABLE IF NOT EXISTS hot_keywords_batch_import (
  id SERIAL PRIMARY KEY,
  import_name VARCHAR(100) NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  import_type VARCHAR(20) DEFAULT 'manual',
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  import_file TEXT,
  import_notes TEXT,
  imported_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hot_keywords_batch_import IS '热词批量导入记录表';
COMMENT ON COLUMN hot_keywords_batch_import.import_type IS '导入类型：manual(手动)/system(系统自动)';
COMMENT ON COLUMN hot_keywords_batch_import.import_file IS '导入的文件内容或路径';

-- 4. 创建热词调整记录表（主任医师操作）
CREATE TABLE IF NOT EXISTS hot_keywords_adjustment_logs (
  id SERIAL PRIMARY KEY,
  keyword_id INTEGER REFERENCES hot_keywords(id),
  doctor_id INTEGER REFERENCES doctors(id),
  old_weight INTEGER,
  new_weight INTEGER,
  old_is_top BOOLEAN,
  new_is_top BOOLEAN,
  old_is_hidden BOOLEAN,
  new_is_hidden BOOLEAN,
  adjustment_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hot_keywords_adjustment_logs IS '热词调整记录表，记录主任医师对热词的所有修改';
COMMENT ON COLUMN hot_keywords_adjustment_logs.adjustment_reason IS '调整原因';

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_doctors_chief ON doctors(is_chief_physician);
CREATE INDEX IF NOT EXISTS idx_hot_keywords_dept ON hot_keywords(department_id);
CREATE INDEX IF NOT EXISTS idx_batch_import_dept ON hot_keywords_batch_import(department_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_logs_keyword ON hot_keywords_adjustment_logs(keyword_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_logs_doctor ON hot_keywords_adjustment_logs(doctor_id);

-- ============================================================
-- 迁移完成
-- ============================================================