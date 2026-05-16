"""用户路由 — 用户管理(Admin)、个人信息"""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from utils.auth import get_current_user, require_admin, TOKENS

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(models.User).order_by(models.User.id.desc()).all()


@router.put("/users/{user_id}/level")
def update_user_level(user_id: int, data: schemas.UserLevelUpdate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if data.level not in ("staff", "section", "department"):
        raise HTTPException(status_code=400, detail="无效的级别，可选: staff/section/department")
    user.level = data.level
    if data.department_code:
        user.department_code = data.department_code.upper()
    if data.department_scope is not None:
        user.department_scope = data.department_scope
    db.commit()
    return {"message": "已更新", "level": user.level, "department_scope": user.department_scope}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.level == "admin":
        raise HTTPException(status_code=400, detail="不能删除超级管理员")
    if user.username == admin["username"]:
        raise HTTPException(status_code=400, detail="不能删除自己")
    db.delete(user)
    db.commit()
    return {"message": "用户已删除"}


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: int, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    """管理员重置用户密码，返回明文密码，标记该用户下次登录必须修改密码"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.level == "admin":
        raise HTTPException(status_code=400, detail="不能重置超级管理员密码，请自行修改")

    # 生成8位随机密码
    new_password = secrets.token_urlsafe(6)  # 6 bytes = 8 chars
    user.password_hash = models.User.hash_password(new_password)
    user.must_change_password = 1
    db.commit()

    # 清除该用户所有现有 token
    to_remove = [k for k, v in TOKENS.items() if v.get("username") == user.username]
    for k in to_remove:
        TOKENS.pop(k, None)

    return {"message": "密码已重置", "new_password": new_password, "username": user.username}


@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.username == user["username"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "username": u.username, "employee_id": u.employee_id or "",
        "display_name": u.display_name or "", "level": u.level,
        "department_code": u.department_code,
        "department_scope": u.department_scope or "", "role": u.role,
        "created_at": u.created_at.isoformat(),
    }


@router.put("/profile")
def update_profile(data: schemas.ProfileUpdate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    from utils.auth import TOKENS

    u = db.query(models.User).filter(models.User.username == user["username"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    changed = False
    if data.display_name is not None:
        u.display_name = data.display_name
        changed = True
    if data.department_code is not None:
        u.department_code = data.department_code.upper()
        changed = True
    if data.password and len(data.password) >= 6:
        u.password_hash = models.User.hash_password(data.password)
        u.must_change_password = 0  # 自己改了密码，清除强制改密标记
        changed = True
    if not changed:
        return {"message": "无需更新", "display_name": u.display_name or "", "department_code": u.department_code}

    db.commit()

    # 任何 profile 修改都清除该用户所有 token，强制重新登录
    to_remove = [k for k, v in TOKENS.items() if v.get("username") == user["username"]]
    for k in to_remove:
        TOKENS.pop(k, None)

    return {"message": "已更新", "display_name": u.display_name or "", "department_code": u.department_code, "require_relogin": True}
