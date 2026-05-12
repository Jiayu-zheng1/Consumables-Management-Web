import secrets
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
import logging

from database import engine, get_db, Base
import models
import schemas

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="耗材管理系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ──────────────────────────────────────────────────

TOKENS: dict[str, dict] = {}

security = HTTPBearer(auto_error=False)


LEVEL_HIERARCHY = {"staff": 0, "section": 1, "department": 2, "admin": 3}


def _migrate_db(db: Session):
    try:
        db.execute("ALTER TABLE users ADD COLUMN level VARCHAR(20) NOT NULL DEFAULT 'staff'")
        db.commit()
    except: db.rollback()
    try:
        db.execute("ALTER TABLE users ADD COLUMN department_code VARCHAR(100) NOT NULL DEFAULT ''")
        db.commit()
    except: db.rollback()


def _seed_admin(db: Session):
    _migrate_db(db)
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin = models.User(
            username="admin", password_hash=models.User.hash_password("admin123"),
            role="admin", level="admin", department_code="",
        )
        db.add(admin)
        db.commit()
    elif admin.level == "staff":
        admin.level = "admin"
        db.commit()


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security), db: Session = Depends(get_db)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    info = TOKENS.get(credentials.credentials)
    if info is None:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")
    return info


def require_admin(user: dict = Depends(get_current_user)):
    if user.get("level") != "admin":
        raise HTTPException(status_code=403, detail="仅超级管理员可执行此操作")
    return user


def require_department(user: dict = Depends(get_current_user)):
    if LEVEL_HIERARCHY.get(user.get("level", "staff"), 0) < LEVEL_HIERARCHY["department"]:
        raise HTTPException(status_code=403, detail="仅部级及以上可执行此操作")
    return user


def require_section(user: dict = Depends(get_current_user)):
    if LEVEL_HIERARCHY.get(user.get("level", "staff"), 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="仅课级及以上可执行此操作")
    return user


@app.post("/api/login")
def login(data: dict, db: Session = Depends(get_db)):
    _seed_admin(db)
    username = data.get("username", "")
    password = data.get("password", "")
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not models.User.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = secrets.token_urlsafe(32)
    TOKENS[token] = {"username": user.username, "level": user.level, "department_code": user.department_code, "role": user.role}
    return {"token": token, "username": user.username, "level": user.level, "department_code": user.department_code, "role": user.role}


@app.post("/api/register")
def register(data: dict, db: Session = Depends(get_db)):
    _seed_admin(db)
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    department_code = data.get("department_code", "").strip().upper()
    reg_level = data.get("level", "staff").strip()
    if reg_level not in ("staff", "section"):
        reg_level = "staff"
    if username.lower() == "admin":
        raise HTTPException(status_code=400, detail="该用户名已被系统保留")
    if len(username) < 3 or len(password) < 6:
        raise HTTPException(status_code=400, detail="用户名至少3位，密码至少6位")
    if reg_level in ("staff", "section") and not department_code:
        raise HTTPException(status_code=400, detail="课级及以下需填写部门代码")
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = models.User(
        username=username,
        password_hash=models.User.hash_password(password),
        role="user", level=reg_level, department_code=department_code,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "level": user.level, "department_code": user.department_code}


@app.post("/api/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if credentials:
        TOKENS.pop(credentials.credentials, None)
    return {"message": "已登出"}


# ── User Management (Admin) ─────────────────────────────

@app.get("/api/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(models.User).order_by(models.User.id.desc()).all()


@app.put("/api/users/{user_id}/level")
def update_user_level(user_id: int, data: schemas.UserLevelUpdate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if data.level not in ("staff", "section", "department"):
        raise HTTPException(status_code=400, detail="无效的级别，可选: staff/section/department")
    user.level = data.level
    if data.department_code:
        user.department_code = data.department_code.upper()
    db.commit()
    return {"message": "已更新", "level": user.level}


# ── Requisition (请购) ──────────────────────────────────

STATUS_LABELS = {
    "pending_section": "待课级审批",
    "pending_department": "待部级审批",
    "approved": "已通过",
    "rejected": "已拒绝",
}


@app.post("/api/requisitions", status_code=201)
def create_requisition(data: schemas.RequisitionCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    requester = db.query(models.User).filter(models.User.username == user["username"]).first()
    if data.item_id:
        item = db.query(models.Item).filter(models.Item.id == data.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="耗材不存在")
    elif not data.new_item_name:
        raise HTTPException(status_code=400, detail="请选择已有耗材或填写新耗材名称")

    req = models.Requisition(
        requester_id=requester.id,
        item_id=data.item_id or None,
        new_item_name=data.new_item_name or "",
        new_item_category_id=data.new_item_category_id,
        new_item_project=data.new_item_project,
        new_item_price=data.new_item_price,
        new_item_unit=data.new_item_unit,
        quantity=data.quantity,
        reason=data.reason,
        status="pending_section",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "status": req.status, "status_label": STATUS_LABELS[req.status], "message": "请购已提交，等待课级审批"}


@app.get("/api/requisitions/my")
def my_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    requester = db.query(models.User).filter(models.User.username == user["username"]).first()
    reqs = db.query(models.Requisition).filter(
        models.Requisition.requester_id == requester.id
    ).order_by(models.Requisition.id.desc()).all()
    result = []
    for r in reqs:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d["requester_name"] = requester.username
        if r.item_id:
            item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
            d["item_name"] = item.name if item else ""
        else:
            d["item_name"] = r.new_item_name or ""
        result.append(d)
    return result


@app.get("/api/requisitions/pending-count")
def pending_count(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    dept = user.get("department_code", "")
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        return {"count": 0}
    q = db.query(models.Requisition)
    if level != "admin":
        sub = db.query(models.User.id).filter(models.User.department_code == dept).subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))
    if level == "section":
        q = q.filter(models.Requisition.status == "pending_section")
    elif level == "department":
        q = q.filter(models.Requisition.status.in_(["pending_section", "pending_department"]))
    return {"count": q.count()}


@app.get("/api/requisitions/to-approve")
def requisitions_to_approve(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    dept = user.get("department_code", "")
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无审批权限")

    q = db.query(models.Requisition)
    if level != "admin":
        sub = db.query(models.User.id).filter(models.User.department_code == dept).subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))

    if level == "section":
        q = q.filter(models.Requisition.status == "pending_section")
    elif level == "department":
        q = q.filter(models.Requisition.status.in_(["pending_section", "pending_department"]))
    # admin sees all non-terminal status

    return q.order_by(models.Requisition.id.desc()).all()


@app.get("/api/requisitions/all")
def all_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """所有人可查看所有请购单状态"""
    reqs = db.query(models.Requisition).order_by(models.Requisition.id.desc()).limit(500).all()
    result = []
    for r in reqs:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        requester = db.query(models.User).filter(models.User.id == r.requester_id).first()
        d["requester_name"] = requester.username if requester else ""
        if r.item_id:
            item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
            d["item_name"] = item.name if item else ""
        else:
            d["item_name"] = r.new_item_name or ""
        result.append(d)
    return result


@app.get("/api/requisitions/approved")
def approved_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """返回已通过但可快捷入库的请购(未入库的)"""
    reqs = db.query(models.Requisition).filter(
        models.Requisition.status == "approved"
    ).order_by(models.Requisition.id.desc()).limit(200).all()
    result = []
    for r in reqs:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        requester = db.query(models.User).filter(models.User.id == r.requester_id).first()
        d["requester_name"] = requester.username if requester else ""
        if r.item_id:
            item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
            d["item_name"] = item.name if item else ""
        else:
            d["item_name"] = r.new_item_name or ""
        result.append(d)
    return result


@app.post("/api/requisitions/{req_id}/quick-inbound")
def quick_inbound(req_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """快捷入库：批准的请购单直接入库"""
    req = db.query(models.Requisition).filter(models.Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="请购单不存在")
    if req.status != "approved":
        raise HTTPException(status_code=400, detail="仅已通过的请购单可快捷入库")

    # 找或创建耗材
    if req.item_id:
        item = db.query(models.Item).filter(models.Item.id == req.item_id).first()
    else:
        existing = db.query(models.Item).filter(
            models.Item.name == req.new_item_name.strip(),
            models.Item.project == (req.new_item_project or ""),
        ).first()
        if existing:
            item = existing
        else:
            item = models.Item(
                name=req.new_item_name.strip(),
                category_id=req.new_item_category_id or 1,
                project=req.new_item_project or "",
                price=req.new_item_price or 0,
                unit=req.new_item_unit or "个",
                current_stock=0, min_stock=0,
            )
            db.add(item)
            db.flush()

    record = models.InboundRecord(
        item_id=item.id, quantity=req.quantity,
        price=req.new_item_price,
        supplier="", operator=user.get("username", ""),
        note=f"快捷入库 (请购单#{req.id})",
    )
    item.current_stock += req.quantity
    req.status = "fulfilled"
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "入库成功", "item_name": item.name, "quantity": req.quantity}


@app.get("/api/requisitions/history")
def requisitions_history(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """课级及以上可查看本部门已处理的请购历史(课级已审批+部级已审批+已拒绝)"""
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无权限查看历史记录")
    dept = user.get("department_code", "")
    q = db.query(models.Requisition).filter(
        models.Requisition.status.in_(["pending_department", "approved", "rejected"])
    )
    if level != "admin":
        sub = db.query(models.User.id).filter(models.User.department_code == dept).subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))
    return q.order_by(models.Requisition.id.desc()).limit(200).all()


@app.post("/api/requisitions/{req_id}/approve")
def approve_requisition(req_id: int, data: schemas.RequisitionApprove, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    req = db.query(models.Requisition).filter(models.Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="请购单不存在")

    approver = db.query(models.User).filter(models.User.username == user["username"]).first()
    level = user.get("level", "staff")

    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action 必须是 approve 或 reject")

    if level == "section":
        if req.status != "pending_section":
            raise HTTPException(status_code=400, detail="该请购单已不在课级审批阶段")
        req.section_approver_id = approver.id
        req.section_comment = data.comment
        if data.action == "reject":
            req.status = "rejected"
        else:
            # 课级通过→必须走部级
            req.status = "pending_department"
    elif level == "department":
        if req.status not in ("pending_section", "pending_department"):
            raise HTTPException(status_code=400, detail="该请购单不在可审批状态")
        req.department_approver_id = approver.id
        req.department_comment = data.comment
        if data.action == "reject":
            req.status = "rejected"
        else:
            req.status = "approved"
    elif level == "admin":
        req.status = "approved" if data.action == "approve" else "rejected"
    else:
        raise HTTPException(status_code=403, detail="无审批权限")

    db.commit()
    return {"status": req.status, "status_label": STATUS_LABELS[req.status], "message": "审批完成"}


@app.get("/api/audit")
def audit_log(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if LEVEL_HIERARCHY.get(user.get("level", "staff"), 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无权限查看操作明细")
    records = db.query(models.InboundRecord).order_by(models.InboundRecord.id.desc()).limit(100).all()
    return [{"type": "inbound", "id": r.id, "item_id": r.item_id, "quantity": r.quantity, "operator": r.operator, "time": r.created_at.isoformat()} for r in records]


# ── Dashboard ──────────────────────────────────────────────

@app.get("/api/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    today_start = datetime.combine(date.today(), datetime.min.time())
    total_items = db.query(models.Item).count()
    total_categories = db.query(models.Category).count()
    low_stock_count = (
        db.query(models.Item)
        .filter(models.Item.current_stock <= models.Item.min_stock)
        .count()
    )
    today_inbound = (
        db.query(models.InboundRecord)
        .filter(models.InboundRecord.created_at >= today_start)
        .count()
    )
    today_outbound = (
        db.query(models.OutboundRecord)
        .filter(models.OutboundRecord.created_at >= today_start)
        .count()
    )
    return schemas.DashboardStats(
        total_items=total_items,
        total_categories=total_categories,
        low_stock_count=low_stock_count,
        today_inbound=today_inbound,
        today_outbound=today_outbound,
    )


@app.get("/api/alerts", response_model=list[schemas.StockAlert])
def get_stock_alerts(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    items = (
        db.query(models.Item)
        .filter(models.Item.current_stock <= models.Item.min_stock)
        .all()
    )
    return [
        schemas.StockAlert(
            item_id=item.id,
            item_name=item.name,
            current_stock=item.current_stock,
            min_stock=item.min_stock,
            unit=item.unit,
        )
        for item in items
    ]


# ── Categories ─────────────────────────────────────────────

@app.get("/api/categories", response_model=list[schemas.CategoryOut])
def list_categories(
    search: str = Query("", max_length=100),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    q = db.query(models.Category)
    if search:
        q = q.filter(models.Category.name.contains(search))
    return q.order_by(models.Category.id.desc()).all()


@app.post("/api/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(data: schemas.CategoryCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    existing = db.query(models.Category).filter(models.Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="类别名称已存在")
    cat = models.Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.put("/api/categories/{cat_id}", response_model=schemas.CategoryOut)
def update_category(cat_id: int, data: schemas.CategoryUpdate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="类别不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(cat, key, val)
    db.commit()
    db.refresh(cat)
    return cat


@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="类别不存在")
    db.delete(cat)
    db.commit()


# ── Items ──────────────────────────────────────────────────

@app.get("/api/items", response_model=list[schemas.ItemWithCategory])
def list_items(
    search: str = Query("", max_length=200),
    category_id: int = Query(None),
    project: str = Query(""),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    q = db.query(models.Item)
    if search:
        q = q.filter(models.Item.name.contains(search))
    if category_id:
        q = q.filter(models.Item.category_id == category_id)
    if project:
        q = q.filter(models.Item.project == project)
    if low_stock:
        q = q.filter(models.Item.current_stock <= models.Item.min_stock)
    return q.order_by(models.Item.id.desc()).all()


@app.get("/api/items/{item_id}", response_model=schemas.ItemWithCategory)
def get_item(item_id: int, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")
    return item


@app.post("/api/items", response_model=schemas.ItemOut, status_code=201)
def create_item(data: schemas.ItemCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    cat = db.query(models.Category).filter(models.Category.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="类别不存在")
    item = models.Item(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/items/{item_id}", response_model=schemas.ItemOut)
def update_item(item_id: int, data: schemas.ItemUpdate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")
    db.delete(item)
    db.commit()


@app.get("/api/projects")
def list_projects(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    rows = db.query(models.Item.project).distinct().order_by(models.Item.project).all()
    return [r[0] for r in rows if r[0]]


# ── Inbound ────────────────────────────────────────────────

@app.get("/api/inbound", response_model=list[schemas.InboundOut])
def list_inbound(
    item_id: int = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    q = db.query(models.InboundRecord)
    if item_id:
        q = q.filter(models.InboundRecord.item_id == item_id)
    records = q.order_by(models.InboundRecord.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for r in records:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
        d["item_name"] = item.name if item else ""
        result.append(d)
    return result


@app.post("/api/inbound", response_model=schemas.InboundOut, status_code=201)
def create_inbound(data: schemas.InboundCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    # 模式1: 选择已有耗材
    if data.item_id:
        item = db.query(models.Item).filter(models.Item.id == data.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="耗材不存在")
    # 模式2: 手动添加新耗材
    elif data.new_item_name and data.new_item_category_id:
        existing = db.query(models.Item).filter(
            models.Item.name == data.new_item_name.strip(),
            models.Item.project == (data.new_item_project or ""),
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"耗材「{data.new_item_name}」在专案「{data.new_item_project or '未指定'}」中已存在，请从列表中选择")
        cat = db.query(models.Category).filter(models.Category.id == data.new_item_category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="所选类别不存在")
        item = models.Item(
            name=data.new_item_name.strip(),
            category_id=data.new_item_category_id,
            project=data.new_item_project or "",
            price=data.new_item_price,
            unit=data.new_item_unit or "个",
            current_stock=0,
            min_stock=0,
        )
        db.add(item)
        db.flush()
    else:
        raise HTTPException(status_code=400, detail="请选择已有耗材或填写新耗材信息")

    record = models.InboundRecord(
        item_id=item.id,
        quantity=data.quantity,
        price=data.supplier_price,
        supplier=data.supplier,
        operator=user.get("username", ""),  # 操作人是当前登录用户
        note=data.note,
    )
    item.current_stock += data.quantity
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Outbound ───────────────────────────────────────────────

@app.get("/api/outbound", response_model=list[schemas.OutboundOut])
def list_outbound(
    item_id: int = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    q = db.query(models.OutboundRecord)
    if item_id:
        q = q.filter(models.OutboundRecord.item_id == item_id)
    records = q.order_by(models.OutboundRecord.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for r in records:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
        d["item_name"] = item.name if item else ""
        result.append(d)
    return result


@app.post("/api/outbound", response_model=schemas.OutboundOut, status_code=201)
def create_outbound(data: schemas.OutboundCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == data.item_id).first()
    if not item:
        raise HTTPException(status_code=400, detail="耗材不存在")
    if item.current_stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"库存不足，当前库存: {item.current_stock} {item.unit}")
    record = models.OutboundRecord(
        item_id=data.item_id,
        quantity=data.quantity,
        department=data.department,
        operator=user.get("username", ""),
        purpose=data.purpose,
        note=data.note,
    )
    item.current_stock -= data.quantity
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

