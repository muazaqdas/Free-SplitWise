import React from 'react';
import { Modal, View, Text, FlatList, StyleSheet, Pressable, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../global/CustomModal';
const {width, height} = Dimensions.get('screen');

export default function GroupMembersModal({ visible, dismiss, members }) {
  return (
    <CustomModal
      visible={visible}
      dismiss={dismiss}
      modalContentStyle={styles.modalContentStyle}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Group Members</Text>
            <Pressable onPress={dismiss}>
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          </View>
          <FlatList
            data={members}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Text style={styles.memberItem}>{item.name}</Text>
            )}
            ListEmptyComponent={<Text>No members yet.</Text>}
          />
        </View>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  modalContentStyle:{ 
    backgroundColor: "#fff", 
    paddingHorizontal: 16, 
    paddingTop: Constants.statusBarHeight+10,
    borderRadius: 22,
    width: width,
    minHeight: height,
    justifyContent: 'center', 
    alignItems: 'center'
  },
  // overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  memberItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
