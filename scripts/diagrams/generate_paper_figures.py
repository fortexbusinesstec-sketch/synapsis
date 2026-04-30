import matplotlib.pyplot as plt
import numpy as np
import os

# CONFIGURACIÓN ESTÉTICA ETASR (B&W HIGHER CONTRAST)
plt.rcParams.update({
    'font.size': 12,
    'font.family': 'sans-serif',
    'axes.edgecolor': 'black',
    'axes.linewidth': 1.5,
    'xtick.major.width': 1.5,
    'ytick.major.width': 1.5,
    'legend.frameon': True,
    'legend.edgecolor': 'black',
    'legend.fontsize': 10,
    'figure.facecolor': 'white',
    'axes.facecolor': 'white'
})

def format_fig(ax, xlabel, ylabel):
    ax.set_xlabel(xlabel, fontweight='bold')
    ax.set_ylabel(ylabel, fontweight='bold')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', linestyle='--', alpha=0.3, color='black')

output_dir = 'imagenes'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# --- DATA ---
configs = ["MAS (Optimized)", "RAG (Baseline)", "BM25+BERT", "GOMS (Human)"]
categories = ["Ambiguous", "Technical Diag.", "Enrichment", "Sequential", "Visual"]

# Chart 1 Data: Precision by Category
scores = {
    "MAS (Optimized)": [0.3875, 0.6125, 0.3750, 0.4000, 0.5125],
    "RAG (Baseline)": [0.3375, 0.5500, 0.3250, 0.3250, 0.4625],
    "BM25+BERT": [0.2250, 0.4000, 0.1625, 0.1425, 0.1625],
    "GOMS (Human)": [0.1750, 0.4000, 0.1500, 0.2000, 0.0250]
}

# Chart 2 Data: Latency (s) and Total Score
latency = [12.35, 12.23, 1.60, 496.90]
avg_scores = [0.457, 0.400, 0.218, 0.190]

# Chart 3 Data: Cost (USD)
costs = [0.00014, 0.00014, 0.00018, 0.1863]

# --- FIGURE 1: PRECISION BY CATEGORY ---
fig1, ax1 = plt.subplots(figsize=(10, 6))
x = np.arange(len(categories))
width = 0.18
patterns = ['', '//', '..', 'xx']

for i, config in enumerate(configs):
    ax1.bar(x + (i - 1.5) * width, scores[config], width, label=config, 
            color='white', edgecolor='black', hatch=patterns[i], linewidth=1.5)

format_fig(ax1, "Category", "F1 Score (Normalized)")
ax1.set_xticks(x)
ax1.set_xticklabels(categories)
ax1.legend(loc='upper center', bbox_to_anchor=(0.5, -0.15), ncol=4)
plt.tight_layout()
fig1.savefig(os.path.join(output_dir, 'fig5_precision_category.png'), dpi=300)
fig1.savefig(os.path.join(output_dir, 'fig5_precision_category.pdf'))

# --- FIGURE 2: SCORE VS LATENCY (EFFICIENCY) ---
fig2, ax2 = plt.subplots(figsize=(10, 6))
# Filter out GOMS for internal zoom (or keep it if needed, but it scales badly)
# Let's use Log scale for X axis to show GOMS vs Others
ax2.set_xscale('log')
markers = ['o', 's', '^', 'D']

for i in range(len(configs)):
    ax2.scatter(latency[i], avg_scores[i], s=200, label=configs[i], 
                color='white', edgecolor='black', marker=markers[i], linewidth=2)
    ax2.annotate(configs[i], (latency[i], avg_scores[i]), xytext=(5, 5), textcoords='offset points', fontsize=9)

format_fig(ax2, "Average Latency (Seconds, Log Scale)", "Total Accuracy Score")
ax2.legend(loc='upper center', bbox_to_anchor=(0.5, -0.15), ncol=4)
plt.tight_layout()
fig2.savefig(os.path.join(output_dir, 'fig6_latency_quality.png'), dpi=300)
fig2.savefig(os.path.join(output_dir, 'fig6_latency_quality.pdf'))

# --- FIGURE 3: SCORE VS COST (ECONOMIC VIABILITY) ---
fig3, ax3 = plt.subplots(figsize=(10, 6))
ax3.set_xscale('log')

for i in range(len(configs)):
    ax3.scatter(costs[i], avg_scores[i], s=200, label=configs[i], 
                color='white', edgecolor='black', marker=markers[i], linewidth=2)
    ax3.annotate(configs[i], (costs[i], avg_scores[i]), xytext=(5, 5), textcoords='offset points', fontsize=9)

format_fig(ax3, "Average Cost per Query (USD, Log Scale)", "Total Accuracy Score")
ax3.legend(loc='upper center', bbox_to_anchor=(0.5, -0.15), ncol=4)
plt.tight_layout()
fig3.savefig(os.path.join(output_dir, 'fig7_cost_viability.png'), dpi=300)
fig3.savefig(os.path.join(output_dir, 'fig7_cost_viability.pdf'))

print("✅ Figures generated successfully in /imagenes/ folder.")
