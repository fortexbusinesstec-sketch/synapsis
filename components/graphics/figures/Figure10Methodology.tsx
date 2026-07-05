"use client";

export default function Figure10Methodology() {
  const w = 1328;
  const h = 531;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg10" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#bg10)" />
      <text x={664} y={220} textAnchor="middle" fontSize={28} fontWeight="800" fill="#475569">Figure 10</text>
      <text x={664} y={260} textAnchor="middle" fontSize={18} fontWeight="600" fill="#94a3b8">Experimental Methodology &amp; Evaluation Framework</text>
      <text x={664} y={300} textAnchor="middle" fontSize={14} fill="#cbd5e1">Flow diagram of the ablation study design, metrics, and validation pipeline</text>
    </svg>
  );
}
