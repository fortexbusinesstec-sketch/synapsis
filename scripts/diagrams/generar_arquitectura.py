"""
SYNAPSE MAS — Diagrama de Arquitectura ArchiMate v3
Sistema Multi-Agente para RAG Multimodal (Elevadores Schindler)
Notación: ArchiMate 3 — 4 Capas: Business / Application / Data / Technology
"""

import sys
sys.path.insert(0, '/home/fabrizio/.local/lib/python3.12/site-packages')
import graphviz

# ─── Colores ArchiMate estándar ───────────────────────────────────────────────
BIZ_BG     = "#FFFFCC"   # Business  → Amarillo
BIZ_BORDER = "#B8A000"
BIZ_NODE   = "#FFFF99"

APP_BG     = "#CCFFFF"   # Application → Turquesa
APP_BORDER = "#007070"
APP_NODE   = "#AAFFEE"

DAT_BG     = "#CCFFFF"   # Data      → Turquesa (extensión Application)
DAT_BORDER = "#005A80"
DAT_NODE   = "#99EEE8"

TEC_BG     = "#CCFFCC"   # Technology → Verde
TEC_BORDER = "#006000"
TEC_NODE   = "#AAFFAA"

# ─── Helper: etiqueta con estereotipo ArchiMate ───────────────────────────────
def lbl(stereotype, name, detail=""):
    rows  = (
        f'<TR><TD ALIGN="CENTER"><FONT POINT-SIZE="7" COLOR="#666666">'
        f'&#171;{stereotype}&#187;</FONT></TD></TR>'
        f'<TR><TD ALIGN="CENTER"><B><FONT POINT-SIZE="9">{name}</FONT></B></TD></TR>'
    )
    if detail:
        rows += (
            f'<TR><TD ALIGN="CENTER"><FONT POINT-SIZE="7.5" COLOR="#444444">'
            f'{detail}</FONT></TD></TR>'
        )
    return f'<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="1" CELLPADDING="3">{rows}</TABLE>>'


# ─── Grafo principal ──────────────────────────────────────────────────────────
dot = graphviz.Digraph(
    name="SYNAPSE_ArchiMate",
    format="png",
    engine="dot",
)

dot.attr(
    rankdir="TB",
    dpi="200",
    size="22,15",
    bgcolor="white",
    fontname="Helvetica Neue",
    compound="true",
    ranksep="1.4",
    nodesep="0.7",
    splines="line",
    newrank="true",
    label=(
        '<<FONT POINT-SIZE="17"><B>SYNAPSE MAS — Arquitectura ArchiMate por Capas</B></FONT>'
        '<BR/><FONT POINT-SIZE="10" COLOR="#555555">'
        'Sistema Multi-Agente · RAG Multimodal · Elevadores Schindler</FONT>>'
    ),
    labelloc="t",
    pad="0.5",
)

dot.attr("node",
    fontname="Helvetica Neue",
    fontsize="9",
    style="filled,rounded",
    shape="box",
    margin="0.18,0.12",
    penwidth="1.3",
)
dot.attr("edge",
    fontname="Helvetica Neue",
    fontsize="7.5",
    arrowsize="0.65",
    penwidth="1.1",
)


# ═══════════════════════════════════════════════════════════════════════════════
# ① BUSINESS LAYER  —  Capa de Presentación
# ═══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_biz") as B:
    B.attr(
        label='<<B>① BUSINESS LAYER</B>  ·  Capa de Presentación>',
        style="filled,rounded", fillcolor=BIZ_BG, color=BIZ_BORDER,
        penwidth="2.5", fontsize="11", fontcolor=BIZ_BORDER, margin="18",
    )
    B.node("b_actor",
        lbl("Business Actor", "Técnico / Ingeniero", "Usuario final · Elevadores Schindler"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="box",
    )
    B.node("b_role",
        lbl("Business Role", "Administrador", "Gestiona documentos y enriquecimientos"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="box",
    )
    B.node("b_proc_chat",
        lbl("Business Process", "Consulta de Diagnóstico", "Pregunta técnica → Respuesta RAG"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="box",
    )
    B.node("b_proc_index",
        lbl("Business Process", "Indexación de Documentos", "Upload PDF → Pipeline 8 agentes"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="box",
    )
    B.node("b_iface",
        lbl("Business Interface", "Dashboard Web", "Next.js 16.2.1 · App Router · React 19"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="box",
    )
    B.node("b_svc_auth",
        lbl("Business Service", "Autenticación", "schindler_session cookie · /api/session"),
        fillcolor=BIZ_NODE, color=BIZ_BORDER, shape="ellipse",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ② APPLICATION LAYER  —  Capa de Aplicación
# ═══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_app") as A:
    A.attr(
        label='<<B>② APPLICATION LAYER</B>  ·  Capa de Aplicación>',
        style="filled,rounded", fillcolor=APP_BG, color=APP_BORDER,
        penwidth="2.5", fontsize="11", fontcolor=APP_BORDER, margin="18",
    )
    A.node("a_core",
        lbl("Application Component", "Synapse MAS Core", "Next.js 16.2.1 · Vercel AI SDK v4.1"),
        fillcolor=APP_NODE, color=APP_BORDER, shape="component",
    )
    A.node("a_svc_upload",
        lbl("Application Service", "Servicio de Indexación", "POST /api/upload · waitUntil (300 s)"),
        fillcolor=APP_NODE, color=APP_BORDER, shape="ellipse",
    )
    A.node("a_svc_chat",
        lbl("Application Service", "Servicio de Chat RAG", "POST /api/chat · SSE Streaming (60 s)"),
        fillcolor=APP_NODE, color=APP_BORDER, shape="ellipse",
    )
    # ── Enjambre A — 8 Agentes RAG ──
    with A.subgraph(name="cluster_swarm_rag") as R:
        R.attr(
            label="Enjambre A — 8 Agentes · Pipeline Indexing Multimodal",
            style="dashed,rounded", fillcolor="#D8FFFE",
            color=APP_BORDER, fontsize="8.5", margin="12",
        )
        R.node("a_fn_rag",
            lbl("Application Function", "Pipeline RAG / Indexing",
                "Orchestrator → OCR → VectorScanner<BR/>"
                "→ Vision → DiagramReasoner ‖ Chunker → Embedder"),
            fillcolor="#B8F4FF", color=APP_BORDER, shape="box",
        )
    # ── Enjambre B — 9 Nodos Chat ──
    with A.subgraph(name="cluster_swarm_chat") as C:
        C.attr(
            label="Enjambre B — 9 Nodos · Pipeline Conversacional (Agentic Loop ≤3)",
            style="dashed,rounded", fillcolor="#D8FFFD",
            color="#006070", fontsize="8.5", margin="12",
        )
        C.node("a_fn_chat",
            lbl("Application Function", "Pipeline Chat · Agentic Loop",
                "Clarifier → Planificador → Bibliotecario<BR/>"
                "→ Selector → Analista ⟳ → Verificador → Ingeniero Jefe (stream)"),
            fillcolor="#B2F0EC", color="#006070", shape="box",
        )
    # ── Agente Curious (HITL) ──
    A.node("a_curious",
        lbl("Application Component", "Agente Curious  ·  HITL",
            "gpt-4o-mini · Gap Detection<BR/>"
            "Herencia 3 niveles · EnrichmentReviewer"),
        fillcolor=APP_NODE, color=APP_BORDER, shape="component",
    )
    # ── Enrutador Semántico (staged) ──
    A.node("a_semantic_router",
        lbl("Application Component", "Enrutador Semántico  ·  staged",
            "gpt-4o-mini · Pre-retrieval<BR/>"
            "filtros_metadatos · entidades_criticas"),
        fillcolor="#DDFFF0", color="#007050", shape="component",
    )
    # ── Selector de Contexto ──
    A.node("a_selector",
        lbl("Application Component", "Selector de Contexto",
            "ScoredChunk · GapDescriptor<BR/>"
            "Dedup · ranking semántico"),
        fillcolor="#E8F4FF", color="#004A90", shape="component",
    )
    # ── Verificador de Fidelidad (staged) ──
    A.node("a_verifier",
        lbl("Application Component", "Verificador de Fidelidad  ·  staged",
            "gpt-4o · Safety Auditor<BR/>"
            "is_valid · safe_fallback_response"),
        fillcolor="#FFE8D8", color="#994400", shape="component",
    )
    # ── Observabilidad ──
    A.node("a_logger",
        lbl("Application Function", "Logger + FinOps",
            "logAgentStart/End · Metrificador<BR/>"
            "costOrchestrator / Ocr / Vision…"),
        fillcolor=APP_NODE, color=APP_BORDER, shape="box",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ③ DATA LAYER  —  Capa de Datos
# ═══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_data") as D:
    D.attr(
        label='<<B>③ DATA LAYER</B>  ·  Capa de Datos>',
        style="filled,rounded", fillcolor=DAT_BG, color=DAT_BORDER,
        penwidth="2.5", fontsize="11", fontcolor=DAT_BORDER, margin="18",
    )
    with D.subgraph(name="cluster_turso_tables") as T:
        T.attr(
            label="Turso LibSQL · 7 tablas core + ablation · vector_distance_cos()",
            style="dashed", fillcolor=DAT_BG, color=DAT_BORDER, fontsize="8.5",
        )
        T.node("d_chunks",
            lbl("Data Object", "Chunks + Embeddings",
                "F32_BLOB(1536) · chunkType<BR/>"
                "hasWarning · contentTokens"),
            fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
        )
        T.node("d_images",
            lbl("Data Object", "Imágenes + Embeddings",
                "F32_BLOB(1536) · imageType<BR/>"
                "isCritical · isUseful · HITL"),
            fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
        )
        T.node("d_enrich",
            lbl("Data Object", "Enrichments  ·  HITL",
                "generatedQuestion · expertAnswer<BR/>"
                "answerSource: pending / inherited"),
            fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
        )
        T.node("d_chat",
            lbl("Data Object", "Chat Sessions + Messages",
                "chat_sessions · chat_messages<BR/>"
                "mode: test | record · SSE streaming"),
            fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
        )
        T.node("d_logs",
            lbl("Data Object", "Agent Logs + Métricas",
                "agent_logs · indexing_metrics<BR/>"
                "durationMs · token costs"),
            fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
        )
    D.node("d_blob",
        lbl("Artifact", "PDFs + Imágenes Procesadas",
            "Cloudflare R2 · htl-ascensores-lib<BR/>"
            "{docId}/{imgId}.jpg"),
        fillcolor=DAT_NODE, color=DAT_BORDER, shape="note",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ④ TECHNOLOGY LAYER  —  Capa de Tecnología
# ═══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_tech") as X:
    X.attr(
        label='<<B>④ TECHNOLOGY LAYER</B>  ·  Capa de Tecnología>',
        style="filled,rounded", fillcolor=TEC_BG, color=TEC_BORDER,
        penwidth="2.5", fontsize="11", fontcolor=TEC_BORDER, margin="18",
    )
    X.node("t_vercel",
        lbl("Node", "Vercel Serverless",
            "Edge + Node.js · waitUntil<BR/>"
            "maxDuration 300 s / 60 s"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="box3d",
    )
    X.node("t_turso",
        lbl("Node", "Turso Cloud  ·  LibSQL",
            "libsql://htl-synapse-ia.turso.io<BR/>"
            "F32_BLOB · Edge Replication"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="box3d",
    )
    X.node("t_r2",
        lbl("Node", "Cloudflare R2",
            "S3-compatible · htl-ascensores-lib<BR/>"
            "@aws-sdk/client-s3 v3"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="box3d",
    )
    X.node("t_nextjs",
        lbl("System Software", "Next.js 16.2.1  +  Vercel AI SDK v4.1",
            "generateText · streamText<BR/>"
            "embed · Drizzle ORM v0.40"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="box",
    )
    X.node("t_openai",
        lbl("Technology Service", "OpenAI API",
            "GPT-4o (Ingeniero Jefe · Verificador · Vision)<BR/>"
            "GPT-4o-mini · text-embedding-3-small (1536-dim)"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="ellipse",
    )
    X.node("t_mistral",
        lbl("Technology Service", "Mistral AI API",
            "mistral-ocr-latest ($0.001/pág · OCR + VectorScanner)<BR/>"
            "pixtral-12b-2409 (vision triage)"),
        fillcolor=TEC_NODE, color=TEC_BORDER, shape="ellipse",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# RELACIONES ArchiMate
# ═══════════════════════════════════════════════════════════════════════════════

TRIG   = dict(arrowhead="normal",  style="solid",  penwidth="1.4")
SERV   = dict(arrowhead="open",    style="solid",  penwidth="1.2")
REAL   = dict(arrowhead="open",    style="dashed", penwidth="1.1")
FLOW   = dict(arrowhead="normal",  style="dashed", penwidth="1.0")
ASGN   = dict(arrowhead="normal",  arrowtail="dot", style="solid", dir="both", penwidth="1.2")
ASSOC  = dict(arrowhead="none",    style="dashed", penwidth="0.9", dir="none")

TRIG_D = {k: v for k, v in TRIG.items() if k != "style"}
SERV_D = {k: v for k, v in SERV.items() if k != "style"}

# ── Rank constraints ─────────────────────────────────────────────────────────
with dot.subgraph() as S:
    S.attr(rank="min")
    for n in ["b_actor","b_role","b_proc_chat","b_proc_index","b_iface","b_svc_auth"]:
        S.node(n)
with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["a_core","a_svc_upload","a_svc_chat","a_fn_rag","a_fn_chat",
              "a_curious","a_logger","a_semantic_router","a_selector","a_verifier"]:
        S.node(n)
with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["d_chunks","d_images","d_enrich","d_chat","d_logs","d_blob"]:
        S.node(n)
with dot.subgraph() as S:
    S.attr(rank="max")
    for n in ["t_vercel","t_turso","t_r2","t_nextjs","t_openai","t_mistral"]:
        S.node(n)
with dot.subgraph() as S:
    S.attr(rank="sink")
    for n in ["l1","l2","l3","l4","l5","l6"]:
        S.node(n)

# Scaffold invisible
dot.edge("b_proc_chat", "a_core",   style="invis", weight="20")
dot.edge("a_core",      "d_chunks", style="invis", weight="20")
dot.edge("d_chunks",    "t_vercel", style="invis", weight="20")

# ── Business Layer: internal ──────────────────────────────────────────────────
dot.edge("b_svc_auth", "b_iface",
    **SERV, color=BIZ_BORDER, label="serving")
dot.edge("b_actor", "b_proc_chat",
    **TRIG, color=BIZ_BORDER, label="triggering")
dot.edge("b_role",  "b_proc_index",
    **TRIG, color=BIZ_BORDER, label="triggering")
dot.edge("b_actor", "b_iface",
    **SERV, color=BIZ_BORDER, label="uses")
dot.edge("b_role",  "b_iface",
    **SERV, color=BIZ_BORDER, label="uses")

# ── Business → Application ───────────────────────────────────────────────────
dot.edge("b_proc_chat",  "a_svc_chat",
    **TRIG, color="#CC6600", label="triggering", lhead="cluster_app")
dot.edge("b_proc_index", "a_svc_upload",
    **TRIG, color="#CC6600", label="triggering")
dot.edge("b_iface",      "a_svc_chat",
    **SERV_D, style="dashed", color="#888888", label="serving")
dot.edge("b_iface",      "a_svc_upload",
    **SERV_D, style="dashed", color="#888888", label="serving")

# ── Application Layer: internal ───────────────────────────────────────────────
dot.edge("a_core",       "a_svc_upload",
    **REAL, color=APP_BORDER, label="realization")
dot.edge("a_core",       "a_svc_chat",
    **REAL, color=APP_BORDER, label="realization")
dot.edge("a_svc_upload", "a_fn_rag",
    **TRIG, color="#0055BB", label="triggering")
dot.edge("a_svc_chat",   "a_fn_chat",
    **TRIG, color="#0055BB", label="triggering")
dot.edge("a_fn_rag",     "a_curious",
    **TRIG_D, style="dashed", color="#0055BB", label="triggers async")
dot.edge("a_fn_chat",    "a_semantic_router",
    **ASSOC, color="#007050", label="pre-retrieval")
dot.edge("a_fn_chat",    "a_selector",
    **ASSOC, color="#004A90", label="context scoring")
dot.edge("a_fn_chat",    "a_verifier",
    **ASSOC, color="#994400", label="fidelity check")
dot.edge("a_logger",     "a_fn_rag",
    **ASSOC, color="#999999", label="observes")
dot.edge("a_logger",     "a_fn_chat",
    **ASSOC, color="#999999")

# ── Application → Data ───────────────────────────────────────────────────────
WRITE  = dict(**FLOW, color=DAT_BORDER)
READ   = dict(arrowhead="open", style="dashed", penwidth="1.0", color=DAT_BORDER)

dot.edge("a_fn_rag",  "d_chunks",  **WRITE, label="write")
dot.edge("a_fn_rag",  "d_images",  **WRITE, label="write")
dot.edge("a_fn_rag",  "d_blob",    **WRITE, label="write PDF/img")
dot.edge("a_fn_chat", "d_chunks",  **READ,  label="read")
dot.edge("a_fn_chat", "d_images",  **READ,  label="read")
dot.edge("a_fn_chat", "d_enrich",  **READ,  label="read")
dot.edge("a_fn_chat", "d_chat",    **WRITE, label="write session/msg")
dot.edge("a_curious", "d_enrich",  **WRITE, label="write gaps")
dot.edge("a_logger",  "d_logs",    **WRITE, label="write")

# ── Application → Technology ─────────────────────────────────────────────────
dot.edge("a_core",    "t_vercel",
    **ASGN, color=TEC_BORDER, label="assignment", constraint="false",
    lhead="cluster_tech")
dot.edge("a_fn_rag",  "t_openai",
    **SERV_D, style="dashed", color=TEC_BORDER, label="uses", constraint="false")
dot.edge("a_fn_rag",  "t_mistral",
    **SERV_D, style="dashed", color=TEC_BORDER, label="uses", constraint="false")
dot.edge("a_fn_chat", "t_openai",
    **SERV_D, style="dashed", color=TEC_BORDER, label="uses", constraint="false")

# ── Data → Technology ─────────────────────────────────────────────────────────
dot.edge("d_chunks",  "t_turso", **REAL, color=TEC_BORDER, label="realized by")
dot.edge("d_images",  "t_turso", **REAL, color=TEC_BORDER)
dot.edge("d_enrich",  "t_turso", **REAL, color=TEC_BORDER)
dot.edge("d_chat",    "t_turso", **REAL, color=TEC_BORDER)
dot.edge("d_logs",    "t_turso", **REAL, color=TEC_BORDER)
dot.edge("d_blob",    "t_r2",    **REAL, color=TEC_BORDER, label="realized by")

# ── Technology Layer: internal ────────────────────────────────────────────────
dot.edge("t_nextjs",  "t_vercel",
    **REAL, color=TEC_BORDER, label="realizes", constraint="false")
dot.edge("t_openai",  "t_vercel",
    **SERV_D, style="dashed", color=TEC_BORDER, label="hosted on", constraint="false")
dot.edge("t_mistral", "t_vercel",
    **SERV_D, style="dashed", color=TEC_BORDER, constraint="false")


# ─── Leyenda ──────────────────────────────────────────────────────────────────
with dot.subgraph(name="cluster_legend") as LEG:
    LEG.attr(
        label="Leyenda — Relaciones ArchiMate",
        style="dashed,rounded", color="#AAAAAA",
        fillcolor="#FAFAFA", fontsize="9", margin="10",
    )
    LEG.node("l1", "→  Triggering\n(desencadena)",
        shape="plaintext", fillcolor="white", fontcolor="#CC6600", fontsize="8")
    LEG.node("l2", "⟶  Serving\n(sirve a)",
        shape="plaintext", fillcolor="white", fontcolor="#888888", fontsize="8")
    LEG.node("l3", "- ->  Realization\n(realiza)",
        shape="plaintext", fillcolor="white", fontcolor=APP_BORDER, fontsize="8")
    LEG.node("l4", "- ->  Access/Flow\n(escribe / lee)",
        shape="plaintext", fillcolor="white", fontcolor=DAT_BORDER, fontsize="8")
    LEG.node("l5", "●→  Assignment\n(asignado a nodo)",
        shape="plaintext", fillcolor="white", fontcolor=TEC_BORDER, fontsize="8")
    LEG.node("l6", "---  Association\n(observa / asocia)",
        shape="plaintext", fillcolor="white", fontcolor="#999999", fontsize="8")

dot.edge("t_r2",     "l1", style="invis")
dot.edge("t_turso",  "l3", style="invis")
dot.edge("t_openai", "l5", style="invis")


# ═══════════════════════════════════════════════════════════════════════════════
# RENDERIZAR
# ═══════════════════════════════════════════════════════════════════════════════
OUT = "/home/fabrizio/Escritorio/GoProyects/synapse/imagenes/arquitectura_sistema"

try:
    rendered = dot.render(filename=OUT, cleanup=True)
    print(f"\n✅  Diagrama generado: {rendered}")
    print(f"    Resolución: 200 DPI · ~4400 × 3000 px")
except Exception as e:
    print(f"\n⚠️   dot no encontrado: {e}")
    src = OUT + ".dot"
    with open(src, "w") as f:
        f.write(dot.source)
    print(f"✅  DOT guardado en: {src}")
    print(f"\nPara generar el PNG ejecuta:")
    print(f"  ! sudo apt install graphviz -y && dot -Tpng {src} -o {OUT}.png -Gdpi=200")
