from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class RequisitionItemCreate(BaseModel):
    item_id: Optional[int] = None
    new_item_name: Optional[str] = None
    new_item_category_id: Optional[int] = None
    new_item_project: str = ""
    new_item_price: Optional[float] = None
    new_item_unit: str = "个"
    new_item_supplier: str = ""
    new_item_min_stock: float = 0
    new_item_max_stock: float = 0
    new_item_description: str = ""
    quantity: int = Field(..., ge=1)


class RequisitionItemOut(BaseModel):
    id: int
    requisition_id: int
    item_id: Optional[int] = None
    item_name: str = ""
    new_item_name: str = ""
    new_item_category_id: Optional[int] = None
    new_item_project: str = ""
    new_item_price: Optional[float] = None
    new_item_unit: str = "个"
    new_item_supplier: str = ""
    new_item_min_stock: float = 0
    new_item_max_stock: float = 0
    new_item_description: str = ""
    quantity: int

    model_config = {"from_attributes": True}


class RequisitionCreate(BaseModel):
    items: list[RequisitionItemCreate] = []
    reason: str = ""


class RequisitionOut(BaseModel):
    id: int
    req_no: str = ""
    requester_id: int
    requester_name: str = ""
    reason: str = ""
    status: str
    section_approver_id: Optional[int] = None
    department_approver_id: Optional[int] = None
    section_comment: str = ""
    department_comment: str = ""
    created_at: datetime
    updated_at: datetime
    items: list[RequisitionItemOut] = []
    # 兼容旧前端字段
    item_id: Optional[int] = None
    item_name: str = ""
    new_item_name: str = ""
    new_item_category_id: Optional[int] = None
    new_item_project: str = ""
    new_item_price: Optional[float] = None
    new_item_unit: str = "个"
    new_item_supplier: str = ""
    quantity: int = 0

    model_config = {"from_attributes": True}


class RequisitionApprove(BaseModel):
    action: str  # "approve" or "reject"
    comment: str = ""
