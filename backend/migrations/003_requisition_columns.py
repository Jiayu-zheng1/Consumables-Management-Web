"""003: 请购扩展字段 — new_item_supplier"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    statements = [
        ("ALTER TABLE requisitions ADD COLUMN new_item_supplier VARCHAR(200) NOT NULL DEFAULT ''", "requisitions.new_item_supplier"),
    ]
    for sql, _ in statements:
        try:
            db.execute(sql)
            db.commit()
        except Exception:
            db.rollback()
