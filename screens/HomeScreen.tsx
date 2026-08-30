import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/global/CustomButton';
import { PAGE_ICONS } from '../components/global/navIcons';
import type { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="mb-4 text-2xl font-bold text-slate-900">Free-SplitWise</Text>
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
    </SafeAreaView>
  );
}
