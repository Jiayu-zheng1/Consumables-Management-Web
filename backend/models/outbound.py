import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


class OutboundRecord(Base):
    __tablename__ = "outbound_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    department = Column(String(200), default="")
    operator = Column(String(100), nullable=False)
    purpose = Column(String(500), default="")
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("Item", back_populates="outbound_records")
