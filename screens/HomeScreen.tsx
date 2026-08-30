import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/global/CustomButton';
import CustomModal from '../components/global/CustomModal';
import { PAGE_ICONS } from '../components/global/navIcons';
import { getCurrentUserService } from '../services/currentUser.service';
import type { User } from '../db/types';
import type { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [monthlyIncomeDraft, setMonthlyIncomeDraft] = useState('');

  const loadCurrentUser = useCallback(async () => {
    setCurrentUser(await getCurrentUserService().getCurrentUser());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
    }, [loadCurrentUser])
  );

  function openProfileModal() {
    setNameDraft(currentUser?.name ?? '');
    setMonthlyIncomeDraft(currentUser?.monthlyIncome != null ? String(currentUser.monthlyIncome) : '');
    setProfileModalVisible(true);
  }

  async function handleSaveProfile() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    await getCurrentUserService().saveCurrentUserProfile({
      userId: currentUser?.id,
      name: trimmed,
      monthlyIncome: monthlyIncomeDraft.trim() ? Number(monthlyIncomeDraft) : null,
    });
    setProfileModalVisible(false);
    await loadCurrentUser();
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="mb-4 text-2xl font-bold text-slate-900">Free-SplitWise</Text>

      {currentUser ? (
        <Pressable onPress={openProfileModal} className="mb-2 flex-row items-center gap-2">
          <Text className="text-base text-slate-700">Hi, {currentUser.name}</Text>
          <Ionicons name="create-outline" size={16} color="#94a3b8" />
        </Pressable>
      ) : (
        <CustomButton buttonText="Set up your profile" onPress={openProfileModal} className="mb-2 w-full" />
      )}

      <CustomButton
        buttonText="Personal Budget"
        leftComponent={<Ionicons name={PAGE_ICONS.Personal} size={20} color="white" />}
        onPress={() => navigation.navigate('Personal')}
        className="w-full"
      />
      <CustomButton
        buttonText="Groups"
        leftComponent={<Ionicons name={PAGE_ICONS.Groups} size={20} color="white" />}
        onPress={() => navigation.navigate('Groups')}
        className="w-full"
      />

      <CustomModal
        visible={profileModalVisible}
        dismiss={() => setProfileModalVisible(false)}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-slate-900">Your Profile</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="Your name"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <TextInput
          value={monthlyIncomeDraft}
          onChangeText={setMonthlyIncomeDraft}
          placeholder="Monthly income (optional, used for income-based splits)"
          keyboardType="numeric"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <CustomButton buttonText="Save" onPress={handleSaveProfile} />
      </CustomModal>
    </SafeAreaView>
  );
}
