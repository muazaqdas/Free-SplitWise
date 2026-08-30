import { useCallback, useState } from 'react';
import { Image, Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/global/CustomButton';
import CustomModal from '../components/global/CustomModal';
import { PAGE_ICONS } from '../components/global/navIcons';
import { getCurrentUserService } from '../services/currentUser.service';
import { PLACEHOLDERS } from '../constants/placeholders';
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
    <SafeAreaView edges={['bottom']} className="flex-1 items-center justify-center gap-4 bg-cream px-6">
      <Image
        source={require('../assets/dino-splash.png')}
        resizeMode="contain"
        className="mb-1 h-44 w-44"
      />
      <Text className="text-3xl font-extrabold tracking-tight text-forest">Free-SplitWise</Text>
      <Text className="-mt-3 mb-2 text-sm font-medium text-moss">Track it. Split it. Roar about it.</Text>

      {currentUser ? (
        <Pressable
          onPress={openProfileModal}
          className="mb-2 flex-row items-center gap-2 rounded-full border border-sand bg-parchment px-4 py-1.5"
        >
          <Text className="text-base text-ink/80">Hi, {currentUser.name}</Text>
          <Ionicons name="create-outline" size={16} color="#7A6F52" />
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
        fillColor="#8B6FA8"
      />

      <CustomModal
        visible={profileModalVisible}
        dismiss={() => setProfileModalVisible(false)}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">Your Profile</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder={PLACEHOLDERS.profileName}
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <TextInput
          value={monthlyIncomeDraft}
          onChangeText={setMonthlyIncomeDraft}
          placeholder={PLACEHOLDERS.monthlyIncome}
          keyboardType="numeric"
          className="rounded-xl border border-sand px-4 py-3 text-base"
        />
        <CustomButton buttonText="Save" onPress={handleSaveProfile} />
      </CustomModal>
    </SafeAreaView>
  );
}
