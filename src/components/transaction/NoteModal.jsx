// components/modals/NoteModal.js
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import CustomModal from '../global/CustomModal';

const { width, height } = Dimensions.get('screen');

export default function NoteModal({ visible, onClose, onDone, initialNote }) {
  const [note, setNote] = useState(initialNote || '');

  return (
    <CustomModal 
        visible={visible} 
        dismiss={onClose}
        modalContentStyle={styles.modalContentStyle}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>Add Note</Text>
          <Pressable onPress={() => onDone(note)}><Text style={styles.done}>Done</Text></Pressable>
        </View>

        <TextInput
          placeholder="Write a note..."
          value={note}
          onChangeText={setNote}
          style={styles.input}
          multiline
        />
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
    container: { 
        padding: 20, 
        backgroundColor: '#fff', 
        borderRadius: 16 
    },
    modalContentStyle:{
        width: width,
        minHeight: height,
    },
    header: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
    },
    title: { fontWeight: 'bold', fontSize: 18 },
    cancel: { color: 'red', fontWeight: 'bold' },
    done: { color: 'green', fontWeight: 'bold' },
    input: {
        borderColor: '#ccc', 
        borderWidth: 1, 
        borderRadius: 10, 
        padding: 10, 
        minHeight: 100, 
        textAlignVertical: 'top',
    }
});
