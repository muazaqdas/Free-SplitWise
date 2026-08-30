import {
  createPersonalTransactionsRepository,
  type PersonalTransactionsRepository,
} from '../personalTransactions.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('personalTransactionsRepository', () => {
  let repo: PersonalTransactionsRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo = createPersonalTransactionsRepository(createTestDatabase());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseInput = {
    accountId: 'account-1',
    type: 'expense' as const,
    amount: 25.5,
    category: 'Groceries',
    date: '2026-01-01',
  };

  it('creates a transaction with _syncStatus "created" and note defaulting to null', async () => {
    const tx = await repo.create(baseInput);

    expect(tx.accountId).toBe('account-1');
    expect(tx.amount).toBe(25.5);
    expect(tx.note).toBeNull();
    expect(tx.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(tx.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(tx._syncStatus).toBe('created');
    expect(tx.isDeleted).toBe(false);
  });

  it('stores an explicit note', async () => {
    const tx = await repo.create({ ...baseInput, note: 'weekly shop' });
    expect(tx.note).toBe('weekly shop');
  });

  it('reads a transaction back by id', async () => {
    const created = await repo.create(baseInput);
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists all non-deleted transactions', async () => {
    await repo.create(baseInput);
    await repo.create({ ...baseInput, category: 'Rent', amount: 900 });
    const all = await repo.getAll();
    expect(all).toHaveLength(2);
  });

  it('filters getAll by accountId', async () => {
    await repo.create({ ...baseInput, accountId: 'account-1' });
    await repo.create({ ...baseInput, accountId: 'account-2' });
    const filtered = await repo.getAll({ accountId: 'account-2' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].accountId).toBe('account-2');
  });

  it('excludes soft-deleted transactions from getAll', async () => {
    const tx = await repo.create(baseInput);
    await repo.remove(tx.id);
    expect(await repo.getAll()).toEqual([]);
  });

  it('updates fields, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const created = await repo.create(baseInput);

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { amount: 30, note: 'corrected' });

    expect(updated.amount).toBe(30);
    expect(updated.note).toBe('corrected');
    expect(updated.category).toBe('Groceries');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { amount: 1 })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create(baseInput);

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });
});
