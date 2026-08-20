const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function updateShortcuts() {
  try {
    const res1 = await pool.query(
      "UPDATE doctor_shortcuts SET shortcut_value = 'Alt+P' WHERE shortcut_key = 'prev_patient' AND shortcut_value LIKE '%Up%'"
    );
    console.log('prev_patient updated:', res1.rowCount);

    const res2 = await pool.query(
      "UPDATE doctor_shortcuts SET shortcut_value = 'Alt+N' WHERE shortcut_key = 'next_patient' AND shortcut_value LIKE '%Down%'"
    );
    console.log('next_patient updated:', res2.rowCount);

    console.log('=== 快捷键更新完成 ===');
  } catch (err) {
    console.error('更新失败:', err.message);
  } finally {
    await pool.end();
  }
}

updateShortcuts();