"""Dashboard 统计服务"""
from datetime import date, datetime
from sqlalchemy.orm import Session
import models
import schemas


def get_stats(db: Session) -> schemas.DashboardStats:
    today_start = datetime.combine(date.today(), datetime.min.time())
    return schemas.DashboardStats(
        total_items=db.query(models.Item).count(),
        total_categories=db.query(models.Category).count(),
        low_stock_count=db.query(models.Item)
        .filter(models.Item.current_stock <= models.Item.min_stock)
        .count(),
        today_inbound=db.query(models.InboundRecord)
        .filter(models.InboundRecord.created_at >= today_start)
        .count(),
        today_outbound=db.query(models.OutboundRecord)
        .filter(models.OutboundRecord.created_at >= today_start)
        .count(),
    )


def get_alerts(db: Session) -> list[schemas.StockAlert]:
    items = db.query(models.Item).filter(
        models.Item.current_stock <= models.Item.min_stock
    ).all()
    return [
        schemas.StockAlert(
            item_id=item.id, item_name=item.name,
            current_stock=item.current_stock, min_stock=item.min_stock,
            unit=item.unit,
        )
        for item in items
    ]
