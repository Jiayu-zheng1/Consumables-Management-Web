"""认证路由 — 登录、注册、登出"""
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models
from utils.auth import TOKENS, LOGIN_RATE_LIMIT, security

router = APIRouter(prefix="/api", tags=["auth"])


def _seed_admin(db: Session):
    from utils.migration import run_migrations
    run_migrations(db)
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin = models.User(
            username="admin", employee_id="admin", display_name="系统管理员",
            password_hash=models.User.hash_password("admin123"),
            role="admin", level="admin", department_code="",
        )
        db.add(admin)
        db.commit()
    elif admin.level == "staff":
        admin.level = "admin"
        db.commit()


@router.post("/login")
def login(data: dict, db: Session = Depends(get_db), request: Request = None):
    ip = request.client.host if request and request.client else "127.0.0.1"
    now = time.time()
    count, window = LOGIN_RATE_LIMIT.get(ip, (0, now))
    if now - window > 60:
        count, window = 0, now
    if count >= 5:
        raise HTTPException(status_code=429, detail="登录尝试过于频繁，请1分钟后再试")
    LOGIN_RATE_LIMIT[ip] = (count + 1, window)

    _seed_admin(db)
    login_id = (data.get("username", "") or data.get("employee_id", "")).strip()
    password = data.get("password", "")
    user = db.query(models.User).filter(
        (models.User.employee_id == login_id) | (models.User.username == login_id)
    ).first()
    if not user or not models.User.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="工号或密码错误")
    token = secrets.token_urlsafe(32)
    TOKENS[token] = {
        "username": user.username, "employee_id": user.employee_id or "",
        "display_name": user.display_name or "", "level": user.level,
        "department_code": user.department_code,
        "department_scope": user.department_scope or "", "role": user.role,
    }
    return {
        "token": token, "username": user.username,
        "employee_id": user.employee_id or "", "display_name": user.display_name or "",
        "level": user.level, "department_code": user.department_code,
        "department_scope": user.department_scope or "", "role": user.role,
        "must_change_password": bool(user.must_change_password),
    }


@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):
    _seed_admin(db)
    employee_id = data.get("employee_id", "").strip()
    display_name = data.get("display_name", "").strip()
    password = data.get("password", "").strip()
    department_code = data.get("department_code", "").strip().upper()
    reg_level = data.get("level", "staff").strip()
    if reg_level not in ("staff", "section"):
        reg_level = "staff"
    if not employee_id or not password or not display_name:
        raise HTTPException(status_code=400, detail="工号、姓名、密码为必填项")
    if employee_id.lower() == "admin":
        raise HTTPException(status_code=400, detail="该工号已被系统保留")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6位")
    if reg_level in ("staff", "section") and not department_code:
        raise HTTPException(status_code=400, detail="课级及以下需填写部门代码")
    if db.query(models.User).filter(models.User.employee_id == employee_id).first():
        raise HTTPException(status_code=400, detail="工号已存在")
    user = models.User(
        username=employee_id, employee_id=employee_id, display_name=display_name,
        password_hash=models.User.hash_password(password),
        role="user", level=reg_level, department_code=department_code,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id, "username": user.username, "employee_id": user.employee_id,
        "display_name": user.display_name, "level": user.level,
        "department_code": user.department_code,
    }


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if credentials:
        TOKENS.pop(credentials.credentials, None)
    return {"message": "已登出"}
