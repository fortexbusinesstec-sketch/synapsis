interface ArchitectureDiagramProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export default function ArchitectureDiagram({
  primaryColor = "#2563eb",
  secondaryColor = "#dc2626",
}: ArchitectureDiagramProps) {
  return (
    <svg viewBox="0 0 1200 800" width={1200} height={800} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="g-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="g-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={secondaryColor} />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="g-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
        </filter>
        <marker id="arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>

      <rect width={1200} height={800} fill="url(#bg)" rx={16} />

      {/* ─── INDEXING SWARM ─── */}
      <g transform="translate(32, 28)">
        <rect x={0} y={0} width={356} height={290} rx={14} fill="white" stroke="#e2e8f0" filter="url(#sh)" />
        <rect x={0} y={0} width={356} height={48} rx={14} fill="url(#g-blue)" />
        <rect x={0} y={34} width={356} height={14} fill="url(#g-blue)" />
        <text x={178} y={32} textAnchor="middle" fontSize={20} fontWeight="800" fill="white" letterSpacing={0.3}>INDEXING SWARM</text>

        {["Orchestrator", "OCR", "Chunker", "Embedder", "Curioso Agent"].map((label, i) => (
          <g key={label}>
            <rect x={16} y={66 + i * 44} width={324} height={34} rx={6} fill={i === 4 ? "#fef3c7" : "#f8fafc"} stroke="#e2e8f0" />
            <text x={28} y={89 + i * 44} fontSize={15} fontWeight="700" fill="#1e293b">{label}</text>
            {i < 4 && <line x1={178} y1={100 + i * 44} x2={178} y2={110 + i * 44} stroke="#cbd5e1" strokeWidth={2} markerEnd="url(#arr)" />}
          </g>
        ))}
      </g>

      {/* arrow */}
      <line x1={388} y1={173} x2={414} y2={173} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4,3" markerEnd="url(#arr)" />

      {/* ─── CONVERSATIONAL SWARM ─── */}
      <g transform="translate(420, 28)">
        <rect x={0} y={0} width={356} height={290} rx={14} fill="white" stroke="#a7f3d0" filter="url(#sh)" />
        <rect x={0} y={0} width={356} height={48} rx={14} fill="url(#g-green)" />
        <rect x={0} y={34} width={356} height={14} fill="url(#g-green)" />
        <text x={178} y={32} textAnchor="middle" fontSize={20} fontWeight="800" fill="white" letterSpacing={0.3}>CONVERSATIONAL SWARM</text>

        {["Clarificador", "Planificador", "Bibliotecario", "Analista", "Chief Engineer"].map((label, i) => (
          <g key={label}>
            <rect x={16} y={66 + i * 44} width={324} height={34} rx={6} fill={i === 4 ? "#dbeafe" : "#f8fafc"} stroke="#e2e8f0" />
            <text x={28} y={89 + i * 44} fontSize={15} fontWeight="700" fill="#1e293b">{label}</text>
            {i < 4 && <line x1={178} y1={100 + i * 44} x2={178} y2={110 + i * 44} stroke="#cbd5e1" strokeWidth={2} markerEnd="url(#arr)" />}
          </g>
        ))}
      </g>

      {/* arrow */}
      <line x1={776} y1={173} x2={802} y2={173} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4,3" markerEnd="url(#arr)" />

      {/* ─── INFRASTRUCTURE ─── */}
      <g transform="translate(808, 28)">
        <rect x={0} y={0} width={360} height={290} rx={14} fill="white" stroke="#e2e8f0" filter="url(#sh)" />
        <rect x={0} y={0} width={360} height={48} rx={14} fill="url(#g-red)" />
        <rect x={0} y={34} width={360} height={14} fill="url(#g-red)" />
        <text x={180} y={32} textAnchor="middle" fontSize={20} fontWeight="800" fill="white" letterSpacing={0.3}>INFRASTRUCTURE</text>

        {["Turso Vector DB", "Cloudflare R2", "Vercel AI SDK", "Next.js 16", "Drizzle ORM"].map((label) => (
          <g key={label}>
            <rect x={16} y={66} width={328} height={34} rx={6} fill="#f8fafc" stroke="#e2e8f0" />
            <text x={28} y={89} fontSize={15} fontWeight="700" fill="#1e293b">{label}</text>
          </g>
        ))}
      </g>

      {/* ─── HUMAN-IN-THE-LOOP ─── */}
      <g transform="translate(200, 348)">
        <rect x={0} y={0} width={800} height={90} rx={12} fill="white" stroke="#e2e8f0" filter="url(#sh)" />
        <rect x={0} y={0} width={800} height={36} rx={12} fill="#f1f5f9" />
        <rect x={0} y={24} width={800} height={12} fill="#f1f5f9" />
        <text x={400} y={24} textAnchor="middle" fontSize={16} fontWeight="700" fill="#475569" letterSpacing={0.2}>HUMAN-IN-THE-LOOP</text>
        <text x={400} y={62} textAnchor="middle" fontSize={14} fill="#64748b">
          Curioso Agent detects knowledge gaps → Technical Expert reviews and enriches
        </text>
        <text x={400} y={80} textAnchor="middle" fontSize={13} fill="#64748b">
          Enrichment cascade: Dedup → Exact term → Model+term → Semantic
        </text>
      </g>

      {/* ─── DATA FLOW ─── */}
      <g transform="translate(40, 468)">
        <rect x={0} y={0} width={1120} height={80} rx={12} fill="white" stroke="#e2e8f0" filter="url(#sh)" />
        <rect x={0} y={0} width={1120} height={36} rx={12} fill="#f1f5f9" />
        <rect x={0} y={24} width={1120} height={12} fill="#f1f5f9" />
        <text x={560} y={24} textAnchor="middle" fontSize={16} fontWeight="700" fill="#475569" letterSpacing={0.2}>DATA FLOW</text>
        <text x={560} y={58} textAnchor="middle" fontSize={14} fill="#64748b">
          PDF → OCR → Semantic Chunker → Embedder → Turso Vector Store
        </text>
        <text x={560} y={74} textAnchor="middle" fontSize={14} fill="#64748b">
          Query → Clarifier → Planner → Bibliotecario → Analista → Chief Engineer
        </text>
      </g>
    </svg>
  );
}
