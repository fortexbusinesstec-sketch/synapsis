#!/usr/bin/env tsx
/**
 * Exporta validación humana del Experimento 3 a JSON.
 *
 * 4 técnicos × 7 preguntas × 3 configs (B5/A2, E, D) = 84 respuestas.
 * Calcula: Mean Utility, Preference Rate, Fleiss Kappa, Spearman, Wilcoxon, Cohen's d.
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const l of readFileSync(envPath, 'utf8').split('\n')) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const DB_URL = process.env.TURSO_URL_TESIS || '';
const DB_TOKEN = process.env.TURSO_TOKEN_TESIS || '';
if (!DB_URL || !DB_TOKEN) { console.error('Missing env'); process.exit(1); }

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

const HUMAN_TO_Q: Record<number, string> = { 1: 'Q002', 2: 'Q010', 3: 'Q021', 4: 'Q042', 5: 'Q062', 6: 'Q081', 7: 'Q085' };
const CONFIGS = ['B5', 'E', 'D'];
const PAIRWISE: [string, string][] = [['B5', 'E'], ['B5', 'D'], ['E', 'D']];

// ── Helpers ────────────────────────────────────────────────────────────
function mean(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function sd(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function stdNormalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  return 0.5 * (1 + sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)));
}

function atanh(x: number): number { return 0.5 * Math.log((1 + x) / (1 - x)); }

function spearman(x: number[], y: number[]): { rho: number; p: number } {
  const n = x.length;
  if (n < 3) return { rho: 0, p: 1 };
  const rank = (arr: number[]) => {
    const idx = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array(n);
    for (let i = 0; i < n; i++) {
      let j = i;
      while (j + 1 < n && idx[j + 1].v === idx[i].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k].i] = avg;
      i = j;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y);
  const d2 = rx.reduce((a, _, i) => a + (rx[i] - ry[i]) ** 2, 0);
  const rho = 1 - 6 * d2 / (n * (n * n - 1));
  const z = Math.sqrt((n - 3) / 1.06) * atanh(rho);
  const p = 2 * (1 - stdNormalCdf(Math.abs(z)));
  return { rho: Number(rho.toFixed(4)), p: Math.min(Math.max(Number(p.toFixed(6)), 0), 1) };
}

function wilcoxonExact(x: number[], y: number[]): { W: number; p: number } {
  const diffs = x.map((v, i) => v - y[i]).filter(d => Math.abs(d) > 1e-10);
  const m = diffs.length;
  if (m === 0) return { W: 0, p: 1 };
  const ranked = diffs.map(d => ({ abs: Math.abs(d), sign: d > 0 ? 1 : -1 }));
  ranked.sort((a, b) => a.abs - b.abs);
  const signedRanks = ranked.map((r, i) => r.sign * (i + 1));
  const Wpos = signedRanks.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const Wneg = Math.abs(signedRanks.filter(v => v < 0).reduce((a, b) => a + b, 0));
  const Wobs = Math.min(Wpos, Wneg);

  const totalCombos = 1 << m;
  let extreme = 0;
  for (let mask = 0; mask < totalCombos; mask++) {
    let W = 0;
    for (let i = 0; i < m; i++) if (mask & (1 << i)) W += (i + 1);
    const Wmin = Math.min(W, m * (m + 1) / 2 - W);
    if (Wmin <= Wobs) extreme++;
  }
  const p = extreme / totalCombos;
  return { W: Number(Wobs.toFixed(0)), p: Math.min(Number(p.toFixed(6)), 1) };
}

function cohensD(x: number[], y: number[]): number {
  const n1 = x.length, n2 = y.length;
  const m1 = mean(x), m2 = mean(y);
  const v1 = x.reduce((a, b) => a + (b - m1) ** 2, 0) / (n1 - 1);
  const v2 = y.reduce((a, b) => a + (b - m2) ** 2, 0) / (n2 - 1);
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  return Number(((m1 - m2) / sp).toFixed(4));
}

function fleissKappa(ratings: number[][], nCat: number): number {
  const N = ratings.length, n = ratings[0].length;
  if (N === 0 || n <= 1) return 0;
  let sumP = 0;
  for (let i = 0; i < N; i++) {
    const counts = new Array(nCat).fill(0);
    for (let j = 0; j < n; j++) counts[ratings[i][j]]++;
    sumP += counts.reduce((a, c) => a + c * (c - 1), 0) / (n * (n - 1));
  }
  const Pbar = sumP / N;
  const pj = new Array(nCat).fill(0);
  for (let i = 0; i < N; i++) for (let j = 0; j < n; j++) pj[ratings[i][j]]++;
  for (let k = 0; k < nCat; k++) pj[k] /= (N * n);
  const PbarE = pj.reduce((a, b) => a + b * b, 0);
  if (PbarE >= 1) return 0;
  return Number(((Pbar - PbarE) / (1 - PbarE)).toFixed(4));
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const resp = await db.execute('SELECT * FROM respuestas_tecnicos');
  const techs = await db.execute('SELECT * FROM encuesta_tecnicos');
  const preg = await db.execute('SELECT * FROM preguntas');

  const gptRows = await db.execute({
    sql: `SELECT ar.question_id, ar.config_id, s.score_total
      FROM ablation_scores s JOIN ablation_runs ar ON s.run_id = ar.id
      WHERE ar.question_id IN (?,?,?,?,?,?,?) AND ar.config_id IN (?,?,?) AND ar.status = ?
      ORDER BY ar.question_id, ar.config_id`,
    args: ['Q002', 'Q010', 'Q021', 'Q042', 'Q062', 'Q081', 'Q085', 'B5', 'E', 'D', 'done'],
  });
  const gptMap: Record<string, number> = {};
  for (const r of gptRows.rows) gptMap[(r.question_id + '') + '-' + (r.config_id + '')] = Number(r.score_total);

  // Organize ratings
  const ratings: Record<string, Record<string, { utilidad: number; sel: number }[]>> = {};
  for (let q = 1; q <= 7; q++) { const k = 'P' + q; ratings[k] = {}; for (const c of CONFIGS) ratings[k][c] = []; }
  for (const r of resp.rows) {
    ratings['P' + r.id_pregunta]?.[r.configuracion as string]?.push({
      utilidad: Number(r.puntuacion_utilidad),
      sel: Number(r.es_seleccionada),
    });
  }

  // Aggregate utility/preference per config
  const cfgUtils: Record<string, number[]> = {};
  const cfgPref: Record<string, number[]> = {};
  const perQ: Record<string, Record<number, number[]>> = {};
  for (const c of CONFIGS) {
    cfgUtils[c] = [];
    cfgPref[c] = [];
    perQ[c] = {};
    for (let q = 1; q <= 7; q++) perQ[c][q] = [];
  }

  const humanMean7: Record<string, number[]> = {};
  const gpt7: Record<string, number[]> = {};
  for (const c of CONFIGS) { humanMean7[c] = []; gpt7[c] = []; }

  for (let q = 1; q <= 7; q++) {
    for (const c of CONFIGS) {
      const r = ratings['P' + q][c];
      const utils = r.map(x => x.utilidad);
      const prefs = r.map(x => x.sel);
      cfgUtils[c].push(...utils);
      cfgPref[c].push(...prefs);
      perQ[c][q] = utils;
      humanMean7[c].push(mean(utils));
      gpt7[c].push(gptMap[HUMAN_TO_Q[q] + '-' + c] ?? 0);
    }
  }

  // 1. Per-config metrics
  const configInfo = CONFIGS.map(c => {
    const n = cfgUtils[c].length;
    const mu = mean(cfgUtils[c]);
    const s = sd(cfgUtils[c]);
    const prefPct = cfgPref[c].reduce((a, b) => a + b, 0) / n * 100;
    return { config_id: c, n, mean_utility: Number(mu.toFixed(4)), sd_utility: Number(s.toFixed(4)), preference_rate: Number(prefPct.toFixed(1)) };
  });

  // 2. Fleiss Kappa
  const kappas: Record<string, number> = {};
  for (const c of CONFIGS) {
    const rat: number[][] = [];
    for (let q = 1; q <= 7; q++) {
      const u = perQ[c][q];
      if (u.length === 4) rat.push(u.map(v => v - 1));
    }
    kappas[c] = fleissKappa(rat, 5);
  }
  const allRat: number[][] = [];
  for (let q = 1; q <= 7; q++) for (const c of CONFIGS) {
    const u = perQ[c][q];
    if (u.length === 4) allRat.push(u.map(v => v - 1));
  }
  const overallKappa = fleissKappa(allRat, 5);

  // 3. Spearman
  const spearmanResults: Record<string, Record<string, number>> = {};
  for (const c of CONFIGS) spearmanResults[c] = spearman(humanMean7[c], gpt7[c]);
  const allH: number[] = [], allG: number[] = [];
  for (const c of CONFIGS) { allH.push(...humanMean7[c]); allG.push(...gpt7[c]); }
  spearmanResults['overall'] = spearman(allH, allG);

  // 4. Pairwise comparisons
  const pairwiseResults = PAIRWISE.map(([a, b]) => {
    const w = wilcoxonExact(humanMean7[a], humanMean7[b]);
    const bonfP = Math.min(w.p * 3, 1);
    const d = cohensD(cfgUtils[a], cfgUtils[b]);
    return {
      config_a: a, config_b: b,
      wilcoxon_W: w.W, wilcoxon_p: w.p,
      bonferroni_p: Number(bonfP.toFixed(6)),
      cohens_d: d,
    };
  });

  // 5. Per-question breakdown
  const perQuestion = [];
  for (let q = 1; q <= 7; q++) {
    const qData = preg.rows.find((r: any) => r.id_pregunta === q);
    perQuestion.push({
      id_pregunta: q,
      texto: qData ? qData.texto_pregunta : '',
      question_id: HUMAN_TO_Q[q],
      configs: CONFIGS.map(c => ({
        config_id: c,
        utilidad_promedio: Number(mean(ratings['P' + q][c].map(x => x.utilidad)).toFixed(4)),
        preferencias_recibidas: ratings['P' + q][c].filter(x => x.sel === 1).length,
        score_total_gpt4o: gptMap[HUMAN_TO_Q[q] + '-' + c] ?? null,
      })),
    });
  }

  // ── Output ──────────────────────────────────────────────────────────
  const output = {
    experimento: {
      id: 'exp3_validacion_humana',
      descripcion: 'Validación humana con 4 técnicos expertos evaluando 7 preguntas × 3 configuraciones. Puntuación de utilidad 1-5 y selección de mejor respuesta.',
      fecha_extraccion: new Date().toISOString(),
      total_tecnicos: 4,
      total_preguntas: 7,
      total_configs: 3,
      total_respuestas: 84,
      mapping_preguntas_humanas: Object.fromEntries(Object.entries(HUMAN_TO_Q).map(([k, v]) => ['P' + k, v])),
    },
    tecnicos: techs.rows.map((t: any) => ({
      codigo: t.codigo_tecnico,
      nombre: t.nombre_completo,
      experiencia_anos: t.anos_experiencia,
    })),
    preguntas: preg.rows.map((q: any) => ({
      id_pregunta: q.id_pregunta,
      texto: q.texto_pregunta,
      categoria: q.categoria,
      question_id: HUMAN_TO_Q[q.id_pregunta as keyof typeof HUMAN_TO_Q],
    })),
    metricas_por_config: configInfo,
    fleiss_kappa: {
      B5: kappas['B5'],
      E: kappas['E'],
      D: kappas['D'],
      overall: overallKappa,
    },
    spearman_humano_vs_gpt: spearmanResults,
    comparaciones_pareadas: pairwiseResults,
    desglose_por_pregunta: perQuestion,
  };

  const path = resolve(process.cwd(), 'research/experimento3_validacion_humana.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ Exportado: experimento3_validacion_humana.json (${(Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(0)} KB)`);
  for (const ci of configInfo) console.log(`  ${ci.config_id}: utilidad=${ci.mean_utility}±${ci.sd_utility} pref=${ci.preference_rate}%`);
  console.log(`  Fleiss κ overall: ${overallKappa}`);
  for (const [c, s] of Object.entries(spearmanResults)) console.log(`  Spearman ${c}: ρ=${s.rho} p=${s.p}`);
  for (const pw of pairwiseResults) console.log(`  ${pw.config_a} vs ${pw.config_b}: W=${pw.wilcoxon_W} p=${pw.wilcoxon_p} Bonf=${pw.bonferroni_p} d=${pw.cohens_d}`);
}

main().catch(console.error);
