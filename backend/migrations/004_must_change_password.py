"""004: must_change_password 标记"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    try:
        db.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0")
        db.commit()
    except Exception:
        db.rollback()
