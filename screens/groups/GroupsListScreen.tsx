import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getGroupsRepository } from '../../repositories';
import type { Group } from '../../db/types';
import type { GroupsStackParamList } from './types';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupsList'>;

export default function GroupsListScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);

  const loadGroups = useCallback(async () => {
    const repo = getGroupsRepository();
    setGroups(await repo.getAll());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white px-4 pt-4">
      <RenderIf condition={groups.length === 0}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">No groups yet. Create one to get started.</Text>
        </View>
      </RenderIf>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 active:opacity-70"
          >
            <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
          </Pressable>
        )}
      />

      <CustomButton buttonText="Create Group" onPress={() => navigation.navigate('CreateGroup')} className="mb-4" />
    </SafeAreaView>
  );
}
