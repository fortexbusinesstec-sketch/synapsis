import { client } from '@/lib/db';
import type { DocumentChunk } from './sub-buscador-documental';
import type { RetrievedImage } from './sub-buscador-visual';

const DOC_ID_BASE = 'k9ablyuoshup6yb0x7798k3a';

export interface CuradorResult {
  groundTruth: string;
  validatedImages: {
    url: string | null;
    description: string | null;
    image_type: string | null;
    is_critical: boolean;
  }[];
  chunksRetrieved: number;
  hasEnrichments: boolean;
  bestDistance: number;
  componentMismatch: boolean;
  rescueUsed: boolean;
  docsConsultados: {
    docBaseUsed: boolean;
    titulos: string[];
  };
}

function extractTargetComponent(query: string): string | null {
  const components = ['LDU', 'SMLCD', 'SCIC', 'SMIC', 'SCOP', 'ASIXB', 'KSKB', 'SALSIS', 'CANIC', 'REC', 'freno', 'puerta', 'motor', 'variador', 'DC link', 'rectificador'];
  const lower = query.toLowerCase();
  for (const c of components) {
    if (lower.includes(c.toLowerCase())) return c.toUpperCase();
  }
  return null;
}

function mentionsComponent(text: string, component: string | null): boolean {
  if (!component) return true;
  return text.toLowerCase().includes(component.toLowerCase());
}

function isPureCrossReference(content: string): boolean {
  const patterns = [
    /consulte\s+(el\s+)?cap[ií]tulo/i,
    /v[eé]ase\s+(la\s+)?secci[oó]n/i,
    /revise\s+(el\s+)?men[uú]\s*\d+/i,
    /para\s+m[aá]s\s+detalles/i,
    /referirse\s+a/i,
    /ver\s+p[aá]gina/i,
    /consultar\s+el\s+manual/i,
    /ver\s+figura\s+\d+/i,
  ];
  return patterns.some(p => p.test(content)) && content.length < 250;
}

function classifyDocumentType(chunk: DocumentChunk): 'procedimiento' | 'decision' | 'seguridad' | 'otro' {
  const content = (chunk.content + ' ' + (chunk.section_title || '')).toLowerCase();

  if (content.includes('procedimiento') || content.includes('paso') || content.includes('cómo') || content.includes('how to')) return 'procedimiento';
  if (content.includes('síntoma') || content.includes('código') || content.includes('error') || content.includes('matriz') || content.includes('causa')) return 'decision';
  if (content.includes('seguridad') || content.includes('advertencia') || content.includes('precaución') || content.includes('peligro') || content.includes('⚠')) return 'seguridad';
  return 'otro';
}

async function fetchDocumentoBase(modelo: string | null): Promise<DocumentChunk[]> {
  const sql = `
    SELECT
      dc.id AS chunk_id,
      d.id AS document_id,
      dc.content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title AS doc_title,
      d.equipment_model,
      e.id AS enrichment_id,
      e.expert_answer
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    LEFT JOIN enrichments e ON e.reference_id = dc.id AND e.reference_type = 'chunk' AND e.is_verified = 1
    WHERE d.id = ?
      AND (d.equipment_model = ? OR d.brand = 'Schindler General' OR ? IS NULL)
    ORDER BY dc.page_number ASC
    LIMIT 15
  `;

  const result = await client.execute({
    sql,
    args: [DOC_ID_BASE, modelo || null, modelo || null],
  });

  return (result.rows as Record<string, unknown>[]).map(row => ({
    chunk_id: row.chunk_id as string,
    document_id: row.document_id as string,
    content: row.content as string,
    section_title: row.section_title as string | null,
    chunk_type: row.chunk_type as string | null,
    has_warning: (row.has_warning as number) ?? 0,
    page_number: row.page_number as number | null,
    doc_title: row.doc_title as string | null,
    equipment_model: row.equipment_model as string | null,
    distance: 0.1,
    enrichment_id: row.enrichment_id as string | null,
    expert_answer: row.expert_answer as string | null,
  }));
}

export async function runCurador(
  chunks: DocumentChunk[],
  images: RetrievedImage[],
  userQuery: string,
  equipmentModel: string | null,
): Promise<CuradorResult> {

  const targetComponent = extractTargetComponent(userQuery);

  let validChunks = chunks.filter(c => !isPureCrossReference(c.content));

  let componentMismatch = false;
  if (targetComponent && validChunks.length > 0) {
    const matching = validChunks.filter(c =>
      mentionsComponent(c.content, targetComponent) ||
      mentionsComponent(c.doc_title || '', targetComponent) ||
      mentionsComponent(c.section_title || '', targetComponent)
    );

    if (matching.length < validChunks.length * 0.4) {
      componentMismatch = true;
      console.log(`[curador] MISMATCH: Usuario preguntó ${targetComponent}, documentos son de otros componentes`);
      validChunks = matching.length > 0 ? matching : validChunks;
    }
  }

  let rescueUsed = false;
  let finalChunks = validChunks;

  if (validChunks.length < 3 || validChunks[0]?.distance > 0.5 || componentMismatch) {
    console.log(`[curador] Activando fallback a documento base (chunks: ${validChunks.length}, distancia: ${validChunks[0]?.distance?.toFixed(3)}, mismatch: ${componentMismatch})...`);

    const docBase = await fetchDocumentoBase(equipmentModel);

    if (docBase.length > 0) {
      rescueUsed = true;
      finalChunks = docBase.map(c => ({
        ...c,
        content: `[DOCUMENTO BASE: PROCEDIMIENTOS DE MANTENIMIENTO]\n${c.content}`,
      }));
      componentMismatch = false;
    }
  }

  const titulosDocs = [...new Set(finalChunks.map(c => c.doc_title).filter(Boolean))] as string[];

  const validatedImages = images.filter(img => {
    if (!img.description || img.description.length < 10) return false;
    if (componentMismatch && targetComponent && !mentionsComponent(img.description, targetComponent)) {
      return false;
    }
    return true;
  }).slice(0, 3);

  const chunkBlocks = finalChunks.map(entry => {
    const isDocBase = entry.content.startsWith('[DOCUMENTO BASE:');

    const source = [
      entry.doc_title ? `[${entry.doc_title}]` : '',
      entry.equipment_model ? `Modelo: ${entry.equipment_model}` : '',
      entry.page_number ? `Pág. ${entry.page_number}` : '',
      entry.section_title ? `§ ${entry.section_title}` : '',
    ].filter(Boolean).join(' · ');

    const warningPrefix = entry.has_warning ? '⚠ ADVERTENCIA: ' : '';

    let block = isDocBase
      ? `${entry.content}`
      : `${source}\nMANUAL OFICIAL:\n${warningPrefix}${entry.content}`;

    if (entry.expert_answer && !isDocBase) {
      block += `\n→ NOTA DEL EXPERTO: ${entry.expert_answer}`;
    }

    return block;
  });

  const imageBlock = validatedImages.length > 0
    ? '\n--- IMÁGENES TÉCNICAS RELACIONADAS ---\n' +
      validatedImages.map(img => `• [${img.image_type ?? 'imagen'}] ${img.doc_title ?? ''}: ${img.description}`).join('\n')
    : '';

  let groundTruth = [...chunkBlocks, imageBlock].filter(Boolean).join('\n\n---\n\n');

  if (componentMismatch) {
    groundTruth = `⚠ ADVERTENCIA DEL CURADOR: Los documentos disponibles no corresponden al componente mencionado (${targetComponent}). Solo incluya pasos de verificación genérica.\n\n${groundTruth}`;
  }

  if (rescueUsed) {
    groundTruth = `NOTA DEL SISTEMA: No se encontró documentación específica de alta similitud. Se presenta información general de rescate:\n\n${groundTruth}`;
  }

  const usedEnrichmentIds = finalChunks
    .map(c => c.enrichment_id)
    .filter((id): id is string => Boolean(id));

  if (usedEnrichmentIds.length > 0) {
    const ph = usedEnrichmentIds.map(() => '?').join(', ');
    client.execute({
      sql: `UPDATE enrichments SET times_retrieved = times_retrieved + 1 WHERE id IN (${ph})`,
      args: usedEnrichmentIds,
    }).catch(err => console.error('[curador] times_retrieved error:', err));
  }

  return {
    groundTruth,
    validatedImages: validatedImages.map(img => ({
      url: img.image_url,
      description: img.description,
      image_type: img.image_type,
      is_critical: Boolean(img.is_critical),
    })),
    chunksRetrieved: finalChunks.length,
    hasEnrichments: finalChunks.some(c => c.enrichment_id),
    bestDistance: finalChunks[0]?.distance ?? 1.0,
    componentMismatch,
    rescueUsed,
    docsConsultados: {
      docBaseUsed: rescueUsed,
      titulos: titulosDocs,
    },
  };
}
