import type { GroupsRepository } from '../repositories/groups.repository';
import type { GroupMembersRepository } from '../repositories/groupMembers.repository';
import type { UsersRepository } from '../repositories/users.repository';
import type { ActivityLogRepository } from '../repositories/activityLog.repository';
import type { BalancesService } from './balances.service';
import type { Group } from '../db/types';

export interface CreateGroupWithMembersInput {
  name: string;
  memberUserIds: string[];
}

// Extracted so the screen can surface *why* creation was blocked instead of
// the button silently doing nothing (the bug: a global friends list means a
// friend from a previous group shows up unselected on the next one, and
// forgetting to tap them left selectedUserIds empty with no feedback).
export function validateCreateGroupInput(input: CreateGroupWithMembersInput): string | null {
  if (input.name.trim().length === 0) return 'Give the group a name.';
  if (input.memberUserIds.length === 0) return 'Select at least one member.';
  return null;
}

export function createGroupsService(
  groupsRepo: GroupsRepository,
  groupMembersRepo: GroupMembersRepository,
  balancesService: BalancesService,
  usersRepo: UsersRepository,
  activityLogRepo: ActivityLogRepository
) {
  return {
    async createWithMembers(input: CreateGroupWithMembersInput): Promise<Group> {
      const error = validateCreateGroupInput(input);
      if (error) {
        throw new Error(error);
      }
      const group = await groupsRepo.create({ name: input.name.trim() });
      for (const userId of input.memberUserIds) {
        await groupMembersRepo.add({ groupId: group.id, userId });
      }
      return group;
    },

    // Guards against removing someone mid-debt: expense_splits/settlements
    // reference userId directly, not group_members, so a plain removal would
    // silently orphan their balance — they'd disappear from the member list
    // while still owing (or being owed) money that Balances would keep
    // showing for a userId no longer listed anywhere in the UI. Settle up
    // first, per CLAUDE.md Module 5's raw-balances definition of "owes".
    async removeMember(groupId: string, membershipId: string, userId: string): Promise<void> {
      const debts = await balancesService.getRawGroupBalances(groupId);
      const hasOutstandingBalance = debts.some((d) => d.fromUserId === userId || d.toUserId === userId);
      if (hasOutstandingBalance) {
        throw new Error('This member has an unsettled balance in this group. Settle up before removing them.');
      }

      const user = await usersRepo.getById(userId);
      await groupMembersRepo.remove(membershipId);

      await activityLogRepo.create({
        groupId,
        entityType: 'GROUP_MEMBER',
        entityId: membershipId,
        action: 'DELETED',
        description: `${user?.name ?? 'Unknown'} left the group`,
        primaryUserId: userId,
      });
    },
  };
}

export type GroupsService = ReturnType<typeof createGroupsService>;

let defaultInstance: GroupsService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createGroupsService() directly
// against a non-native AppDatabase without a native runtime.
export function getGroupsService(): GroupsService {
  if (!defaultInstance) {
    const { getGroupsRepository, getGroupMembersRepository, getUsersRepository, getActivityLogRepository } = require('../repositories');
    const { getBalancesService } = require('./balances.service');
    defaultInstance = createGroupsService(
      getGroupsRepository(),
      getGroupMembersRepository(),
      getBalancesService(),
      getUsersRepository(),
      getActivityLogRepository()
    );
  }
  return defaultInstance;
}
