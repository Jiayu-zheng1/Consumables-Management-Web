// HTTP 客户端封装 — token 注入、错误处理

const API_BASE = "/api";

let _tokenGetter: (() => string | null) | null = null;

/** 允许外部注入 token 获取器，默认用 localStorage */
export function setTokenGetter(fn: () => string | null) {
  _tokenGetter = fn;
}

function getToken(): string | null {
  if (_tokenGetter) return _tokenGetter();
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
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
