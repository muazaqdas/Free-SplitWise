import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import RenderIf from '../../components/global/RenderIf';
import { getUsersRepository } from '../../repositories';
import { getGroupsService } from '../../services/groups.service';
import type { User } from '../../db/types';
import type { GroupsStackParamList } from './types';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<GroupsStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen({ navigation }: Props) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [newFriendName, setNewFriendName] = useState('');

  const loadUsers = useCallback(async () => {
    setUsers(await getUsersRepository().getAll());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  function toggleMember(userId: string) {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleAddFriend() {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    const user = await getUsersRepository().create({ name: trimmed });
    setNewFriendName('');
    setUsers((prev) => [...prev, user]);
    setSelectedUserIds((prev) => [...prev, user.id]);
  }

  async function handleCreateGroup() {
    try {
      const group = await getGroupsService().createWithMembers({
        name: groupName,
        memberUserIds: selectedUserIds,
      });
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch (error) {
      showAlert('Cannot create group', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 gap-4 bg-white px-4 pt-4">
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder={PLACEHOLDERS.groupName}
        className="rounded-xl border border-slate-300 px-4 py-3 text-base"
      />

      <Text className="text-base font-semibold text-slate-900">Add Members</Text>

      <View className="flex-row gap-2">
        <TextInput
          value={newFriendName}
          onChangeText={setNewFriendName}
          placeholder={PLACEHOLDERS.friendName}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <CustomButton buttonText="Add" onPress={handleAddFriend} />
      </View>

      <RenderIf condition={users.length === 0}>
        <Text className="text-slate-500">No friends yet. Add one above.</Text>
      </RenderIf>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = selectedUserIds.includes(item.id);
          return (
            <Pressable
              onPress={() => toggleMember(item.id)}
              className={`mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                selected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
              }`}
            >
              <Text className={selected ? 'text-white' : 'text-slate-900'}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      <CustomButton buttonText="Create Group" onPress={handleCreateGroup} />
    </SafeAreaView>
  );
}
