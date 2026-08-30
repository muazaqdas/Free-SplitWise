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
  await migrateAddIsCurrentUser(instance);
  db = instance;
  return db;
}

// `CREATE TABLE IF NOT EXISTS` (above) never alters a table that already
// exists on someone's device, so a column added after the table shipped
// needs an explicit ALTER TABLE, run only if it's actually missing.
async function migrateAddIsCurrentUser(instance: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await instance.getAllAsync<{ name: string }>(`PRAGMA table_info(users);`);
  const hasColumn = columns.some((column) => column.name === 'isCurrentUser');
  if (!hasColumn) {
    await instance.execAsync(`ALTER TABLE users ADD COLUMN isCurrentUser INTEGER DEFAULT 0;`);
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() first');
  }
  return db;
}
