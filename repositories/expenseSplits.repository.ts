import type { AppDatabase, ExpenseSplit } from '../db/types';
import { generateId } from './shared';

interface ExpenseSplitRow {
  id: string;
  expenseId: string;
  userId: string;
  paidAmount: number;
  owedAmount: number;
  weightValue: number | null;
}

function toExpenseSplit(row: ExpenseSplitRow): ExpenseSplit {
  return {
    id: row.id,
    expenseId: row.expenseId,
    userId: row.userId,
    paidAmount: row.paidAmount,
    owedAmount: row.owedAmount,
    weightValue: row.weightValue,
  };
}

export interface CreateExpenseSplitInput {
  userId: string;
  paidAmount: number;
  owedAmount: number;
  weightValue: number | null;
}

export function createExpenseSplitsRepository(db: AppDatabase) {
  return {
    // expense_splits carries no isDeleted/_syncStatus (CLAUDE.md Section 3) —
    // it's a derived breakdown of its parent expense, not independently
    // synced, so rows are just inserted/read/hard-deleted alongside it.
    async createMany(expenseId: string, rows: CreateExpenseSplitInput[]): Promise<ExpenseSplit[]> {
      const created: ExpenseSplit[] = [];
      for (const row of rows) {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO expense_splits (id, expenseId, userId, paidAmount, owedAmount, weightValue) VALUES (?, ?, ?, ?, ?, ?);`,
          [id, expenseId, row.userId, row.paidAmount, row.owedAmount, row.weightValue]
        );
        created.push({ id, expenseId, userId: row.userId, paidAmount: row.paidAmount, owedAmount: row.owedAmount, weightValue: row.weightValue });
      }
      return created;
    },

    async getByExpense(expenseId: string): Promise<ExpenseSplit[]> {
      const rows = await db.getAllAsync<ExpenseSplitRow>(`SELECT * FROM expense_splits WHERE expenseId = ?;`, [
        expenseId,
      ]);
      return rows.map(toExpenseSplit);
    },

    // All splits for every non-deleted expense in a group — the raw input
    // the balances service groups back out by expenseId (CLAUDE.md Module 5).
    async getByGroup(groupId: string): Promise<ExpenseSplit[]> {
      const rows = await db.getAllAsync<ExpenseSplitRow>(
        `SELECT es.id as id, es.expenseId as expenseId, es.userId as userId,
                es.paidAmount as paidAmount, es.owedAmount as owedAmount, es.weightValue as weightValue
         FROM expense_splits es
         JOIN expenses e ON e.id = es.expenseId
         WHERE e.groupId = ? AND e.isDeleted = 0;`,
        [groupId]
      );
      return rows.map(toExpenseSplit);
    },

    async removeByExpense(expenseId: string): Promise<void> {
      await db.runAsync(`DELETE FROM expense_splits WHERE expenseId = ?;`, [expenseId]);
    },
  };
}

export type ExpenseSplitsRepository = ReturnType<typeof createExpenseSplitsRepository>;

let defaultInstance: ExpenseSplitsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createExpenseSplitsRepository() directly without a native runtime.
export function getExpenseSplitsRepository(): ExpenseSplitsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createExpenseSplitsRepository(getDatabase());
  }
  return defaultInstance;
}
