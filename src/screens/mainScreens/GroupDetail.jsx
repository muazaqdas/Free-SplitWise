import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, TouchableOpacity, Alert, Platform, PermissionsAndroid, Pressable, Dimensions } from 'react-native';
import * as Contacts from 'expo-contacts';
import GroupContext from '../../store/context/GroupContext';
import uuid from 'react-native-uuid';
import Person from '../../models/Person';
import CustomModal from '../../components/global/CustomModal';
import AddMemberModal from '../../components/group/AddMemberModal';

const {width, height} = Dimensions.get('screen')

export default function GroupDetail({ route }) {
    const { groupId } = route.params;
    const { groups, addMember, removeMember } = useContext(GroupContext);
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [isAddMemberModalVisible, setAddMemberModalVisible] = useState(false);

    const group = groups.find(g => g.id === groupId);
    const [newMemberName, setNewMemberName] = useState('');

    if (!group) return <Text>Group not found</Text>;

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

  return (
    <View style={styles.container}>
        <Text style={styles.title}>{group.name}</Text>

        <Text style={styles.subtitle}>Members:</Text>
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
        <Pressable onPress={()=>setAddMemberModalVisible(true)}>
            <Text> Add Member Modal</Text>
        </Pressable>
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
