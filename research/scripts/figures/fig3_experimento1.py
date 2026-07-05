#!/usr/bin/env python3
"""
Figure 3 — Composite figure for Experiment 1 (Multi-turn Ablation).

Subplot (a): Grouped bar chart — mean score_total per category × config
Subplot (b): Kaplan–Meier survival curves — resolution probability over turns
Subplot (c): Heatmap — error type frequency per config

Output: research/figures/fig3_experimento1.png
"""

import json
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from collections import defaultdict

# ── Load data ────────────────────────────────────────────────────────────────
with open('research/experimento1_completo.json') as f:
    data = json.load(f)

scenarios = data['escenarios']
configs = ['A', 'B', 'C', 'D']
cfg_labels = {'A': 'A — Complete', 'B': 'B — w/o Planner', 'C': 'C — w/o Clarifier', 'D': 'D — RAG only'}
cfg_colors = {'A': '#1f77b4', 'B': '#6baed6', 'C': '#ff7f0e', 'D': '#d62728'}
cfg_markers = {'A': 'o', 'B': 's', 'C': 'D', 'D': '^'}
cfg_lstyles = {'A': '-', 'B': '--', 'C': '-.', 'D': ':'}

categories_order = ['ambigua', 'diagnostico_tecnico', 'emergencia', 'enriquecimiento', 'multi_hop', 'secuencial']
cat_labels = {
    'ambigua': 'Ambiguous', 'diagnostico_tecnico': 'Diagnostic',
    'emergencia': 'Emergency', 'enriquecimiento': 'Enrichment',
    'multi_hop': 'Multi-hop', 'secuencial': 'Sequential',
}

# ── (a) Grouped bar: per-category score_total ──────────────────────────────
cat_data = defaultdict(lambda: defaultdict(list))
for s in scenarios:
    cat = s['category']
    for r in s['runs']:
        if r['score']:
            cat_data[cat][r['configId']].append(r['score']['scoreTotal'])

cat_means = {}
cat_sds = {}
for cat in categories_order:
    cat_means[cat] = {}
    cat_sds[cat] = {}
    for cfg in configs:
        vals = cat_data[cat][cfg]
        cat_means[cat][cfg] = np.mean(vals) if vals else 0
        cat_sds[cat][cfg] = np.std(vals, ddof=0) if len(vals) > 1 else 0

# ── (b) Kaplan–Meier survival ──────────────────────────────────────────────
km_data = defaultdict(list)
for s in scenarios:
    for r in s['runs']:
        if r['score'] and r['turnsToResolution'] is not None:
            km_data[r['configId']].append(r['turnsToResolution'])
        elif r['score'] and r['turnsToResolution'] is None:
            km_data[r['configId']].append(5)  # censored at max turns

def survival_curve(turns_list, max_turns=5):
    """Return (times, survival_probs) for Kaplan-Meier."""
    n = len(turns_list)
    if n == 0:
        return list(range(max_turns + 1)), [1.0] * (max_turns + 1)
    surv = [1.0]
    for t in range(1, max_turns + 1):
        at_risk = sum(1 for tt in turns_list if tt >= t)
        if at_risk == 0:
            surv.append(surv[-1])
        else:
            events = sum(1 for tt in turns_list if tt == t)
            surv.append(surv[-1] * (1 - events / at_risk))
    return list(range(max_turns + 1)), surv

def median_survival(turns_list, max_turns=5):
    _, surv = survival_curve(turns_list, max_turns)
    for t in range(len(surv) - 1):
        if surv[t] >= 0.5 > surv[t + 1]:
            return t + 1  # median turn
    if surv[-1] >= 0.5:
        return f'>{max_turns}'
    return 1

# ── (c) Heatmap: error types ──────────────────────────────────────────────
error_types = ['repeatedQuestion', 'contradictedItself', 'criticalErrorMade']
error_labels = ['Repeated\nquestions', 'Self-\ncontradictions', 'Critical\nerrors']

error_matrix = np.zeros((len(configs), len(error_types)))
for i, cfg in enumerate(configs):
    for j, err in enumerate(error_types):
        total = 0
        count = 0
        for s in scenarios:
            for r in s['runs']:
                if r['configId'] == cfg and r['score']:
                    count += 1
                    if r['score'][err]:
                        total += 1
        error_matrix[i, j] = (total / count * 100) if count > 0 else 0

# ── Create figure ──────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 12), constrained_layout=True)
gs = fig.add_gridspec(2, 3, width_ratios=[1.6, 1.6, 1], hspace=0.25, wspace=0.25)

# Common settings
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 11,
    'axes.titlesize': 13,
    'axes.labelsize': 12,
    'legend.fontsize': 10,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
})

# ── Subplot (a): Grouped bar chart ────────────────────────────────────────
ax_a = fig.add_subplot(gs[0, :2])

x = np.arange(len(categories_order))
width = 0.2
offsets = [-1.5 * width, -0.5 * width, 0.5 * width, 1.5 * width]

for idx, cfg in enumerate(configs):
    means = [cat_means[cat][cfg] for cat in categories_order]
    sds = [cat_sds[cat][cfg] for cat in categories_order]
    bars = ax_a.bar(x + offsets[idx], means, width, label=cfg_labels[cfg],
                    color=cfg_colors[cfg], edgecolor='white', linewidth=0.5)
    # Error bars
    ax_a.errorbar(x + offsets[idx], means, yerr=sds, fmt='none',
                  ecolor='gray', capsize=3, capthick=1, elinewidth=1)

ax_a.set_xlabel('Scenario category')
ax_a.set_ylabel('Mean score_total (0–2)')
ax_a.set_title('(a) Mean diagnostic score per category', fontweight='bold')
ax_a.set_xticks(x)
ax_a.set_xticklabels([cat_labels[c] for c in categories_order], rotation=20, ha='right')
ax_a.set_ylim(0, 2.3)
ax_a.axhline(y=2.0, color='gray', linestyle=':', linewidth=0.8, alpha=0.5)
ax_a.legend(loc='upper right', framealpha=0.9, ncol=2)
ax_a.grid(axis='y', alpha=0.3, linestyle='--')

# ── Subplot (b): Kaplan–Meier survival curves ─────────────────────────────
ax_b = fig.add_subplot(gs[1, :2])

for cfg in configs:
    times, surv = survival_curve(km_data[cfg])
    median = median_survival(km_data[cfg])
    ax_b.step(times, surv, where='post', color=cfg_colors[cfg],
              linestyle=cfg_lstyles[cfg], linewidth=2.5,
              label=f"{cfg_labels[cfg]} (median={median})")
    # Mark median
    if isinstance(median, (int, float)):
        ax_b.axvline(x=median, color=cfg_colors[cfg], linestyle=':',
                     linewidth=1, alpha=0.5)
        ax_b.axhline(y=0.5, color=cfg_colors[cfg], linestyle=':',
                     linewidth=1, alpha=0.5)
        ax_b.plot(median, 0.5, marker=cfg_markers[cfg], color=cfg_colors[cfg],
                  markersize=8, zorder=5)

ax_b.set_xlabel('Number of turns')
ax_b.set_ylabel('Probability of not yet resolved')
ax_b.set_title('(b) Survival curves of resolution time', fontweight='bold')
ax_b.set_xlim(0, 5)
ax_b.set_ylim(0, 1.05)
ax_b.set_xticks(range(0, 6))
ax_b.legend(loc='lower left', framealpha=0.9, fontsize=9)
ax_b.grid(alpha=0.3, linestyle='--')

# ── Subplot (c): Heatmap ──────────────────────────────────────────────────
ax_c = fig.add_subplot(gs[:, 2])

# Custom colormap: white → light red → dark red
cmap = LinearSegmentedColormap.from_list('white_red', ['white', '#ffcccc', '#cc0000'], N=256)

im = ax_c.imshow(error_matrix, cmap=cmap, aspect='auto', vmin=0, vmax=max(20, error_matrix.max()))

# Annotate cells
for i in range(len(configs)):
    for j in range(len(error_types)):
        val = error_matrix[i, j]
        text_color = 'white' if val > 10 else 'black'
        ax_c.text(j, i, f'{val:.1f}%', ha='center', va='center',
                  fontsize=12, fontweight='bold', color=text_color)

ax_c.set_xticks(range(len(error_types)))
ax_c.set_xticklabels(error_labels)
ax_c.set_yticks(range(len(configs)))
ax_c.set_yticklabels([cfg_labels[c] for c in configs])
ax_c.set_title('(c) Frequency of error types', fontweight='bold')

# Colorbar
cbar = fig.colorbar(im, ax=ax_c, fraction=0.046, pad=0.04, shrink=0.8)
cbar.set_label('Percentage (%)', fontsize=10)

# ── Save ──────────────────────────────────────────────────────────────────
os.makedirs('research/figures', exist_ok=True)
path = 'research/figures/fig3_experimento1.png'
plt.savefig(path, dpi=300, bbox_inches='tight', facecolor='white')
print(f'✅ Saved: {path}')

# Also output numeric data
print('\n── (a) Category means ± SD ──')
for cat in categories_order:
    parts = [f"{cfg}: {cat_means[cat][cfg]:.3f}±{cat_sds[cat][cfg]:.3f}" for cfg in configs]
    print(f"  {cat_labels[cat]:20s} | {' | '.join(parts)}")

print('\n── (b) Median resolution ──')
for cfg in configs:
    print(f"  {cfg_labels[cfg]:30s} median = {median_survival(km_data[cfg])}")

print('\n── (c) Error rates (%) ──')
print(f"  {'Config':20s} {'Repeated':>10s} {'Contradiction':>14s} {'Critical':>10s}")
for i, cfg in enumerate(configs):
    print(f"  {cfg_labels[cfg]:20s} {error_matrix[i,0]:10.1f} {error_matrix[i,1]:14.1f} {error_matrix[i,2]:10.1f}")
