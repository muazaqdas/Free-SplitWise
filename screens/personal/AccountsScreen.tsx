import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import CustomModal from '../../components/global/CustomModal';
import CustomTextButton from '../../components/global/CustomTextButton';
import RenderIf from '../../components/global/RenderIf';
import { getAccountsRepository } from '../../repositories';
import type { Account, AccountType } from '../../db/types';
import type { PersonalStackParamList } from './types';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<PersonalStackParamList, 'Accounts'>;

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'wallet'];

function formatBalance(balance: number): string {
  return balance.toFixed(2);
}

export default function AccountsScreen({ navigation }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = useState('');

  const loadAccounts = useCallback(async () => {
    const repo = getAccountsRepository();
    setAccounts(await repo.getAll());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  function resetForm() {
    setName('');
    setType('cash');
    setInitialBalance('');
  }

  async function handleCreateAccount() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const balance = initialBalance.trim() ? Number(initialBalance) : 0;
    const repo = getAccountsRepository();
    await repo.create({ name: trimmedName, type, balance: Number.isFinite(balance) ? balance : 0 });
    resetForm();
    setModalVisible(false);
    await loadAccounts();
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream px-4 pt-4">
      <View className="mb-4 flex-row justify-between">
        <CustomTextButton buttonText="Category Breakdown" onPress={() => navigation.navigate('CategoryBreakdown')} />
        <CustomTextButton buttonText="Monthly Budgets" onPress={() => navigation.navigate('Budgets')} />
      </View>

      <RenderIf condition={accounts.length === 0}>
        <View className="flex-1 items-center justify-center gap-3">
          <Image source={require('../../assets/dino-2.png')} resizeMode="contain" className="h-32 w-32" />
          <Text className="text-moss">No accounts yet. Add one to get started.</Text>
        </View>
      </RenderIf>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Transactions', { accountId: item.id, accountName: item.name })}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-sand bg-parchment/40 px-4 py-3 active:opacity-70"
          >
            <View>
              <Text className="text-base font-semibold text-ink">{item.name}</Text>
              <Text className="text-sm capitalize text-moss">{item.type}</Text>
            </View>
            <Text className={`text-lg font-semibold ${item.balance < 0 ? 'text-coral' : 'text-ink'}`}>
              {formatBalance(item.balance)}
            </Text>
          </Pressable>
        )}
      />

      <CustomButton buttonText="Add Account" onPress={() => setModalVisible(true)} className="mb-4" />

      <CustomModal
        visible={modalVisible}
        dismiss={() => {
          setModalVisible(false);
          resetForm();
        }}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">New Account</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={PLACEHOLDERS.accountName}
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <View className="flex-row gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className={`flex-1 rounded-xl border px-3 py-2 ${
                type === t ? 'border-forest bg-forest' : 'border-sand bg-cream'
              }`}
            >
              <Text className={`text-center capitalize ${type === t ? 'text-white' : 'text-ink'}`}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={initialBalance}
          onChangeText={setInitialBalance}
          placeholder={PLACEHOLDERS.openingBalance}
          keyboardType="numeric"
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <CustomButton buttonText="Create Account" onPress={handleCreateAccount} />
      </CustomModal>
    </SafeAreaView>
  );
}
