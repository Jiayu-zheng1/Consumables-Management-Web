from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: int
    username: str
    employee_id: Optional[str] = None
    display_name: str = ""
    level: str
    department_code: str
    department_scope: str = ""
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    department_code: Optional[str] = None
    password: Optional[str] = None


class UserLevelUpdate(BaseModel):
    level: str
    department_code: str = ""
    department_scope: str = ""
