import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, TouchableOpacity, Alert, Platform, PermissionsAndroid, Pressable, Dimensions } from 'react-native';
import * as Contacts from 'expo-contacts';
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
    const { groups, addMember, removeMember, addTransaction } = useContext(GroupContext);
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

    if (!group) return <Text>Group not found</Text>;

    const currentUserId = group?.members[0]?.id;


    const renderTransactionItem = ({ item }) => {
        const payer = group.members.find(m => m.id === item.paidBy);
        const currentSplit = item.splits.find(s => s.personId === currentUserId);
      
        let note = '';
        if (item.paidBy === currentUserId) {
          const othersOwe = item.splits
            .filter(s => s.personId !== currentUserId)
            .reduce((sum, s) => sum + s.amount, 0);
          note = `You will receive ₹${othersOwe.toFixed(2)} from others`;
        } else if (currentSplit) {
          note = `You owe ₹${currentSplit.amount.toFixed(2)} to ${payer?.name}`;
        }
      
        return (
          <TouchableOpacity onPress={() => {/* navigate to detail */}}>
            <Text style={styles.txItem}>
              {item.description} - ₹{item.amount} by {payer?.name}
            </Text>
            {note ? <Text style={{ fontSize: 12, color: 'gray' }}>{note}</Text> : null}
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
