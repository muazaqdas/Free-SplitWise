// Schema per CLAUDE.md Section 3. Idempotent — safe to run on every app start.
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    monthlyIncome REAL,
    createdAt TEXT,
    updatedAt TEXT,
    _syncStatus TEXT,
    isDeleted INTEGER DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    isDeleted INTEGER DEFAULT 0,
    _syncStatus TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    groupId TEXT,
    userId TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    groupId TEXT,
    description TEXT,
    totalAmount REAL,
    currency TEXT,
    date TEXT,
    category TEXT,
    splitType TEXT,
    rationMetric TEXT,
    createdBy TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    isDeleted INTEGER DEFAULT 0,
    _syncStatus TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expenseId TEXT,
    userId TEXT,
    paidAmount REAL,
    owedAmount REAL,
    weightValue REAL
  );`,
  `CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    groupId TEXT,
    fromUserId TEXT,
    toUserId TEXT,
    amount REAL,
    date TEXT,
    note TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    _syncStatus TEXT,
    isDeleted INTEGER DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS personal_transactions (
    id TEXT PRIMARY KEY,
    accountId TEXT,
    type TEXT,
    amount REAL,
    category TEXT,
    date TEXT,
    note TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    isDeleted INTEGER DEFAULT 0,
    _syncStatus TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    balance REAL,
    createdAt TEXT,
    updatedAt TEXT,
    _syncStatus TEXT,
    isDeleted INTEGER DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT,
    monthlyLimit REAL,
    month TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    _syncStatus TEXT,
    isDeleted INTEGER DEFAULT 0
  );`,
  // Added in Module 9 — chronological audit log of group mutating actions
  // (expense/settlement create, edit, delete). Not in the original Section 3
  // draft, same as `settlements` (Module 7): a new record type introduced by
  // its module, still carrying the Section 2 sync-readiness columns.
  `CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    groupId TEXT,
    entityType TEXT,
    entityId TEXT,
    action TEXT,
    description TEXT,
    primaryUserId TEXT,
    secondaryUserId TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    _syncStatus TEXT,
    isDeleted INTEGER DEFAULT 0
  );`,
];
