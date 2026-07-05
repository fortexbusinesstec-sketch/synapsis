"use client";

export default function Figure5Cost() {
  const w = 800;
  const h = 500;

  const data = [
    { label: "Table", pct: 46.2 },
    { label: "Text", pct: 33.0 },
    { label: "Specification", pct: 11.2 },
    { label: "Warning", pct: 8.5 },
    { label: "Procedure", pct: 1.1 },
  ];

  const plotL = 220;
  const plotR = 60;
  const plotB = 460;
  const plotW = w - plotL - plotR;
  const barH = 48;
  const barGap = 32;
  const barTop = 80;
  const xMax = 50;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica Neue', 'Arial', sans-serif" }}>
      <rect width={w} height={h} fill="#ffffff" />

      {/* ── Grid lines (light, minimal) ── */}
      {[0, 10, 20, 30, 40, 50].map((v) => {
        const x = plotL + (v / xMax) * plotW;
        return (
          <g key={v}>
            <line x1={x} y1={barTop} x2={x} y2={plotB} stroke="#eeeeee" strokeWidth={1} />
            <text x={x} y={plotB + 28} textAnchor="middle" fontSize={22} fill="#888888">
              {v}%
            </text>
          </g>
        );
      })}

      {/* ── X-axis ── */}
      <line x1={plotL} y1={plotB} x2={plotL + plotW} y2={plotB} stroke="#222222" strokeWidth={1.5} />

      {/* ── Bars ── */}
      {data.map((d, i) => {
        const y = barTop + i * (barH + barGap);
        const bw = (d.pct / xMax) * plotW;
        const inside = bw > 130;
        return (
          <g key={d.label}>
            <rect x={plotL} y={y} width={bw} height={barH} rx={2} fill="#333333" />
            <text x={plotL - 12} y={y + barH / 2 + 4} textAnchor="end" fontSize={22} fontWeight="500" fill="#333333">
              {d.label}
            </text>
            {inside && (
              <text x={plotL + bw - 10} y={y + barH / 2 + 4} textAnchor="end" fontSize={24} fontWeight="600" fill="#ffffff">
                {d.pct}%
              </text>
            )}
            {!inside && (
              <text x={plotL + bw + 8} y={y + barH / 2 + 4} fontSize={24} fontWeight="600" fill="#333333">
                {d.pct}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
