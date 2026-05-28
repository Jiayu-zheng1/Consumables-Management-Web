import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


class RequisitionItem(Base):
    """请购行项 — 一张请购单可包含多行"""
    __tablename__ = "requisition_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    new_item_name = Column(String(200), default="")
    new_item_category_id = Column(Integer, nullable=True)
    new_item_project = Column(String(100), default="")
    new_item_price = Column(Float, nullable=True)
    new_item_unit = Column(String(20), default="个")
    new_item_supplier = Column(String(200), default="")
    new_item_min_stock = Column(Float, nullable=False, default=0)
    new_item_max_stock = Column(Float, nullable=False, default=0)
    new_item_description = Column(Text, default="")
    quantity = Column(Integer, nullable=False)

    requisition = relationship("Requisition", back_populates="items")
    item = relationship("Item")


class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    req_no = Column(String(30), default="", index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # 旧字段保留兼容，新单改为通过 items relationship 存储
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    new_item_name = Column(String(200), default="")
    new_item_category_id = Column(Integer, nullable=True)
    new_item_project = Column(String(100), default="")
    new_item_unit = Column(String(20), default="个")
    new_item_price = Column(Float, nullable=True)
    new_item_supplier = Column(String(200), default="")
    quantity = Column(Integer, nullable=False, default=0)
    reason = Column(Text, default="")
    status = Column(String(30), nullable=False, default="pending_section", index=True)
    section_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    section_comment = Column(Text, default="")
    department_comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    requester = relationship("User", foreign_keys=[requester_id])
    item = relationship("Item")
    items = relationship("RequisitionItem", back_populates="requisition", cascade="all, delete-orphan")
    section_approver = relationship("User", foreign_keys=[section_approver_id])
    department_approver = relationship("User", foreign_keys=[department_approver_id])
