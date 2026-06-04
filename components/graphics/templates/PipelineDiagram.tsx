interface PipelineDiagramProps {
  primaryColor?: string;
}

export default function PipelineDiagram({
  primaryColor = "#2563eb",
}: PipelineDiagramProps) {
  const indexNodes = [
    { id: "pdf", label: "PDF", sub: "Upload", x: 80, y: 280, w: 130, h: 78, color: "#f1f5f9", textColor: "#475569" },
    { id: "ocr", label: "OCR", sub: "Text + Images", x: 270, y: 280, w: 140, h: 78, color: "#dbeafe", textColor: "#1e40af" },
    { id: "chunk", label: "Chunker", sub: "Segments", x: 470, y: 280, w: 130, h: 78, color: "#dbeafe", textColor: "#1e40af" },
    { id: "embed", label: "Embedder", sub: "Vectors", x: 660, y: 280, w: 130, h: 78, color: "#dbeafe", textColor: "#1e40af" },
    { id: "turso", label: "Turso DB", sub: "Store + Search", x: 850, y: 280, w: 140, h: 78, color: "#fef3c7", textColor: "#92400e" },
  ];

  const agentNodes = [
    { id: "user", label: "User", sub: "Query", x: 80, y: 56, w: 130, h: 78, color: "#f1f5f9", textColor: "#475569" },
    { id: "clar", label: "Clarifier", sub: "Intent", x: 270, y: 56, w: 140, h: 78, color: "#dcfce7", textColor: "#166534" },
    { id: "plan", label: "Planner", sub: "Strategy", x: 470, y: 56, w: 130, h: 78, color: "#dcfce7", textColor: "#166534" },
    { id: "bibl", label: "Bibliotecario", sub: "Search ×3", x: 660, y: 56, w: 140, h: 78, color: "#dcfce7", textColor: "#166534" },
    { id: "chief", label: "Chief Eng.", sub: "GPT-4o", x: 850, y: 56, w: 140, h: 78, color: "#fae8ff", textColor: "#86198f" },
  ];

  return (
    <svg viewBox="0 0 1200 800" width={1200} height={800} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
        </filter>
        <marker id="arr-blue" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={primaryColor} />
        </marker>
        <marker id="arr-gray" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>

      <rect width={1200} height={800} fill="url(#bg)" rx={16} />

      {/* divider line */}
      <line x1={40} y1={175} x2={1160} y2={175} stroke="#e2e8f0" strokeWidth={2} strokeDasharray="6,4" />

      {/* ─── CONVERSATIONAL SWARM ─── */}
      <rect x={40} y={24} width={1120} height={34} rx={10} fill="#dcfce7" stroke="#a7f3d0" strokeWidth={1.5} />
      <text x={600} y={47} textAnchor="middle" fontSize={18} fontWeight="800" fill="#166534" letterSpacing={0.3}>CONVERSATIONAL SWARM</text>

      {agentNodes.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill={n.color} stroke={n.id === "chief" ? "#d946ef" : "#e2e8f0"} strokeWidth={1.5} filter="url(#sh)" />
          {n.id === "chief" && (
            <rect x={n.x + 4} y={n.y + 4} width={n.w - 8} height={n.h - 8} rx={8} fill="none" stroke="#d946ef" strokeWidth={1.5} strokeDasharray="4,3" />
          )}
          <text x={n.x + n.w / 2} y={n.y + 34} textAnchor="middle" fontSize={16} fontWeight="700" fill={n.textColor}>{n.label}</text>
          <text x={n.x + n.w / 2} y={n.y + 58} textAnchor="middle" fontSize={13} fontWeight="500" fill={n.textColor}>{n.sub}</text>
        </g>
      ))}

      {[{ from: "user", to: "clar" }, { from: "clar", to: "plan" }, { from: "plan", to: "bibl" }, { from: "bibl", to: "chief" }].map(({ from, to }) => {
        const f = agentNodes.find((n) => n.id === from)!;
        const t = agentNodes.find((n) => n.id === to)!;
        return (
          <line key={`${from}-${to}`} x1={f.x + f.w} y1={f.y + f.h / 2} x2={t.x} y2={t.y + t.h / 2} stroke="#94a3b8" strokeWidth={2.5} markerEnd="url(#arr-gray)" />
        );
      })}

      {/* loop arrow */}
      <path d="M 920 134 L 920 210" stroke="#10b981" strokeWidth={3} strokeDasharray="6,4" markerEnd="url(#arr-gray)" />
      <text x={930} y={178} fontSize={14} fontWeight="700" fill="#047857">Loop if gap</text>

      {/* ─── INDEXING SWARM ─── */}
      <rect x={40} y={234} width={1120} height={34} rx={10} fill="#dbeafe" stroke="#bfdbfe" strokeWidth={1.5} />
      <text x={600} y={257} textAnchor="middle" fontSize={18} fontWeight="800" fill="#1e40af" letterSpacing={0.3}>INDEXING SWARM</text>

      {indexNodes.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill={n.color} stroke="#e2e8f0" strokeWidth={1.5} filter="url(#sh)" />
          <text x={n.x + n.w / 2} y={n.y + 34} textAnchor="middle" fontSize={16} fontWeight="700" fill={n.textColor}>{n.label}</text>
          <text x={n.x + n.w / 2} y={n.y + 58} textAnchor="middle" fontSize={13} fontWeight="500" fill={n.textColor}>{n.sub}</text>
        </g>
      ))}

      {indexNodes.slice(0, -1).map((_, i) => (
        <line key={`n${i}`} x1={indexNodes[i].x + indexNodes[i].w} y1={indexNodes[i].y + indexNodes[i].h / 2} x2={indexNodes[i + 1].x} y2={indexNodes[i + 1].y + indexNodes[i + 1].h / 2} stroke={primaryColor} strokeWidth={2.5} markerEnd="url(#arr-blue)" />
      ))}

      {/* ─── CURIOUS AGENT ─── */}
      <rect x={280} y={396} width={640} height={80} rx={10} fill="#fffbeb" stroke="#fde68a" strokeWidth={2} filter="url(#sh)" />
      <text x={600} y={422} textAnchor="middle" fontSize={16} fontWeight="700" fill="#92400e">CURIOUS AGENT — Gap Detection</text>
      <text x={600} y={446} textAnchor="middle" fontSize={14} fill="#b45309">
        Reads chunks + images → Detects gaps → Enrichment cascade (4 levels)
      </text>
      <text x={600} y={462} textAnchor="middle" fontSize={13} fill="#b45309">
        Dedup → Exact term → Model+term → Semantic
      </text>

      <line x1={600} y1={358} x2={600} y2={396} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6,4" markerEnd="url(#arr-gray)" />

      {/* ─── SCORING ─── */}
      <rect x={200} y={510} width={800} height={80} rx={10} fill="white" stroke="#e2e8f0" strokeWidth={1.5} filter="url(#sh)" />
      <text x={600} y={540} textAnchor="middle" fontSize={16} fontWeight="700" fill="#475569">COMPOSITE SCORING</text>
      <text x={600} y={566} textAnchor="middle" fontSize={15} fontFamily="'JetBrains Mono', 'Fira Code', monospace" fontWeight="600" fill="#1e293b">
        Score = 0.6·sim + 0.2·warning + 0.2·enrichment
      </text>
      <text x={600} y={582} textAnchor="middle" fontSize={12} fill="#64748b">
        Stop: confidence &gt; 0.85 · no new gaps · max 3 iterations
      </text>
    </svg>
  );
}
