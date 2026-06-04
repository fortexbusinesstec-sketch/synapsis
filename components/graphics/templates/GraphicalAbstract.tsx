interface GraphicalAbstractProps {
  primaryColor?: string;
}

export default function GraphicalAbstract({
  primaryColor = "#2563eb",
}: GraphicalAbstractProps) {
  const w = 1328;
  const h = 531;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="g-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="g-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="g-violet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
        </filter>
        <marker id="arr-blue" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="#60a5fa" />
        </marker>
        <marker id="arr-emerald" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="#34d399" />
        </marker>
        <marker id="arr-violet" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="#a78bfa" />
        </marker>
      </defs>

      <rect width={w} height={h} fill="url(#bg)" rx={0} />

      {/* ─── SECTION 1: INPUT ─── */}
      <g transform="translate(36, 36)">
        <rect x={0} y={0} width={180} height={459} rx={14} fill="white" stroke="#e2e8f0" strokeWidth={1.5} filter="url(#sh)" />
        <rect x={0} y={0} width={180} height={44} rx={14} fill="url(#g-blue)" />
        <rect x={0} y={30} width={180} height={14} fill="url(#g-blue)" />
        <text x={90} y={29} textAnchor="middle" fontSize={18} fontWeight="800" fill="white" letterSpacing={0.5}>INPUT</text>

        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={36 + i * 2} y={68 + i * 8} width={108} height={90} rx={5} fill={i === 0 ? "#e2e8f0" : "#f1f5f9"} stroke="#cbd5e1" strokeWidth={1} />
            {i === 0 && (
              <>
                <rect x={48} y={84} width={84} height={5} rx={1.5} fill={primaryColor} opacity={0.35} />
                <rect x={48} y={96} width={64} height={5} rx={1.5} fill={primaryColor} opacity={0.2} />
                <rect x={48} y={108} width={74} height={5} rx={1.5} fill={primaryColor} opacity={0.2} />
                <rect x={48} y={126} width={36} height={20} rx={3} fill={primaryColor} opacity={0.08} />
                <text x={66} y={140} fontSize={9} fill={primaryColor} fontWeight="700" opacity={0.5}>PDF</text>
              </>
            )}
          </g>
        ))}

        <text x={90} y={230} textAnchor="middle" fontSize={18} fontWeight="700" fill="#1e293b">Technical</text>
        <text x={90} y={252} textAnchor="middle" fontSize={18} fontWeight="700" fill="#1e293b">Manuals</text>
      </g>

      {/* Arrow 1→2 */}
      <line x1={216} y1={265} x2={264} y2={265} stroke="#60a5fa" strokeWidth={3} markerEnd="url(#arr-blue)" strokeDasharray="8,4" />

      {/* ─── SECTION 2: INDEXING SWARM ─── */}
      <g transform="translate(270, 36)">
        <rect x={0} y={0} width={216} height={459} rx={14} fill="white" stroke="#bfdbfe" strokeWidth={1.5} filter="url(#sh)" />
        <rect x={0} y={0} width={216} height={44} rx={14} fill="url(#g-blue)" />
        <rect x={0} y={30} width={216} height={14} fill="url(#g-blue)" />
        <text x={108} y={29} textAnchor="middle" fontSize={17} fontWeight="800" fill="white" letterSpacing={0.3}>INDEXING</text>

        {[
          { n: "01", label: "OCR", y: 66 },
          { n: "02", label: "CHUNK", y: 156 },
          { n: "03", label: "EMBED", y: 246 },
        ].map((s, i) => (
          <g key={s.label}>
            <rect x={14} y={s.y} width={188} height={72} rx={8} fill={i % 2 === 0 ? "#f8fafc" : "#eff6ff"} stroke="#bfdbfe" />
            <rect x={14} y={s.y} width={52} height={72} rx={8} fill={primaryColor} />
            <text x={40} y={s.y + 42} textAnchor="middle" fontSize={18} fontWeight="800" fill="white">{s.n}</text>
            <text x={82} y={s.y + 34} fontSize={15} fontWeight="700" fill="#1e293b">{s.label}</text>
            {i < 2 && <line x1={108} y1={s.y + 72} x2={108} y2={s.y + 84} stroke="#bfdbfe" strokeWidth={2} />}
          </g>
        ))}

        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={36 + i * 28} y={344} width={20} height={16} rx={3} fill={primaryColor} opacity={0.15 + i * 0.07} />
        ))}
      </g>

      {/* Arrow 2→3 */}
      <line x1={486} y1={265} x2={524} y2={265} stroke="#60a5fa" strokeWidth={3} markerEnd="url(#arr-blue)" strokeDasharray="8,4" />

      {/* ─── SECTION 3: VECTOR DB ─── */}
      <g transform="translate(530, 36)">
        <rect x={0} y={0} width={180} height={459} rx={14} fill="#fffbeb" stroke="#fde68a" strokeWidth={1.5} filter="url(#sh)" />
        <rect x={0} y={0} width={180} height={44} rx={14} fill="url(#g-amber)" />
        <rect x={0} y={30} width={180} height={14} fill="url(#g-amber)" />
        <text x={90} y={29} textAnchor="middle" fontSize={17} fontWeight="800" fill="white" letterSpacing={0.3}>VECTOR DB</text>

        <ellipse cx={90} cy={96} rx={60} ry={18} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
        <rect x={30} y={96} width={120} height={100} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
        <ellipse cx={90} cy={196} rx={60} ry={18} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
        <ellipse cx={90} cy={96} rx={60} ry={18} fill="#fde68a" stroke="none" />

        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={44} y={114 + i * 20} width={92} height={12} rx={3} fill="white" opacity={0.7} />
        ))}
        <text x={90} y={148} textAnchor="middle" fontSize={14} fontWeight="700" fill="#92400e">Chunks</text>
        <text x={90} y={168} textAnchor="middle" fontSize={14} fontWeight="700" fill="#92400e">Embeddings</text>

        <rect x={34} y={230} width={112} height={32} rx={6} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={90} y={250} textAnchor="middle" fontSize={14} fontWeight="700" fill="#92400e">Turso</text>

        <text x={90} y={310} textAnchor="middle" fontSize={15} fontWeight="600" fill="#b45309">Cosine similarity</text>
        <text x={90} y={340} textAnchor="middle" fontSize={13} fontWeight="600" fill="#b45309">Composite score</text>
      </g>

      {/* Arrow 3→4 */}
      <line x1={710} y1={265} x2={748} y2={265} stroke="#34d399" strokeWidth={3} markerEnd="url(#arr-emerald)" strokeDasharray="8,4" />

      {/* ─── SECTION 4: CONVERSATIONAL SWARM ─── */}
      <g transform="translate(754, 36)">
        <rect x={0} y={0} width={246} height={459} rx={14} fill="white" stroke="#a7f3d0" strokeWidth={1.5} filter="url(#sh)" />
        <rect x={0} y={0} width={246} height={44} rx={14} fill="url(#g-emerald)" />
        <rect x={0} y={30} width={246} height={14} fill="url(#g-emerald)" />
        <text x={123} y={29} textAnchor="middle" fontSize={15} fontWeight="800" fill="white" letterSpacing={0.3}>CONVERSATION</text>

        {[
          { n: "P", label: "Plan", y: 66 },
          { n: "S", label: "Search", y: 146 },
          { n: "S", label: "Select", y: 226 },
          { n: "A", label: "Analyze", y: 306 },
        ].map((s, i) => (
          <g key={s.label + i}>
            <rect x={14} y={s.y} width={218} height={62} rx={8} fill={i % 2 === 0 ? "#f0fdf4" : "#f8fafc"} stroke="#a7f3d0" />
            <rect x={14} y={s.y} width={46} height={62} rx={8} fill="#047857" />
            <text x={37} y={s.y + 38} textAnchor="middle" fontSize={20} fontWeight="800" fill="white">{s.n}</text>
            <text x={76} y={s.y + 36} fontSize={16} fontWeight="700" fill="#1e293b">{s.label}</text>
          </g>
        ))}

        <rect x={36} y={396} width={174} height={32} rx={16} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1.5} />
        <text x={123} y={417} textAnchor="middle" fontSize={12} fill="#475569" fontStyle="italic">"Error code E015?"</text>

        {/* Thick loop arrow */}
        <path d="M 246 100 L 272 100 Q 284 100 284 112 L 284 272 Q 284 284 272 284 L 260 284" fill="none" stroke="#10b981" strokeWidth={3} strokeDasharray="6,4" />
        <polygon points="260 280, 260 288, 252 284" fill="#10b981" />
        <text x={286} y={196} fontSize={14} fontWeight="700" fill="#047857">Loop</text>
      </g>

      {/* Arrow 4→5 */}
      <line x1={1000} y1={265} x2={1038} y2={265} stroke="#a78bfa" strokeWidth={3} markerEnd="url(#arr-violet)" strokeDasharray="8,4" />

      {/* ─── SECTION 5: DIAGNOSIS ─── */}
      <g transform="translate(1044, 36)">
        <rect x={0} y={0} width={248} height={459} rx={14} fill="white" stroke="#e2e8f0" strokeWidth={1.5} filter="url(#sh)" />
        <rect x={0} y={0} width={248} height={44} rx={14} fill="url(#g-violet)" />
        <rect x={0} y={30} width={248} height={14} fill="url(#g-violet)" />
        <text x={124} y={29} textAnchor="middle" fontSize={16} fontWeight="800" fill="white" letterSpacing={0.3}>DIAGNOSIS</text>

        <circle cx={124} cy={110} r={28} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1.5} />
        <circle cx={124} cy={102} r={11} fill="#94a3b8" />
        <path d="M104 134 Q124 148 144 134" fill="#94a3b8" />

        <text x={124} y={170} textAnchor="middle" fontSize={18} fontWeight="700" fill="#1e293b">Field</text>
        <text x={124} y={192} textAnchor="middle" fontSize={18} fontWeight="700" fill="#1e293b">Technician</text>

        <rect x={27} y={224} width={194} height={82} rx={10} fill="#f0fdf4" stroke="#a7f3d0" strokeWidth={2} />
        <rect x={27} y={224} width={8} height={82} rx={4} fill="#059669" />
        <text x={50} y={256} fontSize={18} fontWeight="700" fill="#166534">Verified</text>
        <text x={50} y={280} fontSize={18} fontWeight="700" fill="#166534">Diagnosis</text>
        <text x={50} y={298} fontSize={12} fontWeight="600" fill="#047857">Real-time</text>

        <rect x={49} y={330} width={150} height={28} rx={14} fill="#f0fdf4" stroke="#a7f3d0" strokeWidth={1.5} />
        <text x={124} y={349} textAnchor="middle" fontSize={13} fontWeight="700" fill="#166534">Multi-Agent RAG</text>

        <text x={124} y={410} textAnchor="middle" fontSize={14} fontWeight="600" fill="#475569">3 models</text>
        <text x={124} y={432} textAnchor="middle" fontSize={14} fontWeight="600" fill="#475569">11 agents</text>
      </g>
    </svg>
  );
}
