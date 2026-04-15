"""
SYNAPSE MAS — Diagrama de Base de Datos · Estudio de Ablación y Métricas
Modelo Relacional · Turso LibSQL

Tablas: indexing_metrics · ablation_configurations
        ablation_scenarios · ablation_scenario_turns
        ablation_scenario_runs · ablation_scenario_turn_results
        ablation_scenario_scores · ablation_scenario_summary
Salida: imagenes/diagrama_base_datos_ablacion.png
"""
import sys
sys.path.insert(0, '/home/fabrizio/.local/lib/python3.12/site-packages')
import graphviz

OUT = "/home/fabrizio/Escritorio/GoProyects/synapse/imagenes/diagrama_base_datos_ablacion"

# ── Paleta de colores ─────────────────────────────────────────────────────────
H_MET   = "#0F766E"   # indexing_metrics  → teal oscuro
H_CONF  = "#3730A3"   # ablation_config   → índigo
H_SCEN  = "#7C3AED"   # ablation_scenario → violeta
H_TURN  = "#6D28D9"   # scenario_turns    → violeta oscuro
H_RUN   = "#991B1B"   # scenario_runs     → rojo oscuro
H_TRES  = "#B45309"   # turn_results      → ámbar oscuro
H_SCO   = "#065F46"   # scenario_scores   → verde oscuro
H_SUM   = "#1D4ED8"   # scenario_summary  → azul

ROW_BG  = "#FAFAFA"
ALT_BG  = "#F3F4F6"

PK_BG   = "#FEF3C7"
FK_BG   = "#EFF6FF"

# ── Helper ────────────────────────────────────────────────────────────────────
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
    for idx, (fname, ftype, fnote, is_pk, is_fk) in enumerate(fields):
        if is_pk:
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
dot = graphviz.Digraph("SYNAPSE_DB_ABLATION", format="png", engine="dot")
dot.attr(
    rankdir  = "TB",
    dpi      = "180",
    size     = "32,26",
    bgcolor  = "white",
    fontname = "Helvetica Neue",
    compound = "true",
    ranksep  = "1.6",
    nodesep  = "0.9",
    splines  = "ortho",
    label    = (
        '<<FONT POINT-SIZE="19"><B>'
        'SYNAPSE MAS &#8212; Modelo de Base de Datos · Ablación y Métricas'
        '</B></FONT><BR/>'
        '<FONT POINT-SIZE="11" COLOR="#555555">'
        'Turso LibSQL &#183; Drizzle ORM &#183; Estudio de Ablación &#183; Escenarios Multi-Turno'
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
# TABLA: indexing_metrics
# ══════════════════════════════════════════════════════════════════════════════
metrics_fields = [
    ("id",                    "text", "PK · cuid2",                              True,  False),
    ("document_id",           "text", "FK → documents.id · CASCADE",            False, True),
    ("total_chunks",          "int",  "chunks after pipeline",                  False, False),
    ("hitl_images",           "int",  "images reviewed by HITL",                False, False),
    ("agent_mismatch_count",  "int",  "orchestrator vs actual disagreements",   False, False),
    ("detected_gaps",         "int",  "gaps found by Curioso",                  False, False),
    ("inherited_l1",          "int",  "exact model match",                      False, False),
    ("inherited_l2",          "int",  "meta/model match",                       False, False),
    ("inherited_l3",          "int",  "semantic match",                         False, False),
    ("total_input_tokens",    "int",  "sum input tokens all agents",            False, False),
    ("total_output_tokens",   "int",  "sum output tokens all agents",           False, False),
    ("processing_time_ms",    "int",  "end-to-end pipeline latency",            False, False),
    ("created_at",            "text", "CURRENT_TIMESTAMP",                      False, False),
]
dot.node("METRICS", table_node("METRICS", "indexing_metrics", H_MET, metrics_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_configurations
# ══════════════════════════════════════════════════════════════════════════════
config_fields = [
    ("id",                   "text", "PK · 'A'..'F'",                          True,  False),
    ("name",                 "text", "NOT NULL · config label",                 False, False),
    ("description",          "text", "config description",                      False, False),
    ("clarifier_enabled",    "int",  "0 | 1",                                  False, False),
    ("bibliotecario_enabled","int",  "0 | 1",                                  False, False),
    ("analista_enabled",     "int",  "0 | 1",                                  False, False),
    ("planner_enabled",      "int",  "0 | 1",                                  False, False),
    ("selector_enabled",     "int",  "0 | 1",                                  False, False),
    ("images_enabled",       "int",  "0 | 1",                                  False, False),
    ("enrichments_enabled",  "int",  "0 | 1",                                  False, False),
    ("rag_enabled",          "int",  "0=Config F (LLM base sin RAG)",          False, False),
    ("is_baseline",          "int",  "1=Config A (techo) o F (piso)",          False, False),
    ("display_order",        "int",  "sorting order",                           False, False),
    ("created_at",           "int",  "unixepoch()",                             False, False),
]
dot.node("CONFIG", table_node("CONFIG", "ablation_configurations", H_CONF, config_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenarios
# ══════════════════════════════════════════════════════════════════════════════
scen_fields = [
    ("id",                  "text", "PK · 'SC01'..'SC10'",                     True,  False),
    ("title",               "text", "NOT NULL · scenario title",                False, False),
    ("description",         "text", "scenario context",                         False, False),
    ("category",            "text", "diagnostico_tecnico | ambigua | secuencial | visual", False, False),
    ("equipment_model",     "text", "3300 | 5500 | general",                    False, False),
    ("difficulty",          "text", "easy | medium | hard",                     False, False),
    ("max_turns",           "int",  "max conversation turns (default 5)",       False, False),
    ("resolution_criteria", "text", "NOT NULL · success condition",             False, False),
    ("is_active",           "int",  "0 | 1",                                   False, False),
    ("created_at",          "int",  "unixepoch()",                              False, False),
]
dot.node("SCEN", table_node("SCEN", "ablation_scenarios", H_SCEN, scen_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenario_turns
# ══════════════════════════════════════════════════════════════════════════════
turns_fields = [
    ("id",                   "text", "PK",                                       True,  False),
    ("scenario_id",          "text", "FK → ablation_scenarios.id",              False, True),
    ("turn_number",          "int",  "NOT NULL · 1..max_turns · UNIQUE(sc+tn)", False, False),
    ("technician_message",   "text", "NOT NULL · fixed technician script",      False, False),
    ("turn_intent",          "text", "expected user intent",                     False, False),
    ("expected_behavior",    "text", "expected system behavior",                 False, False),
    ("is_ambiguous",         "int",  "0 | 1",                                   False, False),
    ("introduces_new_data",  "int",  "0 | 1",                                   False, False),
]
dot.node("TURNS", table_node("TURNS", "ablation_scenario_turns", H_TURN, turns_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenario_runs
# ══════════════════════════════════════════════════════════════════════════════
runs_fields = [
    ("id",                         "text", "PK",                                           True,  False),
    ("scenario_id",                "text", "FK → ablation_scenarios.id · UNIQUE(sc+cfg+batch)", False, True),
    ("config_id",                  "text", "FK → ablation_configurations.id",              False, True),
    ("session_id",                 "text", "FK → chat_sessions.id · nullable",             False, True),
    ("run_batch",                  "text", "NOT NULL · 'pilot_2025_04_09'…",               False, False),
    ("status",                     "text", "pending | running | done | error",              False, False),
    ("turns_completed",            "int",  "turns executed so far",                        False, False),
    ("turns_planned",              "int",  "NOT NULL · from scenario.max_turns",           False, False),
    ("resolution_reached",         "int",  "0 | 1",                                       False, False),
    ("turns_to_resolution",        "int",  "NULL until resolved",                          False, False),
    ("total_loops_fired",          "int",  "gap engine loops across session",              False, False),
    ("avg_confidence_session",     "real", "mean confidence across turns",                 False, False),
    ("context_reuse_rate",         "real", "fraction of chunks reused across turns",       False, False),
    ("unnecessary_clarifications", "int",  "clarifications on unambiguous turns",          False, False),
    ("total_cost_usd",             "real", "session total cost",                           False, False),
    ("total_tokens",               "int",  "session total tokens",                         False, False),
    ("total_latency_ms",           "int",  "session total latency",                        False, False),
    ("error_message",              "text", "NULL unless error",                            False, False),
    ("created_at",                 "int",  "unixepoch()",                                  False, False),
]
dot.node("RUNS", table_node("RUNS", "ablation_scenario_runs", H_RUN, runs_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenario_turn_results
# ══════════════════════════════════════════════════════════════════════════════
tresults_fields = [
    ("id",               "text",  "PK",                                              True,  False),
    ("scenario_run_id",  "text",  "FK → ablation_scenario_runs.id",                 False, True),
    ("scenario_turn_id", "text",  "FK → ablation_scenario_turns.id",                False, True),
    ("turn_number",      "int",   "NOT NULL",                                        False, False),
    ("message_id",       "text",  "FK → chat_messages.id · nullable",               False, True),
    ("system_response",  "text",  "system answer for this turn",                     False, False),
    ("response_mode",    "text",  "EMERGENCY | TROUBLESHOOTING | LEARNING",          False, False),
    ("detected_intent",  "text",  "analista detected intent",                        False, False),
    ("chunks_used",      "int",   "context chunks used",                             False, False),
    ("loops_fired",      "int",   "gap engine iterations",                           False, False),
    ("confidence",       "real",  "analista confidence score",                       False, False),
    ("gap_type",         "text",  "GapDescriptor type if gap detected",              False, False),
    ("latency_ms",       "int",   "turn latency",                                    False, False),
    ("cost_usd",         "real",  "turn cost",                                       False, False),
    ("turn_score",       "real",  "per-turn judge score",                            False, False),
    ("created_at",       "int",   "unixepoch()",                                     False, False),
]
dot.node("TRESULTS", table_node("TRESULTS", "ablation_scenario_turn_results", H_TRES, tresults_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenario_scores
# ══════════════════════════════════════════════════════════════════════════════
scores_fields = [
    ("id",                          "text",  "PK",                                         True,  False),
    ("scenario_run_id",             "text",  "FK → ablation_scenario_runs.id · UNIQUE",   False, True),
    ("score_diagnostic_progression","real",  "diagnostic progression quality (0-2)",       False, False),
    ("score_factual_consistency",   "real",  "no contradictions across turns (0-2)",       False, False),
    ("score_hypothesis_refinement", "real",  "hypothesis updates on new data (0-2)",       False, False),
    ("score_technician_effort",     "real",  "minimized tech cognitive load (0-2)",        False, False),
    ("score_total",                 "real",  "NOT NULL · weighted avg (0-2)",              False, False),
    ("resolution_reached",          "int",   "0 | 1",                                     False, False),
    ("critical_error_made",         "int",   "0 | 1 · safety critical mistake",           False, False),
    ("contradicted_itself",         "int",   "0 | 1",                                     False, False),
    ("repeated_question",           "int",   "0 | 1",                                     False, False),
    ("judge_narrative",             "text",  "GPT-4o narrative explanation",               False, False),
    ("judge_model",                 "text",  "default: gpt-4o",                            False, False),
    ("judge_tokens_used",           "int",   "evaluation cost tracking",                   False, False),
    ("judge_cost_usd",              "real",  "evaluation cost USD",                        False, False),
    ("evaluated_at",                "int",   "unixepoch()",                                False, False),
]
dot.node("SCORES", table_node("SCORES", "ablation_scenario_scores", H_SCO, scores_fields))

# ══════════════════════════════════════════════════════════════════════════════
# TABLA: ablation_scenario_summary
# ══════════════════════════════════════════════════════════════════════════════
summary_fields = [
    ("id",                         "text",  "PK",                                        True,  False),
    ("config_id",                  "text",  "FK → ablation_configurations.id · UNIQUE(cfg+cat)", False, True),
    ("scenario_category",          "text",  "all | diagnostico_tecnico | ambigua…",     False, False),
    ("avg_score_total",            "real",  "mean total score across scenarios",         False, False),
    ("avg_score_diagnostic_prog",  "real",  "mean diagnostic progression",               False, False),
    ("avg_score_factual_consist",  "real",  "mean factual consistency",                  False, False),
    ("avg_score_hypothesis_ref",   "real",  "mean hypothesis refinement",                False, False),
    ("avg_score_technician_effort","real",  "mean technician effort score",              False, False),
    ("pct_resolution_reached",     "real",  "% sessions where resolution reached",       False, False),
    ("avg_turns_to_resolution",    "real",  "mean turns until resolution",               False, False),
    ("avg_total_loops_fired",      "real",  "mean gap engine loops per session",         False, False),
    ("avg_session_latency_ms",     "real",  "mean session latency",                      False, False),
    ("avg_session_cost_usd",       "real",  "mean session cost",                         False, False),
    ("n_runs",                     "int",   "number of scenario runs aggregated",        False, False),
    ("computed_at",                "int",   "unixepoch()",                               False, False),
]
dot.node("SUMMARY", table_node("SUMMARY", "ablation_scenario_summary", H_SUM, summary_fields))

# ── Rank constraints ───────────────────────────────────────────────────────────
with dot.subgraph() as S:
    S.attr(rank="min")
    for n in ["CONFIG", "METRICS"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["SCEN"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["TURNS", "RUNS"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="same")
    for n in ["TRESULTS", "SCORES"]:
        S.node(n)

with dot.subgraph() as S:
    S.attr(rank="max")
    for n in ["SUMMARY"]:
        S.node(n)

# Scaffolding invisible
dot.edge("CONFIG", "SCEN",  style="invis", weight="5")
dot.edge("SCEN",   "RUNS",  style="invis", weight="10")
dot.edge("SCEN",   "TURNS", style="invis", weight="10")
dot.edge("RUNS",   "TRESULTS", style="invis", weight="10")
dot.edge("RUNS",   "SCORES",   style="invis", weight="10")
dot.edge("SCORES", "SUMMARY",  style="invis", weight="5")

# ══════════════════════════════════════════════════════════════════════════════
# RELACIONES
# ══════════════════════════════════════════════════════════════════════════════
REL_STYLE = dict(arrowhead="crow", arrowtail="tee", dir="both", penwidth="1.5")

dot.edge("CONFIG", "RUNS",
         **REL_STYLE, color=H_CONF,
         label=" 1:N  configs tested\nper scenario run")

dot.edge("CONFIG", "SUMMARY",
         **REL_STYLE, color=H_SUM,
         label=" 1:N  aggregated\nresults",
         constraint="false")

dot.edge("SCEN", "TURNS",
         **REL_STYLE, color=H_TURN,
         label=" 1:N  fixed script\nturns")

dot.edge("SCEN", "RUNS",
         **REL_STYLE, color=H_RUN,
         label=" 1:N  executed\nruns")

dot.edge("TURNS", "TRESULTS",
         **REL_STYLE, color=H_TRES,
         label=" 1:N  per-turn\nresults")

dot.edge("RUNS", "TRESULTS",
         **REL_STYLE, color=H_TRES,
         label=" 1:N  all turn\nresults",
         constraint="false")

dot.edge("RUNS", "SCORES",
         arrowhead="crow", arrowtail="tee", dir="both",
         penwidth="1.5", color=H_SCO,
         label=" 1:1  judge\nevaluation")

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
    C.node("lREL",
        '<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4">'
        '<TR><TD><FONT POINT-SIZE="8" COLOR="#374151">'
        '|&lt;-- --&gt;|  Relación 1:N  /  1:1 (crow notation)'
        '</FONT></TD></TR></TABLE>>',
        shape="plaintext")

dot.edge("SUMMARY", "lPK",  style="invis")
dot.edge("SUMMARY", "lREL", style="invis")

# ── Renderizar ────────────────────────────────────────────────────────────────
try:
    rendered = dot.render(filename=OUT, cleanup=True)
    print(f"\n✅  Diagrama BD Ablación generado: {rendered}")
    print(f"    Resolución: 180 DPI · alta definición")
except Exception as e:
    print(f"\n⚠️  dot no encontrado: {e}")
    src = OUT + ".dot"
    with open(src, "w") as f:
        f.write(dot.source)
    print(f"✅  DOT guardado: {src}")
    print(f"    Ejecuta: dot -Tpng {src} -o {OUT}.png -Gdpi=180")
