import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import CustomModal from '../../components/global/CustomModal';
import RenderIf from '../../components/global/RenderIf';
import { getBudgetsRepository } from '../../repositories';
import { getBudgetOverviewService, type BudgetProgress } from '../../services/budgetOverview.service';
import { usePersonalUiStore } from '../../store/personalUiStore';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNum - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export default function BudgetsScreen() {
  const selectedMonth = usePersonalUiStore((s) => s.selectedMonth);
  const setSelectedMonth = usePersonalUiStore((s) => s.setSelectedMonth);
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  const load = useCallback(async (month: string) => {
    setProgress(await getBudgetOverviewService().getBudgetProgress(month));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedMonth);
    }, [load, selectedMonth])
  );

  function resetForm() {
    setEditingId(null);
    setCategory('');
    setMonthlyLimit('');
  }

  function openCreate() {
    resetForm();
    setModalVisible(true);
  }

  function openEdit(item: BudgetProgress) {
    setEditingId(item.budget.id);
    setCategory(item.budget.category);
    setMonthlyLimit(String(item.budget.monthlyLimit));
    setModalVisible(true);
  }

  async function handleSave() {
    const limit = Number(monthlyLimit);
    const trimmedCategory = category.trim();
    if (!trimmedCategory || !Number.isFinite(limit) || limit <= 0) return;

    const repo = getBudgetsRepository();
    if (editingId) {
      await repo.update(editingId, { category: trimmedCategory, monthlyLimit: limit });
    } else {
      await repo.create({ category: trimmedCategory, monthlyLimit: limit, month: selectedMonth });
    }
    resetForm();
    setModalVisible(false);
    await load(selectedMonth);
  }

  function confirmDelete(item: BudgetProgress) {
    showAlert('Delete budget', `Delete the budget for "${item.budget.category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await getBudgetsRepository().remove(item.budget.id);
          await load(selectedMonth);
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream px-4 pt-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} className="px-3 py-2">
          <Text className="text-lg text-ink">‹</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-ink">{selectedMonth}</Text>
        <Pressable onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} className="px-3 py-2">
          <Text className="text-lg text-ink">›</Text>
        </Pressable>
      </View>

      <RenderIf condition={progress.length === 0}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-moss">No budgets set for this month.</Text>
        </View>
      </RenderIf>

      <FlatList
        data={progress}
        keyExtractor={(item) => item.budget.id}
        renderItem={({ item }) => {
          const ratio = item.budget.monthlyLimit > 0 ? item.spent / item.budget.monthlyLimit : 0;
          const overBudget = item.spent > item.budget.monthlyLimit;
          return (
            <Pressable
              onPress={() => openEdit(item)}
              onLongPress={() => confirmDelete(item)}
              className="mb-4 rounded-2xl border border-sand px-4 py-3 active:opacity-70"
            >
              <View className="mb-1 flex-row justify-between">
                <Text className="font-semibold text-ink">{item.budget.category}</Text>
                <Text className={`font-semibold ${overBudget ? 'text-coral' : 'text-ink'}`}>
                  {item.spent.toFixed(2)} / {item.budget.monthlyLimit.toFixed(2)}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-parchment">
                <View
                  className={`h-2 rounded-full ${overBudget ? 'bg-coral' : 'bg-forest'}`}
                  style={{ width: `${Math.min(100, Math.max(4, ratio * 100))}%` }}
                />
              </View>
            </Pressable>
          );
        }}
      />

      <CustomButton buttonText="Add Budget" onPress={openCreate} className="mb-4" />

      <CustomModal
        visible={modalVisible}
        dismiss={() => {
          setModalVisible(false);
          resetForm();
        }}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">{editingId ? 'Edit Budget' : 'New Budget'}</Text>
        <Text className="text-sm text-moss">Month: {selectedMonth}</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder={PLACEHOLDERS.category}
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <TextInput
          value={monthlyLimit}
          onChangeText={setMonthlyLimit}
          placeholder={PLACEHOLDERS.budgetMonthlyLimit}
          keyboardType="decimal-pad"
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <CustomButton buttonText={editingId ? 'Save Changes' : 'Create Budget'} onPress={handleSave} />
      </CustomModal>
    </SafeAreaView>
  );
}
