import { createUsersRepository, type UsersRepository } from '../users.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('usersRepository', () => {
  let repo: UsersRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo = createUsersRepository(createTestDatabase());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a user with _syncStatus "created" and matching timestamps', async () => {
    const user = await repo.create({ name: 'Ada', monthlyIncome: 5000 });

    expect(user.id).toEqual(expect.any(String));
    expect(user.name).toBe('Ada');
    expect(user.monthlyIncome).toBe(5000);
    expect(user.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(user.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(user._syncStatus).toBe('created');
    expect(user.isDeleted).toBe(false);
  });

  it('defaults monthlyIncome to null when omitted', async () => {
    const user = await repo.create({ name: 'Grace' });
    expect(user.monthlyIncome).toBeNull();
  });

  it('reads a user back by id', async () => {
    const created = await repo.create({ name: 'Ada' });
    const found = await repo.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists all non-deleted users', async () => {
    await repo.create({ name: 'Ada' });
    await repo.create({ name: 'Grace' });
    const all = await repo.getAll();
    expect(all.map((u) => u.name).sort()).toEqual(['Ada', 'Grace']);
  });

  it('excludes soft-deleted users from getAll', async () => {
    const user = await repo.create({ name: 'Ada' });
    await repo.remove(user.id);
    expect(await repo.getAll()).toEqual([]);
  });

  it('updates fields, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const created = await repo.create({ name: 'Ada', monthlyIncome: 1000 });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { monthlyIncome: 2000 });

    expect(updated.name).toBe('Ada');
    expect(updated.monthlyIncome).toBe(2000);
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');

    const persisted = await repo.getById(created.id);
    expect(persisted).toEqual(updated);
  });

  it('leaves unspecified fields untouched on partial update', async () => {
    const created = await repo.create({ name: 'Ada', monthlyIncome: 1000 });
    const updated = await repo.update(created.id, { name: 'Ada Lovelace' });
    expect(updated.monthlyIncome).toBe(1000);
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { name: 'x' })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create({ name: 'Ada' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });

  it('creates a user with isCurrentUser false by default', async () => {
    const user = await repo.create({ name: 'Ada' });
    expect(user.isCurrentUser).toBe(false);
  });

  it('getCurrent returns null when no user is flagged current', async () => {
    await repo.create({ name: 'Ada' });
    expect(await repo.getCurrent()).toBeNull();
  });

  it('setCurrent flags a user as current and getCurrent returns it', async () => {
    const ada = await repo.create({ name: 'Ada' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.setCurrent(ada.id);

    expect(updated.isCurrentUser).toBe(true);
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');
    expect((await repo.getCurrent())?.id).toBe(ada.id);
  });

  it('setCurrent unsets the previous current user (at most one at a time)', async () => {
    const ada = await repo.create({ name: 'Ada' });
    const grace = await repo.create({ name: 'Grace' });

    await repo.setCurrent(ada.id);
    await repo.setCurrent(grace.id);

    const current = await repo.getCurrent();
    expect(current?.id).toBe(grace.id);
    expect((await repo.getById(ada.id))?.isCurrentUser).toBe(false);
  });

  it('throws when setCurrent targets an unknown id', async () => {
    await expect(repo.setCurrent('does-not-exist')).rejects.toThrow();
  });
});
