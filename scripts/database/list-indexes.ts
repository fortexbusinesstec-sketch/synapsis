import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

async function run() {
  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='index'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

run();
