// src/lib/db.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | null = null;

function resolveDbPath() {
  // Preferred: set DB_PATH in Vercel env vars to a committed file like "data/medicare.db"
  const envPath = process.env.DB_PATH;
  if (envPath) return path.join(process.cwd(), envPath);

  // Fallback: common locations
  const candidates = [
    path.join(process.cwd(), "data", "medicare.db"),
    path.join(process.cwd(), "medicare.db"),
  ];

  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      `SQLite DB file not found. Set DB_PATH (e.g. "data/medicare.db") or add the DB file to the repo. Looked in: ${candidates.join(
        ", "
      )}`
    );
  }
  return found;
}

export function getDb() {
  if (_db) return _db;

  const dbPath = resolveDbPath();
  _db = new Database(dbPath, { readonly: true });

  return _db;
}
