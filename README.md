# 耗材管理系统 (Consumables Management System)

企业级耗材入库、出库、库存、请购、审批一体化管理平台。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python 3.13 + FastAPI + SQLAlchemy + SQLite |
| 前端 | Next.js 16 (Turbopack) + TypeScript + HeroUI 风格 |
| 认证 | Token-based |

## 快速启动

```bash
# 1. 后端 (端口 8000)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 2. 前端 (端口 3000)
cd frontend
npm install
npx next build && npx next start --port 3000
```

访问 `http://localhost:3000`，默认管理员账号: `admin / admin123`

## 权限四级体系

| 级别 | 说明 | 权限 |
|------|------|------|
| **admin** | 超级管理员（系统保留） | 人员管理、设置级别、查看全部、删除 |
| **部级 (department)** | 部门主管 | 审批请购(部级)、查看本部门历史、删除 |
| **课级 (section)** | 课级主管 | 审批请购(课级)、查看本部门历史 |
| **普通 (staff)** | 普通员工 | 创建请购、查看记录、入库/出库 |

## 审批链路

```
员工请购 → 待课级审批 → 待部级审批 → 已通过 → 快捷入库
                ↘ 已拒绝         ↘ 已拒绝
```

## 功能模块

| 页面 | 路由 | 功能 |
|------|------|------|
| 登陆/注册 | `/login` | 登陆、注册(含部门代码)，admin 被屏蔽 |
| 仪表盘 | `/` | 统计卡片、库存预警、最近出入库 |
| 耗材管理 | `/items` | CRUD、专案/类别筛选、行内类别创建、单价 |
| 入库管理 | `/inbound` | 选择已有/手动添加/快捷入库、重复检测 |
| 出库管理 | `/outbound` | 选择耗材、库存不足拦截 |
| 请购记录 | `/records` | 所有人可见所有请购单及状态 |
| 请购管理 | `/requisitions` | 待审批(角标)、我的请购、历史记录 |
| 人员管理 | `/users` | admin 专属，设置用户级别(普通/课级/部级) |

## 数据模型

```
User (id, username, password_hash, level, department_code, role)
Category (id, name, description)
Item (id, name, category_id, project, price, unit, min_stock, current_stock)
InboundRecord (id, item_id, quantity, price, supplier, operator, note)
OutboundRecord (id, item_id, quantity, department, operator, purpose, note)
Requisition (id, requester_id, item_id, new_item_*, quantity, reason, status, approver_id)
```

## 项目结构

```
Web/
├── backend/
│   ├── main.py          # FastAPI 应用入口
│   ├── models.py        # SQLAlchemy 数据模型
│   ├── schemas.py       # Pydantic 请求/响应模型
│   ├── database.py      # 数据库连接配置
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.tsx    # 根布局
    │   ├── page.tsx      # 仪表盘
    │   ├── globals.css   # HeroUI 设计系统
    │   ├── login/        # 登陆注册
    │   ├── items/        # 耗材管理
    │   ├── inbound/      # 入库管理
    │   ├── outbound/     # 出库管理
    │   ├── records/      # 请购记录
    │   ├── requisitions/ # 请购管理
    │   ├── categories/   # 类别管理
    │   └── users/        # 人员管理
    └── lib/
        ├── api.ts        # API 客户端
        ├── auth.tsx       # 认证上下文
        ├── app-shell.tsx  # 导航布局
        ├── icons.tsx      # SVG 图标
        └── logout-button.tsx
```

## License

MIT
