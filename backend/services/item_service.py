"""耗材业务逻辑"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas


def create_item(db: Session, data: schemas.ItemCreate):
    cat = db.query(models.Category).filter(models.Category.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="类别不存在")
    item = models.Item(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: int, data: schemas.ItemUpdate):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")

    # 解除 requisition_items 的外键引用，保留请购历史
    refs = db.query(models.RequisitionItem).filter(models.RequisitionItem.item_id == item_id).all()
    for ri in refs:
        ri.item_id = None
        if not ri.new_item_name:
            ri.new_item_name = item.name
        if not ri.new_item_project:
            ri.new_item_project = item.project or ""
        if ri.new_item_price is None:
            ri.new_item_price = item.price
        if not ri.new_item_unit or ri.new_item_unit == "个":
            ri.new_item_unit = item.unit
        if not ri.new_item_supplier:
            ri.new_item_supplier = item.supplier or ""

    # 解除 requisitions 旧字段的引用
    db.query(models.Requisition).filter(models.Requisition.item_id == item_id).update({"item_id": None})

    db.delete(item)
    db.commit()
