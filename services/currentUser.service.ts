import type { UsersRepository } from '../repositories/users.repository';
import type { User } from '../db/types';

export interface SaveCurrentUserProfileInput {
  userId?: string;
  name: string;
  monthlyIncome?: number | null;
}

export function createCurrentUserService(usersRepo: UsersRepository) {
  return {
    async getCurrentUser(): Promise<User | null> {
      return usersRepo.getCurrent();
    },

    // No userId → first-time setup: create the row and flag it current.
    // With a userId → editing the existing "me" row in place.
    async saveCurrentUserProfile(input: SaveCurrentUserProfileInput): Promise<User> {
      const trimmed = input.name.trim();
      if (trimmed.length === 0) {
        throw new Error('Give yourself a name.');
      }

      if (input.userId) {
        return usersRepo.update(input.userId, { name: trimmed, monthlyIncome: input.monthlyIncome });
      }

      const user = await usersRepo.create({ name: trimmed, monthlyIncome: input.monthlyIncome });
      return usersRepo.setCurrent(user.id);
    },
  };
}

export type CurrentUserService = ReturnType<typeof createCurrentUserService>;

let defaultInstance: CurrentUserService | null = null;

// Deferred require: importing '../repositories' pulls in '../db', which loads
// expo-sqlite's native binding at module-eval time — only available on-device.
// Deferring it here lets tests construct createCurrentUserService() directly
// against a non-native AppDatabase without a native runtime.
export function getCurrentUserService(): CurrentUserService {
  if (!defaultInstance) {
    const { getUsersRepository } = require('../repositories');
    defaultInstance = createCurrentUserService(getUsersRepository());
  }
  return defaultInstance;
}
