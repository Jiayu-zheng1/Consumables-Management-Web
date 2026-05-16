"""006: 请购编号 req_no"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    try:
        db.execute("ALTER TABLE requisitions ADD COLUMN req_no VARCHAR(30) NOT NULL DEFAULT ''")
        db.commit()
    except Exception:
        db.rollback()

    # 为已有请购回填编号: YYYYMMDD + dept + id(补零)
    try:
        from sqlalchemy import text
        rows = db.execute(text(
            "SELECT r.id, r.created_at, u.department_code FROM requisitions r JOIN users u ON r.requester_id = u.id WHERE r.req_no = ''"
        )).fetchall()
        for row in rows:
            rid, created, dept = row[0], row[1], (row[2] or "0000")
            date_str = created[:10].replace("-", "") if created else "19700101"
            # 查找当天同部门已有编号数
            prefix = f"{date_str}{dept}"
            cnt = db.execute(text(
                "SELECT COUNT(*) FROM requisitions WHERE req_no LIKE :p AND id < :rid"
            ), {"p": f"{prefix}%", "rid": rid}).scalar()
            req_no = f"{prefix}{cnt + 1:03d}"
            db.execute(text("UPDATE requisitions SET req_no = :n WHERE id = :rid"), {"n": req_no, "rid": rid})
        db.commit()
    except Exception:
        db.rollback()
