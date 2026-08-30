import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentSplit,
  calculateSharesSplit,
  calculateRationSplit,
  calculateIncomeSplit,
  type ExpenseSplitCalculation,
  type ParticipantPayment,
} from './splitting.service';
import type { ExpensesRepository } from '../repositories/expenses.repository';
import type { ExpenseSplitsRepository } from '../repositories/expenseSplits.repository';
import type { ActivityLogRepository } from '../repositories/activityLog.repository';
import type { Expense, ExpenseSplit } from '../db/types';

export type CreatableSplitType = 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES' | 'RATION' | 'INCOME';

interface BaseCreateExpenseInput {
  groupId: string;
  description: string;
  totalAmount: number;
  currency: string;
  date: string;
  category: string;
  createdBy: string;
  paidBy: ParticipantPayment[];
}

export type CreateExpenseServiceInput =
  | (BaseCreateExpenseInput & { splitType: 'EQUAL'; participantUserIds: string[] })
  | (BaseCreateExpenseInput & { splitType: 'EXACT'; exactAmounts: Record<string, number> })
  | (BaseCreateExpenseInput & { splitType: 'PERCENT'; percents: Record<string, number> })
  | (BaseCreateExpenseInput & { splitType: 'SHARES'; shares: Record<string, number> })
  | (BaseCreateExpenseInput & { splitType: 'RATION'; rationMetric: string; rationValues: Record<string, number> })
  | (BaseCreateExpenseInput & { splitType: 'INCOME'; incomes: Record<string, number> });

export type UpdateExpenseServiceInput = CreateExpenseServiceInput;

function validate(input: CreateExpenseServiceInput): string {
  const description = input.description.trim();
  if (!description) {
    throw new Error('Give the expense a description.');
  }
  if (!(input.totalAmount > 0)) {
    throw new Error('Enter an amount greater than 0.');
  }
  if (input.paidBy.length === 0) {
    throw new Error('Select who paid.');
  }
  if (input.splitType === 'RATION' && !input.rationMetric.trim()) {
    throw new Error('Give the ration metric a name (e.g. "Meals Eaten").');
  }
  return description;
}

function computeSplitRows(input: CreateExpenseServiceInput): ExpenseSplitCalculation[] {
  switch (input.splitType) {
    case 'EQUAL':
      return calculateEqualSplit(input.totalAmount, input.participantUserIds, input.paidBy);
    case 'EXACT':
      return calculateExactSplit(input.totalAmount, input.exactAmounts, input.paidBy);
    case 'PERCENT':
      return calculatePercentSplit(input.totalAmount, input.percents, input.paidBy);
    case 'SHARES':
      return calculateSharesSplit(input.totalAmount, input.shares, input.paidBy);
    case 'RATION':
      return calculateRationSplit(input.totalAmount, input.rationValues, input.paidBy);
    case 'INCOME':
      return calculateIncomeSplit(input.totalAmount, input.incomes, input.paidBy);
  }
}

function expenseSummary(expense: Expense): string {
  return `${expense.description} ($${expense.totalAmount.toFixed(2)})`;
}

export function createExpensesService(
  expensesRepo: ExpensesRepository,
  expenseSplitsRepo: ExpenseSplitsRepository,
  activityLogRepo: ActivityLogRepository
) {
  return {
    async create(input: CreateExpenseServiceInput): Promise<{ expense: Expense; splits: ExpenseSplit[] }> {
      const description = validate(input);

      // Computed and validated before any write, so a bad split (e.g. EXACT
      // amounts that don't sum to the total) never leaves a half-created
      // expense with no splits behind.
      const rows = computeSplitRows(input);

      const expense = await expensesRepo.create({
        groupId: input.groupId,
        description,
        totalAmount: input.totalAmount,
        currency: input.currency,
        date: input.date,
        category: input.category,
        splitType: input.splitType,
        rationMetric: input.splitType === 'RATION' ? input.rationMetric.trim() : null,
        createdBy: input.createdBy,
      });
      const splits = await expenseSplitsRepo.createMany(expense.id, rows);

      // Module 9: every mutating action gets a ledger entry. groupId is
      // nullable on Expense (personal expenses per CLAUDE.md Section 3), but
      // this service only ever creates group expenses (input.groupId is
      // required), so it's always present here.
      await activityLogRepo.create({
        groupId: expense.groupId as string,
        entityType: 'EXPENSE',
        entityId: expense.id,
        action: 'CREATED',
        description: expenseSummary(expense),
        primaryUserId: expense.createdBy,
      });

      return { expense, splits };
    },

    // Recomputes splits from scratch against the new input (same calculators
    // `create` uses) and replaces the old expense_splits rows wholesale —
    // simpler and safer than trying to diff/patch individual split rows, and
    // correct because nothing else references an expense_split by its own id
    // (only by expenseId, per CLAUDE.md Module 5's balances grouping).
    async update(id: string, input: UpdateExpenseServiceInput): Promise<{ expense: Expense; splits: ExpenseSplit[] }> {
      const existing = await expensesRepo.getById(id);
      if (!existing || existing.isDeleted) {
        throw new Error('Expense not found.');
      }

      const description = validate(input);
      const rows = computeSplitRows(input);

      const expense = await expensesRepo.update(id, {
        description,
        totalAmount: input.totalAmount,
        currency: input.currency,
        date: input.date,
        category: input.category,
        splitType: input.splitType,
        rationMetric: input.splitType === 'RATION' ? input.rationMetric.trim() : null,
      });
      await expenseSplitsRepo.removeByExpense(id);
      const splits = await expenseSplitsRepo.createMany(id, rows);

      if (expense.groupId) {
        await activityLogRepo.create({
          groupId: expense.groupId,
          entityType: 'EXPENSE',
          entityId: expense.id,
          action: 'UPDATED',
          description: expenseSummary(expense),
          primaryUserId: input.createdBy,
        });
      }

      return { expense, splits };
    },

    // Soft-deletes the expense (CLAUDE.md's never-hard-delete rule) and logs
    // it. expense_splits rows are left in place — the balances/activity
    // queries already filter on the parent expense's isDeleted flag.
    async remove(id: string): Promise<void> {
      const existing = await expensesRepo.getById(id);
      if (!existing || existing.isDeleted) {
        throw new Error('Expense not found.');
      }
      await expensesRepo.remove(id);

      if (existing.groupId) {
        await activityLogRepo.create({
          groupId: existing.groupId,
          entityType: 'EXPENSE',
          entityId: existing.id,
          action: 'DELETED',
          description: expenseSummary(existing),
          primaryUserId: existing.createdBy,
        });
      }
    },
  };
}

export type ExpensesService = ReturnType<typeof createExpensesService>;

let defaultInstance: ExpensesService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createExpensesService() directly
// against a non-native AppDatabase without a native runtime.
export function getExpensesService(): ExpensesService {
  if (!defaultInstance) {
    const { getExpensesRepository, getExpenseSplitsRepository, getActivityLogRepository } = require('../repositories');
    defaultInstance = createExpensesService(getExpensesRepository(), getExpenseSplitsRepository(), getActivityLogRepository());
  }
  return defaultInstance;
}
