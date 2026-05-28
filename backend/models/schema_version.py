import datetime
from sqlalchemy import Column, Integer, DateTime
from database import Base


class SchemaVersion(Base):
    __tablename__ = "schema_versions"
    version = Column(Integer, primary_key=True)
    applied_at = Column(DateTime, default=datetime.datetime.utcnow)
