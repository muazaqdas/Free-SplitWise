import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getGroupMembersRepository } from '../../repositories';
import type { GroupMemberWithUser } from '../../repositories';
import { getSettlementsService } from '../../services/settlements.service';
import type { GroupsStackParamList } from './types';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<GroupsStackParamList, 'SettleUp'>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SettleUpScreen({ route, navigation }: Props) {
  const { groupId, fromUserId: prefillFrom, toUserId: prefillTo, amount: prefillAmount } = route.params;

  const [members, setMembers] = useState<GroupMemberWithUser[]>([]);
  const [fromUserId, setFromUserId] = useState<string | null>(prefillFrom ?? null);
  const [toUserId, setToUserId] = useState<string | null>(prefillTo ?? null);
  const [amount, setAmount] = useState(prefillAmount != null ? String(prefillAmount) : '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadMembers = useCallback(async () => {
    const groupMembers = await getGroupMembersRepository().getByGroup(groupId);
    setMembers(groupMembers);
    setFromUserId((prev) => prev ?? groupMembers[0]?.userId ?? null);
    setToUserId((prev) => prev ?? groupMembers[1]?.userId ?? groupMembers[0]?.userId ?? null);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  function isValid(): boolean {
    const numericAmount = Number(amount);
    if (!fromUserId || !toUserId) return false;
    if (fromUserId === toUserId) return false;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return false;
    return true;
  }

  async function handleSave() {
    if (!fromUserId || !toUserId) return;
    try {
      await getSettlementsService().create({
        groupId,
        fromUserId,
        toUserId,
        amount: Number(amount),
        date,
        note: note.trim() || null,
      });
      navigation.goBack();
    } catch (error) {
      showAlert('Cannot record payment', error instanceof Error ? error.message : String(error));
    }
  }

  function nameFor(userId: string): string {
    return members.find((m) => m.userId === userId)?.user.name ?? 'Unknown';
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="gap-4 pb-4">
        <Text className="text-base font-semibold text-ink">Who paid</Text>
        <View className="flex-row flex-wrap gap-2">
          {members.map((m) => {
            const selected = fromUserId === m.userId;
            return (
              <Pressable
                key={m.id}
                onPress={() => setFromUserId(m.userId)}
                className={`rounded-full border px-4 py-2 ${
                  selected ? 'border-forest bg-forest' : 'border-sand bg-cream'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-ink'}>{m.user.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-base font-semibold text-ink">Paid to</Text>
        <View className="flex-row flex-wrap gap-2">
          {members.map((m) => {
            const selected = toUserId === m.userId;
            return (
              <Pressable
                key={m.id}
                onPress={() => setToUserId(m.userId)}
                className={`rounded-full border px-4 py-2 ${
                  selected ? 'border-forest bg-forest' : 'border-sand bg-cream'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-ink'}>{m.user.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <RenderIf condition={!!fromUserId && !!toUserId && fromUserId === toUserId}>
          <Text className="text-sm text-coral">Choose two different people.</Text>
        </RenderIf>

        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={PLACEHOLDERS.amount}
          keyboardType="decimal-pad"
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={PLACEHOLDERS.note}
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

        <RenderIf condition={!!fromUserId && !!toUserId && fromUserId !== toUserId}>
          <Text className="text-sm text-moss">
            {nameFor(fromUserId ?? '')} pays {nameFor(toUserId ?? '')}
          </Text>
        </RenderIf>

        <CustomButton buttonText="Record Payment" onPress={handleSave} className={isValid() ? '' : 'opacity-40'} />
      </ScrollView>
    </SafeAreaView>
  );
}
