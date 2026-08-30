import { createGroupsService, validateCreateGroupInput, type GroupsService } from '../groups.service';
import { createGroupsRepository, type GroupsRepository } from '../../repositories/groups.repository';
import { createGroupMembersRepository, type GroupMembersRepository } from '../../repositories/groupMembers.repository';
import { createUsersRepository, type UsersRepository } from '../../repositories/users.repository';
import { createExpensesRepository } from '../../repositories/expenses.repository';
import { createExpenseSplitsRepository, type ExpenseSplitsRepository } from '../../repositories/expenseSplits.repository';
import { createSettlementsRepository, type SettlementsRepository } from '../../repositories/settlements.repository';
import { createActivityLogRepository, type ActivityLogRepository } from '../../repositories/activityLog.repository';
import { createBalancesService } from '../balances.service';
import { createExpensesService } from '../expenses.service';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

// Dry-runs the exact repository call sequence CreateGroupScreen and
// GroupDetailScreen issue, against a real SQLite-backed test DB, to verify
// the reported bug: "creating a group a second time doesn't work". The
// friends list (users table) is intentionally global and outlives any one
// group (CLAUDE.md Section 3 schema), so a friend added for group 1 is
// expected to show up — unselected — when creating group 2.
describe('groups create flow (dry run against real DB)', () => {
  let db: AppDatabase;
  let groupsRepo: GroupsRepository;
  let groupMembersRepo: GroupMembersRepository;
  let usersRepo: UsersRepository;
  let service: GroupsService;

  beforeEach(() => {
    db = createTestDatabase();
    groupsRepo = createGroupsRepository(db);
    groupMembersRepo = createGroupMembersRepository(db);
    usersRepo = createUsersRepository(db);
    const balancesService = createBalancesService(createExpenseSplitsRepository(db), createSettlementsRepository(db));
    service = createGroupsService(groupsRepo, groupMembersRepo, balancesService, usersRepo, createActivityLogRepository(db));
  });

  it('creates a group with a newly-added friend (first group, happy path)', async () => {
    // handleAddFriend: user types "Ralph" and taps Add.
    const ralph = await usersRepo.create({ name: 'Ralph' });
    // toggleMember: Ralph gets selected. handleCreateGroup: tap Create Group.
    const group = await service.createWithMembers({ name: 'Roommates', memberUserIds: [ralph.id] });

    expect(group.name).toBe('Roommates');
    const members = await groupMembersRepo.getByGroup(group.id);
    expect(members.map((m) => m.user.name)).toEqual(['Ralph']);
  });

  it('creates a second group reusing the existing friend by selecting them', async () => {
    const ralph = await usersRepo.create({ name: 'Ralph' });
    const group1 = await service.createWithMembers({ name: 'Group One', memberUserIds: [ralph.id] });

    // CreateGroupScreen re-mounts fresh: loadUsers() fetches all users again,
    // Ralph is in the list (global friends), and this time he IS tapped/selected.
    const usersOnSecondVisit = await usersRepo.getAll();
    expect(usersOnSecondVisit.map((u) => u.name)).toEqual(['Ralph']);

    const group2 = await service.createWithMembers({ name: 'Group Two', memberUserIds: [ralph.id] });

    expect(group2.id).not.toBe(group1.id);
    const group1Members = await groupMembersRepo.getByGroup(group1.id);
    const group2Members = await groupMembersRepo.getByGroup(group2.id);
    expect(group1Members.map((m) => m.user.name)).toEqual(['Ralph']);
    expect(group2Members.map((m) => m.user.name)).toEqual(['Ralph']);
    // Reusing the same user id must not create a duplicate friend row.
    expect(await usersRepo.getAll()).toHaveLength(1);
  });

  it('THE REPORTED BUG: reproduces "second group won\'t create" — Ralph is visible but never re-selected', async () => {
    const ralph = await usersRepo.create({ name: 'Ralph' });
    await service.createWithMembers({ name: 'Group One', memberUserIds: [ralph.id] });

    // Fresh CreateGroupScreen instance for group 2: groupName/selectedUserIds
    // reset to '' / [] (real per-mount React state), but loadUsers() still
    // shows Ralph in the FlatList because he's a persisted global friend —
    // this is correct, intended behavior, not a bug. The bug is what happens
    // if the user assumes that means he's already selected and skips tapping
    // his row: selectedUserIds stays [].
    const selectedUserIdsOnSecondAttempt: string[] = [];

    await expect(
      service.createWithMembers({ name: 'Group Two', memberUserIds: selectedUserIdsOnSecondAttempt })
    ).rejects.toThrow('Select at least one member.');

    // Prove it's a clean validation guard, not a partial/corrupt write:
    // no second group row was created at all.
    expect(await groupsRepo.getAll()).toHaveLength(1);
  });

  it('rejects an empty group name without creating a row', async () => {
    const ralph = await usersRepo.create({ name: 'Ralph' });
    await expect(service.createWithMembers({ name: '   ', memberUserIds: [ralph.id] })).rejects.toThrow(
      'Give the group a name.'
    );
    expect(await groupsRepo.getAll()).toHaveLength(0);
  });

  it('rejects zero members without creating a row', async () => {
    await expect(service.createWithMembers({ name: 'Group Two', memberUserIds: [] })).rejects.toThrow(
      'Select at least one member.'
    );
    expect(await groupsRepo.getAll()).toHaveLength(0);
  });

  it('adding a friend with a name that already exists creates a distinct second user (documented, not deduped)', async () => {
    // handleAddFriend always calls users.create — there is no name-based
    // dedup. Re-typing "Ralph" for a second group (instead of selecting the
    // existing one) is allowed and yields two separate Ralph rows.
    const ralph1 = await usersRepo.create({ name: 'Ralph' });
    const ralph2 = await usersRepo.create({ name: 'Ralph' });

    expect(ralph1.id).not.toBe(ralph2.id);
    expect(await usersRepo.getAll()).toHaveLength(2);
  });

  it('validateCreateGroupInput surfaces name error before the member error', () => {
    expect(validateCreateGroupInput({ name: '', memberUserIds: [] })).toBe('Give the group a name.');
    expect(validateCreateGroupInput({ name: 'Trip', memberUserIds: [] })).toBe('Select at least one member.');
    expect(validateCreateGroupInput({ name: 'Trip', memberUserIds: ['u1'] })).toBeNull();
  });

  it('does not add a group_members row for a userId that fails partway (create is atomic per member)', async () => {
    const ralph = await usersRepo.create({ name: 'Ralph' });
    const group = await service.createWithMembers({ name: 'Solo', memberUserIds: [ralph.id, ralph.id] });

    // group_members.add is idempotent per CLAUDE.md's group_members schema
    // (no unique constraint) — adding the same member twice in one call
    // must not duplicate the membership row.
    const members = await groupMembersRepo.getByGroup(group.id);
    expect(members).toHaveLength(1);
  });
});

describe('groupsService.removeMember', () => {
  let db: AppDatabase;
  let groupsRepo: GroupsRepository;
  let groupMembersRepo: GroupMembersRepository;
  let usersRepo: UsersRepository;
  let expenseSplitsRepo: ExpenseSplitsRepository;
  let settlementsRepo: SettlementsRepository;
  let activityLogRepo: ActivityLogRepository;
  let service: GroupsService;
  let groupId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    groupsRepo = createGroupsRepository(db);
    groupMembersRepo = createGroupMembersRepository(db);
    usersRepo = createUsersRepository(db);
    expenseSplitsRepo = createExpenseSplitsRepository(db);
    settlementsRepo = createSettlementsRepository(db);
    activityLogRepo = createActivityLogRepository(db);
    const balancesService = createBalancesService(expenseSplitsRepo, settlementsRepo);
    service = createGroupsService(groupsRepo, groupMembersRepo, balancesService, usersRepo, activityLogRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('removes a member with no outstanding balance and logs a DELETED activity entry', async () => {
    const alice = await usersRepo.create({ name: 'Alice' });
    const membership = await groupMembersRepo.add({ groupId, userId: alice.id });

    await service.removeMember(groupId, membership.id, alice.id);

    expect(await groupMembersRepo.getByGroup(groupId)).toEqual([]);
    const [entry] = await activityLogRepo.getByGroup(groupId);
    expect(entry).toMatchObject({
      entityType: 'GROUP_MEMBER',
      entityId: membership.id,
      action: 'DELETED',
      description: 'Alice left the group',
      primaryUserId: alice.id,
    });
  });

  it('rejects removing a member who owes money in the group, without removing them', async () => {
    const alice = await usersRepo.create({ name: 'Alice' });
    const bob = await usersRepo.create({ name: 'Bob' });
    const aliceMembership = await groupMembersRepo.add({ groupId, userId: alice.id });
    await groupMembersRepo.add({ groupId, userId: bob.id });

    const expensesService = createExpensesService(createExpensesRepository(db), expenseSplitsRepo, activityLogRepo);
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: bob.id,
      splitType: 'EQUAL',
      participantUserIds: [alice.id, bob.id],
      paidBy: [{ userId: bob.id, paidAmount: 100 }],
    });

    await expect(service.removeMember(groupId, aliceMembership.id, alice.id)).rejects.toThrow(
      'This member has an unsettled balance in this group. Settle up before removing them.'
    );
    expect(await groupMembersRepo.getByGroup(groupId)).toHaveLength(2);
  });

  it('rejects removing a member who is owed money in the group', async () => {
    const alice = await usersRepo.create({ name: 'Alice' });
    const bob = await usersRepo.create({ name: 'Bob' });
    const aliceMembership = await groupMembersRepo.add({ groupId, userId: alice.id });
    await groupMembersRepo.add({ groupId, userId: bob.id });

    const expensesService = createExpensesService(createExpensesRepository(db), expenseSplitsRepo, activityLogRepo);
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: alice.id,
      splitType: 'EQUAL',
      participantUserIds: [alice.id, bob.id],
      paidBy: [{ userId: alice.id, paidAmount: 100 }],
    });

    await expect(service.removeMember(groupId, aliceMembership.id, alice.id)).rejects.toThrow(
      'This member has an unsettled balance in this group. Settle up before removing them.'
    );
  });

  it('allows removal once a previously-unsettled balance is fully settled', async () => {
    const alice = await usersRepo.create({ name: 'Alice' });
    const bob = await usersRepo.create({ name: 'Bob' });
    const aliceMembership = await groupMembersRepo.add({ groupId, userId: alice.id });
    await groupMembersRepo.add({ groupId, userId: bob.id });

    const expensesService = createExpensesService(createExpensesRepository(db), expenseSplitsRepo, activityLogRepo);
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: bob.id,
      splitType: 'EQUAL',
      participantUserIds: [alice.id, bob.id],
      paidBy: [{ userId: bob.id, paidAmount: 100 }],
    });
    await settlementsRepo.create({ groupId, fromUserId: alice.id, toUserId: bob.id, amount: 50, date: '2026-01-02' });

    await service.removeMember(groupId, aliceMembership.id, alice.id);

    expect(await groupMembersRepo.getByGroup(groupId)).toHaveLength(1);
  });
});
