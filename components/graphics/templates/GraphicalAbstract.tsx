export default function GraphicalAbstract({
  primaryColor = "#2563eb",
}: {
  primaryColor?: string;
}) {
  const w = 1328;
  const h = 531;

  function headerPath(w: number) {
    return `M 0 16 Q 0 0 16 0 L ${w - 16} 0 Q ${w} 0 ${w} 16 L ${w} 40 L 0 40 Z`;
  }

  function bodyPath(w: number, h: number) {
    return `M 0 40 L 0 ${h - 16} Q 0 ${h} 16 ${h} L ${w - 16} ${h} Q ${w} ${h} ${w} ${h - 16} L ${w} 40`;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="g-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="g-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="g-violet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
        </filter>
        <marker id="arr" markerWidth="12" markerHeight="10" refX="12" refY="5" orient="auto">
          <polygon points="0 0, 12 5, 0 10" fill="#cbd5e1" />
        </marker>
      </defs>

      <rect width={w} height={h} fill="url(#bg)" rx={0} />

      {/* ─── PANEL 1: PROBLEM ─── */}
      <g transform="translate(28, 40)">
        <rect x={0} y={0} width={290} height={451} rx={16} fill="white" filter="url(#sh)" />
        <path d={bodyPath(290, 451)} fill="none" stroke={primaryColor} strokeWidth={2} />
        <path d={headerPath(290)} fill={primaryColor} />
        <text x={145} y={27} textAnchor="middle" fontSize={16} fontWeight="800" fill="white" letterSpacing={1}>PROBLEM</text>

        <g transform="translate(121, 56)">
          <circle cx={12} cy={12} r={10} fill="none" stroke={primaryColor} strokeWidth={2} />
          <circle cx={12} cy={12} r={3} fill={primaryColor} />
          <line x1={12} y1={17} x2={12} y2={24} stroke={primaryColor} strokeWidth={2} strokeLinecap="round" />
        </g>

        <text x={145} y={130} textAnchor="middle" fontSize={12} fontWeight="700" fill={primaryColor}>Input: 16 technical manuals</text>

        <text x={22} y={175} fontSize={11} fill="#334155" fontWeight="500">Junior technicians lack experience</text>
        <text x={22} y={195} fontSize={11} fill="#334155" fontWeight="500">→ 500 s diagnosis time</text>
        <text x={22} y={230} fontSize={11} fill="#334155" fontWeight="500">Dependence on scarce senior experts</text>
        <text x={22} y={250} fontSize={11} fill="#334155" fontWeight="500">limits scalability of field maintenance</text>

        <rect x={22} y={290} width={246} height={54} rx={8} fill="#fef2f2" stroke="#fecaca" strokeWidth={1.5} />
        <text x={145} y={314} textAnchor="middle" fontSize={12} fontWeight="700" fill="#b91c1c">Need:</text>
        <text x={145} y={334} textAnchor="middle" fontSize={12} fontWeight="700" fill="#b91c1c">faster, scalable support</text>
      </g>

      {/* Arrow 1→2 */}
      <line x1={318} y1={265} x2={344} y2={265} stroke="#cbd5e1" strokeWidth={3} markerEnd="url(#arr)" />

      {/* ─── PANEL 2: EXPERIMENT 1 — Ablation ─── */}
      <g transform="translate(350, 40)">
        <rect x={0} y={0} width={290} height={451} rx={16} fill="white" filter="url(#sh)" />
        <path d={bodyPath(290, 451)} fill="none" stroke="#059669" strokeWidth={2} />
        <path d={headerPath(290)} fill="url(#g-emerald)" />
        <text x={145} y={27} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" letterSpacing={0.5}>EXPERIMENT 1 — Ablation</text>

        <g transform="translate(115, 56)">
          <rect x={2} y={8} width={4} height={16} rx={1} fill="none" stroke="#059669" strokeWidth={1.5} />
          <rect x={8} y={4} width={4} height={20} rx={1} fill="none" stroke="#059669" strokeWidth={1.5} />
          <rect x={14} y={12} width={4} height={12} rx={1} fill="none" stroke="#059669" strokeWidth={1.5} />
          <rect x={2} y={8} width={4} height={8} rx={1} fill="#059669" opacity={0.3} />
          <rect x={8} y={4} width={4} height={12} rx={1} fill="#059669" opacity={0.3} />
          <rect x={14} y={12} width={4} height={6} rx={1} fill="#059669" opacity={0.3} />
          <line x1={0} y1={0} x2={20} y2={0} stroke="#059669" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={10} y1={0} x2={10} y2={-6} stroke="#059669" strokeWidth={1.5} strokeLinecap="round" />
        </g>

        <text x={145} y={130} textAnchor="middle" fontSize={12} fontWeight="700" fill="#065f46">50 fault scenarios · 4 configurations</text>

        <rect x={16} y={170} width={258} height={100} rx={8} fill="#f0fdf4" stroke="#a7f3d0" strokeWidth={1.5} />
        <text x={22} y={194} fontSize={12} fontWeight="800" fill="#065f46">Key result:</text>
        <text x={22} y={218} fontSize={12} fontWeight="700" fill="#059669">Config B (no planner)</text>
        <text x={22} y={242} fontSize={11} fill="#065f46" fontWeight="600">outperforms full pipeline</text>
        <text x={22} y={260} fontSize={11} fill="#065f46" fontWeight="600">in 5 out of 6 categories</text>

        <rect x={16} y={300} width={258} height={52} rx={8} fill="#fef2f2" stroke="#fecaca" strokeWidth={1.5} />
        <text x={145} y={324} textAnchor="middle" fontSize={11} fill="#b91c1c" fontWeight="600">Removing clarifier harms</text>
        <text x={145} y={342} textAnchor="middle" fontSize={11} fill="#b91c1c" fontWeight="600">ambiguous & multi-hop cases</text>
      </g>

      {/* Arrow 2→3 */}
      <line x1={640} y1={265} x2={666} y2={265} stroke="#cbd5e1" strokeWidth={3} markerEnd="url(#arr)" />

      {/* ─── PANEL 3: EXPERIMENTS 2 & 3 ─── */}
      <g transform="translate(672, 40)">
        <rect x={0} y={0} width={290} height={451} rx={16} fill="white" filter="url(#sh)" />
        <path d={bodyPath(290, 451)} fill="none" stroke="#d97706" strokeWidth={2} />
        <path d={headerPath(290)} fill="url(#g-amber)" />
        <text x={145} y={27} textAnchor="middle" fontSize={14} fontWeight="800" fill="white" letterSpacing={0.5}>EXPERIMENTS 2 & 3</text>

        <g transform="translate(115, 56)">
          <path d="M 6 2 L 10 2 L 10 18 L 6 18 Z" fill="none" stroke="#d97706" strokeWidth={1.5} />
          <line x1={10} y1={6} x2={18} y2={6} stroke="#d97706" strokeWidth={1.5} />
          <line x1={10} y1={10} x2={18} y2={10} stroke="#d97706" strokeWidth={1.5} />
          <line x1={10} y1={14} x2={14} y2={14} stroke="#d97706" strokeWidth={1.5} />
          <rect x={2} y={18} width={16} height={3} rx={1} fill="none" stroke="#d97706" strokeWidth={1.5} />
          <path d="M 0 21 L 20 21" stroke="#d97706" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={4} cy={3} r={2.5} fill="none" stroke="#d97706" strokeWidth={1.5} />
          <line x1={4} y1={5.5} x2={4} y2={11} stroke="#d97706" strokeWidth={1.5} strokeLinecap="round" />
        </g>

        <text x={145} y={130} textAnchor="middle" fontSize={12} fontWeight="700" fill="#92400e">100 queries · 4 experts</text>

        <text x={16} y={165} fontSize={12} fontWeight="800" fill="#92400e">Exp 2 — Benchmark:</text>
        <text x={22} y={187} fontSize={11} fontWeight="700" fill="#d97706">Synapsis B: 0.458 score</text>
        <text x={22} y={205} fontSize={11} fill="#334155" fontWeight="500">Latency: 12.3 s · Cost: $0.000145/query</text>
        <text x={22} y={223} fontSize={11} fill="#334155" fontWeight="500">BM25+BERT: 0.162 reasoning score</text>
        <text x={22} y={241} fontSize={11} fill="#334155" fontWeight="500">GOMS: 497 s → 97.5 % latency reduction</text>

        <rect x={16} y={270} width={258} height={54} rx={8} fill="#fffbeb" stroke="#fde68a" strokeWidth={1.5} />
        <text x={22} y={292} fontSize={12} fontWeight="800" fill="#92400e">Exp 3 — Human validation:</text>
        <text x={22} y={314} fontSize={11} fill="#78350f" fontWeight="600">Utility: 4.11/5 (4 experts, 6–23 yr exp)</text>

        <rect x={16} y={350} width={258} height={68} rx={8} fill="#fef2f2" stroke="#fecaca" strokeWidth={1.5} />
        <text x={145} y={373} textAnchor="middle" fontSize={11} fontWeight="800" fill="#b91c1c">GPT-4o vs human:</text>
        <text x={145} y={393} textAnchor="middle" fontSize={11} fontWeight="700" fill="#b91c1c">Spearman ρ = -0.07</text>
        <text x={145} y={410} textAnchor="middle" fontSize={11} fontWeight="600" fill="#b91c1c">(no significant correlation)</text>
      </g>

      {/* Arrow 3→4 */}
      <line x1={962} y1={265} x2={988} y2={265} stroke="#cbd5e1" strokeWidth={3} markerEnd="url(#arr)" />

      {/* ─── PANEL 4: IMPACT ─── */}
      <g transform="translate(994, 40)">
        <rect x={0} y={0} width={306} height={451} rx={16} fill="white" filter="url(#sh)" />
        <path d={bodyPath(306, 451)} fill="none" stroke="#7c3aed" strokeWidth={2} />
        <path d={headerPath(306)} fill="url(#g-violet)" />
        <text x={153} y={27} textAnchor="middle" fontSize={16} fontWeight="800" fill="white" letterSpacing={1}>IMPACT</text>

        <g transform="translate(129, 56)">
          <path d="M 12 2 L 22 8 L 22 16 L 12 22 L 2 16 L 2 8 Z" fill="none" stroke="#7c3aed" strokeWidth={1.5} />
          <polyline points="8,12 11,15 16,9" fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <text x={153} y={130} textAnchor="middle" fontSize={12} fontWeight="700" fill="#5b21b6">Output: verified diagnosis</text>

        <rect x={16} y={165} width={274} height={80} rx={8} fill="#f5f3ff" stroke="#ddd6fe" strokeWidth={1.5} filter="url(#sh)" />
        <text x={153} y={190} textAnchor="middle" fontSize={12} fontWeight="800" fill="#4c1d95">Pruned multi-agent RAG</text>
        <text x={153} y={212} textAnchor="middle" fontSize={11} fontWeight="600" fill="#6d28d9">reduces expert dependence while</text>
        <text x={153} y={232} textAnchor="middle" fontSize={11} fontWeight="600" fill="#6d28d9">maintaining diagnostic quality</text>

        <text x={16} y={285} fontSize={12} fill="#334155" fontWeight="500">Safe, fast, low-cost diagnostic</text>
        <text x={16} y={305} fontSize={12} fill="#334155" fontWeight="500">tool for field technicians</text>

        <rect x={16} y={345} width={274} height={85} rx={8} fill="#f0fdf4" stroke="#a7f3d0" strokeWidth={1.5} />
        <text x={153} y={370} textAnchor="middle" fontSize={12} fontWeight="700" fill="#065f46">Key achievements:</text>
        <circle cx={30} cy={392} r={3} fill="#059669" />
        <text x={38} y={396} fontSize={11} fill="#475569">500 s → 12.3 s latency (97.5 %↓)</text>
        <circle cx={30} cy={414} r={3} fill="#059669" />
        <text x={38} y={418} fontSize={11} fill="#475569">Human utility score: 4.11/5</text>
      </g>
    </svg>
  );
}
