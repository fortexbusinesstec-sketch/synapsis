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

  /* Swimlane 1 — Input */
  const s1y = 35;
  const s1h = 110;
  const s1cy = s1y + s1h / 2;

  /* Swimlane 2 — Preprocessing */
  const s2y = 165;
  const s2h = 195;
  const s2cy = s2y + s2h / 2;

  /* Swimlane 3 — Output */
  const s3y = 380;
  const s3h = 140;
  const s3cy = s3y + s3h / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={arrowGray} />
        </marker>
        <marker id="arrNavy" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6" fill={primaryColor} />
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
      {/* Label */}
      <rect x={28} y={s1y} width={90} height={s1h} rx={8} fill={inputColor} />
      <rect x={28} y={s1y} width={80} height={s1h} fill={inputColor} />
      <text x={73} y={s1cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s1cy})`} letterSpacing={1}>INPUT</text>

      {/* Card */}
      <rect x={118} y={s1y} width={1182} height={s1h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      {/* Blocks */}
      {/* PDF Manuals */}
      <rect x={320} y={s1y + 22} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={338} y={s1cy} size={20}><PdfIcon /></IconWrap>
      <text x={368} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">PDF Manuals</text>

      <line x1={500} y1={s1cy} x2={550} y2={s1cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Images */}
      <rect x={550} y={s1y + 22} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={568} y={s1cy} size={20}><ImageIcon /></IconWrap>
      <text x={598} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">Images</text>

      <line x1={730} y1={s1cy} x2={780} y2={s1cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Tables */}
      <rect x={780} y={s1y + 22} width={180} height={66} rx={6} fill={inputColor} />
      <IconWrap x={798} y={s1cy} size={20}><TableIcon /></IconWrap>
      <text x={828} y={s1cy + 5} fontSize={14} fontWeight="700" fill="white">Tables</text>

      {/* ═══════════════════ SWIMLANE 2: PREPROCESSING ═══════════════════ */}
      {/* Label */}
      <rect x={28} y={s2y} width={90} height={s2h} rx={8} fill={primaryColor} />
      <rect x={28} y={s2y} width={80} height={s2h} fill={primaryColor} />
      <text x={73} y={s2cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s2cy})`} letterSpacing={1}>PREPROCESSING</text>

      {/* Card */}
      <rect x={118} y={s2y} width={1182} height={s2h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      {/* Mistral OCR — large, amber border */}
      <rect x={280} y={s2y + 32} width={340} height={130} rx={8} fill={primaryColor} stroke={amberColor} strokeWidth={3} />
      <rect x={280} y={s2y + 32} width={340} height={130} rx={8} fill={primaryColor} />
      <IconWrap x={310} y={s2cy} size={28}><ScanIcon /></IconWrap>
      <text x={348} y={s2cy - 6} fontSize={17} fontWeight="800" fill={amberColor}>Mistral OCR</text>
      <text x={348} y={s2cy + 16} fontSize={12} fontWeight="600" fill="rgba(255,255,255,0.7)">Vision · Layout · Math</text>

      {/* OCR → Vision */}
      <line x1={620} y1={s2cy} x2={670} y2={s2cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Vision */}
      <rect x={670} y={s2y + 52} width={200} height={90} rx={6} fill={primaryColor} />
      <IconWrap x={690} y={s2cy} size={24}><EyeIcon /></IconWrap>
      <text x={724} y={s2cy + 5} fontSize={16} fontWeight="700" fill="white">Vision</text>

      {/* Vision → Chunking */}
      <line x1={870} y1={s2cy} x2={920} y2={s2cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Chunking */}
      <rect x={920} y={s2y + 52} width={200} height={90} rx={6} fill={primaryColor} />
      <IconWrap x={940} y={s2cy} size={24}><CutIcon /></IconWrap>
      <text x={974} y={s2cy + 5} fontSize={16} fontWeight="700" fill="white">Chunking</text>

      {/* ═══════════════════ SWIMLANE 3: OUTPUT ═══════════════════ */}
      {/* Label */}
      <rect x={28} y={s3y} width={90} height={s3h} rx={8} fill={outputGray} />
      <rect x={28} y={s3y} width={80} height={s3h} fill={outputGray} />
      <text x={73} y={s3cy} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" transform={`rotate(-90, 73, ${s3cy})`} letterSpacing={1}>OUTPUT</text>

      {/* Card */}
      <rect x={118} y={s3y} width={1182} height={s3h} rx={8} fill="white" stroke="#D4D4D4" strokeWidth={1} />

      {/* Cloudflare R2 — archival, gray */}
      <rect x={200} y={s3y + 25} width={180} height={90} rx={6} fill={inputColor} />
      <IconWrap x={220} y={s3cy} size={22}><CloudIcon /></IconWrap>
      <text x={252} y={s3cy - 4} fontSize={14} fontWeight="700" fill="white">Cloudflare</text>
      <text x={252} y={s3cy + 14} fontSize={13} fontWeight="600" fill="rgba(255,255,255,0.7)">R2 (archival)</text>

      {/* R2 → Embedding */}
      <line x1={380} y1={s3cy} x2={420} y2={s3cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Embedding */}
      <rect x={420} y={s3y + 25} width={180} height={90} rx={6} fill={primaryColor} />
      <IconWrap x={440} y={s3cy} size={22}><VectorIcon /></IconWrap>
      <text x={476} y={s3cy + 5} fontSize={15} fontWeight="700" fill="white">Embedding</text>

      {/* Embedding → Vector DB */}
      <line x1={600} y1={s3cy} x2={640} y2={s3cy} stroke={arrowGray} strokeWidth={2} markerEnd="url(#arr)" />

      {/* Vector DB */}
      <rect x={640} y={s3y + 20} width={210} height={100} rx={7} fill={primaryColor} />
      <IconWrap x={662} y={s3cy} size={24}><DatabaseIcon /></IconWrap>
      <text x={698} y={s3cy + 5} fontSize={15} fontWeight="700" fill="white">Vector DB</text>

      {/* Vector DB ↔ HITL QA — bidirectional dashed */}
      <line x1={850} y1={s3cy} x2={890} y2={s3cy} stroke={amberColor} strokeWidth={2} strokeDasharray="5,3" markerEnd="url(#arrAmber)" markerStart="url(#arrStart)" />

      {/* HITL QA pill */}
      <rect x={890} y={s3y + 40} width={180} height={60} rx={30} fill={amberColor} />
      <IconWrap x={910} y={s3cy} size={22}><CheckIcon /></IconWrap>
      <text x={944} y={s3cy + 5} fontSize={15} fontWeight="700" fill="white">HITL QA</text>

      {/* ═══════════════════ DASHED ARROW: Input → Cloudflare R2 ═══════════════════ */}
      {/* From bottom of PDF Manuals block down to R2 */}
      <path d="M 410 133 Q 410 180 380 200 L 290 200 Q 260 200 260 230 L 260 380" stroke={arrowGray} strokeWidth={1.5} strokeDasharray="6,4" fill="none" markerEnd="url(#arr)" />
      <text x={265} y={260} fontSize={11} fontWeight="500" fill={arrowGray} transform="rotate(-90, 265, 260)">archival</text>

      {/* ═══════════════════ DOWN ARROW: Input → Preprocessing ═══════════════════ */}
      <line x1={664} y1={s1y + s1h} x2={664} y2={s2y} stroke={arrowGray} strokeWidth={1.5} markerEnd="url(#arr)" />

      {/* ═══════════════════ DOWN ARROW: Preprocessing → Output ═══════════════════ */}
      <line x1={664} y1={s2y + s2h} x2={664} y2={s3y} stroke={arrowGray} strokeWidth={1.5} markerEnd="url(#arr)" />
    </svg>
  );
}
