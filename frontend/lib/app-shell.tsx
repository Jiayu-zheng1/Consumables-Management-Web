"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconDashboard, IconPackage, IconInbox, IconOutbox, IconUser, IconLogout } from "@/lib/icons";
import { useAuth } from "@/lib/auth";
import { getPendingCount, getMyUpdatesCount } from "@/lib/api";

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
    async function refresh() {
      let total = 0;
      if (canApprove && !isAdmin) {
        total += await getPendingCount().then((r) => r.count).catch(() => 0);
      }
      total += await getMyUpdatesCount().then((r) => r.count).catch(() => 0);
      setPendingCount(total);
    }
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [canApprove, isAdmin]);

  useEffect(() => {
    (window as any).__refreshCount = async () => {
      let total = 0;
      if (canApprove && !isAdmin) {
        total += await getPendingCount().then((r) => r.count).catch(() => 0);
      }
      total += await getMyUpdatesCount().then((r) => r.count).catch(() => 0);
      setPendingCount(total);
    };
    return () => { delete (window as any).__refreshCount; };
  }, [canApprove, isAdmin]);

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
      <aside
        className="hidden md:flex flex-col w-[224px] shrink-0 hui-sidebar select-none"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* 品牌区 */}
        <header className="px-5 pt-6 pb-4">
          <Link href="/" className="no-underline block" style={{ color: "inherit" }}>
            <div className="flex items-center gap-2 mb-1">
              <span
                style={{
                  display: "inline-flex",
                  width: 22,
                  height: 22,
                  borderRadius: "var(--hui-radius-sm)",
                  background: "var(--hui-primary)",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                耗
              </span>
              <h1 className="text-[13px] font-bold" style={{ color: "var(--hui-text)" }}>
                耗材管理系统
              </h1>
            </div>
          </Link>
          <p className="text-[10px] tracking-wider uppercase" style={{ color: "var(--hui-text3)", paddingLeft: 30 }}>
            Inventory Control
          </p>
        </header>

        {/* 导航 */}
        <nav aria-label="主导航" className="flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-0.5" style={{ listStyle: "none", padding: 0 }}>
            {navItems.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-[6px] text-[13px] font-medium transition-all duration-150 relative"
                    style={{
                      color: active ? "var(--hui-primary-text)" : "var(--hui-text2)",
                      background: active ? "var(--hui-primary-light)" : "transparent",
                      borderLeft: active ? "2.5px solid var(--hui-primary)" : "2.5px solid transparent",
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
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

        {/* 底部信息 */}
        <footer
          className="px-4 py-3 border-t mx-3"
          style={{ borderColor: "var(--hui-border)" }}
        >
          <div className="flex items-center gap-2">
            <IconUser size={13} style={{ color: "var(--hui-text3)" }} />
            <span className="text-[11px] truncate font-medium" style={{ color: "var(--hui-text2)" }}>
              {display_name || username || "用户"}
            </span>
          </div>
          {level && (
            <span
              className="inline-block text-[10px] mt-1.5 px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: level === "admin" ? "var(--hui-danger-light)" : "var(--hui-primary-light)",
                color: level === "admin" ? "var(--hui-danger)" : "var(--hui-primary-text)",
              }}
            >
              {LEVEL_LABELS[level] || level}
            </span>
          )}
        </footer>
      </aside>

      {/* 移动端底部导航 */}
      <nav
        aria-label="移动端导航"
        className="md:hidden fixed bottom-0 start-0 end-0 z-40 hui-sidebar border-t flex justify-around"
        style={{ borderColor: "var(--hui-border)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {baseNav.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-[2px] py-2 px-1 min-h-[50px] min-w-[56px] transition-colors duration-150 relative"
              style={{ color: active ? "var(--hui-primary-text)" : "var(--hui-text2)" }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute", top: 0, left: "20%", right: "20%", height: 2.5,
                    background: "var(--hui-primary)", borderRadius: "0 0 2px 2px",
                  }}
                />
              )}
              <Icon size={20} />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 主内容区 */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden" tabIndex={-1}>
        {/* 顶部操作栏 */}
        <header
          className="flex items-center justify-between shrink-0 px-4 md:px-6 py-2 border-b"
          style={{ borderColor: "var(--hui-border)", background: "var(--hui-surface)", position: "relative", zIndex: 1 }}
        >
          {/* 左侧：面包屑/页面标题 */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--hui-text3)" }}>
              {(() => {
                const item = navItems.find((n) => pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)));
                return item ? item.label : "";
              })()}
            </span>
          </div>

          {/* 右侧：用户信息 + 退出 */}
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
            >
              <IconUser size={14} />
              <span
                className="text-xs font-medium truncate max-w-[80px] md:max-w-none"
                style={{ color: "var(--hui-text)" }}
              >
                {display_name || username || "用户"}
              </span>
            </Link>
            {department_code && (
              <code
                className="text-[10px] hidden md:inline px-1.5 py-0.5 rounded font-mono"
                style={{ background: "var(--hui-surface2)", color: "var(--hui-text2)" }}
              >
                {department_code}
              </code>
            )}
            <div className="hidden md:block mx-0.5" style={{ width: 1, height: 18, background: "var(--hui-border)" }} />
            <button
              onClick={handleLogout}
              className="text-[11px] flex items-center gap-1 transition-colors shrink-0 font-medium"
              style={{ color: "var(--hui-text3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hui-danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hui-text3)"; }}
              type="button"
            >
              <IconLogout size={11} />
              <span className="hidden md:inline">退出</span>
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ position: "relative", zIndex: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
