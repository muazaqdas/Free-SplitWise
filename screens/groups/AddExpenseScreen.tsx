import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getExpenseSplitsRepository, getExpensesRepository, getGroupMembersRepository, getUsersRepository } from '../../repositories';
import type { GroupMemberWithUser } from '../../repositories';
import { getExpensesService } from '../../services/expenses.service';
import type { CreatableSplitType } from '../../services/expenses.service';
import { getSettlementsService } from '../../services/settlements.service';
import type { GroupsStackParamList } from './types';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<GroupsStackParamList, 'AddExpense'>;

const SPLIT_TYPES: CreatableSplitType[] = ['EQUAL', 'EXACT', 'PERCENT', 'SHARES', 'RATION', 'INCOME'];
const DEFAULT_CURRENCY = 'USD';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PERCENT/SHARES/RATION all show a "weight" input per selected participant,
// but mean different things (percent of total, relative share count, or a
// per-expense metric like meals eaten) — EXACT shares the same per-participant
// input UI but the number entered IS the owed amount, not a weight fed
// through calculateWeightedSplit. INCOME has no per-participant input at all:
// its weight is each user's stored monthlyIncome (CLAUDE.md Module 6).
function weightLabel(splitType: CreatableSplitType): string {
  if (splitType === 'EXACT') return PLACEHOLDERS.weightAmountOwed;
  if (splitType === 'PERCENT') return PLACEHOLDERS.weightPercent;
  if (splitType === 'RATION') return PLACEHOLDERS.weightRationValue;
  return PLACEHOLDERS.weightShares;
}

export default function AddExpenseScreen({ route, navigation }: Props) {
  const { groupId, expenseId } = route.params;
  const isEditMode = !!expenseId;

  const [members, setMembers] = useState<GroupMemberWithUser[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidByUserId, setPaidByUserId] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<CreatableSplitType>('EQUAL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [rationMetric, setRationMetric] = useState('');
  // Only used for participants with no stored monthlyIncome yet — CLAUDE.md
  // Module 6 sources INCOME weights from users.monthlyIncome, but there's no
  // profile screen yet to set it ahead of time, so it can be filled in here
  // and is persisted back onto the user record on save.
  const [incomeInputs, setIncomeInputs] = useState<Record<string, string>>({});

  const loadMembers = useCallback(async () => {
    const groupMembers = await getGroupMembersRepository().getByGroup(groupId);
    setMembers(groupMembers);
    setSelectedUserIds((prev) => (prev.length > 0 ? prev : groupMembers.map((m) => m.userId)));
    setPaidByUserId((prev) => prev ?? groupMembers[0]?.userId ?? null);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Edit Expense' : 'Add Expense' });
  }, [isEditMode, navigation]);

  // Reconstruct form state from the persisted expense_splits — weightValue
  // holds the original PERCENT/SHARES/RATION weight, owedAmount holds the
  // EXACT amount, and the split with the largest paidAmount stands in as
  // "who paid" (this screen only ever creates single-payer expenses, so
  // that's always the one real payer for anything it created).
  useEffect(() => {
    if (!expenseId) return;
    let cancelled = false;

    async function loadForEdit() {
      const [expense, splits] = await Promise.all([
        getExpensesRepository().getById(expenseId as string),
        getExpenseSplitsRepository().getByExpense(expenseId as string),
      ]);
      if (cancelled || !expense) return;

      setDescription(expense.description);
      setAmount(String(expense.totalAmount));
      setCategory(expense.category);
      setDate(expense.date);
      setSplitType(expense.splitType as CreatableSplitType);
      setRationMetric(expense.rationMetric ?? '');
      setSelectedUserIds(splits.map((s) => s.userId));

      const payer = splits.reduce((max, s) => (s.paidAmount > (max?.paidAmount ?? -1) ? s : max), splits[0]);
      if (payer) setPaidByUserId(payer.userId);

      if (expense.splitType === 'EXACT') {
        setWeightInputs(Object.fromEntries(splits.map((s) => [s.userId, String(s.owedAmount)])));
      } else if (expense.splitType === 'PERCENT' || expense.splitType === 'SHARES' || expense.splitType === 'RATION') {
        setWeightInputs(Object.fromEntries(splits.map((s) => [s.userId, String(s.weightValue ?? 0)])));
      } else if (expense.splitType === 'INCOME') {
        // Only prefills participants with no monthlyIncome stored yet — the
        // form only ever accepts income input for those (see resolveIncome).
        setIncomeInputs(Object.fromEntries(splits.map((s) => [s.userId, String(s.weightValue ?? 0)])));
      }
    }

    loadForEdit();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  function toggleParticipant(userId: string) {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  const numericAmount = Number(amount);
  const weightTotal = useMemo(
    () => selectedUserIds.reduce((sum, id) => sum + (Number(weightInputs[id]) || 0), 0),
    [selectedUserIds, weightInputs]
  );

  function isValid(): boolean {
    if (!description.trim()) return false;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return false;
    if (!paidByUserId) return false;
    if (selectedUserIds.length === 0) return false;
    if (splitType === 'RATION' && !rationMetric.trim()) return false;
    return true;
  }

  // INCOME's weight is the stored users.monthlyIncome (CLAUDE.md Module 6).
  // For a participant with none yet, incomeInputs holds what they typed here.
  function resolveIncome(userId: string): number {
    const stored = members.find((m) => m.userId === userId)?.user.monthlyIncome;
    return stored ?? (Number(incomeInputs[userId]) || 0);
  }

  async function persistExpense() {
    if (!paidByUserId) return;

    const baseInput = {
      groupId,
      description: description.trim(),
      totalAmount: numericAmount,
      currency: DEFAULT_CURRENCY,
      date,
      category: category.trim(),
      createdBy: paidByUserId,
      paidBy: [{ userId: paidByUserId, paidAmount: numericAmount }],
    };

    const save = isEditMode
      ? (input: Parameters<ReturnType<typeof getExpensesService>['create']>[0]) =>
          getExpensesService().update(expenseId as string, input)
      : getExpensesService().create;

    try {
      if (splitType === 'EQUAL') {
        await save({ ...baseInput, splitType, participantUserIds: selectedUserIds });
      } else if (splitType === 'EXACT') {
        const exactAmounts = Object.fromEntries(selectedUserIds.map((id) => [id, Number(weightInputs[id]) || 0]));
        await save({ ...baseInput, splitType, exactAmounts });
      } else if (splitType === 'PERCENT') {
        const percents = Object.fromEntries(selectedUserIds.map((id) => [id, Number(weightInputs[id]) || 0]));
        await save({ ...baseInput, splitType, percents });
      } else if (splitType === 'SHARES') {
        const shares = Object.fromEntries(selectedUserIds.map((id) => [id, Number(weightInputs[id]) || 0]));
        await save({ ...baseInput, splitType, shares });
      } else if (splitType === 'RATION') {
        const rationValues = Object.fromEntries(selectedUserIds.map((id) => [id, Number(weightInputs[id]) || 0]));
        await save({ ...baseInput, splitType, rationMetric: rationMetric.trim(), rationValues });
      } else {
        const incomes = Object.fromEntries(selectedUserIds.map((id) => [id, resolveIncome(id)]));
        await save({ ...baseInput, splitType, incomes });
        // Persist newly-entered incomes so future INCOME splits don't need re-entry.
        for (const id of selectedUserIds) {
          const member = members.find((m) => m.userId === id);
          if (member && member.user.monthlyIncome == null && incomeInputs[id]) {
            await getUsersRepository().update(id, { monthlyIncome: Number(incomeInputs[id]) || 0 });
          }
        }
      }
      navigation.goBack();
    } catch (error) {
      showAlert(isEditMode ? 'Cannot save changes' : 'Cannot add expense', error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSave() {
    if (!isValid() || !paidByUserId) return;

    // Settlements aren't tied to a specific expense — they net against
    // whatever the group's current balances are. Editing an expense after
    // people have settled up against the old amount is legitimate, but can
    // silently reopen or shift a balance the group thought was closed, so
    // this surfaces that instead of letting it happen invisibly.
    if (isEditMode) {
      const history = await getSettlementsService().getHistory(groupId);
      if (history.length > 0) {
        showAlert(
          'This group has recorded settlements',
          'Editing this expense may change balances that were already settled up. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', style: 'destructive', onPress: persistExpense },
          ]
        );
        return;
      }
    }

    await persistExpense();
  }

  function handleDelete() {
    if (!expenseId) return;
    showAlert('Delete this expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await getExpensesService().remove(expenseId as string);
            navigation.goBack();
          } catch (error) {
            showAlert('Cannot delete expense', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="gap-4 pb-4">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={PLACEHOLDERS.expenseDescription}
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={PLACEHOLDERS.amount}
          keyboardType="decimal-pad"
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder={PLACEHOLDERS.expenseCategoryOptional}
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />

        <Pressable onPress={() => setShowDatePicker(true)} className="rounded-xl border border-sand px-4 py-3">
          <Text className="text-base text-ink">{date}</Text>
        </Pressable>
        <RenderIf condition={showDatePicker}>
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_event, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setDate(selected.toISOString().slice(0, 10));
            }}
          />
        </RenderIf>

        <Text className="text-base font-semibold text-ink">Paid by</Text>
        <View className="flex-row flex-wrap gap-2">
          {members.map((m) => {
            const selected = paidByUserId === m.userId;
            return (
              <Pressable
                key={m.id}
                onPress={() => setPaidByUserId(m.userId)}
                className={`rounded-full border px-4 py-2 ${
                  selected ? 'border-forest bg-forest' : 'border-sand bg-cream'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-ink'}>{m.user.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-base font-semibold text-ink">Split</Text>
        <View className="flex-row flex-wrap gap-2">
          {SPLIT_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setSplitType(t)}
              className={`rounded-xl border px-3 py-2 ${
                splitType === t ? 'border-forest bg-forest' : 'border-sand bg-cream'
              }`}
            >
              <Text className={`text-center capitalize ${splitType === t ? 'text-white' : 'text-ink'}`}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <RenderIf condition={splitType === 'RATION'}>
          <TextInput
            value={rationMetric}
            onChangeText={setRationMetric}
            placeholder={PLACEHOLDERS.rationMetric}
            className="rounded-xl border border-sand px-4 py-3 text-base"
          />
        </RenderIf>

        <Text className="text-base font-semibold text-ink">Split between</Text>
        {members.map((m) => {
          const selected = selectedUserIds.includes(m.userId);
          return (
            <View key={m.id} className="flex-row items-center gap-2">
              <Pressable
                onPress={() => toggleParticipant(m.userId)}
                className={`flex-1 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                  selected ? 'border-forest bg-forest' : 'border-sand bg-cream'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-ink'}>{m.user.name}</Text>
              </Pressable>
              <RenderIf condition={selected && splitType !== 'EQUAL' && splitType !== 'INCOME'}>
                <TextInput
                  value={weightInputs[m.userId] ?? ''}
                  onChangeText={(text) => setWeightInputs((prev) => ({ ...prev, [m.userId]: text }))}
                  placeholder={weightLabel(splitType)}
                  keyboardType="decimal-pad"
                  className="w-24 rounded-xl border border-sand px-3 py-3 text-base"
                />
              </RenderIf>
              <RenderIf condition={selected && splitType === 'INCOME' && m.user.monthlyIncome != null}>
                <Text className="w-24 text-right text-base text-ink/80">{m.user.monthlyIncome}/mo</Text>
              </RenderIf>
              <RenderIf condition={selected && splitType === 'INCOME' && m.user.monthlyIncome == null}>
                <TextInput
                  value={incomeInputs[m.userId] ?? ''}
                  onChangeText={(text) => setIncomeInputs((prev) => ({ ...prev, [m.userId]: text }))}
                  placeholder={PLACEHOLDERS.participantMonthlyIncome}
                  keyboardType="decimal-pad"
                  className="w-28 rounded-xl border border-sand px-3 py-3 text-base"
                />
              </RenderIf>
            </View>
          );
        })}

        <RenderIf condition={splitType === 'EXACT'}>
          <Text className="text-sm text-moss">
            Entered: {weightTotal.toFixed(2)} / {Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00'}
          </Text>
        </RenderIf>
        <RenderIf condition={splitType === 'PERCENT'}>
          <Text className="text-sm text-moss">Entered: {weightTotal.toFixed(2)} / 100</Text>
        </RenderIf>

        <CustomButton buttonText={isEditMode ? 'Save Changes' : 'Add Expense'} onPress={handleSave} />
        <RenderIf condition={isEditMode}>
          <CustomButton buttonText="Delete Expense" onPress={handleDelete} className="bg-coral" />
        </RenderIf>
      </ScrollView>
    </SafeAreaView>
  );
}
