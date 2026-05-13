"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export function BarChart({ data, height = 220 }: BarChartProps) {
  if (data.length === 0) return <p className="text-center py-12 text-sm" style={{ color: "var(--hui-text3)" }}>暂无数据</p>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 4, paddingTop: 24 }}>
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--hui-text)", marginBottom: 2 }}>
              ¥{d.value.toFixed(0)}
            </span>
            <div
              style={{
                width: "100%", maxWidth: 48, height: `${Math.max(pct, 2)}%`, minHeight: 4,
                background: `linear-gradient(180deg, var(--hui-primary) 0%, var(--hui-primary-hover) 100%)`,
                borderRadius: "6px 6px 0 0", transition: "height .3s ease",
              }}
              title={`${d.label}: ¥${d.value}`}
            />
            <span style={{ fontSize: 10, color: "var(--hui-text2)", marginTop: 4, textAlign: "center", lineHeight: 1.2, wordBreak: "break-all" }}>
              {d.label.length > 6 ? d.label.slice(0, 6) + "…" : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DONUT_COLORS = [
  "var(--hui-primary)",
  "#17c964",
  "#f5a524",
  "#f31260",
  "#0072f5",
  "#7828c8",
  "#00b4d8",
  "#f77f00",
];

export function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-center py-12 text-sm" style={{ color: "var(--hui-text3)" }}>暂无数据</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={90} cy={90} r={radius} fill="none" stroke="var(--hui-border)" strokeWidth={16} />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = circumference * pct;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={90} cy={90} r={radius}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={16}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 90 90)"
              style={{ transition: "stroke-dasharray .4s ease" }}
            />
          );
        })}
        <text x={90} y={86} textAnchor="middle" fill="var(--hui-text)" fontSize={18} fontWeight={700}>
          ¥{total.toFixed(0)}
        </text>
        <text x={90} y={106} textAnchor="middle" fill="var(--hui-text3)" fontSize={11}>
          总计
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--hui-text2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hui-text)" }}>¥{d.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
