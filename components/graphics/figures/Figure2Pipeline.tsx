"use client";

interface Figure2PipelineProps {
  primaryColor?: string;
  amberColor?: string;
  inputColor?: string;
  outputGray?: string;
}

function PdfIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 14h6" />
      <path d="M9 17h3" />
    </g>
  );
}

function ImageIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </g>
  );
}

function TableIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </g>
  );
}

function ScanIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V5a2 2 0 0 1 2-2h2" />
      <path d="M4 17v2a2 2 0 0 0 2 2h2" />
      <path d="M16 3h2a2 2 0 0 1 2 2v2" />
      <path d="M16 21h2a2 2 0 0 0 2-2v-2" />
      <rect x="8" y="9" width="8" height="6" rx="1" />
      <line x1="11" y1="12" x2="13" y2="12" />
    </g>
  );
}

function EyeIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12s2-6 9-6 9 6 9 6-2 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  );
}

function CutIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
      <line x1="10" y1="10" x2="14" y2="14" />
      <line x1="14" y1="10" x2="10" y2="14" />
    </g>
  );
}

function CloudIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a4.5 4.5 0 1 1 0-9 5 5 0 0 1 9.5-1.5A3.5 3.5 0 1 1 17 18H7z" />
    </g>
  );
}

function DatabaseIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="7" ry="2.5" />
      <path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </g>
  );
}

function VectorIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 17h4v-4" />
    </g>
  );
}

function CheckIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </g>
  );
}

function BrainIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4a3.5 3.5 0 0 0-3 5.2 2.5 2.5 0 0 0 .5 4.8h1l.5 2.5" />
      <path d="M12 4a3.5 3.5 0 0 1 3 5.2 2.5 2.5 0 0 1-.5 4.8h-1l-.5 2.5" />
      <path d="M10 18a2 2 0 1 0 0 4h4a2 2 0 1 0 0-4" />
    </g>
  );
}

function LightbulbIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2v1" />
      <path d="M7 8a5 5 0 0 1 10 0c0 2.2-1.2 3.8-2 5l-1 2H8l-1-2c-.8-1.2-2-2.8-2-5" />
    </g>
  );
}

function TagsIcon() {
  return (
    <g transform="translate(0, 0)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H5v4l8 8 4-4-8-8z" />
      <circle cx="7" cy="7" r="1" fill="white" />
    </g>
  );
}

function IconWrap({ children, x, y, size = 20 }: { children: React.ReactNode; x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${size / 24})`}>
      {children}
    </g>
  );
}

export default function Figure2Pipeline({
  primaryColor = "#1e3a5f",
  amberColor = "#d4a017",
  inputColor = "#5a6b7c",
  outputGray = "#7a8b9c",
}: Figure2PipelineProps) {
  const w = 1328;
  const h = 531;
  const arrowGray = "#8899a6";

  const s1y = 30;
  const s1h = 85;
  const s1cy = s1y + s1h / 2;

  const s2y = 130;
  const s2h = 245;
  const s2cy = s2y + s2h / 2;

  const s3y = 390;
  const s3h = 130;
  const s3cy = s3y + s3h / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="visionGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#2a5a8f" />
        </linearGradient>
        <linearGradient id="curiousGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={amberColor} />
          <stop offset="100%" stopColor="#b8890a" />
        </linearGradient>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={arrowGray} />
        </marker>
        <marker id="arrAmber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={amberColor} />
        </marker>
        <marker id="arrStart" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
          <path d="M8 0 L0 3 L8 6" fill={arrowGray} />
        </marker>
      </defs>

      <rect width={w} height={h} fill="#ffffff" />

      {/* ═══════════════════ SWIMLANE 1: INPUT ═══════════════════ */}
      <rect x={28} y={s1y} width={90} height={s1h} rx={8} fill={inputColor} />
      <rect x={28} y={s1y} width={80} height={s1h} fill={inputColor} />
      <text x={73} y={s1cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s1cy})`} letterSpacing={1}>INPUT</text>

      <rect x={118} y={s1y} width={1182} height={s1h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      <rect x={320} y={s1y + 10} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={338} y={s1cy} size={20}><PdfIcon /></IconWrap>
      <text x={368} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">PDF Manuals</text>

      <line x1={500} y1={s1cy} x2={550} y2={s1cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      <rect x={550} y={s1y + 10} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={568} y={s1cy} size={20}><ImageIcon /></IconWrap>
      <text x={598} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">Images</text>

      <line x1={730} y1={s1cy} x2={780} y2={s1cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      <rect x={780} y={s1y + 10} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={798} y={s1cy} size={20}><TableIcon /></IconWrap>
      <text x={828} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">Tables</text>

      {/* ═══════════════════ SWIMLANE 2: PROCESSING ═══════════════════ */}
      <rect x={28} y={s2y} width={90} height={s2h} rx={8} fill={primaryColor} />
      <rect x={28} y={s2y} width={80} height={s2h} fill={primaryColor} />
      <text x={73} y={s2cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s2cy})`} letterSpacing={1}>PROCESSING</text>

      <rect x={118} y={s2y} width={1182} height={s2h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      {/* Pipelines title */}
      <text x={664} y={s2y + 20} textAnchor="middle" fontSize={13} fontWeight="700" fill={arrowGray} letterSpacing={0.5}>DOCUMENT PIPELINE (AUTOMATED)</text>

      {/* 1. Mistral OCR */}
      <rect x={140} y={s2y + 38} width={190} height={80} rx={7} fill={primaryColor} stroke={amberColor} strokeWidth={2} />
      <IconWrap x={160} y={s2y + 78} size={22}><ScanIcon /></IconWrap>
      <text x={194} y={s2y + 62} fontSize={15} fontWeight="800" fill={amberColor}>Mistral OCR</text>
      <text x={194} y={s2y + 84} fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.7)">text + base64 images</text>

      {/* arrow */}
      <line x1={330} y1={s2y + 78} x2={365} y2={s2y + 78} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 2. Orchestrator */}
      <rect x={365} y={s2y + 38} width={190} height={80} rx={7} fill={primaryColor} />
      <IconWrap x={385} y={s2y + 78} size={22}><BrainIcon /></IconWrap>
      <text x={419} y={s2y + 62} fontSize={14} fontWeight="800" fill="white">Orchestrator</text>
      <text x={419} y={s2y + 84} fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.7)">gpt-4o-mini · strategy</text>

      {/* arrow */}
      <line x1={555} y1={s2y + 78} x2={590} y2={s2y + 78} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 3. Vision Agent (Pixtral-12B) */}
      <rect x={590} y={s2y + 32} width={250} height={92} rx={7} fill="url(#visionGrad)" />
      <IconWrap x={612} y={s2y + 78} size={22}><EyeIcon /></IconWrap>
      <text x={646} y={s2y + 58} fontSize={14} fontWeight="800" fill="white">Pixtral-12B Vision</text>
      <text x={646} y={s2y + 78} fontSize={11} fontWeight="700" fill="#ffe066">generates textual descriptions</text>
      <text x={646} y={s2y + 96} fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.7)">of technical diagrams</text>

      {/* arrow */}
      <line x1={840} y1={s2y + 78} x2={875} y2={s2y + 78} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 4. Chunker + Metadata Enrichment */}
      <rect x={875} y={s2y + 32} width={280} height={92} rx={7} fill={primaryColor} />
      <IconWrap x={897} y={s2y + 78} size={22}><CutIcon /></IconWrap>
      <text x={931} y={s2y + 55} fontSize={14} fontWeight="800" fill="white">Chunker</text>
      <text x={931} y={s2y + 73} fontSize={11} fontWeight="700" fill="#ffe066">+ Metadata Enrichment</text>
      <text x={931} y={s2y + 93} fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.7)">types · warnings · sections</text>

      {/* Chunk type badges under Chunker */}
      <rect x={945} y={s2y + 107} width={60} height={16} rx={4} fill={amberColor} />
      <text x={975} y={s2y + 118} textAnchor="middle" fontSize={9} fontWeight="700" fill="#1e293b">procedure</text>
      <rect x={1015} y={s2y + 107} width={54} height={16} rx={4} fill="#e74c3c" />
      <text x={1042} y={s2y + 118} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">warning</text>
      <rect x={1078} y={s2y + 107} width={42} height={16} rx={4} fill={primaryColor} />
      <text x={1099} y={s2y + 118} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">table</text>
      <rect x={1128} y={s2y + 107} width={66} height={16} rx={4} fill="#8e44ad" />
      <text x={1161} y={s2y + 118} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">specification</text>

      {/* ═══════════════════ SWIMLANE 3: STORAGE & QUALITY ═══════════════════ */}
      <rect x={28} y={s3y} width={90} height={s3h} rx={8} fill={outputGray} />
      <rect x={28} y={s3y} width={80} height={s3h} fill={outputGray} />
      <text x={73} y={s3cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s3cy})`} letterSpacing={1}>STORAGE &amp; QUALITY</text>

      <rect x={118} y={s3y} width={1182} height={s3h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      {/* 5. Embedder */}
      <rect x={170} y={s3y + 18} width={170} height={76} rx={7} fill={primaryColor} />
      <IconWrap x={192} y={s3y + 56} size={22}><VectorIcon /></IconWrap>
      <text x={226} y={s3y + 42} fontSize={14} fontWeight="800" fill="white">Embedder</text>
      <text x={226} y={s3y + 62} fontSize={10} fontWeight="700" fill="rgba(255,255,255,0.85)">text-embedding-3-</text>
      <text x={226} y={s3y + 76} fontSize={13} fontWeight="700" fill="#ffe066">small</text>
      <text x={282} y={s3y + 76} fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.7)">· 1536-dim</text>

      {/* arrow */}
      <line x1={340} y1={s3y + 56} x2={380} y2={s3y + 56} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 6. Vector DB (Turso) */}
      <rect x={380} y={s3y + 14} width={200} height={84} rx={8} fill={primaryColor} stroke={amberColor} strokeWidth={2} />
      <IconWrap x={404} y={s3y + 56} size={24}><DatabaseIcon /></IconWrap>
      <text x={442} y={s3y + 40} fontSize={14} fontWeight="800" fill={amberColor}>Vector DB</text>
      <text x={442} y={s3y + 58} fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.7)">Turso · sqlite-vec</text>
      <text x={442} y={s3y + 76} fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.7)">chunks + embeddings</text>

      {/* bidirectional arrow: Vector DB ↔ Curiosity Agent */}
      <line x1={580} y1={s3y + 56} x2={620} y2={s3y + 56} stroke={amberColor} strokeWidth={2} strokeDasharray="5,3" markerEnd="url(#arrAmber)" markerStart="url(#arrStart)" />

      {/* 7. Curiosity Agent */}
      <rect x={620} y={s3y + 18} width={220} height={76} rx={7} fill="url(#curiousGrad)" />
      <IconWrap x={644} y={s3y + 56} size={22}><LightbulbIcon /></IconWrap>
      <text x={680} y={s3y + 42} fontSize={14} fontWeight="800" fill="white">Curiosity Agent</text>
      <text x={680} y={s3y + 60} fontSize={11} fontWeight="700" fill="#1e293b">detects knowledge gaps</text>
      <text x={680} y={s3y + 76} fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.8)">enrichments table</text>

      {/* arrow */}
      <line x1={840} y1={s3y + 56} x2={880} y2={s3y + 56} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* 8. HITL QA */}
      <rect x={880} y={s3y + 26} width={180} height={60} rx={30} fill={amberColor} />
      <IconWrap x={904} y={s3y + 56} size={22}><CheckIcon /></IconWrap>
      <text x={940} y={s3y + 42} fontSize={15} fontWeight="800" fill="white">HITL QA</text>
      <text x={940} y={s3y + 60} fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.8)">expert validation</text>

      {/* dashed archival arrow: Input → Storage */}
      <path d="M 410 106 Q 410 130 360 155 L 130 155 Q 110 155 110 185 L 110 375 Q 110 395 130 395 L 170 400" stroke={arrowGray} strokeWidth={1.5} strokeDasharray="6,4" fill="none" markerEnd="url(#arr)" />
      <rect x={108} y={250} width={108} height={18} rx={3} fill="white" />
      <text x={121} y={263} fontSize={10} fontWeight="600" fill={arrowGray}>PDF archival → R2</text>

      {/* Down arrow: Input → Processing */}
      <line x1={664} y1={s1y + s1h} x2={664} y2={s2y} stroke={arrowGray} strokeWidth={1.5} markerEnd="url(#arr)" />

      {/* Down arrow: Processing → Storage */}
      <line x1={664} y1={s2y + s2h} x2={664} y2={s3y} stroke={arrowGray} strokeWidth={1.5} markerEnd="url(#arr)" />

      {/* Background label: Curiosity Agent runs after status=ready */}
      <rect x={640} y={s3y + 100} width={180} height={16} rx={3} fill="#f0f0f0" />
      <text x={730} y={s3y + 111} textAnchor="middle" fontSize={9} fontWeight="600" fill={arrowGray}>runs in background after ready</text>
    </svg>
  );
}
