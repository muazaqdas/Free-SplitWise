import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HeaderHomeButton from '../../components/global/HeaderHomeButton';
import HeaderBackButton from '../../components/global/HeaderBackButton';
import GroupsListScreen from './GroupsListScreen';
import CreateGroupScreen from './CreateGroupScreen';
import GroupDetailScreen from './GroupDetailScreen';
import AddExpenseScreen from './AddExpenseScreen';
import BalancesScreen from './BalancesScreen';
import SettleUpScreen from './SettleUpScreen';
import ActivityScreen from './ActivityScreen';
import type { GroupsStackParamList } from './types';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTintColor: '#0f172a',
        headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton onPress={() => navigation.goBack()} /> : undefined),
      })}
    >
      <Stack.Screen
        name="GroupsList"
        component={GroupsListScreen}
        options={({ navigation }) => ({
          title: 'Groups',
          headerLeft: () => <HeaderHomeButton onPress={() => navigation.getParent()?.navigate('Home' as never)} />,
        })}
      />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'New Group' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="Balances" component={BalancesScreen} options={{ title: 'Balances' }} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: 'Settle Up' }} />
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
    </Stack.Navigator>
  );
}
