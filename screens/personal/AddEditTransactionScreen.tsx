import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../components/global/CustomButton';
import CustomTextButton from '../../components/global/CustomTextButton';
import RenderIf from '../../components/global/RenderIf';
import { getPersonalTransactionsRepository } from '../../repositories';
import { getPersonalTransactionsService } from '../../services/personalTransactions.service';
import type { PersonalTransactionType } from '../../db/types';
import type { PersonalStackParamList } from './types';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<PersonalStackParamList, 'AddEditTransaction'>;

const TRANSACTION_TYPES: PersonalTransactionType[] = ['expense', 'income', 'transfer'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddEditTransactionScreen({ route, navigation }: Props) {
  const { accountId, transactionId } = route.params;
  const isEditing = Boolean(transactionId);

  const [type, setType] = useState<PersonalTransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Transaction' : 'Add Transaction' });
  }, [isEditing, navigation]);

  useEffect(() => {
    if (!transactionId) return;
    (async () => {
      const existing = await getPersonalTransactionsRepository().getById(transactionId);
      if (existing) {
        setType(existing.type);
        setAmount(String(existing.amount));
        setCategory(existing.category);
        setDate(existing.date);
        setNote(existing.note ?? '');
      }
      setLoading(false);
    })();
  }, [transactionId]);

  function isValid(): boolean {
    const numericAmount = Number(amount);
    return Number.isFinite(numericAmount) && numericAmount > 0 && category.trim().length > 0;
  }

  async function handleSave() {
    if (!isValid()) return;
    const service = getPersonalTransactionsService();
    const input = {
      accountId,
      type,
      amount: Number(amount),
      category: category.trim(),
      date,
      note: note.trim() ? note.trim() : null,
    };
    if (transactionId) {
      await service.update(transactionId, input);
    } else {
      await service.create(input);
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!transactionId) return;
    showAlert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await getPersonalTransactionsService().remove(transactionId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) return null;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 gap-4 bg-white px-4 pt-4">
      <View className="flex-row gap-2">
        {TRANSACTION_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            className={`flex-1 rounded-xl border px-3 py-2 ${
              type === t ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
            }`}
          >
            <Text className={`text-center capitalize ${type === t ? 'text-white' : 'text-slate-900'}`}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder={PLACEHOLDERS.amount}
        keyboardType="decimal-pad"
        className="rounded-xl border border-slate-300 px-4 py-3 text-base"
      />
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder={PLACEHOLDERS.category}
        className="rounded-xl border border-slate-300 px-4 py-3 text-base"
      />

      <Pressable
        onPress={() => setShowDatePicker(true)}
        className="rounded-xl border border-slate-300 px-4 py-3"
      >
        <Text className="text-base text-slate-900">{date}</Text>
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

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={PLACEHOLDERS.note}
        className="rounded-xl border border-slate-300 px-4 py-3 text-base"
      />

      <CustomButton buttonText={isEditing ? 'Save Changes' : 'Add Transaction'} onPress={handleSave} />
      <RenderIf condition={isEditing}>
        <CustomTextButton buttonText="Delete Transaction" onPress={handleDelete} textClassName="text-red-600" />
      </RenderIf>
    </SafeAreaView>
  );
}
