import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import uuid from 'react-native-uuid';
import Person from '../../models/Person';
import Group from '../../models/Group';
import AddPersonForm from '../../components/group/AddPersonForm';
import GroupContext from '../../store/context/GroupContext';

export default function CreateGroup({ navigation }) {

  const { addGroup } = useContext(GroupContext);

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');

  const addContactAsMember = (contact) => {
    const exists = members.some(m => m.id === contact.id);
    if (exists) return; // Prevent duplicate

    const person = new Person({
      id: contact.id,
      name: contact.name,
      phoneNumber: contact.phoneNumbers[0].number,
      isContact: true
    });
    setMembers(prev => [...prev, person]);
  };

  const addManualPerson = (name) => {
    if (!name.trim()) return;

    const exists = members.some(m => m.name.toLowerCase() === name.trim().toLowerCase() && !m.isContact);
    if (exists) return; // Avoid duplicate manual entries

    const person = new Person({
      id: uuid.v4(),
      name,
      isContact: false
    });
    setMembers(prev => [...prev, person]);
  };

  const handleCreateGroup = () => {
    const group = new Group({
      id: uuid.v4(),
      name: groupName,
      members
    });

    // Save group to state/store/backend here
    addGroup(group);
    navigation.goBack();
  };

//   const filteredContacts = contacts.length>0 ? contacts.filter((contact) =>
//     contact.name?.toLowerCase()?.includes(search?.toLowerCase())
//   ) : [];

    const filteredContacts = contacts.length > 0
    ? contacts.filter((contact) => {
        const isAlreadyAdded = members.some(m => m.id === contact.id);
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
      <Text style={styles.label}>Group Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter group name"
        value={groupName}
        onChangeText={setGroupName}
      />

      <Text style={styles.label}>Add Members</Text>
      <TextInput
        style={styles.input}
        placeholder="Search contacts"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        style={styles.contactList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.contactItem} onPress={() => addContactAsMember(item)}>
            <Text style={styles.contactListItem}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <AddPersonForm onAdd={addManualPerson} />

      <Text style={styles.label}>Added Members</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        style={styles.addedMemberList}
        renderItem={({ item }) => <Text style={styles.member}>{item.name}</Text>}
      />

      <Button title="Create Group" onPress={handleCreateGroup} disabled={!groupName || members.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  contactItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addedMemberList:{
    height:120,
    backgroundColor:"orange"
  },
  member: {
    padding: 10,
    fontSize: 14,
    color:'#fff',
    fontWeight:600,
  },
  contactList:{
    height:120,
    backgroundColor:"red"
  },
  contactListItem:{
    color:'#fff',
    fontWeight:600,
  },

});
