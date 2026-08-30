import { createActivityLogRepository, type ActivityLogRepository } from '../activityLog.repository';
import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createTestDatabase } from '../testUtils/testDatabase';

describe('activityLogRepository', () => {
  let repo: ActivityLogRepository;
  let groupsRepo: GroupsRepository;
  let groupId: string;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const db = createTestDatabase();
    repo = createActivityLogRepository(db);
    groupsRepo = createGroupsRepository(db);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an entry with _syncStatus "created"', async () => {
    const entry = await repo.create({
      groupId,
      entityType: 'EXPENSE',
      entityId: 'exp-1',
      action: 'CREATED',
      description: 'Dinner ($90.00)',
      primaryUserId: 'a',
    });

    expect(entry.groupId).toBe(groupId);
    expect(entry.entityType).toBe('EXPENSE');
    expect(entry.entityId).toBe('exp-1');
    expect(entry.action).toBe('CREATED');
    expect(entry.description).toBe('Dinner ($90.00)');
    expect(entry.primaryUserId).toBe('a');
    expect(entry.secondaryUserId).toBeNull();
    expect(entry.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(entry.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(entry._syncStatus).toBe('created');
    expect(entry.isDeleted).toBe(false);
  });

  it('defaults primaryUserId/secondaryUserId to null when omitted', async () => {
    const entry = await repo.create({
      groupId,
      entityType: 'SETTLEMENT',
      entityId: 'settle-1',
      action: 'DELETED',
      description: '$25.00',
    });

    expect(entry.primaryUserId).toBeNull();
    expect(entry.secondaryUserId).toBeNull();
  });

  it('lists entries for a group, newest first', async () => {
    await repo.create({ groupId, entityType: 'EXPENSE', entityId: 'exp-1', action: 'CREATED', description: 'First' });
    jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await repo.create({ groupId, entityType: 'EXPENSE', entityId: 'exp-1', action: 'UPDATED', description: 'Second' });

    const entries = await repo.getByGroup(groupId);
    expect(entries.map((e) => e.description)).toEqual(['Second', 'First']);
  });

  it('breaks createdAt ties by insertion order (most recent write first)', async () => {
    // Same millisecond, e.g. a rapid create-then-delete in the app.
    await repo.create({ groupId, entityType: 'SETTLEMENT', entityId: 's-1', action: 'CREATED', description: 'Created' });
    await repo.create({ groupId, entityType: 'SETTLEMENT', entityId: 's-1', action: 'DELETED', description: 'Deleted' });

    const entries = await repo.getByGroup(groupId);
    expect(entries.map((e) => e.action)).toEqual(['DELETED', 'CREATED']);
  });

  it('excludes entries from a different group', async () => {
    const otherGroupId = (await groupsRepo.create({ name: 'Roommates' })).id;
    await repo.create({ groupId: otherGroupId, entityType: 'EXPENSE', entityId: 'exp-1', action: 'CREATED', description: 'Other group' });

    expect(await repo.getByGroup(groupId)).toEqual([]);
  });
});
