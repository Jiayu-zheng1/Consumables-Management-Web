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
  const byCategory: { label: string; value: number }[] = [];
  const byItem: { label: string; value: number }[] = [];
  if (spending) {
    const monthMap: Record<string, number> = {};
    const deptMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};
    const itemMap: Record<string, number> = {};
    for (const d of spending.data) {
      monthMap[d.month_label] = (monthMap[d.month_label] || 0) + d.amount;
      deptMap[d.department || "未指定"] = (deptMap[d.department || "未指定"] || 0) + d.amount;
      catMap[d.category || "未分类"] = (catMap[d.category || "未分类"] || 0) + d.amount;
      itemMap[d.item_name || "未知耗材"] = (itemMap[d.item_name || "未知耗材"] || 0) + d.amount;
    }
    for (const [k, v] of Object.entries(monthMap)) byMonth.push({ label: k, value: v });
    for (const [k, v] of Object.entries(deptMap)) byDept.push({ label: k, value: v });
    for (const [k, v] of Object.entries(catMap)) byCategory.push({ label: k, value: v });
    for (const [k, v] of Object.entries(itemMap)) byItem.push({ label: k, value: v });
    byMonth.sort((a, b) => a.label.localeCompare(b.label));
    byDept.sort((a, b) => b.value - a.value);
    byCategory.sort((a, b) => b.value - a.value);
    byItem.sort((a, b) => b.value - a.value);
  }

  if (loading) return (
    <div className="flex justify-center py-20" style={{ color: "var(--hui-text2)" }}>
      <span style={{ opacity: .6 }}>加载中...</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* 欢迎横幅 */}
      <section className="mb-6 p-5 md:p-6 rounded-xl grain-overlay" style={{ background: "var(--hui-surface)", border: "1px solid var(--hui-border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight" style={{ color: "var(--hui-text)" }}>
              库存概览
            </h2>
            <p className="text-xs md:text-sm mt-1" style={{ color: "var(--hui-text2)" }}>
              实时库存状态与最近动态一览
            </p>
          </div>
          {stats && (
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="tabular-nums text-xl md:text-2xl font-extrabold" style={{ color: "var(--hui-primary)" }}>
                  {stats.today_inbound}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--hui-text3)" }}>今日入库</div>
              </div>
              <div className="text-center">
                <div className="tabular-nums text-xl md:text-2xl font-extrabold" style={{ color: "var(--hui-danger)" }}>
                  {stats.today_outbound}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--hui-text3)" }}>今日出库</div>
              </div>
              <div className="text-center">
                <div className="tabular-nums text-xl md:text-2xl font-extrabold" style={{ color: stats.low_stock_count > 0 ? "var(--hui-warning)" : "var(--hui-success)" }}>
                  {stats.low_stock_count}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--hui-text3)" }}>库存预警</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 统计卡片 — 横向数据条 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 stagger-fade">
        {stats && <>
          <StatCard label="耗材总数" value={stats.total_items} href="/items" accent="var(--hui-primary)" />
          <StatCard label="类别数量" value={stats.total_categories} href="/categories" accent="var(--hui-info)" />
          <StatCard label="库存预警" value={stats.low_stock_count} accent="var(--hui-warning)" warn={stats.low_stock_count > 0} />
          <StatCard label="今日入库" value={stats.today_inbound} accent="var(--hui-success)" />
          <StatCard label="今日出库" value={stats.today_outbound} accent="var(--hui-danger)" />
        </>}
      </div>

      {/* 预警 & 最近入库 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="hui-card">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--hui-danger)", flexShrink: 0 }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--hui-text)" }}>库存预警</h3>
            {alerts.length > 0 && (
              <span className="hui-chip hui-chip-danger text-[10px]" style={{ marginLeft: "auto" }}>{alerts.length} 项</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="hui-empty"><span className="hui-empty-text">暂无预警，库存状况良好</span></div>
          ) : (
            <div className="hui-table-wrap" style={{ border: "none" }}>
              <table className="hui-table">
                <thead><tr><th>名称</th><th>库存</th><th>最低</th></tr></thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.item_id}>
                      <td className="font-medium text-sm">{a.item_name}</td>
                      <td><span className="hui-chip hui-chip-danger">{a.current_stock} {a.unit}</span></td>
                      <td style={{ color: "var(--hui-text2)", fontVariantNumeric: "tabular-nums" }}>{a.min_stock} {a.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="hui-card">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--hui-success)", flexShrink: 0 }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--hui-text)" }}>最近入库</h3>
            <Link href="/inbound" className="text-[11px] font-semibold hover:underline" style={{ color: "var(--hui-primary-text)", marginLeft: "auto" }}>
              查看全部 →
            </Link>
          </div>
          {recentIn.length === 0 ? (
            <div className="hui-empty"><span className="hui-empty-text">暂无入库记录</span></div>
          ) : (
            <div className="hui-table-wrap" style={{ border: "none" }}>
              <table className="hui-table">
                <thead><tr><th>数量</th><th>操作人</th><th>时间</th></tr></thead>
                <tbody>
                  {recentIn.map((r) => (
                    <tr key={r.id}>
                      <td><span className="hui-chip hui-chip-success">+{r.quantity}</span></td>
                      <td className="text-sm">{r.operator}</td>
                      <td className="text-xs" style={{ color: "var(--hui-text3)" }}>
                        {new Date(r.created_at).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 最近出库 */}
      <div className="hui-card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--hui-danger)", flexShrink: 0 }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--hui-text)" }}>最近出库</h3>
          <Link href="/outbound" className="text-[11px] font-semibold hover:underline" style={{ color: "var(--hui-primary-text)", marginLeft: "auto" }}>
            查看全部 →
          </Link>
        </div>
        {recentOut.length === 0 ? (
          <div className="hui-empty"><span className="hui-empty-text">暂无出库记录</span></div>
        ) : (
          <div className="hui-table-wrap" style={{ border: "none" }}>
            <table className="hui-table">
              <thead><tr><th>数量</th><th>部门</th><th>操作人</th><th>用途</th><th>时间</th></tr></thead>
              <tbody>
                {recentOut.map((r) => (
                  <tr key={r.id}>
                    <td><span className="hui-chip hui-chip-danger">-{r.quantity}</span></td>
                    <td className="text-sm">{r.department || "-"}</td>
                    <td className="text-sm">{r.operator}</td>
                    <td className="text-xs" style={{ color: "var(--hui-text2)" }}>{r.purpose || "-"}</td>
                    <td className="text-xs" style={{ color: "var(--hui-text3)" }}>
                      {new Date(r.created_at).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 请购花费分析 */}
      <div className="hui-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--hui-primary)", flexShrink: 0 }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--hui-text)" }}>请购花费分析</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className="hui-input hui-select hui-input-sm" value={spYear} onChange={(e) => setSpYear(e.target.value)}>
              <option value="">全部年份</option>
              {(spending?.years || []).map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <select className="hui-input hui-select hui-input-sm" value={spMonth} onChange={(e) => setSpMonth(e.target.value)}>
              <option value="">全部月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>{m}月</option>))}
            </select>
            <select className="hui-input hui-select hui-input-sm" value={spDept} onChange={(e) => setSpDept(e.target.value)}>
              <option value="">全部部门</option>
              {(spending?.departments || []).map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--hui-text3)" }}>按月花费</h4>
            <BarChart data={byMonth} height={200} />
          </div>
          <div>
            <h4 className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--hui-text3)" }}>按部门分布</h4>
            <DonutChart data={byDept} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--hui-text3)" }}>按类别分布</h4>
            <DonutChart data={byCategory} />
          </div>
          <div>
            <h4 className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--hui-text3)" }}>耗材花费排名 Top 15</h4>
            <BarChart data={byItem.slice(0, 15)} height={260} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, accent, warn }: {
  label: string; value: number; href?: string; accent: string; warn?: boolean;
}) {
  const inner = (
    <div className="hui-stat hover-lift" style={{ "--hui-accent-bar": accent } as React.CSSProperties}>
      <div className="hui-stat-label">{label}</div>
      <div className="hui-stat-value" style={warn ? { color: "var(--hui-warning)" } : {}}>
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href} className="no-underline">{inner}</Link> : inner;
}
