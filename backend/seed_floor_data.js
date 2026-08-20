// ═══════════════════════════════════════════════════════
//  医院楼层地图种子数据 - Plan A 对称分区布局
// ═══════════════════════════════════════════════════════
//
//  SVG viewBox: 0 0 100 78  建筑区域: x=2~98, y=2~76
//
//  走廊系统:
//    主走廊 H: x=4~96, y=35.5~40.5  (水平)
//    主走廊 V: x=47.5~52.5, y=4~74  (垂直)
//    次级走廊 H上: x=4~47.5, y=20~23
//    次级走廊 H下: x=52.5~96, y=52~55
//
//  分区:
//    NW-top (5-47, 4-19.5)    NW-mid (5-47, 24-35)
//    NE-top (53-96, 4-19.5)   NE-mid (53-96, 24-35)
//    SW (5-47, 41-74)          SE-top (53-96, 41-51)
//                              SE-bot (53-96, 56-74)
//
//  设施标准位: 电梯(49.5,38) 楼梯(49.5,42.5)
// ═══════════════════════════════════════════════════════

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432,
});

async function seedData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM floor_facilities');
    await client.query('DELETE FROM floor_departments');
    await client.query('DELETE FROM floors');

    const floors = [
      { floor_name: '地下1层', floor_code: 'B1', description: '停车场、设备间、食堂', sort_order: 0 },
      { floor_name: '1层', floor_code: 'F1', description: '门诊大厅、挂号处、药房、急诊科', sort_order: 1 },
      { floor_name: '2层', floor_code: 'F2', description: '内科、外科、妇产科、儿科', sort_order: 2 },
      { floor_name: '3层', floor_code: 'F3', description: '检验科、影像科、眼科、耳鼻喉科', sort_order: 3 },
      { floor_name: '4层', floor_code: 'F4', description: '手术室、ICU、住院部', sort_order: 4 },
    ];

    const floorIds = {};
    for (const floor of floors) {
      const res = await client.query(
        'INSERT INTO floors (floor_name, floor_code, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [floor.floor_name, floor.floor_code, floor.description, floor.sort_order]
      );
      floorIds[floor.floor_code] = res.rows[0].id;
      console.log(`[OK] 楼层 ${floor.floor_name} 已添加`);
    }

    // ═══ B1层 设施 ═══
    const b1Facilities = [
      { facility_type: 'elevator', name: '电梯', x_pos: 49.5, y_pos: 38, description: 'B1层电梯' },
      { facility_type: 'stairs', name: '楼梯', x_pos: 49.5, y_pos: 42.5, description: '安全楼梯' },
      { facility_type: 'canteen', name: '职工食堂', x_pos: 70, y_pos: 30, description: '职工餐厅' },
      { facility_type: 'toilet', name: '卫生间', x_pos: 85, y_pos: 65, description: '公共卫生间' },
    ];

    for (const f of b1Facilities) {
      await client.query(
        'INSERT INTO floor_facilities (floor_id, facility_type, name, x_pos, y_pos, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [floorIds['B1'], f.facility_type, f.name, f.x_pos, f.y_pos, f.description]
      );
    }

    // 获取科室ID
    const deptRes = await client.query('SELECT id, name FROM departments');
    const deptIds = {};
    deptRes.rows.forEach(d => { deptIds[d.name] = d.id; });

    // 添加特殊科室
    const specialDepts = ['急诊科', '挂号处', '药房', '手术室', 'ICU', '住院部'];
    for (const name of specialDepts) {
      if (!deptIds[name]) {
        const res = await client.query(
          'INSERT INTO departments (name, icon, fee, description) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, '', 0, '']
        );
        deptIds[name] = res.rows[0].id;
      }
    }

    // ═══ F1 1层 - 门诊大厅 ═══
    // ┌──────────────┬────┬──────────┐
    // │ 急诊科       │ V  │ 挂号处    │
    // │ (6,5)18x13.5│ 走 │ (55,5)   │
    // │             │ 廊 │ 10x7     │
    // │             │    │ 药房      │
    // │             │    │ (69,5)   │
    // └──────────────┴────┴──────────┘
    const f1Depts = [
      { dept_name: '急诊科', department_type: 'emergency', x_pos: 6, y_pos: 5, width: 18, height: 13.5, room_number: 'E001', phone: '010-12345678', is_open: true },
      { dept_name: '挂号处', department_type: 'service', x_pos: 55, y_pos: 5, width: 10, height: 7, room_number: 'R001', phone: '010-12345679', is_open: true },
      { dept_name: '药房', department_type: 'pharmacy', x_pos: 69, y_pos: 5, width: 12, height: 7, room_number: 'P001', phone: '010-12345680', is_open: true },
    ];

    for (const d of f1Depts) {
      const deptId = deptIds[d.dept_name] || null;
      await client.query(
        'INSERT INTO floor_departments (floor_id, department_id, x_pos, y_pos, width, height, room_number, phone, is_open, department_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [floorIds['F1'], deptId, d.x_pos, d.y_pos, d.width, d.height, d.room_number, d.phone, d.is_open, d.department_type]
      );
    }

    const f1Facilities = [
      { facility_type: 'entrance', name: '主入口', x_pos: 50, y_pos: 3.5, description: '医院主入口' },
      { facility_type: 'information', name: '服务台', x_pos: 49.5, y_pos: 28, description: '咨询服务台' },
      { facility_type: 'elevator', name: '电梯', x_pos: 49.5, y_pos: 38, description: 'F1层电梯' },
      { facility_type: 'stairs', name: '楼梯', x_pos: 49.5, y_pos: 42.5, description: '安全楼梯' },
      { facility_type: 'toilet', name: '卫生间', x_pos: 85, y_pos: 42, description: '公共卫生间' },
      { facility_type: 'atm', name: 'ATM机', x_pos: 10, y_pos: 65, description: '自动取款机' },
    ];

    for (const f of f1Facilities) {
      await client.query(
        'INSERT INTO floor_facilities (floor_id, facility_type, name, x_pos, y_pos, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [floorIds['F1'], f.facility_type, f.name, f.x_pos, f.y_pos, f.description]
      );
    }

    // ═══ F2 2层 - 内科/外科/妇产科/儿科 ═══
    // ┌──────────────┬────┬──────────┐
    // │ 内科         │ V  │ 外科     │
    // │ (6,5)18x13.5│ 走 │ (55,5)  │
    // ├──────────────┤ 廊 │ 18x13.5 │
    // │ 妇产科        │    ├──────────┤
    // │ (6,24.5)18x10│    │ 儿科     │
    // │              │    │(55,24.5)│
    // └──────────────┴────┴──────────┘
    const f2Depts = [
      { dept_name: '内科', department_type: 'internal', x_pos: 6, y_pos: 5, width: 18, height: 13.5, room_number: 'I001', phone: '010-12345681', is_open: true },
      { dept_name: '外科', department_type: 'surgery', x_pos: 55, y_pos: 5, width: 18, height: 13.5, room_number: 'S001', phone: '010-12345682', is_open: true },
      { dept_name: '妇产科', department_type: 'obstetrics', x_pos: 6, y_pos: 24.5, width: 18, height: 10, room_number: 'O001', phone: '010-12345683', is_open: true },
      { dept_name: '儿科', department_type: 'pediatrics', x_pos: 55, y_pos: 24.5, width: 12, height: 10, room_number: 'P002', phone: '010-12345684', is_open: true },
    ];

    for (const d of f2Depts) {
      const deptId = deptIds[d.dept_name] || null;
      await client.query(
        'INSERT INTO floor_departments (floor_id, department_id, x_pos, y_pos, width, height, room_number, phone, is_open, department_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [floorIds['F2'], deptId, d.x_pos, d.y_pos, d.width, d.height, d.room_number, d.phone, d.is_open, d.department_type]
      );
    }

    const f2Facilities = [
      { facility_type: 'elevator', name: '电梯', x_pos: 49.5, y_pos: 38, description: 'F2层电梯' },
      { facility_type: 'stairs', name: '楼梯', x_pos: 49.5, y_pos: 42.5, description: '安全楼梯' },
      { facility_type: 'water', name: '饮水处', x_pos: 30, y_pos: 42, description: '直饮水处' },
    ];

    for (const f of f2Facilities) {
      await client.query(
        'INSERT INTO floor_facilities (floor_id, facility_type, name, x_pos, y_pos, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [floorIds['F2'], f.facility_type, f.name, f.x_pos, f.y_pos, f.description]
      );
    }

    // ═══ F3 3层 - 检验/影像/眼科/耳鼻喉/皮肤科 ═══
    // ┌──────────────┬────┬──────────┐
    // │ 检验科        │ V  │ 影像科   │
    // │ (6,5)18x13.5 │ 走 │ (55,5)  │
    // ├──────┬───────┤ 廊 │ 16x13.5 │
    // │ 眼科 │耳鼻喉科│    ├──────────┤
    // │(6,   │(16.5,│    │ 皮肤科   │
    // │24.5) │24.5) │    │(55,24.5)│
    // │9x10  │12x10 │    │ 12x10   │
    // └──────┴───────┴────┴──────────┘
    const f3Depts = [
      { dept_name: '检验科', department_type: 'laboratory', x_pos: 6, y_pos: 5, width: 18, height: 13.5, room_number: 'L001', phone: '010-12345685', is_open: true },
      { dept_name: '影像科', department_type: 'radiology', x_pos: 55, y_pos: 5, width: 16, height: 13.5, room_number: 'R002', phone: '010-12345686', is_open: true },
      { dept_name: '眼科', department_type: 'ophthalmology', x_pos: 6, y_pos: 24.5, width: 9, height: 10, room_number: 'O002', phone: '010-12345687', is_open: true },
      { dept_name: '耳鼻喉科', department_type: 'ent', x_pos: 16.5, y_pos: 24.5, width: 12, height: 10, room_number: 'E002', phone: '010-12345688', is_open: true },
      { dept_name: '皮肤科', department_type: 'dermatology', x_pos: 55, y_pos: 24.5, width: 12, height: 10, room_number: 'D001', phone: '010-12345689', is_open: true },
    ];

    for (const d of f3Depts) {
      const deptId = deptIds[d.dept_name] || null;
      await client.query(
        'INSERT INTO floor_departments (floor_id, department_id, x_pos, y_pos, width, height, room_number, phone, is_open, department_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [floorIds['F3'], deptId, d.x_pos, d.y_pos, d.width, d.height, d.room_number, d.phone, d.is_open, d.department_type]
      );
    }

    const f3Facilities = [
      { facility_type: 'elevator', name: '电梯', x_pos: 49.5, y_pos: 38, description: 'F3层电梯' },
      { facility_type: 'stairs', name: '楼梯', x_pos: 49.5, y_pos: 42.5, description: '安全楼梯' },
    ];

    for (const f of f3Facilities) {
      await client.query(
        'INSERT INTO floor_facilities (floor_id, facility_type, name, x_pos, y_pos, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [floorIds['F3'], f.facility_type, f.name, f.x_pos, f.y_pos, f.description]
      );
    }

    // ═══ F4 4层 - 手术室/ICU/住院部 ═══
    // ┌──────────────┬────┬──────────┐
    // │ 手术室        │ V  │ ICU      │
    // │ (5,5)20x13.5 │ 走 │ (56,5)  │
    // ├──────────────┤ 廊 │ 20x13.5 │
    // │              │    ├──────────┤
    // │ 住 院 部     │    │          │
    // │ (5,42)40x30 │    │          │
    // │              │    │          │
    // └──────────────┴────┴──────────┘
    const f4Depts = [
      { dept_name: '手术室', department_type: 'operation', x_pos: 5, y_pos: 5, width: 20, height: 13.5, room_number: 'OR01', phone: '010-12345690', is_open: true },
      { dept_name: 'ICU', department_type: 'icu', x_pos: 56, y_pos: 5, width: 20, height: 13.5, room_number: 'ICU01', phone: '010-12345691', is_open: true },
      { dept_name: '住院部', department_type: 'inpatient', x_pos: 5, y_pos: 42, width: 40, height: 30, room_number: 'W001', phone: '010-12345692', is_open: true },
    ];

    for (const d of f4Depts) {
      const deptId = deptIds[d.dept_name] || null;
      await client.query(
        'INSERT INTO floor_departments (floor_id, department_id, x_pos, y_pos, width, height, room_number, phone, is_open, department_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [floorIds['F4'], deptId, d.x_pos, d.y_pos, d.width, d.height, d.room_number, d.phone, d.is_open, d.department_type]
      );
    }

    const f4Facilities = [
      { facility_type: 'elevator', name: '电梯', x_pos: 49.5, y_pos: 38, description: 'F4层电梯' },
      { facility_type: 'stairs', name: '楼梯', x_pos: 49.5, y_pos: 42.5, description: '安全楼梯' },
      { facility_type: 'nurse', name: '护士站', x_pos: 80, y_pos: 60, description: '住院部护士站' },
    ];

    for (const f of f4Facilities) {
      await client.query(
        'INSERT INTO floor_facilities (floor_id, facility_type, name, x_pos, y_pos, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [floorIds['F4'], f.facility_type, f.name, f.x_pos, f.y_pos, f.description]
      );
    }

    await client.query('COMMIT');
    console.log('\n=== 楼层数据初始化完成 (Plan A 对称分区布局) ===');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('初始化数据失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
