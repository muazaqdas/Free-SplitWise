export type GroupsStackParamList = {
  GroupsList: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName: string };
  AddExpense: { groupId: string; expenseId?: string };
  Balances: { groupId: string };
  SettleUp: { groupId: string; fromUserId?: string; toUserId?: string; amount?: number };
  Activity: { groupId: string };
};
