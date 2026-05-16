"""005: 创建 requisition_items 表 + 迁移旧数据"""
from sqlalchemy.orm import Session

def upgrade(db: Session):
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS requisition_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requisition_id INTEGER NOT NULL REFERENCES requisitions(id),
                item_id INTEGER REFERENCES items(id),
                new_item_name VARCHAR(200) DEFAULT '',
                new_item_category_id INTEGER,
                new_item_project VARCHAR(100) DEFAULT '',
                new_item_price FLOAT,
                new_item_unit VARCHAR(20) DEFAULT '个',
                new_item_supplier VARCHAR(200) DEFAULT '',
                quantity INTEGER NOT NULL DEFAULT 1
            )
        """)
        db.commit()
    except Exception:
        db.rollback()

    # 迁移旧数据：将 requisitions 的单行数据转为 requisition_items
    try:
        from sqlalchemy import text
        rows = db.execute(text("SELECT id, item_id, new_item_name, new_item_category_id, new_item_project, new_item_price, new_item_unit, new_item_supplier, quantity FROM requisitions WHERE (item_id IS NOT NULL AND item_id != 0) OR new_item_name != ''")).fetchall()
        for row in rows:
            existing = db.execute(
                text("SELECT id FROM requisition_items WHERE requisition_id = :rid"),
                {"rid": row[0]}
            ).first()
            if existing:
                continue
            db.execute(
                text("INSERT INTO requisition_items (requisition_id, item_id, new_item_name, new_item_category_id, new_item_project, new_item_price, new_item_unit, new_item_supplier, quantity) VALUES (:r,:i,:n,:c,:p,:pr,:u,:s,:q)"),
                {"r": row[0], "i": row[1], "n": row[2] or "", "c": row[3], "p": row[4] or "", "pr": row[5], "u": row[6] or "个", "s": row[7] or "", "q": row[8] or 1},
            )
        db.commit()
    except Exception:
        db.rollback()
