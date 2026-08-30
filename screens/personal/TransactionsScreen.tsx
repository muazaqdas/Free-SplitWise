import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getPersonalTransactionsRepository } from '../../repositories';
import { getPersonalTransactionsService } from '../../services/personalTransactions.service';
import type { PersonalTransaction } from '../../db/types';
import type { PersonalStackParamList } from './types';
import { showAlert } from '../../store/alertStore';

type Props = NativeStackScreenProps<PersonalStackParamList, 'Transactions'>;

const TYPE_COLOR: Record<PersonalTransaction['type'], string> = {
  income: 'text-green-600',
  expense: 'text-red-600',
  transfer: 'text-slate-700',
};

const TYPE_SIGN: Record<PersonalTransaction['type'], string> = {
  income: '+',
  expense: '-',
  transfer: '',
};

export default function TransactionsScreen({ route, navigation }: Props) {
  const { accountId, accountName } = route.params;
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);

  const loadTransactions = useCallback(async () => {
    const repo = getPersonalTransactionsRepository();
    const all = await repo.getAll({ accountId });
    // repository orders ascending by date; show most recent first.
    setTransactions([...all].reverse());
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: accountName });
      loadTransactions();
    }, [accountName, loadTransactions, navigation])
  );

  function confirmDelete(transaction: PersonalTransaction) {
    showAlert('Delete transaction', `Delete "${transaction.category}" for ${transaction.amount.toFixed(2)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await getPersonalTransactionsService().remove(transaction.id);
          await loadTransactions();
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white px-4 pt-4">
      <RenderIf condition={transactions.length === 0}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">No transactions yet for this account.</Text>
        </View>
      </RenderIf>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AddEditTransaction', { accountId, transactionId: item.id })}
            onLongPress={() => confirmDelete(item)}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 active:opacity-70"
          >
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-slate-900">{item.category}</Text>
              <Text className="text-sm text-slate-500">
                {item.date}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Text className={`text-lg font-semibold ${TYPE_COLOR[item.type]}`}>
              {TYPE_SIGN[item.type]}
              {item.amount.toFixed(2)}
            </Text>
          </Pressable>
        )}
      />

      <CustomButton
        buttonText="Add Transaction"
        onPress={() => navigation.navigate('AddEditTransaction', { accountId })}
        className="mb-4"
      />
    </SafeAreaView>
  );
}
