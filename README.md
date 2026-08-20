# HIS02 - 医院信息管理系统 (Hospital Information System)

一个基于 Vue 3 + Node.js/Express + PostgreSQL 的医院信息管理系统，支持多角色（管理员、医生、护士、检验师、影像师、药房）协同工作，并包含 Playwright 自动化并发测试。

## 项目结构

```
HIS02/
├── frontend/          # Vue 3 前端 (Vite + TypeScript + Element Plus)
│   ├── src/
│   │   ├── views/     # 页面视图（按角色分类）
│   │   ├── router/    # 路由配置
│   │   ├── stores/    # 状态管理
│   │   ├── services/  # API 服务
│   │   └── components/# 公共组件
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Node.js 后端 (Express + PostgreSQL)
│   ├── server.js      # 服务入口
│   ├── init.sql       # 数据库初始化脚本
│   ├── migrate.sql    # 数据库迁移脚本
│   └── package.json
├── tests/             # Playwright 自动化测试
│   ├── concurrent-appointment.spec.ts
│   ├── multi-role-flow.spec.ts
│   └── config.ts
├── package.json       # 根项目配置（测试相关）
├── playwright.config.ts
└── tsconfig.json
```

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Element Plus** - UI 组件库
- **ECharts** - 数据可视化
- **Vue Router** - 路由管理
- **Axios** - HTTP 客户端
- **Sass** - CSS 预处理器

### 后端
- **Node.js** - 运行时
- **Express** - Web 框架
- **PostgreSQL (pg)** - 数据库驱动
- **dotenv** - 环境变量管理
- **CORS** - 跨域支持

### 测试
- **Playwright** - 端到端自动化测试
- **多角色并发测试** - 模拟真实医院场景

## 功能模块

| 角色 | 功能 |
|------|------|
| 管理员 | 系统管理、科室管理、医生管理、排班管理 |
| 医生 | 患者挂号、诊疗、开具处方、查看检验报告 |
| 护士 | 患者管理、就诊队列、护理记录 |
| 检验师 | 检验申请处理、检验报告发布 |
| 影像师 | 影像检查申请处理、影像报告发布 |
| 药房 | 处方审核、药品发放、库存管理 |

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 12
- npm 或 yarn

### 1. 克隆仓库

```bash
git clone https://github.com/Z1circle/HIS02.git
cd HIS02
```

### 2. 配置后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息
npm install
```

### 3. 初始化数据库

```bash
# 创建数据库
createdb hisdb

# 后端启动时会自动执行 init.sql 和 migrate_full.sql
# 或手动执行：
psql -d hisdb -f init.sql
psql -d hisdb -f migrate_full.sql
```

### 4. 启动后端服务

```bash
cd backend
npm run dev    # 开发模式（nodemon 热重载）
# 或
npm start      # 生产模式
```

后端默认运行在 `http://localhost:4000`

### 5. 配置并启动前端

```bash
cd frontend
cp .env.example .env
# 编辑 .env 文件，配置 API 地址
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`

### 6. 运行测试

```bash
# 在项目根目录
npm install
npm test         # 运行 Playwright 测试
npm run test:ui  # 以 UI 模式运行测试
```

## 环境变量

### 后端 (`backend/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 4000 |
| DB_USER | 数据库用户 | postgres |
| DB_HOST | 数据库地址 | localhost |
| DB_NAME | 数据库名 | hisdb |
| DB_PASSWORD | 数据库密码 | - |
| DB_PORT | 数据库端口 | 5432 |
| DB_MAX_CONNECTIONS | 最大连接数 | 20 |

### 前端 (`frontend/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| VITE_API_URL | 后端 API 地址 | http://localhost:4000/api |

## 分支管理

- `main` - 生产稳定分支
- `develop` - 开发集成分支

## CI/CD

项目使用 GitHub Actions 进行持续集成和持续部署：

- **CI**：代码推送时自动安装依赖、构建前端、运行测试
- **CD**：前端构建产物自动部署到 GitHub Pages

## 构建部署

### 前端构建

```bash
cd frontend
npm run build    # 输出到 dist/ 目录
```

### 生产模式部署

后端 `server.js` 已配置静态文件服务，构建前端后将 `dist/` 目录放在 `frontend/` 下，后端会自动提供静态文件服务。

```bash
# 构建前端
cd frontend && npm run build

# 启动后端（自动提供前端静态文件）
cd ../backend && npm start
```

## 许可证

ISC License

## 贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request
