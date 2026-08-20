# 更新日志 CHANGELOG

## [2026-06-21] 版本更新

### 新增功能

#### 1. 个人中心和密码修改功能
- **受影响角色**: 患者、门诊医生、药房人员

- **数据库变更**:
  - `users` 表新增 `nickname` 字段（昵称）
  - `users` 表新增 `avatar` 字段（头像）
  - `users` 表新增 `id_card` 字段（身份证）

- **后端API新增**:
  - `GET /api/user/profile?userId=xxx` - 获取用户资料
  - `PUT /api/user/profile` - 更新用户资料（头像、昵称、手机号）
  - `PUT /api/user/password` - 修改密码（原密码验证）

- **前端组件变更**:

  | 文件 | 变更说明 |
  |------|---------|
  | `Profile.vue` | 患者端个人中心：支持头像选择、昵称修改、手机号修改、密码修改 |
  | `OutpatientWorkbench.vue` | 门诊医生工作台：顶部导航栏新增"个人中心"入口 |
  | `PharmacyWorkbench.vue` | 药房工作台：顶部工具栏新增"个人中心"按钮 |

- **功能说明**:
  - 点击头像可打开编辑弹窗选择头像（emoji表情）
  - 可修改昵称和手机号
  - 可通过"修改密码"按钮修改登录密码（需验证原密码）

#### 2. 登录流程优化
- **优化内容**:
  - 患者在挂号页面（或其他预约相关页面）点击登录后，登录成功会继续留在当前页面
  - 门诊医生、药房人员、管理员登录后直接跳转到对应工作台

- **变更文件**: `Login.vue`

#### 3. 退出登录二次确认
- **功能说明**: 所有角色（患者、门诊医生、住院医生、药房人员）退出登录时添加二次确认弹窗，防止误操作
- **弹窗样式**: 与管理员界面一致，包含红色图标、提示文字和确认/取消按钮
- **变更文件**: `Profile.vue`, `OutpatientWorkbench.vue`, `InpatientWorkbench.vue`, `PharmacyWorkbench.vue`

### Bug修复

#### 1. 患者个人中心保存失败
- **问题**: 患者修改头像和昵称时显示保存失败
- **原因**: 登录接口未返回 `nickname` 和 `avatar` 字段，导致前端无法正确获取和更新用户信息
- **修复**: 更新后端登录接口 `/api/auth/login`，增加返回 `nickname`、`avatar`、`id_card` 字段
- **变更文件**: `backend/server.js`

#### 2. 医生工作台个人中心缺失
- **问题**: 医生工作台顶部导航栏缺少个人中心入口
- **原因**: 之前的修改只应用到了 `DoctorDashboard.vue`，但实际使用的是 `OutpatientWorkbench.vue`
- **修复**: 在门诊医生工作台（`OutpatientWorkbench.vue`）顶部工具栏添加"个人中心"按钮，实现头像、昵称、密码修改功能
- **变更文件**: `OutpatientWorkbench.vue`

#### 3. 药房工作台空白
- **问题**: 登录药房后界面空白
- **原因**: 
  - 前端代理配置指向错误端口（3000），后端实际运行在4000端口
  - TypeScript编译错误：缺少 `reactive` 导入、`currentUser` 访问方式错误
- **修复**:
  - 更新 `vite.config.ts` 代理目标为 `http://localhost:4000`
  - 修复 PharmacyWorkbench.vue 中的 TypeScript 错误
- **变更文件**: `frontend/vite.config.ts`, `PharmacyWorkbench.vue`

#### 4. 登录跳转逻辑错误
- **问题**: 医生、药房、管理员登录后会跳转到患者页面（如挂号页面）
- **原因**: 登录逻辑中 `redirect` 参数优先级过高，忽略了角色判断
- **修复**: 修改登录跳转逻辑，患者使用 redirect 参数，其他角色直接跳转到工作台
- **变更文件**: `Login.vue`

### 技术细节

#### 后端 (server.js)
```javascript
// 新增API端点
app.get('/api/user/profile')      // 获取用户资料
app.put('/api/user/profile')      // 更新用户资料
app.put('/api/user/password')     // 修改密码
```

#### 前端状态管理 (stores/user.ts)
```typescript
interface User {
  id: number
  username: string
  real_name: string
  nickname?: string      // 新增
  role: Role
  phone: string
  id_card?: string      // 新增
  avatar?: string       // 新增
  doctor_id?: number
  patient_id?: number
}
```

### 服务地址
- **后端**: http://localhost:3000
- **前端**: http://localhost:5175
- **数据库**: hisdb (PostgreSQL)

---

## [2026-06-20] 之前的更新

### 数据管理优化
- 移除所有前端Mock数据，所有页面数据从hisdb数据库实时获取
- 科室字典新增简介(description)字段
- 医生字典修复数据加载问题
- 收费记录管理显示真实收费数据
- 医生排班与数据库实时同步

### 数据库表结构
- `departments` - 科室表（8条记录）
- `doctors` - 医生表（12条记录）
- `charges` - 收费记录表（8条记录）
- `schedules` - 排班表（80条记录）
- `users` - 用户表（18条记录）
