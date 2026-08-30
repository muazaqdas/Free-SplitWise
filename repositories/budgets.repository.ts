import type { AppDatabase, Budget } from '../db/types';
import { generateId, nowIso } from './shared';

interface BudgetRow {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    monthlyLimit: row.monthlyLimit,
    month: row.month,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as Budget['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreateBudgetInput {
  category: string;
  monthlyLimit: number;
  month: string;
}

export interface UpdateBudgetInput {
  category?: string;
  monthlyLimit?: number;
  month?: string;
}

export function createBudgetsRepository(db: AppDatabase) {
  return {
    async create(input: CreateBudgetInput): Promise<Budget> {
      const id = generateId();
      const timestamp = nowIso();
      await db.runAsync(
        `INSERT INTO budgets (id, category, monthlyLimit, month, createdAt, updatedAt, _syncStatus, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
        [id, input.category, input.monthlyLimit, input.month, timestamp, timestamp, 'created']
      );
      return {
        id,
        category: input.category,
        monthlyLimit: input.monthlyLimit,
        month: input.month,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    async getById(id: string): Promise<Budget | null> {
      const row = await db.getFirstAsync<BudgetRow>(`SELECT * FROM budgets WHERE id = ?;`, [id]);
      return row ? toBudget(row) : null;
    },

    async getAll(filter?: { month?: string }): Promise<Budget[]> {
      if (filter?.month) {
        const rows = await db.getAllAsync<BudgetRow>(
          `SELECT * FROM budgets WHERE isDeleted = 0 AND month = ? ORDER BY category ASC;`,
          [filter.month]
        );
        return rows.map(toBudget);
      }
      const rows = await db.getAllAsync<BudgetRow>(
        `SELECT * FROM budgets WHERE isDeleted = 0 ORDER BY month ASC, category ASC;`
      );
      return rows.map(toBudget);
    },

    async update(id: string, updates: UpdateBudgetInput): Promise<Budget> {
      const existing = await db.getFirstAsync<BudgetRow>(`SELECT * FROM budgets WHERE id = ?;`, [id]);
      if (!existing) {
        throw new Error(`Budget not found: ${id}`);
      }
      const timestamp = nowIso();
      const category = updates.category ?? existing.category;
      const monthlyLimit = updates.monthlyLimit !== undefined ? updates.monthlyLimit : existing.monthlyLimit;
      const month = updates.month ?? existing.month;
      await db.runAsync(
        `UPDATE budgets SET category = ?, monthlyLimit = ?, month = ?, updatedAt = ?, _syncStatus = ? WHERE id = ?;`,
        [category, monthlyLimit, month, timestamp, 'updated', id]
      );
      return toBudget({ ...existing, category, monthlyLimit, month, updatedAt: timestamp, _syncStatus: 'updated' });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE budgets SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type BudgetsRepository = ReturnType<typeof createBudgetsRepository>;

let defaultInstance: BudgetsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createBudgetsRepository() directly without a native runtime.
export function getBudgetsRepository(): BudgetsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createBudgetsRepository(getDatabase());
  }
  return defaultInstance;
}
