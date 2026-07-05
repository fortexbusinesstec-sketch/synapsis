"use client";

export default function Figure4Latency() {
  const w = 1400;
  const h = 900;

  const lifelines = [
    { x: 100, label: "Upload" },
    { x: 255, label: "Orchestrator" },
    { x: 410, label: "OCR" },
    { x: 565, label: "Vision" },
    { x: 720, label: "Chunker" },
    { x: 875, label: "Embedder" },
    { x: 1030, label: "HITL QA" },
    { x: 1185, label: "Curiosity" },
    { x: 1340, label: "Vector DB" },
  ];

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

      {/* ── Lifeline dashed vertical lines ── */}
      {lifelines.map((ll) => (
        <line key={ll.x} x1={ll.x} y1={90} x2={ll.x} y2={820} stroke="#b0b0b0" strokeWidth={1} strokeDasharray="6,4" />
      ))}

      {/* ── Lifeline headers ── */}
      {lifelines.map((ll) => (
        <g key={ll.x}>
          <rect x={ll.x - 70} y={30} width={140} height={44} rx={4} fill="#ffffff" stroke="#000000" strokeWidth={1.5} />
          <text x={ll.x} y={58} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#000000">{ll.label}</text>
        </g>
      ))}

      {/* ── Activation bars ── */}
      <rect x={96} y={125} width={8} height={5} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={251} y={125} width={8} height={330} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={406} y={215} width={8} height={125} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={561} y={240} width={8} height={125} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={716} y={445} width={8} height={100} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={871} y={535} width={8} height={100} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={1026} y={625} width={8} height={130} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={1181} y={745} width={8} height={90} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />
      <rect x={1336} y={825} width={8} height={5} fill="#dddddd" stroke="#999999" strokeWidth={0.5} />

      {/* ── Step 1: Upload → Orchestrator ── */}
      <line x1={100} y1={130} x2={247} y2={130} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={173} y={121} textAnchor="middle" fontSize={16} fill="#000000">document</text>

      {/* ── Step 2a: Orchestrator → OCR ── */}
      <line x1={255} y1={220} x2={402} y2={220} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={328} y={211} textAnchor="middle" fontSize={16} fill="#000000">text extraction</text>

      {/* ── Step 2b: Orchestrator → Vision ── */}
      <line x1={255} y1={245} x2={557} y2={245} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={406} y={236} textAnchor="middle" fontSize={16} fill="#000000">diagram / table detection</text>

      {/* ── Step 3a: OCR → Orchestrator ── */}
      <line x1={410} y1={335} x2={263} y2={335} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={336} y={326} textAnchor="middle" fontSize={16} fill="#000000">extracted text</text>

      {/* ── Step 3b: Vision → Orchestrator ── */}
      <line x1={565} y1={360} x2={263} y2={360} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={414} y={351} textAnchor="middle" fontSize={16} fill="#000000">diagram descriptions</text>

      {/* ── Step 4: Orchestrator → Chunker ── */}
      <line x1={255} y1={450} x2={712} y2={450} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={483} y={441} textAnchor="middle" fontSize={16} fill="#000000">annotated content</text>

      {/* ── Step 5: Chunker → Embedder ── */}
      <line x1={720} y1={540} x2={867} y2={540} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={793} y={531} textAnchor="middle" fontSize={16} fill="#000000">semantic segments</text>

      {/* ── Step 6: Embedder → HITL QA ── */}
      <line x1={875} y1={630} x2={1022} y2={630} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={948} y={621} textAnchor="middle" fontSize={16} fill="#000000">vector embeddings</text>

      {/* ── Step 7a: HITL QA → Orchestrator (feedback, dashed) ── */}
      <line x1={1030} y1={720} x2={263} y2={720} stroke="#000000" strokeWidth={2} strokeDasharray="7,5" markerEnd="url(#arrDashed)" />
      <rect x={540} y={706} width={180} height={28} rx={3} fill="#ffffff" stroke="#999999" strokeWidth={1} />
      <text x={630} y={725} textAnchor="middle" fontSize={16} fill="#000000">correction feedback</text>

      {/* ── Step 7b: HITL QA → Curiosity ── */}
      <line x1={1030} y1={750} x2={1177} y2={750} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={1103} y={741} textAnchor="middle" fontSize={16} fill="#000000">verified entries</text>

      {/* ── Step 8: Curiosity → Vector DB ── */}
      <line x1={1185} y1={830} x2={1332} y2={830} stroke="#000000" strokeWidth={2} markerEnd="url(#arrSolid)" />
      <text x={1258} y={821} textAnchor="middle" fontSize={16} fill="#000000">enriched entries</text>
    </svg>
  );
}
