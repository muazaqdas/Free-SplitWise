import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import CustomTextButton from '../global/CustomTextButton';

export default function AddPersonForm({ onAdd }) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Add person manually"
        value={name}
        onChangeText={setName}
      />
      {/* <Button title="Add" onPress={handleSubmit} /> */}
      <CustomTextButton buttonText='Add' onPress={handleSubmit}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
  },
});
