"""002: 耗材扩展字段 — max_stock, supplier"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    statements = [
        ("ALTER TABLE items ADD COLUMN max_stock FLOAT NOT NULL DEFAULT 0", "items.max_stock"),
        ("ALTER TABLE items ADD COLUMN supplier VARCHAR(200) NOT NULL DEFAULT ''", "items.supplier"),
    ]
    for sql, _ in statements:
        try:
            db.execute(sql)
            db.commit()
        except Exception:
            db.rollback()
