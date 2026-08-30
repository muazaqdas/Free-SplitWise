import type { Budget } from '../db/types';
import type { BudgetsRepository } from '../repositories/budgets.repository';
import type { PersonalTransactionsRepository } from '../repositories/personalTransactions.repository';

export interface CategorySpend {
  category: string;
  spent: number;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
}

function monthOf(dateIso: string): string {
  return dateIso.slice(0, 7); // 'YYYY-MM'
}

export function createBudgetOverviewService(
  transactionsRepo: PersonalTransactionsRepository,
  budgetsRepo: BudgetsRepository
) {
  return {
    // Category breakdown screen: total expense spend per category for a given month.
    async getCategorySpend(month: string): Promise<CategorySpend[]> {
      const transactions = await transactionsRepo.getAll();
      const totals = new Map<string, number>();
      for (const t of transactions) {
        if (t.type !== 'expense' || monthOf(t.date) !== month) continue;
        totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
      }
      return Array.from(totals.entries())
        .map(([category, spent]) => ({ category, spent }))
        .sort((a, b) => b.spent - a.spent);
    },

    // Monthly budget view: each budget for the month paired with actual spend in its category.
    async getBudgetProgress(month: string): Promise<BudgetProgress[]> {
      const [budgets, transactions] = await Promise.all([
        budgetsRepo.getAll({ month }),
        transactionsRepo.getAll(),
      ]);
      return budgets.map((budget) => {
        const spent = transactions
          .filter((t) => t.type === 'expense' && monthOf(t.date) === month && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);
        return { budget, spent };
      });
    },
  };
}

export type BudgetOverviewService = ReturnType<typeof createBudgetOverviewService>;

let defaultInstance: BudgetOverviewService | null = null;

// Deferred require: see personalTransactions.service.ts — avoids importing
// '../db' (expo-sqlite's native binding) at module-eval time in tests.
export function getBudgetOverviewService(): BudgetOverviewService {
  if (!defaultInstance) {
    const { getPersonalTransactionsRepository, getBudgetsRepository } = require('../repositories');
    defaultInstance = createBudgetOverviewService(getPersonalTransactionsRepository(), getBudgetsRepository());
  }
  return defaultInstance;
}
