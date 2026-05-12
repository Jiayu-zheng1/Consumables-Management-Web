from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    project: str = ""
    price: Optional[float] = None
    unit: str = "个"
    min_stock: float = 0
    current_stock: float = 0
    description: str = ""


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    project: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    min_stock: Optional[float] = None
    current_stock: Optional[float] = None
    description: Optional[str] = None


class ItemOut(BaseModel):
    id: int
    name: str
    category_id: int
    project: str
    price: Optional[float] = None
    unit: str
    min_stock: float
    current_stock: float
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemWithCategory(ItemOut):
    category: Optional[CategoryOut] = None


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


class DashboardStats(BaseModel):
    total_items: int
    total_categories: int
    low_stock_count: int
    today_inbound: int
    today_outbound: int


class StockAlert(BaseModel):
    item_id: int
    item_name: str
    current_stock: float
    min_stock: float
    unit: str


# ── User ─────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    level: str
    department_code: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLevelUpdate(BaseModel):
    level: str
    department_code: str = ""


# ── Requisition ────────────────────────────────────────

class RequisitionCreate(BaseModel):
    item_id: Optional[int] = None
    new_item_name: Optional[str] = None
    new_item_category_id: Optional[int] = None
    new_item_project: str = ""
    new_item_price: Optional[float] = None
    new_item_unit: str = "个"
    quantity: int = Field(..., ge=1)
    reason: str = ""


class RequisitionOut(BaseModel):
    id: int
    requester_id: int
    requester_name: str = ""
    item_id: Optional[int] = None
    item_name: str = ""
    new_item_name: str
    new_item_category_id: Optional[int] = None
    new_item_project: str
    new_item_price: Optional[float] = None
    new_item_unit: str
    quantity: int
    reason: str
    status: str
    section_approver_id: Optional[int] = None
    department_approver_id: Optional[int] = None
    section_comment: str
    department_comment: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RequisitionApprove(BaseModel):
    action: str  # "approve" or "reject"
    comment: str = ""
