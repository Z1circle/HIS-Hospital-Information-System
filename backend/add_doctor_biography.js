const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432
});

(async () => {
  try {
    await pool.query('ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS biography TEXT DEFAULT \'\'');
    console.log('已确保 doctors 表有 biography 字段');
    
    const sampleBiographies = {
      1: '主任医师，从事内科临床工作20余年，擅长呼吸系统疾病、心血管疾病的诊治，发表论文30余篇，具有丰富的临床经验。',
      2: '副主任医师，毕业于北京医科大学，擅长消化系统疾病诊治，尤其在胃肠镜检查和治疗方面有较高造诣。',
      3: '主任医师，医学博士，擅长内分泌代谢疾病，特别是糖尿病、甲状腺疾病的个体化治疗。',
      4: '副主任医师，从事外科临床工作15年，擅长普外科常见疾病的手术治疗，手术技艺精湛。',
      5: '主任医师，妇产科专家，擅长妇科肿瘤、不孕症诊治，在围产期保健方面有丰富经验。',
      6: '副主任医师，儿科专家，擅长小儿呼吸系统疾病、小儿传染病的诊治，深受患儿家长信赖。'
    };
    
    for (const [id, bio] of Object.entries(sampleBiographies)) {
      await pool.query('UPDATE doctors SET biography = $1 WHERE id = $2', [bio, id]);
      console.log(`已为医生ID ${id} 设置简介`);
    }
    
    await pool.end();
    console.log('完成！');
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
})();