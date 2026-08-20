const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function fixDoctorTable() {
  const client = await pool.connect();

  try {
    console.log('=== 修复医生表 ===');

    // 添加缺失字段
    const fields = [
      { name: 'phone', type: 'VARCHAR(20)', default: "''" },
      { name: 'employee_id', type: 'VARCHAR(50)', default: "''" },
    ];

    for (const field of fields) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'doctors' AND column_name = '${field.name}'
          ) THEN
            ALTER TABLE doctors ADD COLUMN ${field.name} ${field.type} DEFAULT ${field.default};
            RAISE NOTICE '已添加 doctors.${field.name} 字段';
          ELSE
            RAISE NOTICE 'doctors.${field.name} 字段已存在';
          END IF;
        END $$;
      `);
    }

    // 更新医生数据
    const doctors = await client.query('SELECT id, name FROM doctors ORDER BY id');
    const phoneNumbers = ['13800138001', '13800138002', '13800138003', '13800138004', 
                         '13800138005', '13800138006', '13800138007', '13800138008',
                         '13800138009', '13800138010', '13800138011', '13800138012'];
    
    let idx = 0;
    for (const doc of doctors.rows) {
      const employeeId = `D${String(doc.id).padStart(4, '0')}`;
      const phone = phoneNumbers[idx % phoneNumbers.length];
      await client.query('UPDATE doctors SET phone=$1, employee_id=$2 WHERE id=$3', [phone, employeeId, doc.id]);
      idx++;
    }

    console.log(`[OK] 更新了 ${doctors.rows.length} 条医生数据`);

    // 验证
    const updated = await client.query('SELECT id, name, phone, employee_id FROM doctors LIMIT 3');
    console.log('验证结果:');
    updated.rows.forEach(d => console.log(`  ${d.name}: ${d.phone} - ${d.employee_id}`));

  } catch (err) {
    console.error('修复失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDoctorTable();