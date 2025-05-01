// components/modals/DateTimeModal.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomModal from '../global/CustomModal';
import CustomTextButton from '../global/CustomTextButton';

const {width, height} = Dimensions.get('screen');

export default function DateTimeModal({ visible, onClose, onDone, initialDate }) {
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate || Date.now()));

  const handleDateChange = (event, date) => {
    if (date) setSelectedDate(date);
  };

  return (
    <CustomModal visible={visible} dismiss={onClose} modalContentStyle={styles.modalContentStyle}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>Pick Date & Time</Text>
          <Pressable onPress={() => onDone(selectedDate)}><Text style={styles.done}>Done</Text></Pressable>
        </View>

        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            style={{ marginBottom: 20 }}
          />
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="spinner"
            onChange={handleDateChange}
          />
        </View>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  title: { fontWeight: 'bold', fontSize: 18 },
  cancel: { color: 'red', fontWeight: 'bold' },
  done: { color: 'green', fontWeight: 'bold' },
  pickerContainer: { alignItems: 'center' }
});
