/**
 * FINOPS UTIL — Cálculo matemático exacto de costos (USD)
 * Basado en las tarifas oficiales proporcionadas.
 */

export const RATES = {
  orchestrator: { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  chunker:      { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  embedder:     { total: 0.02 / 1_000_000 },
  ocr:          { perPage: 0.001 },
  vision:       { input: 0.15 / 1_000_000, output: 0.15 / 1_000_000 },
  // Agente Curioso — gpt-4o-mini (mismo modelo que orchestrator/chunker)
  curious:      { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
} as const;

export type UsageData = {
  prompt_tokens?:     number;
  completion_tokens?: number;
  total_tokens?:      number;
  pages?:             number;
};

export function calculateAgentCost(
  agentName: keyof typeof RATES,
  usage: UsageData
): number {
  const rate = RATES[agentName];

  switch (agentName) {
    case 'orchestrator':
    case 'chunker':
      return (
        (usage.prompt_tokens     ?? 0) * (rate as any).input +
        (usage.completion_tokens ?? 0) * (rate as any).output
      );

    case 'vision':
    case 'curious':
      return (
        (usage.prompt_tokens     ?? 0) * (rate as any).input +
        (usage.completion_tokens ?? 0) * (rate as any).output
      );

    case 'embedder':
      return (usage.total_tokens ?? 0) * (rate as any).total;

    case 'ocr':
      return (usage.pages ?? 0) * (rate as any).perPage;

    default:
      return 0;
  }
}
