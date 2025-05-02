import * as React from 'react';
import * as SecureStore from 'expo-secure-store';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/commonScreens/SplashScreen';
import Home from './src/screens/mainScreens/Home';
import Login from './src/screens/authenticationScreens/Login';
import AuthContext from './src/store/context/AuthContext';
import Signup from './src/screens/authenticationScreens/Signup';
import { GroupProvider } from './src/store/context/GroupContext';
import CreateGroup from './src/screens/mainScreens/CreateGroup';
import GroupDetail from './src/screens/mainScreens/GroupDetail';
import TransactionDetail from './src/screens/mainScreens/TransactionDetail';
import { initDatabase } from './src/database/db';
import { deleteDatabaseAsync, SQLiteProvider } from 'expo-sqlite';


const Stack = createNativeStackNavigator();

export default function App() {

  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  React.useEffect(() => {
    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;

      try {
        // Restore token stored in `SecureStore` or any other encrypted storage
        userToken = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        // Restoring token failed
      }

      // After restoring token, we may need to validate it in production apps

      // This will switch to the App screen or Auth screen and this loading
      // screen will be unmounted and thrown away.
      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (data) => {
        // In a production app, we need to send some data (usually username, password) to server and get a token
        // We will also need to handle errors if sign in failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
      signOut: () => dispatch({ type: 'SIGN_OUT' }),
      signUp: async (data) => {
        // In a production app, we need to send user data to server and get a token
        // We will also need to handle errors if sign up failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
    }),
    []
  );

  // React.useEffect(()=>{
  //   const deleteDB = async ()=>{
  //     const res = await deleteDatabaseAsync('expense_tracker.db');
  //     console.log("delete useeffect:", res);
  //   }
  //   deleteDB();

  // },[])
  
  return (
    <React.Suspense fallback={<SplashScreen/>}>
      <SQLiteProvider databaseName="expense_tracker.db" onInit={initDatabase} useSuspense>
        <AuthContext.Provider value={authContext}>
          <GroupProvider>
            <NavigationContainer>
              <Stack.Navigator>
              {
                state.isLoading? 
                  // We haven't finished checking for the token yet
                  <Stack.Screen name="Splash" component={SplashScreen} />
                  :
                  // No token found, user isn't signed in
                  (state.userToken == null?
                    <Stack.Group>
                        <Stack.Screen
                          name="Login"
                          component={Login}
                          options={{
                            title: '',
                            headerShown:false,
                            // When logging out, a pop animation feels intuitive
                            animationTypeForReplace: state.isSignout ? 'pop' : 'push',
                          }}
                        />
                        <Stack.Screen
                          name="Signup"
                          component={Signup}
                          options={{ title: 'Sign Up' }}
                        />
                    </Stack.Group>
                    :
                    // User is signed in
                    <Stack.Group>
                      <Stack.Screen name="Home" component={Home} />
                      <Stack.Screen name="CreateGroup" component={CreateGroup} />
                      <Stack.Screen name="GroupDetail" component={GroupDetail} />
                      <Stack.Screen name="TransactionDetail" component={TransactionDetail} />
                    </Stack.Group>
                  )
              }
              </Stack.Navigator>
            </NavigationContainer>
          </GroupProvider>
        </AuthContext.Provider>
      </SQLiteProvider>
    </React.Suspense>
  );
}