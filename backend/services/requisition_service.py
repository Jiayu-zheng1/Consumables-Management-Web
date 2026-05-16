"""请购业务逻辑"""
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas


def _gen_req_no(db: Session, dept_code: str) -> str:
    """生成请购编号: YYYYMMDD + 部门代码 + 当日流水号(3位)"""
    today = date.today().strftime("%Y%m%d")
    prefix = f"{today}{dept_code or '0000'}"
    today_reqs = db.query(models.Requisition).filter(
        models.Requisition.req_no.like(f"{prefix}%")
    ).count()
    return f"{prefix}{today_reqs + 1:03d}"

STATUS_LABELS = {
    "pending_section": "待课级审批",
    "pending_department": "待部级审批",
    "closed": "已结案",
    "rejected": "已拒绝",
    "fulfilled": "已入库",
}


def create_requisition(db: Session, data: schemas.RequisitionCreate, username: str):
    if not data.items:
        raise HTTPException(status_code=400, detail="请至少添加一个耗材行项")

    requester = db.query(models.User).filter(models.User.username == username).first()

    # 预校验 + 自动补全
    enriched_items = []
    for it in data.items:
        if it.item_id:
            item = db.query(models.Item).filter(models.Item.id == it.item_id).first()
            if not item:
                raise HTTPException(status_code=400, detail=f"耗材ID {it.item_id} 不存在")
            enriched_items.append({
                "item_id": it.item_id,
                "quantity": it.quantity,
                "new_item_name": "",
                "new_item_category_id": None,
                "new_item_project": it.new_item_project or item.project,
                "new_item_price": it.new_item_price if it.new_item_price is not None else item.price,
                "new_item_unit": it.new_item_unit if it.new_item_unit != "个" else item.unit,
                "new_item_supplier": it.new_item_supplier or item.supplier,
                "new_item_min_stock": it.new_item_min_stock,
                "new_item_max_stock": it.new_item_max_stock,
                "new_item_description": it.new_item_description or "",
            })
        elif it.new_item_name:
            enriched_items.append({
                "item_id": None,
                "quantity": it.quantity,
                "new_item_name": it.new_item_name,
                "new_item_category_id": it.new_item_category_id,
                "new_item_project": it.new_item_project or "",
                "new_item_price": it.new_item_price,
                "new_item_unit": it.new_item_unit or "个",
                "new_item_supplier": it.new_item_supplier or "",
                "new_item_min_stock": it.new_item_min_stock or 0,
                "new_item_max_stock": it.new_item_max_stock or 0,
                "new_item_description": it.new_item_description or "",
            })
        else:
            raise HTTPException(status_code=400, detail="每行需选择已有耗材或填写新耗材名称")

    req_no = _gen_req_no(db, requester.department_code)
    req = models.Requisition(
        req_no=req_no,
        requester_id=requester.id,
        reason=data.reason or "",
        status="pending_section",
        quantity=0,
    )
    db.add(req)
    db.flush()

    for ei in enriched_items:
        ri = models.RequisitionItem(requisition_id=req.id, **ei)
        db.add(ri)

    db.commit()
    db.refresh(req)
    return {"id": req.id, "req_no": req.req_no, "status": req.status, "status_label": STATUS_LABELS[req.status], "message": "请购已提交，等待课级审批"}


def approve_requisition(db: Session, req_id: int, action: str, comment: str, username: str, level: str):
    req = db.query(models.Requisition).filter(models.Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="请购单不存在")
    approver = db.query(models.User).filter(models.User.username == username).first()
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action 必须是 approve 或 reject")
    if level == "section":
        if req.status != "pending_section":
            raise HTTPException(status_code=400, detail="该请购单已不在课级审批阶段")
        req.section_approver_id = approver.id
        req.section_comment = comment
        req.status = "rejected" if action == "reject" else "pending_department"
    elif level == "department":
        if req.status not in ("pending_section", "pending_department"):
            raise HTTPException(status_code=400, detail="该请购单不在可审批状态")
        req.department_approver_id = approver.id
        req.department_comment = comment
        req.status = "rejected" if action == "reject" else "closed"
    elif level == "admin":
        req.status = "closed" if action == "approve" else "rejected"
    else:
        raise HTTPException(status_code=403, detail="无审批权限")
    db.commit()
    return {"status": req.status, "status_label": STATUS_LABELS[req.status], "message": "审批完成"}


def resubmit_requisition(db: Session, req_id: int, data: schemas.RequisitionCreate, username: str):
    """被拒请购重新提交"""
    req = db.query(models.Requisition).filter(models.Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="请购单不存在")
    requester = db.query(models.User).filter(models.User.username == username).first()
    if req.requester_id != requester.id:
        raise HTTPException(status_code=403, detail="仅申请人可修改自己的请购单")
    if req.status != "rejected":
        raise HTTPException(status_code=400, detail="仅被拒绝的请购单可重新提交")
    if not data.items:
        raise HTTPException(status_code=400, detail="请至少添加一个耗材行项")

    # 清除旧行项，重新创建
    db.query(models.RequisitionItem).filter(models.RequisitionItem.requisition_id == req_id).delete()

    for it in data.items:
        if it.item_id:
            item = db.query(models.Item).filter(models.Item.id == it.item_id).first()
            if not item:
                raise HTTPException(status_code=400, detail=f"耗材ID {it.item_id} 不存在")
        elif not it.new_item_name:
            raise HTTPException(status_code=400, detail="每行需选择已有耗材或填写新耗材名称")
        ri = models.RequisitionItem(
            requisition_id=req_id,
            item_id=it.item_id,
            new_item_name=it.new_item_name or "",
            new_item_category_id=it.new_item_category_id,
            new_item_project=it.new_item_project or "",
            new_item_price=it.new_item_price,
            new_item_unit=it.new_item_unit or "个",
            new_item_supplier=it.new_item_supplier or "",
            new_item_min_stock=it.new_item_min_stock or 0,
            new_item_max_stock=it.new_item_max_stock or 0,
            new_item_description=it.new_item_description or "",
            quantity=it.quantity,
        )
        db.add(ri)

    req.reason = data.reason or ""
    req.status = "pending_section"
    req.section_approver_id = None
    req.department_approver_id = None
    req.section_comment = ""
    req.department_comment = ""
    db.commit()
    db.refresh(req)
    return {"id": req.id, "status": req.status, "status_label": STATUS_LABELS[req.status], "message": "请购已重新提交，等待课级审批"}


def quick_inbound_from_req(db: Session, req_id: int, operator: str):
    req = db.query(models.Requisition).filter(models.Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="请购单不存在")
    if req.status != "closed":
        raise HTTPException(status_code=400, detail="仅已结案的请购单可快捷入库")

    items = db.query(models.RequisitionItem).filter(
        models.RequisitionItem.requisition_id == req_id
    ).all()

    if not items:
        raise HTTPException(status_code=400, detail="请购单无耗材行项")

    total_qty = 0
    names = []
    for ri in items:
        qty = ri.quantity
        if ri.item_id:
            item = db.query(models.Item).filter(models.Item.id == ri.item_id).first()
            if not item:
                continue
        else:
            # 新耗材：查找或创建
            existing = db.query(models.Item).filter(
                models.Item.name == ri.new_item_name.strip(),
                models.Item.project == (ri.new_item_project or ""),
            ).first()
            if existing:
                item = existing
            else:
                item = models.Item(
                    name=ri.new_item_name.strip(),
                    category_id=ri.new_item_category_id or 1,
                    project=ri.new_item_project or "",
                    price=ri.new_item_price or 0,
                    unit=ri.new_item_unit or "个",
                    current_stock=0,
                    min_stock=ri.new_item_min_stock or 0,
                    max_stock=ri.new_item_max_stock or 0,
                    description=ri.new_item_description or "",
                )
                db.add(item)
                db.flush()

        record = models.InboundRecord(
            item_id=item.id, quantity=qty,
            price=ri.new_item_price, supplier=ri.new_item_supplier or "",
            operator=operator, note=f"快捷入库 (请购单#{req.id} 行#{ri.id})",
        )
        item.current_stock += qty
        total_qty += qty
        names.append(item.name)
        db.add(record)

    req.status = "fulfilled"
    db.commit()
    return {"message": "入库成功", "item_name": "、".join(names), "quantity": total_qty}
