// Auth 类型定义

export interface AuthState {
  token: string | null;
  username: string | null;
  employee_id: string | null;
  display_name: string | null;
  level: string | null;
  department_code: string | null;
  isAdmin: boolean;
  canApprove: boolean;
  mustChangePassword: boolean;
  login: (loginId: string, password: string) => Promise<boolean>;
  register: (employee_id: string, display_name: string, password: string, department_code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface TokenStorage {
  get: () => string | null;
  set: (token: string) => void;
  remove: () => void;
}

/** 从 localStorage 读写 token，供 api client 使用 */
export const localStorageToken: TokenStorage = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null),
  set: (t) => localStorage.setItem("auth_token", t),
  remove: () => localStorage.removeItem("auth_token"),
};
