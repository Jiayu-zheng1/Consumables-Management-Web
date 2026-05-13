const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let msg = "";
    if (typeof err.detail === "string") msg = err.detail;
    else if (Array.isArray(err.detail)) msg = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    else msg = JSON.stringify(err.detail || err);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Dashboard ────────────────────────────────────────────

export interface DashboardStats {
  total_items: number;
  total_categories: number;
  low_stock_count: number;
  today_inbound: number;
  today_outbound: number;
}

export const getDashboard = () => request<DashboardStats>("/dashboard");

// ── Alerts ───────────────────────────────────────────────

export interface StockAlert {
  item_id: number;
  item_name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

export const getAlerts = () => request<StockAlert[]>("/alerts");

// ── Categories ───────────────────────────────────────────

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

export const getCategories = (search = "") =>
  request<Category[]>(`/categories?search=${encodeURIComponent(search)}`);

export const createCategory = (data: CategoryCreate) =>
  request<Category>("/categories", { method: "POST", body: JSON.stringify(data) });

export const updateCategory = (id: number, data: CategoryUpdate) =>
  request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCategory = (id: number) =>
  request<void>(`/categories/${id}`, { method: "DELETE" });

// ── Items ────────────────────────────────────────────────

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

export const getItems = (params: { search?: string; category_id?: number; project?: string; low_stock?: boolean } = {}) => {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.category_id) sp.set("category_id", String(params.category_id));
  if (params.project) sp.set("project", params.project);
  if (params.low_stock) sp.set("low_stock", "true");
  return request<Item[]>(`/items?${sp.toString()}`);
};

export const createItem = (data: ItemCreate) =>
  request<Item>("/items", { method: "POST", body: JSON.stringify(data) });

export const updateItem = (id: number, data: ItemUpdate) =>
  request<Item>(`/items/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteItem = (id: number) =>
  request<void>(`/items/${id}`, { method: "DELETE" });

// ── Inbound ──────────────────────────────────────────────

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

export const getInboundRecords = (params: { item_id?: number; page?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.item_id) sp.set("item_id", String(params.item_id));
  if (params.page) sp.set("page", String(params.page));
  return request<InboundRecord[]>(`/inbound?${sp.toString()}`);
};

export const createInbound = (data: InboundCreate) =>
  request<InboundRecord>("/inbound", { method: "POST", body: JSON.stringify(data) });

// ── Outbound ─────────────────────────────────────────────

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

export const getOutboundRecords = (params: { item_id?: number; page?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.item_id) sp.set("item_id", String(params.item_id));
  if (params.page) sp.set("page", String(params.page));
  return request<OutboundRecord[]>(`/outbound?${sp.toString()}`);
};

export const createOutbound = (data: OutboundCreate) =>
  request<OutboundRecord>("/outbound", { method: "POST", body: JSON.stringify(data) });

// ── Projects ─────────────────────────────────────────────

export const getProjects = () => request<string[]>("/projects");

// ── Dashboard Charts ──────────────────────────────────────

export interface SpendingItem {
  id: number; amount: number; month: number; year: number;
  month_label: string; department: string; category: string;
  item_name: string; quantity: number; requester: string;
}

export interface SpendingData {
  data: SpendingItem[]; departments: string[]; years: number[];
}

export const getSpendingData = (params: { year?: number; month?: number; department?: string } = {}) => {
  const sp = new URLSearchParams();
  if (params.year) sp.set("year", String(params.year));
  if (params.month) sp.set("month", String(params.month));
  if (params.department) sp.set("department", params.department);
  return request<SpendingData>(`/dashboard/spending?${sp.toString()}`);
};

// ── Users ────────────────────────────────────────────────

export interface UserInfo {
  id: number;
  username: string;
  employee_id: string;
  display_name: string;
  level: string;
  department_code: string;
  department_scope: string;
  role: string;
  created_at: string;
}

export const getUsers = () => request<UserInfo[]>("/users");

export const updateUserLevel = (userId: number, level: string, department_code: string, department_scope?: string) =>
  request<{ message: string; department_scope: string }>(`/users/${userId}/level`, { method: "PUT", body: JSON.stringify({ level, department_code, department_scope: department_scope || "" }) });

export const deleteUser = (userId: number) =>
  request<{ message: string }>(`/users/${userId}`, { method: "DELETE" });

// ── Profile ─────────────────────────────────────────────

export interface ProfileInfo {
  username: string;
  employee_id: string;
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

export const getProfile = () => request<ProfileInfo>("/profile");

export const updateProfile = (data: ProfileUpdate) =>
  request<{ message: string; display_name: string; department_code: string }>("/profile", { method: "PUT", body: JSON.stringify(data) });

// ── Requisitions ────────────────────────────────────────

export interface Requisition {
  id: number;
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
}

export interface RequisitionCreate {
  item_id?: number;
  new_item_name?: string;
  new_item_category_id?: number;
  new_item_project?: string;
  new_item_price?: number;
  new_item_unit?: string;
  new_item_supplier?: string;
  quantity: number;
  reason?: string;
}

export const createRequisition = (data: RequisitionCreate) =>
  request<{ id: number; status: string; status_label: string; message: string }>("/requisitions", { method: "POST", body: JSON.stringify(data) });

export const getMyRequisitions = () => request<Requisition[]>("/requisitions/my");

export const getRequisitionsToApprove = () => request<Requisition[]>("/requisitions/to-approve");

export const getApprovedRequisitions = () => request<Requisition[]>("/requisitions/approved");

export const quickInbound = (reqId: number) =>
  request<{ message: string; item_name: string; quantity: number }>(`/requisitions/${reqId}/quick-inbound`, { method: "POST" });

export const approveRequisition = (reqId: number, action: "approve" | "reject", comment: string) =>
  request<{ status: string; status_label: string; message: string }>(`/requisitions/${reqId}/approve`, { method: "POST", body: JSON.stringify({ action, comment }) });

export const getPendingCount = () => request<{ count: number }>("/requisitions/pending-count");

export const getAllRequisitions = () => request<Requisition[]>("/requisitions/all");

export const getRequisitionHistory = () => request<Requisition[]>("/requisitions/history");
