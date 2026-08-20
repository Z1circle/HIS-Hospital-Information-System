-- 创建热词调整历史表
CREATE TABLE IF NOT EXISTS hot_keyword_adjustments (
  id SERIAL PRIMARY KEY,
  keyword_id INTEGER NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  department_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  old_priority INTEGER DEFAULT 0,
  new_priority INTEGER DEFAULT 0,
  old_is_top BOOLEAN DEFAULT false,
  new_is_top BOOLEAN DEFAULT false,
  adjustment_type VARCHAR(50) NOT NULL, -- 'priority_change', 'top_change', 'hidden_change'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES hot_keywords(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_adjustments_keyword_id ON hot_keyword_adjustments(keyword_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_department_id ON hot_keyword_adjustments(department_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_doctor_id ON hot_keyword_adjustments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_created_at ON hot_keyword_adjustments(created_at DESC);

-- 添加注释
COMMENT ON TABLE hot_keyword_adjustments IS '热词调整历史记录表，记录主任医师对热词的调整操作';
COMMENT ON COLUMN hot_keyword_adjustments.adjustment_type IS '调整类型：priority_change-优先级调整，top_change-置顶状态调整，hidden_change-隐藏状态调整';