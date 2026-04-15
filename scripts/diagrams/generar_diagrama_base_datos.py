"""
SYNAPSE MAS — Diagrama de Base de Datos · Núcleo RAG
Modelo Relacional con Vectores · Turso LibSQL

Tablas: documents · document_chunks · extracted_images · enrichments
        chat_sessions · chat_messages · agent_logs
Salida: imagenes/diagrama_base_datos.png
"""
import sys
sys.path.insert(0, '/home/fabrizio/.local/lib/python3.12/site-packages')
import graphviz

OUT = "/home/fabrizio/Escritorio/GoProyects/synapse/imagenes/diagrama_base_datos"

# ── Paleta de colores ─────────────────────────────────────────────────────────
H_DOCS  = "#1D4ED8"   # documents     → azul
H_CHK   = "#065F46"   # chunks        → verde oscuro
H_IMG   = "#9D174D"   # images        → rosa oscuro
H_ENR   = "#92400E"   # enrichments   → ámbar oscuro
H_SESS  = "#374151"   # chat_sessions → gris oscuro
H_MSG   = "#4B5563"   # chat_messages → gris medio
H_LOG   = "#1E3A5F"   # agent_logs    → azul marino

ROW_BG  = "#FAFAFA"
ALT_BG  = "#F3F4F6"

PK_BG   = "#FEF3C7"   # PK → amarillo suave
FK_BG   = "#EFF6FF"   # FK → azul suave
VEC_BG  = "#EDE9FE"   # F32_BLOB → violeta suave
VEC_FG  = "#5B21B6"

# ── Helper: nodo tabla HTML ────────────────────────────────────────────────────
def table_node(node_id, name, header_color, fields):
    html = (
        f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">'
        f'<TR>'
        f'<TD COLSPAN="3" BGCOLOR="{header_color}" ALIGN="CENTER">'
        f'<B><FONT POINT-SIZE="11" COLOR="white">{name}</FONT></B>'
        f'</TD>'
        f'</TR>'
        f'<TR>'
        f'<TD BGCOLOR="#E5E7EB"><FONT POINT-SIZE="7.5" COLOR="#374151"><B>Campo</B></FONT></TD>'
        f'<TD BGCOLOR="#E5E7EB"><FONT POINT-SIZE="7.5" COLOR="#374151"><B>Tipo</B></FONT></TD>'
        f'<TD BGCOLOR="#E5E7EB"><FONT POINT-SIZE="7.5" COLOR="#374151"><B>Nota</B></FONT></TD>'
        f'</TR>'
    )
    for idx, (fname, ftype, fnote, is_pk, is_fk, is_vec) in enumerate(fields):
        if is_vec:
            bg, fc, icon = VEC_BG, VEC_FG, "&#9670; "
        elif is_pk:
            bg, fc, icon = PK_BG, "#92400E", "&#128273; "
        elif is_fk:
            bg, fc, icon = FK_BG, "#1D4ED8", "&#128279; "
        else:
            bg  = ROW_BG if idx % 2 == 0 else ALT_BG
            fc, icon = "#1C1917", ""

        note_cell = (
            f'<FONT POINT-SIZE="7" COLOR="#6B7280">{fnote}</FONT>'
            if fnote else
            '<FONT POINT-SIZE="7" COLOR="#6B7280"> </FONT>'
        )
        html += (
            f'<TR>'
            f'<TD BGCOLOR="{bg}" ALIGN="LEFT">'
            f'<FONT POINT-SIZE="8" COLOR="{fc}">{icon}<B>{fname}</B></FONT>'
            f'</TD>'
            f'<TD BGCOLOR="{bg}" ALIGN="LEFT">'
            f'<FONT POINT-SIZE="7.5" COLOR="#6D28D9"><I>{ftype}</I></FONT>'
            f'</TD>'
            f'<TD BGCOLOR="{bg}" ALIGN="LEFT">{note_cell}</TD>'
            f'</TR>'
        )
    html += '</TABLE>>'
    return html


# ── Grafo principal ────────────────────────────────────────────────────────────
dot = graphviz.Digraph("SYNAPSE_DB_CORE", format="png", engine="dot")
dot.attr(
    rankdir  = "TB",
    dpi      = "180",
    size     = "30,24",
    bgcolor  = "white",
    fontname = "Helvetica Neue",
    compound = "true",
    ranksep  = "1.6",
    nodesep  = "0.8",
    splines  = "ortho",
    label    = (
        '<<FONT POINT-SIZE="19"><B>'
        'SYNAPSE MAS &#8212; Modelo de Base de Datos · Núcleo RAG'
        '</B></FONT><BR/>'
        '<FONT POINT-SIZE="11" COLOR="#555555">'
        'Turso LibSQL &#183; Drizzle ORM &#183; F32_BLOB(1536) &#183; vector_distance_cos()'
        '</FONT>>'
    ),
    labelloc = "t",
    pad      = "0.8",
)
dot.attr("node",
    fontname = "Helvetica Neue",
    fontsize = "9",
    style    = "filled",
    shape    = "plaintext",
    margin   = "0",
)
dot.attr("edge",
    fontname  = "Helvetica Neue",
    fontsize  = "8",
    arrowsize = "0.7",
    penwidth  = "1.4",
)

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: documents
# ══════════════════════════════════════════════════════════════════════════════
docs_fields = [
    ("id",                    "text",  "PK · cuid2",                              True,  False, False),
    ("title",                 "text",  "NOT NULL",                                False, False, False),
    ("brand",                 "text",  "default: Schindler",                      False, False, False),
    ("equipment_model",       "text",  "idx: idx_documents_model",                False, False, False),
    ("doc_type",              "text",  "manual | plano | certificado",            False, False, False),
    ("language",              "text",  "es | en | de | fr",                       False, False, False),
    ("pdf_url",               "text",  "NOT NULL · Cloudflare R2 path",           False, False, False),
    ("page_count",            "int",   "",                                        False, False, False),
    ("status",                "text",  "pending | processing | ready | error",    False, False, False),
    ("cost_orchestrator",     "real",  "USD · gpt-4o-mini",                       False, False, False),
    ("cost_ocr",              "real",  "USD · $0.001/pag · Mistral",             False, False, False),
    ("cost_vision",           "real",  "USD · pixtral-12b",                       False, False, False),
    ("cost_chunker",          "real",  "USD · gpt-4o-mini",                       False, False, False),
    ("cost_embedder",         "real",  "USD · text-emb-3-small",                 False, False, False),
    ("total_cost",            "real",  "USD · sum FinOps",                        False, False, False),
    ("auditor_recommendations","text", "JSON Array · VectorScanner",              False, False, False),
    ("created_at",            "text",  "CURRENT_TIMESTAMP",                      False, False, False),
    ("updated_at",            "text",  "CURRENT_TIMESTAMP",                      False, False, False),
]
dot.node("DOCS", table_node("DOCS", "documents", H_DOCS, docs_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: document_chunks
# ══════════════════════════════════════════════════════════════════════════════
chunks_fields = [
    ("id",             "text",       "PK · cuid2",                                   True,  False, False),
    ("document_id",    "text",       "FK → documents.id · CASCADE",                 False, True,  False),
    ("content",        "text",       "NOT NULL · chunk text body",                   False, False, False),
    ("page_number",    "int",        "source page origin",                           False, False, False),
    ("chunk_index",    "int",        "order within page",                            False, False, False),
    ("section_title",  "text",       "semantic section header",                      False, False, False),
    ("chunk_type",     "text",       "procedure | specification | warning | table",  False, False, False),
    ("has_warning",    "int",        "0 | 1 · safety critical flag",                 False, False, False),
    ("content_tokens", "int",        "estimated token count",                        False, False, False),
    ("embedding",      "F32_BLOB",   "1536-dim · cosine vector search",              False, False, True),
    ("created_at",     "text",       "CURRENT_TIMESTAMP",                            False, False, False),
]
dot.node("CHUNKS", table_node("CHUNKS", "document_chunks", H_CHK, chunks_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: extracted_images
# ══════════════════════════════════════════════════════════════════════════════
images_fields = [
    ("id",               "text",      "PK · cuid2",                                    True,  False, False),
    ("document_id",      "text",      "FK → documents.id · CASCADE",                  False, True,  False),
    ("related_chunk_id", "text",      "FK → document_chunks.id · nullable",           False, True,  False),
    ("page_number",      "int",       "source page",                                   False, False, False),
    ("image_url",        "text",      "Cloudflare R2 path",                            False, False, False),
    ("image_type",       "text",      "diagram | schematic | photo | table | other",   False, False, False),
    ("confidence",       "real",      "pixtral-12b score 0.0 - 1.0",                  False, False, False),
    ("description",      "text",      "Vision agent free text output",                 False, False, False),
    ("is_critical",      "int",       "0 | 1 · safety-relevant image",                 False, False, False),
    ("is_useful",        "int",       "0=pending | 1=util | -1=discard · HITL",        False, False, False),
    ("user_comment",     "text",      "HITL expert annotation",                        False, False, False),
    ("is_discarded",     "int",       "0 | 1 · manual discard",                        False, False, False),
    ("embedding",        "F32_BLOB",  "1536-dim · cosine vector search",               False, False, True),
    ("created_at",       "text",      "CURRENT_TIMESTAMP",                             False, False, False),
]
dot.node("IMAGES", table_node("IMAGES", "extracted_images", H_IMG, images_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: enrichments
# ══════════════════════════════════════════════════════════════════════════════
enrich_fields = [
    ("id",                   "text",     "PK · cuid2",                                       True,  False, False),
    ("document_id",          "text",     "FK → documents.id · CASCADE",                     False, True,  False),
    ("reference_id",         "text",     "FK polymorphic · chunk.id OR image.id",            False, True,  False),
    ("reference_type",       "text",     "chunk | image",                                    False, False, False),
    ("original_excerpt",     "text",     "NOT NULL · source fragment",                       False, False, False),
    ("generated_question",   "text",     "NOT NULL · detected knowledge gap",                False, False, False),
    ("expert_answer",        "text",     "NULL until HITL responds",                         False, False, False),
    ("answer_source",        "text",     "pending | expert | manual_ref | inherited",        False, False, False),
    ("inheritance_level",    "int",      "1=exact | 2=model | 3=semantic · Curioso",         False, False, False),
    ("confidence",           "real",     "0.0 - 1.0",                                        False, False, False),
    ("is_verified",          "int",      "0 | 1 · GATE: activates RAG inclusion",            False, False, False),
    ("times_retrieved",      "int",      "RAG usage frequency counter",                      False, False, False),
    ("answer_length_tokens", "int",      "context budget control",                           False, False, False),
    ("embedding",            "F32_BLOB", "1536-dim · cosine vector search",                  False, False, True),
    ("created_at",           "text",     "CURRENT_TIMESTAMP",                                False, False, False),
    ("reviewed_at",          "text",     "HITL review timestamp",                            False, False, False),
]
dot.node("ENRICH", table_node("ENRICH", "enrichments", H_ENR, enrich_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: chat_sessions
# ══════════════════════════════════════════════════════════════════════════════
sessions_fields = [
    ("id",              "text",  "PK · nanoid/uuid",                              True,  False, False),
    ("mode",            "text",  "test | record",                                 False, False, False),
    ("equipment_model", "text",  "3300 | 5500 | general",                         False, False, False),
    ("created_at",      "text",  "CURRENT_TIMESTAMP",                             False, False, False),
    ("ended_at",        "text",  "NULL until session closes",                     False, False, False),
    ("message_count",   "int",   "incremented per message",                       False, False, False),
    ("total_tokens",    "int",   "accumulated token usage",                       False, False, False),
    ("total_cost_usd",  "real",  "accumulated cost USD",                          False, False, False),
]
dot.node("SESSIONS", table_node("SESSIONS", "chat_sessions", H_SESS, sessions_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: chat_messages
# ══════════════════════════════════════════════════════════════════════════════
messages_fields = [
    ("id",                  "text",  "PK · nanoid/uuid",                                True,  False, False),
    ("session_id",          "text",  "FK → chat_sessions.id · CASCADE",                False, True,  False),
    ("role",                "text",  "user | assistant | clarification",                False, False, False),
    ("content",             "text",  "NOT NULL · message body",                         False, False, False),
    ("clarification_data",  "text",  "JSON · only if role=clarification",               False, False, False),
    ("retrieved_chunk_ids", "text",  "JSON array · chunk IDs used",                    False, False, False),
    ("retrieved_image_ids", "text",  "JSON array · image IDs used",                    False, False, False),
    ("created_at",          "text",  "CURRENT_TIMESTAMP",                              False, False, False),
]
dot.node("MSGS", table_node("MSGS", "chat_messages", H_MSG, messages_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: agent_logs
# ══════════════════════════════════════════════════════════════════════════════
logs_fields = [
    ("id",             "text",  "PK · cuid2",                                     True,  False, False),
    ("document_id",    "text",  "FK → documents.id · CASCADE",                   False, True,  False),
    ("agent_name",     "text",  "NOT NULL · clarifier | planner | bibliotecario…", False, False, False),
    ("status",         "text",  "running | done | error",                          False, False, False),
    ("started_at",     "text",  "CURRENT_TIMESTAMP",                               False, False, False),
    ("ended_at",       "text",  "NULL until complete",                             False, False, False),
    ("duration_ms",    "int",   "end-to-end latency",                              False, False, False),
    ("input_tokens",   "int",   "LLM input tokens",                                False, False, False),
    ("output_tokens",  "int",   "LLM output tokens",                               False, False, False),
    ("input_summary",  "text",  "agent input preview",                             False, False, False),
    ("output_summary", "text",  "agent output preview",                            False, False, False),
    ("error_message",  "text",  "NULL unless error",                               False, False, False),
    ("metadata",       "text",  "JSON · extra observability data",                 False, False, False),
]
dot.node("LOGS", table_node("LOGS", "agent_logs", H_LOG, logs_fields))

# ── Rank constraints ───────────────────────────────────────────────────────────
with dot.subgraph() as S:
    S.attr(rank="min")
    S.node("DOCS")

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["CHUNKS", "IMAGES"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["ENRICH", "LOGS"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="max")
    for n in ["SESSIONS", "MSGS"]:
        S.node(n)

# Scaffolding invisible
dot.edge("DOCS",   "CHUNKS",   style="invis", weight="10")
dot.edge("DOCS",   "IMAGES",   style="invis", weight="10")
dot.edge("CHUNKS", "ENRICH",   style="invis", weight="5")
dot.edge("IMAGES", "ENRICH",   style="invis", weight="5")
dot.edge("ENRICH", "SESSIONS", style="invis", weight="5")

# ══════════════════════════════════════════════════════════════════════════════
# RELACIONES
# ══════════════════════════════════════════════════════════════════════════════
REL_STYLE = dict(arrowhead="crow", arrowtail="tee", dir="both", penwidth="1.5")

dot.edge("DOCS", "CHUNKS",
         **REL_STYLE, color=H_CHK,
         label=" 1:N  indexed by\nOCR + Chunker")

dot.edge("DOCS", "IMAGES",
         **REL_STYLE, color=H_IMG,
         label=" 1:N  extracted by\nVision")

dot.edge("DOCS", "ENRICH",
         **REL_STYLE, color=H_ENR,
         label=" 1:N  gaps detected\nby Curioso",
         constraint="false")

dot.edge("DOCS", "LOGS",
         **REL_STYLE, color=H_LOG,
         label=" 1:N  agent\nobservability")

dot.edge("CHUNKS", "IMAGES",
         arrowhead="odot", arrowtail="none", dir="forward",
         penwidth="1.2", style="dashed", color="#6B7280",
         label=" related_chunk_id\n(context bridge)")

dot.edge("CHUNKS", "ENRICH",
         **REL_STYLE, color=H_ENR,
         label=" 1:N  reference_type\n= chunk")

dot.edge("IMAGES", "ENRICH",
         **REL_STYLE, color=H_ENR,
         label=" 1:N  reference_type\n= image")

dot.edge("SESSIONS", "MSGS",
         **REL_STYLE, color=H_MSG,
         label=" 1:N  messages\nper session")

# ── Leyenda ────────────────────────────────────────────────────────────────────
with dot.subgraph(name="cluster_legend") as C:
    C.attr(label="Leyenda de campos", style="dashed,rounded",
           color="#AAAAAA", fillcolor="#FAFAFA", fontsize="9", margin="12")
    C.node("lPK",
        f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">'
        f'<TR><TD BGCOLOR="{PK_BG}"><FONT POINT-SIZE="8" COLOR="#92400E">'
        f'&#128273; Campo</FONT></TD>'
        f'<TD BGCOLOR="{PK_BG}"><FONT POINT-SIZE="8" COLOR="#92400E">'
        f'Primary Key (PK)</FONT></TD></TR>'
        f'</TABLE>>',
        shape="plaintext")
    C.node("lFK",
        f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">'
        f'<TR><TD BGCOLOR="{FK_BG}"><FONT POINT-SIZE="8" COLOR="#1D4ED8">'
        f'&#128279; Campo</FONT></TD>'
        f'<TD BGCOLOR="{FK_BG}"><FONT POINT-SIZE="8" COLOR="#1D4ED8">'
        f'Foreign Key (FK)</FONT></TD></TR>'
        f'</TABLE>>',
        shape="plaintext")
    C.node("lVEC",
        f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">'
        f'<TR><TD BGCOLOR="{VEC_BG}"><FONT POINT-SIZE="8" COLOR="{VEC_FG}">'
        f'&#9670; embedding</FONT></TD>'
        f'<TD BGCOLOR="{VEC_BG}"><FONT POINT-SIZE="8" COLOR="{VEC_FG}">'
        f'F32_BLOB(1536) · vector_distance_cos()</FONT></TD></TR>'
        f'</TABLE>>',
        shape="plaintext")
    C.node("lREL",
        '<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4">'
        '<TR><TD><FONT POINT-SIZE="8" COLOR="#374151">'
        '|&lt;-- --&gt;|  Relación 1:N (crow notation)'
        '</FONT></TD></TR></TABLE>>',
        shape="plaintext")

dot.edge("MSGS", "lPK",  style="invis")
dot.edge("MSGS", "lREL", style="invis")

# ── Renderizar ────────────────────────────────────────────────────────────────
try:
    rendered = dot.render(filename=OUT, cleanup=True)
    print(f"\n✅  Diagrama BD Core generado: {rendered}")
    print(f"    Resolución: 180 DPI · alta definición")
except Exception as e:
    print(f"\n⚠️  dot no encontrado: {e}")
    src = OUT + ".dot"
    with open(src, "w") as f:
        f.write(dot.source)
    print(f"✅  DOT guardado: {src}")
    print(f"    Ejecuta: dot -Tpng {src} -o {OUT}.png -Gdpi=180")
