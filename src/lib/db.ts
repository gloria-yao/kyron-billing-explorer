// src/lib/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let _db: Database.Database | null = null;

function ensureTmpDb(): string {
  const tmpDir = "/tmp";
  const tmpDbPath = path.join(tmpDir, "kyron.db");

  if (fs.existsSync(tmpDbPath)) return tmpDbPath;

  // DB should live in your repo at data/kyron.db
  const repoDbPath = path.join(process.cwd(), "data", "kyron.db");

  if (!fs.existsSync(repoDbPath)) {
    throw new Error(
      `SQLite DB not found. Expected at ${repoDbPath}. Make sure data/kyron.db is committed to GitHub.`
    );
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  fs.copyFileSync(repoDbPath, tmpDbPath);

  return tmpDbPath;
}

export function getDb() {
  if (_db) return _db;

  const dbPath = ensureTmpDb();
  _db = new Database(dbPath, { readonly: true });

  // Optional safety: make reads faster / safer in serverless
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");

  return _db;
}
