"use client";

interface Figure1ArchitectureProps {
  primaryColor?: string;
  infrastructureColor?: string;
  accentColor?: string;
}

function OutlinedCircle({ cx, cy, r, strokeColor }: { cx: number; cy: number; r: number; strokeColor: string }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill="white" stroke={strokeColor} strokeWidth={2} />
  );
}

export default function Figure1Architecture({
  primaryColor = "#4477AA",
  infrastructureColor = "#E69F00",
  accentColor = "#009E73",
}: Figure1ArchitectureProps) {
  const w = 1328;
  const h = 531;

  const arrowGray = "#888888";
  const dcPurple = "#CC79A7";

  const swarmY = 90;
  const sr = 16;
  const swarmCircles = [
    { x: 236, label: "Upload" },
    { x: 382, label: "PDF Parse" },
    { x: 528, label: "Vision" },
    { x: 674, label: "Diagram" },
    { x: 820, label: "Chunker" },
    { x: 966, label: "Embedder" },
    { x: 1112, label: "HITL QA" },
  ];

  const dcY = 378;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="kbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={infrastructureColor} />
          <stop offset="100%" stopColor="#C47D00" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
        </filter>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={arrowGray} />
        </marker>
        <marker id="arrGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={accentColor} />
        </marker>
      </defs>

      <rect width={w} height={h} fill="url(#bg)" />

      {/* ════════════ BAND 1: INDEXING SWARM ════════════ */}
      <rect x={28} y={35} width={1272} height={100} rx={10} fill="white" stroke="#D4D4D4" strokeWidth={1} filter="url(#sh)" />
      <rect x={28} y={35} width={1272} height={30} rx={10} fill={primaryColor} />
      <rect x={28} y={58} width={1272} height={7} fill={primaryColor} />
      <text x={664} y={56} textAnchor="middle" fontSize={15} fontWeight="800" fill="white" letterSpacing={0.5}>INDEXING SWARM</text>

      <line x1={swarmCircles[0].x + sr + 8} y1={swarmY} x2={swarmCircles[6].x - sr - 8} y2={swarmY} stroke={arrowGray} strokeWidth={1.5} opacity={0.35} />

      {swarmCircles.map((c, i) => (
        <g key={c.label}>
          <circle cx={c.x} cy={swarmY} r={sr} fill={primaryColor} />
          <text x={c.x} y={swarmY + 1} textAnchor="middle" fontSize={9} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>{c.label.charAt(0)}</text>
          <text x={c.x} y={swarmY + sr + 16} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1e293b">{c.label}</text>
          {i < swarmCircles.length - 1 && (
            <line x1={c.x + sr + 4} y1={swarmY} x2={swarmCircles[i + 1].x - sr - 4} y2={swarmY} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />
          )}
        </g>
      ))}

      <path d={`M ${swarmCircles[6].x} ${swarmY + sr + 4} v 20 H 664 v 6`} stroke={arrowGray} strokeWidth={1.5} fill="none" markerEnd="url(#arr)" />

      {/* ════════════ BAND 2: KNOWLEDGE BASE ════════════ */}
      <rect x={160} y={152} width={1008} height={55} rx={8} fill="url(#kbGrad)" filter="url(#sh)" />
      <text x={664} y={177} textAnchor="middle" fontSize={16} fontWeight="800" fill="white" letterSpacing={0.3}>KNOWLEDGE BASE</text>
      <text x={664} y={196} textAnchor="middle" fontSize={13} fontWeight="600" fill="rgba(255,255,255,0.85)">Text passages · Diagrams · HITL annotations</text>

      <line x1={664} y1={207} x2={664} y2={232} stroke={arrowGray} strokeWidth={1.5} markerEnd="url(#arr)" />

      {/* ════════════ BAND 3: DIAGNOSTIC COMMITTEE ════════════ */}
      <rect x={28} y={235} width={1272} height={283} rx={10} fill="white" stroke="#D4D4D4" strokeWidth={1} filter="url(#sh)" />
      <rect x={28} y={235} width={1272} height={30} rx={10} fill={dcPurple} />
      <rect x={28} y={258} width={1272} height={7} fill={dcPurple} />
      <text x={664} y={256} textAnchor="middle" fontSize={15} fontWeight="800" fill="white" letterSpacing={0.5}>DIAGNOSTIC COMMITTEE</text>

      {/* 1. Technician */}
      <circle cx={144} cy={dcY} r={28} fill={primaryColor} />
      <text x={144} y={dcY + 1} textAnchor="middle" fontSize={12} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>T</text>
      <text x={144} y={dcY + 44} textAnchor="middle" fontSize={14} fontWeight="700" fill="#1e293b">Technician</text>

      <line x1={172} y1={dcY} x2={212} y2={dcY} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 2. Clarifier */}
      <rect x={212} y={dcY - 42} width={140} height={84} rx={7} fill={primaryColor} />
      <text x={282} y={dcY + 1} textAnchor="middle" fontSize={16} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>Clarifier</text>
      <text x={282} y={dcY + 30} textAnchor="middle" fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.75)">disambiguates</text>

      <line x1={352} y1={dcY} x2={392} y2={dcY} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 3. ReAct Loop container */}
      <rect x={392} y={dcY - 78} width={544} height={156} rx={9} fill="#f0faf0" stroke={accentColor} strokeWidth={2} strokeDasharray="6,4" />
      <text x={664} y={dcY - 60} textAnchor="middle" fontSize={15} fontWeight="800" fill={accentColor} letterSpacing={0.3}>ITERATIVE REACT LOOP</text>

      {/* Planner */}
      <OutlinedCircle cx={484} cy={dcY + 8} r={22} strokeColor={primaryColor} />
      <text x={484} y={dcY + 12} textAnchor="middle" fontSize={10} fontWeight="700" fill={primaryColor} style={{ dominantBaseline: "middle" }}>P</text>
      <text x={484} y={dcY + 44} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1e293b">Planner</text>

      <line x1={506} y1={dcY + 8} x2={536} y2={dcY + 8} stroke={accentColor} strokeWidth={2} markerEnd="url(#arrGreen)" />

      {/* Librarian */}
      <rect x={536} y={dcY - 28} width={124} height={72} rx={7} fill={primaryColor} />
      <text x={598} y={dcY + 8} textAnchor="middle" fontSize={16} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>Librarian</text>

      <line x1={660} y1={dcY + 8} x2={690} y2={dcY + 8} stroke={accentColor} strokeWidth={2} markerEnd="url(#arrGreen)" />

      {/* Ctx. Sel. */}
      <OutlinedCircle cx={722} cy={dcY + 8} r={22} strokeColor={primaryColor} />
      <text x={722} y={dcY + 12} textAnchor="middle" fontSize={10} fontWeight="700" fill={primaryColor} style={{ dominantBaseline: "middle" }}>C</text>
      <text x={722} y={dcY + 44} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1e293b">Ctx. Sel.</text>

      <line x1={744} y1={dcY + 8} x2={774} y2={dcY + 8} stroke={accentColor} strokeWidth={2} markerEnd="url(#arrGreen)" />

      {/* Analyst */}
      <rect x={774} y={dcY - 28} width={124} height={72} rx={7} fill={primaryColor} />
      <text x={836} y={dcY + 8} textAnchor="middle" fontSize={16} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>Analyst</text>

      {/* ReAct return arrow */}
      <path d="M 898 314 Q 898 294 664 294 Q 430 294 430 310" stroke={accentColor} strokeWidth={2} strokeDasharray="5,3" fill="none" markerEnd="url(#arrGreen)" />
      <text x={664} y={288} textAnchor="middle" fontSize={12} fontWeight="600" fill={accentColor} fontStyle="italic">insufficient context</text>

      <line x1={936} y1={dcY} x2={972} y2={dcY} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 4. Chief Engineer */}
      <rect x={972} y={dcY - 44} width={140} height={88} rx={7} fill={dcPurple} />
      <text x={1042} y={dcY + 1} textAnchor="middle" fontSize={16} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>Chief</text>
      <text x={1042} y={dcY + 20} textAnchor="middle" fontSize={16} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>Engineer</text>

      <line x1={1112} y1={dcY} x2={1144} y2={dcY} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 5. Validated Response */}
      <circle cx={1178} cy={dcY} r={28} fill={primaryColor} />
      <text x={1178} y={dcY + 1} textAnchor="middle" fontSize={12} fontWeight="800" fill="#ffffff" style={{ dominantBaseline: "middle" }}>V</text>
      <text x={1178} y={dcY + 44} textAnchor="middle" fontSize={14} fontWeight="700" fill="#1e293b">Validated</text>
      <text x={1178} y={dcY + 60} textAnchor="middle" fontSize={14} fontWeight="700" fill="#1e293b">Response</text>
    </svg>
  );
}
