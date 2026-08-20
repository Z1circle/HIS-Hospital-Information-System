const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', password: '1234', host: 'localhost', database: 'hisdb' });
(async () => {
  // 删除中文格式记录（如果对应的英文格式记录已存在）
  const del1 = await p.query(`
    DELETE FROM schedules s1
    WHERE s1.am_pm = '上午'
    AND EXISTS (
      SELECT 1 FROM schedules s2
      WHERE s2.doctor_id = s1.doctor_id
      AND s2.schedule_date = s1.schedule_date
      AND s2.am_pm = 'am'
    )
  `);
  console.log('Deleted 上午 (duplicate with am):', del1.rowCount);

  const del2 = await p.query(`
    DELETE FROM schedules s1
    WHERE s1.am_pm = '下午'
    AND EXISTS (
      SELECT 1 FROM schedules s2
      WHERE s2.doctor_id = s1.doctor_id
      AND s2.schedule_date = s1.schedule_date
      AND s2.am_pm = 'pm'
    )
  `);
  console.log('Deleted 下午 (duplicate with pm):', del2.rowCount);

  // 将剩余的中文 am_pm 格式更新为英文格式
  const upd1 = await p.query("UPDATE schedules SET am_pm='am' WHERE am_pm='上午'");
  console.log('Updated 上午 -> am:', upd1.rowCount);
  const upd2 = await p.query("UPDATE schedules SET am_pm='pm' WHERE am_pm='下午'");
  console.log('Updated 下午 -> pm:', upd2.rowCount);

  // 检查是否还有重复
  const dup = await p.query('SELECT doctor_id, schedule_date, am_pm, COUNT(*) FROM schedules GROUP BY doctor_id, schedule_date, am_pm HAVING COUNT(*) > 1');
  console.log('Remaining duplicates:', JSON.stringify(dup.rows));

  // 统计总数
  const total = await p.query('SELECT COUNT(*) FROM schedules');
  console.log('Total schedules:', total.rows[0].count);

  await p.end();
})();
