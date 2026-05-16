"""出库业务逻辑"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas


def create_outbound(db: Session, data: schemas.OutboundCreate, operator: str):
    """创建出库记录并扣减库存"""
    item = db.query(models.Item).filter(models.Item.id == data.item_id).first()
    if not item:
        raise HTTPException(status_code=400, detail="耗材不存在")
    if item.current_stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"库存不足，当前库存: {item.current_stock} {item.unit}")
    record = models.OutboundRecord(
        item_id=data.item_id, quantity=data.quantity,
        department=data.department, operator=operator,
        purpose=data.purpose, note=data.note,
    )
    item.current_stock -= data.quantity
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
