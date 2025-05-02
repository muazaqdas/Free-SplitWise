import React from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import CustomTextButton from '../global/CustomTextButton';

export default function AddPersonForm({ onAdd }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      contactNumber: '',
    },
  });

  const onSubmit = (data) => {
    onAdd(data.name.trim(), data.phoneNumber.trim());
    reset(); // reset form after submission
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Person Manually</Text>
      <View style={styles.innerContainer}>
        <View style={styles.inputWrapper}>
          <Controller
            control={control}
            name="name"
            rules={{ required: 'Name is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
        </View>

        <View style={styles.inputWrapper}>
          <Controller
            control={control}
            name="phoneNumber"
            rules={{
              required: 'Phone number is required',
              pattern: {
                // value: /^[0-9]+$/,
                value: /^\d{10}$/,
                message: 'Phone number must be numeric',
              },
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="Phone Number"
                value={value}
                onChangeText={onChange}
                maxLength={10}
              />
            )}
          />
          {errors.contactNumber && (
            <Text style={styles.errorText}>{errors.contactNumber.message}</Text>
          )}
        </View>

        <CustomTextButton buttonText="Add" onPress={handleSubmit(onSubmit)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  innerContainer: {
    marginTop: 8,
  },
  inputWrapper: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
