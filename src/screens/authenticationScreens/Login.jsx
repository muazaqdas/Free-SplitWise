// screens/authenticationScreens/Login.js
import React, { useContext } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Image, Dimensions, ImageBackground, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import AuthContext from '../../store/context/AuthContext';
import CustomButton from '../../components/global/CustomButton';
import { COLOR } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
const {width, height} = Dimensions.get('screen');
const LOGO_SIZE = width 

const Login = () => {
  const { signIn } = useContext(AuthContext);
  const { control, handleSubmit } = useForm();
  const navigation = useNavigation();

  const onSubmit = async (data) => {
    try {
      const storedEmail = await SecureStore.getItemAsync('userEmail');
      const storedPassword = await SecureStore.getItemAsync('userPassword');

      if (data.email === storedEmail && data.password === storedPassword) {
        await signIn(data);
      } else {
        Alert.alert('Invalid credentials', 'Please check your email and password');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // You can tweak this
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <ImageBackground style={styles.container} source={require('../../../assets/dino-4.jpeg')}/>
          <LinearGradient colors={[COLOR.tertiary, COLOR.primary]} start={{x: 0, y: 0.1}} style={styles.contentContainer}>
            {/* <View style={styles.contentContainer}> */}
              <Text style={styles.header}>
                SPLIT WISELY
              </Text>
              <Controller
                control={control}
                name="email"
                defaultValue=""
                rules={{ required: 'Email is required' }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      placeholder="Email"
                      style={styles.input}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                    />
                    {error && <Text style={styles.error}>{error.message}</Text>}
                  </>
                )}
              />

              <Controller
                control={control}
                name="password"
                defaultValue=""
                rules={{ required: 'Password is required' }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      placeholder="Password"
                      secureTextEntry
                      style={styles.input}
                      onChangeText={onChange}
                      value={value}
                    />
                    {error && <Text style={styles.error}>{error.message}</Text>}
                  </>
                )}
              />

              {/* <Button title="Login" onPress={handleSubmit(onSubmit)} /> */}
              <CustomButton outerContainerStyle={{marginTop:10}} buttonText='Login' onPress={handleSubmit(onSubmit)} />
              <Text
                style={styles.link}
                onPress={() => navigation.navigate('Signup')}
              >
                Don't have an account? Sign up
              </Text>
            {/* </View> */}
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    minHeight: width,
    justifyContent: 'center', 
    paddingHorizontal:20, 
  },
  contentContainer:{ 
    paddingHorizontal:18, 
    bottom:20, 
    borderTopEndRadius:28, 
    borderTopStartRadius:28, 
    // backgroundColor:COLOR.tertiary, 
    minHeight: (height - width + 40), 
    elevation:2, 
    shadowColor:COLOR.tertiary, 
    shadowOpacity: 0.5, 
    shadowRadius:5,
    justifyContent:'center',
  },
  imageContainer:{
    justifyContent:'center',
    alignItems:"center",
    width:'100%',
  },
  logo:{ height: LOGO_SIZE, aspectRatio:1},
  header:{
    fontSize:28,
    fontWeight:900,
    textAlign:'center',
    color: COLOR.primaryText,
    textShadowColor:COLOR.white,
    textShadowOffset: 0.7,
    textShadowRadius:2,
  },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { 
    fontSize:18,
    fontWeight:600,
    borderBottomWidth: 1, 
    borderBottomColor:COLOR.primaryText,
    padding: 10, 
    marginBottom: 10, 
    color:COLOR.primaryText 
  },
  error: { color: 'red' },
  link: { marginTop: 20, color: COLOR.primaryText, textAlign: 'center' },
});
