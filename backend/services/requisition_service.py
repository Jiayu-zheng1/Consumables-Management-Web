"""请购业务逻辑"""
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas
from services.requisition_state_machine import (
    ReqState, ReqEvent, STATUS_LABELS, transition as do_transition,
)


def _gen_req_no(db: Session, dept_code: str) -> str:
    """生成请购编号: YYYYMMDD + 部门代码 + 当日流水号(3位)"""
    today = date.today().strftime("%Y%m%d")
    prefix = f"{today}{dept_code or '0000'}"
    today_reqs = db.query(models.Requisition).filter(
        models.Requisition.req_no.like(f"{prefix}%")
    ).count()
    return f"{prefix}{today_reqs + 1:03d}"

# 向后兼容：状态标签从状态机统一导出
STATUS_LABELS = STATUS_LABELS


def _enrich_items(db: Session, items: list[schemas.RequisitionItemCreate]) -> list[dict]:
    """行项预校验 + 自动补全已有耗材的字段"""
    enriched = []
    for it in items:
        if it.item_id:
            item = db.query(models.Item).filter(models.Item.id == it.item_id).first()
            if not item:
                raise HTTPException(status_code=400, detail=f"耗材ID {it.item_id} 不存在")
            enriched.append({
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
            enriched.append({
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
    return enriched


def create_requisition(db: Session, data: schemas.RequisitionCreate, username: str):
    if not data.items:
        raise HTTPException(status_code=400, detail="请至少添加一个耗材行项")

    requester = db.query(models.User).filter(models.User.username == username).first()
    enriched_items = _enrich_items(db, data.items)

    new_status = do_transition("_new", ReqEvent.SUBMIT)
    req_no = _gen_req_no(db, requester.department_code)
    req = models.Requisition(
        req_no=req_no,
        requester_id=requester.id,
        reason=data.reason or "",
        status=new_status,
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

    # 根据 level + action 映射到状态机事件
    event_map = {
        "section": {"approve": ReqEvent.SECTION_APPROVE, "reject": ReqEvent.SECTION_REJECT},
        "department": {"approve": ReqEvent.DEPARTMENT_APPROVE, "reject": ReqEvent.DEPARTMENT_REJECT},
        "admin": {"approve": ReqEvent.ADMIN_APPROVE, "reject": ReqEvent.ADMIN_REJECT},
    }
    level_events = event_map.get(level)
    if level_events is None:
        raise HTTPException(status_code=403, detail="无审批权限")
    event = level_events[action]

    # 状态机统一校验 + 执行转换
    try:
        new_status = do_transition(req.status, event)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 记录审批人信息
    if level == "section":
        req.section_approver_id = approver.id
        req.section_comment = comment
    elif level == "department":
        req.department_approver_id = approver.id
        req.department_comment = comment

    req.status = new_status
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
    if not data.items:
        raise HTTPException(status_code=400, detail="请至少添加一个耗材行项")

    try:
        new_status = do_transition(req.status, ReqEvent.RESUBMIT)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    req.status = new_status
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

    try:
        new_status = do_transition(req.status, ReqEvent.QUICK_INBOUND)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

    req.status = new_status
    db.commit()
    return {"message": "入库成功", "item_name": "、".join(names), "quantity": total_qty}
