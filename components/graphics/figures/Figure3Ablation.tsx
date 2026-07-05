"use client";

/* ── Icon components (24×24 viewport, stroke-based, Lucide-like) ── */

function ScanIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12s2-6 9-6 9 6 9 6-2 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  );
}

function BrainIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4a3.5 3.5 0 0 0-3 5.2 2.5 2.5 0 0 0 .5 4.8h1l.5 2.5" />
      <path d="M12 4a3.5 3.5 0 0 1 3 5.2 2.5 2.5 0 0 1-.5 4.8h-1l-.5 2.5" />
      <path d="M10 18a2 2 0 1 0 0 4h4a2 2 0 1 0 0-4" />
    </g>
  );
}

function NetworkIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <line x1="10" y1="7.5" x2="7" y2="16.5" />
      <line x1="14" y1="7.5" x2="17" y2="16.5" />
    </g>
  );
}

function CutIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
      <line x1="10" y1="10" x2="14" y2="14" />
      <line x1="14" y1="10" x2="10" y2="14" />
    </g>
  );
}

function VectorIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 17h4v-4" />
    </g>
  );
}

function LightbulbIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2v1" />
      <path d="M7 8a5 5 0 0 1 10 0c0 2.2-1.2 3.8-2 5l-1 2H8l-1-2c-.8-1.2-2-2.8-2-5" />
    </g>
  );
}

function CheckIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </g>
  );
}

function DatabaseIcon() {
  return (
    <g stroke="#444444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="7" ry="2.5" />
      <path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </g>
  );
}

function IconWrap({ children, x, y, size = 24 }: { children: React.ReactNode; x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${size / 24})`}>
      {children}
    </g>
  );
}

/* ── Figure component ── */

export default function Figure3IndexingPipeline() {
  const w = 1400;
  const h = 930;

  // Column geometry
  const c1 = { x: 40, w: 380 };   // Stage 1
  const c2 = { x: 455, w: 420 };  // Stage 2
  const c3 = { x: 910, w: 380 };  // Stage 3
  const colY = 50;
  const colH = 530;
  const colB = colY + colH; // 570

  // Box helpers
  const boxR = 6;
  const boxPad = 20;
  const boxStroke = 2;

  // Stage 1 & 2 boxes
  const s12h = 120;
  const s12gap = 30;
  const s12y1 = 105;
  const s12y2 = s12y1 + s12h + s12gap;
  const s12y3 = s12y2 + s12h + s12gap;

  // Stage 3 boxes
  const s3h = 200;
  const s3gap = 40;
  const s3y1 = 105;
  const s3y2 = s3y1 + s3h + s3gap;

  // Horizontal arrow Y (centre of boxes region)
  const arrowY = Math.round((s12y1 + s12y3 + s12h) / 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Helvetica Neue', 'Arial', 'Helvetica', sans-serif" }}>
      <defs>
        <marker id="arrSolid" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0 0 L7 3 L0 6 Z" fill="#000000" />
        </marker>
        <marker id="arrDashed" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0 0 L7 3 L0 6 Z" fill="#000000" />
        </marker>
      </defs>

      <rect width={w} height={h} fill="#ffffff" />

      {/* ═══════════ COLUMN BACKGROUNDS ═══════════ */}
      <rect x={c1.x} y={colY} width={c1.w} height={colH} rx={5} fill="#F0F0F0" stroke="#D8D8D8" strokeWidth={1} />
      <rect x={c2.x} y={colY} width={c2.w} height={colH} rx={5} fill="#FFFFFF" stroke="#D8D8D8" strokeWidth={1} />
      <rect x={c3.x} y={colY} width={c3.w} height={colH} rx={5} fill="#FAFAFA" stroke="#D8D8D8" strokeWidth={1} />

      {/* ═══════════ STAGE TITLES ═══════════ */}
      <text x={c1.x + c1.w / 2} y={78} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#000000">Stage 1 — Textual Extraction</text>
      <text x={c2.x + c2.w / 2} y={78} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#000000">Stage 2 — Semantic Processing</text>
      <text x={c3.x + c3.w / 2} y={78} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#000000">Stage 3 — Quality Control &amp; Enrichment</text>

      {/* ═══════════ STAGE 1 BOXES ═══════════ */}
      {/* Box 1 — OCR Agent */}
      <rect x={c1.x + boxPad} y={s12y1} width={c1.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c1.x + boxPad + 20} y={s12y1 + s12h / 2} size={22}><ScanIcon /></IconWrap>
      <text x={c1.x + boxPad + 50} y={s12y1 + 44} fontSize={20} fontWeight="bold" fill="#000000">OCR Agent</text>
      <text x={c1.x + boxPad + 50} y={s12y1 + 74} fontSize={16} fill="#444444">Mistral OCR — layout preservation</text>

      {/* Box 2 — Vision Processing Agent */}
      <rect x={c1.x + boxPad} y={s12y2} width={c1.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c1.x + boxPad + 20} y={s12y2 + s12h / 2} size={22}><EyeIcon /></IconWrap>
      <text x={c1.x + boxPad + 50} y={s12y2 + 44} fontSize={20} fontWeight="bold" fill="#000000">Vision Processing Agent</text>
      <text x={c1.x + boxPad + 50} y={s12y2 + 74} fontSize={16} fill="#444444">Pixtral-12B — diagram / table detection</text>

      {/* Box 3 — Orchestration Agent */}
      <rect x={c1.x + boxPad} y={s12y3} width={c1.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c1.x + boxPad + 20} y={s12y3 + s12h / 2} size={22}><BrainIcon /></IconWrap>
      <text x={c1.x + boxPad + 50} y={s12y3 + 44} fontSize={20} fontWeight="bold" fill="#000000">Orchestration Agent</text>
      <text x={c1.x + boxPad + 50} y={s12y3 + 74} fontSize={16} fill="#444444">task scheduling, error recovery</text>

      {/* ═══════════ STAGE 2 BOXES ═══════════ */}
      {/* Box 1 — Diagram Reasoning Agent */}
      <rect x={c2.x + boxPad} y={s12y1} width={c2.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c2.x + boxPad + 20} y={s12y1 + s12h / 2} size={22}><NetworkIcon /></IconWrap>
      <text x={c2.x + boxPad + 50} y={s12y1 + 44} fontSize={20} fontWeight="bold" fill="#000000">Diagram Reasoning Agent</text>
      <text x={c2.x + boxPad + 50} y={s12y1 + 74} fontSize={16} fill="#444444">node-edge extraction, circuit topology</text>

      {/* Box 2 — Semantic Chunking Agent */}
      <rect x={c2.x + boxPad} y={s12y2} width={c2.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c2.x + boxPad + 20} y={s12y2 + s12h / 2} size={22}><CutIcon /></IconWrap>
      <text x={c2.x + boxPad + 50} y={s12y2 + 44} fontSize={20} fontWeight="bold" fill="#000000">Semantic Chunking Agent</text>
      <text x={c2.x + boxPad + 50} y={s12y2 + 74} fontSize={16} fill="#444444">500 tokens, 50-token overlap</text>

      {/* Box 3 — Embedding Agent */}
      <rect x={c2.x + boxPad} y={s12y3} width={c2.w - 2 * boxPad} height={s12h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c2.x + boxPad + 20} y={s12y3 + s12h / 2} size={22}><VectorIcon /></IconWrap>
      <text x={c2.x + boxPad + 50} y={s12y3 + 44} fontSize={20} fontWeight="bold" fill="#000000">Embedding Agent</text>
      <text x={c2.x + boxPad + 50} y={s12y3 + 68} fontSize={16} fill="#444444">text-embedding-3-small</text>
      <text x={c2.x + boxPad + 50} y={s12y3 + 90} fontSize={16} fill="#666666">1536-dim vectors</text>

      {/* ═══════════ STAGE 3 BOXES ═══════════ */}
      {/* Box 1 — HITL Quality Assurance Agent (top, so feedback arrows arc above boxes) */}
      <rect x={c3.x + boxPad} y={s3y1} width={c3.w - 2 * boxPad} height={s3h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c3.x + boxPad + 20} y={s3y1 + 50} size={24}><CheckIcon /></IconWrap>
      <text x={c3.x + boxPad + 52} y={s3y1 + 54} fontSize={20} fontWeight="bold" fill="#000000">HITL Quality Assurance</text>
      <text x={c3.x + boxPad + 52} y={s3y1 + 90} fontSize={16} fill="#444444">expert verification</text>
      <text x={c3.x + boxPad + 52} y={s3y1 + 118} fontSize={16} fill="#666666">OCR correction, safety</text>
      <text x={c3.x + boxPad + 52} y={s3y1 + 140} fontSize={16} fill="#666666">annotation</text>

      {/* Box 2 — Curiosity Agent */}
      <rect x={c3.x + boxPad} y={s3y2} width={c3.w - 2 * boxPad} height={s3h} rx={boxR} fill="#FFFFFF" stroke="#000000" strokeWidth={boxStroke} />
      <IconWrap x={c3.x + boxPad + 20} y={s3y2 + 50} size={24}><LightbulbIcon /></IconWrap>
      <text x={c3.x + boxPad + 52} y={s3y2 + 54} fontSize={20} fontWeight="bold" fill="#000000">Curiosity Agent</text>
      <text x={c3.x + boxPad + 52} y={s3y2 + 90} fontSize={16} fill="#444444">gap detection</text>
      <text x={c3.x + boxPad + 52} y={s3y2 + 118} fontSize={16} fill="#666666">acronyms, error codes,</text>
      <text x={c3.x + boxPad + 52} y={s3y2 + 140} fontSize={16} fill="#666666">undefined concepts</text>

      {/* ═══════════ FLOW ARROWS ═══════════ */}
      {/* Stage 1 → Stage 2 */}
      <line x1={c1.x + c1.w} y1={arrowY} x2={c2.x} y2={arrowY} stroke="#000000" strokeWidth={2.5} markerEnd="url(#arrSolid)" />

      {/* Stage 2 → Stage 3 */}
      <line x1={c2.x + c2.w} y1={arrowY} x2={c3.x} y2={arrowY} stroke="#000000" strokeWidth={2.5} markerEnd="url(#arrSolid)" />

      {/* Stage 3 → Final Block */}
      <line x1={c3.x + c3.w / 2} y1={colB} x2={c3.x + c3.w / 2} y2={colB + 35} stroke="#000000" strokeWidth={2.5} markerEnd="url(#arrSolid)" />

      {/* ═══════════ DASHED FEEDBACK ARROWS (HITL ⇢ Stage 1 / Stage 2) ═══════════ */}
      {/* HITL → Stage 1 — angular Γ-path: left to column edge, down to gap below columns,
          left to Stage-1 left edge, up to box gap, right into stage centre */}
      <path d={`M ${c3.x + boxPad} ${s3y1 + s3h / 2} L ${c3.x} ${s3y1 + s3h / 2} L ${c3.x} ${colB + 10} L ${c1.x} ${colB + 10} L ${c1.x} ${s12y1 + s12h + s12gap / 2} L ${c1.x + c1.w / 2} ${s12y1 + s12h + s12gap / 2}`} stroke="#000000" strokeWidth={2} strokeDasharray="7,5" fill="none" markerEnd="url(#arrDashed)" />
      <rect x={180} y={colB + 10 - 14} width={150} height={28} rx={3} fill="#FFFFFF" stroke="#CCCCCC" strokeWidth={1} />
      <text x={255} y={colB + 10 + 5} textAnchor="middle" fontSize={16} fill="#000000">Feedback — correction</text>

      {/* HITL → Stage 2 */}
      <path d={`M ${c3.x + boxPad} ${s3y1 + s3h / 2} L ${c3.x} ${s3y1 + s3h / 2} L ${c3.x} ${colB + 10} L ${c2.x} ${colB + 10} L ${c2.x} ${s12y1 + s12h + s12gap / 2} L ${c2.x + c2.w / 2} ${s12y1 + s12h + s12gap / 2}`} stroke="#000000" strokeWidth={2} strokeDasharray="7,5" fill="none" markerEnd="url(#arrDashed)" />
      <rect x={580} y={colB + 10 - 14} width={170} height={28} rx={3} fill="#FFFFFF" stroke="#CCCCCC" strokeWidth={1} />
      <text x={665} y={colB + 10 + 5} textAnchor="middle" fontSize={16} fill="#000000">Feedback — verification</text>

      {/* ═══════════ FINAL BLOCK ═══════════ */}
      <rect x={c1.x} y={colB + 35} width={c3.x + c3.w - c1.x} height={130} rx={7} fill="#E0E0E0" />
      <IconWrap x={(c1.x + c3.x + c3.w) / 2} y={colB + 55} size={28}><DatabaseIcon /></IconWrap>
      <text x={(c1.x + c3.x + c3.w) / 2} y={colB + 88} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#000000">Vector Knowledge Base — Turso (LibSQL)</text>
      <text x={(c1.x + c3.x + c3.w) / 2} y={colB + 128} textAnchor="middle" fontSize={16} fill="#333333">3,070 chunks · 839 images · 385 enrichments · 100% verified</text>

      {/* ═══════════ LEGEND ═══════════ */}
      <rect x={365} y={760} width={600} height={140} rx={5} fill="#FFFFFF" stroke="#BBBBBB" strokeWidth={1.5} />
      <text x={665} y={790} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#000000">Legend</text>

      <line x1={420} y1={828} x2={470} y2={828} stroke="#000000" strokeWidth={2.5} markerEnd="url(#arrSolid)" />
      <text x={485} y={833} fontSize={14} fill="#000000">Data flow (main pipeline)</text>

      <line x1={420} y1={870} x2={470} y2={870} stroke="#000000" strokeWidth={2} strokeDasharray="7,5" markerEnd="url(#arrDashed)" />
      <text x={485} y={875} fontSize={14} fill="#000000">HITL feedback loop (quality correction)</text>
    </svg>
  );
}
