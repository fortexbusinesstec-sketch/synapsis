#!/usr/bin/env python3
"""
Graphical Abstract — Synapsis: Multi-Agent RAG for Elevator Diagnostics

4-panel horizontal layout telling the research story:
  Problem → Exp 1 (Ablation) → Exp 2&3 (Benchmark + Human) → Impact

Output: graphics/graphical_abstract.png (300 dpi, print-ready)
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# ── Constants ───────────────────────────────────────────────────────────────
W, H = 18, 5.5
DPI = 300

# Colours
C_BG      = '#0f172a'   # dark navy background
C_PANEL1  = '#1e293b'   # panel bg
C_PANEL2  = '#1e293b'
C_PANEL3  = '#1e293b'
C_PANEL4  = '#1e293b'
C_ACCENT1 = '#3b82f6'   # blue
C_ACCENT2 = '#22c55e'   # green
C_ACCENT3 = '#f59e0b'   # amber
C_ACCENT4 = '#8b5cf6'   # violet
C_TEXT     = '#f1f5f9'
C_TEXT_SEC = '#94a3b8'
C_ARROW    = '#475569'
C_HIGHLIGHT = '#facc15' # yellow for key numbers

# ── Figure ──────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(W, H), facecolor=C_BG)
fig.subplots_adjust(left=0.02, right=0.98, top=0.92, bottom=0.08)

# 4 sub-axes for panels (no frame, same bg)
axs = []
for i in range(4):
    ax = fig.add_axes([0.03 + i * 0.2425, 0.08, 0.22, 0.84])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.set_facecolor(C_PANEL1)
    axs.append(ax)

# ── Helper: add a panel border ──────────────────────────────────────────────
def panel_border(ax, color):
    rect = FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0.04",
                          facecolor=C_PANEL1, edgecolor=color, linewidth=2)
    ax.add_patch(rect)

# ── Helper: panel title ─────────────────────────────────────────────────────
def panel_title(ax, text, color, y=0.91):
    ax.text(0.08, y, text, transform=ax.transAxes, fontsize=9,
            fontweight='black', color=color, family='sans-serif',
            va='top')

# ── Helper: body text ───────────────────────────────────────────────────────
def body_text(ax, lines, y_start=0.78, fontsize=7.5, color=C_TEXT):
    dy = 0.045
    for i, line in enumerate(lines):
        is_bold = line.startswith('*')
        is_small = line.startswith('~')
        txt = line.strip('*~').strip()
        fs = fontsize - 1 if is_small else fontsize
        w = 'bold' if is_bold else 'normal'
        c = C_HIGHLIGHT if is_bold else color
        ax.text(0.08, y_start - i * dy, txt, transform=ax.transAxes,
                fontsize=fs, color=c, fontweight=w, va='top',
                family='sans-serif', linespacing=1.3)

# ── Helper: simple icon placeholder ─────────────────────────────────────────
def draw_icon(ax, icon_type, x=0.5, y=0.55, size=0.15, color=C_ACCENT1):
    """Draw a simple icon using matplotlib primitives."""
    r = size / 2
    cx, cy = x, y

    if icon_type == 'frustrated':
        # Circle (head) + body
        circle = plt.Circle((cx, cy + r * 0.6), r * 0.35, color=color, fill=False, linewidth=2)
        ax.add_patch(circle)
        # Eyes (x marks)
        ax.plot([cx - r*0.12, cx - r*0.04], [cy + r*0.65, cy + r*0.58], color=color, linewidth=1.5)
        ax.plot([cx - r*0.12, cx - r*0.04], [cy + r*0.58, cy + r*0.65], color=color, linewidth=1.5)
        ax.plot([cx + r*0.04, cx + r*0.12], [cy + r*0.65, cy + r*0.58], color=color, linewidth=1.5)
        ax.plot([cx + r*0.04, cx + r*0.12], [cy + r*0.58, cy + r*0.65], color=color, linewidth=1.5)
        # Body (rectangle)
        body = plt.Rectangle((cx - r*0.25, cy - r*0.4), r*0.5, r*0.5, color=color, fill=False, linewidth=2)
        ax.add_patch(body)
        # Arms down
        ax.plot([cx - r*0.25, cx - r*0.45], [cy - r*0.15, cy - r*0.3], color=color, linewidth=2)
        ax.plot([cx + r*0.25, cx + r*0.45], [cy - r*0.15, cy - r*0.3], color=color, linewidth=2)

    elif icon_type == 'test_tubes':
        # Two test tubes
        for offset in [-0.12, 0.12]:
            x1 = cx + offset
            # Tube body
            ax.plot([x1, x1], [cy - r*0.5, cy + r*0.3], color=color, linewidth=2.5)
            # Tube bottom
            ax.plot([x1, x1 + r*0.08], [cy - r*0.5, cy - r*0.5], color=color, linewidth=2)
            # Liquid level
            ax.plot([x1 - r*0.02, x1 + r*0.02], [cy, cy], color=color, linewidth=3, alpha=0.6)
            # Top bulb
            ax.plot([x1 - r*0.06, x1 + r*0.06], [cy + r*0.3, cy + r*0.3], color=color, linewidth=2)
            ax.plot([x1 - r*0.06, x1 - r*0.02], [cy + r*0.3, cy + r*0.5], color=color, linewidth=2)
            ax.plot([x1 + r*0.06, x1 + r*0.02], [cy + r*0.3, cy + r*0.5], color=color, linewidth=2)

    elif icon_type == 'stopwatch':
        # Circle
        circle = plt.Circle((cx, cy), r * 0.8, color=color, fill=False, linewidth=2.5)
        ax.add_patch(circle)
        # Top button
        ax.plot([cx, cx], [cy + r*0.75, cy + r*0.95], color=color, linewidth=2.5)
        # Hand
        ax.plot([cx, cx + r*0.4], [cy, cy + r*0.3], color=color, linewidth=2)
        # Center dot
        ax.plot(cx, cy, 'o', color=color, markersize=3)

    elif icon_type == 'checkmark':
        # Shield (open path — no fill option needed for plot)
        shield_x = [cx - r*0.3, cx + r*0.3, cx + r*0.3, cx, cx - r*0.3]
        shield_y = [cy - r*0.5, cy - r*0.5, cy + r*0.2, cy + r*0.5, cy + r*0.2]
        ax.plot(shield_x, shield_y, color=color, linewidth=2.5)
        # Checkmark
        ax.plot([cx - r*0.15, cx - r*0.02, cx + r*0.2],
                [cy - r*0.05, cy + r*0.1, cy - r*0.2],
                color=color, linewidth=2.5)

# ── PANEL 1: Problem ───────────────────────────────────────────────────────
panel_border(axs[0], C_ACCENT1)
panel_title(axs[0], 'PROBLEM', C_ACCENT1, y=0.94)
# Icon: frustrated technician + broken elevator
draw_icon(axs[0], 'frustrated', x=0.3, y=0.55, size=0.22, color=C_ACCENT1)
# Input text
axs[0].text(0.55, 0.6, 'Input:\n15 Schindler manuals\n(EN/ES)', transform=axs[0].transAxes,
            fontsize=6.5, color=C_TEXT_SEC, va='center', fontweight='bold')
body_text(axs[0], [
    'Junior technicians lack',
    'experience → long downtime',
    '(~500 s per diagnosis)',
    '',
    'Dependence on senior',
    'experts limits scalability',
], y_start=0.30, fontsize=7)

# ── PANEL 2: Experiment 1 ──────────────────────────────────────────────────
panel_border(axs[1], C_ACCENT2)
panel_title(axs[1], 'EXPERIMENT 1 — Ablation', C_ACCENT2, y=0.94)
draw_icon(axs[1], 'test_tubes', x=0.35, y=0.55, size=0.18, color=C_ACCENT2)
body_text(axs[1], [
    '*50 fault scenarios, 4 configs*',
    '',
    'B (w/o Planner) outperforms',
    'full pipeline in 5/6 categories',
    '',
    '~Removing clarifier harms',
    ' ambiguous & multi‑hop cases',
], y_start=0.78, fontsize=7)

# ── PANEL 3: Experiment 2 & 3 ──────────────────────────────────────────────
panel_border(axs[2], C_ACCENT3)
panel_title(axs[2], 'EXPERIMENTS 2 & 3', C_ACCENT3, y=0.94)
draw_icon(axs[2], 'stopwatch', x=0.28, y=0.55, size=0.17, color=C_ACCENT3)
body_text(axs[2], [
    '*100 queries: B scores 0.458*',
    '*12.3 s, $0.000145 per query*',
    '*97.5% latency reduction vs human*',
    '',
    '~4 expert technicians: A2 achieves',
    ' human utility 4.11/5',
    '*GPT‑4o scores do not correlate*',
    '*Spearman ρ = –0.07 (p = 0.68)*',
], y_start=0.78, fontsize=7)

# ── PANEL 4: Impact ────────────────────────────────────────────────────────
panel_border(axs[3], C_ACCENT4)
panel_title(axs[3], 'IMPACT', C_ACCENT4, y=0.94)
draw_icon(axs[3], 'checkmark', x=0.3, y=0.55, size=0.18, color=C_ACCENT4)
# Output on right
axs[3].text(0.55, 0.6, 'Output:\nVerified\ndiagnosis', transform=axs[3].transAxes,
            fontsize=6.5, color=C_TEXT_SEC, va='center', fontweight='bold')
body_text(axs[3], [
    '*Pruned multi‑agent RAG*',
    '*provides cost‑effective,*',
    '*fast, safe diagnostic tool*',
    '',
    'Reduces expert dependence',
    'while maintaining quality',
    'for field maintenance',
], y_start=0.30, fontsize=7)

# ── Arrows between panels ──────────────────────────────────────────────────
arrow_positions = [(0.252, 0.5 + 0.08), (0.497, 0.5 + 0.08), (0.742, 0.5 + 0.08)]
for ax_pos in arrow_positions:
    arrow = FancyArrowPatch((ax_pos[0], ax_pos[1]),
                            (ax_pos[0] + 0.018, ax_pos[1]),
                            arrowstyle='-|>', color=C_ARROW,
                            linewidth=2, mutation_scale=20)
    fig.patches.append(arrow)

# ── Top tag line ────────────────────────────────────────────────────────────
fig.text(0.5, 0.96, 'Synapsis — Multi-Agent Diagnostic Assistant for Elevator Field Maintenance',
         ha='center', fontsize=12, fontweight='black', color=C_TEXT,
         family='sans-serif')

# ── Bottom note ─────────────────────────────────────────────────────────────
fig.text(0.5, 0.025, 'ASOC – Applied Soft Computing',
         ha='center', fontsize=7, color=C_TEXT_SEC, family='sans-serif',
         fontstyle='italic')

# ── Save ────────────────────────────────────────────────────────────────────
path = 'graphics/graphical_abstract.png'
os.makedirs('graphics', exist_ok=True)
plt.savefig(path, dpi=DPI, facecolor=C_BG, edgecolor='none',
            bbox_inches='tight', pad_inches=0.05)
print(f'Saved: {path} ({DPI} dpi)')
