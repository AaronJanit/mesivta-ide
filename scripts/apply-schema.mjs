// One-off: run the schema migration SQL against the Supabase database.
// Uses the Techloq CA (exported to techloq-ca.pem) so TLS works through the filter,
// and the IPv6 literal address (the DB host has no A record and Node's DNS is
// intercepted by the Techloq filter for the hostname).
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "..", "supabase", "migrate-from-legacy.sql"), "utf8");
const ca = readFileSync(join(__dirname, "..", "techloq-ca.pem"), "utf8");

const conn =
  "postgresql://postgres:EhWqnxFUJuw92TAN@[2a05:d01c:874:6b00:d88b:ac23:8705:550a]:5432/postgres";

async function main() {
  const client = new pg.Client({
    connectionString: conn,
    ssl: {
      ca,
      rejectUnauthorized: true,
      servername: "db.imrbzsjazjdkaiofqmzu.supabase.co",
    },
  });
  await client.connect();
  console.log("Connected. Running migration…");
  await client.query(schema);
  console.log("Migration applied successfully.");
  await client.end();
}

main().catch((e) => {
  console.error("Schema apply failed:", e.message);
  process.exit(1);
});