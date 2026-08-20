const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'hisdb', password: '1234', port: 5432 });

(async () => {
  try {
    // 修复已有患者的 birth_date（测试患者王五, 28岁）
    const birthDate = new Date(2026 - 28, 0, 1); // 1998-01-01
    await p.query("UPDATE patients SET birth_date = $1 WHERE id = 13 AND birth_date IS NULL", [birthDate]);
    console.log('已更新患者王五的出生日期:', birthDate.toISOString().slice(0, 10));
    
    // 验证
    const r = await p.query("SELECT name, gender, EXTRACT(YEAR FROM AGE(birth_date)) as age FROM patients WHERE id = 13");
    console.log('验证:', r.rows);
    
    await p.end();
  } catch (e) {
    console.error('错误:', e.message);
    await p.end();
  }
})();
