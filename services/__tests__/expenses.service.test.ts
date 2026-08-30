import { createExpensesService, type ExpensesService } from '../expenses.service';
import { createExpensesRepository, type ExpensesRepository } from '../../repositories/expenses.repository';
import { createExpenseSplitsRepository, type ExpenseSplitsRepository } from '../../repositories/expenseSplits.repository';
import { createGroupsRepository, type GroupsRepository } from '../../repositories/groups.repository';
import { createActivityLogRepository, type ActivityLogRepository } from '../../repositories/activityLog.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

describe('expensesService.create', () => {
  let db: AppDatabase;
  let expensesRepo: ExpensesRepository;
  let expenseSplitsRepo: ExpenseSplitsRepository;
  let groupsRepo: GroupsRepository;
  let activityLogRepo: ActivityLogRepository;
  let service: ExpensesService;
  let groupId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    expensesRepo = createExpensesRepository(db);
    expenseSplitsRepo = createExpenseSplitsRepository(db);
    groupsRepo = createGroupsRepository(db);
    activityLogRepo = createActivityLogRepository(db);
    service = createExpensesService(expensesRepo, expenseSplitsRepo, activityLogRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('creates an EQUAL-split expense and its expense_splits rows', async () => {
    const { expense, splits } = await service.create({
      groupId,
      description: '  Dinner  ',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    expect(expense.description).toBe('Dinner');
    expect(expense.splitType).toBe('EQUAL');
    expect(splits).toHaveLength(3);
    expect(splits.every((s) => s.expenseId === expense.id)).toBe(true);
    expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(90);

    const persisted = await expenseSplitsRepo.getByExpense(expense.id);
    expect(persisted).toHaveLength(3);
  });

  it('creates an EXACT-split expense using the given amounts', async () => {
    const { splits } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EXACT',
      exactAmounts: { a: 70, b: 30 },
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });

    expect(splits.find((s) => s.userId === 'a')?.owedAmount).toBe(70);
    expect(splits.find((s) => s.userId === 'b')?.owedAmount).toBe(30);
  });

  it('creates a PERCENT-split expense and records weightValue as the percent', async () => {
    const { splits } = await service.create({
      groupId,
      description: 'Rent',
      totalAmount: 200,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Housing',
      createdBy: 'a',
      splitType: 'PERCENT',
      percents: { a: 25, b: 75 },
      paidBy: [{ userId: 'b', paidAmount: 200 }],
    });

    expect(splits.find((s) => s.userId === 'a')).toMatchObject({ owedAmount: 50, weightValue: 25 });
    expect(splits.find((s) => s.userId === 'b')).toMatchObject({ owedAmount: 150, weightValue: 75 });
  });

  it('creates a SHARES-split expense proportional to share counts', async () => {
    const { splits } = await service.create({
      groupId,
      description: 'Cabin',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Travel',
      createdBy: 'a',
      splitType: 'SHARES',
      shares: { a: 1, b: 2 },
      paidBy: [{ userId: 'b', paidAmount: 90 }],
    });

    expect(splits.find((s) => s.userId === 'a')?.owedAmount).toBe(30);
    expect(splits.find((s) => s.userId === 'b')?.owedAmount).toBe(60);
  });

  it('creates a RATION-split expense, stores the rationMetric, and records weightValue as the ration value', async () => {
    const { expense, splits } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'RATION',
      rationMetric: 'Meals Eaten',
      rationValues: { a: 2, b: 1 },
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    expect(expense.rationMetric).toBe('Meals Eaten');
    expect(splits.find((s) => s.userId === 'a')).toMatchObject({ owedAmount: 60, weightValue: 2 });
    expect(splits.find((s) => s.userId === 'b')).toMatchObject({ owedAmount: 30, weightValue: 1 });
  });

  it('rejects a RATION split with a blank rationMetric without writing anything', async () => {
    await expect(
      service.create({
        groupId,
        description: 'Groceries',
        totalAmount: 90,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'RATION',
        rationMetric: '   ',
        rationValues: { a: 2, b: 1 },
        paidBy: [{ userId: 'a', paidAmount: 90 }],
      })
    ).rejects.toThrow('Give the ration metric a name (e.g. "Meals Eaten").');
    expect(await expensesRepo.getByGroup(groupId)).toEqual([]);
  });

  it('creates an INCOME-split expense proportional to each user\'s stored monthly income', async () => {
    const { expense, splits } = await service.create({
      groupId,
      description: 'Rent',
      totalAmount: 400,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Housing',
      createdBy: 'a',
      splitType: 'INCOME',
      incomes: { a: 3000, b: 1000 },
      paidBy: [{ userId: 'a', paidAmount: 400 }],
    });

    expect(expense.rationMetric).toBeNull();
    expect(splits.find((s) => s.userId === 'a')).toMatchObject({ owedAmount: 300, weightValue: 3000 });
    expect(splits.find((s) => s.userId === 'b')).toMatchObject({ owedAmount: 100, weightValue: 1000 });
  });

  it('rejects an empty description without writing anything', async () => {
    await expect(
      service.create({
        groupId,
        description: '   ',
        totalAmount: 90,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a', 'b'],
        paidBy: [{ userId: 'a', paidAmount: 90 }],
      })
    ).rejects.toThrow('Give the expense a description.');
    expect(await expensesRepo.getByGroup(groupId)).toEqual([]);
  });

  it('rejects a zero amount', async () => {
    await expect(
      service.create({
        groupId,
        description: 'Dinner',
        totalAmount: 0,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a'],
        paidBy: [{ userId: 'a', paidAmount: 0 }],
      })
    ).rejects.toThrow('Enter an amount greater than 0.');
  });

  it('rejects an empty payer list', async () => {
    await expect(
      service.create({
        groupId,
        description: 'Dinner',
        totalAmount: 90,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a', 'b'],
        paidBy: [],
      })
    ).rejects.toThrow('Select who paid.');
  });

  // Documents a current gap, not a requirement: validate() never checks that
  // paidBy sums to totalAmount. Here only 40 of the 100 total is recorded as
  // paid, yet owedAmount still sums to the full 100 -- downstream balance
  // attribution (which divides by totalPaid) would understate what the payer
  // is owed relative to the actual total. Flagging for a product decision
  // rather than silently "fixing" the validation.
  it('does not reject a paidBy total that is less than totalAmount (unvalidated gap)', async () => {
    const { splits } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 40 }],
    });

    expect(splits.reduce((sum, s) => sum + s.paidAmount, 0)).toBe(40);
    expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(100);
  });

  it('does not create an expense row when the split calculation itself throws (EXACT amounts off-total)', async () => {
    await expect(
      service.create({
        groupId,
        description: 'Groceries',
        totalAmount: 100,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EXACT',
        exactAmounts: { a: 70, b: 20 },
        paidBy: [{ userId: 'a', paidAmount: 100 }],
      })
    ).rejects.toThrow();
    expect(await expensesRepo.getByGroup(groupId)).toEqual([]);
  });

  it('logs a CREATED activity entry with the expense description and amount', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    const [entry] = await activityLogRepo.getByGroup(groupId);
    expect(entry).toMatchObject({
      entityType: 'EXPENSE',
      entityId: expense.id,
      action: 'CREATED',
      description: 'Dinner ($90.00)',
      primaryUserId: 'a',
      secondaryUserId: null,
    });
  });

  it('does not log anything when expense creation is rejected', async () => {
    await expect(
      service.create({
        groupId,
        description: '   ',
        totalAmount: 90,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a', 'b'],
        paidBy: [{ userId: 'a', paidAmount: 90 }],
      })
    ).rejects.toThrow();
    expect(await activityLogRepo.getByGroup(groupId)).toEqual([]);
  });
});

describe('expensesService.update', () => {
  let db: AppDatabase;
  let expensesRepo: ExpensesRepository;
  let expenseSplitsRepo: ExpenseSplitsRepository;
  let groupsRepo: GroupsRepository;
  let activityLogRepo: ActivityLogRepository;
  let service: ExpensesService;
  let groupId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    expensesRepo = createExpensesRepository(db);
    expenseSplitsRepo = createExpenseSplitsRepository(db);
    groupsRepo = createGroupsRepository(db);
    activityLogRepo = createActivityLogRepository(db);
    service = createExpensesService(expensesRepo, expenseSplitsRepo, activityLogRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('recomputes and replaces splits when the total amount changes', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    const { expense: updated, splits } = await service.update(expense.id, {
      groupId,
      description: 'Dinner',
      totalAmount: 120,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 120 }],
    });

    expect(updated.totalAmount).toBe(120);
    expect(splits).toHaveLength(3);
    expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(120);

    const persisted = await expenseSplitsRepo.getByExpense(expense.id);
    expect(persisted).toHaveLength(3);
  });

  it('drops splits for a participant who is removed on edit', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    const { splits } = await service.update(expense.id, {
      groupId,
      description: 'Dinner',
      totalAmount: 60,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 60 }],
    });

    expect(splits.map((s) => s.userId).sort()).toEqual(['a', 'b']);
    expect(await expenseSplitsRepo.getByExpense(expense.id)).toHaveLength(2);
  });

  it('switches split type from EQUAL to EXACT and stores the new owed amounts', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });

    const { expense: updated, splits } = await service.update(expense.id, {
      groupId,
      description: 'Groceries',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EXACT',
      exactAmounts: { a: 70, b: 30 },
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });

    expect(updated.splitType).toBe('EXACT');
    expect(splits.find((s) => s.userId === 'a')?.owedAmount).toBe(70);
    expect(splits.find((s) => s.userId === 'b')?.owedAmount).toBe(30);
  });

  it('clears rationMetric when switching away from RATION', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'RATION',
      rationMetric: 'Meals Eaten',
      rationValues: { a: 2, b: 1 },
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });
    expect(expense.rationMetric).toBe('Meals Eaten');

    const { expense: updated } = await service.update(expense.id, {
      groupId,
      description: 'Groceries',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    expect(updated.rationMetric).toBeNull();
  });

  it('rejects updating an unknown expense', async () => {
    await expect(
      service.update('does-not-exist', {
        groupId,
        description: 'Dinner',
        totalAmount: 90,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a', 'b'],
        paidBy: [{ userId: 'a', paidAmount: 90 }],
      })
    ).rejects.toThrow('Expense not found.');
  });

  it('rejects updating a soft-deleted expense', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });
    await expensesRepo.remove(expense.id);

    await expect(
      service.update(expense.id, {
        groupId,
        description: 'Dinner',
        totalAmount: 100,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EQUAL',
        participantUserIds: ['a', 'b'],
        paidBy: [{ userId: 'a', paidAmount: 100 }],
      })
    ).rejects.toThrow('Expense not found.');
  });

  it('rejects an invalid edit (EXACT amounts off-total) and leaves the original splits untouched', async () => {
    const { expense, splits: originalSplits } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EXACT',
      exactAmounts: { a: 70, b: 30 },
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });

    await expect(
      service.update(expense.id, {
        groupId,
        description: 'Groceries',
        totalAmount: 100,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EXACT',
        exactAmounts: { a: 70, b: 20 },
        paidBy: [{ userId: 'a', paidAmount: 100 }],
      })
    ).rejects.toThrow();

    const persisted = await expenseSplitsRepo.getByExpense(expense.id);
    expect(persisted).toEqual(originalSplits);
    expect((await expensesRepo.getById(expense.id))?.totalAmount).toBe(100);
  });

  it('logs an UPDATED activity entry reflecting the new description and amount', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    await service.update(expense.id, {
      groupId,
      description: 'Dinner (updated)',
      totalAmount: 120,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 120 }],
    });

    const entries = await activityLogRepo.getByGroup(groupId);
    expect(entries.map((e) => e.action)).toEqual(['UPDATED', 'CREATED']);
    expect(entries[0]).toMatchObject({
      entityType: 'EXPENSE',
      entityId: expense.id,
      description: 'Dinner (updated) ($120.00)',
      primaryUserId: 'a',
    });
  });

  it('does not log anything when an invalid edit is rejected', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Groceries',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EXACT',
      exactAmounts: { a: 70, b: 30 },
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });

    await expect(
      service.update(expense.id, {
        groupId,
        description: 'Groceries',
        totalAmount: 100,
        currency: 'USD',
        date: '2026-01-01',
        category: 'Food',
        createdBy: 'a',
        splitType: 'EXACT',
        exactAmounts: { a: 70, b: 20 },
        paidBy: [{ userId: 'a', paidAmount: 100 }],
      })
    ).rejects.toThrow();

    const entries = await activityLogRepo.getByGroup(groupId);
    expect(entries.map((e) => e.action)).toEqual(['CREATED']);
  });
});

describe('expensesService.remove', () => {
  let expensesRepo: ExpensesRepository;
  let expenseSplitsRepo: ExpenseSplitsRepository;
  let groupsRepo: GroupsRepository;
  let activityLogRepo: ActivityLogRepository;
  let service: ExpensesService;
  let groupId: string;

  beforeEach(async () => {
    const db = createTestDatabase();
    expensesRepo = createExpensesRepository(db);
    expenseSplitsRepo = createExpenseSplitsRepository(db);
    groupsRepo = createGroupsRepository(db);
    activityLogRepo = createActivityLogRepository(db);
    service = createExpensesService(expensesRepo, expenseSplitsRepo, activityLogRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('soft-deletes the expense and logs a DELETED activity entry', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    await service.remove(expense.id);

    expect((await expensesRepo.getById(expense.id))?.isDeleted).toBe(true);
    expect(await expensesRepo.getByGroup(groupId)).toEqual([]);

    const entries = await activityLogRepo.getByGroup(groupId);
    expect(entries.map((e) => e.action)).toEqual(['DELETED', 'CREATED']);
    expect(entries[0]).toMatchObject({
      entityType: 'EXPENSE',
      entityId: expense.id,
      description: 'Dinner ($90.00)',
      primaryUserId: 'a',
    });
  });

  it('leaves expense_splits rows in place after a delete', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    await service.remove(expense.id);

    expect(await expenseSplitsRepo.getByExpense(expense.id)).toHaveLength(2);
  });

  it('rejects removing an unknown expense', async () => {
    await expect(service.remove('does-not-exist')).rejects.toThrow('Expense not found.');
  });

  it('rejects removing an already-deleted expense', async () => {
    const { expense } = await service.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });
    await service.remove(expense.id);

    await expect(service.remove(expense.id)).rejects.toThrow('Expense not found.');
  });
});
