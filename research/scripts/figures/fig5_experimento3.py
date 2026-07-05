#!/usr/bin/env python3
"""
Figure 5 — Composite figure for Experiment 3 (Human Validation).

Subplot (a): Bar chart — mean human utility per config (1–5) with SD bars
Subplot (b): Scatter — GPT-4o score (0–2) vs human utility (1–5), 21 points
Subplot (c): Heatmap — pairwise preference matrix (3×3)

Output: research/figures/fig5_experimento3.png
"""

import json
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# ── Load data ────────────────────────────────────────────────────────────────
with open('research/experimento3_completo.json') as f:
    data = json.load(f)

vh = data['validacion_humana']
runs = data['benchmark_llm']['runs']

configs = ['A2', 'E', 'D']
cfg_labels = {'A2': 'A2 (Complete)', 'E': 'E (w/o Verifier)', 'D': 'D (RAG only)'}
cfg_colors = {'A2': '#2563eb', 'E': '#f97316', 'D': '#94a3b8'}

# ── (a) Bar chart: mean human utility per config ───────────────────────────
mpc = {m['config_id']: m for m in vh['metricas_por_config']}
util_means = [mpc[c]['mean_utility'] for c in configs]
util_sds = [mpc[c]['sd_utility'] for c in configs]
pref_rates = [mpc[c]['preference_rate'] for c in configs]

# ── (b) Scatter: GPT vs Human ──────────────────────────────────────────────
# Match GPT scores from benchmark runs to human validation per question+config
gpt_lookup = {}
for r in runs:
    gpt_lookup[(r['question_id'], r['config_id'])] = r['score_total']

dp = vh['desglose_por_pregunta']
scatter_data = []
for p in dp:
    qid = p['question_id']
    for c in p['configs']:
        cfg = c['config_id']
        human = c['utilidad_promedio']
        gpt = gpt_lookup.get((qid, cfg))
        if human is not None and gpt is not None:
            scatter_data.append({
                'qid': qid,
                'config': cfg,
                'human': human,
                'gpt': gpt,
            })

print(f'Scatter points: {len(scatter_data)}')

# Linear regression
gpt_vals = np.array([float(d['gpt']) for d in scatter_data], dtype=float)
human_vals = np.array([float(d['human']) for d in scatter_data], dtype=float)
A = np.vstack([gpt_vals, np.ones_like(gpt_vals)]).T
slope, intercept = np.linalg.lstsq(A, human_vals, rcond=None)[0]
n = len(gpt_vals)
gpt_min = float(gpt_vals.min()) - 0.1
gpt_max = float(gpt_vals.max()) + 0.1
gpt_line = np.linspace(gpt_min, gpt_max, 100)
human_pred = slope * gpt_line + intercept
residuals = human_vals - (slope * gpt_vals + intercept)
se = float(np.sqrt(np.sum(residuals**2) / (n - 2)))
se_fit = np.asarray(se * np.sqrt(1/n + (gpt_line - gpt_vals.mean())**2 / np.sum((gpt_vals - gpt_vals.mean())**2)), dtype=float)
ci = 1.96 * se_fit

# ── (c) Pairwise preference matrix ─────────────────────────────────────────
# Compute from per-question preference counts
prefs_per_q = []
for p in dp:
    row = {}
    for c in p['configs']:
        row[c['config_id']] = c['preferencias_recibidas']
    prefs_per_q.append(row)

pairwise = np.zeros((3, 3), dtype=int)
for ii, c_i in enumerate(configs):
    for jj, c_j in enumerate(configs):
        if ii == jj:
            continue
        cnt = 0
        for pq in prefs_per_q:
            if pq[c_i] > pq[c_j]:
                cnt += pq[c_i] - pq[c_j]
        pairwise[ii, jj] = cnt

pairwise_labels = np.array(pairwise, dtype=str)
np.fill_diagonal(pairwise_labels, '—')

# ── Create figure ───────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 6), constrained_layout=True)
gs = fig.add_gridspec(1, 3, width_ratios=[1, 1.3, 0.8], wspace=0.2)

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 10,
    'axes.titlesize': 12,
    'axes.labelsize': 11,
    'legend.fontsize': 9,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
})

# ── Subplot (a): Bar chart ─────────────────────────────────────────────────
ax_a = fig.add_subplot(gs[0, 0])
x = np.arange(len(configs))
bars = ax_a.bar(x, util_means, width=0.5, color=[cfg_colors[c] for c in configs],
                edgecolor='white', linewidth=0.5, alpha=0.85)
ax_a.errorbar(x, util_means, yerr=util_sds, fmt='none', ecolor='gray',
              capsize=4, capthick=1.2, elinewidth=1.2)

# Preference rate annotation
for i, (c, bar) in enumerate(zip(configs, bars)):
    ax_a.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.08,
              f'{pref_rates[i]:.0f}%', ha='center', va='bottom', fontsize=9,
              fontweight='bold', color=cfg_colors[c])

ax_a.set_xticks(x)
ax_a.set_xticklabels([cfg_labels[c] for c in configs], fontsize=9)
ax_a.set_ylabel('Mean human utility (1–5)')
ax_a.set_title('(a) Mean human utility per configuration', fontweight='bold')
ax_a.set_ylim(0, 5.5)
ax_a.grid(axis='y', alpha=0.3, linestyle='--')

# ── Subplot (b): Scatter plot ──────────────────────────────────────────────
ax_b = fig.add_subplot(gs[0, 1])

for cfg in configs:
    x_cfg = [float(d['gpt']) for d in scatter_data if d['config'] == cfg]
    y_cfg = [float(d['human']) for d in scatter_data if d['config'] == cfg]
    ax_b.scatter(x_cfg, y_cfg, s=60, color=cfg_colors[cfg], alpha=0.7,
                 edgecolors='white', linewidth=0.5, zorder=5,
                 label=cfg_labels[cfg])

# Regression line
ax_b.plot(gpt_line, human_pred, color='#64748b', linewidth=1.5, linestyle='--', zorder=3)
ax_b.fill_between(gpt_line, human_pred - ci, human_pred + ci, alpha=0.15, color='#64748b')

# Spearman annotation
spearman = vh['spearman_humano_vs_gpt']
rho = spearman['overall']['rho']
pval = spearman['overall']['p']
ax_b.text(0.98, 0.02, f'ρ = {rho:.3f} (p = {pval:.3f})',
          transform=ax_b.transAxes, ha='right', va='bottom',
          fontsize=8, fontstyle='italic', color='gray',
          bbox=dict(facecolor='white', alpha=0.7, boxstyle='round,pad=0.2'))

ax_b.set_xlabel('GPT-4o score_total (0–2)')
ax_b.set_ylabel('Human utility (1–5)')
ax_b.set_title('(b) GPT-4o vs human evaluation', fontweight='bold')
ax_b.legend(loc='upper left', framealpha=0.9, fontsize=8)
ax_b.grid(alpha=0.3, linestyle='--')

# ── Subplot (c): Preference heatmap ────────────────────────────────────────
ax_c = fig.add_subplot(gs[0, 2])

cmap = LinearSegmentedColormap.from_list('white_blue',
    ['white', '#dbeafe', '#3b82f6', '#1e3a5f'], N=256)
vmax = pairwise.max()
im = ax_c.imshow(pairwise, cmap=cmap, aspect='auto', vmin=0, vmax=max(vmax, 1))

# Annotations
for i in range(3):
    for j in range(3):
        val = pairwise_labels[i, j]
        if i == j:
            ax_c.text(j, i, '—', ha='center', va='center', fontsize=14,
                      color='gray', fontweight='bold')
        else:
            ax_c.text(j, i, str(val), ha='center', va='center', fontsize=14,
                      fontweight='bold',
                      color='white' if pairwise[i, j] > vmax * 0.6 else 'black')

ax_c.set_xticks(range(3))
ax_c.set_xticklabels([cfg_labels[c] for c in configs], fontsize=8, rotation=15, ha='right')
ax_c.set_yticks(range(3))
ax_c.set_yticklabels([cfg_labels[c] for c in configs], fontsize=8)
ax_c.set_title('(c) Pairwise preferences', fontweight='bold')

# Colorbar
cbar = fig.colorbar(im, ax=ax_c, fraction=0.08, pad=0.04, shrink=0.7)
cbar.set_label('Times preferred', fontsize=9)

# ── Save ──────────────────────────────────────────────────────────────────
os.makedirs('research/figures', exist_ok=True)
path = 'research/figures/fig5_experimento3.png'
plt.savefig(path, dpi=300, bbox_inches='tight', facecolor='white')
print(f'Saved: {path}')

# Numeric output
print('\n── (a) Config stats ──')
for c in configs:
    m = mpc[c]
    print(f"  {cfg_labels[c]:25s} utility={m['mean_utility']:.2f}±{m['sd_utility']:.2f}  pref_rate={m['preference_rate']:.1f}%")

print('\n── (b) Regression ──')
print(f'  slope={slope:.4f}, intercept={intercept:.4f}')
print(f'  Spearman ρ={rho:.3f}, p={pval:.4f}')

print('\n── (c) Pairwise matrix ──')
print(f'  {"":10s} {"A2":>5s} {"E":>5s} {"D":>5s}')
for ii, c_i in enumerate(configs):
    row = f'  {c_i:10s}'
    for j in range(3):
        row += f' {pairwise[ii,j]:5d}'
    print(row)
