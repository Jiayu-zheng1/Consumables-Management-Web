from pydantic import BaseModel, Field
from datetime import datetime


class OutboundCreate(BaseModel):
    item_id: int
    quantity: float = Field(..., gt=0)
    department: str = ""
    operator: str = ""
    purpose: str = ""
    note: str = ""


class OutboundOut(BaseModel):
    id: int
    item_id: int
    item_name: str = ""
    quantity: float
    department: str
    operator: str
    purpose: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}
