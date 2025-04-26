import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, TouchableOpacity, Alert, Platform, PermissionsAndroid, Pressable, Dimensions } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons'; // Top of file
import GroupContext from '../../store/context/GroupContext';
import uuid from 'react-native-uuid';
import Person from '../../models/Person';
import CustomModal from '../../components/global/CustomModal';
import AddMemberModal from '../../components/group/AddMemberModal';
import Transaction from '../../models/Transaction';
import TransactionModal from '../../components/transaction/TransactionModal';

const {width, height} = Dimensions.get('screen')

export default function GroupDetail({ route, navigation }) {
    const { groupId } = route.params;
    const { groups, addMember, removeMember, addTransaction, removeTransaction } = useContext(GroupContext);
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [isAddMemberModalVisible, setAddMemberModalVisible] = useState(false);

    const group = groups.find(g => g.id === groupId);
    const [newMemberName, setNewMemberName] = useState('');

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(group?.members[0]?.id || '');
    
    const [showAddTxModal, setShowAddTxModal] = useState(false);
    const [isEqualSplit, setIsEqualSplit] = useState(true);
    const [involvedMembers, setInvolvedMembers] = useState(group.members.map(m => m.id));
    const [memberShares, setMemberShares] = useState({});
    const [showMembers, setShowMembers] = useState(true);
    const [isEditing, setEditing] = useState(false);


    if (!group) return <Text>Group not found</Text>;

    const currentUserId = group?.members[0]?.id;


    const renderTransactionItem = ({ item }) => {
      const payers = item.paidBy.map(entry => {
        const member = group.members.find(m => m.id === entry.id);
        return member ? `${member.name} (₹${entry.amount})` : `Unknown (₹${entry.amount})`;
      }).join(', ');
    
      const currentSplit = item.splits.find(s => s.personId === currentUserId);
    
      let note = '';
      const currentUserPaidEntry = item.paidBy.find(entry => entry.id === currentUserId);
    
      if (currentUserPaidEntry) {
        const othersOwe = item.splits
          .filter(s => s.personId !== currentUserId)
          .reduce((sum, s) => sum + s.amount, 0);
        note = `You will receive ₹${othersOwe.toFixed(2)} from others`;
      } else if (currentSplit) {
        const totalPaid = item.paidBy.reduce((sum, p) => sum + p.amount, 0);
    
        if (item.paidBy.length === 1) {
          const payerMember = group.members.find(m => m.id === item.paidBy[0].id);
          note = `You owe ₹${currentSplit.amount.toFixed(2)} to ${payerMember?.name || 'Unknown'}`;
        } else {
          const owedParts = item.paidBy.map(p => {
            const shareRatio = p.amount / totalPaid;
            const owedAmount = shareRatio * currentSplit.amount;
            const payerMember = group.members.find(m => m.id === p.id);
            return `${payerMember?.name || 'Unknown'} ₹${owedAmount.toFixed(2)}`;
          }).join(', ');
          note = `You owe: ${owedParts}`;
        }
      }
    
      const handleDeleteTransaction = () => {
        Alert.alert(
          'Delete Transaction',
          'Are you sure you want to delete this transaction?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              onPress: () => {
                // You need a function to remove transaction in GroupContext
                group.transactions = group.transactions.filter(txn => txn.id !== item.id);
                removeTransaction(groupId, item.id);
                // Best practice: Create removeTransaction(groupId, transactionId) in context!
              },
              style: 'destructive'
            }
          ]
        );
      };
    
      return (
        <TouchableOpacity 
          onPress={() => navigation.navigate('TransactionDetail', { transaction: item, group })}
          style={styles.txCard}
        >
          <View style={styles.txHeader}>
            <View>
              <Text style={styles.txTitle}>{item.description}</Text>
              <Text style={{ fontSize: 12, color: 'gray' }}>Paid by: {payers}</Text>
              {note ? <Text style={{ fontSize: 12, color: 'gray' }}>{note}</Text> : null}
            </View>
            <Pressable onPress={handleDeleteTransaction}>
              <Ionicons name="trash-outline" size={20} color="red" />
            </Pressable>
          </View>
        </TouchableOpacity>
      );
    };
    
    

    const addContactAsMember = (contact) => {
        const person = new Person({
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phoneNumbers[0].number,
            isContact: true
        });
    
        addMember(groupId, person); // ✅ Properly updates the context
    };
    

    const handleAddMember = () => {
        if (!newMemberName.trim()) return;

        const newPerson = new Person({
        id: uuid.v4(),
        name: newMemberName.trim(),
        isContact: false,
        });

        addMember(groupId, newPerson);
        setNewMemberName('');
    };

    const handleRemoveMember = (memberId) => {
        Alert.alert(
        'Remove Member',
        'Are you sure you want to remove this member?',
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', onPress: () => removeMember(groupId, memberId), style: 'destructive' }
        ]
        );
    };

    // const filteredContacts = contacts.length>0 ? contacts.filter((contact) =>
    //     contact.name?.toLowerCase()?.includes(search?.toLowerCase())
    // ) : [];

    const filteredContacts = contacts.length > 0
    ? contacts.filter((contact) => {
        const isAlreadyAdded = group?.members.some(m => m.id === contact.id);
        return (
            contact.name?.toLowerCase()?.includes(search?.toLowerCase()) &&
            !isAlreadyAdded
        );
        })
    : [];

    useEffect(() => {
        (async () => {
        if (Platform.OS === 'android') {
            const permission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS
            );
            if (permission !== PermissionsAndroid.RESULTS.GRANTED) return;
        }
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers],
            });
            setContacts(data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0));
        }
        })();
    }, []);

    useEffect(() => {
      if (route.params?.transactionToEdit) {
        // console.log("transactionToEdit:", route.params?.transactionToEdit);
        // const tx = route.params.transactionToEdit;
        // setDesc(tx.description);
        // setAmount(tx.amount.toString());
        // setPaidBy(tx.paidBy[0]?.id || ''); 
        // setIsEqualSplit(tx.splitType === 'equal');
        // setInvolvedMembers(tx.splits.map(s => s.personId));
        // const shares = {};
        // tx.splits.forEach(s => {
        //   shares[s.personId] = s.amount;
        // });
        // setMemberShares(shares);
        setEditing(true);
        setShowAddTxModal(true);
      }
    }, [route.params?.transactionToEdit]);
    

    useLayoutEffect(()=>{
      navigation.setOptions({
        headerShown: !showAddTxModal
      })
    },[showAddTxModal])

  return (
    <View style={styles.container}>
        <Text style={styles.title}>{group.name}</Text>

        <Text style={styles.subtitle}>Members:</Text>
        <Button title={showMembers ? 'Hide Members' : 'Show Members'} onPress={() => setShowMembers(!showMembers)} />
        {showMembers && (
            <FlatList
                data={group.members}
                keyExtractor={(item) => item.id}
                style={styles.membersList}
                renderItem={({ item }) => (
                <TouchableOpacity onLongPress={() => handleRemoveMember(item.id)}>
                    <Text style={styles.member}>{item.name}</Text>
                </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No members added.</Text>}
            />
        )}
        <Pressable onPress={()=>setAddMemberModalVisible(true)}>
            <Text> Add Member Modal</Text>
        </Pressable>
        <FlatList
            data={group.transactions}
            keyExtractor={(item)=> item.id}
            renderItem={renderTransactionItem}
        />
        <Button title="Add New Transaction" onPress={() => setShowAddTxModal(true)} />
        <TransactionModal 
            visible={showAddTxModal}
            dismiss={() => setShowAddTxModal(false)}
            group={group}
            addTransaction={addTransaction}
            groupId={groupId}
            isEditing={isEditing}
            transaction={route.params?.transactionToEdit}
        />
        <AddMemberModal 
            isAddMemberModalVisible={isAddMemberModalVisible}
            setAddMemberModalVisible={setAddMemberModalVisible}
            group={group}
            contacts={contacts}
            addContactAsMember={addContactAsMember}
            handleAddMember={handleAddMember}
            newMemberName={newMemberName}
            setNewMemberName={setNewMemberName}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex:1,
    padding: 16,
  },
  membersList:{
    height:120,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 18, marginTop: 16 },
  member: { fontSize: 16, paddingVertical: 8, paddingHorizontal: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  empty: { color: 'gray', marginVertical: 10 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  contactItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
