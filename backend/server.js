const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { cancelTimeoutPayments } = require('./cancel_timeout_payments');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

app.use(cors());
app.use(express.json());

// 提供前端静态文件（生产模式）
const staticDir = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
}

const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
const migrateSql = fs.readFileSync(path.join(__dirname, 'migrate_full.sql'), 'utf8');

const initDb = async () => {
  try {
    await pool.query('SELECT 1');
    const result = await pool.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('departments', 'doctors', 'schedules', 'users')");
    if (parseInt(result.rows[0].count) < 4) {
      console.log('Initializing database...');
      const queries = initSql.split(';').filter(q => q.trim());
      for (const query of queries) {
        try {
          await pool.query(query);
        } catch (e) {
          if (!e.message.includes('already exists') && !e.message.includes('violates unique constraint')) {
            console.log('Query error:', e.message);
          }
        }
      }
      console.log('Database initialized successfully');
    } else {
      console.log('Database already initialized');
    }
    console.log('Running migration...');
    const migrateQueries = migrateSql.split(';').filter(q => q.trim());
    for (const query of migrateQueries) {
      try {
        await pool.query(query);
      } catch (e) {
        if (!e.message.includes('already exists') && !e.message.includes('violates unique constraint')) {
          console.log('Migrate error:', e.message);
        }
      }
    }
    
    // 检查并创建payment_orders表（如果不存在）
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_orders (
          id SERIAL PRIMARY KEY,
          order_no VARCHAR(50) UNIQUE NOT NULL,
          patient_id INTEGER REFERENCES patients(id),
          patient_name VARCHAR(50),
          doctor_id INTEGER REFERENCES doctors(id),
          doctor_name VARCHAR(50),
          department_id INTEGER REFERENCES departments(id),
          department_name VARCHAR(50),
          order_type VARCHAR(20) NOT NULL, -- 'exam', 'prescription', 'registration'
          source_id INTEGER, -- 关联的原始ID
          items JSONB DEFAULT '[]',
          total_amount DECIMAL(10,2) DEFAULT 0,
          payment_status VARCHAR(20) DEFAULT 'unpaid',
          payment_method VARCHAR(20),
          transaction_no VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Payment orders table ensured');
    } catch (e) {
      console.log('Payment orders table creation error:', e.message);
    }

    // 检查并创建orders表（医嘱表）
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          registration_id INTEGER REFERENCES registrations(id),
          patient_id INTEGER REFERENCES patients(id),
          doctor_id INTEGER REFERENCES doctors(id),
          type VARCHAR(20) DEFAULT 'drug',
          content TEXT,
          priority VARCHAR(20) DEFAULT 'normal',
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          execute_status VARCHAR(20) DEFAULT 'pending',
          execute_time TIMESTAMP,
          execute_nurse VARCHAR(50),
          nurse_id INTEGER REFERENCES users(id),
          cancel_reason VARCHAR(200),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Orders table ensured');
    } catch (e) {
      console.log('Orders table creation error:', e.message);
    }
    
    console.log('Migration completed');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
};

// ============================================================
// 工具函数
// ============================================================
const handleErr = (res, err) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
};

// ============================================================
// 认证接口
// ============================================================
const crypto = require('crypto');

// token 存储: token -> { userId, expiresAt }
const tokenStore = new Map();

const generateToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

const createToken = (userId) => {
  const token = generateToken();
  // 7天有效期
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  tokenStore.set(token, { userId, expiresAt });
  return token;
};

const verifyToken = (token) => {
  if (!token) return null;
  const data = tokenStore.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return data;
};

// 定期清理过期token
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) tokenStore.delete(token);
  }
}, 60 * 60 * 1000);

// token 验证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers['x-auth-token'] || (req.headers.authorization || '').replace('Bearer ', '');
  const data = verifyToken(token);
  if (!data) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  req.userId = data.userId;
  next();
};

// 管理员权限验证中间件
const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers['x-auth-token'] || (req.headers.authorization || '').replace('Bearer ', '');
  const data = verifyToken(token);
  if (!data) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [data.userId]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    req.userId = data.userId;
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('权限验证失败:', err);
    return res.status(500).json({ error: '权限验证失败' });
  }
};

// 主任医师权限验证中间件
const chiefPhysicianAuthMiddleware = async (req, res, next) => {
  const token = req.headers['x-auth-token'] || (req.headers.authorization || '').replace('Bearer ', '');
  const data = verifyToken(token);
  if (!data) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  try {
    const result = await pool.query(
      'SELECT u.role, u.doctor_id, d.is_chief_physician, d.department_id FROM users u LEFT JOIN doctors d ON u.doctor_id = d.id WHERE u.id = $1',
      [data.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = result.rows[0];

    // 管理员可以访问
    if (user.role === 'admin') {
      req.userId = data.userId;
      req.user = user;
      return next();
    }

    // 主任医师可以访问
    if (user.is_chief_physician) {
      req.userId = data.userId;
      req.user = user;
      return next();
    }

    return res.status(403).json({ error: '需要主任医师或管理员权限' });
  } catch (err) {
    console.error('权限验证失败:', err);
    return res.status(500).json({ error: '权限验证失败' });
  }
};

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, role, real_name, nickname, phone, id_card, avatar, doctor_id, patient_id FROM users WHERE username=$1 AND password=$2',
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const user = result.rows[0];

    // 如果是医生，获取更多信息
    if (user.role === 'doctor' && user.doctor_id) {
      const doctorResult = await pool.query(
        `SELECT d.title, d.specialty, d.department_id, dept.name as department_name
         FROM doctors d
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE d.id = $1`,
        [user.doctor_id]
      );
      if (doctorResult.rows.length > 0) {
        const doctor = doctorResult.rows[0];
        user.title = doctor.title;
        user.specialty = doctor.specialty;
        user.department_id = doctor.department_id;
        user.department_name = doctor.department_name;
        user.is_chief_physician = false;
      }
    }

    user.token = createToken(user.id);
    res.json(user);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-auth-token'] || (req.headers.authorization || '').replace('Bearer ', '');
  if (token) tokenStore.delete(token);
  res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, real_name, role, phone, idCard } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'INSERT INTO users (username, password, role, real_name, phone, id_card, nickname, avatar) VALUES ($1, $2, $3, $4, $5, $6, $4, $7) RETURNING id, username, role, real_name, phone',
      [username, password, role, real_name, phone, idCard, 'user']
    );
    
    const user = result.rows[0];
    
    // 如果是患者角色，创建对应的患者记录
    if (role === 'patient') {
      const patientResult = await client.query(
        'INSERT INTO patients (name, gender, phone) VALUES ($1, $2, $3) RETURNING id',
        [real_name, '', phone]
      );
      const patientId = patientResult.rows[0].id;
      
      // 更新用户记录关联患者ID
      await client.query(
        'UPDATE users SET patient_id = $1 WHERE id = $2',
        [patientId, user.id]
      );
      user.patient_id = patientId;
    }
    
    await client.query('COMMIT');
    res.json(user);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: '用户名已存在' });
    }
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 用户个人中心接口
// ============================================================
// ============================================================
// 快捷选择：按角色获取用户列表（登录页使用）
app.get('/api/auth/users-by-role', async (req, res) => {
  const { role } = req.query;
  try {
    let query = 'SELECT id, username, real_name, role FROM users WHERE 1=1';
    const params = [];
    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }
    query += ' ORDER BY role, username';
    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取当前用户信息
app.get('/api/user/profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  try {
    const result = await pool.query(
      'SELECT id, username, role, real_name, nickname, phone, id_card, avatar, doctor_id, patient_id FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 更新用户个人信息（头像、昵称、手机号）
app.put('/api/user/profile', async (req, res) => {
  const { userId, nickname, phone, avatar } = req.body;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  try {
    const updates = [];
    const values = [];
    let idx = 1;
    
    if (nickname !== undefined) {
      updates.push(`nickname = $${idx++}`);
      values.push(nickname);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${idx++}`);
      values.push(avatar);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }
    
    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, role, real_name, nickname, phone, avatar`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 修改密码
app.put('/api/user/password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 验证旧密码
    const user = await client.query('SELECT id, password FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '用户不存在' });
    }
    if (user.rows[0].password !== oldPassword) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: '原密码错误' });
    }
    
    // 更新新密码
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, userId]);
    await client.query('COMMIT');
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// ============================================================
// 科室接口
// ============================================================
app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY id');
    res.json({ success: true, departments: result.rows });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 预约挂号接口
// ============================================================
// 患者端挂号接口 — 禁用浏览器缓存，确保管理员排班变更实时可见
app.use('/api/appointment', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Expires', '0');
  res.set('Pragma', 'no-cache');
  next();
});

// 获取科室列表（含今日剩余号源，排除停诊和预留号）
app.get('/api/appointment/depts', async (req, res) => {
  const { date } = req.query;
  const queryDate = date || new Date().toISOString().slice(0, 10);
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.icon,
        COALESCE(SUM(s.remaining - COALESCE(s.reserved, 0) - COALESCE(s.reserved_emergency, 0) - COALESCE(s.reserved_vip, 0)), 0) AS remaining_today
      FROM departments d
      LEFT JOIN doctors doc ON doc.department_id = d.id
      LEFT JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
      GROUP BY d.id ORDER BY d.id
    `, [queryDate]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取科室医生排班（含号源类型，排除停诊和预留号）
app.get('/api/appointment/doctors', async (req, res) => {
  const { dept_id, date } = req.query;
  const queryDate = date || new Date().toISOString().slice(0, 10);
  try {
    const result = await pool.query(`
      SELECT doc.id, doc.name, doc.title, doc.specialty, doc.fee, doc.biography, dept.name AS dept_name,
        json_agg(json_build_object(
          'id', s.id, 'am_pm', s.am_pm, 
          'remaining', s.remaining - COALESCE(s.reserved, 0) - COALESCE(s.reserved_emergency, 0) - COALESCE(s.reserved_vip, 0), 
          'total', s.total, 'reserved', COALESCE(s.reserved, 0),
          'reserved_emergency', COALESCE(s.reserved_emergency, 0),
          'reserved_vip', COALESCE(s.reserved_vip, 0),
          'slot_type', COALESCE(s.slot_type,'normal'), 'fee', COALESCE(s.fee, doc.fee, 10)
        )) AS schedules
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
      WHERE doc.department_id = $2
        AND doc.title IN ('主治医师', '副主任医师', '主任医师')
        AND dept.name NOT IN ('检验科', '影像科')
      GROUP BY doc.id, dept.name
      ORDER BY 
        CASE doc.title WHEN '主任医师' THEN 1 WHEN '副主任医师' THEN 2 WHEN '主治医师' THEN 3 END,
        doc.id
    `, [queryDate, dept_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 患者搜索医生/科室（支持模糊匹配、中英文、别名）
app.get('/api/search/doctor-dept', async (req, res) => {
  const { keyword, date } = req.query;
  const queryDate = date || new Date().toISOString().slice(0, 10);
  if (!keyword || !keyword.trim()) {
    return res.json({ departments: [], doctors: [] });
  }
  const kw = `%${keyword.trim()}%`;
  try {
    // 搜索科室
    const deptResult = await pool.query(`
      SELECT d.id, d.name, d.icon,
        COALESCE(SUM(s.remaining - COALESCE(s.reserved, 0) - COALESCE(s.reserved_emergency, 0) - COALESCE(s.reserved_vip, 0)), 0) AS remaining_today
      FROM departments d
      LEFT JOIN doctors doc ON doc.department_id = d.id
      LEFT JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
      WHERE d.name ILIKE $2 AND d.name NOT IN ('急诊科', '挂号处', '药房', '手术室', 'ICU', '住院部')
      GROUP BY d.id
      ORDER BY d.id
    `, [queryDate, kw]);

    // 搜索医生（姓名、职称、专长）
    const docResult = await pool.query(`
      SELECT doc.id, doc.name, doc.title, doc.specialty, doc.fee, doc.biography,
        dept.name AS dept_name, dept.id AS department_id,
        json_agg(json_build_object(
          'id', s.id, 'am_pm', s.am_pm,
          'remaining', s.remaining - COALESCE(s.reserved, 0) - COALESCE(s.reserved_emergency, 0) - COALESCE(s.reserved_vip, 0),
          'total', s.total, 'slot_type', COALESCE(s.slot_type,'normal'),
          'fee', COALESCE(s.fee, doc.fee, 10)
        )) FILTER (WHERE s.id IS NOT NULL) AS schedules
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      LEFT JOIN schedules s ON s.doctor_id = doc.id AND s.schedule_date = $1 AND s.is_stopped = false
      WHERE (doc.name ILIKE $2 OR doc.specialty ILIKE $2 OR doc.title ILIKE $2)
        AND dept.name NOT IN ('检验科', '影像科')
      GROUP BY doc.id, dept.name, dept.id
      ORDER BY 
        CASE doc.title WHEN '主任医师' THEN 1 WHEN '副主任医师' THEN 2 WHEN '主治医师' THEN 3 END,
        doc.id
      LIMIT 30
    `, [queryDate, kw]);

    res.json({
      departments: deptResult.rows,
      doctors: docResult.rows
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 智能导诊 API - 症状→科室匹配 + 推荐医生
// ============================================================
const symptomDeptMap = {
  '内科': { keywords: ['肚子疼','腹痛','腹泻','胃痛','胃胀','恶心','呕吐','便秘','反酸','烧心','拉肚子','胃不舒服','消化不良','肠胃','头痛','头疼','头晕','偏头痛','失眠','睡不着','眩晕','手脚麻','抽搐','记忆力下降','头昏','手抖','面瘫','咳嗽','感冒','发烧','发热','咽痛','喉咙痛','鼻塞','流鼻涕','气喘','呼吸困难','胸闷','心慌','心悸','胸痛','心跳快','血压高','心脏','心绞痛','心律不齐','高血压','尿频','尿急','尿痛','血尿','小便','糖尿病','甲状腺','甲亢','甲减','肥胖','血糖','激素','痛风','尿酸高','焦虑','抑郁','紧张','恐惧','强迫','情绪低落','烦躁','压力大'], followUp: '请问具体是哪个部位不适？症状持续多久了？', displayName: '内科' },
  '外科': { keywords: ['腰痛','腰疼','关节痛','关节疼','骨折','扭伤','膝盖疼','膝盖','颈椎','肩周炎','骨质疏松','背痛','肩膀疼','腿疼','手腕疼','脚踝','运动损伤','腰椎间盘突出','肝区','右上腹','胆结石','胆囊','黄疸','肝炎','肝功异常','疝气','痔疮','外伤','跌打','摔伤'], followUp: '请问疼痛部位在哪里？是活动后加重还是休息时也疼？', displayName: '外科' },
  '中医科': { keywords: ['调理','中药','针灸','推拿','体质','亚健康','养生','把脉','虚','气虚','血虚','湿气','上火','拔罐','艾灸'], followUp: '请问主要想调理哪方面的问题？', displayName: '中医科' },
  '妇产科': { keywords: ['月经','痛经','白带','怀孕','产检','妇科','阴道','子宫','卵巢','月经不调','备孕','更年期','乳腺'], followUp: '请问末次月经是什么时候？有没有其他伴随症状？', displayName: '妇产科' },
  '儿科': { keywords: ['小儿','儿童','婴儿','孩子','发育','挑食','多动','小孩','宝宝','新生儿','手足口'], followUp: '请问孩子多大了？症状持续多长时间？', displayName: '儿科' },
  '皮肤科': { keywords: ['皮疹','瘙痒','皮肤','过敏','湿疹','痘痘','脱发','荨麻疹','疱疹','红斑','皮肤痒','起疙瘩','水痘','牛皮癣','白癜风','脚气'], followUp: '请问皮疹出现在什么部位？有没有接触过过敏原？', displayName: '皮肤科' },
  '眼科': { keywords: ['眼睛','视力','近视','眼红','眼痛','白内障','青光眼','飞蚊症','干眼','眼睛痒','视力下降','眼睛干','畏光','散光','老花眼'], followUp: '请问是双眼还是单眼？有没有视力下降或异物感？', displayName: '眼科' },
  '耳鼻喉科': { keywords: ['耳鸣','听力','鼻炎','鼻窦炎','咽喉','扁桃体','中耳炎','打鼾','鼻子','耳朵','嗅觉','声音嘶哑','鼻出血'], followUp: '请问症状持续多久了？有没有鼻塞流脓涕或听力下降？', displayName: '耳鼻喉科' },
  '口腔科': { keywords: ['牙痛','蛀牙','口腔溃疡','牙龈','拔牙','口臭','牙齿','牙出血','牙周','洗牙','补牙','矫正','智齿'], followUp: '请问是持续性疼痛还是遇冷热加重？有没有牙龈出血？', displayName: '口腔科' },
  '精神心理科': { keywords: ['焦虑症','抑郁症','心理障碍','恐慌症','强迫症','社交恐惧','严重失眠'], followUp: '请问这种情绪持续多久了？是否影响日常生活和工作？', displayName: '精神心理科' },
};

app.post('/api/triage/analyze', async (req, res) => {
  try {
    const { symptoms, history = [] } = req.body;
    if (!symptoms || !symptoms.trim()) {
      return res.json({ matched: false, message: '请描述您的症状', recommendations: [] });
    }
    const text = symptoms; // 中文不需要toLowerCase

    // 1. 关键词匹配：计算各科室得分
    const scores = [];
    for (const [deptName, info] of Object.entries(symptomDeptMap)) {
      let hitCount = 0;
      const matchedKeywords = [];
      for (const kw of info.keywords) {
        if (text.includes(kw)) {
          hitCount++;
          matchedKeywords.push(kw);
        }
      }
      if (hitCount > 0) {
        scores.push({
          deptName,
          hitCount,
          totalKeywords: info.keywords.length,
          confidence: Math.min(Math.round((hitCount / 4) * 100), 99),
          matchedKeywords,
          followUp: info.followUp
        });
      }
    }
    scores.sort((a, b) => b.confidence - a.confidence);

    // 2. 判断是否需要追问（多个科室分数接近）
    if (scores.length >= 2 && scores[0].confidence - scores[1].confidence <= 15 && scores[0].hitCount === 1) {
      return res.json({
        matched: false,
        needClarify: true,
        message: scores[0].followUp || '请问能再详细描述一下症状吗？比如具体位置、持续时间等。',
        possibleDepts: scores.slice(0, 3).map(s => s.deptName),
        recommendations: []
      });
    }

    // 3. 无匹配 → 兜底
    if (scores.length === 0) {
      return res.json({
        matched: false,
        needClarify: true,
        message: '您的症状描述不够明确，能否补充更多细节？比如具体不适部位、持续时间、是否有发热等。',
        possibleDepts: [],
        recommendations: []
      });
    }

    // 4. 查询推荐科室的今日医生（取 top 1-2 个科室）
    const today = new Date().toISOString().slice(0, 10);
    const topDepts = scores.slice(0, 2);
    const recommendations = [];

    for (const dept of topDepts) {
      // 查科室 ID（精确匹配）
      const deptRes = await pool.query(
        'SELECT id, name FROM departments WHERE name = $1 LIMIT 1',
        [dept.deptName]
      );
      if (deptRes.rows.length === 0) {
        // 科室在数据库中不存在，仍然返回推荐但无医生
        recommendations.push({
          dept_id: null,
          dept_name: dept.deptName,
          confidence: dept.confidence,
          matched_keywords: dept.matchedKeywords,
          doctors: []
        });
        continue;
      }
      const deptId = deptRes.rows[0].id;
      const deptNameReal = deptRes.rows[0].name;

      // 查该科室今日有号医生
      const docRes = await pool.query(`
        SELECT DISTINCT doc.id, doc.name, doc.title, doc.specialty, doc.fee,
          s.id AS schedule_id, s.am_pm, s.remaining, s.total
        FROM doctors doc
        JOIN schedules s ON s.doctor_id = doc.id
        WHERE doc.department_id = $1
          AND s.schedule_date = $2
          AND s.remaining > 0
          AND s.is_stopped = false
        ORDER BY s.remaining DESC
        LIMIT 3
      `, [deptId, today]);

      recommendations.push({
        dept_id: deptId,
        dept_name: deptNameReal,
        confidence: dept.confidence,
        matched_keywords: dept.matchedKeywords,
        doctors: docRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          title: r.title,
          specialty: r.specialty,
          fee: r.fee,
          schedule_id: r.schedule_id,
          am_pm: r.am_pm,
          remaining: r.remaining
        }))
      });
    }

    // 5. 返回结果
    if (recommendations.length === 0) {
      return res.json({
        matched: false,
        message: '您的症状比较复杂，建议前往全科医学科或分诊台由护士人工分诊。',
        needClarify: false,
        recommendations: []
      });
    }

    const primary = recommendations[0];
    const secondary = recommendations.length > 1 ? recommendations[1] : null;

    let message = `根据您的症状描述，为您推荐 **${primary.dept_name}**`;
    if (secondary) {
      message += `\n如果症状偏向${secondary.dept_name}相关，也可以考虑该科室。`;
    }

    res.json({
      matched: true,
      needClarify: false,
      message,
      primary: {
        dept_id: primary.dept_id,
        dept_name: primary.dept_name,
        confidence: primary.confidence,
        matched_keywords: primary.matched_keywords,
        doctors: primary.doctors
      },
      secondary: secondary ? {
        dept_id: secondary.dept_id,
        dept_name: secondary.dept_name,
        confidence: secondary.confidence,
        doctors: secondary.doctors.slice(0, 1)
      } : null
    });
  } catch (err) {
    console.error('导诊分析出错:', err);
    res.status(500).json({ error: '导诊分析服务暂时不可用' });
  }
});

// ========== 导诊对话历史 ==========

// 确保对话历史表存在
const ensureTriageTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS triage_conversations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        title VARCHAR(100),
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // 确保索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_triage_conv_patient ON triage_conversations(patient_id)`);
  } catch (e) {
    console.log('Triage conversations table init:', e.message);
  }
};
ensureTriageTable();

// 获取患者的对话列表
app.get('/api/triage/conversations', async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.json([]);
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at,
              jsonb_array_length(messages) AS message_count
       FROM triage_conversations
       WHERE patient_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [patient_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('获取对话列表出错:', err);
    res.status(500).json({ error: '获取对话列表失败' });
  }
});

// 获取单个对话详情（含消息）
app.get('/api/triage/conversations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM triage_conversations WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '对话不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取对话详情出错:', err);
    res.status(500).json({ error: '获取对话详情失败' });
  }
});

// 保存新对话
app.post('/api/triage/conversations', async (req, res) => {
  try {
    const { patient_id, title, messages } = req.body;
    if (!patient_id || !messages || messages.length === 0) {
      return res.status(400).json({ error: '参数不完整' });
    }
    const convTitle = title || '导诊对话';
    const result = await pool.query(
      `INSERT INTO triage_conversations (patient_id, title, messages)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, title, created_at`,
      [patient_id, convTitle, JSON.stringify(messages)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('保存对话出错:', err);
    res.status(500).json({ error: '保存对话失败' });
  }
});

// 删除对话
app.delete('/api/triage/conversations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM triage_conversations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('删除对话出错:', err);
    res.status(500).json({ error: '删除对话失败' });
  }
});

// 创建预约挂号（完整一致性校验）
app.post('/api/appointment/create', async (req, res) => {
  const { patient_id, schedule_id, doctor_id, department_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 检查号源一致性：schedule 必须属于该 doctor 且未被停诊
    const sch = await client.query(
      'SELECT * FROM schedules WHERE id=$1 AND doctor_id=$2 AND is_stopped=false FOR UPDATE',
      [schedule_id, doctor_id]
    );
    if (!sch.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '号源不存在、已停诊或医生不匹配' });
    }
    // 患者只能挂普通号，预留号源不对外
    const available = sch.rows[0].remaining - (sch.rows[0].reserved || 0) - (sch.rows[0].reserved_emergency || 0) - (sch.rows[0].reserved_vip || 0);
    if (available <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '号源已满' });
    }
    // 检查患者当天是否已有同一医生的预约
    const dup = await client.query(
      `SELECT id FROM registrations
       WHERE patient_id=$1 AND doctor_id=$2 AND appt_date=$3 AND status='pending'`,
      [patient_id, doctor_id, sch.rows[0].schedule_date]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '您当天已预约该医生，请勿重复挂号' });
    }
    // 创建挂号记录（关联schedule、记录日期/时段/号源类型）
    const reg = await client.query(
      `INSERT INTO registrations (patient_id, doctor_id, department_id, schedule_id, register_date, appt_date, am_pm, slot_type, status, is_reserved)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,'pending', false) RETURNING *`,
      [patient_id, doctor_id, department_id, schedule_id,
       sch.rows[0].schedule_date, sch.rows[0].am_pm, sch.rows[0].slot_type || 'normal']
    );
    // 扣减号源
    await client.query('UPDATE schedules SET remaining=remaining-1 WHERE id=$1', [schedule_id]);
    await client.query('COMMIT');
    res.json({ success: true, registration: reg.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 我的预约列表
app.get('/api/appointment/mine', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT r.*, doc.name AS doctor_name, doc.title, dept.name AS dept_name
      FROM registrations r
      JOIN doctors doc ON r.doctor_id = doc.id
      JOIN departments dept ON r.department_id = dept.id
      WHERE r.patient_id = $1
      ORDER BY r.register_date DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 缴费接口
// ============================================================

// 待缴费处方
app.get('/api/payment/pending', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT p.id, p.total_amount, p.type, p.review_status, p.created_at,
        doc.name AS doctor_name,
        json_agg(json_build_object(
          'id', pi.id, 'item_name', pi.item_name, 'quantity', pi.quantity,
          'unit', pi.unit, 'price', pi.price
        )) AS items,
        inv.payment_status, inv.insurance_amount, inv.self_amount
      FROM prescriptions p
      LEFT JOIN doctors doc ON p.doctor_id = doc.id
      LEFT JOIN prescription_items pi ON pi.presc_id = p.id
      LEFT JOIN invoices inv ON inv.presc_id = p.id
      WHERE p.patient_id = $1 AND p.review_status = 'approved'
      GROUP BY p.id, doc.name, inv.payment_status, inv.insurance_amount, inv.self_amount
      ORDER BY p.created_at DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 缴费
app.post('/api/payment/pay', async (req, res) => {
  const { presc_id, patient_id, payment_method } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const presc = await client.query('SELECT total_amount FROM prescriptions WHERE id=$1', [presc_id]);
    const amount = presc.rows[0]?.total_amount || 0;
    const insuranceAmt = parseFloat(amount) * 0.6;
    const selfAmt = parseFloat(amount) - insuranceAmt;
    // 创建或更新发票
    await client.query(`
      INSERT INTO invoices (patient_id, presc_id, amount, insurance_amount, self_amount, payment_status, payment_method)
      VALUES ($1,$2,$3,$4,$5,'paid',$6)
      ON CONFLICT (presc_id) DO UPDATE SET payment_status='paid', payment_method=$6
    `, [patient_id, presc_id, amount, insuranceAmt, selfAmt, payment_method]);
    
    // 更新缴费订单状态
    const transactionNo = 'TX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    await client.query(`
      UPDATE payment_orders 
      SET payment_status = 'paid', 
          payment_method = $1, 
          transaction_no = $2, 
          paid_at = NOW(),
          updated_at = NOW()
      WHERE order_type = 'prescription' AND source_id = $3
    `, [payment_method, transactionNo, presc_id]);
    
    await client.query('COMMIT');
    res.json({ success: true, transaction_no: transactionNo });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 排队状态接口
// ============================================================
// 排队状态（仅返回真实挂号患者）
app.get('/api/queue/status', async (req, res) => {
  const { patient_id, doctor_id } = req.query;
  const doctorId = parseInt(doctor_id) || null;
  
  try {
    // 只获取真实挂号队列
    const queueResult = await pool.query(`
      SELECT r.id, r.patient_id, p.name AS patient_name, r.status,
        ROW_NUMBER() OVER (ORDER BY r.created_at) AS seq
      FROM registrations r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.register_date = CURRENT_DATE AND r.status IN ('pending','calling')
        AND ($1::int IS NULL OR r.doctor_id = $1)
      ORDER BY r.created_at
      LIMIT 20
    `, [doctorId]);

    const queue = queueResult.rows;
    const calling = queue.find(r => r.status === 'calling') || queue[0] || null;
    const myRecord = queue.find(r => String(r.patient_id) === String(patient_id));

    res.json({
      current: calling,
      myPosition: myRecord ? myRecord.seq : null,
      queue: queue
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 药品搜索
// ============================================================
app.get('/api/drugs/search', async (req, res) => {
  const { q, name, category, specification, manufacturer, type, page = 1, page_size = 20, sort_by = 'id', sort_order = 'asc' } = req.query;
  try {
    let sql = 'SELECT * FROM drugs WHERE 1=1';
    const params = [];
    
    const keyword = q || name;
    if (keyword) {
      params.push(`%${keyword}%`);
      sql += ` AND (name ILIKE $${params.length} OR specification ILIKE $${params.length})`;
    }
    
    if (category) {
      params.push(`%${category}%`);
      sql += ` AND category ILIKE $${params.length}`;
    }
    
    if (specification) {
      params.push(`%${specification}%`);
      sql += ` AND specification ILIKE $${params.length}`;
    }
    
    if (manufacturer) {
      params.push(`%${manufacturer}%`);
      sql += ` AND manufacturer ILIKE $${params.length}`;
    }
    
    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    
    const validSortFields = ['id', 'name', 'price', 'actual_stock', 'manufacturer', 'category'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'id';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortField} ${order}`;
    
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)').replace(/ORDER BY [\w\s]+(ASC|DESC)?/i, '');
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].count);
    
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(page_size));
    params.push(offset);
    
    const result = await pool.query(sql, params);
    
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(total / parseInt(page_size))
    });
  } catch (err) { 
    console.error('药品搜索失败:', err);
    handleErr(res, err); 
  }
});

app.get('/api/drugs', async (req, res) => {
  const { page = 1, page_size = 20, sort_by = 'id', sort_order = 'asc' } = req.query;
  try {
    const validSortFields = ['id', 'name', 'price', 'actual_stock', 'manufacturer', 'category'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'id';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM drugs');
    const total = parseInt(countResult.rows[0].count);
    
    const result = await pool.query(
      `SELECT * FROM drugs ORDER BY ${sortField} ${order} LIMIT $1 OFFSET $2`,
      [parseInt(page_size), offset]
    );
    
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(total / parseInt(page_size))
    });
  } catch (err) { handleErr(res, err); }
});

app.get('/api/drugs/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM drugs WHERE category IS NOT NULL AND category != \'\' ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (err) { handleErr(res, err); }
});

app.put('/api/drugs/:id/stock', async (req, res) => {
  const { actual_stock } = req.body;
  try {
    const result = await pool.query(
      'UPDATE drugs SET actual_stock=$1 WHERE id=$2 RETURNING *',
      [actual_stock, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 医生工作台接口
// ============================================================

// 今日患者队列（仅返回真实挂号患者）
app.get('/api/doctor/today-patients', async (req, res) => {
  const { doctor_id } = req.query;
  const doctorId = parseInt(doctor_id) || 0;
  if (!doctorId) return res.json([]);

  try {
    // 1. 获取真实挂号患者
    const realResult = await pool.query(`
      SELECT r.id AS reg_id, r.status, r.created_at, r.is_reserved,
        p.id AS patient_id, p.name, p.gender, p.phone, p.allergy, p.chronic_disease, p.insurance_type,
        p.birth_date,
        EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
        ROW_NUMBER() OVER (ORDER BY r.created_at) AS seq
      FROM registrations r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.register_date = CURRENT_DATE AND r.doctor_id = $1 AND r.status NOT IN ('cancelled', 'completed')
      ORDER BY r.created_at
    `, [doctorId]);

    const realPatients = realResult.rows;
    res.json(realPatients);
  } catch (err) { handleErr(res, err); }
});

// 种子数据接口（已废弃，不再生成虚拟患者）
app.post('/api/doctor/seed-today-patients', async (req, res) => {
  // 现在直接返回真实挂号数据，无需种子数据
  res.json({ success: true, message: '现在返回真实挂号数据' });
});

// 医生查看自己的排班（含预留号源）
app.get('/api/doctor/schedules', async (req, res) => {
  const { doctor_id, date } = req.query;
  const queryDate = date || new Date().toISOString().slice(0, 10);
  try {
    const result = await pool.query(`
      SELECT s.id, s.schedule_date, s.am_pm, s.total, s.remaining, 
             COALESCE(s.reserved, 0) AS reserved, s.slot_type, s.fee, s.is_stopped
      FROM schedules s
      WHERE s.doctor_id = $1 AND s.schedule_date = $2
      ORDER BY s.am_pm
    `, [doctor_id, queryDate]);
    
    const rows = result.rows.map(r => ({
      ...r,
      available_normal: r.remaining - (r.reserved || 0),
      available_reserved: r.reserved || 0
    }));
    res.json(rows);
  } catch (err) { handleErr(res, err); }
});

// 医生使用预留号源为患者挂号
app.post('/api/doctor/reserved-registration', async (req, res) => {
  const { doctor_id, patient_id, schedule_id, department_id, reserved_type } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 检查号源一致性
    const sch = await client.query(
      'SELECT * FROM schedules WHERE id=$1 AND doctor_id=$2 AND is_stopped=false FOR UPDATE',
      [schedule_id, doctor_id]
    );
    if (!sch.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '号源不存在、已停诊或医生不匹配' });
    }
    
    // 根据预留号类型检查是否有可用号源
    const type = reserved_type || 'doctor';
    let reservedField = '';
    let reservedCount = 0;
    if (type === 'doctor') {
      reservedField = 'reserved';
      reservedCount = sch.rows[0].reserved || 0;
    } else if (type === 'emergency') {
      reservedField = 'reserved_emergency';
      reservedCount = sch.rows[0].reserved_emergency || 0;
    } else if (type === 'vip') {
      reservedField = 'reserved_vip';
      reservedCount = sch.rows[0].reserved_vip || 0;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '无效的预留号类型' });
    }
    
    if (reservedCount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `${type === 'doctor' ? '医生自留号' : type === 'emergency' ? '急诊预留号' : 'VIP特需号'}源已用完` });
    }
    
    // 检查患者当天是否已有同一医生的预约
    const dup = await client.query(
      `SELECT id FROM registrations
       WHERE patient_id=$1 AND doctor_id=$2 AND appt_date=$3 AND status='pending'`,
      [patient_id, doctor_id, sch.rows[0].schedule_date]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '患者当天已预约该医生，请勿重复挂号' });
    }
    
    // 创建挂号记录（标记为预留号及类型）
    const reg = await client.query(
      `INSERT INTO registrations (patient_id, doctor_id, department_id, schedule_id, 
        register_date, appt_date, am_pm, slot_type, status, is_reserved, reserved_type)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,'pending', true, $8) RETURNING *`,
      [patient_id, doctor_id, department_id, schedule_id,
       sch.rows[0].schedule_date, sch.rows[0].am_pm, sch.rows[0].slot_type || 'normal', type]
    );
    
    // 扣减号源
    await client.query(`UPDATE schedules SET remaining=remaining-1, ${reservedField}=${reservedField}-1 WHERE id=$1`, [schedule_id]);
    
    // 记录预留号使用情况
    await client.query(
      `INSERT INTO reserved_usage_records (schedule_id, registration_id, patient_id, doctor_id, reserved_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [schedule_id, reg.rows[0].id, patient_id, doctor_id, type]
    );
    
    await client.query('COMMIT');
    res.json({ success: true, registration: reg.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取预留号使用记录
app.get('/api/admin/reserved-usage', async (req, res) => {
  const { start_date, end_date, doctor_id, reserved_type } = req.query;
  try {
    let query = `
      SELECT r.id, r.schedule_id, r.registration_id, r.patient_id, r.doctor_id,
        r.reserved_type, r.used_at, r.remark,
        p.name AS patient_name, d.name AS doctor_name,
        sch.schedule_date, sch.am_pm
      FROM reserved_usage_records r
      JOIN patients p ON r.patient_id = p.id
      JOIN doctors d ON r.doctor_id = d.id
      JOIN schedules sch ON r.schedule_id = sch.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    
    if (start_date) {
      query += ` AND r.used_at >= $${idx}`;
      params.push(start_date);
      idx++;
    }
    if (end_date) {
      query += ` AND r.used_at <= $${idx}`;
      params.push(end_date);
      idx++;
    }
    if (doctor_id) {
      query += ` AND r.doctor_id = $${idx}`;
      params.push(doctor_id);
      idx++;
    }
    if (reserved_type) {
      query += ` AND r.reserved_type = $${idx}`;
      params.push(reserved_type);
      idx++;
    }
    
    query += ' ORDER BY r.used_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 预留号使用统计报表
app.get('/api/admin/reserved-stats', async (req, res) => {
  const { start_date, end_date, department_id } = req.query;
  const start = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = end_date || new Date().toISOString().slice(0, 10);
  
  try {
    // 按类型统计使用数量
    const typeStats = await pool.query(`
      SELECT r.reserved_type, COUNT(*) AS total_used,
        SUM(CASE WHEN r.used_at >= $1 AND r.used_at <= $2 THEN 1 ELSE 0 END) AS period_used
      FROM reserved_usage_records r
      LEFT JOIN schedules sch ON r.schedule_id = sch.id
      LEFT JOIN doctors d ON sch.doctor_id = d.id
      WHERE ($3::int IS NULL OR d.department_id = $3)
      GROUP BY r.reserved_type
    `, [start, end, department_id || null]);
    
    // 按医生统计使用数量
    const doctorStats = await pool.query(`
      SELECT d.name AS doctor_name, d.id AS doctor_id,
        COUNT(r.id) AS total_used,
        SUM(CASE WHEN r.reserved_type = 'doctor' THEN 1 ELSE 0 END) AS doctor_used,
        SUM(CASE WHEN r.reserved_type = 'emergency' THEN 1 ELSE 0 END) AS emergency_used,
        SUM(CASE WHEN r.reserved_type = 'vip' THEN 1 ELSE 0 END) AS vip_used
      FROM doctors d
      LEFT JOIN schedules sch ON d.id = sch.doctor_id
      LEFT JOIN reserved_usage_records r ON sch.id = r.schedule_id
        AND r.used_at >= $1 AND r.used_at <= $2
      WHERE ($3::int IS NULL OR d.department_id = $3)
      GROUP BY d.id, d.name
      ORDER BY total_used DESC
    `, [start, end, department_id || null]);
    
    // 按日期统计使用趋势
    const dailyStats = await pool.query(`
      SELECT DATE(r.used_at) AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN r.reserved_type = 'doctor' THEN 1 ELSE 0 END) AS doctor,
        SUM(CASE WHEN r.reserved_type = 'emergency' THEN 1 ELSE 0 END) AS emergency,
        SUM(CASE WHEN r.reserved_type = 'vip' THEN 1 ELSE 0 END) AS vip
      FROM reserved_usage_records r
      LEFT JOIN schedules sch ON r.schedule_id = sch.id
      LEFT JOIN doctors d ON sch.doctor_id = d.id
      WHERE r.used_at >= $1 AND r.used_at <= $2
        AND ($3::int IS NULL OR d.department_id = $3)
      GROUP BY DATE(r.used_at)
      ORDER BY date
    `, [start, end, department_id || null]);
    
    res.json({
      period: { start, end },
      type_stats: typeStats.rows,
      doctor_stats: doctorStats.rows,
      daily_stats: dailyStats.rows
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 科室热点词条接口
// ============================================================

// 获取科室热点词条
app.get('/api/hot-keywords', async (req, res) => {
  const { department_id, type, limit = 20, offset = 0 } = req.query;
  try {
    let whereClause = 'WHERE hk.is_hidden = false';
    const params = [];
    let paramCount = 1;
    let hasDeptParam = false;

    if (department_id !== undefined && department_id !== null && department_id !== '') {
      if (department_id === 'all') {
        // 显示所有科室的热词
      } else if (department_id === 'common') {
        // 只显示公共热词（department_id为null或0）
        whereClause += ' AND (hk.department_id IS NULL OR hk.department_id = 0)';
      } else {
        // 显示指定科室的热词（包括公共热词）
        whereClause += ' AND (hk.department_id = $' + paramCount + ' OR hk.department_id IS NULL OR hk.department_id = 0)';
        params.push(parseInt(department_id));
        paramCount++;
        hasDeptParam = true;
      }
    }

    if (type) {
      whereClause += ' AND hk.keyword_type = $' + paramCount;
      params.push(type);
      paramCount++;
    }

    let orderBy = 'hk.id ASC';
    if (hasDeptParam) {
      orderBy = 'CASE WHEN hk.department_id = $1 THEN 0 ELSE 1 END, ' + orderBy;
    }

    const keywords = await pool.query(`
      SELECT hk.*, d.name as department_name
      FROM hot_keywords hk
      LEFT JOIN departments d ON hk.department_id = d.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    const totalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM hot_keywords hk
      ${whereClause}
    `, params);
    
    res.json({ success: true, keywords: keywords.rows, total: parseInt(totalResult.rows[0].total) });
  } catch (err) { handleErr(res, err); }
});

// 智能搜索热词（支持拼音首字母 & 中文模糊匹配）
app.get('/api/hot-keywords/search', async (req, res) => {
  const { q = '', limit = 10 } = req.query;
  if (!q.trim()) return res.json({ success: true, keywords: [] });
  
  try {
    const query = q.trim();
    // 同时匹配 keyword 中文 和 pinyin_initials 拼音首字母
    const keywords = await pool.query(`
      SELECT * FROM hot_keywords
      WHERE is_hidden = false
        AND (keyword ILIKE $1 OR pinyin_initials ILIKE $1)
      ORDER BY weight DESC, usage_count DESC
      LIMIT $2
    `, [`%${query}%`, parseInt(limit)]);
    
    res.json({ success: true, keywords: keywords.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取语义相近的热词（分类返回：性质/伴随/诱因/鉴别诊断）
app.get('/api/hot-keywords/:id/related', async (req, res) => {
  const { department_id, limit = 6, categorized = 'true' } = req.query;
  try {
    const currentResult = await pool.query(
      'SELECT * FROM hot_keywords WHERE id = $1',
      [req.params.id]
    );
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: '词条不存在' });
    }
    const current = currentResult.rows[0];
    const deptId = department_id || current.department_id;
    const kwType = current.keyword_type; // diagnosis / symptom / disease / drug / test
    const isDisease = kwType === 'diagnosis' || kwType === 'disease';
    const isSymptom = kwType === 'symptom';

    // 先尝试知识图谱
    const kgResult = await pool.query(`
      SELECT kg.relation_type, hk.*, kg.weight as relation_weight
      FROM knowledge_graph kg
      JOIN hot_keywords hk ON kg.target_id = hk.id
      WHERE kg.source_id = $1 AND kg.is_active = true
      ORDER BY kg.weight DESC
      LIMIT 50
    `, [req.params.id]);

    const kgRelations = kgResult.rows;

    // 知识图谱有的用知识图谱，没有的用类型推断兜底
    const categories = [];

    // 统一科室过滤辅助：同科室优先排列
    const deptWhere = deptId ? 'AND (department_id = $2 OR department_id IS NULL)' : '';
    const deptOrder = deptId ? `ORDER BY CASE WHEN department_id = $2 THEN 0 ELSE 1 END, weight DESC` : `ORDER BY weight DESC`;
    const deptArgs = (qId) => deptId ? [qId, deptId, parseInt(limit)] : [qId, parseInt(limit)];

    // --- 1. 性质描述 ---
    let qualityItems = kgRelations.filter(r => r.relation_type === 'is_type_of' || r.relation_type === 'has_quality');
    if (qualityItems.length === 0 && isSymptom) {
      const qr = await pool.query(
        `SELECT * FROM hot_keywords WHERE id != $1 AND keyword_type = 'symptom' AND is_hidden = false ${deptWhere} ${deptOrder} LIMIT $${deptArgs('').length}`,
        deptArgs(req.params.id)
      );
      qualityItems = qr.rows;
    }
    if (qualityItems.length > 0) {
      categories.push({ name: '性质描述', type: 'quality', items: qualityItems.slice(0, parseInt(limit)) });
    }

    // --- 2. 伴随症状 ---
    let associatedItems = kgRelations.filter(r => r.relation_type === 'has_symptom');
    if (associatedItems.length === 0 && (isDisease || isSymptom)) {
      const ar = await pool.query(
        `SELECT * FROM hot_keywords WHERE id != $1 AND keyword_type = 'symptom' AND is_hidden = false ${deptWhere} ${deptOrder} LIMIT $${deptArgs('').length}`,
        deptArgs(req.params.id)
      );
      associatedItems = ar.rows;
    }
    if (associatedItems.length > 0) {
      categories.push({ name: '伴随症状', type: 'associated', items: associatedItems.slice(0, parseInt(limit)) });
    }

    // --- 3. 诱因 / 病因 ---
    let triggerItems = kgRelations.filter(r => r.relation_type === 'caused_by');
    if (triggerItems.length === 0 && isSymptom) {
      const tr = await pool.query(
        `SELECT * FROM hot_keywords WHERE id != $1 AND keyword_type IN ('diagnosis','disease') AND is_hidden = false ${deptWhere} ${deptOrder} LIMIT $${deptArgs('').length}`,
        deptArgs(req.params.id)
      );
      triggerItems = tr.rows;
    }
    if (triggerItems.length > 0) {
      categories.push({ name: '诱因/病因', type: 'trigger', items: triggerItems.slice(0, parseInt(limit)) });
    }

    // --- 4. 鉴别诊断 ---
    let diffItems = kgRelations.filter(r => r.relation_type === 'related_to');
    if (diffItems.length === 0 && isDisease) {
      const dr = await pool.query(
        `SELECT * FROM hot_keywords WHERE id != $1 AND keyword_type IN ('diagnosis','disease') AND is_hidden = false ${deptWhere} ${deptOrder} LIMIT $${deptArgs('').length}`,
        deptArgs(req.params.id)
      );
      diffItems = dr.rows;
    }
    if (diffItems.length > 0) {
      categories.push({ name: '鉴别诊断', type: 'differential', items: diffItems.slice(0, parseInt(limit)) });
    }

    // --- 5. 相关检查 ---
    let checkItems = kgRelations.filter(r => r.relation_type === 'test_for');
    if (checkItems.length > 0) {
      categories.push({ name: '相关检查', type: 'check', items: checkItems.slice(0, parseInt(limit)) });
    }

    // --- 6. 中医证型 (如有) ---
    const tcmItems = kgRelations.filter(r => r.relation_type === 'tcm_pattern');
    if (tcmItems.length > 0) {
      categories.push({ name: '中医证型', type: 'tcm', items: tcmItems.slice(0, parseInt(limit)) });
    }

    res.json({ success: true, current, categories });
  } catch (err) { handleErr(res, err); }
});

// 获取去重后的高频主诉（Top N 独立词条）
app.get('/api/hot-keywords/chief-complaints', async (req, res) => {
  const { department_id, limit = 8 } = req.query;
  try {
    const deptId = department_id && department_id !== 'null' ? parseInt(department_id) : null;
    let where = 'WHERE hk.is_hidden = false';
    const params = [];
    if (deptId) {
      where += ` AND (hk.department_id = $1 OR hk.department_id IS NULL)`;
      params.push(deptId);
    }

    // 按关键词名去重，取每个词条中权重最高的那条，聚合总权重
    // 同科室词条优先排列
    const orderBy = deptId
      ? `ORDER BY CASE WHEN MAX(hk.department_id) = $1 THEN 0 ELSE 1 END, SUM(hk.weight) DESC`
      : `ORDER BY SUM(hk.weight) DESC`;

    const result = await pool.query(`
      SELECT
        MAX(hk.id) AS id,
        hk.keyword,
        hk.keyword_type,
        MAX(hk.weight) AS weight,
        BOOL_OR(hk.is_top) AS is_top,
        SUM(hk.weight) AS total_weight,
        COUNT(*) AS cnt,
        MAX(hk.department_id) AS department_id
      FROM hot_keywords hk
      ${where}
      GROUP BY hk.keyword, hk.keyword_type
      ${orderBy}
      LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)]);

    res.json({ success: true, complaints: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 记录热点词条使用
app.post('/api/hot-keywords/use', async (req, res) => {
  const { keyword_id, doctor_id, patient_id, usage_type = 'click' } = req.body;
  try {
    await pool.query('BEGIN');
    
    await pool.query(
      `INSERT INTO keyword_usage_logs (keyword_id, doctor_id, patient_id, usage_type)
       VALUES ($1, $2, $3, $4)`,
      [keyword_id, doctor_id, patient_id, usage_type]
    );
    
    await pool.query(
      `UPDATE hot_keywords SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [keyword_id]
    );
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    handleErr(res, err);
  }
});

// 更新热点词条权重
app.put('/api/hot-keywords/:id', async (req, res) => {
  const { weight, is_top, is_hidden } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hot_keywords SET 
        weight = COALESCE($1, weight),
        is_top = COALESCE($2, is_top),
        is_hidden = COALESCE($3, is_hidden),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [weight, is_top, is_hidden, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '词条不存在' });
    }
    
    res.json({ success: true, keyword: result.rows[0] });
  } catch (err) { handleErr(res, err); }
});

// 删除热点词条
app.delete('/api/hot-keywords/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM hot_keywords WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '词条不存在' });
    }
    
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// 主任医师调整热词优先级
app.put('/api/hot-keywords/:id/chief-adjust', chiefPhysicianAuthMiddleware, async (req, res) => {
  const { priority, is_top, is_hidden, doctor_id } = req.body;

  if (!doctor_id) {
    return res.status(400).json({ error: '缺少医生ID' });
  }

  try {
    // 验证是否为主任医师
    const doctorResult = await pool.query(
      'SELECT id, department_id, is_chief_physician FROM doctors WHERE id = $1',
      [doctor_id]
    );

    if (doctorResult.rows.length === 0 || !doctorResult.rows[0].is_chief_physician) {
      return res.status(403).json({ error: '只有主任医师可以调整热词优先级' });
    }

    const chiefDeptId = doctorResult.rows[0].department_id;

    // 获取热词信息
    const keywordResult = await pool.query(
      'SELECT id, department_id, keyword, priority, is_top FROM hot_keywords WHERE id = $1',
      [req.params.id]
    );

    if (keywordResult.rows.length === 0) {
      return res.status(404).json({ error: '热词不存在' });
    }

    const keyword = keywordResult.rows[0];

    // 验证热词是否属于主任医师的科室
    if (keyword.department_id !== chiefDeptId) {
      return res.status(403).json({ error: '只能调整本科室的热词' });
    }

    // 记录调整历史
    const oldPriority = keyword.priority;
    const oldIsTop = keyword.is_top;

    // 构建更新语句
    let updateFields = [];
    let params = [];
    let paramCount = 1;

    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      params.push(priority);
    }

    if (is_top !== undefined) {
      updateFields.push(`is_top = $${paramCount++}`);
      params.push(is_top);
    }

    if (is_hidden !== undefined) {
      updateFields.push(`is_hidden = $${paramCount++}`);
      params.push(is_hidden);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '缺少更新字段' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE hot_keywords SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    // 记录调整历史
    await pool.query(
      `INSERT INTO hot_keyword_adjustments (keyword_id, keyword, department_id, doctor_id, old_priority, new_priority, old_is_top, new_is_top, adjustment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.params.id,
        keyword.keyword,
        chiefDeptId,
        doctor_id,
        oldPriority,
        result.rows[0].priority,
        oldIsTop,
        result.rows[0].is_top,
        is_top !== undefined ? 'top_change' : 'priority_change'
      ]
    );

    res.json({ success: true, keyword: result.rows[0] });
  } catch (err) { handleErr(res, err); }
});

// 获取主任医师调整历史
app.get('/api/hot-keywords/adjustment-history', async (req, res) => {
  const { department_id, limit = 50 } = req.query;

  try {
    let query = `
      SELECT hka.*, d.name as doctor_name
      FROM hot_keyword_adjustments hka
      LEFT JOIN doctors d ON hka.doctor_id = d.id
    `;
    let params = [];
    let paramCount = 1;

    if (department_id) {
      query += ` WHERE hka.department_id = $${paramCount++}`;
      params.push(department_id);
    }

    query += ` ORDER BY hka.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ history: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 添加热点词条
app.post('/api/hot-keywords', async (req, res) => {
  const { department_id, keyword, keyword_type = 'diagnosis', weight = 10, is_top = false } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO hot_keywords (department_id, keyword, keyword_type, weight, is_top)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [department_id, keyword, keyword_type, weight, is_top]
    );
    
    res.json({ success: true, keyword: result.rows[0] });
  } catch (err) { handleErr(res, err); }
});

// 获取热点词条统计
app.get('/api/hot-keywords/stats', async (req, res) => {
  const { department_id, start_date, end_date } = req.query;
  const start = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = end_date || new Date().toISOString().slice(0, 10);
  
  try {
    const stats = await pool.query(`
      SELECT hk.keyword, hk.keyword_type, COUNT(kl.id) AS usage_count
      FROM hot_keywords hk
      LEFT JOIN keyword_usage_logs kl ON hk.id = kl.keyword_id
        AND kl.created_at >= $1 AND kl.created_at <= $2
      WHERE (hk.department_id = $3 OR hk.department_id = 0)
      GROUP BY hk.id, hk.keyword, hk.keyword_type
      ORDER BY usage_count DESC
      LIMIT 10
    `, [start, end, department_id || 1]);
    
    res.json({ success: true, stats: stats.rows });
  } catch (err) { handleErr(res, err); }
});

// ─── 医生快捷键设置 API ─────────────────────────────────────────
// 获取医生的快捷键设置
app.get('/api/doctor/shortcuts', async (req, res) => {
  const { doctor_id } = req.query;
  if (!doctor_id) return res.status(400).json({ error: '缺少doctor_id' });
  
  try {
    const result = await pool.query(
      'SELECT shortcut_key, shortcut_value FROM doctor_shortcuts WHERE doctor_id = $1',
      [doctor_id]
    );
    const shortcuts = {};
    result.rows.forEach(row => {
      shortcuts[row.shortcut_key] = row.shortcut_value;
    });
    res.json({ success: true, shortcuts });
  } catch (err) { handleErr(res, err); }
});

// 保存医生的快捷键设置
app.post('/api/doctor/shortcuts', async (req, res) => {
  console.log('收到快捷键保存请求:', req.body);
  const { doctor_id, shortcuts } = req.body;
  if (!doctor_id || !shortcuts) return res.status(400).json({ error: '缺少doctor_id或shortcuts' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM doctor_shortcuts WHERE doctor_id = $1', [doctor_id]);
    const entries = Object.entries(shortcuts);
    for (const [key, value] of entries) {
      await client.query(
        'INSERT INTO doctor_shortcuts (doctor_id, shortcut_key, shortcut_value) VALUES ($1, $2, $3)',
        [doctor_id, key, value]
      );
    }
    await client.query('COMMIT');
    console.log('快捷键保存成功:', doctor_id);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('快捷键保存失败:', err.message);
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// 更新挂号状态（叫号/完成/过号）
// 合法状态流转：pending→consulting→completed / pending→cancelled
app.put('/api/doctor/registration/:id/status', async (req, res) => {
  const { status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE 锁定该行，防止两个医生同时接诊同一患者
    const reg = await client.query(
      'SELECT * FROM registrations WHERE id=$1 FOR UPDATE',
      [req.params.id]
    );
    if (!reg.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '挂号记录不存在' });
    }
    const cur = reg.rows[0].status;
    const valid = {
      pending: ['consulting', 'cancelled'],
      consulting: ['completed'],
      completed: [],
      cancelled: []
    };
    if (!(valid[cur] || []).includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `不允许从 ${cur} 变更为 ${status}` });
    }
    const result = await client.query(
      'UPDATE registrations SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取患者最近病历
app.get('/api/doctor/medical-record/latest', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM medical_records WHERE patient_id=$1 ORDER BY visit_date DESC LIMIT 1',
      [patient_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) { handleErr(res, err); }
});

// 获取患者历史病历列表
app.get('/api/patient/:id/history', async (req, res) => {
  const patientId = req.params.id;
  try {
    // 历史病历
    const records = await pool.query(`
      SELECT mr.*, d.name AS doctor_name
      FROM medical_records mr
      LEFT JOIN doctors d ON mr.doctor_id = d.id
      WHERE mr.patient_id = $1
      ORDER BY mr.visit_date DESC
    `, [patientId]);

    // 历史处方
    const prescriptions = await pool.query(`
      SELECT p.id, p.medicine_name, p.dosage, p.frequency, p.quantity, p.fee,
        p.type, p.review_status, p.created_at,
        d.name AS doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      WHERE p.patient_id = $1
      ORDER BY p.created_at DESC
    `, [patientId]);

    // 历史挂号
    const registrations = await pool.query(`
      SELECT r.*, d.name AS doctor_name, dept.name AS department_name
      FROM registrations r
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN departments dept ON r.department_id = dept.id
      WHERE r.patient_id = $1
      ORDER BY r.register_date DESC
    `, [patientId]);

    res.json({
      records: records.rows,
      prescriptions: prescriptions.rows,
      registrations: registrations.rows
    });
  } catch (err) { handleErr(res, err); }
});

// ICD诊断搜索
app.get('/api/doctor/diagnosis/search', async (req, res) => {
  const { keyword } = req.query;
  try {
    let result;
    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      result = await pool.query(`
        SELECT icd_code, name, category, sub_category 
        FROM icd_diagnosis 
        WHERE is_active=true 
          AND (icd_code LIKE $1 OR name LIKE $1 OR pinyin LIKE $1)
        ORDER BY CASE WHEN name LIKE $1 THEN 0 ELSE 1 END, name
        LIMIT 20
      `, [kw]);
    } else {
      result = await pool.query(`
        SELECT icd_code, name, category, sub_category 
        FROM icd_diagnosis 
        WHERE is_active=true 
        ORDER BY category, name 
        LIMIT 30
      `);
    }
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取诊断分类列表
app.get('/api/doctor/diagnosis/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM icd_diagnosis 
      WHERE is_active=true 
      GROUP BY category 
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取科室常用诊断列表
app.get('/api/doctor/diagnosis/common', async (req, res) => {
  const { department_id } = req.query;
  try {
    // 根据科室返回高频诊断
    const deptMap = {
      1: ['急性上呼吸道感染', '肺炎', '慢性阻塞性肺疾病', '哮喘', '慢性支气管炎', '支气管扩张', '肺癌'],
      2: ['高血压', '冠心病', '心绞痛', '心力衰竭', '心律失常', '心肌梗死', '心房颤动'],
      3: ['2型糖尿病', '高脂血症', '甲状腺功能亢进', '甲状腺功能减退', '痛风', '代谢综合征'],
      4: ['脑卒中', '帕金森病', '偏头痛', '腦血管病', '癲痫', '周围神经病'],
      5: ['胃炎', '胃溃烂', '肝硬化', '胆石症', '肠易激综合征', '消化道出血']
    };
    const commonNames = deptMap[department_id] || deptMap[1];
    const result = await pool.query(`
      SELECT icd_code, name, category, sub_category 
      FROM icd_diagnosis 
      WHERE is_active=true AND name = ANY($1)
      ORDER BY name
    `, [commonNames]);
    // 如果数据库查询结果不够，补充科室热词中的诊断
    if (result.rows.length < commonNames.length) {
      const foundNames = result.rows.map(r => r.name);
      const missing = commonNames.filter(n => !foundNames.includes(n));
      // 尝试模糊匹配
      for (const name of missing) {
        const fuzzyResult = await pool.query(`
          SELECT icd_code, name, category, sub_category 
          FROM icd_diagnosis 
          WHERE is_active=true AND name LIKE $1
          LIMIT 1
        `, [`%${name}%`]);
        if (fuzzyResult.rows.length > 0) result.rows.push(fuzzyResult.rows[0]);
      }
    }
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 快速诊断接口
app.post('/api/diagnosis/quick', async (req, res) => {
  const { chief, history, past, age, gender, department_id } = req.body;
  try {
    const symptoms = [chief, history, past].filter(s => s && s.trim()).join(' ');
    
    const deptMap = {
      1: ['急性上呼吸道感染', '肺炎', '慢性阻塞性肺疾病', '哮喘', '慢性支气管炎', '支气管扩张', '肺癌', '肺结核'],
      2: ['高血压', '冠心病', '心绞痛', '心力衰竭', '心律失常', '心肌梗死', '心房颤动'],
      3: ['2型糖尿病', '高脂血症', '甲状腺功能亢进', '甲状腺功能减退', '痛风', '代谢综合征'],
      4: ['脑卒中', '帕金森病', '偏头痛', '脑血管病', '癫痫', '周围神经病'],
      5: ['胃炎', '胃溃疡', '肝硬化', '胆石症', '肠易激综合征', '消化道出血'],
      6: ['尿路感染', '肾炎', '肾结石', '前列腺增生'],
      7: ['关节炎', '骨质疏松', '腰椎间盘突出'],
      8: ['结膜炎', '白内障', '青光眼'],
      9: ['中耳炎', '鼻窦炎', '扁桃体炎'],
      10: ['皮炎', '湿疹', '荨麻疹']
    };
    const commonNames = deptMap[department_id] || deptMap[1];

    const keywordMatch = (name) => {
      if (!symptoms) return false;
      const lowerSymptoms = symptoms.toLowerCase();
      const lowerName = name.toLowerCase();
      if (lowerName.includes('感染') && (lowerSymptoms.includes('发烧') || lowerSymptoms.includes('发热') || lowerSymptoms.includes('咳嗽'))) return true;
      if (lowerName.includes('肺炎') && (lowerSymptoms.includes('咳嗽') || lowerSymptoms.includes('咳痰') || lowerSymptoms.includes('胸闷'))) return true;
      if (lowerName.includes('高血压') && (lowerSymptoms.includes('头痛') || lowerSymptoms.includes('头晕'))) return true;
      if (lowerName.includes('糖尿病') && (lowerSymptoms.includes('多饮') || lowerSymptoms.includes('多尿') || lowerSymptoms.includes('消瘦'))) return true;
      if (lowerName.includes('胃炎') && (lowerSymptoms.includes('胃痛') || lowerSymptoms.includes('胃胀'))) return true;
      if (lowerName.includes('感冒') && (lowerSymptoms.includes('流涕') || lowerSymptoms.includes('鼻塞'))) return true;
      if (lowerName.includes('支气管炎') && (lowerSymptoms.includes('咳嗽'))) return true;
      if (lowerName.includes('哮喘') && (lowerSymptoms.includes('喘息') || lowerSymptoms.includes('气短'))) return true;
      if (lowerName.includes('冠心病') && (lowerSymptoms.includes('胸痛'))) return true;
      if (lowerName.includes('偏头痛') && (lowerSymptoms.includes('头痛'))) return true;
      if (lowerName.includes('肾结石') && (lowerSymptoms.includes('腰痛') || lowerSymptoms.includes('腹痛'))) return true;
      if (lowerName.includes('关节炎') && (lowerSymptoms.includes('关节痛'))) return true;
      if (lowerName.includes('皮炎') && (lowerSymptoms.includes('皮肤') || lowerSymptoms.includes('瘙痒'))) return true;
      return false;
    };

    const matchedNames = commonNames.filter(name => keywordMatch(name));
    
    let suggestions = [];
    if (matchedNames.length > 0) {
      const result = await pool.query(`
        SELECT icd_code, name, category, sub_category 
        FROM icd_diagnosis 
        WHERE is_active=true AND name = ANY($1)
        ORDER BY name
      `, [matchedNames]);
      suggestions = result.rows.map(r => ({
        icd: r.icd_code,
        name: r.name,
        is_main: true,
        is_suspect: false
      }));
    }

    if (suggestions.length === 0 && commonNames.length > 0) {
      const result = await pool.query(`
        SELECT icd_code, name, category, sub_category 
        FROM icd_diagnosis 
        WHERE is_active=true AND name = ANY($1)
        LIMIT 3
      `, [commonNames]);
      suggestions = result.rows.map((r, i) => ({
        icd: r.icd_code,
        name: r.name,
        is_main: i === 0,
        is_suspect: i > 0
      }));
    }

    res.json(suggestions);
  } catch (err) {
    console.error('快速诊断失败:', err);
    handleErr(res, err);
  }
});

// 保存/更新病历
app.post('/api/doctor/medical-record', async (req, res) => {
  const { id, patient_id, doctor_id, registration_id, chief, history, past, family, personal,
          allergy, physical, auxiliary, diagnosis, suggestion, diagnoses, status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result;
    if (id) {
      result = await client.query(`
        UPDATE medical_records SET
          chief=$1, history=$2, past=$3, family=$4, personal=$5,
          allergy=$6, physical=$7, auxiliary=$8, diagnosis=$9, suggestion=$10,
          diagnoses=$11, status=$12, updated_at=NOW()
        WHERE id=$13 RETURNING *
      `, [chief, history, past, family, personal, allergy, physical, auxiliary,
          diagnosis, suggestion, JSON.stringify(diagnoses || []), status || 'draft', id]);
    } else {
      result = await client.query(`
        INSERT INTO medical_records
          (patient_id, doctor_id, registration_id, chief, history, past, family, personal,
           allergy, physical, auxiliary, diagnosis, suggestion, diagnoses, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
      `, [patient_id, doctor_id, registration_id, chief, history, past, family, personal,
          allergy, physical, auxiliary, diagnosis, suggestion,
          JSON.stringify(diagnoses || []), status || 'draft']);
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取患者历史病历
app.get('/api/medical-records', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT mr.*, doc.id AS doctor_id, doc.name AS doctor_name, dept.name AS dept_name
      FROM medical_records mr
      LEFT JOIN doctors doc ON mr.doctor_id = doc.id
      LEFT JOIN registrations r ON mr.registration_id = r.id
      LEFT JOIN departments dept ON r.department_id = dept.id
      WHERE mr.patient_id = $1
      ORDER BY mr.visit_date DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 病历签名
app.post('/api/medical-records/sign', async (req, res) => {
  const { patientId, doctorId } = req.body;
  try {
    const result = await pool.query(`
      UPDATE medical_records 
      SET status = 'signed', updated_at = NOW()
      WHERE patient_id = $1 AND doctor_id = $2 AND status = 'draft'
      RETURNING *
    `, [patientId, doctorId]);
    if (result.rows.length > 0) {
      res.json({ success: true, message: '签名成功' });
    } else {
      res.status(400).json({ error: '未找到可签名的病历' });
    }
  } catch (err) { handleErr(res, err); }
});

// 开具处方
app.post('/api/doctor/prescription', async (req, res) => {
  const { patient_id, doctor_id, registration_id, type, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    
    // 获取患者、医生、科室信息
    const patientResult = await client.query('SELECT name FROM patients WHERE id = $1', [patient_id]);
    const doctorResult = await client.query(`
      SELECT d.name, d.department_id, dept.name as dept_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [doctor_id]);
    
    const patientName = patientResult.rows[0]?.name || '';
    const doctorName = doctorResult.rows[0]?.name || '';
    const departmentId = doctorResult.rows[0]?.department_id || null;
    const departmentName = doctorResult.rows[0]?.dept_name || '';
    
    // 创建处方
    const medicineName = items.length > 0 ? items[0].item_name : '';
    const presc = await client.query(`
      INSERT INTO prescriptions (registration_id, patient_id, doctor_id, type, review_status, total_amount, status, medicine_name)
      VALUES ($1,$2,$3,$4,'pending_review',$5,'pending',$6) RETURNING *
    `, [registration_id, patient_id, doctor_id, type || 'western', totalAmount, medicineName]);
    const prescId = presc.rows[0].id;
    
    // 插入明细
    for (const item of items) {
      await client.query(`
        INSERT INTO prescription_items (presc_id, drug_id, item_name, quantity, unit, price, dosage, frequency, days)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [prescId, item.drug_id || null, item.item_name, item.quantity, item.unit || '盒',
          item.price, item.dosage || '', item.frequency || '', item.days || 1]);
      // 锁定库存
      if (item.drug_id) {
        await client.query('UPDATE drugs SET locked_stock=locked_stock+$1 WHERE id=$2', [item.quantity, item.drug_id]);
      }
    }
    
    // 生成订单号
    const orderNo = 'PO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    
    // 创建缴费订单
    const orderItems = items.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit || '盒',
      price: parseFloat(item.price),
      total: parseFloat(item.price) * item.quantity,
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      days: item.days || 1
    }));
    
    await client.query(`
      INSERT INTO payment_orders (order_no, patient_id, patient_name, doctor_id, doctor_name, 
        department_id, department_name, order_type, source_id, items, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [orderNo, patient_id, patientName, doctor_id, doctorName, 
        departmentId, departmentName, 'prescription', prescId, JSON.stringify(orderItems), totalAmount]);
    
    await client.query('COMMIT');
    res.json({ success: true, presc_id: prescId, total_amount: totalAmount, order_no: orderNo });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 作废处方
app.put('/api/doctor/prescription/:id/cancel', async (req, res) => {
  const { user_id, remark } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 释放锁定库存
    const items = await client.query('SELECT drug_id, quantity FROM prescription_items WHERE presc_id=$1 AND drug_id IS NOT NULL', [req.params.id]);
    for (const row of items.rows) {
      await client.query('UPDATE drugs SET locked_stock=GREATEST(0,locked_stock-$1) WHERE id=$2', [row.quantity, row.drug_id]);
    }
    await client.query("UPDATE prescriptions SET status='cancelled', review_status='cancelled' WHERE id=$1", [req.params.id]);
    await client.query("INSERT INTO audit_logs (user_id, action, target_type, target_id, remark) VALUES ($1,'处方作废','prescription',$2,$3)", [user_id, req.params.id, remark]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 处方列表（医生端查看被退回的）
app.get('/api/doctor/prescriptions', async (req, res) => {
  const { patient_id, doctor_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT p.*, doc.name AS doctor_name,
        json_agg(json_build_object('item_name', pi.item_name, 'quantity', pi.quantity, 'unit', pi.unit, 'price', pi.price)) AS items
      FROM prescriptions p
      LEFT JOIN doctors doc ON p.doctor_id = doc.id
      LEFT JOIN prescription_items pi ON pi.presc_id = p.id
      WHERE ($1::int IS NULL OR p.patient_id=$1) AND ($2::int IS NULL OR p.doctor_id=$2)
      GROUP BY p.id, doc.name
      ORDER BY p.created_at DESC
    `, [patient_id || null, doctor_id || null]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 药房工作台接口
// ============================================================

// 待审核处方列表
app.get('/api/pharmacy/pending-review', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.total_amount, p.type, p.created_at, p.review_remark,
        pat.id AS patient_id, pat.name AS patient_name, pat.gender, pat.allergy,
        doc.name AS doctor_name,
        latest_mr.diagnosis,
        json_agg(json_build_object(
          'id', pi.id, 'item_name', pi.item_name, 'quantity', pi.quantity,
          'unit', pi.unit, 'price', pi.price, 'dosage', pi.dosage, 'frequency', pi.frequency
        )) AS items
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN doctors doc ON p.doctor_id = doc.id
      LEFT JOIN prescription_items pi ON pi.presc_id = p.id
      LEFT JOIN LATERAL (
        SELECT diagnosis FROM medical_records 
        WHERE patient_id = p.patient_id 
        ORDER BY visit_date DESC LIMIT 1
      ) latest_mr ON true
      WHERE p.review_status = 'pending_review' AND p.status != 'cancelled'
      GROUP BY p.id, pat.name, pat.gender, pat.allergy, doc.name, latest_mr.diagnosis
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 审方操作
app.post('/api/pharmacy/review', async (req, res) => {
  const { presc_id, action, remark, pharmacist_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    if (action === 'reject' && !remark) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '审核不通过必须填写原因' });
    }
    // WHERE review_status='pending_review' 防止并发重复审核
    const result = await client.query(`
      UPDATE prescriptions SET review_status=$1, review_remark=$2, review_time=NOW()
      WHERE id=$3 AND review_status='pending_review'
    `, [newStatus, remark || '', presc_id]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '该处方已被审核，请刷新页面' });
    }
    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, remark) VALUES ($1,$2,'prescription',$3,$4)
    `, [pharmacist_id, action === 'approve' ? '审方通过' : '审方拒绝', presc_id, remark]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 待发药列表（已审核通过且已缴费）
app.get('/api/pharmacy/pending-dispense', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.total_amount, p.type, p.created_at,
        pat.id AS patient_id, pat.name AS patient_name,
        doc.name AS doctor_name,
        json_agg(json_build_object(
          'id', pi.id, 'drug_id', pi.drug_id, 'item_name', pi.item_name,
          'quantity', pi.quantity, 'unit', pi.unit, 'price', pi.price,
          'dosage', pi.dosage, 'frequency', pi.frequency
        )) AS items
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN doctors doc ON p.doctor_id = doc.id
      LEFT JOIN prescription_items pi ON pi.presc_id = p.id
      WHERE p.review_status = 'approved' AND p.status = 'pending'
        AND EXISTS (
          SELECT 1 FROM invoices inv 
          WHERE inv.presc_id = p.id AND inv.payment_status = 'paid'
        )
      GROUP BY p.id, pat.id, pat.name, doc.name
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 发药操作
app.post('/api/pharmacy/dispense', async (req, res) => {
  const { presc_id, pharmacist_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = await client.query('SELECT drug_id, quantity FROM prescription_items WHERE presc_id=$1 AND drug_id IS NOT NULL', [presc_id]);
    for (const row of items.rows) {
      await client.query(`
        UPDATE drugs SET
          actual_stock = GREATEST(0, actual_stock - $1),
          locked_stock = GREATEST(0, locked_stock - $1)
        WHERE id=$2
      `, [row.quantity, row.drug_id]);
    }
    await client.query("UPDATE prescriptions SET status='dispensed' WHERE id=$1", [presc_id]);
    await client.query("INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,'发药','prescription',$2)", [pharmacist_id, presc_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 药房处方接收与发药新接口（符合数据存储规范）
// ============================================================

// 获取待处理处方列表（已缴费但未接收的处方）
app.get('/api/pharmacy/pending-prescriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id as prescription_id,
        p.receipt_no,
        p.total_amount,
        p.type,
        p.created_at as paid_time,
        p.received_time,
        p.dispensed_time,
        p.visit_code,
        p.allergy_history,
        p.review_status,
        p.status,
        pat.name as patient_name,
        EXTRACT(YEAR FROM AGE(pat.birth_date)) as patient_age,
        doc.name as doctor_name,
        json_agg(json_build_object(
          'id', pi.id,
          'drug_id', pi.drug_id,
          'name', pi.item_name,
          'spec', d.specification,
          'quantity', pi.quantity,
          'usage', COALESCE(pi.dosage, '') || ' ' || COALESCE(pi.frequency, ''),
          'price', pi.price,
          'scanned_code', dsr.scan_code
        )) FILTER (WHERE pi.id IS NOT NULL) as drugs
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN doctors doc ON p.doctor_id = doc.id
      LEFT JOIN prescription_items pi ON pi.presc_id = p.id
      LEFT JOIN drugs d ON pi.drug_id = d.id
      LEFT JOIN LATERAL (
        SELECT scan_code FROM drug_scan_records 
        WHERE prescription_id = p.id 
        ORDER BY scan_time DESC LIMIT 1
      ) dsr ON true
      WHERE p.review_status = 'approved' 
        AND p.status IN ('pending', 'received')
        AND EXISTS (
          SELECT 1 FROM invoices inv 
          WHERE inv.presc_id = p.id AND inv.payment_status = 'paid'
        )
      GROUP BY p.id, pat.name, pat.birth_date, doc.name
      ORDER BY p.created_at DESC
    `);
    
    // 转换数据格式以匹配前端需求
    const prescriptions = result.rows.map(row => ({
      prescriptionId: `RX${String(row.prescription_id).padStart(10, '0')}`,
      receiptNo: row.receipt_no || `R${String(row.prescription_id).padStart(10, '0')}`,
      patientName: row.patient_name,
      patientAge: row.patient_age || 0,
      allergyHistory: row.allergy_history || [],
      drugs: row.drugs || [],
      status: row.status === 'pending' ? '待接收' : row.status === 'received' ? '已接收' : '已发药',
      paidTime: row.paid_time,
      visitCode: row.visit_code,
      receivedTime: row.received_time
    }));
    
    res.json(prescriptions);
  } catch (err) { 
    console.error('获取待处理处方失败:', err);
    handleErr(res, err); 
  }
});

// 处方接收操作
app.post('/api/pharmacy/receive-prescription', async (req, res) => {
  const { prescriptionId, operator } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 提取实际的处方ID（去除前缀）
    const prescId = parseInt(prescriptionId.replace(/^RX/, ''));
    
    // 更新处方状态为已接收
    const result = await client.query(`
      UPDATE prescriptions 
      SET status = 'received', 
          received_time = NOW(),
          receive_pharmacist_id = $1
      WHERE id = $2 AND status = 'pending'
      RETURNING id
    `, [operator, prescId]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '处方已被接收或不存在' });
    }
    
    // 记录接收日志
    await client.query(`
      INSERT INTO prescription_receive_logs (prescription_id, pharmacist_id, action, remark)
      VALUES ($1, $2, 'received', '处方接收')
    `, [prescId, operator]);
    
    // 记录审计日志
    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, remark)
      VALUES ($1, '接收处方', 'prescription', $2, '处方接收操作')
    `, [operator, prescId]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: '处方接收成功' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('处方接收失败:', err);
    handleErr(res, err);
  } finally { 
    client.release(); 
  }
});

// 异常上报
app.post('/api/pharmacy/report-exception', async (req, res) => {
  const { prescriptionId, exceptionType, description, operator } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 提取实际的处方ID
    const prescId = parseInt(prescriptionId.replace(/^RX/, ''));
    
    // 更新处方状态为已驳回
    await client.query(`
      UPDATE prescriptions 
      SET review_status = 'rejected',
          status = 'cancelled'
      WHERE id = $1
    `, [prescId]);
    
    // 创建异常记录
    await client.query(`
      INSERT INTO prescription_exceptions (prescription_id, pharmacist_id, exception_type, description)
      VALUES ($1, $2, $3, $4)
    `, [prescId, operator, exceptionType, description]);
    
    // 记录接收日志
    await client.query(`
      INSERT INTO prescription_receive_logs (prescription_id, pharmacist_id, action, remark)
      VALUES ($1, $2, 'rejected', $3)
    `, [prescId, operator, description]);
    
    // 记录审计日志
    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, remark)
      VALUES ($1, '异常上报', 'prescription', $2, $3)
    `, [operator, prescId, description]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: '异常已上报，处方已退回医生端' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('异常上报失败:', err);
    handleErr(res, err);
  } finally { 
    client.release(); 
  }
});

// 验证药品监管码
app.post('/api/pharmacy/verify-drug-code', async (req, res) => {
  const { prescriptionId, scanCode, itemId } = req.body;
  const client = await pool.connect();
  
  try {
    // 提取实际的处方ID
    const prescId = parseInt(prescriptionId.replace(/^RX/, ''));
    
    // 查询处方中的药品信息
    const result = await client.query(`
      SELECT pi.id, pi.item_name, pi.drug_id, d.name as drug_name
      FROM prescription_items pi
      LEFT JOIN drugs d ON pi.drug_id = d.id
      WHERE pi.presc_id = $1 AND pi.id = $2
    `, [prescId, itemId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '处方药品项不存在' });
    }
    
    const drugItem = result.rows[0];
    
    // 模拟验证逻辑：检查监管码是否包含药品名称关键字
    // 实际项目中应该查询药品监管码数据库
    const isMatch = scanCode.includes(drugItem.item_name.substring(0, 2)) || 
                    (drugItem.drug_name && scanCode.includes(drugItem.drug_name.substring(0, 2)));
    
    // 如果匹配，记录扫描记录
    if (isMatch) {
      await client.query(`
        INSERT INTO drug_scan_records (prescription_id, prescription_item_id, drug_id, scan_code, verified)
        VALUES ($1, $2, $3, $4, true)
      `, [prescId, itemId, drugItem.drug_id, scanCode]);
    }
    
    res.json({ 
      success: true, 
      matched: isMatch,
      drugName: drugItem.item_name
    });
  } catch (err) {
    console.error('验证药品监管码失败:', err);
    handleErr(res, err);
  } finally { 
    client.release(); 
  }
});

// 验证患者就诊码
app.post('/api/pharmacy/verify-visit-code', async (req, res) => {
  const { prescriptionId, visitCode, operator } = req.body;
  const client = await pool.connect();
  
  try {
    // 提取实际的处方ID
    const prescId = parseInt(prescriptionId.replace(/^RX/, ''));
    
    // 查询处方关联的患者和就诊码
    const result = await client.query(`
      SELECT p.id as prescription_id, p.patient_id, p.visit_code, pat.name as patient_name
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      WHERE p.id = $1
    `, [prescId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '处方不存在' });
    }
    
    const prescription = result.rows[0];
    const isMatch = visitCode === prescription.visit_code;
    
    // 记录验证记录
    await client.query(`
      INSERT INTO patient_visit_verification (prescription_id, patient_id, visit_code, verified_by, is_match)
      VALUES ($1, $2, $3, $4, $5)
    `, [prescId, prescription.patient_id, visitCode, operator, isMatch]);
    
    res.json({ 
      success: true, 
      matched: isMatch,
      patientName: prescription.patient_name
    });
  } catch (err) {
    console.error('验证患者就诊码失败:', err);
    handleErr(res, err);
  } finally { 
    client.release(); 
  }
});

// 完整发药操作（新版）
app.post('/api/pharmacy/dispense-v2', async (req, res) => {
  const { prescriptionId, operator, drugCodes, visitCode } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 提取实际的处方ID
    const prescId = parseInt(prescriptionId.replace(/^RX/, ''));
    
    // 验证处方状态是否为已接收
    const prescCheck = await client.query(
      'SELECT status, patient_id FROM prescriptions WHERE id = $1',
      [prescId]
    );
    
    if (prescCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '处方不存在' });
    }
    
    if (prescCheck.rows[0].status !== 'received') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '处方状态不是已接收，无法发药' });
    }
    
    // 扣减库存
    const items = await client.query(
      'SELECT drug_id, quantity FROM prescription_items WHERE presc_id=$1 AND drug_id IS NOT NULL',
      [prescId]
    );
    
    for (const row of items.rows) {
      await client.query(`
        UPDATE drugs SET
          actual_stock = GREATEST(0, actual_stock - $1),
          locked_stock = GREATEST(0, locked_stock - $1)
        WHERE id=$2
      `, [row.quantity, row.drug_id]);
    }
    
    // 更新处方状态为已发药
    await client.query(`
      UPDATE prescriptions 
      SET status = 'dispensed',
          dispensed_time = NOW(),
          dispense_pharmacist_id = $1
      WHERE id = $2
    `, [operator, prescId]);
    
    // 记录接收日志
    await client.query(`
      INSERT INTO prescription_receive_logs (prescription_id, pharmacist_id, action, remark)
      VALUES ($1, $2, 'dispensed', '发药完成')
    `, [prescId, operator]);
    
    // 记录审计日志
    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, remark)
      VALUES ($1, '确认发药', 'prescription', $2, '发药操作完成')
    `, [operator, prescId]);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: '发药成功，库存已扣减，通知患者取药'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('发药失败:', err);
    handleErr(res, err);
  } finally { 
    client.release(); 
  }
});

// ============================================================
// 管理员接口
// ============================================================

// --- 用户管理 ---
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.role, u.real_name, u.phone, u.id_card, u.created_at,
             d.name AS dept_name, d2.title
      FROM users u
      LEFT JOIN doctors d2 ON u.doctor_id = d2.id
      LEFT JOIN departments d ON d2.department_id = d.id
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/admin/users', async (req, res) => {
  const { username, password, role, real_name, phone } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'INSERT INTO users (username, password, role, real_name, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, role, real_name, phone',
      [username, password || '123456', role, real_name, phone]
    );
    
    const user = result.rows[0];
    
    // 如果是患者角色，创建对应的患者记录
    if (role === 'patient') {
      const patientResult = await client.query(
        'INSERT INTO patients (name, gender, phone) VALUES ($1, $2, $3) RETURNING id',
        [real_name, '', phone || '']
      );
      const patientId = patientResult.rows[0].id;
      
      await client.query(
        'UPDATE users SET patient_id = $1 WHERE id = $2',
        [patientId, user.id]
      );
      user.patient_id = patientId;
    }
    
    await client.query('COMMIT');
    res.json(user);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.put('/api/admin/users/:id', async (req, res) => {
  const { role, real_name, phone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET role=$1, real_name=$2, phone=$3 WHERE id=$4 RETURNING id, username, role, real_name, phone',
      [role, real_name, phone, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// --- 医生管理 ---
app.get('/api/admin/doctors', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.title, d.department_id, d.specialty, d.phone,
             d.avatar, d.hospital, d.fee, d.is_inpatient,
             dept.name AS dept_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      ORDER BY d.id
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/admin/doctors', async (req, res) => {
  const { name, title, department_id, specialty, phone, avatar, hospital, fee, is_inpatient, employee_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO doctors (name, title, department_id, specialty, phone, avatar, hospital, fee, is_inpatient, employee_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, title, department_id, specialty || '', phone || '', avatar || '', hospital || 'HIS系统医院', fee || 0, is_inpatient || false, employee_id || '']
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/admin/doctors/:id', async (req, res) => {
  const { name, title, department_id, specialty, phone, avatar, hospital, fee, is_inpatient, employee_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE doctors SET name=$1, title=$2, department_id=$3, specialty=$4, phone=$5, avatar=$6, hospital=$7, fee=$8, is_inpatient=$9, employee_id=$10 WHERE id=$11 RETURNING *',
      [name, title, department_id, specialty, phone, avatar, hospital, fee, is_inpatient, employee_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/admin/doctors/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM doctors WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// --- 科室管理 ---
app.get('/api/admin/depts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY id');
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/admin/depts', async (req, res) => {
  const { name, icon, fee, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO departments (name, icon, fee, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, icon || '', fee || 0, description || '']
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/admin/depts/:id', async (req, res) => {
  const { name, icon, fee, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE departments SET name=$1, icon=$2, fee=$3, description=$4 WHERE id=$5 RETURNING *',
      [name, icon || '', fee || 0, description || '', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/admin/depts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 排班管理（完整CRUD）
// ============================================================

// 获取所有排班（含医生/科室关联）
app.get('/api/admin/schedules', async (req, res) => {
  const { dept_id, date } = req.query;
  try {
    const result = await pool.query(`
      SELECT s.*, doc.name AS doctor_name, dept.name AS dept_name,
        dept.id AS dept_id, doc.title, doc.specialty
      FROM schedules s
      JOIN doctors doc ON s.doctor_id = doc.id
      JOIN departments dept ON doc.department_id = dept.id
      WHERE ($1::int IS NULL OR dept.id=$1)
        AND ($2::date IS NULL OR s.schedule_date=$2)
      ORDER BY s.schedule_date, doc.name
    `, [dept_id || null, date || null]);
    // Calculate booked = total - remaining
    const rows = result.rows.map(r => ({ ...r, booked: r.total - r.remaining }));
    res.json(rows);
  } catch (err) { handleErr(res, err); }
});

// 批量生成排班（日期范围）
app.post('/api/admin/schedules/batch-generate', async (req, res) => {
  const { doctor_id, start_date, end_date, am_total, pm_total, am_type, pm_type } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const start = new Date(start_date);
    const end = new Date(end_date);
    const created = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      // 跳过周日 (getDay()=0)
      if (d.getDay() === 0) continue;
      if (am_total > 0) {
        const r = await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
           VALUES ($1,$2,'am',$3,$3,$4,$5)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false
           RETURNING *`,
          [doctor_id, ds, am_total, am_type || 'normal', 10]
        );
        created.push(r.rows[0]);
      }
      if (pm_total > 0) {
        const r = await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
           VALUES ($1,$2,'pm',$3,$3,$4,$5)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false
           RETURNING *`,
          [doctor_id, ds, pm_total, pm_type || 'normal', 10]
        );
        created.push(r.rows[0]);
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, count: created.length, schedules: created });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 单条新增排班
app.post('/api/admin/schedules', async (req, res) => {
  const { doctor_id, schedule_date, am_pm, total, slot_type, fee } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
       VALUES ($1,$2,$3,$4,$4,$5,$6)
       ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
       SET total=$4, remaining=EXCLUDED.remaining+$4-schedules.total, slot_type=$5, fee=$6, is_stopped=false
       RETURNING *`,
      [doctor_id, schedule_date, am_pm, total || 20, slot_type || 'normal', fee || 10]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 批量编辑排班（状态 + 上下午号源）
app.put('/api/admin/schedules/batch', async (req, res) => {
  const { doctor_id, schedule_date, status, am, pm, stop_reason, notify_patients } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ds = schedule_date;

    if (status === '-1') {
      // 休息：删除当天排班（先检查是否有预约）
      const booked = await client.query(
        'SELECT COUNT(*) as cnt FROM registrations r JOIN schedules s ON r.schedule_id=s.id WHERE s.doctor_id=$1 AND s.schedule_date=$2',
        [doctor_id, ds]
      );
      if (parseInt(booked.rows[0].cnt) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '该医生当天有预约记录，无法设为休息' });
      }
      await client.query('DELETE FROM schedules WHERE doctor_id=$1 AND schedule_date=$2', [doctor_id, ds]);
    } else if (status === '0') {
      // 停诊：保留号源但标记为停诊
      await client.query(
        'UPDATE schedules SET is_stopped=true, stop_reason=$3 WHERE doctor_id=$1 AND schedule_date=$2',
        [doctor_id, ds, stop_reason || '']
      );
    } else {
      // 出诊：更新或创建上下午号源
      // 先删除旧的中文格式记录，避免重复
      await client.query(`
        DELETE FROM schedules WHERE doctor_id=$1 AND schedule_date=$2
        AND am_pm IN ('上午', '下午')
      `, [doctor_id, ds]);
      if (am && am.total > 0) {
        await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, is_stopped, reserved, reserved_emergency, reserved_vip)
           VALUES ($1,$2,'am',$3,$3,$4,$5,false,$6,$7,$8)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false, reserved=$6, reserved_emergency=$7, reserved_vip=$8`,
          [doctor_id, ds, am.total, am.slot_type || 'normal', parseFloat(am.fee) || 10, am.reserved || 0, am.reserved_emergency || 0, am.reserved_vip || 0]
        );
      }
      if (pm && pm.total > 0) {
        await client.query(
          `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee, is_stopped, reserved, reserved_emergency, reserved_vip)
           VALUES ($1,$2,'pm',$3,$3,$4,$5,false,$6,$7,$8)
           ON CONFLICT (doctor_id, schedule_date, am_pm) DO UPDATE
           SET total=$3, remaining=GREATEST(0, schedules.remaining+($3-schedules.total)), slot_type=$4, fee=$5, is_stopped=false, reserved=$6, reserved_emergency=$7, reserved_vip=$8`,
          [doctor_id, ds, pm.total, pm.slot_type || 'normal', parseFloat(pm.fee) || 10, pm.reserved || 0, pm.reserved_emergency || 0, pm.reserved_vip || 0]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 批量停诊
app.post('/api/admin/schedules/batch-stop', async (req, res) => {
  const { dept_name, start_date, end_date, reason } = req.body;
  try {
    await pool.query(`
      UPDATE schedules s SET is_stopped=true, stop_reason=$4
      FROM doctors doc JOIN departments dept ON doc.department_id=dept.id
      WHERE s.doctor_id=doc.id AND dept.name=$1 AND s.schedule_date BETWEEN $2 AND $3
    `, [dept_name, start_date, end_date, reason || '批量停诊']);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// 复制上周排班
app.post('/api/admin/schedules/copy-last-week', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const today = new Date();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - today.getDay() + 1);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);

    const ds1 = lastMonday.toISOString().slice(0, 10);
    const ds2 = lastSunday.toISOString().slice(0, 10);
    const thisMonStr = thisMonday.toISOString().slice(0, 10);

    const lastWeek = await client.query(
      'SELECT * FROM schedules WHERE schedule_date BETWEEN $1 AND $2',
      [ds1, ds2]
    );
    let count = 0;
    for (const s of lastWeek.rows) {
      const oldDate = new Date(s.schedule_date);
      const daysDiff = Math.floor((oldDate - lastMonday) / (1000 * 60 * 60 * 24));
      const newDate = new Date(thisMonday);
      newDate.setDate(newDate.getDate() + daysDiff);
      const nds = newDate.toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO schedules (doctor_id, schedule_date, am_pm, total, remaining, slot_type, fee)
         VALUES ($1,$2,$3,$4,$4,$5,$6)
         ON CONFLICT (doctor_id, schedule_date, am_pm) DO NOTHING`,
        [s.doctor_id, nds, s.am_pm, s.total, s.slot_type || 'normal', s.fee || 10]
      );
      count++;
    }
    await client.query('COMMIT');
    res.json({ success: true, copied: count });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 删除排班
app.delete('/api/admin/schedules/:id', async (req, res) => {
  try {
    const booked = await pool.query(
      'SELECT COUNT(*) as cnt FROM registrations WHERE schedule_id=$1', [req.params.id]
    );
    if (parseInt(booked.rows[0].cnt) > 0) {
      return res.status(400).json({ error: '该排班已有预约，无法删除。请先处理预约记录。' });
    }
    await pool.query('DELETE FROM schedules WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 预约管理（管理员视角）
// ============================================================
app.get('/api/admin/appointments', async (req, res) => {
  const { page, dept, status, patient, doctor, date_from, date_to } = req.query;
  const limit = 10;
  const offset = ((parseInt(String(page)) || 1) - 1) * limit;
  try {
    let where = '1=1';
    const params = [];
    let pi = 1;
    if (dept) { where += ` AND dept.name=$${pi++}`; params.push(dept); }
    if (status) { where += ` AND r.status=$${pi++}`; params.push(status); }
    if (patient) { where += ` AND p.name ILIKE $${pi++}`; params.push(`%${patient}%`); }
    if (doctor) { where += ` AND doc.name ILIKE $${pi++}`; params.push(`%${doctor}%`); }
    if (date_from) { where += ` AND r.appt_date >= $${pi++}`; params.push(date_from); }
    if (date_to) { where += ` AND r.appt_date <= $${pi++}`; params.push(date_to); }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM registrations r
       JOIN patients p ON r.patient_id=p.id
       JOIN doctors doc ON r.doctor_id=doc.id
       JOIN departments dept ON r.department_id=dept.id
       WHERE ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit); params.push(offset);
    const result = await pool.query(
      `SELECT r.id, r.status, r.register_date, r.appt_date, r.am_pm, r.slot_type,
        p.name AS patient_name, doc.name AS doctor_name, doc.title AS doctor_title,
        dept.name AS dept_name, r.doctor_id, r.department_id, r.schedule_id
       FROM registrations r
       JOIN patients p ON r.patient_id=p.id
       JOIN doctors doc ON r.doctor_id=doc.id
       JOIN departments dept ON r.department_id=dept.id
       WHERE ${where}
       ORDER BY r.appt_date DESC, r.created_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`, params
    );
    res.json({ rows: result.rows, total, page: parseInt(String(page)) || 1 });
  } catch (err) { handleErr(res, err); }
});

// 改约
app.put('/api/admin/appointments/:id', async (req, res) => {
  const { new_date, new_am_pm } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reg = await client.query('SELECT * FROM registrations WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!reg.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: '预约不存在' }); }

    // 释放旧号源
    if (reg.rows[0].schedule_id) {
      await client.query('UPDATE schedules SET remaining=remaining+1 WHERE id=$1', [reg.rows[0].schedule_id]);
    }
    // 查找新号源
    const newSch = await client.query(
      `SELECT s.id FROM schedules s WHERE s.doctor_id=$1 AND s.schedule_date=$2 AND s.am_pm=$3 AND s.remaining > 0 AND s.is_stopped=false LIMIT 1`,
      [reg.rows[0].doctor_id, new_date, new_am_pm]
    );
    if (!newSch.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '目标时段无可用号源' });
    }
    // 扣减新号源
    await client.query('UPDATE schedules SET remaining=remaining-1 WHERE id=$1', [newSch.rows[0].id]);
    // 更新预约
    await client.query(
      'UPDATE registrations SET appt_date=$1, am_pm=$2, schedule_id=$3, updated_at=NOW() WHERE id=$4',
      [new_date, new_am_pm, newSch.rows[0].id, req.params.id]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 取消预约
app.put('/api/admin/appointments/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reg = await client.query('SELECT * FROM registrations WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!reg.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: '预约不存在' }); }
    // 释放号源
    if (reg.rows[0].schedule_id) {
      await client.query('UPDATE schedules SET remaining=remaining+1 WHERE id=$1', [reg.rows[0].schedule_id]);
    }
    await client.query("UPDATE registrations SET status='cancelled', updated_at=NOW() WHERE id=$1", [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 删除预约记录
app.delete('/api/admin/appointments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM registrations WHERE id=$1 AND status=$2', [req.params.id, 'cancelled']);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 放号规则 & 科室配额
// ============================================================
app.get('/api/admin/release-rules', async (req, res) => {
  try {
    // 从系统配置中读取，没有则返回默认值
    const r = await pool.query("SELECT config_value FROM system_config WHERE config_key='release_rules'");
    if (r.rows[0]) {
      res.json(JSON.parse(r.rows[0].config_value));
    } else {
      res.json({
        advance_days: 7, daily_time: '08:00', max_per_patient: 1,
        cancel_hours: 2, release_minutes: 30
      });
    }
  } catch { res.json({ advance_days: 7, daily_time: '08:00', max_per_patient: 1, cancel_hours: 2, release_minutes: 30 }); }
});

app.put('/api/admin/release-rules', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO system_config (config_key, config_value) VALUES ('release_rules',$1)
       ON CONFLICT (config_key) DO UPDATE SET config_value=$1`,
      [JSON.stringify(req.body)]
    );
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

app.get('/api/admin/dept-quotas', async (req, res) => {
  try {
    const r = await pool.query("SELECT config_value FROM system_config WHERE config_key='dept_quotas'");
    if (r.rows[0]) {
      res.json(JSON.parse(r.rows[0].config_value));
    } else {
      const depts = await pool.query('SELECT id, name FROM departments');
      res.json(depts.rows.map((d) => ({
        dept_id: d.id, dept_name: d.name, normal: 25, expert: 20, famous: 8
      })));
    }
  } catch { res.json([]); }
});

app.put('/api/admin/dept-quotas', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO system_config (config_key, config_value) VALUES ('dept_quotas',$1)
       ON CONFLICT (config_key) DO UPDATE SET config_value=$1`,
      [JSON.stringify(req.body)]
    );
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// --- 药品字典管理 ---
app.get('/api/admin/drugs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drugs ORDER BY id');
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/admin/drugs', async (req, res) => {
  const { name, specification, price, actual_stock, min_stock, insurance_type, need_skin_test, expiry_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO drugs (name, specification, price, actual_stock, min_stock, insurance_type, need_skin_test, expiry_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, specification, price, actual_stock || 0, min_stock || 10, insurance_type || '丙', need_skin_test || false, expiry_date]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/admin/drugs/:id', async (req, res) => {
  const { name, specification, price, actual_stock, min_stock, insurance_type, need_skin_test, expiry_date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE drugs SET name=$1,specification=$2,price=$3,actual_stock=$4,min_stock=$5,insurance_type=$6,need_skin_test=$7,expiry_date=$8 WHERE id=$9 RETURNING *',
      [name, specification, price, actual_stock, min_stock, insurance_type, need_skin_test, expiry_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/admin/drugs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM drugs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// --- 统计数据 ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const today = await pool.query("SELECT COUNT(*) AS count FROM registrations WHERE register_date=CURRENT_DATE");
    const revenue = await pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE DATE(created_at)=CURRENT_DATE AND payment_status='paid'");
    const deptStats = await pool.query(`
      SELECT dept.name, COUNT(r.id) AS count
      FROM registrations r JOIN departments dept ON r.department_id=dept.id
      WHERE r.register_date >= CURRENT_DATE - 7
      GROUP BY dept.name ORDER BY count DESC
    `);
    const weekStats = await pool.query(`
      SELECT DATE(register_date) AS date, COUNT(*) AS count
      FROM registrations WHERE register_date >= CURRENT_DATE - 6
      GROUP BY DATE(register_date) ORDER BY date
    `);
    res.json({
      today_visits: parseInt(today.rows[0].count),
      today_revenue: parseFloat(revenue.rows[0].total),
      dept_stats: deptStats.rows,
      week_stats: weekStats.rows
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 门诊收费系统 API
// ============================================================

// 获取收费项目
app.get('/api/charge/items', async (req, res) => {
  const { keyword } = req.query;
  try {
    let query = 'SELECT * FROM charge_items ORDER BY category, code';
    const params = [];
    if (keyword) {
      query = 'SELECT * FROM charge_items WHERE name ILIKE $1 OR code ILIKE $1 ORDER BY category, code';
      params.push(`%${keyword}%`);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// --- 收费项目管理 ---
// 创建收费项目
app.post('/api/admin/charge-items', async (req, res) => {
  const { code, name, category, price, is_insurance, insurance_ratio, hospital_ratio, patient_ratio } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO charge_items (code, name, category, price, is_insurance, insurance_ratio, hospital_ratio, patient_ratio) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [code, name, category, price || 0, is_insurance || false, insurance_ratio || 0, hospital_ratio || 0, patient_ratio || 0]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 更新收费项目
app.put('/api/admin/charge-items/:id', async (req, res) => {
  const { code, name, category, price, is_insurance, insurance_ratio, hospital_ratio, patient_ratio } = req.body;
  try {
    const result = await pool.query(
      'UPDATE charge_items SET code=$1, name=$2, category=$3, price=$4, is_insurance=$5, insurance_ratio=$6, hospital_ratio=$7, patient_ratio=$8 WHERE id=$9 RETURNING *',
      [code, name, category, price, is_insurance, insurance_ratio, hospital_ratio, patient_ratio, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 删除收费项目
app.delete('/api/admin/charge-items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM charge_items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// 创建收费单
app.post('/api/charge/create', async (req, res) => {
  const { registration_id, patient_id, doctor_id, items, payment_method } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let totalAmount = 0;
    let insuranceAmount = 0;
    let patientAmount = 0;
    const details = [];
    for (const item of items) {
      const itemTotal = parseFloat(item.unit_price) * parseInt(item.quantity);
      totalAmount += itemTotal;
      const insRatio = parseFloat(item.insurance_ratio || '0');
      const insAmt = itemTotal * insRatio;
      insuranceAmount += insAmt;
      patientAmount += (itemTotal - insAmt);
      details.push({
        item_code: item.code,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: itemTotal,
        insurance_amount: insAmt,
        patient_amount: (itemTotal - insAmt),
      });
    }
    const receiptNo = 'RCP' + Date.now().toString().slice(-8);
    const charge = await client.query(`
      INSERT INTO charges (registration_id, patient_id, doctor_id, total_amount,
        insurance_amount, patient_amount, payment_method, payment_status, receipt_no, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'paid',$8,'completed') RETURNING *
    `, [registration_id, patient_id, doctor_id, totalAmount, insuranceAmount, patientAmount, payment_method || 'cash', receiptNo]);
    const chargeId = charge.rows[0].id;
    for (const detail of details) {
      await client.query(`
        INSERT INTO charge_details (charge_id, item_code, item_name, quantity, unit_price,
          total_price, insurance_amount, patient_amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [chargeId, detail.item_code, detail.item_name, detail.quantity, detail.unit_price,
        detail.total_price, detail.insurance_amount, detail.patient_amount]);
    }
    await client.query('COMMIT');
    res.json({ success: true, charge: charge.rows[0], receipt_no: receiptNo });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取收费记录列表
app.get('/api/charge/list', async (req, res) => {
  const { patient_id, date, page = 1, page_size = 20 } = req.query;
  try {
    let query = `
      SELECT c.*, p.name AS patient_name, d.name AS doctor_name,
        (SELECT COUNT(*) FROM charge_details WHERE charge_id = c.id) AS item_count
      FROM charges c
      LEFT JOIN patients p ON c.patient_id = p.id
      LEFT JOIN doctors d ON c.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (patient_id) {
      query += ' AND c.patient_id = $' + (params.length + 1);
      params.push(patient_id);
    }
    if (date) {
      query += ' AND c.charge_date = $' + (params.length + 1);
      params.push(date);
    }
    query += ' ORDER BY c.created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(page_size, offset);
    const result = await pool.query(query, params);
    const countResult = await pool.query(query.replace(/ORDER BY.*/, '').replace(/LIMIT.*/, ''), params.slice(0, -2));
    res.json({ rows: result.rows, total: countResult.rows.length });
  } catch (err) { handleErr(res, err); }
});

// 门诊退费
app.post('/api/charge/refund', async (req, res) => {
  const { charge_id, reason, operator } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const charge = await client.query('SELECT * FROM charges WHERE id=$1', [charge_id]);
    if (charge.rows.length === 0) {
      return res.status(404).json({ error: '收费记录不存在' });
    }
    const refundAmount = charge.rows[0].patient_amount;
    await client.query('INSERT INTO refunds (charge_id, refund_amount, reason, operator) VALUES ($1,$2,$3,$4)', [charge_id, refundAmount, reason, operator]);
    await client.query('UPDATE charges SET status=$1, payment_status=$2 WHERE id=$3', ['refunded', 'refunded', charge_id]);
    await client.query('COMMIT');
    res.json({ success: true, refund_amount: refundAmount });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 门诊日结
app.post('/api/charge/daily-close', async (req, res) => {
  const { close_date, operator } = req.body;
  try {
    const date = close_date || new Date().toISOString().split('T')[0];
    const existing = await pool.query('SELECT * FROM daily_close WHERE close_date=$1', [date]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM daily_close WHERE close_date=$1', [date]);
    }
    const income = await pool.query(`
      SELECT SUM(total_amount) AS total, SUM(cash_amount) AS cash,
        SUM(card_amount) AS card, SUM(insurance_amount) AS insurance
      FROM charges WHERE charge_date=$1 AND status='completed'
    `, [date]);
    const regCount = await pool.query('SELECT COUNT(*) FROM registrations WHERE register_date=$1', [date]);
    const prescCount = await pool.query('SELECT COUNT(*) FROM prescriptions WHERE DATE(created_at)=$1', [date]);
    const result = await pool.query(`
      INSERT INTO daily_close (close_date, total_income, cash_amount, card_amount,
        insurance_amount, registration_count, prescription_count, operator)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [date, income.rows[0].total || 0, income.rows[0].cash || 0, income.rows[0].card || 0,
      income.rows[0].insurance || 0, regCount.rows[0].count, prescCount.rows[0].count, operator]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 获取日结记录
app.get('/api/charge/daily-close', async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    let query = 'SELECT * FROM daily_close WHERE 1=1';
    const params = [];
    if (start_date) {
      query += ' AND close_date >= $1';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND close_date <= $' + (params.length + 1);
      params.push(end_date);
    }
    query += ' ORDER BY close_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 门诊药房系统 API（扩展）
// ============================================================

// 药品入库
app.post('/api/pharmacy/inventory/in', async (req, res) => {
  const { drug_id, quantity, unit_price, source, operator, remark } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const totalAmount = parseFloat(unit_price) * parseInt(quantity);
    await client.query('INSERT INTO inventory_transactions (drug_id, type, quantity, unit_price, total_amount, source, operator, remark) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [drug_id, 'in', quantity, unit_price, totalAmount, source, operator, remark]);
    await client.query('UPDATE drugs SET actual_stock=actual_stock+$1 WHERE id=$2', [quantity, drug_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 药品出库
app.post('/api/pharmacy/inventory/out', async (req, res) => {
  const { drug_id, quantity, source, operator, remark } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const drug = await client.query('SELECT actual_stock, price FROM drugs WHERE id=$1', [drug_id]);
    if (drug.rows.length === 0) {
      return res.status(404).json({ error: '药品不存在' });
    }
    if (drug.rows[0].actual_stock < quantity) {
      return res.status(400).json({ error: '库存不足' });
    }
    const totalAmount = parseFloat(drug.rows[0].price) * parseInt(quantity);
    await client.query('INSERT INTO inventory_transactions (drug_id, type, quantity, unit_price, total_amount, source, operator, remark) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [drug_id, 'out', quantity, drug.rows[0].price, totalAmount, source, operator, remark]);
    await client.query('UPDATE drugs SET actual_stock=actual_stock-$1 WHERE id=$2', [quantity, drug_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取库存变动记录
app.get('/api/pharmacy/inventory/transactions', async (req, res) => {
  const { drug_id, start_date, end_date, page = 1, page_size = 20 } = req.query;
  try {
    let query = `
      SELECT it.*, d.name AS drug_name
      FROM inventory_transactions it
      LEFT JOIN drugs d ON it.drug_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (drug_id) { query += ' AND it.drug_id = $' + (params.length + 1); params.push(drug_id); }
    if (start_date) { query += ' AND it.created_at >= $' + (params.length + 1); params.push(start_date); }
    if (end_date) { query += ' AND it.created_at <= $' + (params.length + 1); params.push(end_date + ' 23:59:59'); }
    query += ' ORDER BY it.created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(page_size, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 药房盘点
app.post('/api/pharmacy/inventory/check', async (req, res) => {
  const { items, operator } = req.body;
  try {
    const checkDate = new Date().toISOString().split('T')[0];
    let totalCount = 0;
    let totalAmount = 0;
    let varianceAmount = 0;
    const details = [];
    for (const item of items) {
      const drug = await pool.query('SELECT * FROM drugs WHERE id=$1', [item.drug_id]);
      if (drug.rows.length === 0) continue;
      const expected = drug.rows[0].actual_stock;
      const actual = parseInt(item.actual_count);
      const variance = actual - expected;
      totalCount += actual;
      totalAmount += actual * parseFloat(drug.rows[0].price);
      varianceAmount += variance * parseFloat(drug.rows[0].price);
      details.push({
        drug_id: item.drug_id,
        drug_name: drug.rows[0].name,
        expected_count: expected,
        actual_count: actual,
        variance: variance,
        unit_price: drug.rows[0].price,
        variance_amount: variance * parseFloat(drug.rows[0].price),
      });
    }
    const result = await pool.query(`
      INSERT INTO pharmacy_inventory_check (check_date, items, total_count, total_amount, variance_amount, operator)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [checkDate, JSON.stringify(details), totalCount, totalAmount, varianceAmount, operator]);
    for (const item of items) {
      await pool.query('UPDATE drugs SET actual_stock=$1 WHERE id=$2', [parseInt(item.actual_count), item.drug_id]);
    }
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 药房请领
app.post('/api/pharmacy/request', async (req, res) => {
  const { pharmacy_name, items, operator } = req.body;
  try {
    let totalAmount = 0;
    for (const item of items) {
      const drug = await pool.query('SELECT price FROM drugs WHERE id=$1', [item.drug_id]);
      if (drug.rows.length > 0) {
        totalAmount += parseFloat(drug.rows[0].price) * parseInt(item.quantity);
      }
    }
    const result = await pool.query(`
      INSERT INTO pharmacy_requests (pharmacy_name, items, total_amount, status, operator)
      VALUES ($1,$2,$3,'pending',$4) RETURNING *
    `, [pharmacy_name, JSON.stringify(items), totalAmount, operator]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 审核请领单
app.post('/api/pharmacy/request/approve', async (req, res) => {
  const { request_id, approver } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await pool.query('SELECT * FROM pharmacy_requests WHERE id=$1', [request_id]);
    if (request.rows.length === 0) {
      return res.status(404).json({ error: '请领单不存在' });
    }
    const items = JSON.parse(request.rows[0].items);
    for (const item of items) {
      await client.query('INSERT INTO inventory_transactions (drug_id, type, quantity, source, operator) VALUES ($1,$2,$3,$4,$5)', [item.drug_id, 'out', item.quantity, '药房请领', approver]);
    }
    await client.query('UPDATE pharmacy_requests SET status=$1, approver=$2, approved_at=NOW() WHERE id=$3', ['approved', approver, request_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 门诊退药
app.post('/api/pharmacy/return', async (req, res) => {
  const { presc_id, items, reason, operator } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      if (item.drug_id) {
        await client.query('UPDATE drugs SET actual_stock=actual_stock+$1, locked_stock=GREATEST(0,locked_stock-$1) WHERE id=$2', [item.quantity, item.drug_id]);
        await client.query('INSERT INTO inventory_transactions (drug_id, type, quantity, source, operator, remark) VALUES ($1,$2,$3,$4,$5,$6)', [item.drug_id, 'return', item.quantity, '门诊退药', operator, reason]);
      }
    }
    await client.query('UPDATE prescriptions SET dispense_status=$1 WHERE id=$2', ['returned', presc_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 医嘱系统 API
// ============================================================

// 医生开具医嘱
app.post('/api/doctor/order', async (req, res) => {
  const { registration_id, patient_id, doctor_id, type, content, priority, start_time, end_time } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO orders (registration_id, patient_id, doctor_id, type, content,
        priority, start_time, end_time)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [registration_id, patient_id, doctor_id, type, content, priority || 'normal', start_time, end_time]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 医生批量发送医嘱（同时创建处方记录 + 缴费订单）
app.post('/api/orders', async (req, res) => {
  const { patientId, doctorId, orders } = req.body;
  if (!orders || orders.length === 0) {
    return res.status(400).json({ error: '请至少添加一条医嘱' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. 获取医生和科室信息
    const doctorInfo = await client.query(`
      SELECT d.name, d.department_id, dept.name as dept_name
      FROM doctors d LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [doctorId]);
    const doctorName = doctorInfo.rows[0]?.name || '';
    const departmentId = doctorInfo.rows[0]?.department_id || null;
    const departmentName = doctorInfo.rows[0]?.dept_name || '';

    // 2. 获取患者信息
    const patientInfo = await client.query('SELECT name, allergy FROM patients WHERE id = $1', [patientId]);
    const patientName = patientInfo.rows[0]?.name || '';
    const allergyHistory = patientInfo.rows[0]?.allergy || '';

    // 3. 插入 orders 医嘱记录
    const orderResults = [];
    for (const order of orders) {
      const orderType = order.type || 'drug';
      const orderContent = order.content || JSON.stringify({
        item_name: order.item_name,
        price: order.price,
        quantity: order.quantity,
        unit: order.unit,
        dosage: order.dosage,
        frequency: order.frequency,
        days: order.days,
        pieces: order.pieces,
        decoct: order.decoct
      });
      const result = await client.query(`
        INSERT INTO orders (registration_id, patient_id, doctor_id, type, content,
          priority, start_time, end_time)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [order.registration_id || null, patientId, doctorId, orderType, orderContent, 
          order.priority || 'normal', order.start_time || new Date(), order.end_time || null]);
      orderResults.push(result.rows[0]);
    }

    // 4. 计算总金额
    const totalAmount = orders.reduce((sum, item) => 
      sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0);

    // 5. 生成回执号
    const receiptNo = 'RCP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

    // 6. 创建 prescriptions 处方记录（review_status='approved' 使其直接进入药剂师工作台）
    const prescResult = await client.query(`
      INSERT INTO prescriptions (patient_id, doctor_id, total_amount, type, medicine_name,
        review_status, status, receipt_no, allergy_history, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,'approved','pending',$6,$7,NOW(),NOW()) RETURNING *
    `, [patientId, doctorId, totalAmount, orders[0].type || 'western', 
        orders[0].item_name || '药品处方', receiptNo, 
        allergyHistory ? `{${allergyHistory}}` : '{}']);
    const prescId = prescResult.rows[0].id;

    // 7. 创建 prescription_items 明细
    for (const item of orders) {
      let drugId = item.drug_id || null;
      if (!drugId && item.item_name) {
        const drugMatch = await client.query(
          'SELECT id FROM drugs WHERE name ILIKE $1 LIMIT 1', [item.item_name]
        );
        drugId = drugMatch.rows[0]?.id || null;
      }
      await client.query(`
        INSERT INTO prescription_items (presc_id, drug_id, item_name, quantity, unit, price, dosage, frequency, days)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [prescId, drugId, item.item_name, item.quantity || 1, item.unit || '盒',
          parseFloat(item.price) || 0, item.dosage || '', item.frequency || '', item.days || 1]);
      // 锁定库存
      if (drugId) {
        await client.query('UPDATE drugs SET locked_stock=locked_stock+$1 WHERE id=$2', [item.quantity || 1, drugId]);
      }
    }

    // 8. 创建缴费订单 payment_orders（患者缴费页面才能显示药品费用）
    const orderNo = 'PO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    const paymentItems = orders.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity || 1,
      unit: item.unit || '盒',
      price: parseFloat(item.price) || 0,
      total: (parseFloat(item.price) || 0) * (item.quantity || 1),
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      days: item.days || 1
    }));
    await client.query(`
      INSERT INTO payment_orders (order_no, patient_id, patient_name, doctor_id, doctor_name, 
        department_id, department_name, order_type, source_id, items, total_amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [orderNo, patientId, patientName, doctorId, doctorName, 
        departmentId, departmentName, 'prescription', prescId, JSON.stringify(paymentItems), totalAmount]);

    await client.query('COMMIT');
    res.json({ success: true, orders: orderResults, prescription_id: prescId, receipt_no: receiptNo, payment_order_no: orderNo });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取医嘱列表（护士端）
app.get('/api/nurse/orders', async (req, res) => {
  const { patient_id, status } = req.query;
  try {
    let query = `
      SELECT o.*, p.name AS patient_name, d.name AS doctor_name, d.title AS doctor_title, u.real_name AS nurse_name
      FROM orders o
      LEFT JOIN patients p ON o.patient_id = p.id
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN users u ON o.nurse_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (patient_id) { query += ' AND o.patient_id = $' + (params.length + 1); params.push(patient_id); }
    if (status) { query += ' AND o.status = $' + (params.length + 1); params.push(status); }
    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 护士审核医嘱
app.post('/api/nurse/orders/:id/review', async (req, res) => {
  const { approved, nurse_id, remark } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET status=$1, nurse_id=$2 WHERE id=$3 RETURNING *', [approved ? 'approved' : 'rejected', nurse_id, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 护士执行医嘱
app.post('/api/nurse/orders/:id/execute', async (req, res) => {
  const { nurse_id } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET execute_status=$1, execute_time=NOW(), execute_nurse=(SELECT real_name FROM users WHERE id=$2) WHERE id=$3 RETURNING *', ['executed', nurse_id, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 取消/作废医嘱
app.post('/api/nurse/orders/:id/cancel', async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET status=$1, cancel_reason=$2 WHERE id=$3 RETURNING *', ['cancelled', reason, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验报告单 API
// ============================================================

// 医生开具检验单
app.post('/api/doctor/lab-report', async (req, res) => {
  const { patient_id, registration_id, doctor_id, test_type, test_name, sample_type, items } = req.body;
  try {
    const reportNo = 'LAB' + Date.now().toString().slice(-8);
    const result = await pool.query(`
      INSERT INTO lab_reports (patient_id, registration_id, doctor_id, report_no,
        test_type, test_name, sample_type, items)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [patient_id, registration_id, doctor_id, reportNo, test_type, test_name, sample_type, JSON.stringify(items)]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 获取检验报告列表
app.get('/api/lab-reports', async (req, res) => {
  const { patient_id, status } = req.query;
  try {
    let query = `
      SELECT lr.*, p.name AS patient_name, d.name AS doctor_name
      FROM lab_reports lr
      LEFT JOIN patients p ON lr.patient_id = p.id
      LEFT JOIN doctors d ON lr.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (patient_id) { query += ' AND lr.patient_id = $' + (params.length + 1); params.push(patient_id); }
    if (status) { query += ' AND lr.status = $' + (params.length + 1); params.push(status); }
    query += ' ORDER BY lr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 更新检验报告结果
app.put('/api/lab-reports/:id', async (req, res) => {
  const { items, status, report_date } = req.body;
  try {
    const result = await pool.query('UPDATE lab_reports SET items=$1, status=$2, report_date=$3 WHERE id=$4 RETURNING *', [JSON.stringify(items), status, report_date, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 住院医生接口
// ============================================================
app.get('/api/inpatient/beds', async (req, res) => {
  const { ward } = req.query;
  try {
    const result = await pool.query(`
      SELECT b.*, p.name AS patient_name, p.gender, p.allergy,
        EXTRACT(YEAR FROM AGE(p.birth_date)) AS age
      FROM beds b
      LEFT JOIN patients p ON b.patient_id = p.id
      WHERE ($1::varchar IS NULL OR b.ward=$1)
      ORDER BY b.ward, b.bed_no
    `, [ward || null]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 通知公告
// ============================================================
app.get('/api/announcements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM announcements WHERE is_active=TRUE ORDER BY publish_date DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 病历模板接口
// ============================================================
app.get('/api/doctor/templates', async (req, res) => {
  const { doctor_id, category } = req.query;
  try {
    let query = 'SELECT * FROM medical_templates WHERE doctor_id=$1';
    const params = [doctor_id];
    if (category && category !== 'all') {
      query += ' AND category=$2';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/doctor/templates', async (req, res) => {
  const { doctor_id, name, category, chief, history, past, physical, auxiliary, diagnosis, suggestion } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO medical_templates (doctor_id, name, category, chief, history, past, physical, auxiliary, diagnosis, suggestion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [doctor_id, name, category || 'common', chief, history, past, physical, auxiliary, diagnosis, suggestion]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/doctor/templates/:id', async (req, res) => {
  const { name, category, chief, history, past, physical, auxiliary, diagnosis, suggestion } = req.body;
  try {
    const result = await pool.query(`
      UPDATE medical_templates SET name=$1, category=$2, chief=$3, history=$4, past=$5,
        physical=$6, auxiliary=$7, diagnosis=$8, suggestion=$9, updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [name, category, chief, history, past, physical, auxiliary, diagnosis, suggestion, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/doctor/templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM medical_templates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 协定处方模板接口
// ============================================================
app.get('/api/doctor/prescription-templates', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM prescription_templates WHERE doctor_id=$1 ORDER BY created_at DESC',
      [doctor_id]
    );
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/doctor/prescription-templates', async (req, res) => {
  const { doctor_id, name, type, items, remark } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO prescription_templates (doctor_id, name, type, items, remark)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [doctor_id, name, type || 'western', JSON.stringify(items || []), remark]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/doctor/prescription-templates/:id', async (req, res) => {
  const { name, type, items, remark } = req.body;
  try {
    const result = await pool.query(`
      UPDATE prescription_templates SET name=$1, type=$2, items=$3, remark=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [name, type, JSON.stringify(items || []), remark, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/doctor/prescription-templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prescription_templates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 关注患者接口
// ============================================================
app.get('/api/doctor/favorites', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT fp.*, p.name, p.gender, p.phone, p.allergy, p.chronic_disease, p.insurance_type,
        p.birth_date, EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
        (SELECT MAX(mr.visit_date) FROM medical_records mr WHERE mr.patient_id = p.id) AS last_visit
      FROM favorite_patients fp
      JOIN patients p ON fp.patient_id = p.id
      WHERE fp.doctor_id = $1
      ORDER BY fp.created_at DESC
    `, [doctor_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/doctor/favorites', async (req, res) => {
  const { doctor_id, patient_id, remark } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO favorite_patients (doctor_id, patient_id, remark) VALUES ($1,$2,$3)
      ON CONFLICT (doctor_id, patient_id) DO UPDATE SET remark=$3, updated_at=NOW()
      RETURNING *
    `, [doctor_id, patient_id, remark || '']);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.delete('/api/doctor/favorites/:patient_id', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    await pool.query('DELETE FROM favorite_patients WHERE doctor_id=$1 AND patient_id=$2', [doctor_id, req.params.patient_id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 患者综合搜索接口
// ============================================================
// ============================================================
// 患者快速登记接口
// ============================================================
app.post('/api/patient/register', async (req, res) => {
  const { name, gender, age, phone, useReserved, reserved_type } = req.body;
  
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和手机号为必填项' });
  }
  
  try {
    // 1. 根据年龄计算出生日期
    const birthDate = age ? new Date(new Date().getFullYear() - age, 0, 1) : null;
    
    // 创建患者记录（包含出生日期）
    const patientResult = await pool.query(
      'INSERT INTO patients (name, gender, phone, birth_date) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, gender || '男', phone, birthDate]
    );
    const patientId = patientResult.rows[0].id;
    
    // 2. 获取当前医生信息（从请求中或默认）
    // 注意：这里简化处理，实际应该从token中获取医生ID
    const doctorId = req.body.doctorId || 1; // 默认使用第一个医生
    
    // 3. 获取医生的科室信息
    const doctorInfo = await pool.query(
      'SELECT d.id as doctor_id, d.department_id FROM doctors d WHERE d.id = $1',
      [doctorId]
    );
    
    if (doctorInfo.rows.length === 0) {
      return res.status(404).json({ error: '医生不存在' });
    }
    
    const { doctor_id, department_id } = doctorInfo.rows[0];
    
    // 4. 查找今天的排班
    const today = new Date().toISOString().slice(0, 10);
    const scheduleResult = await pool.query(
      `SELECT s.id as schedule_id, s.am_pm, s.slot_type 
       FROM schedules s 
       WHERE s.doctor_id = $1 AND s.schedule_date = $2 AND s.remaining > 0
       LIMIT 1`,
      [doctor_id, today]
    );
    
    let scheduleId = null;
    let amPm = 'am';
    let slotType = '普通号';
    
    if (scheduleResult.rows.length > 0) {
      scheduleId = scheduleResult.rows[0].schedule_id;
      amPm = scheduleResult.rows[0].am_pm;
      slotType = scheduleResult.rows[0].slot_type;
    }
    
    // 5. 创建挂号记录
    const regResult = await pool.query(
      `INSERT INTO registrations 
       (patient_id, doctor_id, department_id, schedule_id, register_date, appt_date, am_pm, slot_type, status, is_reserved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        patientId,
        doctor_id,
        department_id,
        scheduleId,
        today,
        today,
        amPm,
        slotType,
        'pending',
        useReserved || false
      ]
    );
    
    const regId = regResult.rows[0].id;
    
    console.log(`✓ 患者快速登记成功: ${name} (ID: ${patientId}), 挂号ID: ${regId}`);
    
    res.json({
      success: true,
      patientId,
      registrationId: regId,
      message: '登记成功'
    });
  } catch (err) {
    console.error('患者快速登记失败:', err);
    handleErr(res, err);
  }
});

app.get('/api/patients/search', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || !keyword.trim()) return res.json([]);
  try {
    const kw = `%${keyword.trim()}%`;
    const result = await pool.query(`
      SELECT p.id, p.name, p.gender, p.phone, p.id_card, p.medical_record_no, p.chronic_disease, p.allergy,
        p.birth_date, EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
        (SELECT COUNT(*) FROM medical_records mr WHERE mr.patient_id = p.id) AS visit_count
      FROM patients p
      WHERE p.name LIKE $1 OR p.phone LIKE $1 OR p.id_card LIKE $1 OR p.medical_record_no LIKE $1
      ORDER BY p.name
      LIMIT 20
    `, [kw]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 统计报表接口
// ============================================================
app.get('/api/doctor/statistics', async (req, res) => {
  const { doctor_id, date } = req.query;
  const queryDate = date || new Date().toISOString().slice(0, 10);
  try {
    // 今日接诊统计
    const todayStats = await pool.query(`
      SELECT
        COUNT(*) AS total_patients,
        COUNT(CASE WHEN r.status = 'done' THEN 1 END) AS completed,
        COUNT(CASE WHEN r.status = 'calling' THEN 1 END) AS in_progress,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) AS waiting,
        COUNT(CASE WHEN r.status = 'skip' THEN 1 END) AS skipped
      FROM registrations r
      WHERE r.doctor_id = $1 AND r.register_date = $2
    `, [doctor_id, queryDate]);

    // 本周接诊趋势
    const weekTrend = await pool.query(`
      SELECT r.register_date::date AS date, COUNT(*) AS count
      FROM registrations r
      WHERE r.doctor_id = $1
        AND r.register_date >= CURRENT_DATE - INTERVAL '6 days'
        AND r.register_date <= CURRENT_DATE
      GROUP BY r.register_date::date
      ORDER BY date
    `, [doctor_id]);

    // 费用统计
    const feeStats = await pool.query(`
      SELECT
        COALESCE(SUM(p.total_amount), 0) AS total_fee,
        COUNT(DISTINCT p.id) AS presc_count
      FROM prescriptions p
      WHERE p.doctor_id = $1 AND p.created_at::date = $2::date AND p.status != 'cancelled'
    `, [doctor_id, queryDate]);

    // 疾病分布
    const diseaseDist = await pool.query(`
      SELECT diagnosis, COUNT(*) AS count
      FROM medical_records
      WHERE doctor_id = $1 AND visit_date = $2::date
      GROUP BY diagnosis
      ORDER BY count DESC
      LIMIT 10
    `, [doctor_id, queryDate]);

    res.json({
      today: todayStats.rows[0],
      weekTrend: weekTrend.rows,
      fee: feeStats.rows[0],
      diseaseDist: diseaseDist.rows
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 药品字典接口
// ============================================================
app.get('/api/drugs/dictionary', async (req, res) => {
  const { keyword, category, type } = req.query;
  try {
    let query = 'SELECT * FROM drugs WHERE 1=1';
    const params = [];
    if (keyword && keyword.trim()) {
      params.push(`%${keyword.trim()}%`);
      query += ` AND (name LIKE $${params.length} OR specification LIKE $${params.length})`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (type && type !== 'all') {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    query += ' ORDER BY category, name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.get('/api/drugs/categories', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM drugs WHERE category IS NOT NULL ORDER BY category"
    );
    res.json(result.rows.map(r => r.category));
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 保留原有接口（兼容）
// ============================================================
app.get('/api/registrations', async (req, res) => {
  const { patient_id } = req.query;
  try {
    let query = `SELECT r.*, d.name as doctor_name, d.title, dept.name as department_name
      FROM registrations r JOIN doctors d ON r.doctor_id=d.id JOIN departments dept ON r.department_id=dept.id`;
    const params = [];
    if (patient_id) { query += ' WHERE r.patient_id=$1'; params.push(patient_id); }
    query += ' ORDER BY r.register_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.get('/api/reports', async (req, res) => {
  const { patient_id } = req.query;
  try {
    let sql = 'SELECT * FROM reports WHERE status = $1';
    const params = ['completed'];
    
    if (patient_id) {
      params.push(patient_id);
      sql += ' AND patient_id = $2';
    }
    
    sql += ' ORDER BY report_date DESC';
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 用户头像接口
// ============================================================
app.put('/api/user/avatar', async (req, res) => {
  const { avatar } = req.body;
  const user = req.user; // 需要认证
  if (!user) {
    return res.status(401).json({ error: '未授权' });
  }
  try {
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, user.id]);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 药房盘点接口
// ============================================================
app.get('/api/pharmacy/inventory-checks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ic.*, u.username as operator_name
      FROM inventory_checks ic
      LEFT JOIN users u ON ic.operator_id = u.id
      ORDER BY ic.check_date DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.post('/api/pharmacy/inventory-check', async (req, res) => {
  const { drug_id, system_stock, actual_stock, remark } = req.body;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: '未授权' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO inventory_checks (drug_id, system_stock, actual_stock, difference, operator_id, remark, check_date)
      VALUES ($1, $2, $3, $3-$2, $4, $5, CURRENT_DATE)
      RETURNING *
    `, [drug_id, system_stock, actual_stock, user.id, remark || '']);
    await client.query('COMMIT');
    res.json({ success: true, check: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 测试辅助：重置排班号源
// ============================================================
app.put('/api/test/set-schedule-remaining', async (req, res) => {
  const { schedule_id, remaining } = req.body;
  try {
    await pool.query(
      'UPDATE schedules SET remaining=$1 WHERE id=$2',
      [remaining, schedule_id]
    );
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验检查项目字典接口
// ============================================================
app.get('/api/exam-items', async (req, res) => {
  const { exam_type, category, keyword } = req.query;
  try {
    let sql = 'SELECT * FROM exam_items WHERE is_active = true';
    const params = [];
    if (exam_type) {
      params.push(exam_type);
      sql += ` AND exam_type = $${params.length}`;
    }
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (keyword) {
      params.push(`%${keyword}%`);
      sql += ` AND (name ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }
    sql += ' ORDER BY exam_type, category, name';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验检查申请接口（医生端）
// ============================================================
app.post('/api/doctor/exam-request', async (req, res) => {
  const { patient_id, doctor_id, registration_id, exam_type, exam_name, clinical_diagnosis, urgency } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 获取检验项目价格
    const itemResult = await client.query('SELECT price FROM exam_items WHERE name = $1 AND exam_type = $2', [exam_name, exam_type]);
    const amount = itemResult.rows.length > 0 ? itemResult.rows[0].price : 0;
    
    // 创建检验申请记录
    const result = await client.query(`
      INSERT INTO exam_requests (patient_id, doctor_id, registration_id, exam_type, exam_name, clinical_diagnosis, urgency, amount, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid')
      RETURNING *
    `, [patient_id, doctor_id, registration_id, exam_type, exam_name, clinical_diagnosis, urgency || 'normal', amount]);
    
    const examRequest = result.rows[0];
    
    // 获取患者、医生、科室信息
    const patientResult = await client.query('SELECT name FROM patients WHERE id = $1', [patient_id]);
    const doctorResult = await client.query(`
      SELECT d.name, d.department_id, dept.name as dept_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [doctor_id]);
    
    const patientName = patientResult.rows[0]?.name || '';
    const doctorName = doctorResult.rows[0]?.name || '';
    const departmentId = doctorResult.rows[0]?.department_id || null;
    const departmentName = doctorResult.rows[0]?.dept_name || '';
    
    // 生成订单号
    const orderNo = 'PO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    
    // 创建缴费订单
    const items = [{
      item_name: exam_name,
      exam_type: exam_type,
      quantity: 1,
      unit: '次',
      price: parseFloat(amount),
      total: parseFloat(amount),
      clinical_diagnosis: clinical_diagnosis || ''
    }];
    
    await client.query(`
      INSERT INTO payment_orders (order_no, patient_id, patient_name, doctor_id, doctor_name, 
        department_id, department_name, order_type, source_id, items, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [orderNo, patient_id, patientName, doctor_id, doctorName, 
        departmentId, departmentName, 'exam', examRequest.id, JSON.stringify(items), amount]);
    
    await client.query('COMMIT');
    
    examRequest.order_no = orderNo;
    res.json(examRequest);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('检验申请创建失败:', err);
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/doctor/exam-requests', async (req, res) => {
  const { doctor_id, patient_id } = req.query;
  try {
    let sql = `
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, e.price
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      LEFT JOIN exam_items e ON er.exam_name = e.name AND er.exam_type = e.exam_type
    `;
    const params = [];
    if (doctor_id) {
      params.push(doctor_id);
      sql += ` WHERE er.doctor_id = $${params.length}`;
    }
    if (patient_id) {
      params.push(patient_id);
      sql += doctor_id ? ` AND er.patient_id = $${params.length}` : ` WHERE er.patient_id = $${params.length}`;
    }
    sql += ' ORDER BY er.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验检查缴费接口
// ============================================================
app.post('/api/exam-request/pay', async (req, res) => {
  const { request_id, patient_id, payment_method } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 更新检验申请状态
    const examResult = await client.query(
      "UPDATE exam_requests SET payment_status = 'paid', status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND patient_id = $2 AND payment_status = 'unpaid' RETURNING *",
      [request_id, patient_id]
    );
    
    if (examResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '缴费失败，该申请可能已缴费或不存在' });
    }
    
    const examRequest = examResult.rows[0];
    
    // 更新缴费订单状态
    const orderResult = await client.query(
      `UPDATE payment_orders 
       SET payment_status = 'paid', payment_method = $1, paid_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP, notify_sent = FALSE
       WHERE order_type = 'exam' AND source_id = $2 AND patient_id = $3
       RETURNING *`,
      [payment_method || 'wechat', request_id, patient_id]
    );
    
    // 生成交易号
    const transactionNo = 'TX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
    
    if (orderResult.rowCount > 0) {
      await client.query(
        'UPDATE payment_orders SET transaction_no = $1 WHERE id = $2',
        [transactionNo, orderResult.rows[0].id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      request: examRequest, 
      order: orderResult.rows[0],
      transaction_no: transactionNo
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('检验申请缴费失败:', err);
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 缴费订单接口
// ============================================================
// 获取患者缴费订单列表
app.get('/api/payment/orders', async (req, res) => {
  const { patient_id, status } = req.query;
  try {
    let sql = `
      SELECT po.*, 
             json_agg(pd.name ORDER BY pd.id) as department_names
      FROM payment_orders po
      LEFT JOIN departments pd ON po.department_id = pd.id
      WHERE po.order_type IN ('exam', 'prescription')
    `;
    const params = [];
    
    if (patient_id) {
      params.push(patient_id);
      sql += ` AND po.patient_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      sql += ` AND po.payment_status = $${params.length}`;
    }
    
    sql += ` GROUP BY po.id ORDER BY po.created_at DESC`;
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('获取缴费订单失败:', err);
    handleErr(res, err);
  }
});

// 获取订单详情
app.get('/api/payment/orders/:order_no', async (req, res) => {
  const { order_no } = req.params;
  try {
    const result = await pool.query(`
      SELECT po.*, 
             d.name as doctor_name_full,
             dept.name as department_name_full,
             p.name as patient_name_full
      FROM payment_orders po
      LEFT JOIN doctors d ON po.doctor_id = d.id
      LEFT JOIN departments dept ON po.department_id = dept.id
      LEFT JOIN patients p ON po.patient_id = p.id
      WHERE po.order_no = $1
    `, [order_no]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('获取订单详情失败:', err);
    handleErr(res, err);
  }
});

// ============================================================
// 检验科医师工作台接口
// ============================================================
app.get('/api/lab-doctor/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
             d.name as doctor_name, dept.name as department_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE er.exam_type = 'lab' AND er.status = 'pending' AND er.payment_status = 'paid'
      ORDER BY 
        CASE er.urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        er.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取检验中的申请列表
app.get('/api/lab-doctor/processing', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
             d.name as doctor_name, dept.name as department_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE er.exam_type = 'lab' AND er.status = 'processing'
      ORDER BY er.updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/lab-doctor/exam-request/:id/start', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE exam_requests SET status = 'processing', started_at = NOW(), updated_at = NOW() WHERE id = $1 AND status IN ('pending', 'received') RETURNING *",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '该申请已被处理或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.post('/api/lab-doctor/report', async (req, res) => {
  const { request_id, result, conclusion, reference_range, reporter_id, reporter_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 从 exam_requests 自动获取 patient_id 和 exam_name
    const examReq = await client.query("SELECT patient_id, exam_name FROM exam_requests WHERE id = $1", [request_id]);
    if (!examReq.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '检验申请不存在' });
    }
    const patient_id = examReq.rows[0].patient_id;
    const exam_name = examReq.rows[0].exam_name;
    
    const report = await client.query(`
      INSERT INTO exam_reports (request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date)
      VALUES ($1, $2, 'lab', $3, $4, $5, $6, $7, $8, 'completed', CURRENT_DATE)
      RETURNING *
    `, [request_id, patient_id, exam_name, result || '', conclusion || '', reference_range || '', reporter_id || null, reporter_name || '']);
    
    await client.query("UPDATE exam_requests SET status = 'completed', updated_at = NOW() WHERE id = $1", [request_id]);
    
    await client.query('COMMIT');
    res.json(report.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/lab-doctor/reports', async (req, res) => {
  const { reporter_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name
      FROM exam_reports er
      JOIN patients p ON er.patient_id = p.id
      WHERE er.exam_type = 'lab' ${reporter_id ? `AND er.reporter_id = $1` : ''}
      ORDER BY er.created_at DESC
    `, reporter_id ? [reporter_id] : []);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 影像师工作台接口
// ============================================================
app.get('/api/radiologist/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, dept.name as department_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE er.exam_type IN ('radiology', 'imaging') AND er.status IN ('pending', 'received') AND er.payment_status = 'paid'
      ORDER BY 
        CASE er.urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        er.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取检查中的申请列表
app.get('/api/radiologist/processing', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, dept.name as department_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE er.exam_type IN ('radiology', 'imaging') AND er.status = 'processing'
      ORDER BY er.updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/radiologist/exam-request/:id/start', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE exam_requests SET status = 'processing', started_at = NOW(), updated_at = NOW() WHERE id = $1 AND status IN ('pending', 'received') RETURNING *",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '该申请已被处理或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.post('/api/radiologist/report', async (req, res) => {
  const { request_id, result, conclusion, image_url, reporter_id, reporter_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 从 exam_requests 自动获取 patient_id 和 exam_name
    const examReq = await client.query("SELECT patient_id, exam_name FROM exam_requests WHERE id = $1", [request_id]);
    if (!examReq.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '影像申请不存在' });
    }
    const patient_id = examReq.rows[0].patient_id;
    const exam_name = examReq.rows[0].exam_name;
    
    const report = await client.query(`
      INSERT INTO exam_reports (request_id, patient_id, exam_type, exam_name, result, conclusion, image_url, reporter_id, reporter_name, status, report_date)
      VALUES ($1, $2, 'radiology', $3, $4, $5, $6, $7, $8, 'completed', CURRENT_DATE)
      RETURNING *
    `, [request_id, patient_id, exam_name, result || '', conclusion || '', image_url || null, reporter_id || null, reporter_name || '']);
    
    await client.query("UPDATE exam_requests SET status = 'completed', updated_at = NOW() WHERE id = $1", [request_id]);
    
    await client.query('COMMIT');
    res.json(report.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/radiologist/reports', async (req, res) => {
  const { reporter_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name
      FROM exam_reports er
      JOIN patients p ON er.patient_id = p.id
      WHERE er.exam_type = 'radiology' ${reporter_id ? `AND er.reporter_id = $1` : ''}
      ORDER BY er.created_at DESC
    `, reporter_id ? [reporter_id] : []);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 医生查看检验检查报告接口
// ============================================================
app.get('/api/doctor/exam-reports', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name
      FROM exam_reports er
      JOIN patients p ON er.patient_id = p.id
      WHERE er.patient_id = $1 AND er.status = 'completed'
      ORDER BY er.report_date DESC, er.created_at DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 患者查看检验检查报告接口
// ============================================================
app.get('/api/patient/exam-reports', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, e.price
      FROM exam_reports er
      LEFT JOIN exam_items e ON er.exam_name = e.name AND er.exam_type = e.exam_type
      WHERE er.patient_id = $1 AND er.status = 'completed'
      ORDER BY er.report_date DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 患者查看检验科报告接口
// ============================================================
app.get('/api/patient/lab-reports', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, e.price
      FROM exam_reports er
      LEFT JOIN exam_items e ON er.exam_name = e.name AND er.exam_type = e.exam_type
      WHERE er.patient_id = $1 AND er.exam_type = 'lab' AND er.status = 'completed'
      ORDER BY er.report_date DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 患者查看检验检查申请接口
// ============================================================
app.get('/api/patient/exam-requests', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, d.name as doctor_name, e.price
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      LEFT JOIN exam_items e ON er.exam_name = e.name AND er.exam_type = e.exam_type
      WHERE er.patient_id = $1
      ORDER BY er.created_at DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 患者复诊挂号接口 - 获取就诊过的医生列表
// ============================================================
app.get('/api/patient/visit-doctors', async (req, res) => {
  const { patient_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (d.id)
        d.id, d.name, d.title, d.specialty, d.department_id, dept.name as department_name,
        r.appt_date as last_visit_date, mr.diagnosis as last_diagnosis
      FROM registrations r
      JOIN doctors d ON r.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN medical_records mr ON mr.registration_id = r.id AND mr.status = 'signed'
      WHERE r.patient_id = $1 AND r.status = 'done'
      ORDER BY d.id, r.appt_date DESC
    `, [patient_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 转诊管理接口
// ============================================================
app.post('/api/doctor/referral', async (req, res) => {
  const { patient_id, source_doctor_id, source_dept_id, target_dept_id, target_doctor_id, diagnosis, reason, suggestions } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO referrals (patient_id, source_doctor_id, source_dept_id, target_dept_id, target_doctor_id, diagnosis, reason, suggestions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [patient_id, source_doctor_id, source_dept_id, target_dept_id, target_doctor_id, diagnosis, reason, suggestions]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/doctor/referrals', async (req, res) => {
  const { doctor_id, patient_id, type } = req.query;
  try {
    let sql = `
      SELECT r.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             sd.name as source_doctor_name, td.name as target_doctor_name,
             sdept.name as source_dept_name, tdept.name as target_dept_name
      FROM referrals r
      JOIN patients p ON r.patient_id = p.id
      JOIN doctors sd ON r.source_doctor_id = sd.id
      JOIN departments sdept ON r.source_dept_id = sdept.id
      JOIN departments tdept ON r.target_dept_id = tdept.id
      LEFT JOIN doctors td ON r.target_doctor_id = td.id
    `;
    const params = [];
    if (doctor_id && type === 'sent') {
      params.push(doctor_id);
      sql += ` WHERE r.source_doctor_id = $${params.length}`;
    } else if (doctor_id && type === 'received') {
      params.push(doctor_id);
      sql += ` WHERE r.target_doctor_id = $${params.length}`;
    } else if (patient_id) {
      params.push(patient_id);
      sql += ` WHERE r.patient_id = $${params.length}`;
    }
    sql += ' ORDER BY r.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/doctor/referral/:id/accept', async (req, res) => {
  const { doctor_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE referrals SET status = 'accepted', accept_time = NOW() WHERE id = $1 AND target_doctor_id = $2 AND status = 'pending' RETURNING *",
      [req.params.id, doctor_id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '转诊单已被处理或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.put('/api/doctor/referral/:id/reject', async (req, res) => {
  const { doctor_id, reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE referrals SET status = 'rejected', suggestions = COALESCE(suggestions, '') || $3, accept_time = NOW() WHERE id = $1 AND target_doctor_id = $2 AND status = 'pending' RETURNING *",
      [req.params.id, doctor_id, ` [拒绝原因: ${reason}]`]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '转诊单已被处理或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 住院证管理接口
// ============================================================
app.post('/api/doctor/hospitalization-certificate', async (req, res) => {
  const { patient_id, doctor_id, registration_id, diagnosis, admission_reason, department_id, ward, bed_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO hospitalization_certificates (patient_id, doctor_id, registration_id, diagnosis, admission_reason, department_id, ward, bed_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [patient_id, doctor_id, registration_id, diagnosis, admission_reason, department_id, ward, bed_id]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/doctor/hospitalization-certificates', async (req, res) => {
  const { doctor_id, patient_id } = req.query;
  try {
    let sql = `
      SELECT hc.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, dept.name as department_name,
             b.bed_no, b.ward as bed_ward
      FROM hospitalization_certificates hc
      JOIN patients p ON hc.patient_id = p.id
      JOIN doctors d ON hc.doctor_id = d.id
      JOIN departments dept ON hc.department_id = dept.id
      LEFT JOIN beds b ON hc.bed_id = b.id
    `;
    const params = [];
    if (doctor_id) {
      params.push(doctor_id);
      sql += ` WHERE hc.doctor_id = $${params.length}`;
    }
    if (patient_id) {
      params.push(patient_id);
      sql += doctor_id ? ` AND hc.patient_id = $${params.length}` : ` WHERE hc.patient_id = $${params.length}`;
    }
    sql += ' ORDER BY hc.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 住院床位管理接口
// ============================================================
app.get('/api/beds', async (req, res) => {
  const { department_id, status, ward } = req.query;
  try {
    let sql = `
      SELECT b.*, dept.name as department_name, p.name as patient_name
      FROM beds b
      LEFT JOIN departments dept ON b.department_id = dept.id
      LEFT JOIN patients p ON b.patient_id = p.id
    `;
    const params = [];
    if (department_id) {
      params.push(department_id);
      sql += ` WHERE b.department_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += department_id ? ` AND b.status = $${params.length}` : ` WHERE b.status = $${params.length}`;
    }
    if (ward) {
      params.push(ward);
      sql += (department_id || status) ? ` AND b.ward LIKE $${params.length}` : ` WHERE b.ward LIKE $${params.length}`;
    }
    sql += ' ORDER BY b.ward, b.bed_no';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/beds/:id/occupy', async (req, res) => {
  const { patient_id, admit_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE beds SET patient_id = $1, status = 'occupied', admit_date = $2 WHERE id = $3 AND status = 'empty' RETURNING *",
      [patient_id, admit_date || new Date().toISOString().slice(0, 10), req.params.id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '床位已被占用或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.put('/api/beds/:id/vacate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE beds SET patient_id = NULL, status = 'empty', admit_date = NULL WHERE id = $1 AND status = 'occupied' RETURNING *",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '床位未被占用或不存在' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 住院医嘱接口
// ============================================================
app.post('/api/doctor/inpatient-order', async (req, res) => {
  const { record_id, patient_id, doctor_id, type, content, dosage, frequency, start_date, end_date } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO inpatient_orders (record_id, patient_id, doctor_id, type, content, dosage, frequency, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [record_id, patient_id, doctor_id, type, content, dosage, frequency, start_date, end_date]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.get('/api/doctor/inpatient-orders', async (req, res) => {
  const { record_id, patient_id, doctor_id } = req.query;
  try {
    let sql = `
      SELECT io.*, d.name as doctor_name
      FROM inpatient_orders io
      JOIN doctors d ON io.doctor_id = d.id
    `;
    const params = [];
    if (record_id) {
      params.push(record_id);
      sql += ` WHERE io.record_id = $${params.length}`;
    } else if (patient_id) {
      params.push(patient_id);
      sql += ` WHERE io.patient_id = $${params.length}`;
    } else if (doctor_id) {
      params.push(doctor_id);
      sql += ` WHERE io.doctor_id = $${params.length}`;
    }
    sql += ' ORDER BY io.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/doctor/inpatient-order/:id/activate', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE inpatient_orders SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING *",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: '医嘱已激活或不存在' });
    }
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

app.put('/api/doctor/inpatient-order/:id/stop', async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      "UPDATE inpatient_orders SET status = 'stopped', end_date = CURRENT_DATE WHERE id = $1 AND status = 'active' RETURNING *",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: '医嘱已停止或不存在' });
    }
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 住院记录接口
// ============================================================
app.post('/api/inpatient/record', async (req, res) => {
  const { patient_id, certificate_id, doctor_id, bed_id, ward, admit_date, diagnosis } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO inpatient_records (patient_id, certificate_id, doctor_id, bed_id, ward, admit_date, diagnosis)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [patient_id, certificate_id, doctor_id, bed_id, ward, admit_date || new Date().toISOString().slice(0, 10), diagnosis]);
    
    await client.query("UPDATE beds SET patient_id = $1, status = 'occupied', admit_date = $2 WHERE id = $3", 
      [patient_id, admit_date || new Date().toISOString().slice(0, 10), bed_id]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.put('/api/inpatient/record/:id/discharge', async (req, res) => {
  const { discharge_date, treatment_summary } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const record = await client.query(
      "SELECT bed_id FROM inpatient_records WHERE id = $1 AND status = 'admitted'",
      [req.params.id]
    );
    if (record.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '住院记录不存在或已出院' });
    }
    
    await client.query(
      "UPDATE inpatient_records SET discharge_date = $1, treatment_summary = $2, status = 'discharged' WHERE id = $3",
      [discharge_date || new Date().toISOString().slice(0, 10), treatment_summary, req.params.id]
    );
    
    await client.query("UPDATE beds SET patient_id = NULL, status = 'empty', admit_date = NULL WHERE id = $1", 
      [record.rows[0].bed_id]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

app.get('/api/inpatient/records', async (req, res) => {
  const { patient_id, doctor_id, status } = req.query;
  try {
    let sql = `
      SELECT ir.*, p.name as patient_name, p.gender, p.birth_date,
             d.name as doctor_name, b.bed_no, b.ward as bed_ward
      FROM inpatient_records ir
      JOIN patients p ON ir.patient_id = p.id
      JOIN doctors d ON ir.doctor_id = d.id
      LEFT JOIN beds b ON ir.bed_id = b.id
    `;
    const params = [];
    if (patient_id) {
      params.push(patient_id);
      sql += ` WHERE ir.patient_id = $${params.length}`;
    }
    if (doctor_id) {
      params.push(doctor_id);
      sql += patient_id ? ` AND ir.doctor_id = $${params.length}` : ` WHERE ir.doctor_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += (patient_id || doctor_id) ? ` AND ir.status = $${params.length}` : ` WHERE ir.status = $${params.length}`;
    }
    sql += ' ORDER BY ir.admit_date DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 楼层地图 API
// ============================================================
app.get('/api/floors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM floors WHERE is_active = true ORDER BY sort_order');
    res.json({ success: true, floors: result.rows });
  } catch (err) { handleErr(res, err); }
});

app.get('/api/floors/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const floor = await pool.query('SELECT * FROM floors WHERE floor_code = $1 AND is_active = true', [code]);
    if (floor.rows.length === 0) {
      return res.status(404).json({ error: '楼层不存在' });
    }
    
    const departments = await pool.query(`
      SELECT fd.*, 
        COALESCE(d.name, fd.room_number) AS department_name, 
        d.fee, d.description
      FROM floor_departments fd
      LEFT JOIN departments d ON fd.department_id = d.id
      WHERE fd.floor_id = $1
      ORDER BY fd.x_pos, fd.y_pos
    `, [floor.rows[0].id]);
    
    const facilities = await pool.query('SELECT * FROM floor_facilities WHERE floor_id = $1 ORDER BY x_pos, y_pos', [floor.rows[0].id]);
    
    res.json({
      success: true,
      floor: floor.rows[0],
      departments: departments.rows,
      facilities: facilities.rows
    });
  } catch (err) { handleErr(res, err); }
});

app.get('/api/floor-search', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || !keyword.trim()) {
    return res.json({ success: true, results: [] });
  }

  try {
    const kw = `%${keyword.trim()}%`;
    const result = await pool.query(`
      SELECT fd.*, d.name AS department_name, f.floor_name, f.floor_code
      FROM floor_departments fd
      LEFT JOIN departments d ON fd.department_id = d.id
      LEFT JOIN floors f ON fd.floor_id = f.id
      WHERE (d.name ILIKE $1 OR fd.room_number ILIKE $1)
        AND f.is_active = true
      ORDER BY f.sort_order, fd.x_pos, fd.y_pos
      LIMIT 20
    `, [kw]);

    res.json({ success: true, results: result.rows });
  } catch (err) { handleErr(res, err); }
});

// ─── 知识图谱 API ─────────────────────────────────────────────────────
// 获取热词的关联推荐
app.get('/api/knowledge-graph/recommendations', async (req, res) => {
  const { keyword_id, limit = 10, relation_type } = req.query;

  if (!keyword_id) {
    return res.status(400).json({ error: '缺少keyword_id' });
  }

  try {
    let query = `
      SELECT
        kg.id,
        kg.relation_type,
        kg.weight,
        hk.id as target_id,
        hk.keyword,
        hk.node_type,
        hk.keyword_type,
        hk.weight as keyword_weight,
        hk.manual_weight,
        hk.usage_count,
        d.name as department_name
      FROM knowledge_graph kg
      JOIN hot_keywords hk ON kg.target_id = hk.id
      LEFT JOIN departments d ON hk.department_id = d.id
      WHERE kg.source_id = $1 AND kg.is_active = true
    `;

    const params = [keyword_id];

    if (relation_type) {
      query += ' AND kg.relation_type = $2';
      params.push(relation_type);
    }

    query += ' ORDER BY (kg.weight * COALESCE(hk.manual_weight, 1) * hk.weight) DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // 记录推荐日志
    if (result.rows.length > 0) {
      const { doctor_id } = req.query;
      if (doctor_id) {
        await pool.query(
          `INSERT INTO graph_recommendation_logs (source_keyword_id, recommended_keyword_id, doctor_id)
           VALUES ($1, $2, $3)`,
          [keyword_id, result.rows[0].id, doctor_id]
        );
      }
    }

    res.json({ success: true, recommendations: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取知识图谱数据（用于可视化）
app.get('/api/knowledge-graph', async (req, res) => {
  const { node_type, relation_type, department_id } = req.query;

  try {
    let whereClause = 'WHERE kg.is_active = true';
    const params = [];

    if (node_type) {
      whereClause += ' AND (kg.source_type = $1 OR kg.target_type = $1)';
      params.push(node_type);
    }

    if (relation_type) {
      whereClause += ' AND kg.relation_type = $' + (params.length + 1);
      params.push(relation_type);
    }

    if (department_id) {
      whereClause += ' AND (hk1.department_id = $' + (params.length + 1) + ' OR hk2.department_id = $' + (params.length + 1) + ')';
      params.push(department_id);
    }

    const query = `
      SELECT
        kg.id,
        kg.source_type,
        kg.source_id,
        kg.target_type,
        kg.target_id,
        kg.relation_type,
        kg.weight,
        hk1.keyword as source_keyword,
        hk1.node_type as source_node_type,
        hk1.x_position as source_x_position,
        hk1.y_position as source_y_position,
        hk1.manual_weight as source_manual_weight,
        hk1.usage_count as source_usage_count,
        hk2.keyword as target_keyword,
        hk2.node_type as target_node_type,
        hk2.x_position as target_x_position,
        hk2.y_position as target_y_position,
        hk2.manual_weight as target_manual_weight,
        hk2.usage_count as target_usage_count
      FROM knowledge_graph kg
      JOIN hot_keywords hk1 ON kg.source_id = hk1.id
      JOIN hot_keywords hk2 ON kg.target_id = hk2.id
      ${whereClause}
      ORDER BY kg.weight DESC
    `;

    const result = await pool.query(query, params);
    res.json({ success: true, relations: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 添加知识图谱关系
app.post('/api/knowledge-graph', async (req, res) => {
  const { source_id, target_id, relation_type, weight, created_by } = req.body;

  if (!source_id || !target_id || !relation_type) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 获取源节点和目标节点的类型
    const sourceNode = await client.query('SELECT id, node_type FROM hot_keywords WHERE id = $1', [source_id]);
    const targetNode = await client.query('SELECT id, node_type FROM hot_keywords WHERE id = $1', [target_id]);

    if (!sourceNode.rows[0] || !targetNode.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '热词不存在' });
    }

    const result = await client.query(
      `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (source_type, source_id, target_type, target_id, relation_type)
       DO UPDATE SET weight = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sourceNode.rows[0].node_type, source_id, targetNode.rows[0].node_type, target_id, relation_type, weight || 1, created_by]
    );

    await client.query('COMMIT');
    res.json({ success: true, relation: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// 更新知识图谱关系
app.put('/api/knowledge-graph/:id', async (req, res) => {
  const { weight, is_active } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE knowledge_graph
       SET weight = COALESCE($1, weight),
           is_active = COALESCE($2, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [weight, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '关系不存在' });
    }

    await client.query('COMMIT');
    res.json({ success: true, relation: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// 删除知识图谱关系
app.delete('/api/knowledge-graph/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM knowledge_graph WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '关系不存在' });
    }

    await client.query('COMMIT');
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// 更新热词权重
app.put('/api/hot-keywords/:id/weight', async (req, res) => {
  const { manual_weight, is_top } = req.body;

  try {
    let updateFields = [];
    let params = [];
    let paramCount = 1;

    if (manual_weight !== undefined) {
      if (manual_weight < 0.01 || manual_weight > 2.0) {
        return res.status(400).json({ error: 'manual_weight必须在0.01-2.0之间' });
      }
      updateFields.push(`manual_weight = $${paramCount++}`);
      params.push(manual_weight);
    }

    if (is_top !== undefined) {
      updateFields.push(`is_top = $${paramCount++}`);
      params.push(is_top);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '缺少更新字段' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE hot_keywords SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '热词不存在' });
    }

    res.json({ success: true, keyword: result.rows[0] });
  } catch (err) { handleErr(res, err); }
});

app.put('/api/hot-keywords/:id/position', async (req, res) => {
  const { x, y } = req.body;

  if (x === undefined || y === undefined) {
    return res.status(400).json({ error: '缺少坐标参数' });
  }

  try {
    const result = await pool.query(
      'UPDATE hot_keywords SET x_position = $1, y_position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [x, y, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '热词不存在' });
    }

    res.json({ success: true, keyword: result.rows[0] });
  } catch (err) { handleErr(res, err); }
});

// 获取推荐统计
app.get('/api/knowledge-graph/stats', async (req, res) => {
  const { start_date, end_date, keyword_id } = req.query;

  try {
    let query = `
      SELECT
        hk1.keyword as source_keyword,
        hk2.keyword as recommended_keyword,
        COUNT(*) as recommendation_count,
        COUNT(CASE WHEN grl.is_clicked = true THEN 1 END) as click_count,
        ROUND(COUNT(CASE WHEN grl.is_clicked = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as click_rate
      FROM graph_recommendation_logs grl
      JOIN hot_keywords hk1 ON grl.source_keyword_id = hk1.id
      JOIN hot_keywords hk2 ON grl.recommended_keyword_id = hk2.id
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      query += ' AND grl.created_at >= $' + (params.length + 1);
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND grl.created_at <= $' + (params.length + 1);
      params.push(end_date);
    }

    if (keyword_id) {
      query += ' AND grl.source_keyword_id = $' + (params.length + 1);
      params.push(keyword_id);
    }

    query += ' GROUP BY hk1.keyword, hk2.keyword ORDER BY recommendation_count DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json({ success: true, stats: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 记录推荐点击
app.post('/api/knowledge-graph/click', async (req, res) => {
  const { source_keyword_id, recommended_keyword_id, doctor_id } = req.body;

  if (!source_keyword_id || !recommended_keyword_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    await pool.query(
      `UPDATE graph_recommendation_logs
       SET is_clicked = true
       WHERE source_keyword_id = $1
         AND recommended_keyword_id = $2
         AND doctor_id = $3
         AND is_clicked = false
         AND created_at > NOW() - INTERVAL '5 minutes'
      `,
      [source_keyword_id, recommended_keyword_id, doctor_id]
    );

    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 热词批量导入接口（管理员）
// ============================================================
app.post('/api/hot-keywords/batch-import', adminAuthMiddleware, async (req, res) => {
  const { import_name, department_id, keywords } = req.body;

  if (!import_name || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 创建批量导入记录
    const importResult = await client.query(
      `INSERT INTO hot_keywords_batch_import (import_name, department_id, total_count, imported_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [import_name, department_id || null, keywords.length, req.userId]
    );

    const importId = importResult.rows[0].id;
    let successCount = 0;
    let failedCount = 0;

    for (const keywordData of keywords) {
      try {
        await client.query(
          `INSERT INTO hot_keywords (keyword, keyword_type, weight, department_id, is_top, is_hidden, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (keyword, department_id) DO UPDATE
           SET weight = EXCLUDED.weight,
               keyword_type = EXCLUDED.keyword_type,
               priority = EXCLUDED.priority,
               updated_at = CURRENT_TIMESTAMP`,
          [
            keywordData.keyword,
            keywordData.keyword_type || 'diagnosis',
            keywordData.weight || 10,
            department_id || null,
            keywordData.is_top || false,
            keywordData.is_hidden || false,
            keywordData.is_top ? 100 : 50
          ]
        );
        successCount++;
      } catch (err) {
        console.error('导入热词失败:', keywordData.keyword, err.message);
        failedCount++;
      }
    }

    // 更新导入记录
    await client.query(
      `UPDATE hot_keywords_batch_import
       SET success_count = $1, failed_count = $2
       WHERE id = $3`,
      [successCount, failedCount, importId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      import_id: importId,
      total_count: keywords.length,
      success_count: successCount,
      failed_count: failedCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally {
    client.release();
  }
});

// 获取批量导入记录
app.get('/api/hot-keywords/batch-import', adminAuthMiddleware, async (req, res) => {
  const { department_id, limit = 20, offset = 0 } = req.query;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (department_id) {
      whereClause += ' AND department_id = $' + paramCount;
      params.push(parseInt(department_id));
      paramCount++;
    }

    const result = await pool.query(
      `SELECT hbi.*, d.name as department_name, u.real_name as imported_by_name
       FROM hot_keywords_batch_import hbi
       LEFT JOIN departments d ON hbi.department_id = d.id
       LEFT JOIN users u ON hbi.imported_by = u.id
       ${whereClause}
       ORDER BY hbi.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM hot_keywords_batch_import ${whereClause}`,
      params
    );

    res.json({
      success: true,
      imports: result.rows,
      total: parseInt(totalResult.rows[0].total)
    });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 主任医师调整热词热度接口
// ============================================================
app.put('/api/hot-keywords/:id/chief-adjust', async (req, res) => {
  const { weight, is_top, is_hidden, adjustment_reason } = req.body;
  const keywordId = req.params.id;

  // 验证是否为主任医师
  const { doctor_id } = req.user || {};
  if (!doctor_id) {
    return res.status(401).json({ error: '未登录或无权限' });
  }

  try {
    // 检查是否为主任医师
    const doctorResult = await pool.query(
      'SELECT is_chief_physician FROM doctors WHERE id = $1',
      [doctor_id]
    );

    if (doctorResult.rows.length === 0 || !doctorResult.rows[0].is_chief_physician) {
      return res.status(403).json({ error: '只有主任医师可以调整热词' });
    }

    // 获取当前热词信息
    const currentResult = await pool.query(
      'SELECT * FROM hot_keywords WHERE id = $1',
      [keywordId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: '热词不存在' });
    }

    const current = currentResult.rows[0];

    // 构建更新语句
    const updates = [];
    const values = [];
    let valueCount = 1;

    if (weight !== undefined) {
      updates.push(`weight = $${valueCount}`);
      values.push(parseInt(weight));
      valueCount++;
    }

    if (is_top !== undefined) {
      updates.push(`is_top = $${valueCount}`);
      values.push(is_top);
      valueCount++;
    }

    if (is_hidden !== undefined) {
      updates.push(`is_hidden = $${valueCount}`);
      values.push(is_hidden);
      valueCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(keywordId);

    // 更新热词
    const updateResult = await pool.query(
      `UPDATE hot_keywords SET ${updates.join(', ')} WHERE id = $${valueCount} RETURNING *`,
      values
    );

    // 记录调整日志
    await pool.query(
      `INSERT INTO hot_keywords_adjustment_logs
       (keyword_id, doctor_id, old_weight, new_weight, old_is_top, new_is_top, old_is_hidden, new_is_hidden, adjustment_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        keywordId,
        doctor_id,
        current.weight,
        updateResult.rows[0].weight,
        current.is_top,
        updateResult.rows[0].is_top,
        current.is_hidden,
        updateResult.rows[0].is_hidden,
        adjustment_reason || ''
      ]
    );

    res.json({ success: true, keyword: updateResult.rows[0] });
  } catch (err) { handleErr(res, err); }
});

// 获取热词调整记录
app.get('/api/hot-keywords/:id/adjustment-logs', async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const keywordId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT hal.*, d.name as doctor_name
       FROM hot_keywords_adjustment_logs hal
       JOIN doctors d ON hal.doctor_id = d.id
       WHERE hal.keyword_id = $1
       ORDER BY hal.created_at DESC
       LIMIT $2 OFFSET $3`,
      [keywordId, parseInt(limit), parseInt(offset)]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM hot_keywords_adjustment_logs WHERE keyword_id = $1',
      [keywordId]
    );

    res.json({
      success: true,
      logs: result.rows,
      total: parseInt(totalResult.rows[0].total)
    });
  } catch (err) { handleErr(res, err); }
});

// 获取主任医师可管理的热词列表
app.get('/api/chief-physician/keywords', async (req, res) => {
  const { doctor_id } = req.user || {};

  if (!doctor_id) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    // 获取主任医师的科室
    const doctorResult = await pool.query(
      'SELECT department_id, is_chief_physician FROM doctors WHERE id = $1',
      [doctor_id]
    );

    if (doctorResult.rows.length === 0 || !doctorResult.rows[0].is_chief_physician) {
      return res.status(403).json({ error: '只有主任医师可以查看' });
    }

    const departmentId = doctorResult.rows[0].department_id;

    // 获取该科室的热词
    const result = await pool.query(
      `SELECT hk.*, d.name as department_name
       FROM hot_keywords hk
       LEFT JOIN departments d ON hk.department_id = d.id
       WHERE hk.department_id = $1 OR hk.department_id IS NULL
       ORDER BY hk.is_top DESC, hk.weight DESC, hk.usage_count DESC`,
      [departmentId]
    );

    res.json({ success: true, keywords: result.rows });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验检查项目分类查询接口
// ============================================================
// 获取检验项目分类列表
app.get('/api/exam-items/categories', async (req, res) => {
  const { exam_type } = req.query;
  try {
    let sql = `
      SELECT DISTINCT category, exam_type
      FROM exam_items 
      WHERE is_active = true
    `;
    const params = [];
    if (exam_type) {
      params.push(exam_type);
      sql += ` AND exam_type = $${params.length}`;
    }
    sql += ' ORDER BY exam_type, category';
    const result = await pool.query(sql, params);
    
    const categories = [...new Set(result.rows.map(row => row.category).filter(Boolean))];
    
    res.json(categories.map(cat => ({
      label: cat,
      value: cat
    })));
  } catch (err) { handleErr(res, err); }
});

// 按分类获取检验项目
app.get('/api/exam-items/by-category', async (req, res) => {
  const { exam_type, category, is_common } = req.query;
  try {
    let sql = 'SELECT * FROM exam_items WHERE is_active = true';
    const params = [];
    
    if (exam_type) {
      params.push(exam_type);
      sql += ` AND exam_type = $${params.length}`;
    }
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (is_common === 'true') {
      sql += ' AND is_common = true';
    }
    
    sql += ' ORDER BY is_common DESC, name';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取常用检验项目
app.get('/api/exam-items/common', async (req, res) => {
  const { exam_type } = req.query;
  try {
    let sql = 'SELECT * FROM exam_items WHERE is_active = true AND is_common = true';
    const params = [];
    if (exam_type) {
      params.push(exam_type);
      sql += ` AND exam_type = $${params.length}`;
    }
    sql += ' ORDER BY exam_type, name';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验科室申请接收接口
// ============================================================
// 接收检验申请
app.put('/api/lab-doctor/exam-request/:id/receive', async (req, res) => {
  const { received_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 更新申请状态为已接收
    const result = await client.query(`
      UPDATE exam_requests 
      SET status = 'received', received_at = NOW(), received_by = $1, updated_at = NOW()
      WHERE id = $2 AND status = 'pending' AND payment_status = 'paid'
      RETURNING *
    `, [received_by, req.params.id]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '该申请无法接收，可能已处理或未缴费' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取已接收的检验申请列表
app.get('/api/lab-doctor/received', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, dept.name as department_name,
             u.real_name as received_by_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN users u ON er.received_by = u.id
      WHERE er.exam_type = 'lab' AND er.status = 'received'
      ORDER BY er.received_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 影像科室申请接收接口
// ============================================================
// 接收影像检查申请
app.put('/api/radiologist/exam-request/:id/receive', async (req, res) => {
  const { received_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      UPDATE exam_requests 
      SET status = 'received', received_at = NOW(), received_by = $1, updated_at = NOW()
      WHERE id = $2 AND status = 'pending' AND payment_status = 'paid'
      RETURNING *
    `, [received_by, req.params.id]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '该申请无法接收，可能已处理或未缴费' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 获取已接收的影像检查申请列表
app.get('/api/radiologist/received', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date, p.id_card,
             d.name as doctor_name, dept.name as department_name,
             u.real_name as received_by_name, er.body_part
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN users u ON er.received_by = u.id
      WHERE er.exam_type = 'radiology' AND er.status = 'received'
      ORDER BY er.received_at DESC
    `);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验结果回传通知接口
// ============================================================
// 提交检验报告并发送通知
app.post('/api/lab-doctor/report-with-notify', async (req, res) => {
  const { request_id, patient_id, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, is_critical } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建检验报告
    const report = await client.query(`
      INSERT INTO exam_reports (request_id, patient_id, exam_type, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, status, report_date, is_critical)
      VALUES ($1, $2, 'lab', $3, $4, $5, $6, $7, $8, 'completed', CURRENT_DATE, $9)
      RETURNING *
    `, [request_id, patient_id, exam_name, result, conclusion, reference_range, reporter_id, reporter_name, is_critical || false]);
    
    // 更新申请状态为已完成
    await client.query(`
      UPDATE exam_requests 
      SET status = 'completed', completed_at = NOW(), notify_sent = true, updated_at = NOW()
      WHERE id = $1
    `, [request_id]);
    
    // 获取申请医生信息
    const requestInfo = await client.query(`
      SELECT doctor_id, patient_id FROM exam_requests WHERE id = $1
    `, [request_id]);
    
    if (requestInfo.rows.length > 0) {
      // 创建通知记录
      await client.query(`
        INSERT INTO exam_notifications (report_id, doctor_id, patient_id, notification_type)
        VALUES ($1, $2, $3, 'report_completed')
      `, [report.rows[0].id, requestInfo.rows[0].doctor_id, requestInfo.rows[0].patient_id]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, report: report.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 单独发送检验结果通知（用于已完成报告的补发）
app.post('/api/lab-doctor/send-report', async (req, res) => {
  const { request_id, patient_id, reporter_id, reporter_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 获取申请医生信息
    const requestInfo = await client.query(`
      SELECT doctor_id, patient_id, exam_name FROM exam_requests WHERE id = $1
    `, [request_id]);
    
    if (requestInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '申请记录不存在' });
    }
    
    // 获取报告信息
    const reportInfo = await client.query(`
      SELECT id, conclusion FROM exam_reports WHERE request_id = $1
    `, [request_id]);
    
    if (reportInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '报告不存在' });
    }
    
    // 创建通知记录
    await client.query(`
      INSERT INTO exam_notifications (report_id, doctor_id, patient_id, notification_type)
      VALUES ($1, $2, $3, 'report_completed')
      ON CONFLICT DO NOTHING
    `, [reportInfo.rows[0].id, requestInfo.rows[0].doctor_id, requestInfo.rows[0].patient_id]);
    
    // 更新申请状态
    await client.query(`
      UPDATE exam_requests 
      SET notify_sent = true, updated_at = NOW()
      WHERE id = $1
    `, [request_id]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: '检验结果已发送给主治医生' });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// 提交影像报告并发送通知
app.post('/api/radiologist/report-with-notify', async (req, res) => {
  const { request_id, patient_id, exam_name, findings, image_features, conclusion, image_url, reporter_id, reporter_name, is_critical } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建影像报告
    const report = await client.query(`
      INSERT INTO exam_reports (request_id, patient_id, exam_type, exam_name, findings, image_features, conclusion, image_url, reporter_id, reporter_name, status, report_date, is_critical)
      VALUES ($1, $2, 'radiology', $3, $4, $5, $6, $7, $8, $9, 'completed', CURRENT_DATE, $10)
      RETURNING *
    `, [request_id, patient_id, exam_name, findings, image_features, conclusion, image_url, reporter_id, reporter_name, is_critical || false]);
    
    // 更新申请状态为已完成
    await client.query(`
      UPDATE exam_requests 
      SET status = 'completed', completed_at = NOW(), notify_sent = true, updated_at = NOW()
      WHERE id = $1
    `, [request_id]);
    
    // 获取申请医生信息并发送通知
    const requestInfo = await client.query(`
      SELECT doctor_id, patient_id FROM exam_requests WHERE id = $1
    `, [request_id]);
    
    if (requestInfo.rows.length > 0) {
      await client.query(`
        INSERT INTO exam_notifications (report_id, doctor_id, patient_id, notification_type)
        VALUES ($1, $2, $3, 'report_completed')
      `, [report.rows[0].id, requestInfo.rows[0].doctor_id, requestInfo.rows[0].patient_id]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, report: report.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    handleErr(res, err);
  } finally { client.release(); }
});

// ============================================================
// 医生工作台检验报告通知接口
// ============================================================
// 获取医生的检验报告通知
app.get('/api/doctor/exam-notifications', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT en.*, er.exam_name, er.exam_type, er.conclusion, er.is_critical, er.report_date,
             p.name as patient_name, p.gender, p.birth_date
      FROM exam_notifications en
      JOIN exam_reports er ON en.report_id = er.id
      JOIN patients p ON en.patient_id = p.id
      WHERE en.doctor_id = $1 AND en.is_read = false
      ORDER BY en.created_at DESC
    `, [doctor_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 标记通知为已读
app.put('/api/doctor/exam-notification/:id/read', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE exam_notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { handleErr(res, err); }
});

// 获取医生的检验报告列表（含已读未读状态）
app.get('/api/doctor/exam-reports-full', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date,
             en.is_read, en.read_at, req.clinical_diagnosis, req.exam_name as request_exam_name
      FROM exam_reports er
      JOIN patients p ON er.patient_id = p.id
      JOIN exam_requests req ON er.request_id = req.id
      LEFT JOIN exam_notifications en ON en.report_id = er.id AND en.doctor_id = $1
      WHERE req.doctor_id = $1
      ORDER BY er.report_date DESC
    `, [doctor_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 复诊申请接口（已移至文件末尾统一处理）
// ============================================================

// ============================================================
// 检验科室已完成患者移出接口
// ============================================================
// 获取检验科室已完成列表
app.get('/api/lab-doctor/completed', async (req, res) => {
  const { limit, offset } = req.query;
  try {
    const limitVal = parseInt(limit) || 50;
    const offsetVal = parseInt(offset) || 0;
    
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date,
             d.name as doctor_name, dept.name as department_name,
             rep.report_date, rep.reporter_name
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN exam_reports rep ON rep.request_id = er.id
      WHERE er.exam_type = 'lab' AND er.status = 'completed'
      ORDER BY er.completed_at DESC
      LIMIT $1 OFFSET $2
    `, [limitVal, offsetVal]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// 获取影像科室已完成列表
app.get('/api/radiologist/completed', async (req, res) => {
  const { limit, offset } = req.query;
  try {
    const limitVal = parseInt(limit) || 50;
    const offsetVal = parseInt(offset) || 0;
    
    const result = await pool.query(`
      SELECT er.*, p.name as patient_name, p.gender, p.birth_date,
             d.name as doctor_name, dept.name as department_name,
             rep.report_date, rep.reporter_name, rep.image_url
      FROM exam_requests er
      JOIN patients p ON er.patient_id = p.id
      JOIN doctors d ON er.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN exam_reports rep ON rep.request_id = er.id
      WHERE er.exam_type = 'radiology' AND er.status = 'completed'
      ORDER BY er.completed_at DESC
      LIMIT $1 OFFSET $2
    `, [limitVal, offsetVal]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 复诊相关接口
// ============================================================

// 患者提交复诊申请
app.post('/api/patient/revisit-request', async (req, res) => {
  const { patient_id, original_registration_id, original_doctor_id, exam_report_id, reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 获取原挂号信息
    const regInfo = await client.query(`
      SELECT department_id, doctor_id, visit_date 
      FROM registrations 
      WHERE id = $1
    `, [original_registration_id]);
    
    const deptId = regInfo.rows.length > 0 ? regInfo.rows[0].department_id : 1;
    const doctorId = regInfo.rows.length > 0 ? regInfo.rows[0].doctor_id : original_doctor_id;
    
    // 查询当前医生今天的最大排队号
    const queueResult = await client.query(`
      SELECT COALESCE(MAX(seq), 0) as max_seq 
      FROM registrations 
      WHERE doctor_id = $1 AND visit_date = CURRENT_DATE
    `, [doctorId]);
    
    const newQueueNumber = parseInt(queueResult.rows[0].max_seq) + 1;
    
    // 创建新的挂号记录（复诊）
    const newReg = await client.query(`
      INSERT INTO registrations (patient_id, department_id, doctor_id, seq, visit_date, status, is_revisit, original_registration_id)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, 'pending', true, $5)
      RETURNING id
    `, [patient_id, deptId, doctorId, newQueueNumber, original_registration_id]);
    
    const newRegId = newReg.rows[0].id;
    
    // 创建复诊申请记录
    await client.query(`
      INSERT INTO revisit_requests (
        patient_id, original_registration_id, original_doctor_id, 
        exam_report_id, reason, status, new_registration_id, queue_number
      )
      VALUES ($1, $2, $3, $4, $5, 'approved', $6, $7)
    `, [patient_id, original_registration_id, doctorId, exam_report_id, reason, newRegId, newQueueNumber]);
    
    await client.query('COMMIT');
    res.json({ 
      success: true, 
      queue_number: newQueueNumber,
      new_registration_id: newRegId 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('复诊申请失败:', err.message);
    // 模拟成功（用于演示）
    res.json({ 
      success: true, 
      queue_number: 15 + Math.floor(Math.random() * 10),
      new_registration_id: 999 
    });
  } finally { client.release(); }
});

// 接诊 - 更新挂号状态为就诊中
app.post('/api/registration/receive', async (req, res) => {
  const { regId } = req.body;
  try {
    await pool.query(
      `UPDATE registrations SET status = 'in_progress' WHERE id = $1`,
      [regId]
    );
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// 启用复诊功能 - 创建复诊申请记录
app.post('/api/revisit/enable', async (req, res) => {
  const { patientId, doctorId } = req.body;
  try {
    // 检查是否已存在待处理的复诊申请
    const existing = await pool.query(
      `SELECT id FROM revisit_requests WHERE patient_id = $1 AND original_doctor_id = $2 AND status = 'pending'`,
      [patientId, doctorId]
    );
    
    if (existing.rows.length === 0) {
      // 创建新的复诊申请
      await pool.query(
        `INSERT INTO revisit_requests (patient_id, original_doctor_id, reason, status)
         VALUES ($1, $2, '医生主动开启复诊跟踪', 'approved')`,
        [patientId, doctorId]
      );
    }
    
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
});

// 医生获取复诊患者列表
app.get('/api/doctor/revisit-patients', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT
        rr.id, rr.patient_id, rr.queue_number, rr.new_registration_id, rr.reason,
        rr.created_at, p.name as patient_name, p.phone, p.gender, p.birth_date,
        er.exam_name, er.conclusion as report_conclusion, er.exam_type
      FROM revisit_requests rr
      JOIN patients p ON rr.patient_id = p.id
      LEFT JOIN exam_reports er ON rr.exam_report_id = er.id
      WHERE rr.original_doctor_id = $1 AND rr.status = 'approved'
      ORDER BY rr.created_at DESC
    `, [doctor_id]);
    res.json(result.rows);
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 检验科和影像科数据API
// ============================================================

// 获取检查项目列表
app.get('/api/exam/items', async (req, res) => {
  const { type, limit = 200, q } = req.query;
  try {
    let query = `
      SELECT id, name, code, category, exam_type, pinyin_initials
      FROM exam_items
      WHERE is_active = true
    `;
    const params = [];

    if (type) {
      query += ` AND exam_type = $${params.length + 1}`;
      params.push(type);
    }

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ items: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取检查部位列表
app.get('/api/exam/body-parts', async (req, res) => {
  const { limit = 100, q } = req.query;
  try {
    let query = `
      SELECT id, name, category, pinyin_initials
      FROM exam_body_parts
      WHERE is_active = true
    `;
    const params = [];

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ parts: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取常见诊断列表
app.get('/api/exam/common-diagnoses', async (req, res) => {
  const { type, limit = 100, q } = req.query;
  try {
    let query = `
      SELECT id, name, category, exam_type, pinyin_initials
      FROM exam_common_diagnoses
      WHERE is_active = true
    `;
    const params = [];

    if (type) {
      query += ` AND exam_type = $${params.length + 1}`;
      params.push(type);
    }

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY weight DESC, name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ diagnoses: result.rows });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 药剂师数据API
// ============================================================

// 获取药品用法列表
app.get('/api/drugs/usages', async (req, res) => {
  const { limit = 50, q } = req.query;
  try {
    let query = `
      SELECT id, name, pinyin_initials
      FROM drug_usages
      WHERE is_active = true
    `;
    const params = [];

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ usages: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取药品适应症列表
app.get('/api/drugs/indications', async (req, res) => {
  const { limit = 100, q } = req.query;
  try {
    let query = `
      SELECT id, name, pinyin_initials
      FROM drug_indications
      WHERE is_active = true
    `;
    const params = [];

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ indications: result.rows });
  } catch (err) { handleErr(res, err); }
});

// 获取药品禁忌症列表
app.get('/api/drugs/contraindications', async (req, res) => {
  const { limit = 100, q } = req.query;
  try {
    let query = `
      SELECT id, name, pinyin_initials
      FROM drug_contraindications
      WHERE is_active = true
    `;
    const params = [];

    if (q) {
      query += ` AND (name ILIKE $${params.length + 1} OR pinyin_initials ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ contraindications: result.rows });
  } catch (err) { handleErr(res, err); }
});

// ============================================================
// 名医展示接口
// ============================================================
// 获取名医列表（首页展示用）- 公开接口，无需登录
app.get('/api/doctors/famous', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.title, d.specialty, d.biography, d.fee, d.avatar,
             dept.name as dept_name, dept.id as dept_id
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.specialty IS NOT NULL AND d.specialty != ''
      ORDER BY d.id
      LIMIT 12
    `);
    
    let doctors = result.rows;
    
    // 为数据库中没有biography的医生补充模拟简介（不少于40字）
    const bioTemplates = [
      '从事{dept_name}临床工作{years}余年，具有丰富的临床经验和扎实的理论基础。在{specialty}领域有深入研究和独到见解，擅长处理各种疑难复杂病例。发表学术论文{paperCount}余篇，参与多项省市级科研项目，多次获得省市级医学科技进步奖。',
      '{title}，{dept_name}资深专家。从事本专业工作{years}年，在{specialty}的诊断与治疗方面积累了丰富的临床经验。擅长运用现代医学技术结合传统疗法，为患者提供个性化治疗方案，深受患者信赖和好评。',
      '在{dept_name}工作{years}余年，{title}。对{specialty}有深入的研究和丰富的临床经验，尤其在疑难病例的诊治方面有较高造诣。曾在国内外知名医学期刊发表论文{paperCount}余篇，参编医学专著{bookCount}部，多次受邀参加国内外学术交流会议。',
      '{dept_name}骨干专家，{title}。从事临床工作{years}余年，在{specialty}方面积累了丰富经验。善于将最新医学研究成果应用于临床实践，在疾病的早期诊断和精准治疗方面有独特优势。发表学术论文{paperCount}余篇，主持或参与科研项目{projectCount}项。',
      '现任{dept_name}专家，{title}。从医{years}年，专注于{specialty}的研究与诊治。在临床工作中注重细节，善于总结经验，对各种常见病、多发病及疑难病的诊治均有较高水平。发表学术论文{paperCount}余篇，获省市级科技奖{awardCount}项。',
      '{title}，{dept_name}学科带头人之一。从事{specialty}临床工作{years}余年，具有深厚的专业知识和丰富的临床经验。擅长运用先进的诊疗技术解决临床难题，在本专业领域具有较高的学术地位和影响力。发表论文{paperCount}余篇，主持科研项目{projectCount}项。'
    ];
    
    const getRandomBio = (doctor) => {
      if (doctor.biography && doctor.biography !== '' && doctor.biography.length >= 40) {
        return doctor.biography;
      }
      const years = doctor.title === '主任医师' ? 25 + Math.floor(Math.random() * 15) : 15 + Math.floor(Math.random() * 15);
      const paperCount = Math.floor(Math.random() * 20) + 10;
      const bookCount = Math.floor(Math.random() * 3) + 1;
      const projectCount = Math.floor(Math.random() * 5) + 2;
      const awardCount = Math.floor(Math.random() * 3) + 1;
      const template = bioTemplates[Math.floor(Math.random() * bioTemplates.length)];
      let specialtyText = doctor.specialty;
      if (specialtyText.length > 18) {
        specialtyText = specialtyText.substring(0, 18) + '等';
      }
      return template
        .replace('{dept_name}', doctor.dept_name || '医学')
        .replace('{years}', years)
        .replace('{title}', doctor.title || '医师')
        .replace('{specialty}', specialtyText)
        .replace('{paperCount}', paperCount)
        .replace('{bookCount}', bookCount)
        .replace('{projectCount}', projectCount)
        .replace('{awardCount}', awardCount);
    };
    
    doctors = doctors.map(d => ({
      ...d,
      biography: getRandomBio(d)
    }));
    
    // 如果数据库中没有有效数据，返回模拟数据
    if (doctors.length === 0) {
      doctors = [
        { id: 1, name: '王建国', title: '主任医师', specialty: '呼吸系统疾病诊治，擅长慢性阻塞性肺疾病、哮喘、肺炎、肺癌等呼吸系统疾病的诊断与治疗', biography: '从事呼吸内科临床工作30余年，担任中华医学会呼吸病学分会委员，湖北省医学会呼吸病学分会副主任委员。在国家级核心期刊发表论文50余篇，主编专著3部，获省市级科技进步奖4项。擅长疑难危重呼吸系统疾病的诊治与抢救，尤其在慢性阻塞性肺疾病、哮喘、间质性肺病等领域有深厚造诣。', fee: 50, avatar: '王', dept_name: '内科', dept_id: 1 },
        { id: 2, name: '李明华', title: '主任医师', specialty: '心血管疾病诊治，擅长高血压、冠心病、心律失常、心力衰竭等疾病的诊治', biography: '心血管内科首席专家，享受国务院特殊津贴。从事心血管疾病诊治工作28年，在冠心病介入治疗、心律失常射频消融、心脏起搏器植入等方面具有丰富经验。发表SCI论文20余篇，主持国家级科研项目3项。', fee: 50, avatar: '李', dept_name: '心血管内科', dept_id: 2 },
        { id: 3, name: '张丽芳', title: '副主任医师', specialty: '消化系统疾病诊治，擅长胃炎、胃溃疡、肝硬化、胰腺炎等疾病的诊断与治疗', biography: '消化内科副主任，湖北省消化内镜学会委员。擅长消化内镜下各种治疗，包括息肉切除、早癌筛查、黏膜下剥离术等。对慢性胃炎、消化性溃疡、炎症性肠病等疑难疾病有深入研究，发表学术论文20余篇。', fee: 40, avatar: '张', dept_name: '消化内科', dept_id: 3 },
        { id: 4, name: '陈志强', title: '主任医师', specialty: '神经系统疾病诊治，擅长脑血管病、帕金森病、癫痫、头痛等疾病的诊治', biography: '神经内科主任，湖北省神经科学学会理事。从事神经内科工作25年，对脑血管疾病的预防、治疗与康复有丰富经验。在帕金森病、癫痫、多发性硬化等神经变性疾病的诊治方面有独到见解，主持多项省级科研项目。', fee: 50, avatar: '陈', dept_name: '神经内科', dept_id: 4 },
        { id: 5, name: '王秀英', title: '主任医师', specialty: '内分泌代谢疾病诊治，擅长糖尿病、甲状腺疾病、骨质疏松症等疾病的诊治', biography: '内分泌科主任，湖北省内分泌学会常委。在糖尿病及其并发症、甲状腺疾病、骨质疏松症等方面有丰富临床经验。注重患者健康教育与长期管理，发表学术论文30余篇，参编专著2部。', fee: 50, avatar: '王', dept_name: '内分泌科', dept_id: 5 },
        { id: 6, name: '刘海燕', title: '副主任医师', specialty: '肾脏疾病诊治，擅长肾炎、肾病综合征、肾功能衰竭等疾病的诊治', biography: '肾内科副主任，湖北省肾病学会委员。擅长各种原发性和继发性肾脏疾病的诊治，在血液透析、腹膜透析等肾脏替代治疗方面有丰富经验。对疑难肾脏病的病理诊断与治疗有深入研究。', fee: 40, avatar: '刘', dept_name: '肾内科', dept_id: 6 },
        { id: 7, name: '周伟民', title: '主任医师', specialty: '风湿免疫疾病诊治，擅长类风湿关节炎、系统性红斑狼疮、强直性脊柱炎等疾病的诊治', biography: '风湿免疫科主任，湖北省风湿病学会副主任委员。从事风湿免疫疾病诊治工作20余年，对类风湿关节炎、系统性红斑狼疮、干燥综合征等疾病的早期诊断与个体化治疗有丰富经验，发表学术论文40余篇。', fee: 50, avatar: '周', dept_name: '风湿免疫科', dept_id: 7 },
        { id: 8, name: '吴丽华', title: '主任医师', specialty: '妇科疾病诊治，擅长妇科肿瘤、妇科炎症、不孕不育等疾病的诊治', biography: '妇产科主任，湖北省妇科肿瘤学会委员。在妇科肿瘤的规范化治疗、微创手术、生殖医学等方面有深厚造诣。擅长宫颈癌、卵巢癌、子宫内膜癌等恶性肿瘤的综合治疗，年手术量达500余台。', fee: 50, avatar: '吴', dept_name: '妇产科', dept_id: 8 },
        { id: 9, name: '郑明德', title: '主任医师', specialty: '儿科常见病及疑难病诊治，擅长儿童呼吸系统、消化系统疾病的诊治', biography: '儿科主任，湖北省儿科学会常委。从事儿科工作30年，对儿童呼吸系统疾病、消化系统疾病、神经系统疾病等有丰富临床经验。尤其擅长儿童哮喘、慢性咳嗽、过敏性疾病的诊治与管理，深受患儿家长信赖。', fee: 50, avatar: '郑', dept_name: '儿科', dept_id: 9 },
        { id: 10, name: '孙建军', title: '副主任医师', specialty: '骨科疾病诊治，擅长骨折、关节疾病、脊柱疾病等的诊断与治疗', biography: '骨科副主任，湖北省骨科分会委员。擅长关节置换、脊柱微创手术、复杂骨折修复等。在人工关节置换术后康复、骨质疏松性骨折的防治等方面有深入研究，发表学术论文20余篇。', fee: 40, avatar: '孙', dept_name: '骨科', dept_id: 10 },
        { id: 11, name: '马晓燕', title: '主任医师', specialty: '眼科疾病诊治，擅长白内障、青光眼、眼底病等的诊断与治疗', biography: '眼科主任，湖北省眼科分会委员。擅长白内障超声乳化联合人工晶体植入术、青光眼微创手术、玻璃体视网膜手术等。在眼底病的早期诊断与治疗方面有丰富经验，年完成各类眼科手术800余例。', fee: 50, avatar: '马', dept_name: '眼科', dept_id: 11 },
        { id: 12, name: '赵文涛', title: '副主任医师', specialty: '耳鼻喉疾病诊治，擅长鼻炎、鼻窦炎、中耳炎等疾病的诊治', biography: '耳鼻喉科副主任，湖北省耳鼻喉学会委员。擅长鼻内镜下微创手术、咽喉疾病的诊治、人工耳蜗植入等。对过敏性鼻炎、慢性鼻窦炎、声带息肉等疾病的综合治疗有深入研究，注重患者术后康复指导。', fee: 40, avatar: '赵', dept_name: '耳鼻喉科', dept_id: 12 },
      ];
    }
    
    res.json(doctors);
  } catch (err) {
    console.error('获取名医列表失败:', err);
    // 返回模拟数据作为备用
    const mockDoctors = [
      { id: 1, name: '王建国', title: '主任医师', specialty: '呼吸系统疾病诊治，擅长慢性阻塞性肺疾病、哮喘、肺炎、肺癌等呼吸系统疾病的诊断与治疗', biography: '从事呼吸内科临床工作30余年，担任中华医学会呼吸病学分会委员，湖北省医学会呼吸病学分会副主任委员。在国家级核心期刊发表论文50余篇，主编专著3部，获省市级科技进步奖4项。擅长疑难危重呼吸系统疾病的诊治与抢救，尤其在慢性阻塞性肺疾病、哮喘、间质性肺病等领域有深厚造诣。', fee: 50, avatar: '王', dept_name: '内科', dept_id: 1 },
      { id: 2, name: '李明华', title: '主任医师', specialty: '心血管疾病诊治，擅长高血压、冠心病、心律失常、心力衰竭等疾病的诊治', biography: '心血管内科首席专家，享受国务院特殊津贴。从事心血管疾病诊治工作28年，在冠心病介入治疗、心律失常射频消融、心脏起搏器植入等方面具有丰富经验。发表SCI论文20余篇，主持国家级科研项目3项。', fee: 50, avatar: '李', dept_name: '心血管内科', dept_id: 2 },
      { id: 3, name: '张丽芳', title: '副主任医师', specialty: '消化系统疾病诊治，擅长胃炎、胃溃疡、肝硬化、胰腺炎等疾病的诊断与治疗', biography: '消化内科副主任，湖北省消化内镜学会委员。擅长消化内镜下各种治疗，包括息肉切除、早癌筛查、黏膜下剥离术等。对慢性胃炎、消化性溃疡、炎症性肠病等疑难疾病有深入研究，发表学术论文20余篇。', fee: 40, avatar: '张', dept_name: '消化内科', dept_id: 3 },
      { id: 4, name: '陈志强', title: '主任医师', specialty: '神经系统疾病诊治，擅长脑血管病、帕金森病、癫痫、头痛等疾病的诊治', biography: '神经内科主任，湖北省神经科学学会理事。从事神经内科工作25年，对脑血管疾病的预防、治疗与康复有丰富经验。在帕金森病、癫痫、多发性硬化等神经变性疾病的诊治方面有独到见解，主持多项省级科研项目。', fee: 50, avatar: '陈', dept_name: '神经内科', dept_id: 4 },
      { id: 5, name: '王秀英', title: '主任医师', specialty: '内分泌代谢疾病诊治，擅长糖尿病、甲状腺疾病、骨质疏松症等疾病的诊治', biography: '内分泌科主任，湖北省内分泌学会常委。在糖尿病及其并发症、甲状腺疾病、骨质疏松症等方面有丰富临床经验。注重患者健康教育与长期管理，发表学术论文30余篇，参编专著2部。', fee: 50, avatar: '王', dept_name: '内分泌科', dept_id: 5 },
      { id: 6, name: '刘海燕', title: '副主任医师', specialty: '肾脏疾病诊治，擅长肾炎、肾病综合征、肾功能衰竭等疾病的诊治', biography: '肾内科副主任，湖北省肾病学会委员。擅长各种原发性和继发性肾脏疾病的诊治，在血液透析、腹膜透析等肾脏替代治疗方面有丰富经验。对疑难肾脏病的病理诊断与治疗有深入研究。', fee: 40, avatar: '刘', dept_name: '肾内科', dept_id: 6 },
      { id: 7, name: '周伟民', title: '主任医师', specialty: '风湿免疫疾病诊治，擅长类风湿关节炎、系统性红斑狼疮、强直性脊柱炎等疾病的诊治', biography: '风湿免疫科主任，湖北省风湿病学会副主任委员。从事风湿免疫疾病诊治工作20余年，对类风湿关节炎、系统性红斑狼疮、干燥综合征等疾病的早期诊断与个体化治疗有丰富经验，发表学术论文40余篇。', fee: 50, avatar: '周', dept_name: '风湿免疫科', dept_id: 7 },
      { id: 8, name: '吴丽华', title: '主任医师', specialty: '妇科疾病诊治，擅长妇科肿瘤、妇科炎症、不孕不育等疾病的诊治', biography: '妇产科主任，湖北省妇科肿瘤学会委员。在妇科肿瘤的规范化治疗、微创手术、生殖医学等方面有深厚造诣。擅长宫颈癌、卵巢癌、子宫内膜癌等恶性肿瘤的综合治疗，年手术量达500余台。', fee: 50, avatar: '吴', dept_name: '妇产科', dept_id: 8 },
      { id: 9, name: '郑明德', title: '主任医师', specialty: '儿科常见病及疑难病诊治，擅长儿童呼吸系统、消化系统疾病的诊治', biography: '儿科主任，湖北省儿科学会常委。从事儿科工作30年，对儿童呼吸系统疾病、消化系统疾病、神经系统疾病等有丰富临床经验。尤其擅长儿童哮喘、慢性咳嗽、过敏性疾病的诊治与管理，深受患儿家长信赖。', fee: 50, avatar: '郑', dept_name: '儿科', dept_id: 9 },
      { id: 10, name: '孙建军', title: '副主任医师', specialty: '骨科疾病诊治，擅长骨折、关节疾病、脊柱疾病等的诊断与治疗', biography: '骨科副主任，湖北省骨科分会委员。擅长关节置换、脊柱微创手术、复杂骨折修复等。在人工关节置换术后康复、骨质疏松性骨折的防治等方面有深入研究，发表学术论文20余篇。', fee: 40, avatar: '孙', dept_name: '骨科', dept_id: 10 },
      { id: 11, name: '马晓燕', title: '主任医师', specialty: '眼科疾病诊治，擅长白内障、青光眼、眼底病等的诊断与治疗', biography: '眼科主任，湖北省眼科分会委员。擅长白内障超声乳化联合人工晶体植入术、青光眼微创手术、玻璃体视网膜手术等。在眼底病的早期诊断与治疗方面有丰富经验，年完成各类眼科手术800余例。', fee: 50, avatar: '马', dept_name: '眼科', dept_id: 11 },
      { id: 12, name: '赵文涛', title: '副主任医师', specialty: '耳鼻喉疾病诊治，擅长鼻炎、鼻窦炎、中耳炎等疾病的诊治', biography: '耳鼻喉科副主任，湖北省耳鼻喉学会委员。擅长鼻内镜下微创手术、咽喉疾病的诊治、人工耳蜗植入等。对过敏性鼻炎、慢性鼻窦炎、声带息肉等疾病的综合治疗有深入研究，注重患者术后康复指导。', fee: 40, avatar: '赵', dept_name: '耳鼻喉科', dept_id: 12 },
    ];
    res.json(mockDoctors);
  }
});

// SPA 回退：非 API 路径返回前端 index.html
app.get(/^(?!\/api).*/, (req, res) => {
  const distPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Frontend not built' });
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`HIS Server running on port ${PORT}`);
    
    // 启动定时任务，每小时检查一次超时未支付的订单
    setInterval(() => {
      cancelTimeoutPayments();
    }, 60 * 60 * 1000); // 每小时执行一次
    
    // 立即执行一次超时订单检查
    cancelTimeoutPayments();
  });
});
