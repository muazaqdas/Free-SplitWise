import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

const DATABASE_NAME = 'free-splitwise.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const instance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  for (const statement of SCHEMA_STATEMENTS) {
    await instance.execAsync(statement);
  }
  db = instance;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() first');
  }
  return db;
}
