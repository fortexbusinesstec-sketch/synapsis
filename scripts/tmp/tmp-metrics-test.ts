import { client } from '../../lib/db';
import { createId } from '@paralleldrive/cuid2';

async function test() {
  try {
    const docs = await client.execute('SELECT id FROM documents LIMIT 1');
    if (docs.rows.length === 0) {
      console.log('No docs');
      return;
    }
    const docId = docs.rows[0].id as string;
    console.log('Testing with doc:', docId);

    await client.execute({
      sql: `
        INSERT INTO indexing_metrics (
          id, document_id, total_chunks, autonomous_images, hitl_images,
          agent_mismatch_count, detected_gaps, inherited_l1, inherited_l2, inherited_l3,
          total_input_tokens, total_output_tokens, processing_time_ms
        )
        SELECT 
          ?, d.id,
          (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id),
          (SELECT COUNT(*) FROM extracted_images WHERE document_id = d.id AND description NOT LIKE '[Recomendación manual]%'),
          (SELECT COUNT(*) FROM extracted_images WHERE document_id = d.id AND description LIKE '[Recomendación manual]%'),
          (SELECT COUNT(*) FROM extracted_images WHERE document_id = d.id AND description LIKE '%⚠ Nota del agente:%'),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 1),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 2),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 3),
          COALESCE((SELECT SUM(input_tokens) FROM agent_logs WHERE document_id = d.id), 0),
          COALESCE((SELECT SUM(output_tokens) FROM agent_logs WHERE document_id = d.id), 0),
          COALESCE(CAST((SELECT (julianday(MAX(ended_at)) - julianday(MIN(started_at))) * 86400000 FROM agent_logs WHERE document_id = d.id) AS INTEGER), 0)
        FROM documents d WHERE d.id = ?
      `,
      args: [createId(), docId]
    });
    console.log('Success');
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
