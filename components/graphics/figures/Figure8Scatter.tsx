"use client";

export default function Figure8Scatter() {
  const w = 800;
  const h = 600;
  const ml = 75, mr = 25, mt = 45, mb = 55;
  const pw = w - ml - mr;
  const ph = h - mt - mb;

  const data: [number, number][] = [
    [45, 81.26], [35, 95.83], [69, 55.57], [19, 63.50],
    [58, 48.81], [29, 72.67], [238, 73.11], [269, 108.05],
    [72, 81.81], [60, 74.73], [29, 54.68], [88, 100.58],
    [66, 48.63], [90, 80.77], [4, 27.56], [559, 133.96],
  ];

  const n = data.length;
  const sumX = data.reduce((s, d) => s + d[0], 0);
  const sumY = data.reduce((s, d) => s + d[1], 0);
  const sumXY = data.reduce((s, d) => s + d[0] * d[1], 0);
  const sumXX = data.reduce((s, d) => s + d[0] * d[0], 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const inter = (sumY - slope * sumX) / n;

  const xP = (v: number) => ml + (v / 600) * pw;
  const yP = (v: number) => mt + ph - (v / 150) * ph;

  const regX1 = 0, regY1 = inter;
  const regX2 = 600, regY2 = inter + slope * 600;

  const F = "'Arial', 'Helvetica', 'sans-serif'";

  return (
    <svg viewBox={"0 0 " + w + " " + h} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: F }}>
      <rect width={w} height={h} fill="#ffffff" />

      <line x1={ml} y1={mt} x2={ml} y2={mt + ph} stroke="#222222" strokeWidth={1.5} />
      <line x1={ml} y1={mt + ph} x2={ml + pw} y2={mt + ph} stroke="#222222" strokeWidth={1.5} />

      <line x1={xP(regX1)} y1={yP(regY1)} x2={xP(regX2)} y2={yP(regY2)} stroke="#888888" strokeWidth={2} />

      {data.map((d, i) => (
        <circle key={i} cx={xP(d[0])} cy={yP(d[1])} r={4} fill="#000000" />
      ))}

      {[0, 200, 400, 600].map((v) => (
        <g key={v}>
          <line x1={xP(v)} y1={mt + ph} x2={xP(v)} y2={mt + ph + 6} stroke="#222222" strokeWidth={1.5} />
          <text x={xP(v)} y={mt + ph + 24} textAnchor="middle" fontSize={20} fill="#555555">
            {v}
          </text>
        </g>
      ))}

      {[0, 50, 100, 150].map((v) => (
        <g key={v}>
          <line x1={ml} y1={yP(v)} x2={ml - 6} y2={yP(v)} stroke="#222222" strokeWidth={1.5} />
          <text x={ml - 8} y={yP(v) + 4} textAnchor="end" fontSize={20} fill="#555555">
            {v}
          </text>
        </g>
      ))}

      <text x={ml + pw / 2} y={h - 10} textAnchor="middle" fontSize={22} fill="#333333">
        Page count
      </text>

      <text x={24} y={mt + ph / 2} textAnchor="middle" fontSize={22} fill="#333333" transform={"rotate(-90, 24, " + (mt + ph / 2) + ")"}>
        Processing time (seconds)
      </text>

      <rect x={ml + 8} y={mt + 8} width={250} height={32} fill="#ffffff" fillOpacity={0.92} stroke="#cccccc" strokeWidth={0.5} rx={3} />
      <text x={ml + 14} y={mt + 28} fontSize={20} fill="#333333">
        {"Spearman\u2019s \u03C1 = 0.996, p < 0.001"}
      </text>
    </svg>
  );
}
