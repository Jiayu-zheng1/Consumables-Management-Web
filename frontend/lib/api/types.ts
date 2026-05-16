// 全部 API 类型定义

export interface DashboardStats {
  total_items: number;
  total_categories: number;
  low_stock_count: number;
  today_inbound: number;
  today_outbound: number;
}

export interface StockAlert {
  item_id: number;
  item_name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
}

export interface Item {
  id: number;
  name: string;
  category_id: number;
  project: string;
  price: number | null;
  unit: string;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  supplier: string;
  description: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface ItemCreate {
  name: string;
  category_id: number;
  project?: string;
  price?: number;
  unit?: string;
  min_stock?: number;
  max_stock?: number;
  current_stock?: number;
  supplier?: string;
  description?: string;
}

export interface ItemUpdate {
  name?: string;
  category_id?: number;
  project?: string;
  price?: number;
  unit?: string;
  min_stock?: number;
  max_stock?: number;
  supplier?: string;
  description?: string;
}

export interface InboundRecord {
  id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  price: number | null;
  supplier: string;
  operator: string;
  note: string;
  created_at: string;
}

export interface InboundCreate {
  item_id?: number;
  new_item_name?: string;
  new_item_category_id?: number;
  new_item_project?: string;
  new_item_price?: number;
  new_item_unit?: string;
  quantity: number;
  supplier_price?: number;
  supplier?: string;
  operator: string;
  note?: string;
}

export interface OutboundRecord {
  id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  department: string;
  operator: string;
  purpose: string;
  note: string;
  created_at: string;
}

export interface OutboundCreate {
  item_id: number;
  quantity: number;
  department?: string;
  operator: string;
  purpose?: string;
  note?: string;
}

export interface SpendingItem {
  id: number; amount: number; month: number; year: number;
  month_label: string; department: string; category: string;
  item_name: string; quantity: number; requester: string;
}

export interface SpendingData {
  data: SpendingItem[]; departments: string[]; years: number[];
}

export interface UserInfo {
  id: number;
  username: string;
  employee_id: string | null;
  display_name: string;
  level: string;
  department_code: string;
  department_scope: string;
  role: string;
  created_at: string;
}

export interface ProfileInfo {
  username: string;
  employee_id: string | null;
  display_name: string;
  level: string;
  department_code: string;
  department_scope: string;
  role: string;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  department_code?: string;
  password?: string;
}

export interface RequisitionItemType {
  id: number;
  requisition_id: number;
  item_id: number | null;
  item_name: string;
  new_item_name: string;
  new_item_category_id: number | null;
  new_item_project: string;
  new_item_price: number | null;
  new_item_unit: string;
  new_item_supplier: string;
  quantity: number;
}

export interface Requisition {
  id: number;
  req_no: string;
  requester_id: number;
  requester_name: string;
  item_id: number | null;
  item_name: string;
  new_item_name: string;
  new_item_category_id: number | null;
  new_item_project: string;
  new_item_price: number | null;
  new_item_unit: string;
  new_item_supplier: string;
  quantity: number;
  reason: string;
  status: string;
  section_approver_id: number | null;
  department_approver_id: number | null;
  section_comment: string;
  department_comment: string;
  created_at: string;
  updated_at: string;
  items?: RequisitionItemType[];
}

export interface RequisitionItemCreate {
  item_id?: number | null;
  new_item_name?: string;
  new_item_category_id?: number | null;
  new_item_project?: string;
  new_item_price?: number | null;
  new_item_unit?: string;
  new_item_supplier?: string;
  new_item_min_stock?: number;
  new_item_max_stock?: number;
  new_item_description?: string;
  quantity: number;
}

export interface RequisitionCreate {
  items: RequisitionItemCreate[];
  reason?: string;
}
