// screens/transaction/TransactionDetail.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupContext from '../../store/context/GroupContext';

export default function TransactionDetail({ route, navigation }) {
  const { transaction, group } = route.params;
  const { removeTransaction } = useContext(GroupContext);


  const handleDelete = () => {
    // You should ideally call removeTransaction from context
    removeTransaction(transaction?.groupId, transaction.id);
    navigation.goBack();
  };

  const handleEdit = () => {
    navigation.popTo('GroupDetail',{ 
        transactionToEdit: transaction,
        groupId: transaction?.groupId
    })
  };
  

  const payers = transaction.paidBy.map(p => {
    const member = group.members.find(m => m.id === p.id);
    return `${member?.name || 'Unknown'} - ₹${p.amount}`;
  }).join('\n');

  const splits = transaction.splits.map(s => {
    const member = group.members.find(m => m.id === s.personId);
    return `${member?.name || 'Unknown'} owes ₹${s.amount}`;
  }).join('\n');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{transaction.description}</Text>
        <View style={styles.icons}>
          <Pressable onPress={handleEdit} style={styles.iconButton}>
            <Ionicons name="create-outline" size={24} color="#4caf50" />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.label}>Amount:</Text>
      <Text style={styles.value}>₹{transaction.amount}</Text>

      <Text style={styles.label}>Paid By:</Text>
      <Text style={styles.value}>{payers}</Text>

      <Text style={styles.label}>Split Among:</Text>
      <Text style={styles.value}>{splits}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  icons: { flexDirection: 'row' },
  iconButton: { marginLeft: 12 },
  label: { marginTop: 20, fontSize: 16, fontWeight: 'bold' },
  value: { fontSize: 16, marginTop: 4, color: '#555' },
});
