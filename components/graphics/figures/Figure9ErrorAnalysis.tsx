"use client";

export default function Figure9ErrorAnalysis() {
  const w = 1328;
  const h = 531;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg9" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#bg9)" />
      <text x={664} y={220} textAnchor="middle" fontSize={28} fontWeight="800" fill="#475569">Figure 9</text>
      <text x={664} y={260} textAnchor="middle" fontSize={18} fontWeight="600" fill="#94a3b8">Error Analysis — Failure Mode Categorization</text>
      <text x={664} y={300} textAnchor="middle" fontSize={14} fill="#cbd5e1">Pareto chart of error types: hallucination, missing context, misinterpretation, etc.</text>
    </svg>
  );
}
