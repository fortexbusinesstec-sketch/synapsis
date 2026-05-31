const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const { sql } = require('drizzle-orm');

const client = createClient({
  url: "libsql://htl-synapse-ia-fabrizioftx.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAwOTM1NjQsImlkIjoiMDE5ZDM2NjItZWIwMS03MTA2LWE5NzctMTczNTMxZDVjMjdlIiwicmlkIjoiNTRjNzgyYmQtMTE4Zi00Mjk1LWE2ZTYtMjA5MTFlNjY0ZThkIn0.RXf0Rj21J9kB6P6ytM3oPT-a2UmVU54QItscBuyw01BYTJ-UL6cRn2CbvI0O6AN-IeKhxEaaWsxZHLn0MyzRAw",
});

const db = drizzle(client);

async function dropTables() {
  console.log("Dropping judge tables...");
  try {
    await db.run(sql`DROP TABLE IF EXISTS judge_evaluations;`);
    await db.run(sql`DROP TABLE IF EXISTS judge_messages;`);
    await db.run(sql`DROP TABLE IF EXISTS judge_sessions;`);
    await db.run(sql`DROP TABLE IF EXISTS judge_cases;`);
    await db.run(sql`DROP TABLE IF EXISTS judge_profiles;`);
    console.log("Judge tables dropped successfully.");
  } catch (error) {
    console.error("Error dropping tables:", error);
    process.exit(1);
  }
  process.exit(0);
}

dropTables();
