import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { CREATE_TABLES_SQL } from './schema';

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  return path.join(process.cwd(), 'data', 'pulse.db');
}

export function initDatabase(customPath?: string): DatabaseSync {
  const dbPath = customPath || getDatabasePath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable WAL mode and foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Ensure tables exist
  db.exec(CREATE_TABLES_SQL);

  return db;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
