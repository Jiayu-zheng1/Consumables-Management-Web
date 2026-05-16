"""001: 用户扩展字段 — employee_id, display_name, level, department 等"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    statements = [
        ("ALTER TABLE users ADD COLUMN level VARCHAR(20) NOT NULL DEFAULT 'staff'", "users.level"),
        ("ALTER TABLE users ADD COLUMN department_code VARCHAR(100) NOT NULL DEFAULT ''", "users.department_code"),
        ("ALTER TABLE users ADD COLUMN department_scope VARCHAR(500) NOT NULL DEFAULT ''", "users.department_scope"),
        ("ALTER TABLE users ADD COLUMN employee_id VARCHAR(50)", "users.employee_id"),
        ("ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NOT NULL DEFAULT ''", "users.display_name"),
    ]
    for sql, _ in statements:
        try:
            db.execute(sql)
            db.commit()
        except Exception:
            db.rollback()
