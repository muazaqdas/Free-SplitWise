import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('groupsRepository', () => {
  let repo: GroupsRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo = createGroupsRepository(createTestDatabase());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a group with _syncStatus "created" and matching timestamps', async () => {
    const group = await repo.create({ name: 'Roommates' });

    expect(group.id).toEqual(expect.any(String));
    expect(group.name).toBe('Roommates');
    expect(group.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(group.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(group._syncStatus).toBe('created');
    expect(group.isDeleted).toBe(false);
  });

  it('reads a group back by id', async () => {
    const created = await repo.create({ name: 'Roommates' });
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists all non-deleted groups', async () => {
    await repo.create({ name: 'Roommates' });
    await repo.create({ name: 'Trip to Goa' });
    const all = await repo.getAll();
    expect(all.map((g) => g.name).sort()).toEqual(['Roommates', 'Trip to Goa']);
  });

  it('excludes soft-deleted groups from getAll', async () => {
    const group = await repo.create({ name: 'Roommates' });
    await repo.remove(group.id);
    expect(await repo.getAll()).toEqual([]);
  });

  it('updates the name, bumps updatedAt, and sets _syncStatus to "updated"', async () => {
    const created = await repo.create({ name: 'Roommates' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = await repo.update(created.id, { name: 'Flatmates' });

    expect(updated.name).toBe('Flatmates');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(updated._syncStatus).toBe('updated');

    const persisted = await repo.getById(created.id);
    expect(persisted).toEqual(updated);
  });

  it('throws when updating an unknown id', async () => {
    await expect(repo.update('does-not-exist', { name: 'x' })).rejects.toThrow();
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create({ name: 'Roommates' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
  });
});
