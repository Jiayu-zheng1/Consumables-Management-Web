"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/lib/app-shell";

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
