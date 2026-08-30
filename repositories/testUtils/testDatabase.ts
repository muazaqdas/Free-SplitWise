import BetterSqlite3 from 'better-sqlite3';
import { SCHEMA_STATEMENTS } from '../../db/schema';
import type { AppDatabase } from '../../db/types';

// Real SQLite (via better-sqlite3) standing in for expo-sqlite in tests, so
// repository queries run against actual SQL semantics rather than a hand-rolled
// fake. Wraps better-sqlite3's sync API in the async shape AppDatabase expects.
export function createTestDatabase(): AppDatabase {
  const sqlite = new BetterSqlite3(':memory:');
  for (const statement of SCHEMA_STATEMENTS) {
    sqlite.exec(statement);
  }

  return {
    async execAsync(source) {
      sqlite.exec(source);
    },
    async runAsync(source, params = []) {
      const result = sqlite.prepare(source).run(...(params as unknown[]));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(source: string, params: unknown[] = []) {
      return sqlite.prepare(source).all(...params) as T[];
    },
    async getFirstAsync<T>(source: string, params: unknown[] = []) {
      const row = sqlite.prepare(source).get(...params);
      return (row ?? null) as T | null;
    },
  };
}
