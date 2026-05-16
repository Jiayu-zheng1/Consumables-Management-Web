"""出库路由 — 出库记录列表、新增出库"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from utils.auth import get_current_user
from services.outbound_service import create_outbound as outbound_create

router = APIRouter(prefix="/api/outbound", tags=["outbound"])


@router.get("", response_model=list[schemas.OutboundOut])
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
    if not records:
        return []
    item_ids = {r.item_id for r in records}
    items = {i.id: i for i in db.query(models.Item).filter(models.Item.id.in_(item_ids)).all()}
    result = []
    for r in records:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        it = items.get(r.item_id)
        d["item_name"] = it.name if it else ""
        result.append(d)
    return result


@router.post("", response_model=schemas.OutboundOut, status_code=201)
def create_outbound(data: schemas.OutboundCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return outbound_create(db, data, user.get("display_name", "") or user.get("username", ""))
