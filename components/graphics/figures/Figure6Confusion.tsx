"use client";

export default function Figure6Confusion() {
  const w = 800;
  const h = 500;

  const bins = [
    { lo: 0, hi: 40, freq: 320 },
    { lo: 40, hi: 80, freq: 400 },
    { lo: 80, hi: 120, freq: 480 },
    { lo: 120, hi: 160, freq: 440 },
    { lo: 160, hi: 200, freq: 360 },
    { lo: 200, hi: 240, freq: 280 },
    { lo: 240, hi: 280, freq: 210 },
    { lo: 280, hi: 320, freq: 150 },
    { lo: 320, hi: 360, freq: 100 },
    { lo: 360, hi: 400, freq: 70 },
    { lo: 400, hi: 440, freq: 50 },
    { lo: 440, hi: 480, freq: 38 },
    { lo: 480, hi: 520, freq: 46 },
    { lo: 520, hi: 560, freq: 32 },
    { lo: 560, hi: 600, freq: 22 },
    { lo: 600, hi: 640, freq: 15 },
    { lo: 640, hi: 680, freq: 10 },
    { lo: 680, hi: 720, freq: 7 },
    { lo: 720, hi: 760, freq: 4 },
    { lo: 760, hi: 800, freq: 2 },
  ];

  const plotL = 90;
  const plotR = 30;
  const plotT = 50;
  const plotB = 420;
  const plotW = w - plotL - plotR;
  const plotH = plotB - plotT;

  const binW = plotW / bins.length;
  const barW = binW - 1.5;
  const yMax = 500;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica Neue', 'Arial', sans-serif" }}>
      <rect width={w} height={h} fill="#ffffff" />

      {/* ── Y-axis grid lines & labels ── */}
      {[0, 100, 200, 300, 400, 500].map((v) => {
        const y = plotT + plotH - (v / yMax) * plotH;
        return (
          <g key={v}>
            <line x1={plotL} y1={y} x2={plotL + plotW} y2={y} stroke="#eeeeee" strokeWidth={1} />
            <text x={plotL - 8} y={y + 4} textAnchor="end" fontSize={22} fill="#888888">
              {v}
            </text>
          </g>
        );
      })}

      {/* ── Axes ── */}
      <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke="#222222" strokeWidth={1.5} />
      <line x1={plotL} y1={plotB} x2={plotL + plotW} y2={plotB} stroke="#222222" strokeWidth={1.5} />

      {/* ── X-axis tick labels ── */}
      {[0, 200, 400, 600, 800].map((v) => {
        const x = plotL + (v / 800) * plotW;
        return (
          <text key={v} x={x} y={plotB + 28} textAnchor="middle" fontSize={22} fill="#888888">
            {v}
          </text>
        );
      })}

      {/* ── Y-axis label ── */}
      <text x={28} y={plotT + plotH / 2} textAnchor="middle" fontSize={24} fill="#555555" transform={`rotate(-90, 28, ${plotT + plotH / 2})`}>
        Frequency
      </text>

      {/* ── X-axis label ── */}
      <text x={plotL + plotW / 2} y={h - 10} textAnchor="middle" fontSize={24} fill="#555555">
        Tokens per chunk
      </text>

      {/* ── Median line ── */}
      <line x1={plotL + (148 / 800) * plotW} y1={plotT} x2={plotL + (148 / 800) * plotW} y2={plotB} stroke="#111111" strokeWidth={1.5} strokeDasharray="4,4" />
      <text x={plotL + (148 / 800) * plotW + 5} y={plotT + 18} fontSize={22} fontWeight="600" fill="#111111">
        Median (148)
      </text>

      {/* ── Target line ── */}
      <line x1={plotL + (500 / 800) * plotW} y1={plotT} x2={plotL + (500 / 800) * plotW} y2={plotB} stroke="#111111" strokeWidth={1.5} strokeDasharray="8,5" />
      <text x={plotL + (500 / 800) * plotW + 5} y={plotT + 44} fontSize={22} fontWeight="600" fill="#111111">
        Target (500)
      </text>

      {/* ── Bars ── */}
      {bins.map((b, i) => {
        const x = plotL + i * binW;
        const bh = (b.freq / yMax) * plotH;
        return (
          <rect key={i} x={x} y={plotB - bh} width={barW} height={bh} fill="#777777" stroke="#222222" strokeWidth={0.8} />
        );
      })}
    </svg>
  );
}
