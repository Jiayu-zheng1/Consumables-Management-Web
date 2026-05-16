"use client";

import { useEffect, useState } from "react";
import { getAllRequisitions, type Requisition } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending_section: "待课级审批", pending_department: "待部级审批",
  closed: "已结案", rejected: "已拒绝", fulfilled: "已入库",
};
const STATUS_COLORS: Record<string, string> = {
  pending_section: "hui-chip-warning", pending_department: "hui-chip-primary",
  closed: "hui-chip-success", rejected: "hui-chip-danger", fulfilled: "hui-chip-default",
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
        <div className="flex flex-col gap-4">
          {reqs.map((r) => {
            const riList = r.items || [];
            const fallbackItems = riList.length === 0 ? [{
              item_name: r.item_name || r.new_item_name,
              new_item_unit: r.new_item_unit,
              new_item_price: r.new_item_price,
              quantity: r.quantity,
              new_item_project: r.new_item_project,
              new_item_supplier: r.new_item_supplier,
            }] : riList;
            const totalAmt = fallbackItems.reduce((s, it) => s + (it.new_item_price || 0) * it.quantity, 0);

            return (
              <div key={r.id} className="hui-card">
                <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--hui-border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{r.req_no || `#${r.id}`}</span>
                    <span className="text-sm font-medium">{r.requester_name}</span>
                    <span className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                  <span className={`hui-chip ${STATUS_COLORS[r.status] || ""}`}>{STATUS_LABELS[r.status] || r.status}</span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--hui-border)" }}>
                      <th className="text-[11px] pb-2 text-left" style={{ color: "var(--hui-text3)", fontWeight: 500 }}>耗材名称</th>
                      <th className="text-[11px] pb-2 text-right" style={{ color: "var(--hui-text3)", fontWeight: 500 }}>数量</th>
                      <th className="text-[11px] pb-2 text-right" style={{ color: "var(--hui-text3)", fontWeight: 500 }}>单价</th>
                      <th className="text-[11px] pb-2 text-right" style={{ color: "var(--hui-text3)", fontWeight: 500 }}>金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fallbackItems.map((it: any, i: number) => {
                      const lineAmt = (it.new_item_price || 0) * it.quantity;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--hui-border)" }}>
                          <td className="py-1.5 pr-2">
                            <span className="text-sm" style={{ color: "var(--hui-text)" }}>{it.item_name || it.new_item_name}</span>
                            {it.new_item_project && <span className="text-[10px] ml-1" style={{ color: "var(--hui-text3)" }}>({it.new_item_project})</span>}
                          </td>
                          <td className="py-1.5 text-right text-sm">×{it.quantity}{it.new_item_unit}</td>
                          <td className="py-1.5 text-right text-sm">{it.new_item_price != null ? `¥${it.new_item_price.toFixed(2)}` : "-"}</td>
                          <td className="py-1.5 text-right text-sm" style={{ color: lineAmt > 0 ? "var(--hui-primary)" : "inherit" }}>{lineAmt > 0 ? `¥${lineAmt.toFixed(2)}` : "-"}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: "2px solid var(--hui-border)" }}>
                      <td colSpan={3} className="pt-2 text-right text-xs" style={{ color: "var(--hui-text2)" }}>合计</td>
                      <td className="pt-2 text-right text-sm font-bold" style={{ color: "var(--hui-primary)" }}>¥{totalAmt.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {r.reason && <div className="text-xs mt-2" style={{ color: "var(--hui-text2)" }}>理由: {r.reason}</div>}
                {r.section_comment && <div className="text-xs mt-1" style={{ color: "var(--hui-primary)" }}>课级意见: {r.section_comment}</div>}
                {r.department_comment && <div className="text-xs mt-0.5" style={{ color: "var(--hui-success)" }}>部级意见: {r.department_comment}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
