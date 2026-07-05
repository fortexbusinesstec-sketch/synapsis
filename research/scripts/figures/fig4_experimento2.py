#!/usr/bin/env python3
"""
Figure 4 — Composite figure for Experiment 2 (Single-turn Ablation).

Subplot (a): Grouped bar chart — mean score_total per category × config
Subplot (b): Violin plots — score_total distribution per config
Subplot (c): Scatter — latency vs score_total, point size ~ cost

Output: research/figures/fig4_experimento2.png
"""

import json
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from collections import defaultdict

# ── Load data ────────────────────────────────────────────────────────────────
with open('research/scripts/figures/fig4_data.json') as f:
    rows = json.load(f)

configs = ['B', 'D', 'config_bm25_bert', 'config_goms']
cfg_labels = {
    'B': 'B (Synapsis)',
    'D': 'D (RAG only)',
    'config_bm25_bert': 'BM25+BERT',
    'config_goms': 'GOMS',
}
cfg_colors = {
    'B': '#3b82f6',
    'D': '#22c55e',
    'config_bm25_bert': '#f97316',
    'config_goms': '#ef4444',
}
categories_order = ['ambigua', 'diagnostico_tecnico', 'enriquecimiento', 'secuencial', 'visual']
cat_labels = {
    'ambigua': 'Ambiguous',
    'diagnostico_tecnico': 'Diagnostic',
    'enriquecimiento': 'Enrichment',
    'secuencial': 'Sequential',
    'visual': 'Visual',
}

# ── (a) Per-category means ──────────────────────────────────────────────────
cat_data = defaultdict(lambda: defaultdict(list))
for r in rows:
    cat_data[r['category']][r['config_id']].append(r['score_total'])

cat_means = {}
cat_sds = {}
for cat in categories_order:
    cat_means[cat] = {}
    cat_sds[cat] = {}
    for cfg in configs:
        vals = cat_data[cat][cfg]
        cat_means[cat][cfg] = np.mean(vals) if vals else 0
        cat_sds[cat][cfg] = np.std(vals, ddof=0) if len(vals) > 1 else 0

# ── (b) Violin data ─────────────────────────────────────────────────────────
violin_data = {cfg: [] for cfg in configs}
for r in rows:
    violin_data[r['config_id']].append(r['score_total'])

# ── (c) Scatter data ────────────────────────────────────────────────────────
# latency_ms → s, cost_usd in cents
scatter_configs = defaultdict(lambda: {'lat': [], 'score': [], 'cost': []})
for r in rows:
    cfg = r['config_id']
    lat_s = r['latency_ms'] / 1000 if r['latency_ms'] else 0
    cost_cents = r['cost_usd'] * 100 if r['cost_usd'] else 0
    scatter_configs[cfg]['lat'].append(lat_s)
    scatter_configs[cfg]['score'].append(r['score_total'])
    scatter_configs[cfg]['cost'].append(cost_cents)

# ── Create figure ───────────────────────────────────────────────────────────
fig = plt.figure(figsize=(18, 7.5), constrained_layout=True)
gs = fig.add_gridspec(1, 3, width_ratios=[1.4, 1, 1.2], wspace=0.2)

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 10,
    'axes.titlesize': 12,
    'axes.labelsize': 11,
    'legend.fontsize': 9,
    'xtick.labelsize': 9,
    'ytick.labelsize': 9,
})

# ── Subplot (a): Grouped bar chart ──────────────────────────────────────────
ax_a = fig.add_subplot(gs[0, 0])

x = np.arange(len(categories_order))
width = 0.2
offsets = [-1.5 * width, -0.5 * width, 0.5 * width, 1.5 * width]

for idx, cfg in enumerate(configs):
    means = [cat_means[cat][cfg] for cat in categories_order]
    sds = [cat_sds[cat][cfg] for cat in categories_order]
    ax_a.bar(x + offsets[idx], means, width, label=cfg_labels[cfg],
             color=cfg_colors[cfg], edgecolor='white', linewidth=0.5)
    ax_a.errorbar(x + offsets[idx], means, yerr=sds, fmt='none',
                  ecolor='gray', capsize=2, capthick=0.8, elinewidth=0.8)

ax_a.set_xlabel('Category')
ax_a.set_ylabel('Mean score_total (0–2)')
ax_a.set_title('(a) Mean score per category', fontweight='bold')
ax_a.set_xticks(x)
ax_a.set_xticklabels([cat_labels[c] for c in categories_order], rotation=20, ha='right')
ax_a.set_ylim(0, 2.3)
ax_a.axhline(y=2.0, color='gray', linestyle=':', linewidth=0.8, alpha=0.5)
ax_a.legend(loc='upper right', framealpha=0.9, ncol=1, fontsize=8)
ax_a.grid(axis='y', alpha=0.3, linestyle='--')

# ── Subplot (b): Violin plots ───────────────────────────────────────────────
ax_b = fig.add_subplot(gs[0, 1])

v_data = [violin_data[cfg] for cfg in configs]
v_positions = range(len(configs))

# Violins
parts = ax_b.violinplot(v_data, positions=v_positions, showmeans=True,
                         showmedians=True, widths=0.6)

for i, pc in enumerate(parts['bodies']):
    pc.set_facecolor(cfg_colors[configs[i]])
    pc.set_alpha(0.4)
    pc.set_edgecolor(cfg_colors[configs[i]])

# Jittered points
for i, cfg in enumerate(configs):
    vals = violin_data[cfg]
    jitter = np.random.normal(0, 0.04, size=len(vals))
    ax_b.scatter(np.full_like(vals, i) + jitter, vals,
                 alpha=0.3, s=8, color=cfg_colors[cfg], edgecolors='none', zorder=3)

ax_b.set_xticks(v_positions)
ax_b.set_xticklabels([cfg_labels[c] for c in configs], rotation=15, ha='right', fontsize=8)
ax_b.set_ylabel('score_total')
ax_b.set_title('(b) Score distribution', fontweight='bold')
ax_b.grid(axis='y', alpha=0.3, linestyle='--')

# ── Subplot (c): Scatter plot ───────────────────────────────────────────────
ax_c = fig.add_subplot(gs[0, 2])

for cfg in configs:
    lat = scatter_configs[cfg]['lat']
    score = scatter_configs[cfg]['score']
    cost = scatter_configs[cfg]['cost']
    # Size: scale cost (cents) for visibility — avoid 0-size
    sizes = np.clip(np.array(cost) * 80, 5, 120)
    sc = ax_c.scatter(lat, score, s=sizes, alpha=0.5, color=cfg_colors[cfg],
                      edgecolors='white', linewidth=0.3, label=cfg_labels[cfg], zorder=3)

ax_c.set_xscale('log')
ax_c.set_xlabel('Latency (s) [log scale]')
ax_c.set_ylabel('score_total')
ax_c.set_title('(c) Latency–score trade-off', fontweight='bold')
ax_c.set_ylim(-0.1, 2.1)
ax_c.legend(loc='lower right', framealpha=0.9, fontsize=8, markerscale=0.5)
ax_c.grid(alpha=0.3, linestyle='--')

# Note about point size
ax_c.text(0.98, 0.02, 'Point size ∝ cost (USD)',
          transform=ax_c.transAxes, ha='right', va='bottom',
          fontsize=7, fontstyle='italic', color='gray')

# ── Save ──────────────────────────────────────────────────────────────────
os.makedirs('research/figures', exist_ok=True)
path = 'research/figures/fig4_experimento2.png'
plt.savefig(path, dpi=300, bbox_inches='tight', facecolor='white')
print(f'Saved: {path}')

# Numeric output
print('\n── (a) Category means ± SD ──')
for cat in categories_order:
    parts_ = [f"{cfg_labels[cfg]:20s}: {cat_means[cat][cfg]:.4f}±{cat_sds[cat][cfg]:.4f}" for cfg in configs]
    print(f"  {cat_labels[cat]:15s} | {' | '.join(parts_)}")

print('\n── (b) Overall stats ──')
for cfg in configs:
    vals = violin_data[cfg]
    print(f"  {cfg_labels[cfg]:20s} mean={np.mean(vals):.4f} median={np.median(vals):.4f} sd={np.std(vals, ddof=0):.4f}")

print('\n── (c) Latency & cost ──')
for cfg in configs:
    lat = np.array(scatter_configs[cfg]['lat'])
    cost = np.array(scatter_configs[cfg]['cost'])
    print(f"  {cfg_labels[cfg]:20s} latency(mean)={np.mean(lat):.1f}s cost(mean)={np.mean(cost):.4f}¢")
