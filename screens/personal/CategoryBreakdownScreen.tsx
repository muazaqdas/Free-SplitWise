import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RenderIf from '../../components/global/RenderIf';
import { getBudgetOverviewService, type CategorySpend } from '../../services/budgetOverview.service';
import { usePersonalUiStore } from '../../store/personalUiStore';

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNum - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export default function CategoryBreakdownScreen() {
  const selectedMonth = usePersonalUiStore((s) => s.selectedMonth);
  const setSelectedMonth = usePersonalUiStore((s) => s.setSelectedMonth);
  const [spend, setSpend] = useState<CategorySpend[]>([]);

  const load = useCallback(async (month: string) => {
    setSpend(await getBudgetOverviewService().getCategorySpend(month));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedMonth);
    }, [load, selectedMonth])
  );

  const maxSpent = Math.max(1, ...spend.map((s) => s.spent));
  const total = spend.reduce((sum, s) => sum + s.spent, 0);

  return (
    <View className="flex-1 bg-white px-4 pt-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} className="px-3 py-2">
          <Text className="text-lg text-slate-900">‹</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900">{selectedMonth}</Text>
        <Pressable onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} className="px-3 py-2">
          <Text className="text-lg text-slate-900">›</Text>
        </Pressable>
      </View>

      <Text className="mb-4 text-center text-2xl font-bold text-slate-900">Total: {total.toFixed(2)}</Text>

      <RenderIf condition={spend.length === 0}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">No expenses recorded for this month.</Text>
        </View>
      </RenderIf>

      <FlatList
        data={spend}
        keyExtractor={(item) => item.category}
        renderItem={({ item }) => (
          <View className="mb-4">
            <View className="mb-1 flex-row justify-between">
              <Text className="font-medium text-slate-900">{item.category}</Text>
              <Text className="font-medium text-slate-900">{item.spent.toFixed(2)}</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-slate-100">
              <View
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${Math.max(4, (item.spent / maxSpent) * 100)}%` }}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}
