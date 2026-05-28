"use client";

import { useState, useEffect, useRef } from "react";

interface ChartData {
  label: string;
  value: number;
}

/* ===== 暖色图表调色板 ===== */
const CHART_COLORS = [
  "#CA8A04", "#0D9488", "#D97706", "#C2413B", "#6D28D9",
  "#0891B2", "#7C3AED", "#E8781A", "#0E7490", "#A16207",
];

/* ===== 柱状图 ===== */
export function BarChart({ data, height = 220 }: { data: ChartData[]; height?: number }) {
  const [tip, setTip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (data.length === 0)
    return <p className="text-center py-12 text-sm" style={{ color: "var(--hui-text3)" }}>暂无数据</p>;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 4, paddingTop: 28, position: "relative" }}>
      {/* Tooltip */}
      {tip && (
        <div
          style={{
            position: "absolute", top: tip.y - 44, left: tip.x,
            transform: "translateX(-50%)",
            background: "var(--hui-text)", color: "var(--hui-bg)",
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
            whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,.3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {tip.label}&nbsp;&nbsp;¥{tip.value.toFixed(0)}
        </div>
      )}

      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div
            key={i}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              height: "100%", justifyContent: "flex-end",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: `opacity .4s ease ${i * 40}ms, transform .4s ease ${i * 40}ms`,
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const parent = e.currentTarget.parentElement!.getBoundingClientRect();
              setTip({ label: d.label, value: d.value, x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top });
            }}
            onMouseLeave={() => setTip(null)}
          >
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: "var(--hui-text2)",
                marginBottom: 3, fontVariantNumeric: "tabular-nums",
              }}
            >
              ¥{d.value.toFixed(0)}
            </span>
            <div
              style={{
                width: "100%", maxWidth: 44, height: `${Math.max(pct, 3)}%`, minHeight: 6,
                background: `linear-gradient(180deg, ${CHART_COLORS[i % CHART_COLORS.length]} 0%, ${CHART_COLORS[i % CHART_COLORS.length]}88 100%)`,
                borderRadius: "5px 5px 0 0", cursor: "pointer",
                transition: "height .5s cubic-bezier(.34,1.56,.64,1)",
                boxShadow: `0 0 8px ${CHART_COLORS[i % CHART_COLORS.length]}20`,
              }}
            />
            <span
              style={{
                fontSize: 10, color: "var(--hui-text2)", marginTop: 6,
                textAlign: "center", lineHeight: 1.2, wordBreak: "break-all",
                maxWidth: 60,
              }}
            >
              {d.label.length > 8 ? d.label.slice(0, 8) + "…" : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ===== 环形图 ===== */
export function DonutChart({ data }: { data: ChartData[] }) {
  const [animProgress, setAnimProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 800;
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      setAnimProgress(p * p); // ease-in
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data]);

  if (data.length === 0)
    return <p className="text-center py-12 text-sm" style={{ color: "var(--hui-text3)" }}>暂无数据</p>;

  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={170} height={170} viewBox="0 0 170 170">
        {/* 背景环 */}
        <circle cx={85} cy={85} r={radius} fill="none" stroke="var(--hui-border)" strokeWidth={13} />
        {/* 数据环 */}
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = circumference * pct * animProgress;
          const currentOffset = offset;
          offset += circumference * pct;
          return (
            <circle
              key={i}
              cx={85} cy={85} r={radius}
              fill="none"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 85 85)"
            />
          );
        })}
        {/* 中心文字 */}
        <text x={85} y={80} textAnchor="middle" fill="var(--hui-text)" fontSize={20} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>
          ¥{total.toFixed(0)}
        </text>
        <text x={85} y={100} textAnchor="middle" fill="var(--hui-text3)" fontSize={11} fontWeight={500}>
          总计
        </text>
      </svg>

      {/* 图例 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10, height: 10, borderRadius: 3,
                background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12, color: "var(--hui-text2)", flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {d.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--hui-text)", fontVariantNumeric: "tabular-nums" }}>
              ¥{d.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
