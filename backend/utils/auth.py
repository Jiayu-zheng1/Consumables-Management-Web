"""共享认证依赖 — TOKENS、限流、权限检查，供所有 router 使用"""
import re
import secrets
import time
from fastapi import Depends, HTTPException, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models

TOKENS: dict[str, dict] = {}
LOGIN_RATE_LIMIT: dict[str, tuple[int, float]] = {}
LEVEL_HIERARCHY = {"staff": 0, "section": 1, "department": 2, "admin": 3}

security = HTTPBearer(auto_error=False)


def _get_user_dept_list(user: dict) -> list[str]:
    depts = [user.get("department_code", "")]
    scope = user.get("department_scope", "")
    if scope:
        # 兼容逗号、空格、中英文逗号分隔
        parts = re.split(r"[,，\s]+", scope)
        depts.extend([d.strip() for d in parts if d.strip()])
    return [d for d in depts if d]


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
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
