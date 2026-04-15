import { client } from '../../lib/db';

async function migrate() {
  try {
    await client.execute(`ALTER TABLE enrichments ADD COLUMN inheritance_level INTEGER;`);
    console.log("Added column");
  } catch (e: any) {
    console.log("Failed to add column (maybe exists?):", e.message);
  }
  
  try {
    await client.execute(`
      CREATE TABLE indexing_metrics (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        total_chunks INTEGER DEFAULT 0,
        autonomous_images INTEGER DEFAULT 0,
        hitl_images INTEGER DEFAULT 0,
        agent_mismatch_count INTEGER DEFAULT 0,
        detected_gaps INTEGER DEFAULT 0,
        inherited_l1 INTEGER DEFAULT 0,
        inherited_l2 INTEGER DEFAULT 0,
        inherited_l3 INTEGER DEFAULT 0,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0,
        processing_time_ms INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created table");
  } catch (e: any) {
    console.log("Failed to create table (maybe exists?):", e.message);
  }

  try {
    await client.execute(`CREATE INDEX idx_metrics_document ON indexing_metrics(document_id);`);
    console.log("Created index");
  } catch(e: any) {
    console.log("Failed to create index:", e.message);
  }
}

migrate();
