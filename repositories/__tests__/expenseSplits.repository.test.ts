import { createExpenseSplitsRepository, type ExpenseSplitsRepository } from '../expenseSplits.repository';
import { createExpensesRepository, type ExpensesRepository } from '../expenses.repository';
import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createTestDatabase } from '../testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

describe('expenseSplitsRepository', () => {
  let db: AppDatabase;
  let repo: ExpenseSplitsRepository;
  let expensesRepo: ExpensesRepository;
  let groupsRepo: GroupsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = createExpenseSplitsRepository(db);
    expensesRepo = createExpensesRepository(db);
    groupsRepo = createGroupsRepository(db);
  });

  async function makeExpense(groupId: string) {
    return expensesRepo.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });
  }

  it('creates one row per split and returns them with generated ids', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await makeExpense(group.id);

    const rows = await repo.createMany(expense.id, [
      { userId: 'a', paidAmount: 90, owedAmount: 30, weightValue: null },
      { userId: 'b', paidAmount: 0, owedAmount: 30, weightValue: null },
      { userId: 'c', paidAmount: 0, owedAmount: 30, weightValue: null },
    ]);

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
    expect(rows.every((r) => r.expenseId === expense.id)).toBe(true);
  });

  it('reads back splits for an expense', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await makeExpense(group.id);
    await repo.createMany(expense.id, [{ userId: 'a', paidAmount: 90, owedAmount: 45, weightValue: null }]);

    const rows = await repo.getByExpense(expense.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'a', paidAmount: 90, owedAmount: 45 });
  });

  it('getByGroup joins across all non-deleted expenses in a group and excludes other groups', async () => {
    const groupA = await groupsRepo.create({ name: 'Trip' });
    const groupB = await groupsRepo.create({ name: 'Roommates' });
    const expenseA1 = await makeExpense(groupA.id);
    const expenseA2 = await makeExpense(groupA.id);
    const expenseB1 = await makeExpense(groupB.id);

    await repo.createMany(expenseA1.id, [{ userId: 'a', paidAmount: 90, owedAmount: 45, weightValue: null }]);
    await repo.createMany(expenseA2.id, [{ userId: 'b', paidAmount: 10, owedAmount: 5, weightValue: null }]);
    await repo.createMany(expenseB1.id, [{ userId: 'c', paidAmount: 5, owedAmount: 5, weightValue: null }]);

    const rows = await repo.getByGroup(groupA.id);
    expect(rows.map((r) => r.userId).sort()).toEqual(['a', 'b']);
  });

  it('getByGroup excludes splits belonging to a soft-deleted expense', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await makeExpense(group.id);
    await repo.createMany(expense.id, [{ userId: 'a', paidAmount: 90, owedAmount: 45, weightValue: null }]);

    await expensesRepo.remove(expense.id);

    expect(await repo.getByGroup(group.id)).toEqual([]);
  });

  it('removeByExpense deletes all splits for that expense', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await makeExpense(group.id);
    await repo.createMany(expense.id, [
      { userId: 'a', paidAmount: 90, owedAmount: 45, weightValue: null },
      { userId: 'b', paidAmount: 0, owedAmount: 45, weightValue: null },
    ]);

    await repo.removeByExpense(expense.id);

    expect(await repo.getByExpense(expense.id)).toEqual([]);
  });
});
