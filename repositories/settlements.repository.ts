import type { AppDatabase, Settlement } from '../db/types';
import { generateId, nowIso } from './shared';

interface SettlementRow {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: string;
  isDeleted: number;
}

function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    groupId: row.groupId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    amount: row.amount,
    date: row.date,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _syncStatus: row._syncStatus as Settlement['_syncStatus'],
    isDeleted: row.isDeleted === 1,
  };
}

export interface CreateSettlementInput {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: string;
  note?: string | null;
}

export function createSettlementsRepository(db: AppDatabase) {
  return {
    async create(input: CreateSettlementInput): Promise<Settlement> {
      const id = generateId();
      const timestamp = nowIso();
      const note = input.note ?? null;
      await db.runAsync(
        `INSERT INTO settlements
          (id, groupId, fromUserId, toUserId, amount, date, note, createdAt, updatedAt, _syncStatus, isDeleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [id, input.groupId, input.fromUserId, input.toUserId, input.amount, input.date, note, timestamp, timestamp, 'created']
      );
      return {
        id,
        groupId: input.groupId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amount: input.amount,
        date: input.date,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: 'created',
        isDeleted: false,
      };
    },

    async getById(id: string): Promise<Settlement | null> {
      const row = await db.getFirstAsync<SettlementRow>(`SELECT * FROM settlements WHERE id = ?;`, [id]);
      return row ? toSettlement(row) : null;
    },

    // Chronological history for a group — newest first, per Module 7's
    // "minimal settlement history" UI.
    async getByGroup(groupId: string): Promise<Settlement[]> {
      const rows = await db.getAllAsync<SettlementRow>(
        `SELECT * FROM settlements WHERE groupId = ? AND isDeleted = 0 ORDER BY date DESC, createdAt DESC;`,
        [groupId]
      );
      return rows.map(toSettlement);
    },

    async remove(id: string): Promise<void> {
      const timestamp = nowIso();
      await db.runAsync(`UPDATE settlements SET isDeleted = 1, updatedAt = ?, _syncStatus = ? WHERE id = ?;`, [
        timestamp,
        'updated',
        id,
      ]);
    },
  };
}

export type SettlementsRepository = ReturnType<typeof createSettlementsRepository>;

let defaultInstance: SettlementsRepository | null = null;

// Deferred require: importing '../db' loads expo-sqlite's native binding at
// module-eval time, which only exists on-device. Deferring it here means
// tests can import createSettlementsRepository() directly without a native runtime.
export function getSettlementsRepository(): SettlementsRepository {
  if (!defaultInstance) {
    const { getDatabase } = require('../db');
    defaultInstance = createSettlementsRepository(getDatabase());
  }
  return defaultInstance;
}
