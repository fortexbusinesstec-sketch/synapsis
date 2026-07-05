"use client";

export default function Figure7CostPie() {
  const w = 800;
  const h = 600;
  const cx = 340;
  const cy = 260;
  const r = 150;
  const deg = (d: number) => (d * Math.PI) / 180;
  const px = (a: number, d: number) => cx + d * Math.cos(deg(a));
  const py = (a: number, d: number) => cy + d * Math.sin(deg(a));

  const slices = [
    { start: 46, end: 46 + 323.64, fill: "#444444", name: "OCR (Mistral OCR)", pct: "89.9%", cost: "$1.71" },
    { start: 9.64, end: 41.32, fill: "#888888", name: "Pixtral-12B", pct: "8.8%", cost: "$0.17" },
    { start: 41.32, end: 46, fill: "#bbbbbb", name: "Other", pct: "1.3%", cost: "$0.03" },
  ];

  const arc = (s: { start: number; end: number; fill: string }) => {
    const x1 = px(s.start, r), y1 = py(s.start, r);
    const x2 = px(s.end, r), y2 = py(s.end, r);
    return "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + (s.end - s.start > 180 ? 1 : 0) + " 1 " + x2 + " " + y2 + " Z";
  };

  const mid = (s: { start: number; end: number }) => s.start + (s.end - s.start) / 2;
  const ld = (m: number) => ({ dx: px(m, r), dy: py(m, r) });
  const le = (m: number, d: number) => ({ lx: px(m, d), ly: py(m, d) });

  const m0 = mid(slices[0]), lD0 = ld(m0), lE0 = le(m0, 245);
  const m1 = mid(slices[1]), lD1 = ld(m1), lE1 = le(m1, 225);
  const m2 = mid(slices[2]), lD2 = ld(m2), lE2 = le(m2, 240);

  const F = "'Arial', 'Helvetica', 'sans-serif'";

  return (
    <svg viewBox={"0 0 " + w + " " + h} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: F }}>
      <rect width={w} height={h} fill="#ffffff" />



      {slices.map((s, i) => (
        <path key={i} d={arc(s)} fill={s.fill} stroke="#ffffff" strokeWidth={1} />
      ))}

      <circle cx={lD0.dx} cy={lD0.dy} r={2.5} fill="#111111" />
      <line x1={lD0.dx} y1={lD0.dy} x2={lE0.lx} y2={lE0.ly} stroke="#333333" strokeWidth={1} />
      <text x={lE0.lx} y={lE0.ly - 10} textAnchor="middle" fontSize={22} fill="#000000" fontWeight="600">
        {slices[0].name}
      </text>
      <text x={lE0.lx} y={lE0.ly + 14} textAnchor="middle" fontSize={22} fill="#444444">
        {slices[0].pct} — {slices[0].cost}
      </text>

      <circle cx={lD1.dx} cy={lD1.dy} r={2.5} fill="#111111" />
      <line x1={lD1.dx} y1={lD1.dy} x2={lE1.lx} y2={lE1.ly} stroke="#333333" strokeWidth={1} />
      <text x={lE1.lx} y={lE1.ly - 10} textAnchor="middle" fontSize={22} fill="#000000" fontWeight="600">
        {slices[1].name}
      </text>
      <text x={lE1.lx} y={lE1.ly + 14} textAnchor="middle" fontSize={22} fill="#444444">
        {slices[1].pct} — {slices[1].cost}
      </text>

      <circle cx={lD2.dx} cy={lD2.dy} r={2.5} fill="#111111" />
      <line x1={lD2.dx} y1={lD2.dy} x2={lE2.lx} y2={lE2.ly} stroke="#333333" strokeWidth={1} />
      <text x={lE2.lx} y={lE2.ly - 10} textAnchor="middle" fontSize={22} fill="#000000" fontWeight="600">
        {slices[2].name}
      </text>
      <text x={lE2.lx} y={lE2.ly + 14} textAnchor="middle" fontSize={22} fill="#444444">
        {slices[2].pct} — {slices[2].cost}
      </text>

      <g transform="translate(0, 490)">
        <line x1={100} y1={0} x2={700} y2={0} stroke="#dddddd" strokeWidth={1} />
        <rect x={120} y={14} width={14} height={14} fill="#444444" />
        <text x={142} y={26} fontSize={20} fill="#555555">OCR (Mistral OCR)</text>
        <rect x={340} y={14} width={14} height={14} fill="#888888" />
        <text x={362} y={26} fontSize={20} fill="#555555">Vision (Pixtral-12B)</text>
        <rect x={580} y={14} width={14} height={14} fill="#bbbbbb" />
        <text x={602} y={26} fontSize={20} fill="#555555">Other</text>
      </g>
    </svg>
  );
}
