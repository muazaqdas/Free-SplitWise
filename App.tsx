import './global.css';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './db';
import HomeScreen from './screens/HomeScreen';
import PersonalNavigator from './screens/personal/PersonalNavigator';
import GroupsNavigator from './screens/groups/GroupsNavigator';
import type { RootStackParamList } from './screens/types';
import AlertModal from './components/global/AlertModal';

const Stack = createNativeStackNavigator<RootStackParamList>();

type DbState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export default function App() {
  const [dbState, setDbState] = React.useState<DbState>({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then(() => {
        if (!cancelled) setDbState({ status: 'ready' });
      })
      .catch((error) => {
        if (!cancelled) {
          setDbState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dbState.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <ActivityIndicator />
        <Text className="text-slate-500">Initializing database…</Text>
      </View>
    );
  }

  if (dbState.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <Text className="text-center text-red-600">Failed to initialize database: {dbState.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Personal" component={PersonalNavigator} />
          <Stack.Screen name="Groups" component={GroupsNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
      <AlertModal />
    </SafeAreaProvider>
  );
}
