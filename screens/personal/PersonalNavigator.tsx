import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HeaderHomeButton from '../../components/global/HeaderHomeButton';
import HeaderBackButton from '../../components/global/HeaderBackButton';
import AccountsScreen from './AccountsScreen';
import TransactionsScreen from './TransactionsScreen';
import AddEditTransactionScreen from './AddEditTransactionScreen';
import CategoryBreakdownScreen from './CategoryBreakdownScreen';
import BudgetsScreen from './BudgetsScreen';
import type { PersonalStackParamList } from './types';

const Stack = createNativeStackNavigator<PersonalStackParamList>();

export default function PersonalNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTintColor: '#2B2416',
        headerStyle: { backgroundColor: '#FBF4E3' },
        headerTitleStyle: { color: '#2B2416', fontWeight: '700' },
        headerShadowVisible: false,
        headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton onPress={() => navigation.goBack()} /> : undefined),
      })}
    >
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={({ navigation }) => ({
          title: 'Accounts',
          headerLeft: () => <HeaderHomeButton onPress={() => navigation.getParent()?.navigate('Home' as never)} />,
        })}
      />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="AddEditTransaction" component={AddEditTransactionScreen} />
      <Stack.Screen
        name="CategoryBreakdown"
        component={CategoryBreakdownScreen}
        options={{ title: 'Category Breakdown' }}
      />
      <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: 'Monthly Budgets' }} />
    </Stack.Navigator>
  );
}
