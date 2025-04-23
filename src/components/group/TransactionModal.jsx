import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, Pressable, Alert, StyleSheet } from 'react-native';
import CustomModal from '../global/CustomModal';
import Transaction from '../../models/Transaction';
import uuid from 'react-native-uuid';

export default function TransactionModal({
  visible,
  dismiss,
  group,
  addTransaction
}) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.id || '');
  const [isEqualSplit, setIsEqualSplit] = useState(true);
  const [involvedMembers, setInvolvedMembers] = useState(group.members.map(m => m.id));
  const [memberShares, setMemberShares] = useState({});

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setDesc('');
      setAmount('');
      setPaidBy(group?.members[0]?.id || '');
      setIsEqualSplit(true);
      setInvolvedMembers(group.members.map(m => m.id));
      setMemberShares({});
    }
  }, [visible]);

  const handleCreateTransaction = () => {
    const amt = parseFloat(amount);
    if (!desc || isNaN(amt) || amt <= 0) return;

    let splits = [];
    if (isEqualSplit) {
      const share = +(amt / involvedMembers.length).toFixed(2);
      splits = involvedMembers.map(id => ({ personId: id, amount: share }));
    } else {
      const totalShare = involvedMembers.reduce((acc, id) => acc + (memberShares[id] || 0), 0);
      if (Math.abs(totalShare - amt) > 0.01) {
        Alert.alert("Amount mismatch", "Total split doesn't equal the amount");
        return;
      }
      splits = involvedMembers.map(id => ({
        personId: id,
        amount: +(memberShares[id] || 0).toFixed(2)
      }));
    }

    const tx = new Transaction({
      id: uuid.v4(),
      description: desc,
      amount: amt,
      paidBy,
      splits
    });

    addTransaction(group.id, tx);
    dismiss();
  };

  return (
    <CustomModal
      visible={visible}
      dismiss={dismiss}
      modalContentStyle={{ backgroundColor: "#fff", paddingHorizontal: 12, borderRadius: 22 }}
      modalOverlayStyle={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12 }}
    >
      <View style={{ paddingVertical: 16 }}>
        <Text style={styles.title}>New Transaction</Text>

        <TextInput placeholder="Description" value={desc} onChangeText={setDesc} style={styles.input} />
        <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />

        <Text style={styles.label}>Paid by:</Text>
        <FlatList
          data={group.members}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => setPaidBy(item.id)} style={{ marginRight: 10 }}>
              <Text style={{
                padding: 8,
                borderWidth: 1,
                borderColor: paidBy === item.id ? 'green' : '#ccc',
                borderRadius: 8
              }}>{item.name}</Text>
            </Pressable>
          )}
        />

        <Text style={styles.label}>Select Members Involved</Text>
        {group.members.map(member => (
          <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => {
              if (involvedMembers.includes(member.id)) {
                setInvolvedMembers(involvedMembers.filter(id => id !== member.id));
              } else {
                setInvolvedMembers([...involvedMembers, member.id]);
              }
            }}>
              <Text style={{
                padding: 4,
                margin: 4,
                borderWidth: 1,
                borderColor: involvedMembers.includes(member.id) ? 'blue' : '#ccc',
                borderRadius: 6
              }}>{member.name}</Text>
            </Pressable>
            {!isEqualSplit && involvedMembers.includes(member.id) && (
              <TextInput
                placeholder="₹"
                keyboardType="numeric"
                style={{ flex: 1, marginLeft: 10 }}
                value={memberShares[member.id]?.toString() || ''}
                onChangeText={(val) => setMemberShares(prev => ({ ...prev, [member.id]: parseFloat(val) || 0 }))}
              />
            )}
          </View>
        ))}

        <Pressable onPress={() => setIsEqualSplit(!isEqualSplit)}>
          <Text style={{ color: 'blue', marginTop: 10 }}>
            {isEqualSplit ? 'Switch to Unequal Split' : 'Switch to Equal Split'}
          </Text>
        </Pressable>

        <Button title="Create Transaction" onPress={handleCreateTransaction} />
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    marginBottom: 8,
  },
});
