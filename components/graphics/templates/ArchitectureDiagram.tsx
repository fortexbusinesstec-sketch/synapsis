interface IndexingPipelineProps {
  primaryColor?: string;
}

export default function IndexingPipeline({ primaryColor = "#2563eb" }: IndexingPipelineProps) {
  return (
    <svg
      viewBox="0 0 1200 920"
      width={1200}
      height={920}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#f0f0f0" />
        </linearGradient>
        <filter id="sh" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
        </filter>
        <marker id="arr-solid" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#334155" />
        </marker>
        <marker id="arr-dashed" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#64748b" />
        </marker>
      </defs>

      <rect width={1200} height={920} fill="url(#bg)" rx={16} />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STAGE 1 — TEXTUAL EXTRACTION                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <g transform="translate(30, 30)">
        <rect
          x={0}
          y={0}
          width={360}
          height={520}
          rx={12}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={1}
          filter="url(#sh)"
        />
        <rect x={0} y={0} width={360} height={60} rx={12} fill="#e2e8f0" />
        <rect x={0} y={46} width={360} height={14} fill="#e2e8f0" />
        <text x={180} y={40} textAnchor="middle" fontSize={30} fontWeight="700" fill="#1e293b">
          Stage 1 — Textual Extraction
        </text>

        {/* OCR Agent */}
        <rect
          x={20}
          y={80}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={125} fontSize={40} fontWeight="700" fill="#0f172a">
          OCR Agent
        </text>
        <text x={60} y={165} fontSize={20} fill="#64748b">
          Mistral OCR — layout preservation
        </text>
        <circle cx={42} cy={112} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={118} textAnchor="middle" fontSize={18} fill="#64748b">
          📄
        </text>

        <line
          x1={180}
          y1={200}
          x2={180}
          y2={220}
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="6,4"
          markerEnd="url(#arr-dashed)"
        />

        {/* Vision Processing Agent */}
        <rect
          x={20}
          y={230}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={275} fontSize={40} fontWeight="700" fill="#0f172a">
          Vision Processing Agent
        </text>
        <text x={60} y={315} fontSize={20} fill="#64748b">
          Pixtral-12B — diagram / table detection
        </text>
        <circle cx={42} cy={262} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={268} textAnchor="middle" fontSize={18} fill="#64748b">
          👁
        </text>

        <line
          x1={180}
          y1={350}
          x2={180}
          y2={370}
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="6,4"
          markerEnd="url(#arr-dashed)"
        />

        {/* Orchestration Agent */}
        <rect
          x={20}
          y={380}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={425} fontSize={40} fontWeight="700" fill="#0f172a">
          Orchestration Agent
        </text>
        <text x={60} y={465} fontSize={20} fill="#64748b">
          task scheduling, error recovery
        </text>
        <circle cx={42} cy={412} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={418} textAnchor="middle" fontSize={18} fill="#64748b">
          ⚙
        </text>
      </g>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STAGE 2 — SEMANTIC PROCESSING                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <g transform="translate(420, 30)">
        <rect
          x={0}
          y={0}
          width={360}
          height={520}
          rx={12}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={1}
          filter="url(#sh)"
        />
        <rect x={0} y={0} width={360} height={60} rx={12} fill="#e2e8f0" />
        <rect x={0} y={46} width={360} height={14} fill="#e2e8f0" />
        <text x={180} y={40} textAnchor="middle" fontSize={30} fontWeight="700" fill="#1e293b">
          Stage 2 — Semantic Processing
        </text>

        {/* Diagram Reasoning Agent */}
        <rect
          x={20}
          y={80}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={125} fontSize={40} fontWeight="700" fill="#0f172a">
          Diagram Reasoning Agent
        </text>
        <text x={60} y={165} fontSize={20} fill="#64748b">
          node-edge extraction, circuit topology
        </text>
        <circle cx={42} cy={112} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={118} textAnchor="middle" fontSize={18} fill="#64748b">
          🔗
        </text>

        <line
          x1={180}
          y1={200}
          x2={180}
          y2={220}
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="6,4"
          markerEnd="url(#arr-dashed)"
        />

        {/* Semantic Chunking Agent */}
        <rect
          x={20}
          y={230}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={275} fontSize={40} fontWeight="700" fill="#0f172a">
          Semantic Chunking Agent
        </text>
        <text x={60} y={315} fontSize={20} fill="#64748b">
          500 tokens, 50-token overlap
        </text>
        <circle cx={42} cy={262} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={268} textAnchor="middle" fontSize={18} fill="#64748b">
          ✂️
        </text>

        <line
          x1={180}
          y1={350}
          x2={180}
          y2={370}
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="6,4"
          markerEnd="url(#arr-dashed)"
        />

        {/* Embedding Agent */}
        <rect
          x={20}
          y={380}
          width={320}
          height={120}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={425} fontSize={40} fontWeight="700" fill="#0f172a">
          Embedding Agent
        </text>
        <text x={60} y={465} fontSize={20} fill="#64748b">
          text-embedding-3-small · 1536-dim vectors
        </text>
        <circle cx={42} cy={412} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={418} textAnchor="middle" fontSize={18} fill="#64748b">
          📊
        </text>
      </g>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STAGE 3 — QUALITY CONTROL & ENRICHMENT                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <g transform="translate(810, 30)">
        <rect
          x={0}
          y={0}
          width={360}
          height={520}
          rx={12}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={1}
          filter="url(#sh)"
        />
        <rect x={0} y={0} width={360} height={60} rx={12} fill="#e2e8f0" />
        <rect x={0} y={46} width={360} height={14} fill="#e2e8f0" />
        <text x={180} y={40} textAnchor="middle" fontSize={30} fontWeight="700" fill="#1e293b">
          Stage 3 — Quality Control & Enrichment
        </text>

        {/* HITL Quality Assurance */}
        <rect
          x={20}
          y={80}
          width={320}
          height={140}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={125} fontSize={40} fontWeight="700" fill="#0f172a">
          HITL Quality Assurance
        </text>
        <text x={60} y={165} fontSize={20} fill="#64748b">
          expert verification
        </text>
        <text x={60} y={190} fontSize={20} fill="#64748b">
          OCR correction, safety annotation
        </text>
        <circle cx={42} cy={112} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={118} textAnchor="middle" fontSize={18} fill="#64748b">
          ✓
        </text>

        <line
          x1={180}
          y1={220}
          x2={180}
          y2={240}
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="6,4"
          markerEnd="url(#arr-dashed)"
        />

        {/* Curiosity Agent */}
        <rect
          x={20}
          y={260}
          width={320}
          height={200}
          rx={8}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          filter="url(#sh)"
        />
        <text x={60} y={305} fontSize={40} fontWeight="700" fill="#0f172a">
          Curiosity Agent
        </text>
        <text x={60} y={345} fontSize={20} fill="#64748b">
          gap detection
        </text>
        <text x={60} y={375} fontSize={20} fill="#64748b">
          acronyms, error codes
        </text>
        <text x={60} y={405} fontSize={20} fill="#64748b">
          undefined concepts
        </text>
        <circle cx={42} cy={292} r={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />
        <text x={42} y={298} textAnchor="middle" fontSize={18} fill="#64748b">
          💡
        </text>
      </g>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INTER-STAGE ARROWS (main pipeline)                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <line
        x1={390}
        y1={290}
        x2={420}
        y2={290}
        stroke="#334155"
        strokeWidth={3}
        markerEnd="url(#arr-solid)"
      />
      <line
        x1={780}
        y1={290}
        x2={810}
        y2={290}
        stroke="#334155"
        strokeWidth={3}
        markerEnd="url(#arr-solid)"
      />
      <line
        x1={990}
        y1={420}
        x2={990}
        y2={560}
        stroke="#334155"
        strokeWidth={3}
        markerEnd="url(#arr-solid)"
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FEEDBACK LOOPS (dashed)                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <line
        x1={830}
        y1={580}
        x2={390}
        y2={580}
        stroke="#64748b"
        strokeWidth={2.5}
        strokeDasharray="8,5"
        markerEnd="url(#arr-dashed)"
      />
      <rect
        x={510}
        y={564}
        width={190}
        height={34}
        rx={6}
        fill="white"
        stroke="#94a3b8"
        strokeWidth={1}
      />
      <text x={605} y={587} textAnchor="middle" fontSize={18} fontWeight="600" fill="#475569">
        Feedback — correction
      </text>

      <line
        x1={830}
        y1={610}
        x2={600}
        y2={610}
        stroke="#64748b"
        strokeWidth={2.5}
        strokeDasharray="8,5"
        markerEnd="url(#arr-dashed)"
      />
      <rect
        x={640}
        y={594}
        width={190}
        height={34}
        rx={6}
        fill="white"
        stroke="#94a3b8"
        strokeWidth={1}
      />
      <text x={735} y={617} textAnchor="middle" fontSize={18} fontWeight="600" fill="#475569">
        Feedback — verification
      </text>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VECTOR KNOWLEDGE BASE                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <g transform="translate(30, 640)">
        <rect
          x={0}
          y={0}
          width={1140}
          height={130}
          rx={12}
          fill="#e2e8f0"
          stroke="#cbd5e1"
          strokeWidth={1}
          filter="url(#sh)"
        />
        <text x={570} y={50} textAnchor="middle" fontSize={32} fill="#475569">
          🗄
        </text>
        <text x={570} y={85} textAnchor="middle" fontSize={28} fontWeight="700" fill="#1e293b">
          Vector Knowledge Base — Turso (LibSQL)
        </text>
        <text x={570} y={115} textAnchor="middle" fontSize={20} fill="#64748b">
          3,070 chunks · 839 images · 385 enrichments · 98.7% verified
        </text>
      </g>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEGEND — CENTRADA BAJO TODA LA FIGURA (x=30, width=1140)       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <g transform="translate(30, 790)">
        <rect
          x={0}
          y={0}
          width={1140}
          height={100}
          rx={10}
          fill="white"
          stroke="#cbd5e1"
          strokeWidth={1}
          filter="url(#sh)"
        />
        <text x={570} y={40} textAnchor="middle" fontSize={24} fontWeight="700" fill="#1e293b">
          Legend
        </text>

        <line
          x1={200}
          y1={70}
          x2={270}
          y2={70}
          stroke="#334155"
          strokeWidth={3}
          markerEnd="url(#arr-solid)"
        />
        <text x={290} y={76} fontSize={20} fontWeight="600" fill="#475569">
          Data flow (main pipeline)
        </text>

        <line
          x1={600}
          y1={70}
          x2={670}
          y2={70}
          stroke="#64748b"
          strokeWidth={2.5}
          strokeDasharray="8,5"
          markerEnd="url(#arr-dashed)"
        />
        <text x={690} y={76} fontSize={20} fontWeight="600" fill="#475569">
          HITL feedback loop (quality correction)
        </text>
      </g>
    </svg>
  );
}
