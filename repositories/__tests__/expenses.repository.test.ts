import { createExpensesRepository, type ExpensesRepository } from '../expenses.repository';
import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createTestDatabase } from '../testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

describe('expensesRepository', () => {
  let db: AppDatabase;
  let repo: ExpensesRepository;
  let groupsRepo: GroupsRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    db = createTestDatabase();
    repo = createExpensesRepository(db);
    groupsRepo = createGroupsRepository(db);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an expense with _syncStatus "created" and isDeleted false', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await repo.create({
      groupId: group.id,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });

    expect(expense.description).toBe('Dinner');
    expect(expense.totalAmount).toBe(90);
    expect(expense.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(expense.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(expense._syncStatus).toBe('created');
    expect(expense.isDeleted).toBe(false);
    expect(expense.rationMetric).toBeNull();
  });

  it('reads an expense back by id', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const created = await repo.create({
      groupId: group.id,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists expenses for a group, newest date first, excluding other groups', async () => {
    const groupA = await groupsRepo.create({ name: 'Trip' });
    const groupB = await groupsRepo.create({ name: 'Roommates' });
    await repo.create({
      groupId: groupA.id,
      description: 'Breakfast',
      totalAmount: 10,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });
    await repo.create({
      groupId: groupA.id,
      description: 'Dinner',
      totalAmount: 20,
      currency: 'USD',
      date: '2026-01-02',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });
    await repo.create({
      groupId: groupB.id,
      description: 'Rent',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Housing',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });

    const expenses = await repo.getByGroup(groupA.id);
    expect(expenses.map((e) => e.description)).toEqual(['Dinner', 'Breakfast']);
  });

  it('excludes soft-deleted expenses from getByGroup', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const expense = await repo.create({
      groupId: group.id,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });
    await repo.remove(expense.id);
    expect(await repo.getByGroup(group.id)).toEqual([]);
  });

  it('updates fields, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const created = await repo.create({
      groupId: group.id,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { totalAmount: 120, description: 'Dinner (updated)' });

    expect(updated.totalAmount).toBe(120);
    expect(updated.description).toBe('Dinner (updated)');
    expect(updated.category).toBe('Food');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');
    expect(updated.groupId).toBe(group.id);
    expect(updated.createdBy).toBe('user-1');
  });

  it('clears rationMetric when explicitly updated to null', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const created = await repo.create({
      groupId: group.id,
      description: 'Groceries',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'RATION',
      rationMetric: 'Meals Eaten',
      createdBy: 'user-1',
    });

    const updated = await repo.update(created.id, { splitType: 'EQUAL', rationMetric: null });
    expect(updated.splitType).toBe('EQUAL');
    expect(updated.rationMetric).toBeNull();
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { totalAmount: 1 })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const group = await groupsRepo.create({ name: 'Trip' });
    const created = await repo.create({
      groupId: group.id,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      splitType: 'EQUAL',
      createdBy: 'user-1',
    });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });
});
