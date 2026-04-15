"""
SYNAPSE MAS — Diagrama Lógico v3
Interacción entre Agentes y Flujo RAG

Enjambre A (Indexing · 8 agentes) + Enjambre B (Conversacional · 9 nodos · Agentic Loop max=3)
Incluye: Selector de Contexto (N2.5) · GapDescriptor · SearchMemory
Salida: imagenes/diagrama_logico.png
"""
import sys
sys.path.insert(0, '/home/fabrizio/.local/lib/python3.12/site-packages')
import graphviz

OUT = "/home/fabrizio/Escritorio/GoProyects/synapse/imagenes/diagrama_logico"

# ── Paleta de colores por tipo de componente ──────────────────────────────────
U_BG, U_BD, U_ND   = "#FFF3CD", "#D97706", "#FEF9C3"   # Usuarios
F_BG, F_BD, F_ND   = "#DBEAFE", "#1D4ED8", "#EFF6FF"   # Frontend
A_BG, A_BD, A_ND   = "#D1FAE5", "#065F46", "#ECFDF5"   # API Layer
B_BG, B_BD, B_ND   = "#EDE9FE", "#6D28D9", "#F5F3FF"   # Enjambre B
S_BG, S_BD, S_ND   = "#FEE2E2", "#991B1B", "#FFF1F1"   # Safety / Sentinel
H_BG, H_BD, H_ND   = "#FEF3C7", "#92400E", "#FFFBEB"   # HITL
I_BG, I_BD, I_ND   = "#CCFBF1", "#0F766E", "#F0FDFA"   # Enjambre A
D_BG, D_BD, D_ND   = "#E0F2FE", "#0369A1", "#F0F9FF"   # Data Layer
ST_BG, ST_BD       = "#F3F4F6", "#9CA3AF"               # Staged agents
SEL_BG, SEL_BD     = "#E8F4FF", "#004A90"               # Selector
R2_BG, R2_BD       = "#ECFDF5", "#047857"               # Storage

LOOP_COLOR  = "#DC2626"   # agentic loop back-edge
WRITE_COLOR = "#0369A1"   # db writes
READ_COLOR  = "#0284C7"   # db reads

# ── Helper: etiqueta HTML ────────────────────────────────────────────────────
def lbl(icon, title, model="", detail=""):
    rows = (
        f'<TR><TD ALIGN="CENTER">'
        f'<B><FONT POINT-SIZE="10">{icon} {title}</FONT></B>'
        f'</TD></TR>'
    )
    if model:
        rows += (
            f'<TR><TD ALIGN="CENTER">'
            f'<FONT POINT-SIZE="8" COLOR="#6D28D9"><I>{model}</I></FONT>'
            f'</TD></TR>'
        )
    if detail:
        for line in detail.split("·"):
            line = line.strip()
            if line:
                rows += (
                    f'<TR><TD ALIGN="CENTER">'
                    f'<FONT POINT-SIZE="7.5" COLOR="#555555">{line}</FONT>'
                    f'</TD></TR>'
                )
    return (
        f'<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">'
        f'{rows}</TABLE>>'
    )

# ── Grafo principal ────────────────────────────────────────────────────────────
dot = graphviz.Digraph("SYNAPSE_Logico", format="png", engine="dot")
dot.attr(
    rankdir   = "TB",
    dpi       = "180",
    size      = "30,24",
    bgcolor   = "white",
    fontname  = "Helvetica Neue",
    compound  = "true",
    ranksep   = "1.3",
    nodesep   = "0.55",
    splines   = "ortho",
    newrank   = "true",
    label     = (
        '<<FONT POINT-SIZE="19"><B>'
        'SYNAPSE MAS &#8212; Diagrama L&#243;gico: Interacci&#243;n entre Agentes y Flujo RAG'
        '</B></FONT><BR/>'
        '<FONT POINT-SIZE="11" COLOR="#555555">'
        'Multi-Agent System &#183; RAG Multimodal &#183; Elevadores Schindler &#183; Next.js 16.2.1'
        '</FONT>>'
    ),
    labelloc  = "t",
    pad       = "0.6",
)
dot.attr("node",
    fontname = "Helvetica Neue",
    fontsize = "9",
    style    = "filled,rounded",
    shape    = "box",
    margin   = "0.2,0.12",
    penwidth = "1.3",
)
dot.attr("edge",
    fontname = "Helvetica Neue",
    fontsize = "7.5",
    arrowsize= "0.6",
    penwidth = "1.0",
)

# ══════════════════════════════════════════════════════════════════════════════
# ACTORES
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_users") as C:
    C.attr(label="Actores", style="filled,rounded",
           fillcolor=U_BG, color=U_BD, penwidth="2", fontsize="10", margin="12")
    C.node("TECH",
        lbl("👤", "Técnico / Ingeniero", "", "Usuario final &#183; Elevadores Schindler"),
        fillcolor=U_ND, color=U_BD)
    C.node("ADMIN",
        lbl("👔", "Administrador", "", "Gestión documental &#183; Respuestas HITL"),
        fillcolor=U_ND, color=U_BD)

# ══════════════════════════════════════════════════════════════════════════════
# PRESENTATION LAYER
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_pres") as C:
    C.attr(
        label     = "Presentation Layer  &#183;  Next.js 16.2.1 &#183; App Router &#183; React 19",
        style     = "filled,rounded",
        fillcolor = F_BG, color=F_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=F_BD, margin="15",
    )
    C.node("CHAT_UI",
        lbl("💬", "SynapsisGoChat", "", "/dashboard/go &#183; SSE Streaming"),
        fillcolor=F_ND, color=F_BD)
    C.node("DASH_UI",
        lbl("📊", "Document Manager", "", "/dashboard/documents"),
        fillcolor=F_ND, color=F_BD)
    C.node("ENRICH_UI",
        lbl("🔍", "EnrichmentReviewer", "", "HITL &#183; Expert Answers &#183; /documents/id/refine"),
        fillcolor=H_ND, color=H_BD)
    C.node("AUTH",
        lbl("🔐", "Auth Middleware", "", "/api/session &#183; schindler_session cookie"),
        fillcolor=D_ND, color=D_BD)

# ══════════════════════════════════════════════════════════════════════════════
# API LAYER
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_api") as C:
    C.attr(
        label     = "API Layer  &#183;  Next.js Route Handlers &#183; Vercel AI SDK v4.1",
        style     = "filled,rounded",
        fillcolor = A_BG, color=A_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=A_BD, margin="15",
    )
    C.node("API_CHAT",
        lbl("⚡", "POST /api/chat", "", "maxDuration: 60s &#183; streamText &#183; SSE"),
        fillcolor=A_ND, color=A_BD, shape="ellipse")
    C.node("API_UPLOAD",
        lbl("📤", "POST /api/upload", "", "maxDuration: 300s &#183; waitUntil &#183; multipart"),
        fillcolor=A_ND, color=A_BD, shape="ellipse")

# ══════════════════════════════════════════════════════════════════════════════
# ENJAMBRE B — Pipeline Conversacional
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_swb") as C:
    C.attr(
        label     = "Enjambre B  &#183;  Comité de Diagnóstico &#183; 9 Nodos &#183; Agentic Loop max=3",
        style     = "dashed,rounded",
        fillcolor = B_BG, color=B_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=B_BD, margin="15",
    )
    C.node("N0",
        lbl("[N0] 🔤", "Clarificador", "gpt-4o-mini",
            "Intent Classification &#183; Query Expansion &#183; enriched_query"),
        fillcolor=B_ND, color=B_BD)
    C.node("N05",
        lbl("[N0.5] 🗺️", "Enrutador Semántico", "gpt-4o-mini · staged",
            "filtros_metadatos &#183; entidades_criticas &#183; buildSqlFilters"),
        fillcolor=ST_BG, color=ST_BD, style="dashed,rounded")
    C.node("N1",
        lbl("[N1] 📋", "Planificador", "gpt-4o-mini",
            "Dual Search Plan &#183; text_query + image_query &#183; SearchMemory"),
        fillcolor=B_ND, color=B_BD)
    C.node("N2",
        lbl("[N2] 📚", "Bibliotecario", "vector_distance_cos",
            "document_chunks + enrichments + extracted_images &#183; LIMIT 5+3+3"),
        fillcolor=B_ND, color=B_BD)
    C.node("N25",
        lbl("[N2.5] 🎯", "Selector de Contexto", "ScoredChunk · GapDescriptor",
            "Dedup &#183; ranking semántico &#183; redundantChunksAvoided"),
        fillcolor=SEL_BG, color=SEL_BD)
    C.node("N3",
        lbl("[N3] 🔬", "Analista / Evaluador", "gpt-4o-mini",
            "urgency &#183; responseMode &#183; GapDescriptor &#183; shouldLoop"),
        fillcolor=B_ND, color=B_BD)
    C.node("N35",
        lbl("[N3.5] 🛡️", "Verificador de Fidelidad", "gpt-4o · staged",
            "is_valid &#183; confidence_score &#183; safe_fallback_response"),
        fillcolor=ST_BG, color=ST_BD, style="dashed,rounded")
    C.node("N4",
        lbl("[N4] ⚡", "Ingeniero Jefe", "gpt-4o · streamText",
            "EMERGENCY / TROUBLESHOOTING / LEARNING"),
        fillcolor=B_ND, color=B_BD)
    C.node("N5",
        lbl("[N5] 📈", "Metrificador", "",
            "INSERT chat_messages &#183; costs &#183; latencia"),
        fillcolor=B_ND, color=B_BD)

# ══════════════════════════════════════════════════════════════════════════════
# ENJAMBRE A — Indexing Pipeline
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_swa") as C:
    C.attr(
        label     = "Enjambre A  &#183;  Indexing Pipeline &#183; 8 Agentes",
        style     = "dashed,rounded",
        fillcolor = I_BG, color=I_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=I_BD, margin="15",
    )
    C.node("A1",
        lbl("[A1] 📖", "OCR", "mistral-ocr-latest",
            "$0.001/pág &#183; OcrPage[] &#183; markdown + images"),
        fillcolor=I_ND, color=I_BD)
    C.node("A2",
        lbl("[A2] 🎯", "Orchestrator", "gpt-4o-mini",
            "strategy &#183; priority_pages &#183; language"),
        fillcolor=I_ND, color=I_BD)
    C.node("A3",
        lbl("[A3] 👁️", "Vision", "pixtral-12b-2409 + gpt-4o",
            "imageType &#183; confidence &#183; isCritical &#183; description"),
        fillcolor=I_ND, color=I_BD)
    C.node("A4",
        lbl("[A4] 🔷", "DiagramReasoner", "gpt-4o-mini",
            "components &#183; connections &#183; failure_modes"),
        fillcolor=I_ND, color=I_BD)
    C.node("A5",
        lbl("[A5] ✂️", "Chunker", "gpt-4o-mini",
            "chunkType &#183; hasWarning &#183; sectionTitle"),
        fillcolor=I_ND, color=I_BD)
    C.node("A6",
        lbl("[A6] 🔢", "Embedder", "text-embedding-3-small",
            "F32_BLOB 1536-dim &#183; batch INSERT Turso"),
        fillcolor=I_ND, color=I_BD)
    C.node("A7",
        lbl("[A7] 🔍", "VectorScanner", "mistral-ocr-latest",
            "auditorRecommendations &#183; async scan"),
        fillcolor=I_ND, color=I_BD)
    C.node("A8",
        lbl("[A8] 🤔", "Curioso", "gpt-4o-mini · Background",
            "Gap Detection &#183; Herencia L1 L2 L3 &#183; HITL"),
        fillcolor=H_ND, color=H_BD)

# ══════════════════════════════════════════════════════════════════════════════
# DATA LAYER
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_data") as C:
    C.attr(
        label     = "Data Layer  &#183;  Turso LibSQL &#183; vector_distance_cos()",
        style     = "filled,rounded",
        fillcolor = D_BG, color=D_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=D_BD, margin="15",
    )
    C.node("DDOC",
        lbl("📄", "documents", "", "brand &#183; model &#183; status &#183; costs &#183; pdfUrl"),
        fillcolor=D_ND, color=D_BD, shape="note")
    C.node("DCHK",
        lbl("📦", "document_chunks", "", "content &#183; chunkType &#183; hasWarning &#183; F32_BLOB 1536"),
        fillcolor=D_ND, color=D_BD, shape="note")
    C.node("DIMG",
        lbl("🖼️", "extracted_images", "", "imageType &#183; isCritical &#183; isUseful &#183; F32_BLOB 1536"),
        fillcolor=D_ND, color=D_BD, shape="note")
    C.node("DENR",
        lbl("💡", "enrichments", "", "generatedQuestion &#183; expertAnswer &#183; inheritanceLevel &#183; F32_BLOB 1536"),
        fillcolor=D_ND, color=D_BD, shape="note")
    C.node("DCHAT",
        lbl("💬", "chat_sessions + chat_messages", "", "mode: test | record &#183; sessionId &#183; role &#183; content"),
        fillcolor=D_ND, color=D_BD, shape="note")
    C.node("BLOB",
        lbl("☁️", "Cloudflare R2", "", "htl-ascensores-lib &#183; PDFs + Imágenes procesadas"),
        fillcolor=R2_BG, color=R2_BD, shape="cylinder")

# ── Leyenda ────────────────────────────────────────────────────────────────────
with dot.subgraph(name="cluster_legend") as C:
    C.attr(label="Leyenda", style="dashed,rounded", color="#AAAAAA",
           fillcolor="#FAFAFA", fontsize="9", margin="10")
    C.node("leg1", "→  Pipeline activo",
           shape="plaintext", fillcolor="white", fontcolor=B_BD, fontsize="8")
    C.node("leg2", "-->  Staged (pendiente de integración completa)",
           shape="plaintext", fillcolor="white", fontcolor=ST_BD, fontsize="8")
    C.node("leg3", "→  Agentic Loop · GAP Engine (max 3 iteraciones)",
           shape="plaintext", fillcolor="white", fontcolor=LOOP_COLOR, fontsize="8")
    C.node("leg4", "-->  Lectura / Escritura DB",
           shape="plaintext", fillcolor="white", fontcolor=WRITE_COLOR, fontsize="8")
    C.node("leg5", "-->  Flujo async / background",
           shape="plaintext", fillcolor="white", fontcolor=H_BD, fontsize="8")

# ── Rank constraints ───────────────────────────────────────────────────────────
with dot.subgraph() as S:
    S.attr(rank="min")
    for n in ["TECH", "ADMIN"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["CHAT_UI", "DASH_UI", "ENRICH_UI", "AUTH"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["API_CHAT", "API_UPLOAD"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["N0", "A1"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["N4", "A6"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="max")
    for n in ["DDOC", "DCHK", "DIMG", "DENR", "DCHAT", "BLOB"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="sink")
    for n in ["leg1", "leg2", "leg3", "leg4", "leg5"]:
        S.node(n)

# Scaffolding invisible
dot.edge("API_CHAT",  "N0",   style="invis", weight="20")
dot.edge("API_UPLOAD","A1",   style="invis", weight="20")
dot.edge("N5",  "DCHAT", style="invis", weight="5")
dot.edge("A8",  "DENR",  style="invis", weight="5")
dot.edge("BLOB","leg1",  style="invis")
dot.edge("DCHAT","leg3", style="invis")

# ══════════════════════════════════════════════════════════════════════════════
# RELACIONES
# ══════════════════════════════════════════════════════════════════════════════
TRIG  = dict(arrowhead="normal", style="solid",  penwidth="1.3")
FLOW  = dict(arrowhead="normal", style="dashed", penwidth="1.0")
READ  = dict(arrowhead="open",   style="dashed", penwidth="1.0")
ASYNC = dict(arrowhead="open",   style="dashed", penwidth="0.9")

# Usuarios → Frontend
dot.edge("TECH",  "CHAT_UI",    **TRIG, color=U_BD, label="consulta")
dot.edge("ADMIN", "DASH_UI",    **TRIG, color=U_BD, label="upload PDF")
dot.edge("ADMIN", "ENRICH_UI",  **TRIG, color=H_BD, label="responde HITL")
dot.edge("AUTH",  "CHAT_UI",    **READ, color=D_BD, label="validates cookie")
dot.edge("AUTH",  "DASH_UI",    **READ, color=D_BD)

# Frontend → API
dot.edge("CHAT_UI",   "API_CHAT",   **TRIG, color=F_BD, label="messages[] · equipmentModel")
dot.edge("DASH_UI",   "API_UPLOAD", **TRIG, color=F_BD, label="multipart/form-data")
dot.edge("ENRICH_UI", "DENR",       **FLOW, color=H_BD, label="expert_answer · isVerified=1")

# Pipeline Conversacional
dot.edge("API_CHAT", "N0",   **TRIG, color=A_BD)
dot.edge("N0",  "N05",       **FLOW, color=B_BD, label="enriched_query intent")
dot.edge("N05", "N1",        arrowhead="normal", style="dashed", penwidth="1.0",
         color=ST_BD, label="filtros_metadatos staged")
dot.edge("N0",  "N1",        **TRIG, color=B_BD, label="fallback directo", constraint="false")
dot.edge("N1",  "N2",        **TRIG, color=B_BD, label="text_query + image_query")
dot.edge("N2",  "N25",       **TRIG, color=SEL_BD, label="ScoredChunk[]")
dot.edge("N25", "N3",        **TRIG, color=SEL_BD, label="selectedChunks")
# Agentic loop
dot.edge("N3",  "N1",
         arrowhead="normal", style="solid", penwidth="2.2",
         color=LOOP_COLOR, label="GAP · GapDescriptor · shouldLoop=true", constraint="false")
dot.edge("N3",  "N35",       **FLOW, color=B_BD, label="is_resolved · hipotesis")
dot.edge("N35", "N4",        arrowhead="normal", style="dashed", penwidth="1.0",
         color=ST_BD, label="is_valid · staged")
dot.edge("N3",  "N4",        **TRIG, color=B_BD, label="approved · responseMode")
dot.edge("N4",  "N5",        **TRIG, color=B_BD)
dot.edge("N4",  "API_CHAT",  **TRIG, color=B_BD, label="SSE stream", constraint="false")
dot.edge("API_CHAT","CHAT_UI", **TRIG, color=F_BD, label="text/event-stream", constraint="false")

# Pipeline Indexing
dot.edge("API_UPLOAD","A1",   **TRIG, color=A_BD)
dot.edge("API_UPLOAD","DDOC", **FLOW, color=A_BD, label="INSERT status=pending")
dot.edge("API_UPLOAD","BLOB", **FLOW, color=A_BD, label="PUT PDF")
dot.edge("A1","A2", **TRIG, color=I_BD, label="OcrPage[]")
dot.edge("A1","A3", **TRIG, color=I_BD, label="images[] base64")
dot.edge("A2","A5", **TRIG, color=I_BD, label="strategy · language")
dot.edge("A3","A4", **TRIG, color=I_BD, label="type=diagram")
dot.edge("A4","A5", **TRIG, color=I_BD, label="structured_knowledge")
dot.edge("A3","DIMG",**FLOW, color=I_BD, label="INSERT · embedding")
dot.edge("A5","A6", **TRIG, color=I_BD, label="PreparedChunk[]")
dot.edge("A6","DCHK",**FLOW, color=WRITE_COLOR, label="INSERT F32_BLOB")
dot.edge("A6","DDOC",**FLOW, color=WRITE_COLOR, label="UPDATE status=ready")
dot.edge("A7","DDOC",**ASYNC,color=I_BD, label="async recommendations")
dot.edge("A8","DENR",**ASYNC,color=H_BD, label="INSERT gaps L1-L3")

# RAG reads
dot.edge("N2","DCHK",  **READ, color=READ_COLOR, label="vector_distance_cos", constraint="false")
dot.edge("N2","DENR",  **READ, color=READ_COLOR, label="LEFT JOIN is_verified=1", constraint="false")
dot.edge("N2","DIMG",  **READ, color=READ_COLOR, label="vector_distance_cos img", constraint="false")
dot.edge("N5","DCHAT", **FLOW, color=WRITE_COLOR, label="INSERT session/msg", constraint="false")

# ── Renderizar ────────────────────────────────────────────────────────────────
try:
    rendered = dot.render(filename=OUT, cleanup=True)
    print(f"\n✅  Diagrama Lógico generado: {rendered}")
    print(f"    Resolución: 180 DPI · alta definición")
except Exception as e:
    print(f"\n⚠️  dot no encontrado: {e}")
    src = OUT + ".dot"
    with open(src, "w") as f:
        f.write(dot.source)
    print(f"✅  DOT guardado: {src}")
    print(f"    Ejecuta: dot -Tpng {src} -o {OUT}.png -Gdpi=180")
