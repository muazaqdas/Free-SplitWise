import type { ExpenseSplitsRepository } from '../repositories/expenseSplits.repository';
import type { SettlementsRepository } from '../repositories/settlements.repository';

// Raw balances — CLAUDE.md Module 5: "who owes whom, unsimplified." Distinct
// from Module 8's greedy debt simplification: this reflects actual per-expense
// payer/ower relationships (summed and netted per pair), not the minimum
// transaction set a simplifier would produce.

export interface SplitRow {
  userId: string;
  paidAmount: number;
  owedAmount: number;
}

export interface RawDebt {
  fromUserId: string; // owes
  toUserId: string; // is owed
  amount: number;
}

// A recorded payment (Module 7) — fromUserId paid toUserId this amount.
export interface SettlementRow {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Within one expense, each ower's owedAmount is attributed across that
// expense's payers in proportion to how much each payer contributed — the
// general case that also covers the common single-payer expense (the ower's
// full owedAmount goes to that one payer).
function addExpenseDebts(pairTotals: Map<string, number>, splits: SplitRow[]): void {
  const totalPaid = splits.reduce((sum, row) => sum + row.paidAmount, 0);
  if (totalPaid <= 0) return;

  for (const ower of splits) {
    if (ower.owedAmount <= 0) continue;
    for (const payer of splits) {
      if (payer.paidAmount <= 0 || payer.userId === ower.userId) continue;
      const amount = (ower.owedAmount * payer.paidAmount) / totalPaid;
      if (amount <= 0) continue;

      const [a, b] = [ower.userId, payer.userId].sort();
      const key = `${a}|${b}`;
      const signedAmount = ower.userId === a ? amount : -amount;
      pairTotals.set(key, (pairTotals.get(key) ?? 0) + signedAmount);
    }
  }
}

// A settlement reduces what fromUserId owes toUserId by `amount` — the exact
// opposite of an expense debt in that direction, so it nets through the same
// signed pairTotals map addExpenseDebts builds.
function addSettlementAdjustment(pairTotals: Map<string, number>, settlement: SettlementRow): void {
  if (settlement.amount <= 0) return;
  const [a, b] = [settlement.fromUserId, settlement.toUserId].sort();
  const key = `${a}|${b}`;
  const signedAmount = settlement.fromUserId === a ? -settlement.amount : settlement.amount;
  pairTotals.set(key, (pairTotals.get(key) ?? 0) + signedAmount);
}

// Pure and DB-free so it's directly unit-testable, per the pattern set by
// splitting.service.ts. `expensesSplits` is one array of split rows per
// expense — callers group the flat repository result by expenseId first.
// `settlements` (Module 7) are netted in after expense debts.
export function calculateRawBalances(expensesSplits: SplitRow[][], settlements: SettlementRow[] = []): RawDebt[] {
  const pairTotals = new Map<string, number>();
  for (const splits of expensesSplits) {
    addExpenseDebts(pairTotals, splits);
  }
  for (const settlement of settlements) {
    addSettlementAdjustment(pairTotals, settlement);
  }

  const debts: RawDebt[] = [];
  for (const [key, amount] of pairTotals) {
    const rounded = roundCents(amount);
    if (rounded === 0) continue;
    const [a, b] = key.split('|');
    debts.push(rounded > 0 ? { fromUserId: a, toUserId: b, amount: rounded } : { fromUserId: b, toUserId: a, amount: -rounded });
  }
  return debts;
}

// Module 8: greedy debt simplification. Nets each user's overall balance
// across all pairwise debts, then repeatedly matches the largest creditor
// with the largest debtor until everyone is at zero. This minimizes the
// number of settling transactions but changes who pays whom relative to the
// raw per-pair debts above — it's an alternate view, not a replacement.
export function simplifyDebts(debts: RawDebt[]): RawDebt[] {
  const net = new Map<string, number>();
  for (const debt of debts) {
    net.set(debt.fromUserId, (net.get(debt.fromUserId) ?? 0) - debt.amount);
    net.set(debt.toUserId, (net.get(debt.toUserId) ?? 0) + debt.amount);
  }

  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];
  for (const [userId, amount] of net) {
    const rounded = roundCents(amount);
    if (rounded > 0) creditors.push({ userId, amount: rounded });
    else if (rounded < 0) debtors.push({ userId, amount: -rounded });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: RawDebt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = roundCents(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      settlements.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount });
    }

    debtor.amount = roundCents(debtor.amount - amount);
    creditor.amount = roundCents(creditor.amount - amount);
    if (debtor.amount <= 0) i++;
    if (creditor.amount <= 0) j++;
  }

  return settlements;
}

function groupByExpense(splits: { expenseId: string; userId: string; paidAmount: number; owedAmount: number }[]): SplitRow[][] {
  const byExpense = new Map<string, SplitRow[]>();
  for (const split of splits) {
    const rows = byExpense.get(split.expenseId) ?? [];
    rows.push({ userId: split.userId, paidAmount: split.paidAmount, owedAmount: split.owedAmount });
    byExpense.set(split.expenseId, rows);
  }
  return Array.from(byExpense.values());
}

export function createBalancesService(expenseSplitsRepo: ExpenseSplitsRepository, settlementsRepo: SettlementsRepository) {
  return {
    async getRawGroupBalances(groupId: string): Promise<RawDebt[]> {
      const [splits, settlements] = await Promise.all([
        expenseSplitsRepo.getByGroup(groupId),
        settlementsRepo.getByGroup(groupId),
      ]);
      return calculateRawBalances(
        groupByExpense(splits),
        settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount }))
      );
    },

    async getSimplifiedGroupBalances(groupId: string): Promise<RawDebt[]> {
      const [splits, settlements] = await Promise.all([
        expenseSplitsRepo.getByGroup(groupId),
        settlementsRepo.getByGroup(groupId),
      ]);
      const raw = calculateRawBalances(
        groupByExpense(splits),
        settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount }))
      );
      return simplifyDebts(raw);
    },
  };
}

export type BalancesService = ReturnType<typeof createBalancesService>;

let defaultInstance: BalancesService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createBalancesService() directly
// against a non-native AppDatabase without a native runtime.
export function getBalancesService(): BalancesService {
  if (!defaultInstance) {
    const { getExpenseSplitsRepository, getSettlementsRepository } = require('../repositories');
    defaultInstance = createBalancesService(getExpenseSplitsRepository(), getSettlementsRepository());
  }
  return defaultInstance;
}
