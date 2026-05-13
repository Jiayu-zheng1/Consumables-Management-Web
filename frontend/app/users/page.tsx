"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsers, updateUserLevel, deleteUser, type UserInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScope, setEditingScope] = useState<number | null>(null);
  const [scopeInput, setScopeInput] = useState("");

  const load = useCallback(async () => { try { setLoading(true); setUsers(await getUsers()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSetLevel(userId: number, newLevel: string, dept: string, scope: string) {
    try { await updateUserLevel(userId, newLevel, dept, scope); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "操作失败"); }
  }

  async function saveScope(userId: number, level: string, dept: string) {
    try { await updateUserLevel(userId, level, dept, scopeInput); setEditingScope(null); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "保存失败"); }
  }

  async function handleDelete(u: UserInfo) {
    if (!confirm(`确定要删除用户「${u.username}」吗？此操作不可撤销。`)) return;
    try { await deleteUser(u.id); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "删除失败"); }
  }

  function startEditScope(u: UserInfo) {
    setEditingScope(u.id);
    setScopeInput(u.department_scope || "");
  }

  if (!isAdmin) return <div className="p-8 text-center" style={{ color: "var(--hui-text2)" }}>无权限访问</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>人员管理</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>管理系统用户和权限级别，部级人员可设置审批部门范围</p>
      </header>
      {loading ? <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>工号</th><th>姓名</th><th>用户名</th><th>级别</th><th>部门代码</th><th>审批范围</th><th>注册时间</th><th>操作</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td className="text-xs" style={{ color: "var(--hui-text2)" }}>{u.employee_id || "-"}</td>
              <td className="font-medium text-sm">{u.display_name || "-"}</td>
              <td className="text-sm">
                {u.username}
                {u.level === "admin" && <span className="hui-chip hui-chip-danger text-[10px] ml-2">超管</span>}
              </td>
              <td>
                <select className="hui-input hui-select" style={{ height: 28, fontSize: 12 }} value={u.level}
                  onChange={(e) => handleSetLevel(u.id, e.target.value, u.department_code, u.department_scope)}
                  disabled={u.level === "admin"}>
                  <option value="staff">普通</option>
                  <option value="section">课级</option>
                  <option value="department">部级</option>
                </select>
              </td>
              <td className="text-xs" style={{ color: "var(--hui-text2)" }}>{u.department_code}</td>
              <td>
                {u.level === "department" ? (
                  editingScope === u.id ? (
                    <div className="flex gap-1 items-center">
                      <input className="hui-input" style={{ height: 26, fontSize: 11, width: 160 }} value={scopeInput}
                        onChange={(e) => setScopeInput(e.target.value.toUpperCase())}
                        placeholder="如 6512,6425"
                        onKeyDown={(e) => { if (e.key === "Enter") saveScope(u.id, u.level, u.department_code); if (e.key === "Escape") setEditingScope(null); }}
                        autoFocus />
                      <button className="hui-btn hui-btn-solid hui-btn-sm" style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                        onClick={() => saveScope(u.id, u.level, u.department_code)}>保存</button>
                      <button className="hui-btn hui-btn-ghost hui-btn-sm" style={{ height: 26, fontSize: 11 }}
                        onClick={() => setEditingScope(null)}>取消</button>
                    </div>
                  ) : (
                    <button className="text-xs hover:underline" style={{ color: u.department_scope ? "var(--hui-primary)" : "var(--hui-text3)" }}
                      onClick={() => startEditScope(u)}>
                      {u.department_scope ? u.department_scope.split(",").map((s) => s.trim()).join(", ") : "仅本部门"}
                    </button>
                  )
                ) : (
                  <span className="text-xs" style={{ color: "var(--hui-text3)" }}>-</span>
                )}
              </td>
              <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(u.created_at).toLocaleString("zh-CN")}</td>
              <td>
                {u.level !== "admin" && (
                  <button
                    className="hui-btn hui-btn-danger hui-btn-sm"
                    style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                    onClick={() => handleDelete(u)}
                  >删除</button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
