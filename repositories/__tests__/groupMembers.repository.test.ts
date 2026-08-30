import { createGroupMembersRepository, type GroupMembersRepository } from '../groupMembers.repository';
import { createGroupsRepository, type GroupsRepository } from '../groups.repository';
import { createUsersRepository, type UsersRepository } from '../users.repository';
import { createTestDatabase } from '../testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

describe('groupMembersRepository', () => {
  let db: AppDatabase;
  let repo: GroupMembersRepository;
  let usersRepo: UsersRepository;
  let groupsRepo: GroupsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = createGroupMembersRepository(db);
    usersRepo = createUsersRepository(db);
    groupsRepo = createGroupsRepository(db);
  });

  it('adds a member to a group', async () => {
    const group = await groupsRepo.create({ name: 'Roommates' });
    const user = await usersRepo.create({ name: 'Ada' });

    const membership = await repo.add({ groupId: group.id, userId: user.id });

    expect(membership.id).toEqual(expect.any(String));
    expect(membership.groupId).toBe(group.id);
    expect(membership.userId).toBe(user.id);
  });

  it('is idempotent: adding the same user twice does not duplicate the membership', async () => {
    const group = await groupsRepo.create({ name: 'Roommates' });
    const user = await usersRepo.create({ name: 'Ada' });

    const first = await repo.add({ groupId: group.id, userId: user.id });
    const second = await repo.add({ groupId: group.id, userId: user.id });

    expect(second.id).toBe(first.id);
    expect(await repo.getByGroup(group.id)).toHaveLength(1);
  });

  it('lists members of a group joined with their user info', async () => {
    const group = await groupsRepo.create({ name: 'Roommates' });
    const ada = await usersRepo.create({ name: 'Ada', monthlyIncome: 5000 });
    const grace = await usersRepo.create({ name: 'Grace' });
    await repo.add({ groupId: group.id, userId: ada.id });
    await repo.add({ groupId: group.id, userId: grace.id });

    const members = await repo.getByGroup(group.id);

    expect(members.map((m) => m.user.name).sort()).toEqual(['Ada', 'Grace']);
    const adaMembership = members.find((m) => m.userId === ada.id);
    expect(adaMembership?.user.monthlyIncome).toBe(5000);
  });

  it('excludes members whose user was soft-deleted', async () => {
    const group = await groupsRepo.create({ name: 'Roommates' });
    const user = await usersRepo.create({ name: 'Ada' });
    await repo.add({ groupId: group.id, userId: user.id });
    await usersRepo.remove(user.id);

    expect(await repo.getByGroup(group.id)).toEqual([]);
  });

  it('does not return members belonging to a different group', async () => {
    const groupA = await groupsRepo.create({ name: 'Roommates' });
    const groupB = await groupsRepo.create({ name: 'Trip' });
    const user = await usersRepo.create({ name: 'Ada' });
    await repo.add({ groupId: groupA.id, userId: user.id });

    expect(await repo.getByGroup(groupB.id)).toEqual([]);
  });

  it('removes a membership by its id', async () => {
    const group = await groupsRepo.create({ name: 'Roommates' });
    const user = await usersRepo.create({ name: 'Ada' });
    const membership = await repo.add({ groupId: group.id, userId: user.id });

    await repo.remove(membership.id);

    expect(await repo.getByGroup(group.id)).toEqual([]);
  });
});
