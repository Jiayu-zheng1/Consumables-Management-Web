"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDashboard, getAlerts, getInboundRecords, getOutboundRecords, getSpendingData, type DashboardStats, type StockAlert, type InboundRecord, type OutboundRecord, type SpendingData } from "@/lib/api";
import { BarChart, DonutChart } from "@/lib/charts";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recentIn, setRecentIn] = useState<InboundRecord[]>([]);
  const [recentOut, setRecentOut] = useState<OutboundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 图表数据
  const [spending, setSpending] = useState<SpendingData | null>(null);
  const [spYear, setSpYear] = useState("");
  const [spMonth, setSpMonth] = useState("");
  const [spDept, setSpDept] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true);
      const [s, a, ri, ro] = await Promise.all([getDashboard(), getAlerts(), getInboundRecords({ page: 1 }), getOutboundRecords({ page: 1 })]);
      setStats(s); setAlerts(a); setRecentIn(ri.slice(0, 5)); setRecentOut(ro.slice(0, 5));
    } catch {} finally { setLoading(false); }
  }, []);

  const loadSpending = useCallback(async () => {
    try {
      const data = await getSpendingData({
        year: spYear ? Number(spYear) : undefined,
        month: spMonth ? Number(spMonth) : undefined,
        department: spDept || undefined,
      });
      setSpending(data);
    } catch {}
  }, [spYear, spMonth, spDept]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSpending(); }, [loadSpending]);

  // 聚合数据
  const byMonth: { label: string; value: number }[] = [];
  const byDept: { label: string; value: number }[] = [];
  if (spending) {
    const monthMap: Record<string, number> = {};
    const deptMap: Record<string, number> = {};
    for (const d of spending.data) {
      monthMap[d.month_label] = (monthMap[d.month_label] || 0) + d.amount;
      deptMap[d.department || "未指定"] = (deptMap[d.department || "未指定"] || 0) + d.amount;
    }
    for (const [k, v] of Object.entries(monthMap)) byMonth.push({ label: k, value: v });
    for (const [k, v] of Object.entries(deptMap)) byDept.push({ label: k, value: v });
    byMonth.sort((a, b) => a.label.localeCompare(b.label));
    byDept.sort((a, b) => b.value - a.value);
  }

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

      <div className="hui-card mb-5"><div className="flex justify-between items-center mb-3"><h3 className="text-base font-semibold" style={{ color: "var(--hui-text)" }}>最近出库</h3><Link href="/outbound" className="text-xs font-medium" style={{ color: "var(--hui-primary)" }}>查看全部 →</Link></div>
        {recentOut.length === 0 ? <p className="text-sm text-center py-4" style={{ color: "var(--hui-text3)" }}>暂无记录</p> :
          <div className="hui-table-wrap" style={{ border: "none" }}><table className="hui-table"><thead><tr><th>数量</th><th>部门</th><th>操作人</th><th>用途</th><th>时间</th></tr></thead><tbody>
            {recentOut.map((r) => (<tr key={r.id}><td><span className="hui-chip hui-chip-primary">-{r.quantity}</span></td><td>{r.department || "-"}</td><td>{r.operator}</td><td>{r.purpose || "-"}</td><td className="text-xs" style={{ color: "var(--hui-text3)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</td></tr>))}
          </tbody></table></div>}
      </div>

      {/* ── 请购花费图表 ── */}
      <div className="hui-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--hui-text)" }}>请购花费分析</h3>
          <div className="flex gap-2 flex-wrap">
            <select className="hui-input hui-select" style={{ height: 30, fontSize: 12 }} value={spYear} onChange={(e) => setSpYear(e.target.value)}>
              <option value="">全部年份</option>
              {(spending?.years || []).map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <select className="hui-input hui-select" style={{ height: 30, fontSize: 12 }} value={spMonth} onChange={(e) => setSpMonth(e.target.value)}>
              <option value="">全部月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>{m}月</option>))}
            </select>
            <select className="hui-input hui-select" style={{ height: 30, fontSize: 12 }} value={spDept} onChange={(e) => setSpDept(e.target.value)}>
              <option value="">全部部门</option>
              {(spending?.departments || []).map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--hui-text2)" }}>按月花费</h4>
            <BarChart data={byMonth} height={200} />
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--hui-text2)" }}>按部门分布</h4>
            <DonutChart data={byDept} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, v, href, warn }: { label: string; v: number; href?: string; warn?: boolean }) {
  const c = <div className="hui-stat" style={href ? { cursor: "pointer" } : {}}><div className="hui-stat-label">{label}</div><div className="hui-stat-value" style={warn ? { color: "var(--hui-warning)" } : {}}>{v}</div></div>;
  return href ? <Link href={href}>{c}</Link> : c;
}
