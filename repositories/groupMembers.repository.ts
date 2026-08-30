import type { AppDatabase, GroupMember, User } from '../db/types';
import { generateId } from './shared';

interface GroupMemberRow {
  id: string;
  groupId: string;
  userId: string;
}

interface GroupMemberWithUserRow extends GroupMemberRow {
  name: string;
  monthlyIncome: number | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toGroupMember(row: GroupMemberRow): GroupMember {
  return { id: row.id, groupId: row.groupId, userId: row.userId };
}

function toGroupMemberWithUser(row: GroupMemberWithUserRow): GroupMemberWithUser {
  return {
    id: row.id,
    groupId: row.groupId,
    userId: row.userId,
    user: {
      id: row.userId,
      name: row.name,
      monthlyIncome: row.monthlyIncome,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _syncStatus: row._syncStatus as User['_syncStatus'],
      isDeleted: row.isDeleted === 1,
    },
  };
}

export interface GroupMemberWithUser extends GroupMember {
  user: User;
}

export interface AddGroupMemberInput {
  groupId: string;
  userId: string;
}

export function createGroupMembersRepository(db: AppDatabase) {
  return {
    // Idempotent: group_members has no uniqueness constraint in the schema
    // (CLAUDE.md Section 3), so re-adding an existing member returns the
    // existing membership row instead of creating a duplicate.
    async add(input: AddGroupMemberInput): Promise<GroupMember> {
      const existing = await db.getFirstAsync<GroupMemberRow>(
        `SELECT * FROM group_members WHERE groupId = ? AND userId = ?;`,
        [input.groupId, input.userId]
      );
      if (existing) return toGroupMember(existing);

      const id = generateId();
      await db.runAsync(`INSERT INTO group_members (id, groupId, userId) VALUES (?, ?, ?);`, [
        id,
        input.groupId,
        input.userId,
      ]);
      return { id, groupId: input.groupId, userId: input.userId };
    },

    async getByGroup(groupId: string): Promise<GroupMemberWithUser[]> {
      const rows = await db.getAllAsync<GroupMemberWithUserRow>(
        `SELECT gm.id as id, gm.groupId as groupId, gm.userId as userId,
                u.name as name, u.monthlyIncome as monthlyIncome,
                u.createdAt as createdAt, u.updatedAt as updatedAt,
                u._syncStatus as _syncStatus, u.isDeleted as isDeleted
         FROM group_members gm
         JOIN users u ON u.id = gm.userId
         WHERE gm.groupId = ? AND u.isDeleted = 0
         ORDER BY u.name ASC;`,
        [groupId]
      );
      return rows.map(toGroupMemberWithUser);
    },

    async remove(id: string): Promise<void> {
      // group_members carries no isDeleted column — membership rows are hard
      // deleted (CLAUDE.md's soft-delete rule applies to the sync-tracked
      // tables listed in Section 3; this join table isn't one of them).
      await db.runAsync(`DELETE FROM group_members WHERE id = ?;`, [id]);
    },
  };
}

export type GroupMembersRepository = ReturnType<typeof createGroupMembersRepository>;

let defaultInstance: GroupMembersRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createGroupMembersRepository() directly without a native runtime.
export function getGroupMembersRepository(): GroupMembersRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createGroupMembersRepository(getDatabase());
  }
  return defaultInstance;
}
