"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllRequisitions, type Requisition } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending_section: "待课级审批", pending_department: "待部级审批",
  approved: "已通过", rejected: "已拒绝",
};
const STATUS_COLORS: Record<string, string> = {
  pending_section: "hui-chip-warning", pending_department: "hui-chip-primary",
  approved: "hui-chip-success", rejected: "hui-chip-danger",
};

export default function RecordsPage() {
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getAllRequisitions().then(setReqs).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>请购记录</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>所有用户的耗材请购及审批状态</p>
      </header>
      {loading ? <p className="text-center py-12" style={{ color: "var(--hui-text2)" }}>加载中...</p>
      : reqs.length === 0 ? <p className="text-center py-16" style={{ color: "var(--hui-text3)" }}>暂无请购记录</p>
      : (
        <div className="hui-table-wrap"><table className="hui-table">
          <thead><tr><th>编号</th><th>申请人</th><th>耗材名称</th><th>数量</th><th>单价</th><th>金额</th><th>专案</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.id}>
                <td className="text-xs" style={{ color: "var(--hui-text3)" }}>#{r.id}</td>
                <td className="font-medium text-sm">{r.requester_name}</td>
                <td className="text-sm">{r.item_name || r.new_item_name || "-"}</td>
                <td className="text-sm">×{r.quantity}{r.new_item_unit}</td>
                <td className="text-sm">{r.new_item_price != null ? `¥${r.new_item_price.toFixed(2)}` : "-"}</td>
                <td className="text-sm">{r.new_item_price != null ? `¥${(r.new_item_price * r.quantity).toFixed(2)}` : "-"}</td>
                <td className="text-xs">{r.new_item_project || "-"}</td>
                <td><span className={`hui-chip ${STATUS_COLORS[r.status] || ""}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                <td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
