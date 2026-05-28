import datetime
import hashlib
import os
from sqlalchemy import Column, Integer, String, DateTime
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
    must_change_password = Column(Integer, nullable=False, default=0)
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
