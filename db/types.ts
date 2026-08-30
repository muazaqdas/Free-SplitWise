export type SyncStatus = 'created' | 'updated' | 'synced';

// Minimal subset of expo-sqlite's SQLiteDatabase that repositories depend on.
// Kept separate from the concrete expo-sqlite type so tests can inject a
// non-native (e.g. better-sqlite3-backed) implementation of the same shape.
export interface AppDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(source: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: unknown[]): Promise<T | null>;
}

export interface User {
  id: string;
  name: string;
  monthlyIncome: number | null;
  isCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}

export type AccountType = 'cash' | 'bank' | 'wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}

export type PersonalTransactionType = 'expense' | 'income' | 'transfer';

export interface PersonalTransaction {
  id: string;
  accountId: string;
  type: PersonalTransactionType;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  _syncStatus: SyncStatus;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES' | 'RATION' | 'INCOME';

export interface Expense {
  id: string;
  groupId: string | null;
  description: string;
  totalAmount: number;
  currency: string;
  date: string;
  category: string;
  splitType: SplitType;
  rationMetric: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  _syncStatus: SyncStatus;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  paidAmount: number;
  owedAmount: number;
  weightValue: number | null;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string; // paid
  toUserId: string; // received payment
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}

export type ActivityEntityType = 'EXPENSE' | 'SETTLEMENT' | 'GROUP_MEMBER' | 'GROUP';
export type ActivityAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface ActivityLogEntry {
  id: string;
  groupId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description: string; // entity detail, e.g. "Dinner ($90.00)" or "$25.00" — no names baked in
  primaryUserId: string | null; // createdBy (expense) / fromUserId (settlement)
  secondaryUserId: string | null; // null (expense) / toUserId (settlement)
  createdAt: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
  isDeleted: boolean;
}
