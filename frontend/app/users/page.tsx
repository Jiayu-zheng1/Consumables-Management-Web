"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsers, updateUserLevel, type UserInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => { try { setLoading(true); setUsers(await getUsers()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSetLevel(userId: number, newLevel: string, dept: string) {
    try { await updateUserLevel(userId, newLevel, dept); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "操作失败"); }
  }

  if (!isAdmin) return <div className="p-8 text-center" style={{ color: "var(--hui-text2)" }}>无权限访问</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>人员管理</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>管理系统用户和权限级别</p>
      </header>
      {loading ? <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>用户名</th><th>级别</th><th>部门代码</th><th>注册时间</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td className="font-medium text-sm">
                {u.username}
                {u.level === "admin" && <span className="hui-chip hui-chip-danger text-[10px] ml-2">超管</span>}
              </td>
              <td>
                <select className="hui-input hui-select" style={{ height: 28, fontSize: 12 }} value={u.level}
                  onChange={(e) => handleSetLevel(u.id, e.target.value, u.department_code)}
                  disabled={u.level === "admin"}>
                  <option value="staff">普通</option>
                  <option value="section">课级</option>
                  <option value="department">部级</option>
                </select>
              </td>
              <td className="text-xs" style={{ color: "var(--hui-text2)" }}>{u.department_code}</td>
              <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(u.created_at).toLocaleString("zh-CN")}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
