import datetime
import hashlib
import os
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, nullable=True, index=True)
    display_name = Column(String(100), default="")
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), nullable=False, default="user")
    level = Column(String(20), nullable=False, default="staff")
    department_code = Column(String(100), nullable=False, default="", index=True)
    department_scope = Column(String(500), nullable=False, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return salt.hex() + ":" + key.hex()

    @staticmethod
    def verify_password(password: str, stored: str) -> bool:
        salt_hex, key_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return new_key == key


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("Item", back_populates="category", cascade="all, delete-orphan")


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


class InboundRecord(Base):
    __tablename__ = "inbound_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True)
    supplier = Column(String(200), default="")
    operator = Column(String(100), nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("Item", back_populates="inbound_records")


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


class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    new_item_name = Column(String(200), default="")
    new_item_category_id = Column(Integer, nullable=True)
    new_item_project = Column(String(100), default="")
    new_item_unit = Column(String(20), default="个")
    new_item_price = Column(Float, nullable=True)
    new_item_supplier = Column(String(200), default="")
    quantity = Column(Integer, nullable=False)
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
    section_approver = relationship("User", foreign_keys=[section_approver_id])
    department_approver = relationship("User", foreign_keys=[department_approver_id])
