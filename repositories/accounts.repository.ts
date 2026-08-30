import type { Account, AccountType, AppDatabase } from '../db/types';
import { generateId, nowIso } from './shared';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    balance: row.balance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as Account['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  balance?: number;
}

export function createAccountsRepository(db: AppDatabase) {
  return {
    async create(input: CreateAccountInput): Promise<Account> {
      const id = generateId();
      const timestamp = nowIso();
      const balance = input.balance ?? 0;
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, balance, createdAt, updatedAt, _syncStatus, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
        [id, input.name, input.type, balance, timestamp, timestamp, 'created']
      );
      return {
        id,
        name: input.name,
        type: input.type,
        balance,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    async getById(id: string): Promise<Account | null> {
      const row = await db.getFirstAsync<AccountRow>(`SELECT * FROM accounts WHERE id = ?;`, [id]);
      return row ? toAccount(row) : null;
    },

    async getAll(): Promise<Account[]> {
      const rows = await db.getAllAsync<AccountRow>(
        `SELECT * FROM accounts WHERE isDeleted = 0 ORDER BY createdAt ASC;`
      );
      return rows.map(toAccount);
    },

    async update(id: string, updates: UpdateAccountInput): Promise<Account> {
      const existing = await db.getFirstAsync<AccountRow>(`SELECT * FROM accounts WHERE id = ?;`, [id]);
      if (!existing) {
        throw new Error(`Account not found: ${id}`);
      }
      const timestamp = nowIso();
      const name = updates.name ?? existing.name;
      const type = updates.type ?? (existing.type as AccountType);
      const balance = updates.balance !== undefined ? updates.balance : existing.balance;
      await db.runAsync(
        `UPDATE accounts SET name = ?, type = ?, balance = ?, updatedAt = ?, _syncStatus = ? WHERE id = ?;`,
        [name, type, balance, timestamp, 'updated', id]
      );
      return toAccount({ ...existing, name, type, balance, updatedAt: timestamp, _syncStatus: 'updated' });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE accounts SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>;

let defaultInstance: AccountsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createAccountsRepository() directly without a native runtime.
export function getAccountsRepository(): AccountsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createAccountsRepository(getDatabase());
  }
  return defaultInstance;
}
