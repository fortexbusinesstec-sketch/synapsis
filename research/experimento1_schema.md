# Schema JSON — Experimento 1 (Ablación Multi-turno)

## Estructura jerárquica

```typescript
interface Experimento1Completo {
  experimento: {
    id: "exp1_ablacion_multiturno";
    descripcion: string;
    fecha_extraccion: string;        // ISO 8601
    total_escenarios: 50;
    total_configs: 4;
    total_runs: 200;                 // 50 × 4
    total_turnos_ejecutados: 1000;   // 200 × 5

    configuraciones: Record<string, {
      id: string;                    // "A" | "B" | "C" | "D"
      nombre: string;
      descripcion: string;
    }>;

    categorias: Record<string, {
      id: string;                    // ej. "diagnostico_tecnico"
      label: string;
      n_escenarios: number;
    }>;
  };

  escenarios: EscenarioData[];
}

interface EscenarioData {
  // ── Definición del escenario (ablation_scenarios) ──────────────
  id: string;                        // "SC01".."SC50"
  title: string;                     // "Falla Bus CAN (0020)"
  description: string | null;
  category: string;
  equipmentModel: string | null;     // "3300" | "5500" | "general"
  difficulty: "easy" | "medium" | "hard";
  maxTurns: 5;
  resolutionCriteria: string;
  createdAt: number;                 // unix timestamp

  // ── Turnos definidos (ablation_scenario_turns) ─────────────────
  turnos: TurnoDefinicion[];

  // ── Ejecuciones (ablation_scenario_runs + turn_results + scores) ─
  runs: RunConfig[];
}

interface TurnoDefinicion {
  turnNumber: 1 | 2 | 3 | 4 | 5;
  technicianMessage: string;         // input del técnico ficticio
  turnIntent: string | null;         // "symptom_report" | "follow_up" | etc.
  expectedBehavior: string | null;
  isAmbiguous: boolean;
  introducesNewData: boolean;
}

interface RunConfig {
  // ── Run (ablation_scenario_runs) ──────────────────────────────
  configId: string;                  // "A" | "B" | "C" | "D"
  runId: string;                     // PK de ablation_scenario_runs
  sessionId: string | null;
  status: "done" | "error" | "running" | "pending";

  // Métricas de sesión
  turnsCompleted: number;
  turnsPlanned: number;
  resolutionReached: boolean;
  turnsToResolution: number | null;

  // Eficiencia conversacional
  contextReuseRate: number | null;   // 0.0–1.0
  unnecessaryClarifications: number;
  totalLoopsFired: number;

  // FinOps
  totalCostUsd: number;
  totalTokens: number;
  totalLatencyMs: number;
  avgConfidenceSession: number | null;

  errorMessage: string | null;
  createdAt: number;

  // ── Turn results (ablation_scenario_turn_results) ────────────
  turnResults: TurnoEjecutado[];

  // ── Judge score (ablation_scenario_scores) ──────────────────
  score: ScoreSesion | null;
}

interface TurnoEjecutado {
  turnNumber: 1 | 2 | 3 | 4 | 5;
  turnResultId: string;              // PK
  systemResponse: string | null;     // respuesta textual del sistema
  responseMode: string | null;       // "TROUBLESHOOTING" | "AMBIGUOUS" | etc.
  detectedIntent: string | null;     // "baja" | "media" | "alta"
  confidence: number | null;         // 0.0–1.0
}

interface ScoreSesion {
  // 4 dimensiones del juez GPT-4o (0–2)
  scoreDiagnosticProgression: number;
  scoreFactualConsistency: number;
  scoreHypothesisRefinement: number;
  scoreTechnicianEffort: number;
  scoreTotal: number;

  // Flags
  resolutionReached: boolean;
  criticalErrorMade: boolean;
  contradictedItself: boolean;
  repeatedQuestion: boolean;

  // Metadatos del judge
  judgeNarrative: string | null;
  judgeTokensUsed: number;
  judgeCostUsd: number;
  evaluatedAt: number | null;
}
```

## Cardinalidad esperada

```
Nivel              | Registros | De dónde viene
─────────────────────────────────────────────────
escenarios         |        50 | ablation_scenarios
turnos_definidos   |       250 | ablation_scenario_turns (5/escenario)
runs               |       200 | ablation_scenario_runs (50×4)
turnos_ejecutados  |      1000 | ablation_scenario_turn_results (5/run)
scores             |       200 | ablation_scenario_scores (1/run)
```

## Notas

- `contextReuseRate` es NULL en los datos actuales (no se implementó el cálculo)
- `avgConfidenceSession` es NULL en los datos actuales
- `turnScore` en turn_results es NULL (campo reservado para evaluación por-turno futura)
- Una run puede no tener score si el juez no se ejecutó (status = pending/error)
