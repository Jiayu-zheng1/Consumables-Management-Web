"""Dashboard 路由 — 仪表盘统计、库存告警、花费图表、操作明细"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from utils.auth import get_current_user, LEVEL_HIERARCHY
from services.dashboard_service import get_stats, get_alerts

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return get_stats(db)


@router.get("/alerts", response_model=list[schemas.StockAlert])
def get_stock_alerts(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return get_alerts(db)


@router.get("/dashboard/spending")
def spending_data(
    year: int = Query(None),
    month: int = Query(None),
    department: str = Query(""),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    reqs = db.query(models.Requisition).filter(
        models.Requisition.status.in_(["closed", "fulfilled"]),
    ).all()

    # 批量加载行项
    req_ids = {r.id for r in reqs}
    all_ri = db.query(models.RequisitionItem).filter(
        models.RequisitionItem.requisition_id.in_(req_ids),
    ).all()

    # 批量加载用户和分类
    user_ids = {r.requester_id for r in reqs}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}
    cat_ids = {ri.new_item_category_id for ri in all_ri if ri.new_item_category_id}
    cats = {c.id: c for c in db.query(models.Category).filter(models.Category.id.in_(cat_ids)).all()} if cat_ids else {}

    ri_by_req: dict = {}
    for ri in all_ri:
        ri_by_req.setdefault(ri.requisition_id, []).append(ri)

    result: list[dict] = []
    for r in reqs:
        d = r.created_at
        if year and d.year != year:
            continue
        if month and d.month != month:
            continue
        requester = users.get(r.requester_id)
        dept_code = requester.department_code if requester else ""
        if department and dept_code != department.upper():
            continue
        for ri in ri_by_req.get(r.id, []):
            cat_name = ""
            if ri.new_item_category_id:
                cat = cats.get(ri.new_item_category_id)
                cat_name = cat.name if cat else ""
            result.append({
                "id": r.id,
                "amount": round((ri.new_item_price or 0) * ri.quantity, 2),
                "month": d.month, "year": d.year,
                "month_label": f"{d.year}-{d.month:02d}",
                "department": dept_code, "category": cat_name,
                "item_name": ri.new_item_name or "", "item_id": ri.item_id,
                "quantity": ri.quantity, "requester": (requester.display_name or requester.username) if requester else "",
            })

    all_depts = sorted(set(
        (u.department_code for u in db.query(models.User).filter(models.User.department_code != "").all())
    ))
    all_years = sorted(set(r["year"] for r in result), reverse=True)
    return {"data": result, "departments": all_depts, "years": all_years}


@router.get("/audit")
def audit_log(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if LEVEL_HIERARCHY.get(user.get("level", "staff"), 0) < LEVEL_HIERARCHY["section"]:
        raise HTTPException(status_code=403, detail="无权限查看操作明细")
    records = db.query(models.InboundRecord).order_by(models.InboundRecord.id.desc()).limit(100).all()
    return [
        {
            "type": "inbound", "id": r.id, "item_id": r.item_id,
            "quantity": r.quantity, "operator": r.operator,
            "time": r.created_at.isoformat(),
        }
        for r in records
    ]
