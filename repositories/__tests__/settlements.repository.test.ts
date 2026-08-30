import { createSettlementsRepository, type SettlementsRepository } from '../settlements.repository';
import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('settlementsRepository', () => {
  let repo: SettlementsRepository;
  let groupsRepo: GroupsRepository;
  let groupId: string;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const db = createTestDatabase();
    repo = createSettlementsRepository(db);
    groupsRepo = createGroupsRepository(db);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a settlement with _syncStatus "created"', async () => {
    const settlement = await repo.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 40, date: '2026-01-01' });

    expect(settlement.fromUserId).toBe('a');
    expect(settlement.toUserId).toBe('b');
    expect(settlement.amount).toBe(40);
    expect(settlement.note).toBeNull();
    expect(settlement.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(settlement.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(settlement._syncStatus).toBe('created');
    expect(settlement.isDeleted).toBe(false);
  });

  it('accepts an optional note', async () => {
    const settlement = await repo.create({
      groupId,
      fromUserId: 'a',
      toUserId: 'b',
      amount: 40,
      date: '2026-01-01',
      note: 'Venmo',
    });
    expect(settlement.note).toBe('Venmo');
  });

  it('reads a settlement back by id', async () => {
    const created = await repo.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 40, date: '2026-01-01' });
    expect(await repo.getById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.getById('does-not-exist')).toBeNull();
  });

  it('lists settlements for a group, newest first', async () => {
    await repo.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 10, date: '2026-01-01' });
    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.create({ groupId, fromUserId: 'b', toUserId: 'a', amount: 20, date: '2026-01-02' });

    const history = await repo.getByGroup(groupId);
    expect(history.map((s) => s.amount)).toEqual([20, 10]);
  });

  it('excludes settlements from a different group', async () => {
    const otherGroupId = (await groupsRepo.create({ name: 'Roommates' })).id;
    await repo.create({ groupId: otherGroupId, fromUserId: 'x', toUserId: 'y', amount: 10, date: '2026-01-01' });

    expect(await repo.getByGroup(groupId)).toEqual([]);
  });

  it('soft-deletes: sets isDeleted, bumps updatedAt/_syncStatus, keeps the row', async () => {
    const created = await repo.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 40, date: '2026-01-01' });

    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.remove(created.id);

    const found = await repo.getById(created.id);
    expect(found?.isDeleted).toBe(true);
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(found?._syncStatus).toBe('updated');
    expect(await repo.getByGroup(groupId)).toEqual([]);
  });
});
