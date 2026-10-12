// Consistent online backup of the SQLite database (safe while the app runs).
// Usage inside the container:  node scripts/backup.mjs   → /data/backups/nafas-YYYYMMDD-HHMM.db
// Keeps the newest 14 backups.
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = process.env.NAFAS_DB_PATH ?? "/data/nafasnazorat.db";
const dir = join(dirname(dbPath), "backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
const target = join(dir, `nafas-${stamp}.db`);
const db = new DatabaseSync(dbPath);
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
const files = readdirSync(dir).filter((f) => f.startsWith("nafas-") && f.endsWith(".db")).sort();
for (const old of files.slice(0, Math.max(0, files.length - 14))) rmSync(join(dir, old));
console.log(`backup ok: ${target}`);
