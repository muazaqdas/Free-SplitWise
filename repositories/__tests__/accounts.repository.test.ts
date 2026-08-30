import { createAccountsRepository, type AccountsRepository } from '../accounts.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('accountsRepository', () => {
  let repo: AccountsRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo = createAccountsRepository(createTestDatabase());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an account with _syncStatus "created" and a default balance of 0', async () => {
    const account = await repo.create({ name: 'Wallet', type: 'cash' });

    expect(account.balance).toBe(0);
    expect(account.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(account.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(account._syncStatus).toBe('created');
    expect(account.isDeleted).toBe(false);
  });

  it('accepts an explicit starting balance', async () => {
    const account = await repo.create({ name: 'Bank', type: 'bank', balance: 500 });
    expect(account.balance).toBe(500);
  });

  it('reads an account back by id', async () => {
    const created = await repo.create({ name: 'Wallet', type: 'cash' });
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists all non-deleted accounts', async () => {
    await repo.create({ name: 'Wallet', type: 'cash' });
    await repo.create({ name: 'Bank', type: 'bank' });
    const all = await repo.getAll();
    expect(all.map((a) => a.name).sort()).toEqual(['Bank', 'Wallet']);
  });

  it('excludes soft-deleted accounts from getAll', async () => {
    const account = await repo.create({ name: 'Wallet', type: 'cash' });
    await repo.remove(account.id);
    expect(await repo.getAll()).toEqual([]);
  });

  it('updates the balance, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const created = await repo.create({ name: 'Wallet', type: 'cash', balance: 100 });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { balance: 250 });

    expect(updated.balance).toBe(250);
    expect(updated.type).toBe('cash');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { balance: 1 })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create({ name: 'Wallet', type: 'cash' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });
});
