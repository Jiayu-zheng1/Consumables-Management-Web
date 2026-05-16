"""请购路由 — 申请、审批、快捷入库、历史"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from utils.auth import get_current_user, LEVEL_HIERARCHY, _get_user_dept_list
from services.requisition_service import (
    create_requisition as req_create,
    approve_requisition as req_approve,
    quick_inbound_from_req,
    resubmit_requisition as req_resubmit,
    STATUS_LABELS,
)

router = APIRouter(prefix="/api/requisitions", tags=["requisitions"])


def _build_req_list(reqs, db: Session) -> list[dict]:
    result = []
    if not reqs:
        return result
    user_ids = {r.requester_id for r in reqs}
    req_ids = {r.id for r in reqs}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}

    # 批量加载行项
    all_items = db.query(models.RequisitionItem).filter(models.RequisitionItem.requisition_id.in_(req_ids)).all()
    items_by_req: dict[int, list] = {}
    for ri in all_items:
        items_by_req.setdefault(ri.requisition_id, []).append(ri)

    # 批量加载已有耗材名称
    item_ids = {ri.item_id for ri in all_items if ri.item_id}
    item_names = {i.id: i.name for i in db.query(models.Item).filter(models.Item.id.in_(item_ids)).all()} if item_ids else {}

    for r in reqs:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        u = users.get(r.requester_id)
        d["requester_name"] = (u.display_name or u.username) if u else ""
        d["item_name"] = ""
        d["new_item_name"] = ""
        d["item_id"] = None
        d["new_item_price"] = None
        d["new_item_unit"] = "个"
        d["new_item_supplier"] = ""
        d["quantity"] = 0

        # 构建 items 列表
        ri_list = items_by_req.get(r.id, [])
        item_dtos = []
        for ri in ri_list:
            item_dto = {c.name: getattr(ri, c.name) for c in ri.__table__.columns}
            item_dto["item_name"] = item_names.get(ri.item_id, "") if ri.item_id else ri.new_item_name or ""
            item_dtos.append(item_dto)
        d["items"] = item_dtos

        # 兼容旧前端：第一行的数据填入顶层字段
        if item_dtos:
            first = item_dtos[0]
            d["item_id"] = first.get("item_id")
            d["item_name"] = first.get("item_name", "")
            d["new_item_name"] = first.get("new_item_name", "")
            d["new_item_price"] = first.get("new_item_price")
            d["new_item_unit"] = first.get("new_item_unit", "个")
            d["new_item_supplier"] = first.get("new_item_supplier", "")
            d["quantity"] = first.get("quantity", 0)

        result.append(d)
    return result


@router.post("", status_code=201)
def create_requisition(data: schemas.RequisitionCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return req_create(db, data, user["username"])


@router.get("/my")
def my_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    requester = db.query(models.User).filter(models.User.username == user["username"]).first()
    reqs = db.query(models.Requisition).filter(
        models.Requisition.requester_id == requester.id
    ).order_by(models.Requisition.id.desc()).all()
    return _build_req_list(reqs, db)


@router.get("/pending-count")
def pending_count(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        return {"count": 0}
    q = db.query(models.Requisition)
    if level != "admin":
        depts = _get_user_dept_list(user)
        sub = db.query(models.User.id).filter(models.User.department_code.in_(depts)).scalar_subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))
    if level == "section":
        q = q.filter(models.Requisition.status == "pending_section")
    elif level == "department":
        q = q.filter(models.Requisition.status.in_(["pending_section", "pending_department"]))
    return {"count": q.count()}


@router.get("/to-approve")
def requisitions_to_approve(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无审批权限")
    q = db.query(models.Requisition)
    if level != "admin":
        depts = _get_user_dept_list(user)
        sub = db.query(models.User.id).filter(models.User.department_code.in_(depts)).scalar_subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))
    if level == "section":
        q = q.filter(models.Requisition.status == "pending_section")
    elif level == "department":
        q = q.filter(models.Requisition.status.in_(["pending_section", "pending_department"]))
    reqs = q.order_by(models.Requisition.id.desc()).all()
    return _build_req_list(reqs, db)


@router.get("/all")
def all_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    reqs = db.query(models.Requisition).order_by(models.Requisition.id.desc()).limit(500).all()
    return _build_req_list(reqs, db)


@router.get("/approved")
def approved_requisitions(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    reqs = db.query(models.Requisition).filter(
        models.Requisition.status == "closed"
    ).order_by(models.Requisition.id.desc()).limit(200).all()
    return _build_req_list(reqs, db)


@router.post("/{req_id}/quick-inbound")
def quick_inbound(req_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return quick_inbound_from_req(db, req_id, user.get("display_name", "") or user.get("username", ""))


@router.post("/{req_id}/resubmit")
def resubmit(req_id: int, data: schemas.RequisitionCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return req_resubmit(db, req_id, data, user["username"])


@router.get("/my-updates-count")
def my_updates_count(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """申请人查看自己被拒绝/已结案的请购数量（红点提醒）"""
    requester = db.query(models.User).filter(models.User.username == user["username"]).first()
    count = db.query(models.Requisition).filter(
        models.Requisition.requester_id == requester.id,
        models.Requisition.status.in_(["rejected", "closed"]),
    ).count()
    return {"count": count}


@router.get("/history")
def requisitions_history(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    level = user.get("level", "staff")
    if LEVEL_HIERARCHY.get(level, 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无权限查看历史记录")
    q = db.query(models.Requisition).filter(
        models.Requisition.status.in_(["pending_department", "closed", "rejected"])
    )
    if level != "admin":
        depts = _get_user_dept_list(user)
        sub = db.query(models.User.id).filter(models.User.department_code.in_(depts)).scalar_subquery()
        q = q.filter(models.Requisition.requester_id.in_(sub))
    reqs = q.order_by(models.Requisition.id.desc()).limit(200).all()
    return _build_req_list(reqs, db)


@router.post("/{req_id}/approve")
def approve_requisition(req_id: int, data: schemas.RequisitionApprove, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return req_approve(db, req_id, data.action, data.comment, user["username"], user.get("level", "staff"))
