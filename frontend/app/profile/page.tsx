"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfile, updateProfile, type ProfileInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceChange = searchParams.get("must_change") === "1";
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try { setLoading(true); const p = await getProfile(); setProfile(p); setDisplayName(p.display_name || ""); setDeptCode(p.department_code || ""); } catch {} finally { setLoading(false); }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");
    if (newPwd && newPwd.length < 6) { setError("密码至少6位"); return; }
    if (newPwd && newPwd !== confirmPwd) { setError("两次密码不一致"); return; }
    try { setSubmitting(true);
      const data: Record<string, string> = {};
      if (displayName !== (profile?.display_name || "")) data.display_name = displayName;
      if (deptCode.toUpperCase() !== (profile?.department_code || "")) data.department_code = deptCode.toUpperCase();
      if (newPwd) data.password = newPwd;
      if (Object.keys(data).length === 0) { setMsg("无需更新"); return; }
      const res = await updateProfile(data);
      if (res.require_relogin) {
        logout();
        router.replace("/login");
        return;
      }
      setProfile((p) => p ? { ...p, display_name: res.display_name, department_code: res.department_code } : p);
      setNewPwd(""); setConfirmPwd("");
      setMsg("保存成功");
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setSubmitting(false); }
  }

  const LEVEL_LABELS: Record<string, string> = { admin: "超级管理员", department: "部级", section: "课级", staff: "普通" };

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--hui-text2)" }}>加载中...</div>;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>个人信息</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>查看和修改个人资料</p>
      </header>

      {forceChange && (
        <div role="alert" className="p-4 mb-5 rounded-lg border text-sm" style={{ background: "var(--hui-warning-light)", color: "var(--hui-warning)", borderColor: "var(--hui-warning)" }}>
          管理员已重置了您的密码，请立即修改密码后再使用系统。
        </div>
      )}

      <div className="hui-card mb-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--hui-text2)" }}>基本信息</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="工号" value={profile?.employee_id || "-"} />
          <InfoRow label="用户名" value={profile?.username || "-"} />
          <InfoRow label="级别" value={LEVEL_LABELS[profile?.level || "staff"] || profile?.level || "-"} />
          <InfoRow label="角色" value={profile?.role === "admin" ? "管理员" : "用户"} />
          <InfoRow label="部门范围" value={profile?.department_scope ? profile.department_scope.split(",").join(", ") : "仅本部门"} />
          <InfoRow label="注册时间" value={profile?.created_at ? new Date(profile.created_at).toLocaleString("zh-CN") : "-"} />
        </div>
      </div>

      <div className="hui-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--hui-text2)" }}>编辑资料</h3>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {error && <div role="alert" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{error}</div>}
          {msg && <div role="status" className="p-2.5 rounded-lg text-xs" style={{ background: "var(--hui-success-light)", color: "var(--hui-success)" }}>{msg}</div>}

          <div className="hui-input-wrap"><label>姓名</label><input className="hui-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div className="hui-input-wrap"><label>部门代码</label><input className="hui-input" value={deptCode} onChange={(e) => setDeptCode(e.target.value.toUpperCase())} placeholder="如 D001" /></div>
          <div className="hui-input-wrap"><label>新密码</label><input className="hui-input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="留空不修改" autoComplete="new-password" /></div>
          <div className="hui-input-wrap"><label>确认新密码</label><input className="hui-input" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="留空不修改" autoComplete="new-password" /></div>

          <div className="flex justify-end mt-2">
            <button className="hui-btn hui-btn-solid hui-btn-sm" type="submit" disabled={submitting}>{submitting ? "保存中..." : "保存修改"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "var(--hui-text3)", fontSize: 12 }}>{label}</span>
      <p style={{ color: "var(--hui-text)", fontWeight: 500 }}>{value}</p>
    </div>
  );
}
