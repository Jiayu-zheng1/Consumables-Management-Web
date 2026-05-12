"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  username: string | null;
  level: string | null;
  department_code: string | null;
  isAdmin: boolean;
  canApprove: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, department_code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null, username: null, level: null, department_code: null,
  isAdmin: false, canApprove: false,
  login: async () => {}, register: async () => {}, logout: () => {}, loading: true,
});

const API = "http://localhost:8000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [departmentCode, setDepartmentCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = (k: string) => localStorage.getItem(k);
    const t = saved("auth_token"), u = saved("auth_username"), l = saved("auth_level"), d = saved("auth_department_code");
    if (t && u) { setToken(t); setUsername(u); setLevel(l || "staff"); setDepartmentCode(d || ""); }
    setLoading(false);
  }, []);

  const login = useCallback(async (uname: string, pwd: string) => {
    const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: uname, password: pwd }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: "登录失败" })); throw new Error(err.detail || "登录失败"); }
    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_username", data.username);
    localStorage.setItem("auth_level", data.level);
    localStorage.setItem("auth_department_code", data.department_code || "");
    localStorage.setItem("auth_role", data.role);
    setToken(data.token); setUsername(data.username); setLevel(data.level); setDepartmentCode(data.department_code || "");
  }, []);

  const register = useCallback(async (uname: string, pwd: string, dept: string) => {
    const res = await fetch(`${API}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: uname, password: pwd, department_code: dept }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: "注册失败" })); throw new Error(err.detail || "注册失败"); }
  }, []);

  const logout = useCallback(() => {
    ["auth_token", "auth_username", "auth_level", "auth_department_code", "auth_role"].forEach((k) => localStorage.removeItem(k));
    setToken(null); setUsername(null); setLevel(null); setDepartmentCode(null);
  }, []);

  const isAdmin = level === "admin";
  const canApprove = level === "admin" || level === "department" || level === "section";

  return (
    <AuthContext.Provider value={{ token, username, level, department_code: departmentCode, isAdmin, canApprove, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
