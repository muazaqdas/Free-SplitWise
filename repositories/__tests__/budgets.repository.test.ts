import { createBudgetsRepository, type BudgetsRepository } from '../budgets.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('budgetsRepository', () => {
  let repo: BudgetsRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo = createBudgetsRepository(createTestDatabase());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a budget with _syncStatus "created"', async () => {
    const budget = await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });

    expect(budget.category).toBe('Groceries');
    expect(budget.monthlyLimit).toBe(400);
    expect(budget.month).toBe('2026-01');
    expect(budget.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(budget.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(budget._syncStatus).toBe('created');
    expect(budget.isDeleted).toBe(false);
  });

  it('reads a budget back by id', async () => {
    const created = await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists all non-deleted budgets', async () => {
    await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });
    await repo.create({ category: 'Transport', monthlyLimit: 100, month: '2026-01' });
    const all = await repo.getAll();
    expect(all).toHaveLength(2);
  });

  it('filters getAll by month', async () => {
    await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });
    await repo.create({ category: 'Groceries', monthlyLimit: 420, month: '2026-02' });
    const filtered = await repo.getAll({ month: '2026-02' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].monthlyLimit).toBe(420);
  });

  it('excludes soft-deleted budgets from getAll', async () => {
    const budget = await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });
    await repo.remove(budget.id);
    expect(await repo.getAll()).toEqual([]);
  });

  it('updates fields, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const created = await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { monthlyLimit: 450 });

    expect(updated.monthlyLimit).toBe(450);
    expect(updated.category).toBe('Groceries');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { monthlyLimit: 1 })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create({ category: 'Groceries', monthlyLimit: 400, month: '2026-01' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });
});
