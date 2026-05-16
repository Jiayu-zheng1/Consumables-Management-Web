"""数据库迁移运行器 — 版本化执行，幂等跳过"""
import importlib
import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

MIGRATIONS = [
    "migrations.001_user_columns",
    "migrations.002_item_columns",
    "migrations.003_requisition_columns",
    "migrations.004_must_change_password",
    "migrations.005_requisition_items",
    "migrations.006_req_no",
    "migrations.007_requisition_item_extra_fields",
]


def run_migrations(db: Session):
    """执行所有未应用的迁移"""
    applied = {v[0] for v in db.query(models.SchemaVersion.version).all()}

    for i, module_name in enumerate(MIGRATIONS, start=1):
        if i in applied:
            continue
        logger.info(f"执行迁移 {i:03d}: {module_name}")
        try:
            mod = importlib.import_module(module_name)
            mod.upgrade(db)
            db.add(models.SchemaVersion(version=i))
            db.commit()
            logger.info(f"迁移 {i:03d} 完成")
        except Exception as e:
            db.rollback()
            logger.error(f"迁移 {i:03d} 失败: {e}")
            raise
