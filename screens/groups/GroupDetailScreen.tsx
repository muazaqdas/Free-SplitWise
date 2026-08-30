import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomButton from '../../components/global/CustomButton';
import CustomModal from '../../components/global/CustomModal';
import RenderIf from '../../components/global/RenderIf';
import { getGroupMembersRepository, getExpensesRepository, getUsersRepository } from '../../repositories';
import type { GroupMemberWithUser } from '../../repositories';
import { getGroupsService } from '../../services/groups.service';
import type { Expense, User } from '../../db/types';
import type { GroupsStackParamList } from './types';
import { showAlert } from '../../store/alertStore';
import { PLACEHOLDERS } from '../../constants/placeholders';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params;
  const [currentGroupName, setCurrentGroupName] = useState(groupName);
  const [members, setMembers] = useState<GroupMemberWithUser[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [newFriendName, setNewFriendName] = useState('');
  const [editGroupModalVisible, setEditGroupModalVisible] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState(currentGroupName);
  const [editingMember, setEditingMember] = useState<{ id: string; name: string } | null>(null);
  const [memberNameDraft, setMemberNameDraft] = useState('');

  useEffect(() => {
    navigation.setOptions({
      title: currentGroupName,
      headerRight: () => (
        <Pressable onPress={openEditGroupModal} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color="#2B2416" />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupName, navigation]);

  function openEditGroupModal() {
    setGroupNameDraft(currentGroupName);
    setEditGroupModalVisible(true);
  }

  async function handleRenameGroup() {
    try {
      await getGroupsService().renameGroup(groupId, groupNameDraft);
      setCurrentGroupName(groupNameDraft.trim());
      setEditGroupModalVisible(false);
    } catch (error) {
      showAlert('Cannot rename group', error instanceof Error ? error.message : String(error));
    }
  }

  function openEditMemberModal(member: GroupMemberWithUser) {
    setEditingMember({ id: member.userId, name: member.user.name });
    setMemberNameDraft(member.user.name);
  }

  async function handleRenameMember() {
    if (!editingMember) return;
    const trimmed = memberNameDraft.trim();
    if (!trimmed) return;
    await getUsersRepository().update(editingMember.id, { name: trimmed });
    setEditingMember(null);
    await loadMembers();
  }

  const loadMembers = useCallback(async () => {
    setMembers(await getGroupMembersRepository().getByGroup(groupId));
  }, [groupId]);

  const loadExpenses = useCallback(async () => {
    setExpenses(await getExpensesRepository().getByGroup(groupId));
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
      loadExpenses();
    }, [loadMembers, loadExpenses])
  );

  async function openAddMemberModal() {
    const allUsers = await getUsersRepository().getAll();
    const memberUserIds = new Set(members.map((m) => m.userId));
    setAvailableUsers(allUsers.filter((u) => !memberUserIds.has(u.id)));
    setModalVisible(true);
  }

  async function handleAddExisting(userId: string) {
    await getGroupMembersRepository().add({ groupId, userId });
    setModalVisible(false);
    await loadMembers();
  }

  async function handleAddFriend() {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    const user = await getUsersRepository().create({ name: trimmed });
    await getGroupMembersRepository().add({ groupId, userId: user.id });
    setNewFriendName('');
    setModalVisible(false);
    await loadMembers();
  }

  async function handleRemoveMember(membershipId: string, userId: string) {
    try {
      await getGroupsService().removeMember(groupId, membershipId, userId);
      await loadMembers();
    } catch (error) {
      showAlert('Cannot remove member', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream px-4 pt-4">
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            <Text className="text-base font-semibold text-ink">Members</Text>
            <RenderIf condition={members.length === 0}>
              <Text className="text-moss">No members yet. Add one to get started.</Text>
            </RenderIf>
            {members.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3"
              >
                <Pressable
                  onPress={() => openEditMemberModal(item)}
                  className="flex-1 flex-row items-center gap-2"
                  hitSlop={8}
                >
                  <Text className="text-base font-semibold text-ink">{item.user.name}</Text>
                  <Ionicons name="create-outline" size={16} color="#7A6F52" />
                </Pressable>
                <Pressable onPress={() => handleRemoveMember(item.id, item.userId)}>
                  <Text className="text-sm font-medium text-coral">Remove</Text>
                </Pressable>
              </View>
            ))}
            <CustomButton buttonText="Add Member" onPress={openAddMemberModal} />

            <View className="flex-row gap-2">
              <CustomButton
                buttonText="Add Expense"
                onPress={() => navigation.navigate('AddExpense', { groupId })}
                className="flex-1"
              />
              <CustomButton
                buttonText="Balances"
                onPress={() => navigation.navigate('Balances', { groupId })}
                className="flex-1"
              />
              <CustomButton
                buttonText="Settle Up"
                onPress={() => navigation.navigate('SettleUp', { groupId })}
                className="flex-1"
              />
            </View>
            <CustomButton buttonText="Activity" onPress={() => navigation.navigate('Activity', { groupId })} />

            <Text className="mt-2 text-base font-semibold text-ink">Expenses</Text>
            <RenderIf condition={expenses.length === 0}>
              <Text className="text-moss">No expenses yet. Add one to get started.</Text>
            </RenderIf>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AddExpense', { groupId, expenseId: item.id })}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-sand px-4 py-3"
          >
            <View>
              <Text className="text-base font-semibold text-ink">{item.description}</Text>
              <Text className="text-sm text-moss">
                {item.date} {item.category ? `· ${item.category}` : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text className="text-base font-bold text-ink">${item.totalAmount.toFixed(2)}</Text>
              <Ionicons name="create-outline" size={18} color="#7A6F52" />
            </View>
          </Pressable>
        )}
      />

      <CustomModal
        visible={modalVisible}
        dismiss={() => setModalVisible(false)}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">Add Member</Text>

        <View className="flex-row gap-2">
          <TextInput
            value={newFriendName}
            onChangeText={setNewFriendName}
            placeholder={PLACEHOLDERS.friendName}
            className="flex-1 rounded-xl border border-sand px-4 py-3 text-base"
          />
          <CustomButton buttonText="Add" onPress={handleAddFriend} />
        </View>

        <RenderIf condition={availableUsers.length > 0}>
          <Text className="text-sm font-semibold text-moss">Existing friends</Text>
          <FlatList
            data={availableUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleAddExisting(item.id)}
                className="mb-2 rounded-xl border border-sand px-4 py-3"
              >
                <Text className="text-ink">{item.name}</Text>
              </Pressable>
            )}
          />
        </RenderIf>
      </CustomModal>

      <CustomModal
        visible={editGroupModalVisible}
        dismiss={() => setEditGroupModalVisible(false)}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">Rename Group</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={groupNameDraft}
            onChangeText={setGroupNameDraft}
            placeholder={PLACEHOLDERS.groupName}
            className="flex-1 rounded-xl border border-sand px-4 py-3 text-base"
          />
          <CustomButton buttonText="Save" onPress={handleRenameGroup} />
        </View>
      </CustomModal>

      <CustomModal
        visible={editingMember !== null}
        dismiss={() => setEditingMember(null)}
        contentClassName="rounded-t-3xl px-5 pb-8 pt-5 gap-4"
      >
        <Text className="text-lg font-bold text-ink">Rename Member</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={memberNameDraft}
            onChangeText={setMemberNameDraft}
            placeholder={PLACEHOLDERS.memberName}
            className="flex-1 rounded-xl border border-sand px-4 py-3 text-base"
          />
          <CustomButton buttonText="Save" onPress={handleRenameMember} />
        </View>
      </CustomModal>
    </SafeAreaView>
  );
}
