"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDashboard, getAlerts, getInboundRecords, getOutboundRecords, type DashboardStats, type StockAlert, type InboundRecord, type OutboundRecord } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recentIn, setRecentIn] = useState<InboundRecord[]>([]);
  const [recentOut, setRecentOut] = useState<OutboundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setLoading(true);
      const [s, a, ri, ro] = await Promise.all([getDashboard(), getAlerts(), getInboundRecords({ page: 1 }), getOutboundRecords({ page: 1 })]);
      setStats(s); setAlerts(a); setRecentIn(ri.slice(0, 5)); setRecentOut(ro.slice(0, 5));
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20" style={{ color: "var(--hui-text2)" }}>加载中...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--hui-text)" }}>仪表盘</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--hui-text2)" }}>库存概览与最近动态</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats && <>
          <StatCard label="耗材总数" v={stats.total_items} href="/items" />
          <StatCard label="类别数量" v={stats.total_categories} href="/categories" />
          <StatCard label="库存预警" v={stats.low_stock_count} warn={stats.low_stock_count > 0} />
          <StatCard label="今日入库" v={stats.today_inbound} />
          <StatCard label="今日出库" v={stats.today_outbound} />
        </>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="hui-card"><h3 className="text-base font-semibold mb-3" style={{ color: "var(--hui-text)" }}>库存预警</h3>
          {alerts.length === 0 ? <p className="text-sm text-center py-4" style={{ color: "var(--hui-text3)" }}>暂无预警</p> :
            <div className="hui-table-wrap" style={{ border: "none" }}><table className="hui-table"><thead><tr><th>名称</th><th>库存</th><th>最低</th></tr></thead><tbody>
              {alerts.map((a) => (<tr key={a.item_id}><td>{a.item_name}</td><td><span className="hui-chip hui-chip-danger">{a.current_stock} {a.unit}</span></td><td style={{ color: "var(--hui-text2)" }}>{a.min_stock} {a.unit}</td></tr>))}
            </tbody></table></div>}
        </div>

        <div className="hui-card"><div className="flex justify-between items-center mb-3"><h3 className="text-base font-semibold" style={{ color: "var(--hui-text)" }}>最近入库</h3><Link href="/inbound" className="text-xs font-medium" style={{ color: "var(--hui-primary)" }}>查看全部 →</Link></div>
          {recentIn.length === 0 ? <p className="text-sm text-center py-4" style={{ color: "var(--hui-text3)" }}>暂无记录</p> :
            <div className="hui-table-wrap" style={{ border: "none" }}><table className="hui-table"><thead><tr><th>数量</th><th>操作人</th><th>时间</th></tr></thead><tbody>
              {recentIn.map((r) => (<tr key={r.id}><td><span className="hui-chip hui-chip-success">+{r.quantity}</span></td><td>{r.operator}</td><td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td></tr>))}
            </tbody></table></div>}
        </div>
      </div>

      <div className="hui-card"><div className="flex justify-between items-center mb-3"><h3 className="text-base font-semibold" style={{ color: "var(--hui-text)" }}>最近出库</h3><Link href="/outbound" className="text-xs font-medium" style={{ color: "var(--hui-primary)" }}>查看全部 →</Link></div>
        {recentOut.length === 0 ? <p className="text-sm text-center py-4" style={{ color: "var(--hui-text3)" }}>暂无记录</p> :
          <div className="hui-table-wrap" style={{ border: "none" }}><table className="hui-table"><thead><tr><th>数量</th><th>部门</th><th>操作人</th><th>用途</th><th>时间</th></tr></thead><tbody>
            {recentOut.map((r) => (<tr key={r.id}><td><span className="hui-chip hui-chip-primary">-{r.quantity}</span></td><td>{r.department || "-"}</td><td>{r.operator}</td><td>{r.purpose || "-"}</td><td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td></tr>))}
          </tbody></table></div>}
      </div>
    </div>
  );
}

function StatCard({ label, v, href, warn }: { label: string; v: number; href?: string; warn?: boolean }) {
  const c = <div className="hui-stat" style={href ? { cursor: "pointer" } : {}}><div className="hui-stat-label">{label}</div><div className="hui-stat-value" style={warn ? { color: "var(--hui-warning)" } : {}}>{v}</div></div>;
  return href ? <Link href={href}>{c}</Link> : c;
}
