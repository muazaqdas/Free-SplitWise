import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getGroupMembersRepository } from '../../repositories';
import { getBalancesService } from '../../services/balances.service';
import type { RawDebt } from '../../services/balances.service';
import { getSettlementsService } from '../../services/settlements.service';
import type { Settlement } from '../../db/types';
import type { GroupsStackParamList } from './types';
import { showAlert } from '../../store/alertStore';

type Props = NativeStackScreenProps<GroupsStackParamList, 'Balances'>;

export default function BalancesScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [debts, setDebts] = useState<RawDebt[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<RawDebt[]>([]);
  const [simplified, setSimplified] = useState(false);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadBalances = useCallback(async () => {
    const [members, rawDebts, simplifiedResult, settlementHistory] = await Promise.all([
      getGroupMembersRepository().getByGroup(groupId),
      getBalancesService().getRawGroupBalances(groupId),
      getBalancesService().getSimplifiedGroupBalances(groupId),
      getSettlementsService().getHistory(groupId),
    ]);
    setNames(Object.fromEntries(members.map((m) => [m.userId, m.user.name])));
    setDebts(rawDebts);
    setSimplifiedDebts(simplifiedResult);
    setHistory(settlementHistory);
  }, [groupId]);

  const visibleDebts = simplified ? simplifiedDebts : debts;

  useFocusEffect(
    useCallback(() => {
      loadBalances();
    }, [loadBalances])
  );

  function nameFor(userId: string): string {
    return names[userId] ?? 'Unknown';
  }

  function handleDeleteSettlement(settlementId: string) {
    showAlert('Remove this payment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await getSettlementsService().remove(settlementId);
          await loadBalances();
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream px-4 pt-4">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            <Pressable
              onPress={() => setSimplified((prev) => !prev)}
              className="flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3"
            >
              <Text className="text-base font-semibold text-ink">
                {simplified ? 'Simplified debts' : 'Raw debts'}
              </Text>
              <Text className="text-sm text-plum">
                {simplified ? 'Show raw' : 'Simplify debts'}
              </Text>
            </Pressable>

            <RenderIf condition={visibleDebts.length === 0}>
              <Text className="text-moss">All settled up.</Text>
            </RenderIf>

            {/* Simplified rows are a read-only suggestion, not settleable directly: a
                suggested payment can route money between two people for more than they
                actually owe each other directly (paying off a third party's debt by
                proxy). Recording it as a literal pairwise settlement would still zero
                everyone's true net balance, but leaves a residual, non-obvious cycle of
                debts in the Raw view instead of clearing it. Settling only ever happens
                against a Raw row (an exact, real per-expense debt) or the freeform
                "Settle Up" button below. */}
            {visibleDebts.map((item, index) =>
              simplified ? (
                <View
                  key={`${item.fromUserId}-${item.toUserId}-${index}`}
                  className="flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3 opacity-80"
                >
                  <View>
                    <Text className="text-base text-ink">
                      <Text className="font-semibold">{nameFor(item.fromUserId)}</Text> should pay{' '}
                      <Text className="font-semibold">{nameFor(item.toUserId)}</Text>
                    </Text>
                    <Text className="mt-1 text-lg font-bold text-ink">${item.amount.toFixed(2)}</Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  key={`${item.fromUserId}-${item.toUserId}-${index}`}
                  onPress={() =>
                    navigation.navigate('SettleUp', {
                      groupId,
                      fromUserId: item.fromUserId,
                      toUserId: item.toUserId,
                      amount: item.amount,
                    })
                  }
                  className="flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3"
                >
                  <View>
                    <Text className="text-base text-ink">
                      <Text className="font-semibold">{nameFor(item.fromUserId)}</Text> owes{' '}
                      <Text className="font-semibold">{nameFor(item.toUserId)}</Text>
                    </Text>
                    <Text className="mt-1 text-lg font-bold text-ink">${item.amount.toFixed(2)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#7A6F52" />
                </Pressable>
              )
            )}
            <RenderIf condition={simplified && visibleDebts.length > 0}>
              <Text className="text-xs text-moss">
                Suggested payments to settle the group in the fewest transactions. Tap "Show
                raw" and settle from there to record a payment.
              </Text>
            </RenderIf>

            <CustomButton buttonText="Settle Up" onPress={() => navigation.navigate('SettleUp', { groupId })} />

            <Text className="mt-2 text-base font-semibold text-ink">Settlement History</Text>
            <RenderIf condition={history.length === 0}>
              <Text className="text-moss">No payments recorded yet.</Text>
            </RenderIf>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3">
            <View className="flex-1">
              <Text className="text-base text-ink">
                <Text className="font-semibold">{nameFor(item.fromUserId)}</Text> paid{' '}
                <Text className="font-semibold">{nameFor(item.toUserId)}</Text>
              </Text>
              <Text className="mt-1 text-lg font-bold text-ink">${item.amount.toFixed(2)}</Text>
              <Text className="mt-1 text-sm text-moss">
                {item.date}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => handleDeleteSettlement(item.id)} className="px-2 py-1">
              <Ionicons name="trash-outline" size={20} color="#D9614F" />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
