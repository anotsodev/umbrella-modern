// Tiny probe: print the row count of `categories` to stdout, or 0
// on any failure (connection error, missing table, etc.). Used by
// the cold-start import wrapper to decide whether the DB is already
// populated.
//
// We could shell out to psql but the web image (Node Alpine) has
// no psql binary; a Node one-liner keeps the wrapper self-contained
// and works the same in dev, CI, and production.

import pg from "pg";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM categories"
    );
    console.log(rows[0]?.n ?? 0);
  } catch (err) {
    // DB might not have the tables yet (e.g. fresh container before
    // prisma db push). Treat as empty so the caller runs the import.
    console.error("probe failed:", err instanceof Error ? err.message : err);
    console.log(0);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  console.log(0);
});
