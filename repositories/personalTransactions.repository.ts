import type { AppDatabase, PersonalTransaction, PersonalTransactionType } from '../db/types';
import { generateId, nowIso } from './shared';

interface PersonalTransactionRow {
  id: string;
  accountId: string;
  type: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toPersonalTransaction(row: PersonalTransactionRow): PersonalTransaction {
  return {
    id: row.id,
    accountId: row.accountId,
    type: row.type as PersonalTransactionType,
    amount: row.amount,
    category: row.category,
    date: row.date,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as PersonalTransaction['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreatePersonalTransactionInput {
  accountId: string;
  type: PersonalTransactionType;
  amount: number;
  category: string;
  date: string;
  note?: string | null;
}

export interface UpdatePersonalTransactionInput {
  accountId?: string;
  type?: PersonalTransactionType;
  amount?: number;
  category?: string;
  date?: string;
  note?: string | null;
}

export function createPersonalTransactionsRepository(db: AppDatabase) {
  return {
    async create(input: CreatePersonalTransactionInput): Promise<PersonalTransaction> {
      const id = generateId();
      const timestamp = nowIso();
      const note = input.note ?? null;
      await db.runAsync(
        `INSERT INTO personal_transactions (id, accountId, type, amount, category, date, note, createdAt, updatedAt, _syncStatus, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [id, input.accountId, input.type, input.amount, input.category, input.date, note, timestamp, timestamp, 'created']
      );
      return {
        id,
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        category: input.category,
        date: input.date,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    async getById(id: string): Promise<PersonalTransaction | null> {
      const row = await db.getFirstAsync<PersonalTransactionRow>(
        `SELECT * FROM personal_transactions WHERE id = ?;`,
        [id]
      );
      return row ? toPersonalTransaction(row) : null;
    },

    async getAll(filter?: { accountId?: string }): Promise<PersonalTransaction[]> {
      if (filter?.accountId) {
        const rows = await db.getAllAsync<PersonalTransactionRow>(
          `SELECT * FROM personal_transactions WHERE isDeleted = 0 AND accountId = ? ORDER BY date ASC;`,
          [filter.accountId]
        );
        return rows.map(toPersonalTransaction);
      }
      const rows = await db.getAllAsync<PersonalTransactionRow>(
        `SELECT * FROM personal_transactions WHERE isDeleted = 0 ORDER BY date ASC;`
      );
      return rows.map(toPersonalTransaction);
    },

    async update(id: string, updates: UpdatePersonalTransactionInput): Promise<PersonalTransaction> {
      const existing = await db.getFirstAsync<PersonalTransactionRow>(
        `SELECT * FROM personal_transactions WHERE id = ?;`,
        [id]
      );
      if (!existing) {
        throw new Error(`Personal transaction not found: ${id}`);
      }
      const timestamp = nowIso();
      const accountId = updates.accountId ?? existing.accountId;
      const type = updates.type ?? (existing.type as PersonalTransactionType);
      const amount = updates.amount !== undefined ? updates.amount : existing.amount;
      const category = updates.category ?? existing.category;
      const date = updates.date ?? existing.date;
      const note = updates.note !== undefined ? updates.note : existing.note;
      await db.runAsync(
        `UPDATE personal_transactions SET accountId = ?, type = ?, amount = ?, category = ?, date = ?, note = ?, updatedAt = ?, _syncStatus = ? WHERE id = ?;`,
        [accountId, type, amount, category, date, note, timestamp, 'updated', id]
      );
      return toPersonalTransaction({
        ...existing,
        accountId,
        type,
        amount,
        category,
        date,
        note,
        updatedAt: timestamp,
        _syncStatus: 'updated',
      });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(
        `UPDATE personal_transactions SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`,
        [timestamp, 'updated', id]
      );
    },
  };
}

export type PersonalTransactionsRepository = ReturnType<typeof createPersonalTransactionsRepository>;

let defaultInstance: PersonalTransactionsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createPersonalTransactionsRepository() directly without a native runtime.
export function getPersonalTransactionsRepository(): PersonalTransactionsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createPersonalTransactionsRepository(getDatabase());
  }
  return defaultInstance;
}
