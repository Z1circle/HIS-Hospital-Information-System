// ═══════════════════════════════════════════════════════
//  医院楼层地图 - Plan A 对称分区布局
// ═══════════════════════════════════════════════════════
//
//  SVG viewBox: 0 0 100 78  建筑区域: x=2~98, y=2~76
//
//  走廊系统 (固定基础设施):
//    主走廊 H: x=4~96, y=35.5~40.5 (水平, 高5)
//    主走廊 V: x=47.5~52.5, y=4~74 (垂直, 宽5)
//    次级走廊 H上: x=4~47.5, y=20~23 (水平, 高3)
//    次级走廊 H下: x=52.5~96, y=52~55 (水平, 高3)
//
//  有效分区 (含安全边距):
//    NW-top : x 5~47   y 4~19.5    (门诊区)
//    NW-mid : x 5~47   y 24~35     (门诊区)
//    NE-top : x 53~96  y 4~19.5    (检验区)
//    NE-mid : x 53~96  y 24~35     (检验区)
//    SW     : x 5~47   y 41~74     (住院区)
//    SE-top : x 53~96  y 41~51     (住院区)
//    SE-bot : x 53~96  y 56~74     (住院区)
//
//  设施标准位:
//    电梯 (49.5, 38)  — 走廊交叉口中心
//    楼梯 (49.5, 42.5) — 垂直走廊下方，不与电梯重合
// ═══════════════════════════════════════════════════════

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function fixLayout() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('═══ 开始修复科室布局 ═══\n');

    // ─── F1 (1层·门诊大厅) ───
    console.log('[F1] 1层 - 门诊大厅');
    // 科室
    await client.query(`UPDATE floor_departments SET x_pos=6, y_pos=5, width=18, height=13.5 WHERE id=31`);
    console.log('  急诊科: (6,5) 18×13.5  [NW-top]');

    await client.query(`UPDATE floor_departments SET x_pos=55, y_pos=5, width=10, height=7 WHERE id=32`);
    console.log('  挂号处: (55,5) 10×7     [NE-top左]');

    await client.query(`UPDATE floor_departments SET x_pos=69, y_pos=5, width=12, height=7 WHERE id=33`);
    console.log('  药房:   (69,5) 12×7     [NE-top右]');

    // 设施 — 彻底解决重合问题
    await client.query(`UPDATE floor_facilities SET x_pos=50, y_pos=3.5 WHERE id=50`);   // 主入口 → 顶部正中
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=28 WHERE id=53`); // 服务台 → 大厅中央, 靠近走廊
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=38 WHERE id=51`); // 电梯 → 走廊交叉口
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=42.5 WHERE id=52`); // 楼梯 → 电梯下方, 唯一
    await client.query(`UPDATE floor_facilities SET x_pos=85, y_pos=42 WHERE id=54`);   // 卫生间
    await client.query(`UPDATE floor_facilities SET x_pos=10, y_pos=65 WHERE id=55`);   // ATM
    console.log('  设施: 电梯(49.5,38) / 楼梯(49.5,42.5) ✓不再重合\n');

    // ─── F2 (2层·内科/外科/妇产科/儿科) ───
    console.log('[F2] 2层 - 内科/外科/妇产科/儿科');
    await client.query(`UPDATE floor_departments SET x_pos=6, y_pos=5, width=18, height=13.5 WHERE id=34`);
    console.log('  内科:   (6,5) 18×13.5  [NW-top]');

    await client.query(`UPDATE floor_departments SET x_pos=55, y_pos=5, width=18, height=13.5 WHERE id=35`);
    console.log('  外科:   (55,5) 18×13.5 [NE-top]');

    await client.query(`UPDATE floor_departments SET x_pos=6, y_pos=24.5, width=18, height=10 WHERE id=36`);
    console.log('  妇产科: (6,24.5) 18×10  [NW-mid]');

    await client.query(`UPDATE floor_departments SET x_pos=55, y_pos=24.5, width=12, height=10 WHERE id=37`);
    console.log('  儿科:   (55,24.5) 12×10  [NE-mid]');

    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=38 WHERE id=56`);
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=42.5 WHERE id=57`);
    await client.query(`UPDATE floor_facilities SET x_pos=85, y_pos=42 WHERE id=58`);
    await client.query(`UPDATE floor_facilities SET x_pos=30, y_pos=42 WHERE id=59`);
    console.log('  设施: 电梯(49.5,38) / 楼梯(49.5,42.5) / 卫生间(85,42) / 饮水处(30,42)\n');

    // ─── F3 (3层·检验/影像/眼科/耳鼻喉/皮肤) ───
    console.log('[F3] 3层 - 检验科/影像科/眼科/耳鼻喉科/皮肤科');
    await client.query(`UPDATE floor_departments SET x_pos=6, y_pos=5, width=18, height=13.5 WHERE id=38`);
    console.log('  检验科: (6,5) 18×13.5    [NW-top]');

    await client.query(`UPDATE floor_departments SET x_pos=55, y_pos=5, width=16, height=13.5 WHERE id=39`);
    console.log('  影像科: (55,5) 16×13.5    [NE-top]');

    await client.query(`UPDATE floor_departments SET x_pos=6, y_pos=24.5, width=9, height=10 WHERE id=40`);
    console.log('  眼科:   (6,24.5) 9×10     [NW-mid左]');

    await client.query(`UPDATE floor_departments SET x_pos=16.5, y_pos=24.5, width=12, height=10 WHERE id=41`);
    console.log('  耳鼻喉: (16.5,24.5) 12×10 [NW-mid右]');

    await client.query(`UPDATE floor_departments SET x_pos=55, y_pos=24.5, width=12, height=10 WHERE id=42`);
    console.log('  皮肤科: (55,24.5) 12×10   [NE-mid]');

    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=38 WHERE id=60`);
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=42.5 WHERE id=61`);
    await client.query(`UPDATE floor_facilities SET x_pos=85, y_pos=42 WHERE id=62`);
    console.log('  设施: 电梯(49.5,38) / 楼梯(49.5,42.5) / 卫生间(85,42)\n');

    // ─── F4 (4层·手术室/ICU/住院部) ───
    console.log('[F4] 4层 - 手术室/ICU/住院部');
    await client.query(`UPDATE floor_departments SET x_pos=5, y_pos=5, width=20, height=13.5 WHERE id=43`);
    console.log('  手术室: (5,5) 20×13.5   [NW-top]');

    await client.query(`UPDATE floor_departments SET x_pos=56, y_pos=5, width=20, height=13.5 WHERE id=44`);
    console.log('  ICU:    (56,5) 20×13.5   [NE-top]');

    await client.query(`UPDATE floor_departments SET x_pos=5, y_pos=42, width=40, height=30 WHERE id=45`);
    console.log('  住院部: (5,42) 40×30     [SW全区域]');

    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=38 WHERE id=63`);
    await client.query(`UPDATE floor_facilities SET x_pos=49.5, y_pos=42.5 WHERE id=64`);
    await client.query(`UPDATE floor_facilities SET x_pos=85, y_pos=42 WHERE id=65`);
    await client.query(`UPDATE floor_facilities SET x_pos=80, y_pos=60 WHERE id=66`);  // 护士站 → 住院部附近
    console.log('  设施: 电梯(49.5,38) / 楼梯(49.5,42.5) / 卫生间(85,42) / 护士站(80,60)\n');

    await client.query('COMMIT');
    console.log('═══ 布局修复完成 ✓ ═══');
    console.log('所有科室不再占用走廊，设施定位点唯一无重合。');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('修复失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixLayout();
