import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    project = Column(String(100), default="", index=True)
    price = Column(Float, nullable=True, default=0)
    unit = Column(String(20), nullable=False, default="个")
    min_stock = Column(Float, nullable=False, default=0)
    max_stock = Column(Float, nullable=False, default=0)
    current_stock = Column(Float, nullable=False, default=0)
    supplier = Column(String(200), default="")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="items")
    inbound_records = relationship("InboundRecord", back_populates="item", cascade="all, delete-orphan")
    outbound_records = relationship("OutboundRecord", back_populates="item", cascade="all, delete-orphan")
