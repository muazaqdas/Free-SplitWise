import type { AppDatabase, User } from '../db/types';
import { generateId, nowIso } from './shared';

interface UserRow {
  id: string;
  name: string;
  monthlyIncome: number | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    monthlyIncome: row.monthlyIncome,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as User['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreateUserInput {
  name: string;
  monthlyIncome?: number | null;
}

export interface UpdateUserInput {
  name?: string;
  monthlyIncome?: number | null;
}

export function createUsersRepository(db: AppDatabase) {
  return {
    async create(input: CreateUserInput): Promise<User> {
      const id = generateId();
      const timestamp = nowIso();
      const monthlyIncome = input.monthlyIncome ?? null;
      await db.runAsync(
        `INSERT INTO users (id, name, monthlyIncome, createdAt, updatedAt, _syncStatus, isDeleted) VALUES (?, ?, ?, ?, ?, ?, 0);`,
        [id, input.name, monthlyIncome, timestamp, timestamp, 'created']
      );
      return {
        id,
        name: input.name,
        monthlyIncome,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    async getById(id: string): Promise<User | null> {
      const row = await db.getFirstAsync<UserRow>(`SELECT * FROM users WHERE id = ?;`, [id]);
      return row ? toUser(row) : null;
    },

    async getAll(): Promise<User[]> {
      const rows = await db.getAllAsync<UserRow>(
        `SELECT * FROM users WHERE isDeleted = 0 ORDER BY createdAt ASC;`
      );
      return rows.map(toUser);
    },

    async update(id: string, updates: UpdateUserInput): Promise<User> {
      const existing = await db.getFirstAsync<UserRow>(`SELECT * FROM users WHERE id = ?;`, [id]);
      if (!existing) {
        throw new Error(`User not found: ${id}`);
      }
      const timestamp = nowIso();
      const name = updates.name ?? existing.name;
      const monthlyIncome = updates.monthlyIncome !== undefined ? updates.monthlyIncome : existing.monthlyIncome;
      await db.runAsync(
        `UPDATE users SET name = ?, monthlyIncome = ?, updatedAt = ?, _syncStatus = ? WHERE id = ?;`,
        [name, monthlyIncome, timestamp, 'updated', id]
      );
      return toUser({ ...existing, name, monthlyIncome, updatedAt: timestamp, _syncStatus: 'updated' });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE users SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;

let defaultInstance: UsersRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createUsersRepository() directly without a native runtime.
export function getUsersRepository(): UsersRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createUsersRepository(getDatabase());
  }
  return defaultInstance;
}
