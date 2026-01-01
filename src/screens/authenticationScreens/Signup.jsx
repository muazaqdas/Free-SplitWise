// screens/authenticationScreens/Signup.js
import React from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import AuthContext from '../../store/context/AuthContext';

const Signup = () => {
  const { control, handleSubmit } = useForm();
  const navigation = useNavigation();
  const { signUp } = useContext(AuthContext);

  const onSubmit = async (data) => {
  try {
    // Save credentials securely on the device
    await SecureStore.setItemAsync('userEmail', data.email);
    await SecureStore.setItemAsync('userPassword', data.password);

    // Call backend API to register user
    const response = await fetch("http://192.168.1.6:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to register");
    }

    // Call signUp context function (to update app state)
    await signUp(data);

    Alert.alert("Success", "User registered successfully!");

    } catch (err) {
    console.log(err);
    Alert.alert("Error", err.message || "Something went wrong during sign up");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>

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

      <Button title="Sign Up" onPress={handleSubmit(onSubmit)} />
      <Text
        style={styles.link}
        onPress={() => navigation.navigate('Login')}
      >
        Already have an account? Log in
      </Text>
    </View>
  );
};

export default Signup;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderBottomWidth: 1, padding: 10, marginBottom: 10 },
  error: { color: 'red' },
  link: { marginTop: 20, color: 'blue', textAlign: 'center' },
});
