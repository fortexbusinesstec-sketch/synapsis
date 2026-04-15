"""
SYNAPSE MAS — Diagrama Físico v3
Despliegue en la Nube y Comunicación entre Servicios

Vercel · OpenAI · Mistral AI · Turso LibSQL · Cloudflare R2
Salida: imagenes/diagrama_fisico.png
"""
import sys
sys.path.insert(0, '/home/fabrizio/.local/lib/python3.12/site-packages')
import graphviz

OUT = "/home/fabrizio/Escritorio/GoProyects/synapse/imagenes/diagrama_fisico"

# ── Paleta de colores por proveedor / tipo ────────────────────────────────────
CLI_BG, CLI_BD, CLI_ND  = "#FFF3CD", "#D97706", "#FEF9C3"  # Client
EDG_BG, EDG_BD, EDG_ND  = "#DBEAFE", "#1D4ED8", "#EFF6FF"  # Vercel Edge
FN_BG,  FN_BD,  FN_ND   = "#D1FAE5", "#065F46", "#ECFDF5"  # Vercel Functions
OAI_BG, OAI_BD, OAI_ND  = "#EDE9FE", "#6D28D9", "#F5F3FF"  # OpenAI
MIS_BG, MIS_BD, MIS_ND  = "#FCE7F3", "#9D174D", "#FDF2F8"  # Mistral
TUR_BG, TUR_BD, TUR_ND  = "#E0F2FE", "#0369A1", "#F0F9FF"  # Turso
R2_BG,  R2_BD,  R2_ND   = "#ECFDF5", "#047857", "#F0FDF4"  # Cloudflare R2

# ── Helper: etiqueta HTML ────────────────────────────────────────────────────
def lbl(icon, title, subtitle="", detail=""):
    rows = (
        f'<TR><TD ALIGN="CENTER">'
        f'<B><FONT POINT-SIZE="10">{icon} {title}</FONT></B>'
        f'</TD></TR>'
    )
    if subtitle:
        rows += (
            f'<TR><TD ALIGN="CENTER">'
            f'<FONT POINT-SIZE="8" COLOR="#6D28D9"><I>{subtitle}</I></FONT>'
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
dot = graphviz.Digraph("SYNAPSE_Fisico", format="png", engine="dot")
dot.attr(
    rankdir  = "TB",
    dpi      = "180",
    size     = "28,22",
    bgcolor  = "white",
    fontname = "Helvetica Neue",
    compound = "true",
    ranksep  = "1.2",
    nodesep  = "0.5",
    splines  = "ortho",
    newrank  = "true",
    label    = (
        '<<FONT POINT-SIZE="19"><B>'
        'SYNAPSE MAS &#8212; Diagrama F&#237;sico: Despliegue en la Nube'
        '</B></FONT><BR/>'
        '<FONT POINT-SIZE="11" COLOR="#555555">'
        'Vercel &#183; OpenAI &#183; Mistral AI &#183; Turso Cloud &#183; Cloudflare R2'
        ' &#183; Next.js 16.2.1'
        '</FONT>>'
    ),
    labelloc = "t",
    pad      = "0.6",
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
    fontname  = "Helvetica Neue",
    fontsize  = "7.5",
    arrowsize = "0.6",
    penwidth  = "1.0",
)

# ══════════════════════════════════════════════════════════════════════════════
# CLIENTE
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_client") as C:
    C.attr(label="Cliente", style="filled,rounded",
           fillcolor=CLI_BG, color=CLI_BD, penwidth="2", fontsize="10", margin="12")
    C.node("CLIENT",
        lbl("🖥️", "Browser", "",
            "Técnico / Administrador Schindler &#183; Chrome &#183; Firefox"),
        fillcolor=CLI_ND, color=CLI_BD)

# ══════════════════════════════════════════════════════════════════════════════
# VERCEL CLOUD PLATFORM
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_vercel") as C:
    C.attr(
        label     = "Vercel Cloud Platform  &#183;  Serverless &#183; Global Edge Network  &#183;  Next.js 16.2.1",
        style     = "filled,rounded",
        fillcolor = "#F8FAFF", color="#3B4FD9", penwidth="3",
        fontsize  = "11", fontcolor="#3B4FD9", margin="20",
    )

    # ── Edge Network ──────────────────────────────────────────────────────────
    with C.subgraph(name="cluster_edge") as E:
        E.attr(
            label     = "Edge Network  &#183;  CDN &#183; TLS Termination &#183; Global PoP",
            style     = "filled,rounded",
            fillcolor = EDG_BG, color=EDG_BD, penwidth="2",
            fontsize  = "9", fontcolor=EDG_BD, margin="12",
        )
        E.node("STATIC",
            lbl("📦", "Static Bundle", "",
                "Next.js SSG &#183; HTML &#183; JS &#183; CSS &#183; Cache max-age=31536000"),
            fillcolor=EDG_ND, color=EDG_BD)
        E.node("PROXY",
            lbl("🔐", "Session Middleware", "/api/session",
                "Cookie: schindler_session &#183; Request validation &#183; Rewrite rules"),
            fillcolor=EDG_ND, color=EDG_BD)

    # ── Serverless Functions ──────────────────────────────────────────────────
    with C.subgraph(name="cluster_fns") as F:
        F.attr(
            label     = "Serverless Functions  &#183;  Node.js 20 &#183; Region: iad1 (us-east-1)",
            style     = "filled,rounded",
            fillcolor = FN_BG, color=FN_BD, penwidth="2",
            fontsize  = "9", fontcolor=FN_BD, margin="12",
        )
        F.node("FN_CHAT",
            lbl("⚡", "fn:chat", "POST /api/chat",
                "maxDuration: 60s &#183; Vercel AI SDK v4.1 &#183; streamText &#183; SSE text/event-stream"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_UPLOAD",
            lbl("📤", "fn:upload", "POST /api/upload",
                "maxDuration: 300s &#183; @vercel/functions waitUntil &#183; 8-agent pipeline"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_STATUS",
            lbl("🔄", "fn:status", "GET /api/documents/id/status",
                "Polling &#183; SELECT status FROM documents"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_ENRICH",
            lbl("💡", "fn:enrich", "POST /api/documents/id/enrich",
                "HITL &#183; UPDATE enrichments SET is_verified=1 &#183; embed()"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_COSTS",
            lbl("📊", "fn:recalculate", "POST /api/documents/id/recalculate-costs",
                "FinOps &#183; pageCount x $0.001 &#183; hitlImages x $0.0002"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_SCAN",
            lbl("🔍", "fn:scan", "POST /api/documents/id/scan-recommendations",
                "VectorScanner &#183; auditorRecommendations &#183; async"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_IMAGES",
            lbl("🖼️", "fn:images", "GET/POST /api/images",
                "extracted_images &#183; isUseful HITL &#183; embed image"),
            fillcolor=FN_ND, color=FN_BD)
        F.node("FN_ABLATION",
            lbl("🧪", "fn:ablation", "POST /api/ablation/*",
                "run &#183; judge &#183; scenarios &#183; summary &#183; conclusions"),
            fillcolor=FN_ND, color=FN_BD)

# ══════════════════════════════════════════════════════════════════════════════
# OPENAI PLATFORM
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_oai") as C:
    C.attr(
        label     = "OpenAI Platform  &#183;  api.openai.com  &#183;  HTTPS REST",
        style     = "filled,rounded",
        fillcolor = OAI_BG, color=OAI_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=OAI_BD, margin="15",
    )
    C.node("GPT4O",
        lbl("🧠", "GPT-4o", "",
            "Ingeniero Jefe &#183; streamText &#183; Verificador de Fidelidad"
            " &#183; Vision (descripción) &#183; temperature=0"),
        fillcolor=OAI_ND, color=OAI_BD, shape="ellipse")
    C.node("GPT4MINI",
        lbl("🤖", "GPT-4o-mini", "",
            "Clarificador &#183; Planificador &#183; Orchestrator &#183; Chunker"
            " &#183; Analista &#183; Curioso &#183; DiagramReasoner &#183; Enrutador"),
        fillcolor=OAI_ND, color=OAI_BD, shape="ellipse")
    C.node("EMB",
        lbl("🔢", "text-embedding-3-small", "",
            "1536 dimensions &#183; $0.02/1M tokens &#183; Todos los vectores F32_BLOB"),
        fillcolor=OAI_ND, color=OAI_BD, shape="ellipse")

# ══════════════════════════════════════════════════════════════════════════════
# MISTRAL AI PLATFORM
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_mistral") as C:
    C.attr(
        label     = "Mistral AI Platform  &#183;  api.mistral.ai  &#183;  HTTPS REST",
        style     = "filled,rounded",
        fillcolor = MIS_BG, color=MIS_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=MIS_BD, margin="15",
    )
    C.node("MOCR",
        lbl("📖", "mistral-ocr-latest", "",
            "PDF pages to Markdown &#183; $0.001/pág &#183; OcrPage[] output · OCR + VectorScanner"),
        fillcolor=MIS_ND, color=MIS_BD, shape="ellipse")
    C.node("MVIS",
        lbl("👁️", "pixtral-12b-2409", "",
            "Vision Multimodal &#183; base64 image input &#183; imageType &#183; confidence"),
        fillcolor=MIS_ND, color=MIS_BD, shape="ellipse")

# ══════════════════════════════════════════════════════════════════════════════
# TURSO CLOUD
# ══════════════════════════════════════════════════════════════════════════════
with dot.subgraph(name="cluster_turso") as C:
    C.attr(
        label     = "Turso Cloud  &#183;  libsql://htl-synapse-ia.turso.io",
        style     = "filled,rounded",
        fillcolor = TUR_BG, color=TUR_BD, penwidth="2.5",
        fontsize  = "10", fontcolor=TUR_BD, margin="15",
    )
    C.node("TNODE",
        lbl("🗄️", "LibSQL  ·  SQLite-compatible", "",
            "7 tablas core + ablation &#183; Edge Replication &#183; Drizzle ORM v0.40"),
        fillcolor=TUR_ND, color=TUR_BD, shape="cylinder")
    C.node("TVEC",
        lbl("🔎", "Native Vector Index", "",
            "vector_distance_cos(embedding, vector32(?)) &#183; F32_BLOB(1536) &#183; Cosine Similarity"),
        fillcolor=TUR_ND, color=TUR_BD)
    C.edge("TNODE", "TVEC", arrowhead="none", style="solid", color=TUR_BD, label="integrated")

# ══════════════════════════════════════════════════════════════════════════════
# CLOUDFLARE R2
# ══════════════════════════════════════════════════════════════════════════════
dot.node("R2",
    lbl("🪣", "Cloudflare R2", "htl-ascensores-lib",
        "S3-compatible &#183; @aws-sdk/client-s3 v3"
        " &#183; PDFs: docId/original.pdf &#183; Images: docId/imageId.jpg"),
    fillcolor=R2_ND, color=R2_BD, shape="cylinder", style="filled,rounded")

# ── Rank constraints ───────────────────────────────────────────────────────────
with dot.subgraph() as S:
    S.attr(rank="min")
    for n in ["CLIENT"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["STATIC", "PROXY"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["FN_CHAT", "FN_UPLOAD", "FN_STATUS", "FN_ENRICH",
              "FN_COSTS", "FN_SCAN", "FN_IMAGES", "FN_ABLATION"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["GPT4O", "GPT4MINI", "EMB", "MOCR", "MVIS"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="max")
    for n in ["TNODE", "TVEC", "R2"]:
        S.node(n)

# Scaffolding invisible
dot.edge("PROXY",   "FN_CHAT",   style="invis", weight="10")
dot.edge("FN_CHAT", "GPT4O",     style="invis", weight="10")
dot.edge("GPT4O",   "TNODE",     style="invis", weight="10")

# ══════════════════════════════════════════════════════════════════════════════
# RELACIONES
# ══════════════════════════════════════════════════════════════════════════════
HTTPS = dict(arrowhead="normal", style="solid",  penwidth="1.3")
DASH  = dict(arrowhead="normal", style="dashed", penwidth="1.0")
SSE   = dict(arrowhead="normal", style="solid",  penwidth="1.5", color="#DC2626")

# Cliente → Vercel Edge
dot.edge("CLIENT","PROXY",  **HTTPS, color=CLI_BD, label="HTTPS · Cookie header")
dot.edge("PROXY", "STATIC", **HTTPS, color=EDG_BD, label="serves static assets")
dot.edge("STATIC","CLIENT", **HTTPS, color=EDG_BD, label="HTTPS 200 · gzip", constraint="false")

# Edge → Functions
dot.edge("PROXY","FN_CHAT",    **HTTPS, color=EDG_BD, label="rewrite /api/chat")
dot.edge("PROXY","FN_UPLOAD",  **HTTPS, color=EDG_BD, label="rewrite /api/upload")
dot.edge("PROXY","FN_STATUS",  **HTTPS, color=EDG_BD, label="rewrite /api/*/status")
dot.edge("PROXY","FN_ENRICH",  **HTTPS, color=EDG_BD, label="rewrite /api/*/enrich")
dot.edge("PROXY","FN_COSTS",   **HTTPS, color=EDG_BD, label="rewrite recalculate-costs")
dot.edge("PROXY","FN_SCAN",    **HTTPS, color=EDG_BD, label="rewrite scan-recommendations")
dot.edge("PROXY","FN_IMAGES",  **HTTPS, color=EDG_BD, label="rewrite /api/images")
dot.edge("PROXY","FN_ABLATION",**HTTPS, color=EDG_BD, label="rewrite /api/ablation/*")

# SSE back to client
dot.edge("FN_CHAT","CLIENT",
         arrowhead="normal", style="solid", penwidth="2", color="#DC2626",
         label="SSE text/event-stream", constraint="false")

# Functions → OpenAI
dot.edge("FN_CHAT",   "GPT4O",    **DASH, color=OAI_BD, label="HTTPS · generateText · streamText · Bearer")
dot.edge("FN_CHAT",   "GPT4MINI", **DASH, color=OAI_BD, label="HTTPS · generateText · generateObject")
dot.edge("FN_CHAT",   "EMB",      **DASH, color=OAI_BD, label="HTTPS · embed() · 1536-dim")
dot.edge("FN_UPLOAD", "GPT4MINI", **DASH, color=OAI_BD, label="HTTPS · generateText · generateObject")
dot.edge("FN_UPLOAD", "GPT4O",    **DASH, color=OAI_BD, label="HTTPS · Vision description")
dot.edge("FN_UPLOAD", "EMB",      **DASH, color=OAI_BD, label="HTTPS · embed()")
dot.edge("FN_ENRICH", "EMB",      **DASH, color=OAI_BD, label="HTTPS · embed() enrichment")
dot.edge("FN_IMAGES", "EMB",      **DASH, color=OAI_BD, label="HTTPS · embed() image")
dot.edge("FN_ABLATION","GPT4O",   **DASH, color=OAI_BD, label="HTTPS · judge LLM")
dot.edge("FN_ABLATION","GPT4MINI",**DASH, color=OAI_BD, label="HTTPS · ablation run")

# Functions → Mistral
dot.edge("FN_UPLOAD","MOCR", **DASH, color=MIS_BD, label="HTTPS · PDF pages · multipart")
dot.edge("FN_UPLOAD","MVIS", **DASH, color=MIS_BD, label="HTTPS · base64 image · pixtral")
dot.edge("FN_SCAN",  "MOCR", **DASH, color=MIS_BD, label="HTTPS · scan · mistral-ocr")

# Functions → Turso
dot.edge("FN_CHAT",    "TNODE", **DASH, color=TUR_BD,
         label="libsql:// WebSocket · Drizzle ORM · vector search")
dot.edge("FN_UPLOAD",  "TNODE", **DASH, color=TUR_BD,
         label="libsql:// batch INSERT · UPSERT documents")
dot.edge("FN_STATUS",  "TNODE", **DASH, color=TUR_BD, label="libsql:// SELECT status")
dot.edge("FN_ENRICH",  "TNODE", **DASH, color=TUR_BD, label="libsql:// UPDATE is_verified=1")
dot.edge("FN_COSTS",   "TNODE", **DASH, color=TUR_BD, label="libsql:// UPDATE costs")
dot.edge("FN_SCAN",    "TNODE", **DASH, color=TUR_BD, label="libsql:// vector scan")
dot.edge("FN_IMAGES",  "TNODE", **DASH, color=TUR_BD, label="libsql:// extracted_images")
dot.edge("FN_ABLATION","TNODE", **DASH, color=TUR_BD, label="libsql:// ablation tables")

# Functions → R2
dot.edge("FN_UPLOAD","R2", **DASH, color=R2_BD,
         label="S3 API HTTPS · PUT application/pdf &#43; image/jpeg")

# ── Renderizar ────────────────────────────────────────────────────────────────
try:
    rendered = dot.render(filename=OUT, cleanup=True)
    print(f"\n✅  Diagrama Físico generado: {rendered}")
    print(f"    Resolución: 180 DPI · alta definición")
except Exception as e:
    print(f"\n⚠️  dot no encontrado: {e}")
    src = OUT + ".dot"
    with open(src, "w") as f:
        f.write(dot.source)
    print(f"✅  DOT guardado: {src}")
    print(f"    Ejecuta: dot -Tpng {src} -o {OUT}.png -Gdpi=180")
