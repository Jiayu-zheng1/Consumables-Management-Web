import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import AuthGuard from "@/lib/auth/guard";
import ConditionalShell from "@/lib/conditional-shell";
import "./globals.css";
export const metadata: Metadata = { title: "耗材管理系统", description: "企业耗材入库、出库、库存管理平台" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (<html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning><head><meta name="color-scheme" content="light dark" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></head><body className="h-full"><AuthProvider><a href="#main-content" className="skip-link">跳到主要内容</a><AuthGuard><ConditionalShell>{children}</ConditionalShell></AuthGuard></AuthProvider></body></html>);
}
