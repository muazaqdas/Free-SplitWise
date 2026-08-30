import type { SettlementsRepository, CreateSettlementInput } from '../repositories/settlements.repository';
import type { ActivityLogRepository } from '../repositories/activityLog.repository';
import type { Settlement } from '../db/types';

export type CreateSettlementServiceInput = CreateSettlementInput;

function settlementSummary(settlement: Settlement): string {
  return `$${settlement.amount.toFixed(2)}`;
}

export function createSettlementsService(settlementsRepo: SettlementsRepository, activityLogRepo: ActivityLogRepository) {
  return {
    async create(input: CreateSettlementServiceInput): Promise<Settlement> {
      if (!(input.amount > 0)) {
        throw new Error('Enter an amount greater than 0.');
      }
      if (input.fromUserId === input.toUserId) {
        throw new Error('Choose two different people.');
      }
      const settlement = await settlementsRepo.create(input);

      await activityLogRepo.create({
        groupId: settlement.groupId,
        entityType: 'SETTLEMENT',
        entityId: settlement.id,
        action: 'CREATED',
        description: settlementSummary(settlement),
        primaryUserId: settlement.fromUserId,
        secondaryUserId: settlement.toUserId,
      });

      return settlement;
    },

    // Soft-deletes the settlement (CLAUDE.md's never-hard-delete rule) and
    // logs it — recorded payments can be entered in error and need undoing.
    async remove(id: string): Promise<void> {
      const existing = await settlementsRepo.getById(id);
      if (!existing || existing.isDeleted) {
        throw new Error('Settlement not found.');
      }
      await settlementsRepo.remove(id);

      await activityLogRepo.create({
        groupId: existing.groupId,
        entityType: 'SETTLEMENT',
        entityId: existing.id,
        action: 'DELETED',
        description: settlementSummary(existing),
        primaryUserId: existing.fromUserId,
        secondaryUserId: existing.toUserId,
      });
    },

    // Chronological settlement history for a group — Module 7's "minimal
    // settlement history" stand-in for Module 9's full activity ledger.
    async getHistory(groupId: string): Promise<Settlement[]> {
      return settlementsRepo.getByGroup(groupId);
    },
  };
}

export type SettlementsService = ReturnType<typeof createSettlementsService>;

let defaultInstance: SettlementsService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createSettlementsService() directly
// against a non-native AppDatabase without a native runtime.
export function getSettlementsService(): SettlementsService {
  if (!defaultInstance) {
    const { getSettlementsRepository, getActivityLogRepository } = require('../repositories');
    defaultInstance = createSettlementsService(getSettlementsRepository(), getActivityLogRepository());
  }
  return defaultInstance;
}
