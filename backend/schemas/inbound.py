from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class InboundCreate(BaseModel):
    item_id: Optional[int] = None
    new_item_name: Optional[str] = None
    new_item_category_id: Optional[int] = None
    new_item_project: str = ""
    new_item_price: Optional[float] = None
    new_item_unit: str = "个"
    quantity: float = Field(..., gt=0)
    supplier_price: Optional[float] = None
    supplier: str = ""
    operator: str = ""
    note: str = ""


class InboundOut(BaseModel):
    id: int
    item_id: int
    item_name: str = ""
    quantity: float
    price: Optional[float] = None
    supplier: str
    operator: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}
