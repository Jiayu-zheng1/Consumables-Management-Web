"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");
    if (!username.trim() || !password.trim()) { setError("请输入用户名和密码"); return; }
    if (mode === "register") {
      if (password.length < 6) { setError("密码至少6位"); return; }
      if (password !== confirmPwd) { setError("两次密码不一致"); return; }
      if (!deptCode.trim()) { setError("请输入部门代码"); return; }
    }
    try { setSubmitting(true);
      if (mode === "register") {
        await register(username, password, deptCode);
        setMsg("注册成功，请登录");
        setUsername(""); setPassword(""); setConfirmPwd("");
        setMode("login");
      } else {
        await login(username, password);
        router.push("/");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--hui-bg)" }}>
      <div className="hui-card w-full max-w-[380px] p-8">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>耗材管理系统</h1>
          <p className="text-sm mt-2" style={{ color: "var(--hui-text2)" }}>{mode === "login" ? "请登录以继续" : "创建新账号"}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div role="alert" className="p-3 rounded-lg text-sm" style={{ background: "var(--hui-danger-light)", color: "var(--hui-danger)" }}>{error}</div>}
          {msg && <div role="status" className="p-3 rounded-lg text-sm" style={{ background: "var(--hui-success-light)", color: "var(--hui-success)" }}>{msg}</div>}

          <div className="hui-input-wrap"><label htmlFor="l-u">用户名</label><input id="l-u" className="hui-input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder={mode === "register" ? "至少3位字符" : "请输入用户名"} /></div>
          <div className="hui-input-wrap"><label htmlFor="l-p">密码</label><input id="l-p" className="hui-input" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "至少6位字符" : "请输入密码"} /></div>
          {mode === "register" && <><div className="hui-input-wrap"><label htmlFor="l-c">确认密码</label><input id="l-c" className="hui-input" type="password" autoComplete="new-password" required value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="再次输入密码" /></div><div className="hui-input-wrap"><label htmlFor="l-d">部门代码</label><input id="l-d" className="hui-input" required value={deptCode} onChange={(e) => setDeptCode(e.target.value.toUpperCase())} placeholder="如 D001" /></div></>}

          <button className="hui-btn hui-btn-solid w-full mt-2" type="submit" disabled={submitting}>{submitting ? "处理中..." : mode === "login" ? "登 录" : "注 册"}</button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: "var(--hui-text3)" }}>
          {mode === "login" ? (
            <>没有账号？<button className="font-medium hover:underline" style={{ color: "var(--hui-primary)" }} onClick={() => { setMode("register"); setError(""); setMsg(""); }} type="button">立即注册</button></>
          ) : (
            <>已有账号？<button className="font-medium hover:underline" style={{ color: "var(--hui-primary)" }} onClick={() => { setMode("login"); setError(""); setMsg(""); }} type="button">返回登录</button></>
          )}
        </p>
        {mode === "login" && <p className="text-center text-[11px] mt-2" style={{ color: "var(--hui-text3)" }}>管理员: admin / admin123</p>}
      </div>
    </main>
  );
}
