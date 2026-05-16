"""入库业务逻辑"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas


def create_inbound(db: Session, data: schemas.InboundCreate, operator: str):
    """创建入库记录并更新库存"""
    if data.item_id:
        item = db.query(models.Item).filter(models.Item.id == data.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="耗材不存在")
        if not data.supplier and item.supplier:
            data = data.model_copy(update={"supplier": item.supplier})
    elif data.new_item_name and data.new_item_category_id:
        existing = db.query(models.Item).filter(
            models.Item.name == data.new_item_name.strip(),
            models.Item.project == (data.new_item_project or ""),
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"耗材「{data.new_item_name}」在专案「{data.new_item_project or '未指定'}」中已存在，请从列表中选择",
            )
        cat = db.query(models.Category).filter(models.Category.id == data.new_item_category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="所选类别不存在")
        item = models.Item(
            name=data.new_item_name.strip(),
            category_id=data.new_item_category_id,
            project=data.new_item_project or "",
            price=data.new_item_price,
            unit=data.new_item_unit or "个",
            current_stock=0, min_stock=0,
        )
        db.add(item)
        db.flush()
    else:
        raise HTTPException(status_code=400, detail="请选择已有耗材或填写新耗材信息")

    record = models.InboundRecord(
        item_id=item.id, quantity=data.quantity,
        price=data.supplier_price, supplier=data.supplier,
        operator=operator, note=data.note,
    )
    item.current_stock += data.quantity
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
