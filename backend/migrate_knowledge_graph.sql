-- ============================================================
-- 知识图谱功能 - 数据库迁移脚本
-- ============================================================

-- 1. 扩展现有热词表
ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS node_type VARCHAR(20);
ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS manual_weight DECIMAL(3,2) DEFAULT 1;
ALTER TABLE hot_keywords ADD COLUMN IF NOT EXISTS description TEXT;

-- 添加注释
COMMENT ON COLUMN hot_keywords.node_type IS '节点类型：disease(疾病)/symptom(症状)/drug(药品)/test(检查)/other(其他)';
COMMENT ON COLUMN hot_keywords.manual_weight IS '人工权重，由主任医师调整，范围0.01-2.00';

-- 2. 创建知识图谱关系表
CREATE TABLE IF NOT EXISTS knowledge_graph (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(20) NOT NULL,
  source_id INTEGER NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id INTEGER NOT NULL,
  relation_type VARCHAR(50) NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES doctors(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, target_type, target_id, relation_type)
);

-- 添加注释
COMMENT ON TABLE knowledge_graph IS '知识图谱关系表，存储热词之间的语义关联';
COMMENT ON COLUMN knowledge_graph.source_type IS '源节点类型';
COMMENT ON COLUMN knowledge_graph.source_id IS '源节点ID，关联hot_keywords.id';
COMMENT ON COLUMN knowledge_graph.target_type IS '目标节点类型';
COMMENT ON COLUMN knowledge_graph.target_id IS '目标节点ID';
COMMENT ON COLUMN knowledge_graph.relation_type IS '关系类型：has_symptom(有症状)/has_drug(用药)/related_to(相关)/caused_by(病因)/test_for(检查)';
COMMENT ON COLUMN knowledge_graph.weight IS '关系权重，范围0.01-2.00';
COMMENT ON COLUMN knowledge_graph.created_by IS '创建人ID（主任医师）';

-- 3. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_kg_source ON knowledge_graph(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kg_target ON knowledge_graph(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_kg_relation ON knowledge_graph(relation_type);
CREATE INDEX IF NOT EXISTS idx_kg_active ON knowledge_graph(is_active);
CREATE INDEX IF NOT EXISTS idx_hot_keywords_node_type ON hot_keywords(node_type);

-- 4. 创建图谱推荐使用记录表
CREATE TABLE IF NOT EXISTS graph_recommendation_logs (
  id SERIAL PRIMARY KEY,
  source_keyword_id INTEGER REFERENCES hot_keywords(id),
  recommended_keyword_id INTEGER REFERENCES hot_keywords(id),
  doctor_id INTEGER REFERENCES doctors(id),
  is_clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE graph_recommendation_logs IS '知识图谱推荐使用记录，用于统计推荐效果';

-- 5. 创建触发器自动更新updated_at
CREATE OR REPLACE FUNCTION update_kg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kg_updated_at
BEFORE UPDATE ON knowledge_graph
FOR EACH ROW
EXECUTE FUNCTION update_kg_updated_at();

-- ============================================================
-- 迁移完成
-- ============================================================