import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';

export type Db = Database.Database;

export function openDatabase(databasePath: string): Db {
  const isMemory = databasePath === ':memory:';

  if (!isMemory) {
    const absolute = resolve(databasePath);
    mkdirSync(dirname(absolute), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (!isMemory) {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  migrate(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(SCHEMA_SQL);
}

export function closeDatabase(db: Db): void {
  if (db.open) db.close();
}
