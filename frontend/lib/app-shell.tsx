"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconDashboard, IconPackage, IconInbox, IconOutbox, IconUser, IconLogout } from "@/lib/icons";
import { useAuth } from "@/lib/auth";
import { getPendingCount } from "@/lib/api";

const baseNav = [
  { href: "/", label: "仪表盘", Icon: IconDashboard },
  { href: "/items", label: "耗材管理", Icon: IconPackage },
  { href: "/requisitions", label: "请购管理", Icon: IconOutbox },
  { href: "/records", label: "请购记录", Icon: IconInbox },
  { href: "/inbound", label: "入库管理", Icon: IconInbox },
  { href: "/outbound", label: "出库管理", Icon: IconOutbox },
];

const LEVEL_LABELS: Record<string, string> = {
  admin: "超级管理员",
  department: "部级",
  section: "课级",
  staff: "普通",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, canApprove, username, display_name, level, department_code, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!canApprove) return;
    getPendingCount().then((r) => setPendingCount(r.count)).catch(() => {});
    const t = setInterval(() => getPendingCount().then((r) => setPendingCount(r.count)).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [canApprove]);

  useEffect(() => {
    (window as any).__refreshCount = () => {
      if (canApprove) getPendingCount().then((r) => setPendingCount(r.count)).catch(() => {});
    };
    return () => { delete (window as any).__refreshCount; };
  }, [canApprove]);

  const navItems = isAdmin
    ? [...baseNav, { href: "/users", label: "人员管理", Icon: IconDashboard }]
    : baseNav;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--hui-bg)" }}>
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 hui-sidebar select-none">
        <header className="px-5 pt-6 pb-4">
          <Link href="/" className="no-underline" style={{ color: "inherit" }}>
            <h1 className="text-[13px] font-semibold" style={{ color: "var(--hui-text)" }}>耗材管理系统</h1>
          </Link>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--hui-text3)" }}>入库 · 出库 · 库存</p>
        </header>
        <nav aria-label="主导航" className="flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-0.5" style={{ listStyle: "none", padding: 0 }}>
            {navItems.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-colors duration-150"
                    style={{
                      color: active ? "var(--hui-primary)" : "var(--hui-text2)",
                      background: active ? "var(--hui-primary-light)" : "transparent",
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={17} />
                    {label}
                    {href === "/requisitions" && pendingCount > 0 && (
                      <span
                        className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] text-[10px] font-bold text-white rounded-full"
                        style={{ background: "var(--hui-danger)" }}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <footer className="px-4 py-3 border-t" style={{ borderColor: "var(--hui-border)" }}>
          <p className="text-[10px]" style={{ color: "var(--hui-text3)" }}>v1.0</p>
        </footer>
      </aside>

      {/* 移动端底部导航 */}
      <nav
        aria-label="移动端导航"
        className="md:hidden fixed bottom-0 start-0 end-0 z-40 hui-sidebar border-t flex justify-around safe-area-inset-bottom"
        style={{ borderColor: "var(--hui-border)" }}
      >
        {baseNav.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[50px] min-w-[56px] transition-colors duration-150"
              style={{ color: active ? "var(--hui-primary)" : "var(--hui-text2)" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 主内容区 */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden" tabIndex={-1}>
        {/* 顶部用户信息栏 */}
        <header
          className="flex items-center justify-end shrink-0 px-4 md:px-6 py-2 border-b"
          style={{ borderColor: "var(--hui-border)", background: "var(--hui-surface)" }}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Link href="/profile" className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity">
                <IconUser size={14} />
                <span className="text-xs font-medium truncate max-w-[80px] md:max-w-none" style={{ color: "var(--hui-text)" }}>
                  {display_name || username}
                </span>
              </Link>
              {level && (
                <span
                  className="hui-chip text-[10px] hidden md:inline-flex"
                  style={{
                    background: level === "admin" ? "var(--hui-danger-light)" : "var(--hui-primary-light)",
                    color: level === "admin" ? "var(--hui-danger)" : "var(--hui-primary)",
                  }}
                >
                  {LEVEL_LABELS[level] || level}
                </span>
              )}
              {department_code && (
                <span className="text-[10px] hidden md:inline" style={{ color: "var(--hui-text3)" }}>
                  {department_code}
                </span>
              )}
            </div>
            <div className="hidden md:block" style={{ width: 1, height: 16, background: "var(--hui-border)" }} />
            <button
              onClick={handleLogout}
              className="text-[11px] flex items-center gap-1 transition-colors shrink-0"
              style={{ color: "var(--hui-text3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hui-danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hui-text3)"; }}
              type="button"
            >
              <IconLogout size={11} />
              <span className="hidden md:inline">退出登录</span>
            </button>
          </div>
        </header>
        {/* 页面内容 */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
