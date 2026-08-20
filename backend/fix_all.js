const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: '1234', host: 'localhost', port: 5432, database: 'hisdb' });

async function exec(sql, params = []) {
  try { return await pool.query(sql, params); } catch(e) { return null; }
}

async function fix() {
  console.log('=== STARTING COMPREHENSIVE FIX ===\n');

  // ========================================================
  // STEP 1: Delete schedule-dependent data
  // ========================================================
  console.log('Step 1: Deleting schedule-dependent data...');
  await exec('DELETE FROM prescriptions');
  await exec('DELETE FROM registrations');
  const s = await exec('DELETE FROM schedules');
  console.log(`  Deleted ${s ? s.rowCount : 0} schedules`);

  // ========================================================
  // STEP 2: Clean doctor-dependent data
  // ========================================================
  console.log('\nStep 2: Cleaning doctor-dependent data...');
  await exec('DELETE FROM keyword_usage_logs');
  await exec('DELETE FROM hot_keywords_adjustment_logs');
  await exec('DELETE FROM hot_keyword_adjustments');
  await exec('DELETE FROM doctor_shortcuts');
  await exec('DELETE FROM knowledge_graph_relations');
  await exec("DELETE FROM users WHERE doctor_id > 12");
  console.log('  Cleaned');

  // ========================================================
  // STEP 3: Delete duplicate doctors, restore titles
  // ========================================================
  console.log('\nStep 3: Cleaning doctors...');
  const dd = await exec('DELETE FROM doctors WHERE id > 12');
  console.log(`  Deleted ${dd ? dd.rowCount : 0} extra doctors`);
  await exec("UPDATE doctors SET title='主任医师' WHERE id IN (1,3,7,11)");
  await exec("UPDATE doctors SET title='副主任医师' WHERE id IN (2,5,9,12)");
  await exec("UPDATE doctors SET title='主治医师' WHERE id IN (4,6,8,10)");
  console.log('  Restored titles');

  // ========================================================
  // STEP 4: Delete extra departments
  // ========================================================
  console.log('\nStep 4: Cleaning departments...');
  const dpt = await exec('DELETE FROM departments WHERE id > 8');
  console.log(`  Deleted ${dpt ? dpt.rowCount : 0} extra departments`);

  // ========================================================
  // STEP 5: Reindex hot_keywords
  // ========================================================
  console.log('\nStep 5: Reindexing hot_keywords...');
  const allHK = await pool.query(
    'SELECT id, keyword, keyword_type, department_id, weight, is_top, is_hidden, usage_count, last_used_at, priority, node_type, created_at, updated_at FROM hot_keywords ORDER BY id'
  );
  console.log(`  Found ${allHK.rows.length} hot keywords`);

  await exec('DELETE FROM hot_keywords');
  await exec('ALTER SEQUENCE hot_keywords_id_seq RESTART WITH 1');

  let inserted = 0;
  for (const row of allHK.rows) {
    await pool.query(
      `INSERT INTO hot_keywords (keyword, keyword_type, department_id, weight, is_top, is_hidden, usage_count, last_used_at, priority, node_type, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [row.keyword, row.keyword_type, row.department_id, row.weight, row.is_top, row.is_hidden,
       row.usage_count || 0, row.last_used_at, row.priority || 0, row.node_type, row.created_at, row.updated_at]
    );
    inserted++;
  }
  console.log(`  Re-inserted ${inserted} hot keywords (IDs 1..${inserted})`);
  await exec(`ALTER SEQUENCE hot_keywords_id_seq RESTART WITH ${inserted + 1}`);

  // ========================================================
  // STEP 6: Generate schedules through July 3
  // ========================================================
  console.log('\nStep 6: Generating schedules through 2026-07-03...');
  
  const docs = await pool.query(
    "SELECT d.id, d.name, d.title, d.department_id, d.fee, dept.name as dept_name FROM doctors d JOIN departments dept ON d.department_id = dept.id WHERE d.is_inpatient = false AND dept.name NOT IN ('检验科', '影像科') AND d.title IN ('主治医师', '副主任医师', '主任医师') ORDER BY d.department_id, d.id"
  );
  console.log(`  ${docs.rows.length} outpatient doctors (excluding lab/radiology)`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(2026, 6, 3);
  endDate.setHours(23, 59, 59, 999);

  const mulberry32 = (s) => {
    return () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  let scheduleCount = 0;
  for (const doc of docs.rows) {
    const rng = mulberry32(doc.id * 12345);
    
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const ds = `${year}-${month}-${day}`;

      // AM
      const amTotal = 15 + Math.floor(rng() * 5);
      const amRemaining = Math.max(8, Math.floor(amTotal * (0.6 + rng() * 0.3)));
      const amFee = doc.title === '主任医师' ? 50 : (doc.title === '副主任医师' ? 35 : 25);
      await pool.query(
        `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, reserved, reserved_emergency, reserved_vip)
         VALUES ($1,$2,'am',$3,$4,'normal',$5,0,0,0)`,
        [doc.id, ds, amTotal, amRemaining, amFee]
      );
      scheduleCount++;

      // PM
      const pmTotal = 12 + Math.floor(rng() * 4);
      const pmRemaining = Math.max(6, Math.floor(pmTotal * (0.6 + rng() * 0.3)));
      const pmFee = doc.title === '主任医师' ? 50 : (doc.title === '副主任医师' ? 35 : 25);
      await pool.query(
        `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, reserved, reserved_emergency, reserved_vip)
         VALUES ($1,$2,'pm',$3,$4,'normal',$5,0,0,0)`,
        [doc.id, ds, pmTotal, pmRemaining, pmFee]
      );
      scheduleCount++;
    }
  }
  console.log(`  Generated ${scheduleCount} schedule records`);

  // ========================================================
  // VERIFY
  // ========================================================
  const vHK = await pool.query('SELECT MIN(id) as mn, MAX(id) as mx, COUNT(*) as cnt FROM hot_keywords');
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Hot Keywords: ${vHK.rows[0].cnt}, IDs ${vHK.rows[0].mn}-${vHK.rows[0].mx}`);

  const vDoc = await pool.query("SELECT id, name, title, department_id FROM doctors ORDER BY id");
  console.log(`\nDoctors (${vDoc.rows.length}):`);
  vDoc.rows.forEach(r => console.log(`  ${r.id} ${r.name} ${r.title} (dept ${r.department_id})`));

  const vSched = await pool.query(
    "SELECT COUNT(*) as cnt, SUM(total) as t, SUM(remaining) as r FROM schedules WHERE schedule_date = CURRENT_DATE"
  );
  console.log(`\nToday's Schedules: ${vSched.rows[0].cnt}, Total: ${vSched.rows[0].t}, Remaining: ${vSched.rows[0].r}`);

  const vIM = await pool.query(
    "SELECT COUNT(*) as cnt, SUM(total) as t, SUM(remaining) as r FROM schedules WHERE schedule_date = CURRENT_DATE AND doctor_id IN (SELECT id FROM doctors WHERE department_id=1)"
  );
  console.log(`Internal Medicine Today: ${vIM.rows[0].cnt}, Total: ${vIM.rows[0].t}, Remaining: ${vIM.rows[0].r}`);

  // Check schedule count through July 3
  const vJuly = await pool.query(
    "SELECT COUNT(*) as cnt FROM schedules WHERE schedule_date = '2026-07-03'"
  );
  console.log(`July 3 Schedules: ${vJuly.rows[0].cnt}`);

  console.log('\nALL FIXES COMPLETED');
  await pool.end();
}
fix().catch(e => { console.error('FAILED:', e.message); pool.end(); });
