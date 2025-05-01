import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, Dimensions, Switch } from 'react-native';
import Constants from 'expo-constants';
import CustomModal from '../global/CustomModal';
import Entypo from '@expo/vector-icons/Entypo';

const { width, height } = Dimensions.get('screen');

export default function PaidByModal({ 
    visible, 
    dismiss, 
    members, 
    selectedContributions, // Array of { personId, amount }
    transactionAmount,     // Total amount of the transaction
    onConfirm,              // Callback with updated paidBy array
    onSelect, 
}) {
    const [isMultiple, setIsMultiple] = useState(false);
    const [contributions, setContributions] = useState([]);

    const [error, setError] = useState('');

    useEffect(() => {
    if (visible) {
        if (selectedContributions?.length) {
        setContributions(selectedContributions);
        } else {
        // default: first person pays full
        setContributions([{ id: members[0].id, amount: transactionAmount }]);
        }
        setIsMultiple(selectedContributions?.length > 1);
    }
    }, [visible]);

    const toggleMember = (id) => {
        if (contributions.find(m => m.id === id)) {
        setContributions(prev => prev.filter(m => m.id !== id));
        } else {
        setContributions(prev => [...prev, { id, amount: 0 }]);
        }
    };

    const updateAmount = (id, value) => {
        const amount = parseFloat(value) || 0;
        setContributions(prev =>
        prev.map(m => m.id === id ? { ...m, amount } : m)
        );
    };

    const handleDone = () => {
        if (isMultiple) {
        const total = contributions.reduce((sum, m) => sum + m.amount, 0);
        console.log('total:', total, transactionAmount);
        if (total > transactionAmount) {
            setError("Total contributions exceed the transaction amount.");
            return;
        } else if (total < transactionAmount) {
            setError("Total contributions do not match the transaction amount.");
            return;
        }
        // onSelect({ type: 'multiple', contributions: selectedMembers });
        onConfirm(contributions);
        } else {
        onConfirm(contributions);
        }
        dismiss();
    };

  return (
    <CustomModal visible={visible} dismiss={dismiss} modalContentStyle={styles.modalContent}>
      <View style={styles.header}>
        <Pressable onPress={dismiss}><Entypo name="cross" size={24} color="black" /></Pressable>
        <Text style={styles.title}>Who Paid</Text>
        <Pressable onPress={handleDone}><Text style={styles.done}>Done</Text></Pressable>
      </View>

      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Multiple Contribution</Text>
        <Switch value={isMultiple} onValueChange={setIsMultiple} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = contributions.some(m => m.id === item.id);
          return (
            <Pressable
              style={[styles.memberRow, isSelected && styles.memberSelected]}
              onPress={() => isMultiple ? toggleMember(item.id) : setContributions([{ id: item.id, amount: transactionAmount }])}
            >
              <Text style={[styles.memberName, isSelected && styles.selectedMemberName]}>
                {item.name}
              </Text>
              {isMultiple && isSelected && (
                <TextInput
                  keyboardType="numeric"
                  style={styles.amountInput}
                  value={String(contributions.find(m => m.id === item.id)?.amount || '')}
                  onChangeText={(val) => updateAmount(item.id, val)}
                  placeholder="Amount"
                />
              )}
            </Pressable>
          );
        }}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    width: width,
    minHeight: height,
    paddingTop: Constants.statusBarHeight+10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  confirmText: {
    fontSize: 16,
    color: 'green',
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  memberSelected: {
    backgroundColor: '#e6ffe6',
    borderColor: 'green',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  amountInput: {
    borderBottomWidth: 1,
    borderColor: '#aaa',
    width: 80,
    textAlign: 'right',
    fontSize: 16,
  },
});
