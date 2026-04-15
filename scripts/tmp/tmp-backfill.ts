import { client } from '../../lib/db';
import { updateIndexingMetricsSnapshot } from '../../lib/agents/curious';

async function backfill() {
  const docs = await client.execute('SELECT id FROM documents');
  console.log(`Found ${docs.rows.length} documents. Backfilling metrics...`);
  
  for (const row of docs.rows) {
    const docId = row.id as string;
    await updateIndexingMetricsSnapshot(docId);
  }
  
  const metrics = await client.execute('SELECT * FROM indexing_metrics');
  console.log('Metrics table now has:', metrics.rows.length, 'rows');
}

backfill();
