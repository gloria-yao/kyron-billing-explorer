// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;

  // Your Prisma schema uses: url = "file:../data/kyron.db"
  // From project root at runtime, that resolves to: ./data/kyron.db
  const dbPath = path.join(process.cwd(), 'data', 'kyron.db');

  _db = new Database(dbPath, {
    readonly: false,
    fileMustExist: true,
  });

  // Optional: improve concurrency
  _db.pragma('journal_mode = WAL');

  return _db;
}
