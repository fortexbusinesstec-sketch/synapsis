#!/usr/bin/env python3
"""
Análisis estadístico — Synapsis MAS
=====================================
Lee datos vía Turso HTTP API, calcula descriptivos (media, DE, IC95%)
y ejecuta Wilcoxon signed-rank tests pareados por pregunta.

Uso:
  python research/scripts/stats/statistical_analysis.py

Requiere: pip3 install scipy statsmodels
"""

import json
import math
import urllib.request
import sys
from itertools import combinations

import numpy as np
from scipy.stats import wilcoxon, binomtest, norm, t as t_dist

# ── Config ──────────────────────────────────────────────────────────────────
TURSO_URL = "https://htl-synapse-ia-fabrizioftx.aws-us-east-1.turso.io/v2/pipeline"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ3NDEwMjUsImlkIjoiMDE5ZDM2NjItZWIwMS03MTA2LWE5NzctMTczNTMxZDVjMjdlIiwicmlkIjoiNTRjNzgyYmQtMTE4Zi00Mjk1LWE2ZTYtMjA5MTFlNjY0ZThkIn0.Q3lERqsub_InDz0vXim_epLwfcyjBM_DlJ3u6e7_Re-n8Y0m7SQM018ozdNAqsA-vY1iiXVZJehvWO_2rorDBw"


def turso(sql: str) -> list[dict]:
    """Ejecuta SQL via Turso HTTP API, devuelve list[dict]."""
    body = json.dumps({
        "requests": [{"type": "execute", "stmt": {"sql": sql}}]
    }).encode()
    req = urllib.request.Request(TURSO_URL, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {TURSO_TOKEN}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    res = data["results"][0]["response"]["result"]
    cols = [c["name"] for c in res["cols"]]
    return [dict(zip(cols, [v.get("value") for v in row])) for row in res["rows"]]


def ci_mean(data, conf=0.95):
    """IC para la media via t de Student."""
    n = len(data)
    if n < 2:
        return (float("nan"), float("nan"))
    m = np.mean(data)
    se = np.std(data, ddof=1) / math.sqrt(n)
    t = t_dist.ppf((1 + conf) / 2, df=n - 1)
    return (m - t * se, m + t * se)


def cohens_d(x, y):
    d = np.array(x, dtype=float) - np.array(y, dtype=float)
    return float(np.mean(d) / (np.std(d, ddof=1) + 1e-10))


P = lambda label: print(f"\n{'=' * 90}\n  {label}\n{'=' * 90}")


# ═════════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 70)
    print("  ANÁLISIS ESTADÍSTICO — SYNAPSIS MAS")
    print("  Fabrizio Diaz — Tesis Maestría en IA, 2026")
    print("=" * 70)

    # ── 1. Cargar datos ────────────────────────────────────────────────────
    P("1. CARGANDO DATOS DESDE TURSO")

    scores = turso("""
        SELECT r.config_id, r.question_id,
               s.score_total, s.score_factual, s.score_diagnostic,
               s.score_correctness, s.score_completeness,
               s.score_relevance, s.score_clarity,
               r.total_ms, r.cost_usd, r.loop_count,
               s.safe_decision_rate, s.mrr, s.recall_at_3
        FROM ablation_runs r
        JOIN ablation_scores s ON s.run_id = r.id
        WHERE r.status = 'done'
        ORDER BY r.config_id, r.question_id
    """)

    # Organizar: {config_id: {question_id: {metric: value}}}
    cfgs: dict = {}
    for row in scores:
        cid = row["config_id"]
        qid = row["question_id"]
        cfgs.setdefault(cid, {}).setdefault(qid, {})
        for k, v in row.items():
            if k in ("config_id", "question_id"):
                continue
            cfgs[cid][qid][k] = float(v) if v is not None else None

    # ── 2. Nombres de config ───────────────────────────────────────────────
    cfg_rows = turso("SELECT id, name FROM ablation_configurations")
    names = {r["id"]: f'{r["name"]} ({r["id"]})' for r in cfg_rows}
    names["config_goms"] = "L0 · GOMS"
    names["config_bm25_bert"] = "L1 · BM25+BERT"

    configs = sorted(cfgs.keys())
    print(f"\n  {len(configs)} configuraciones cargadas:")
    for c in configs:
        print(f"    {names[c]:40s}  {len(cfgs[c]):2d} preguntas")

    # ── 3. Descriptivos por métrica ───────────────────────────────────────
    METRICS = [
        "score_total", "score_factual", "score_diagnostic",
        "score_correctness", "score_completeness",
        "score_relevance", "score_clarity",
        "total_ms", "cost_usd", "loop_count", "mrr",
    ]
    LABELS = {
        "score_total": "Score Total (0–2)",
        "score_factual": "Score Factual (0–2)",
        "score_diagnostic": "Score Diagnóstico (0–2)",
        "score_correctness": "Corrección (0–1)",
        "score_completeness": "Completitud (0–1)",
        "score_relevance": "Relevancia (0–1)",
        "score_clarity": "Claridad (0–1)",
        "total_ms": "Latencia (ms)",
        "cost_usd": "Costo (USD)",
        "loop_count": "Loops",
        "mrr": "MRR (0–1)",
    }

    for m in METRICS:
        print(f"\n  {LABELS.get(m, m)}")
        print(f"  {'─' * 80}")
        for c in configs:
            vals = [cfgs[c][q][m] for q in cfgs[c] if cfgs[c][q].get(m) is not None]
            vals = [v for v in vals if v is not None]
            if not vals:
                continue
            v = np.array(vals)
            lo, hi = ci_mean(v)
            print(f"    {names[c]:35s} "
                  f"n={len(v):2d}  μ={np.mean(v):.4f}  σ={np.std(v, ddof=1):.4f}  "
                  f"IC95%=({lo:.4f}, {hi:.4f})  "
                  f"min={np.min(v):.4f}  max={np.max(v):.4f}")

    # ── 4. Determinar mejor config L2 ──────────────────────────────────────
    best_id = max(
        (c for c in configs if c not in ("config_goms", "config_bm25_bert")),
        key=lambda c: np.mean([cfgs[c][q]["score_total"] for q in cfgs[c]
                               if cfgs[c][q].get("score_total") is not None])
    )

    # ── 5. Wilcoxon signed-rank ───────────────────────────────────────────
    P(f"2. WILCOXON SIGNED-RANK (pareado por pregunta, α=0.05)")

    pairs = [
        ("L2 (Synapsis MAS) vs L1 (BM25+BERT)", best_id, "config_bm25_bert"),
        ("L2 (Synapsis MAS) vs L0 (GOMS)", best_id, "config_goms"),
    ]
    # vs otras configs de ablación
    for c in configs:
        if c not in ("config_goms", "config_bm25_bert", best_id):
            pairs.append((f"{names[best_id]} vs {names[c]}", best_id, c))

    for label, a, b in pairs:
        common = sorted(set(cfgs[a]) & set(cfgs[b]))
        if len(common) < 3:
            continue
        v1 = np.array([cfgs[a][q].get("score_total", 0) or 0 for q in common])
        v2 = np.array([cfgs[b][q].get("score_total", 0) or 0 for q in common])
        try:
            w, p = wilcoxon(v1, v2, alternative="two-sided")
        except ValueError as e:
            print(f"\n  ✗ {label}\n    Error: {e}")
            continue
        d = cohens_d(v1, v2)
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "n.s."
        print(f"\n  {label:45s}  n={len(common):2d}")
        print(f"    μ₁={np.mean(v1):.4f} (σ={np.std(v1, ddof=1):.4f})  "
              f"μ₂={np.mean(v2):.4f} (σ={np.std(v2, ddof=1):.4f})")
        print(f"    Δmedia={np.mean(v1 - v2):+.4f}  d={d:.4f}  "
              f"W={w:.0f}  p={p:.6f}  {sig}")

    # ── 6. L2 vs L1: todas las métricas ───────────────────────────────────
    P("3. L2 vs L1 — TODAS LAS MÉTRICAS")
    common_qs = sorted(set(cfgs[best_id]) & set(cfgs["config_bm25_bert"]))

    for m in METRICS:
        v1 = np.array([cfgs[best_id][q].get(m) for q in common_qs
                       if cfgs[best_id][q].get(m) is not None])
        v2 = np.array([cfgs["config_bm25_bert"][q].get(m) for q in common_qs
                       if cfgs["config_bm25_bert"][q].get(m) is not None])
        if len(v1) < 3 or len(v2) < 3:
            continue
        try:
            w, p = wilcoxon(v1, v2, alternative="two-sided")
        except ValueError:
            continue
        d = cohens_d(v1, v2)
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "n.s."
        m1, s1 = np.mean(v1), np.std(v1, ddof=1)
        m2, s2 = np.mean(v2), np.std(v2, ddof=1)
        print(f"  {LABELS.get(m, m):30s}  "
              f"L2: {m1:.4f}±{s1:.4f}  L1: {m2:.4f}±{s2:.4f}  "
              f"Δ={m1-m2:+.4f}  d={d:.3f}  p={p:.5f}  {sig}")

    # ── 7. Tabla resumen ──────────────────────────────────────────────────
    P("4. TABLA RESUMEN — Media ± DE por configuración")
    KEY_M = ["score_total", "score_factual", "score_diagnostic",
             "total_ms", "cost_usd"]
    KEY_L = ["Score Tot.", "Factual", "Diagnóstico",
             "Latencia(ms)", "Costo(USD)"]
    print(f"\n  {'Config':28s}  ", end="")
    for kl in KEY_L:
        print(f"{kl:>14s}", end="")
    print()
    print(f"  {'─' * 28}  ", end="")
    for _ in KEY_L:
        print(f"{'─' * 14}", end="")
    print()
    for c in configs:
        print(f"  {names[c]:28s}  ", end="")
        for m in KEY_M:
            vals = [cfgs[c][q].get(m) for q in cfgs[c] if cfgs[c][q].get(m) is not None]
            vals = [v for v in vals if v is not None]
            if vals:
                print(f"{np.mean(vals):.3f}±{np.std(vals, ddof=1):.3f}  ", end="")
            else:
                print(f"{'—':>14s}", end="")
        print()

    # ── 8. Score por categoría ────────────────────────────────────────────
    P("5. SCORE TOTAL POR CATEGORÍA")
    cats = turso("SELECT id, category FROM ablation_questions WHERE is_active = 1")
    qcat = {r["id"]: r["category"] for r in cats}
    for cat in sorted(set(qcat.values())):
        print(f"\n  [{cat}]")
        for c in configs:
            qs = [q for q in cfgs[c] if qcat.get(q) == cat]
            vals = [cfgs[c][q].get("score_total") for q in qs
                    if cfgs[c][q].get("score_total") is not None]
            if vals:
                v = np.array(vals)
                print(f"    {names[c]:35s}  μ={np.mean(v):.4f}  σ={np.std(v, ddof=1):.4f}  n={len(v)}")

    # ── 9. Win/Tie/Loss ───────────────────────────────────────────────────
    P("6. WIN / TIE / LOSS — L2 vs L1")
    wins = ties = losses = 0
    for q in common_qs:
        s2 = cfgs[best_id][q].get("score_total", 0) or 0
        s1 = cfgs["config_bm25_bert"][q].get("score_total", 0) or 0
        if s2 > s1 + 0.01:
            wins += 1
        elif abs(s2 - s1) <= 0.01:
            ties += 1
        else:
            losses += 1
    total = wins + ties + losses
    print(f"\n  L2 gana: {wins:2d}/{total} ({100*wins/total:.1f}%)")
    print(f"  Empate:  {ties:2d}/{total} ({100*ties/total:.1f}%)")
    print(f"  L1 gana:  {losses:2d}/{total} ({100*losses/total:.1f}%)")
    if wins + losses > 0:
        p_binom = binomtest(wins, n=wins + losses, p=0.5, alternative="two-sided").pvalue
        print(f"  Binomial test (wins vs losses): p = {p_binom:.5f}")

    # ── 10. Potencia estadística ──────────────────────────────────────────
    P("7. ANÁLISIS DE POTENCIA (post-hoc)")
    n = len(common_qs)
    t_crit = t_dist.ppf(0.975, df=n - 1)
    d_min = t_crit / math.sqrt(n)
    print(f"\n  Con n={n} pares y α=0.05 (bilateral):")
    print(f"  d mínimo detectable ≈ {d_min:.3f}")
    print(f"\n  → Si el Cohen's d observado está por encima de {d_min:.3f},")
    print(f"    el test tiene potencia suficiente para detectarlo como")
    print(f"    estadísticamente significativo.")
    print(f"\n  → Efectos pequeños (d<0.3): pueden existir pero no podemos")
    print(f"    afirmarlos con confianza. Efectos medianos-grandes (d>0.5):")
    print(f"    son detectables de forma confiable.")

    print(f"\n{'=' * 70}")
    print("  ANÁLISIS COMPLETADO")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
