import type { AppDatabase, Expense, SplitType } from '../db/types';
import { generateId, nowIso } from './shared';

interface ExpenseRow {
  id: string;
  groupId: string | null;
  description: string;
  totalAmount: number;
  currency: string;
  date: string;
  category: string;
  splitType: string;
  rationMetric: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  _syncStatus: string;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    groupId: row.groupId,
    description: row.description,
    totalAmount: row.totalAmount,
    currency: row.currency,
    date: row.date,
    category: row.category,
    splitType: row.splitType as SplitType,
    rationMetric: row.rationMetric,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted === 1,
    _syncStatus: row._syncStatus as Expense['_syncStatus'],
  };
}

export interface CreateExpenseInput {
  groupId: string | null;
  description: string;
  totalAmount: number;
  currency: string;
  date: string;
  category: string;
  splitType: SplitType;
  rationMetric?: string | null;
  createdBy: string;
}

// groupId and createdBy are not editable — an expense doesn't move between
// groups or change authorship, only its own details and how it's split.
export interface UpdateExpenseInput {
  description?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  category?: string;
  splitType?: SplitType;
  rationMetric?: string | null;
}

export function createExpensesRepository(db: AppDatabase) {
  return {
    async create(input: CreateExpenseInput): Promise<Expense> {
      const id = generateId();
      const timestamp = nowIso();
      const rationMetric = input.rationMetric ?? null;
      await db.runAsync(
        `INSERT INTO expenses
          (id, groupId, description, totalAmount, currency, date, category, splitType, rationMetric, createdBy, createdAt, updatedAt, isDeleted, _syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
        [
          id,
          input.groupId,
          input.description,
          input.totalAmount,
          input.currency,
          input.date,
          input.category,
          input.splitType,
          rationMetric,
          input.createdBy,
          timestamp,
          timestamp,
          'created',
        ]
      );
      return {
        id,
        groupId: input.groupId,
        description: input.description,
        totalAmount: input.totalAmount,
        currency: input.currency,
        date: input.date,
        category: input.category,
        splitType: input.splitType,
        rationMetric,
        createdBy: input.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        _syncStatus: 'created',
      };
    },

    async getById(id: string): Promise<Expense | null> {
      const row = await db.getFirstAsync<ExpenseRow>(`SELECT * FROM expenses WHERE id = ?;`, [id]);
      return row ? toExpense(row) : null;
    },

    async getByGroup(groupId: string): Promise<Expense[]> {
      const rows = await db.getAllAsync<ExpenseRow>(
        `SELECT * FROM expenses WHERE groupId = ? AND isDeleted = 0 ORDER BY date DESC, createdAt DESC;`,
        [groupId]
      );
      return rows.map(toExpense);
    },

    async update(id: string, updates: UpdateExpenseInput): Promise<Expense> {
      const existing = await db.getFirstAsync<ExpenseRow>(`SELECT * FROM expenses WHERE id = ?;`, [id]);
      if (!existing) {
        throw new Error(`Expense not found: ${id}`);
      }
      const timestamp = nowIso();
      const description = updates.description ?? existing.description;
      const totalAmount = updates.totalAmount !== undefined ? updates.totalAmount : existing.totalAmount;
      const currency = updates.currency ?? existing.currency;
      const date = updates.date ?? existing.date;
      const category = updates.category ?? existing.category;
      const splitType = updates.splitType ?? existing.splitType;
      const rationMetric = updates.rationMetric !== undefined ? updates.rationMetric : existing.rationMetric;

      await db.runAsync(
        `UPDATE expenses
         SET description = ?, totalAmount = ?, currency = ?, date = ?, category = ?, splitType = ?, rationMetric = ?, updatedAt = ?, _syncStatus = ?
         WHERE id = ?;`,
        [description, totalAmount, currency, date, category, splitType, rationMetric, timestamp, 'updated', id]
      );

      return toExpense({
        ...existing,
        description,
        totalAmount,
        currency,
        date,
        category,
        splitType,
        rationMetric,
        updatedAt: timestamp,
        _syncStatus: 'updated',
      });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE expenses SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type ExpensesRepository = ReturnType<typeof createExpensesRepository>;

let defaultInstance: ExpensesRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createExpensesRepository() directly without a native runtime.
export function getExpensesRepository(): ExpensesRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createExpensesRepository(getDatabase());
  }
  return defaultInstance;
}
