const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'hisdb', password: '1234', port: 5432 });

const departmentKeywords = {
  1: ['高血压', '糖尿病', '冠心病', '肺炎', '哮喘', '心力衰竭', '心律失常', '心肌梗死', '心绞痛', '慢性阻塞性肺疾病', '胃炎', '胃溃疡', '肠炎', '肾炎', '肝炎', '肝硬化', '胰腺炎', '胆囊炎', '贫血', '白血病'],
  2: ['骨折', '脱位', '关节炎', '颈椎病', '腰椎间盘突出', '肩周炎', '腱鞘炎', '滑膜炎', '痛风', '类风湿关节炎', '骨质疏松', '骨髓炎', '外伤', '烧伤', '冻伤', '肿瘤', '阑尾炎', '胆囊炎', '胆结石'],
  3: ['感冒', '咳嗽', '发热', '头痛', '失眠', '便秘', '腹泻', '消化不良', '疲劳', '乏力', '抑郁', '焦虑', '胃痛', '腰痛', '眩晕', '耳鸣', '脱发', '肥胖', '消瘦'],
  4: ['妊娠', '分娩', '流产', '宫外孕', '子宫肌瘤', '卵巢囊肿', '盆腔炎', '阴道炎', '宫颈炎', '乳腺增生', '乳腺炎', '月经不调', '痛经', '更年期', '不孕', '早产', '羊水过多', '羊水过少'],
  5: ['小儿肺炎', '小儿腹泻', '小儿感冒', '小儿发热', '小儿咳嗽', '小儿哮喘', '小儿湿疹', '小儿贫血', '小儿佝偻病', '小儿多动症', '小儿孤独症', '小儿扁桃体炎', '小儿中耳炎', '小儿手足口病', '小儿麻疹', '小儿水痘', '小儿猩红热', '小儿腮腺炎'],
  6: ['结膜炎', '角膜炎', '白内障', '青光眼', '近视', '远视', '散光', '干眼症', '麦粒肿', '泪囊炎', '视网膜病变', '视神经炎', '斜视', '弱视'],
  7: ['中耳炎', '外耳道炎', '耳鸣', '耳聋', '眩晕', '鼻炎', '鼻窦炎', '咽炎', '喉炎', '扁桃体炎', '声带息肉', '腺样体肥大'],
  8: ['皮肤病', '湿疹', '皮炎', '荨麻疹', '痤疮', '毛囊炎', '疱疹', '癣', '白癜风', '银屑病', '红斑狼疮', '湿疹', '玫瑰糠疹', '药疹'],
  9: ['口腔溃疡', '牙龈炎', '牙周炎', '龋齿', '牙髓炎', '根尖周炎', '智齿', '牙齿松动', '口臭', '口干', '舌炎', '口角炎'],
  10: ['甲亢', '甲减', '甲状腺结节', '糖尿病', '低血糖', '肥胖症', '骨质疏松', '佝偻病', '痛风', '肾上腺疾病', '垂体疾病'],
  11: ['肾炎', '肾病综合征', '尿路感染', '膀胱炎', '前列腺炎', '前列腺增生', '肾结石', '输尿管结石', '膀胱结石', '肾功能衰竭', '尿毒症'],
  12: ['脑出血', '脑梗死', '帕金森病', '癫痫', '头痛', '眩晕', '失眠', '抑郁', '焦虑', '痴呆', '多发性硬化', '脊髓损伤', '神经炎'],
  13: ['心电图', '血常规', '尿常规', '肝功能', '肾功能', '血糖', '血脂', '电解质', '甲状腺功能', '肿瘤标志物', '超声检查', 'CT检查', 'MRI检查'],
  14: ['麻醉', '疼痛', '镇痛', '镇静', '局部麻醉', '全身麻醉', '椎管内麻醉', '神经阻滞'],
  15: ['放射治疗', '化疗', '靶向治疗', '免疫治疗', '肿瘤筛查', '肿瘤诊断', '肿瘤分期']
};

const assignKeywordsToDepartments = async () => {
  try {
    console.log('开始分配热词到科室...');
    
    for (const [deptId, keywords] of Object.entries(departmentKeywords)) {
      const departmentId = parseInt(deptId);
      console.log(`分配科室 ${departmentId} 的热词...`);
      
      for (const keyword of keywords) {
        try {
          const result = await pool.query(
            'UPDATE hot_keywords SET department_id = $1 WHERE keyword = $2 AND department_id IS NULL',
            [departmentId, keyword]
          );
          if (result.rowCount > 0) {
            console.log(`  ✓ ${keyword} -> 科室 ${departmentId}`);
          }
        } catch (err) {
          console.log(`  ✗ ${keyword}: ${err.message}`);
        }
      }
    }
    
    console.log('\n分配完成！');
    
    const stats = await pool.query(
      'SELECT d.name, COUNT(hk.id) as count FROM departments d LEFT JOIN hot_keywords hk ON d.id = hk.department_id GROUP BY d.id, d.name ORDER BY count DESC'
    );
    
    console.log('\n各科室热词统计：');
    stats.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.count} 个热词`);
    });
    
    const commonCount = await pool.query(
      'SELECT COUNT(*) as count FROM hot_keywords WHERE department_id IS NULL'
    );
    console.log(`  公共热词: ${commonCount.rows[0].count} 个`);
    
  } catch (err) {
    console.error('分配失败:', err);
  } finally {
    pool.end();
  }
};

assignKeywordsToDepartments();