"""007: requisition_items 增加 min_stock, max_stock, description"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    statements = [
        "ALTER TABLE requisition_items ADD COLUMN new_item_min_stock FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE requisition_items ADD COLUMN new_item_max_stock FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE requisition_items ADD COLUMN new_item_description TEXT NOT NULL DEFAULT ''",
    ]
    for sql in statements:
        try:
            db.execute(sql)
            db.commit()
        except Exception:
            db.rollback()
