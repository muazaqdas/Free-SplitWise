import type { AccountsRepository } from '../repositories/accounts.repository';
import type {
  CreatePersonalTransactionInput,
  PersonalTransactionsRepository,
  UpdatePersonalTransactionInput,
} from '../repositories/personalTransactions.repository';
import type { PersonalTransaction } from '../db/types';

// expense/transfer amounts are entered as positive numbers and subtracted;
// income amounts are entered as positive numbers and added. This keeps the
// "amount" field in the add/edit transaction form always non-negative.
function signedAmount(type: PersonalTransaction['type'], amount: number): number {
  return type === 'income' ? amount : -amount;
}

// accounts.balance (per CLAUDE.md Section 3) starts from whatever opening
// balance the account was created with, then every transaction nudges it by
// a signed delta — never recomputed from a full transaction sum, since that
// would discard the opening balance the account isn't a transaction for.
async function applyBalanceDelta(
  accountId: string,
  delta: number,
  accountsRepo: AccountsRepository
): Promise<void> {
  if (delta === 0) return;
  const account = await accountsRepo.getById(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  await accountsRepo.update(accountId, { balance: account.balance + delta });
}

export function createPersonalTransactionsService(
  transactionsRepo: PersonalTransactionsRepository,
  accountsRepo: AccountsRepository
) {
  return {
    async create(input: CreatePersonalTransactionInput): Promise<PersonalTransaction> {
      const transaction = await transactionsRepo.create(input);
      await applyBalanceDelta(transaction.accountId, signedAmount(transaction.type, transaction.amount), accountsRepo);
      return transaction;
    },

    async update(id: string, updates: UpdatePersonalTransactionInput): Promise<PersonalTransaction> {
      const existing = await transactionsRepo.getById(id);
      if (!existing) {
        throw new Error(`Personal transaction not found: ${id}`);
      }
      const updated = await transactionsRepo.update(id, updates);

      // Undo the old transaction's effect on its (old) account, then apply
      // the new transaction's effect on its (possibly different) account.
      await applyBalanceDelta(existing.accountId, -signedAmount(existing.type, existing.amount), accountsRepo);
      await applyBalanceDelta(updated.accountId, signedAmount(updated.type, updated.amount), accountsRepo);

      return updated;
    },

    async remove(id: string): Promise<void> {
      const existing = await transactionsRepo.getById(id);
      if (!existing) {
        throw new Error(`Personal transaction not found: ${id}`);
      }
      await transactionsRepo.remove(id);
      await applyBalanceDelta(existing.accountId, -signedAmount(existing.type, existing.amount), accountsRepo);
    },
  };
}

export type PersonalTransactionsService = ReturnType<typeof createPersonalTransactionsService>;

let defaultInstance: PersonalTransactionsService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createPersonalTransactionsService()
// directly against a non-native AppDatabase without a native runtime.
export function getPersonalTransactionsService(): PersonalTransactionsService {
  if (!defaultInstance) {
    const { getPersonalTransactionsRepository, getAccountsRepository } = require('../repositories');
    defaultInstance = createPersonalTransactionsService(
      getPersonalTransactionsRepository(),
      getAccountsRepository()
    );
  }
  return defaultInstance;
}
