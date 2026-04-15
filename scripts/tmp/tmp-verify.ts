import { client } from '../../lib/db';

async function verify() {
  const res = await client.execute(`SELECT id, description FROM extracted_images LIMIT 5`);
  for (const row of res.rows) {
    console.log(`ID: ${row.id}`);
    console.log(`Desc: ${row.description?.toString().substring(0, 100)}`);
  }

  const queryCheck = await client.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN description LIKE '[Recomendación manual]%' THEN 1 ELSE 0 END) as match_brackets,
      SUM(CASE WHEN description LIKE '%Recomendación manual%' THEN 1 ELSE 0 END) as match_percent
    FROM extracted_images
  `);
  console.log('Query check:', queryCheck.rows[0]);
}

verify();
