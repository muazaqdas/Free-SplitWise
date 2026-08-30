import { createSettlementsService, type SettlementsService } from '../settlements.service';
import { createSettlementsRepository, type SettlementsRepository } from '../../repositories/settlements.repository';
import { createGroupsRepository, type GroupsRepository } from '../../repositories/groups.repository';
import { createActivityLogRepository, type ActivityLogRepository } from '../../repositories/activityLog.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';

describe('settlementsService', () => {
  let settlementsRepo: SettlementsRepository;
  let groupsRepo: GroupsRepository;
  let activityLogRepo: ActivityLogRepository;
  let service: SettlementsService;
  let groupId: string;

  beforeEach(async () => {
    const db = createTestDatabase();
    settlementsRepo = createSettlementsRepository(db);
    groupsRepo = createGroupsRepository(db);
    activityLogRepo = createActivityLogRepository(db);
    service = createSettlementsService(settlementsRepo, activityLogRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('creates a settlement for two different users with a positive amount', async () => {
    const settlement = await service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 25, date: '2026-01-01' });
    expect(settlement.fromUserId).toBe('a');
    expect(settlement.toUserId).toBe('b');
    expect(settlement.amount).toBe(25);
  });

  it('rejects a zero or negative amount', async () => {
    await expect(service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 0, date: '2026-01-01' })).rejects.toThrow(
      'Enter an amount greater than 0.'
    );
    await expect(
      service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: -10, date: '2026-01-01' })
    ).rejects.toThrow('Enter an amount greater than 0.');
  });

  it('rejects settling a payment with oneself', async () => {
    await expect(service.create({ groupId, fromUserId: 'a', toUserId: 'a', amount: 25, date: '2026-01-01' })).rejects.toThrow(
      'Choose two different people.'
    );
  });

  it('returns settlement history for a group, newest first', async () => {
    await service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 10, date: '2026-01-01' });
    await service.create({ groupId, fromUserId: 'b', toUserId: 'a', amount: 20, date: '2026-01-02' });

    const history = await service.getHistory(groupId);
    expect(history.map((s) => s.amount)).toEqual([20, 10]);
  });

  it('logs a CREATED activity entry when a settlement is recorded', async () => {
    const settlement = await service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 25, date: '2026-01-01' });

    const [entry] = await activityLogRepo.getByGroup(groupId);
    expect(entry).toMatchObject({
      entityType: 'SETTLEMENT',
      entityId: settlement.id,
      action: 'CREATED',
      description: '$25.00',
      primaryUserId: 'a',
      secondaryUserId: 'b',
    });
  });

  it('does not log anything when settlement creation is rejected', async () => {
    await expect(
      service.create({ groupId, fromUserId: 'a', toUserId: 'a', amount: 25, date: '2026-01-01' })
    ).rejects.toThrow();
    expect(await activityLogRepo.getByGroup(groupId)).toEqual([]);
  });

  it('removes a settlement and logs a DELETED activity entry', async () => {
    const settlement = await service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 25, date: '2026-01-01' });

    await service.remove(settlement.id);

    expect(await settlementsRepo.getById(settlement.id)).toMatchObject({ isDeleted: true });
    expect(await service.getHistory(groupId)).toEqual([]);

    const entries = await activityLogRepo.getByGroup(groupId);
    expect(entries.map((e) => e.action)).toEqual(['DELETED', 'CREATED']);
    expect(entries[0]).toMatchObject({
      entityType: 'SETTLEMENT',
      entityId: settlement.id,
      description: '$25.00',
      primaryUserId: 'a',
      secondaryUserId: 'b',
    });
  });

  it('rejects removing an unknown settlement', async () => {
    await expect(service.remove('does-not-exist')).rejects.toThrow('Settlement not found.');
  });

  it('rejects removing an already-removed settlement', async () => {
    const settlement = await service.create({ groupId, fromUserId: 'a', toUserId: 'b', amount: 25, date: '2026-01-01' });
    await service.remove(settlement.id);

    await expect(service.remove(settlement.id)).rejects.toThrow('Settlement not found.');
  });
});
