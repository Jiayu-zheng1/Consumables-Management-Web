"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  username: string | null;
  employee_id: string | null;
  display_name: string | null;
  level: string | null;
  department_code: string | null;
  isAdmin: boolean;
  canApprove: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  register: (employee_id: string, display_name: string, password: string, department_code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null, username: null, employee_id: null, display_name: null, level: null, department_code: null,
  isAdmin: false, canApprove: false,
  login: async () => {}, register: async () => {}, logout: () => {}, loading: true,
});

const API = "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [departmentCode, setDepartmentCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = (k: string) => localStorage.getItem(k);
    const t = saved("auth_token"), u = saved("auth_username"), ei = saved("auth_employee_id"), dn = saved("auth_display_name"), l = saved("auth_level"), d = saved("auth_department_code");
    if (t && u) { setToken(t); setUsername(u); setEmployeeId(ei || ""); setDisplayName(dn || ""); setLevel(l || "staff"); setDepartmentCode(d || ""); }
    setLoading(false);
  }, []);

  const login = useCallback(async (loginId: string, pwd: string) => {
    const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginId, password: pwd }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: "登录失败" })); throw new Error(err.detail || "登录失败"); }
    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_username", data.username);
    localStorage.setItem("auth_employee_id", data.employee_id || "");
    localStorage.setItem("auth_display_name", data.display_name || "");
    localStorage.setItem("auth_level", data.level);
    localStorage.setItem("auth_department_code", data.department_code || "");
    localStorage.setItem("auth_role", data.role);
    setToken(data.token); setUsername(data.username); setEmployeeId(data.employee_id || ""); setDisplayName(data.display_name || ""); setLevel(data.level); setDepartmentCode(data.department_code || "");
  }, []);

  const register = useCallback(async (empId: string, dispName: string, pwd: string, dept: string) => {
    const res = await fetch(`${API}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_id: empId, display_name: dispName, password: pwd, department_code: dept }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: "注册失败" })); throw new Error(err.detail || "注册失败"); }
  }, []);

  const logout = useCallback(() => {
    ["auth_token", "auth_username", "auth_employee_id", "auth_display_name", "auth_level", "auth_department_code", "auth_role"].forEach((k) => localStorage.removeItem(k));
    setToken(null); setUsername(null); setEmployeeId(null); setDisplayName(null); setLevel(null); setDepartmentCode(null);
  }, []);

  const isAdmin = level === "admin";
  const canApprove = level === "admin" || level === "department" || level === "section";

  return (
    <AuthContext.Provider value={{ token, username, employee_id: employeeId, display_name: displayName, level, department_code: departmentCode, isAdmin, canApprove, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
