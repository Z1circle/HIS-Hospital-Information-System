const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function seedKnowledgeGraph() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('开始初始化知识图谱数据...');

    // 1. 更新现有热词的node_type
    const keywordTypeMap = {
      // 疾病
      '高血压': 'disease', '糖尿病': 'disease', '冠心病': 'disease',
      '上呼吸道感染': 'disease', '急性支气管炎': 'disease', '肺炎': 'disease',
      '胃炎': 'disease', '胃溃疡': 'disease', '急性胃肠炎': 'disease',
      '偏头痛': 'disease', '颈椎病': 'disease', '腰椎间盘突出': 'disease',
      '过敏性鼻炎': 'disease', '急性扁桃体炎': 'disease', '急性咽炎': 'disease',
      '急性阑尾炎': 'disease', '胆结石': 'disease', '泌尿系结石': 'disease',
      '骨质疏松': 'disease', '骨关节炎': 'disease', '类风湿关节炎': 'disease',
      '甲状腺结节': 'disease', '乳腺增生': 'disease', '子宫肌瘤': 'disease',
      '前列腺增生': 'disease', '慢性前列腺炎': 'disease', '湿疹': 'disease',
      '荨麻疹': 'disease', '带状疱疹': 'disease', '银屑病': 'disease',
      '抑郁症': 'disease', '焦虑症': 'disease', '失眠症': 'disease',

      // 症状
      '发热': 'symptom', '咳嗽': 'symptom', '咳痰': 'symptom',
      '胸痛': 'symptom', '胸闷': 'symptom', '气短': 'symptom',
      '心悸': 'symptom', '头晕': 'symptom', '头痛': 'symptom',
      '恶心': 'symptom', '呕吐': 'symptom', '腹痛': 'symptom',
      '腹泻': 'symptom', '便秘': 'symptom', '食欲不振': 'symptom',
      '乏力': 'symptom', '盗汗': 'symptom', '消瘦': 'symptom',
      '关节痛': 'symptom', '肌肉酸痛': 'symptom', '腰痛': 'symptom',
      '尿频': 'symptom', '尿急': 'symptom', '尿痛': 'symptom',
      '皮肤瘙痒': 'symptom', '皮疹': 'symptom', '水肿': 'symptom',
      '鼻塞': 'symptom', '流涕': 'symptom', '咽痛': 'symptom',
      '声音嘶哑': 'symptom', '耳鸣': 'symptom', '听力下降': 'symptom',
      '视力模糊': 'symptom', '眼干': 'symptom', '眼痒': 'symptom',

      // 药品
      '阿司匹林': 'drug', '氨氯地平': 'drug', '硝苯地平': 'drug',
      '美托洛尔': 'drug', '厄贝沙坦': 'drug', '缬沙坦': 'drug',
      '二甲双胍': 'drug', '格列美脲': 'drug', '胰岛素': 'drug',
      '阿莫西林': 'drug', '头孢呋辛': 'drug', '左氧氟沙星': 'drug',
      '奥美拉唑': 'drug', '雷贝拉唑': 'drug', '多潘立酮': 'drug',
      '蒙脱石散': 'drug', '益生菌': 'drug', '开塞露': 'drug',
      '布洛芬': 'drug', '对乙酰氨基酚': 'drug', '双氯芬酸钠': 'drug',
      '氯雷他定': 'drug', '西替利嗪': 'drug', '地塞米松': 'drug',
      '氨溴索': 'drug', '右美沙芬': 'drug', '孟鲁司特': 'drug',
      '硝酸甘油': 'drug', '速效救心丸': 'drug', '复方丹参滴丸': 'drug',
      '钙片': 'drug', '维生素D': 'drug', '骨化三醇': 'drug',
      '甲钴胺': 'drug', '维生素B12': 'drug', '叶酸': 'drug',

      // 检查
      '血常规': 'test', '尿常规': 'test', '便常规': 'test',
      '肝功能': 'test', '肾功能': 'test', '血糖': 'test',
      '血脂': 'test', '电解质': 'test', '心肌酶': 'test',
      '心电图': 'test', '胸部CT': 'test', '腹部B超': 'test',
      '心脏彩超': 'test', '颅脑CT': 'test', '颅脑MRI': 'test',
      '胃镜': 'test', '肠镜': 'test', '支气管镜': 'test',
      '甲状腺B超': 'test', '乳腺B超': 'test', '妇科B超': 'test',
      '前列腺B超': 'test', '骨密度': 'test', '肺功能': 'test',
    };

    let updatedCount = 0;
    for (const [keyword, nodeType] of Object.entries(keywordTypeMap)) {
      const res = await client.query(
        'UPDATE hot_keywords SET node_type = $1 WHERE keyword = $2 AND node_type IS NULL',
        [nodeType, keyword]
      );
      if (res.rowCount > 0) updatedCount++;
    }
    console.log(`[OK] 更新了 ${updatedCount} 个热词的node_type`);

    // 2. 获取热词ID映射
    const keywordRes = await client.query('SELECT id, keyword, node_type FROM hot_keywords WHERE node_type IS NOT NULL');
    const keywordMap = {};
    keywordRes.rows.forEach(row => {
      keywordMap[row.keyword] = { id: row.id, type: row.node_type };
    });

    // 3. 创建知识图谱关系
    const relations = [
      // 高血压相关
      { source: '高血压', target: '头晕', relation: 'has_symptom', weight: 1.2 },
      { source: '高血压', target: '头痛', relation: 'has_symptom', weight: 1.0 },
      { source: '高血压', target: '心悸', relation: 'has_symptom', weight: 1.1 },
      { source: '高血压', target: '胸闷', relation: 'has_symptom', weight: 1.0 },
      { source: '高血压', target: '氨氯地平', relation: 'has_drug', weight: 1.5 },
      { source: '高血压', target: '硝苯地平', relation: 'has_drug', weight: 1.5 },
      { source: '高血压', target: '美托洛尔', relation: 'has_drug', weight: 1.3 },
      { source: '高血压', target: '厄贝沙坦', relation: 'has_drug', weight: 1.4 },
      { source: '高血压', target: '缬沙坦', relation: 'has_drug', weight: 1.4 },
      { source: '高血压', target: '阿司匹林', relation: 'has_drug', weight: 1.2 },
      { source: '高血压', target: '心电图', relation: 'test_for', weight: 1.0 },
      { source: '高血压', target: '心脏彩超', relation: 'test_for', weight: 0.9 },

      // 糖尿病相关
      { source: '糖尿病', target: '乏力', relation: 'has_symptom', weight: 1.1 },
      { source: '糖尿病', target: '消瘦', relation: 'has_symptom', weight: 1.2 },
      { source: '糖尿病', target: '多饮', relation: 'has_symptom', weight: 1.0 },
      { source: '糖尿病', target: '多尿', relation: 'has_symptom', weight: 1.0 },
      { source: '糖尿病', target: '二甲双胍', relation: 'has_drug', weight: 1.5 },
      { source: '糖尿病', target: '格列美脲', relation: 'has_drug', weight: 1.3 },
      { source: '糖尿病', target: '胰岛素', relation: 'has_drug', weight: 1.5 },
      { source: '糖尿病', target: '血糖', relation: 'test_for', weight: 1.5 },
      { source: '糖尿病', target: '尿常规', relation: 'test_for', weight: 1.2 },
      { source: '糖尿病', target: '糖化血红蛋白', relation: 'test_for', weight: 1.3 },

      // 冠心病相关
      { source: '冠心病', target: '胸痛', relation: 'has_symptom', weight: 1.5 },
      { source: '冠心病', target: '胸闷', relation: 'has_symptom', weight: 1.3 },
      { source: '冠心病', target: '气短', relation: 'has_symptom', weight: 1.2 },
      { source: '冠心病', target: '心悸', relation: 'has_symptom', weight: 1.1 },
      { source: '冠心病', target: '阿司匹林', relation: 'has_drug', weight: 1.5 },
      { source: '冠心病', target: '硝酸甘油', relation: 'has_drug', weight: 1.5 },
      { source: '冠心病', target: '速效救心丸', relation: 'has_drug', weight: 1.4 },
      { source: '冠心病', target: '复方丹参滴丸', relation: 'has_drug', weight: 1.3 },
      { source: '冠心病', target: '心电图', relation: 'test_for', weight: 1.5 },
      { source: '冠心病', target: '心脏彩超', relation: 'test_for', weight: 1.3 },
      { source: '冠心病', target: '胸部CT', relation: 'test_for', weight: 1.1 },

      // 上呼吸道感染相关
      { source: '上呼吸道感染', target: '发热', relation: 'has_symptom', weight: 1.5 },
      { source: '上呼吸道感染', target: '咳嗽', relation: 'has_symptom', weight: 1.4 },
      { source: '上呼吸道感染', target: '咽痛', relation: 'has_symptom', weight: 1.3 },
      { source: '上呼吸道感染', target: '鼻塞', relation: 'has_symptom', weight: 1.2 },
      { source: '上呼吸道感染', target: '流涕', relation: 'has_symptom', weight: 1.2 },
      { source: '上呼吸道感染', target: '头痛', relation: 'has_symptom', weight: 1.0 },
      { source: '上呼吸道感染', target: '乏力', relation: 'has_symptom', weight: 1.0 },
      { source: '上呼吸道感染', target: '阿莫西林', relation: 'has_drug', weight: 1.3 },
      { source: '上呼吸道感染', target: '头孢呋辛', relation: 'has_drug', weight: 1.3 },
      { source: '上呼吸道感染', target: '布洛芬', relation: 'has_drug', weight: 1.2 },
      { source: '上呼吸道感染', target: '对乙酰氨基酚', relation: 'has_drug', weight: 1.2 },
      { source: '上呼吸道感染', target: '血常规', relation: 'test_for', weight: 1.3 },

      // 肺炎相关
      { source: '肺炎', target: '发热', relation: 'has_symptom', weight: 1.5 },
      { source: '肺炎', target: '咳嗽', relation: 'has_symptom', weight: 1.5 },
      { source: '肺炎', target: '咳痰', relation: 'has_symptom', weight: 1.4 },
      { source: '肺炎', target: '胸痛', relation: 'has_symptom', weight: 1.2 },
      { source: '肺炎', target: '气短', relation: 'has_symptom', weight: 1.3 },
      { source: '肺炎', target: '左氧氟沙星', relation: 'has_drug', weight: 1.4 },
      { source: '肺炎', target: '头孢呋辛', relation: 'has_drug', weight: 1.3 },
      { source: '肺炎', target: '氨溴索', relation: 'has_drug', weight: 1.2 },
      { source: '肺炎', target: '血常规', relation: 'test_for', weight: 1.4 },
      { source: '肺炎', target: '胸部CT', relation: 'test_for', weight: 1.5 },

      // 胃炎相关
      { source: '胃炎', target: '腹痛', relation: 'has_symptom', weight: 1.4 },
      { source: '胃炎', target: '恶心', relation: 'has_symptom', weight: 1.3 },
      { source: '胃炎', target: '呕吐', relation: 'has_symptom', weight: 1.2 },
      { source: '胃炎', target: '食欲不振', relation: 'has_symptom', weight: 1.2 },
      { source: '胃炎', target: '奥美拉唑', relation: 'has_drug', weight: 1.5 },
      { source: '胃炎', target: '雷贝拉唑', relation: 'has_drug', weight: 1.4 },
      { source: '胃炎', target: '多潘立酮', relation: 'has_drug', weight: 1.3 },
      { source: '胃炎', target: '胃镜', relation: 'test_for', weight: 1.4 },

      // 急性胃肠炎相关
      { source: '急性胃肠炎', target: '腹痛', relation: 'has_symptom', weight: 1.5 },
      { source: '急性胃肠炎', target: '腹泻', relation: 'has_symptom', weight: 1.5 },
      { source: '急性胃肠炎', target: '恶心', relation: 'has_symptom', weight: 1.3 },
      { source: '急性胃肠炎', target: '呕吐', relation: 'has_symptom', weight: 1.3 },
      { source: '急性胃肠炎', target: '发热', relation: 'has_symptom', weight: 1.0 },
      { source: '急性胃肠炎', target: '蒙脱石散', relation: 'has_drug', weight: 1.4 },
      { source: '急性胃肠炎', target: '益生菌', relation: 'has_drug', weight: 1.3 },
      { source: '急性胃肠炎', target: '左氧氟沙星', relation: 'has_drug', weight: 1.2 },
      { source: '急性胃肠炎', target: '血常规', relation: 'test_for', weight: 1.2 },
      { source: '急性胃肠炎', target: '便常规', relation: 'test_for', weight: 1.3 },

      // 偏头痛相关
      { source: '偏头痛', target: '头痛', relation: 'has_symptom', weight: 1.5 },
      { source: '偏头痛', target: '头晕', relation: 'has_symptom', weight: 1.2 },
      { source: '偏头痛', target: '恶心', relation: 'has_symptom', weight: 1.1 },
      { source: '偏头痛', target: '布洛芬', relation: 'has_drug', weight: 1.4 },
      { source: '偏头痛', target: '对乙酰氨基酚', relation: 'has_drug', weight: 1.3 },
      { source: '偏头痛', target: '颅脑CT', relation: 'test_for', weight: 1.0 },
      { source: '偏头痛', target: '颅脑MRI', relation: 'test_for', weight: 0.9 },

      // 颈椎病相关
      { source: '颈椎病', target: '颈痛', relation: 'has_symptom', weight: 1.4 },
      { source: '颈椎病', target: '头晕', relation: 'has_symptom', weight: 1.3 },
      { source: '颈椎病', target: '头痛', relation: 'has_symptom', weight: 1.2 },
      { source: '颈椎病', target: '上肢麻木', relation: 'has_symptom', weight: 1.2 },
      { source: '颈椎病', target: '双氯芬酸钠', relation: 'has_drug', weight: 1.3 },
      { source: '颈椎病', target: '布洛芬', relation: 'has_drug', weight: 1.2 },
      { source: '颈椎病', target: '颈椎X线', relation: 'test_for', weight: 1.4 },
      { source: '颈椎病', target: '颈椎MRI', relation: 'test_for', weight: 1.3 },

      // 腰椎间盘突出相关
      { source: '腰椎间盘突出', target: '腰痛', relation: 'has_symptom', weight: 1.5 },
      { source: '腰椎间盘突出', target: '下肢麻木', relation: 'has_symptom', weight: 1.3 },
      { source: '腰椎间盘突出', target: '下肢放射痛', relation: 'has_symptom', weight: 1.4 },
      { source: '腰椎间盘突出', target: '双氯芬酸钠', relation: 'has_drug', weight: 1.3 },
      { source: '腰椎间盘突出', target: '布洛芬', relation: 'has_drug', weight: 1.2 },
      { source: '腰椎间盘突出', target: '腰椎CT', relation: 'test_for', weight: 1.4 },
      { source: '腰椎间盘突出', target: '腰椎MRI', relation: 'test_for', weight: 1.5 },

      // 过敏性鼻炎相关
      { source: '过敏性鼻炎', target: '鼻塞', relation: 'has_symptom', weight: 1.4 },
      { source: '过敏性鼻炎', target: '流涕', relation: 'has_symptom', weight: 1.4 },
      { source: '过敏性鼻炎', target: '打喷嚏', relation: 'has_symptom', weight: 1.3 },
      { source: '过敏性鼻炎', target: '鼻痒', relation: 'has_symptom', weight: 1.3 },
      { source: '过敏性鼻炎', target: '氯雷他定', relation: 'has_drug', weight: 1.5 },
      { source: '过敏性鼻炎', target: '西替利嗪', relation: 'has_drug', weight: 1.5 },
      { source: '过敏性鼻炎', target: '地塞米松', relation: 'has_drug', weight: 1.2 },

      // 湿疹相关
      { source: '湿疹', target: '皮肤瘙痒', relation: 'has_symptom', weight: 1.5 },
      { source: '湿疹', target: '皮疹', relation: 'has_symptom', weight: 1.4 },
      { source: '湿疹', target: '皮肤干燥', relation: 'has_symptom', weight: 1.2 },
      { source: '湿疹', target: '地塞米松', relation: 'has_drug', weight: 1.3 },
      { source: '湿疹', target: '氯雷他定', relation: 'has_drug', weight: 1.2 },

      // 骨质疏松相关
      { source: '骨质疏松', target: '骨痛', relation: 'has_symptom', weight: 1.3 },
      { source: '骨质疏松', target: '易骨折', relation: 'has_symptom', weight: 1.2 },
      { source: '骨质疏松', target: '身高变矮', relation: 'has_symptom', weight: 1.1 },
      { source: '骨质疏松', target: '钙片', relation: 'has_drug', weight: 1.5 },
      { source: '骨质疏松', target: '维生素D', relation: 'has_drug', weight: 1.5 },
      { source: '骨质疏松', target: '骨化三醇', relation: 'has_drug', weight: 1.3 },
      { source: '骨质疏松', target: '骨密度', relation: 'test_for', weight: 1.5 },
    ];

    let relationCount = 0;
    for (const rel of relations) {
      const sourceInfo = keywordMap[rel.source];
      const targetInfo = keywordMap[rel.target];

      if (!sourceInfo || !targetInfo) {
        console.log(`[SKIP] 跳过 ${rel.source} -> ${rel.target} (热词不存在)`);
        continue;
      }

      try {
        await client.query(
          `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (source_type, source_id, target_type, target_id, relation_type)
           DO NOTHING`,
          [sourceInfo.type, sourceInfo.id, targetInfo.type, targetInfo.id, rel.relation, rel.weight]
        );
        relationCount++;
      } catch (err) {
        console.log(`[ERROR] 插入关系失败 ${rel.source} -> ${rel.target}:`, err.message);
      }
    }

    console.log(`[OK] 创建了 ${relationCount} 个知识图谱关系`);

    await client.query('COMMIT');
    console.log('=== 知识图谱数据初始化完成 ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('初始化失败:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedKnowledgeGraph().catch(console.error);