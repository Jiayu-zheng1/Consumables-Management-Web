from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

from .category import CategoryOut


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    project: str = ""
    price: Optional[float] = None
    unit: str = "个"
    min_stock: float = 0
    max_stock: float = 0
    current_stock: float = 0
    supplier: str = ""
    description: str = ""


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    project: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    current_stock: Optional[float] = None
    supplier: Optional[str] = None
    description: Optional[str] = None


class ItemOut(BaseModel):
    id: int
    name: str
    category_id: int
    project: str
    price: Optional[float] = None
    unit: str
    min_stock: float
    max_stock: float
    current_stock: float
    supplier: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemWithCategory(ItemOut):
    category: Optional[CategoryOut] = None
