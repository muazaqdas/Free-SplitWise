import type { AppDatabase, Group } from '../db/types';
import { generateId, nowIso } from './shared';

interface GroupRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  _syncStatus: string;
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted === 1,
    _syncStatus: row._syncStatus as Group['_syncStatus'],
  };
}

export interface CreateGroupInput {
  name: string;
}

export interface UpdateGroupInput {
  name?: string;
}

export function createGroupsRepository(db: AppDatabase) {
  return {
    async create(input: CreateGroupInput): Promise<Group> {
      const id = generateId();
      const timestamp = nowIso();
      await db.runAsync(
        `INSERT INTO groups (id, name, createdAt, updatedAt, isDeleted, _syncStatus) VALUES (?, ?, ?, ?, 0, ?);`,
        [id, input.name, timestamp, timestamp, 'created']
      );
      return {
        id,
        name: input.name,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        _syncStatus: 'created',
      };
    },

    async getById(id: string): Promise<Group | null> {
      const row = await db.getFirstAsync<GroupRow>(`SELECT * FROM groups WHERE id = ?;`, [id]);
      return row ? toGroup(row) : null;
    },

    async getAll(): Promise<Group[]> {
      const rows = await db.getAllAsync<GroupRow>(`SELECT * FROM groups WHERE isDeleted = 0 ORDER BY createdAt ASC;`);
      return rows.map(toGroup);
    },

    async update(id: string, updates: UpdateGroupInput): Promise<Group> {
      const existing = await db.getFirstAsync<GroupRow>(`SELECT * FROM groups WHERE id = ?;`, [id]);
      if (!existing) {
        throw new Error(`Group not found: ${id}`);
      }
      const timestamp = nowIso();
      const name = updates.name ?? existing.name;
      await db.runAsync(`UPDATE groups SET name = ?, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        name,
        timestamp,
        'updated',
        id,
      ]);
      return toGroup({ ...existing, name, updatedAt: timestamp, _syncStatus: 'updated' });
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE groups SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type GroupsRepository = ReturnType<typeof createGroupsRepository>;

let defaultInstance: GroupsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createGroupsRepository() directly without a native runtime.
export function getGroupsRepository(): GroupsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createGroupsRepository(getDatabase());
  }
  return defaultInstance;
}
