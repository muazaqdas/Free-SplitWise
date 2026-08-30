export type PersonalStackParamList = {
  Accounts: undefined;
  Transactions: { accountId: string; accountName: string };
  AddEditTransaction: { accountId: string; transactionId?: string };
  CategoryBreakdown: undefined;
  Budgets: undefined;
};
