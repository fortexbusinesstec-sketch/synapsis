"use client";

export default function Figure8ExpertSurvey() {
  const w = 1328;
  const h = 531;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg8" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#bg8)" />
      <text x={664} y={220} textAnchor="middle" fontSize={28} fontWeight="800" fill="#475569">Figure 8</text>
      <text x={664} y={260} textAnchor="middle" fontSize={18} fontWeight="600" fill="#94a3b8">Expert Survey Results — Blinded Evaluation</text>
      <text x={664} y={300} textAnchor="middle" fontSize={14} fill="#cbd5e1">Radar chart of expert ratings across accuracy, clarity, completeness, and usefulness</text>
    </svg>
  );
}
