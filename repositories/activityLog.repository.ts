import type { ActivityAction, ActivityEntityType, ActivityLogEntry, AppDatabase } from '../db/types';
import { generateId, nowIso } from './shared';

interface ActivityLogRow {
  id: string;
  groupId: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  primaryUserId: string | null;
  secondaryUserId: string | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toActivityLogEntry(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    groupId: row.groupId,
    entityType: row.entityType as ActivityEntityType,
    entityId: row.entityId,
    action: row.action as ActivityAction,
    description: row.description,
    primaryUserId: row.primaryUserId,
    secondaryUserId: row.secondaryUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as ActivityLogEntry['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreateActivityLogInput {
  groupId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description: string;
  primaryUserId?: string | null;
  secondaryUserId?: string | null;
}

export function createActivityLogRepository(db: AppDatabase) {
  return {
    // Entries are append-only — nothing in the app ever edits or removes a
    // past ledger row (unlike every other repository here), so this is the
    // only repository with just create + a chronological read.
    async create(input: CreateActivityLogInput): Promise<ActivityLogEntry> {
      const id = generateId();
      const timestamp = nowIso();
      const primaryUserId = input.primaryUserId ?? null;
      const secondaryUserId = input.secondaryUserId ?? null;
      await db.runAsync(
        `INSERT INTO activity_log
          (id, groupId, entityType, entityId, action, description, primaryUserId, secondaryUserId, createdAt, updatedAt, _syncStatus, isDeleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          id,
          input.groupId,
          input.entityType,
          input.entityId,
          input.action,
          input.description,
          primaryUserId,
          secondaryUserId,
          timestamp,
          timestamp,
          'created',
        ]
      );
      return {
        id,
        groupId: input.groupId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        description: input.description,
        primaryUserId,
        secondaryUserId,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    // Newest first, matching the settlement history / expense list convention
    // (CLAUDE.md Module 5/7 screens) rather than strict oldest-to-newest.
    // Tie-broken by rowid (insertion order) since two events (e.g. a create
    // immediately followed by a delete) can land in the same millisecond,
    // where createdAt alone can't distinguish which happened first.
    async getByGroup(groupId: string): Promise<ActivityLogEntry[]> {
      const rows = await db.getAllAsync<ActivityLogRow>(
        `SELECT * FROM activity_log WHERE groupId = ? AND isDeleted = 0 ORDER BY createdAt DESC, rowid DESC;`,
        [groupId]
      );
      return rows.map(toActivityLogEntry);
    },
  };
}

export type ActivityLogRepository = ReturnType<typeof createActivityLogRepository>;

let defaultInstance: ActivityLogRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createActivityLogRepository() directly without a native runtime.
export function getActivityLogRepository(): ActivityLogRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createActivityLogRepository(getDatabase());
  }
  return defaultInstance;
}
