from pydantic import BaseModel


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
