// Shared TextInput placeholder copy, kept in one place so wording stays
// consistent across screens and can be updated without hunting through JSX.
export const PLACEHOLDERS = {
  // Reused across multiple screens
  friendName: "New friend's name",
  groupName: 'Group name',
  memberName: "Member's name",
  category: 'Category (e.g. Food, Rent)',
  amount: 'Amount',
  note: 'Note (optional)',

  // HomeScreen — profile modal
  profileName: 'Your name',
  monthlyIncome: 'Monthly income (optional, used for income-based splits)',

  // BudgetsScreen
  budgetMonthlyLimit: 'Monthly limit',

  // AccountsScreen
  accountName: 'Account name',
  openingBalance: 'Opening balance (optional)',

  // AddExpenseScreen
  expenseDescription: 'Description (e.g. Dinner)',
  expenseCategoryOptional: 'Category (optional)',
  rationMetric: 'Ration metric (e.g. "Meals Eaten")',
  weightAmountOwed: 'Amount owed',
  weightPercent: 'Percent',
  weightRationValue: 'Ration value',
  weightShares: 'Shares',
  participantMonthlyIncome: 'Monthly income',
} as const;
