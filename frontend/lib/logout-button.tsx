"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { IconUser, IconLogout, IconShield } from "@/lib/icons";

export default function LogoutButton() {
  const { logout, username, isAdmin } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--hui-text2)" }}>
        <IconUser size={13} />
        <span className="truncate">{username}</span>
        {isAdmin && (
          <span className="hui-chip hui-chip-primary text-[10px]" style={{ padding: "1px 6px" }}>
            <IconShield size={9} /> 管理员
          </span>
        )}
      </div>
      <button
        className="text-[11px] flex items-center gap-1 transition-colors"
        style={{ color: "var(--hui-text3)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hui-danger)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hui-text3)"; }}
        onClick={handleLogout}
        type="button"
      >
        <IconLogout size={11} />退出登录
      </button>
    </div>
  );
}
