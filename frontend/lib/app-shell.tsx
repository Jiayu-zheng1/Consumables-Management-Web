"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconPackage, IconInbox, IconOutbox } from "@/lib/icons";
import { useAuth } from "@/lib/auth";
import { getPendingCount } from "@/lib/api";
import LogoutButton from "@/lib/logout-button";
const baseNav = [
  { href: "/", label: "仪表盘", Icon: IconDashboard },
  { href: "/items", label: "耗材管理", Icon: IconPackage },
  { href: "/inbound", label: "入库管理", Icon: IconInbox },
  { href: "/outbound", label: "出库管理", Icon: IconOutbox },
  { href: "/records", label: "请购记录", Icon: IconInbox },
  { href: "/requisitions", label: "请购管理", Icon: IconOutbox },
];
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const { isAdmin, canApprove } = useAuth(); const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => { if (!canApprove) return; getPendingCount().then((r) => setPendingCount(r.count)).catch(() => {}); const t = setInterval(() => getPendingCount().then((r) => setPendingCount(r.count)).catch(() => {}), 30000); return () => clearInterval(t); }, [canApprove]);
  // 暴露刷新
  useEffect(() => { (window as any).__refreshCount = () => { if(canApprove) getPendingCount().then((r)=>setPendingCount(r.count)).catch(()=>{}); }; return () => { delete (window as any).__refreshCount; }; }, [canApprove]);
  const navItems = isAdmin ? [...baseNav, { href: "/users", label: "人员管理", Icon: IconDashboard }] : baseNav;
  return (<div className="flex h-full overflow-hidden" style={{background:"var(--hui-bg)"}}>
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 hui-sidebar select-none">
      <header className="px-5 pt-6 pb-4"><Link href="/" className="no-underline" style={{color:"inherit"}}><h1 className="text-[13px] font-semibold" style={{color:"var(--hui-text)"}}>耗材管理系统</h1></Link><p className="text-[11px] mt-0.5" style={{color:"var(--hui-text3)"}}>入库 · 出库 · 库存</p></header>
      <nav aria-label="主导航" className="flex-1 overflow-y-auto px-3"><ul className="flex flex-col gap-0.5" style={{listStyle:"none",padding:0}}>{navItems.map(({href,label,Icon})=>{const active=pathname===href||(href!=="/"&&pathname.startsWith(href));return(<li key={href}><Link href={href} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-colors duration-150" style={{color:active?"var(--hui-primary)":"var(--hui-text2)",background:active?"var(--hui-primary-light)":"transparent"}} aria-current={active?"page":undefined}><Icon size={17}/>{label}{href==="/requisitions"&&pendingCount>0&&(<span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] text-[10px] font-bold text-white rounded-full" style={{background:"var(--hui-danger)"}}>{pendingCount}</span>)}</Link></li>)})}</ul></nav>
      <footer className="px-4 py-3 border-t" style={{borderColor:"var(--hui-border)"}}><LogoutButton/></footer>
    </aside>
    <nav aria-label="移动端导航" className="md:hidden fixed bottom-0 start-0 end-0 z-40 hui-sidebar border-t flex justify-around safe-area-inset-bottom" style={{borderColor:"var(--hui-border)"}}>{navItems.slice(0,5).map(({href,label,Icon})=>{const active=pathname===href||(href!=="/"&&pathname.startsWith(href));return(<Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[50px] min-w-[56px] transition-colors duration-150" style={{color:active?"var(--hui-primary)":"var(--hui-text2)"}}><Icon size={20}/><span className="text-[10px] font-medium leading-none">{label}</span></Link>)})}</nav>
    <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0" tabIndex={-1}>{children}</main>
  </div>);
}
