import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import RenderIf from '../../components/global/RenderIf';
import { getActivityLogRepository, getGroupMembersRepository } from '../../repositories';
import type { ActivityLogEntry } from '../../db/types';
import type { GroupsStackParamList } from './types';

type Props = NativeStackScreenProps<GroupsStackParamList, 'Activity'>;

// Module 9: chronological audit log. EXPENSE/SETTLEMENT entries store only
// ids and a bare description (e.g. "Dinner ($90.00)") — names are resolved
// here from the group's *current* member list, same as BalancesScreen's
// nameFor(). GROUP_MEMBER and GROUP entries are the exception: a removed
// member is gone from that member list by the time this renders, and a
// rename has no single subject user, so groups.service bakes full text into
// `description` directly at write time — rendered as-is here.
function activityLine(entry: ActivityLogEntry, nameFor: (userId: string) => string): string {
  if (entry.entityType === 'GROUP_MEMBER' || entry.entityType === 'GROUP') return entry.description;

  const primary = entry.primaryUserId ? nameFor(entry.primaryUserId) : 'Someone';
  const secondary = entry.secondaryUserId ? nameFor(entry.secondaryUserId) : null;

  if (entry.entityType === 'SETTLEMENT') {
    if (entry.action === 'DELETED') {
      return `${primary}'s payment of ${entry.description}${secondary ? ` to ${secondary}` : ''} was removed`;
    }
    return `${primary} paid ${secondary ?? 'someone'} ${entry.description}`;
  }

  if (entry.action === 'CREATED') return `${primary} added ${entry.description}`;
  if (entry.action === 'UPDATED') return `${primary} edited ${entry.description}`;
  return `${primary} deleted ${entry.description}`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function ActivityScreen({ route }: Props) {
  const { groupId } = route.params;
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadActivity = useCallback(async () => {
    const [members, activity] = await Promise.all([
      getGroupMembersRepository().getByGroup(groupId),
      getActivityLogRepository().getByGroup(groupId),
    ]);
    setNames(Object.fromEntries(members.map((m) => [m.userId, m.user.name])));
    setEntries(activity);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity])
  );

  function nameFor(userId: string): string {
    return names[userId] ?? 'Unknown';
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white px-4 pt-4">
      <RenderIf condition={entries.length === 0}>
        <Text className="text-slate-500">No activity yet.</Text>
      </RenderIf>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-2xl border border-slate-200 px-4 py-3">
            <Text className="text-base text-slate-900">{activityLine(item, nameFor)}</Text>
            <Text className="mt-1 text-sm text-slate-500">{formatTimestamp(item.createdAt)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
