import React, { useState } from 'react';
import { Button, Dimensions, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomModal from '../global/CustomModal';

const {width, height} = Dimensions.get('screen')

const AddMemberModal = ({
    isAddMemberModalVisible,
    setAddMemberModalVisible,
    contacts,
    group,
    addContactAsMember,
    handleAddMember,
    newMemberName,
    setNewMemberName
}) => {
    const [search, setSearch] = useState('');
    const handleClose = ()=>{
        setAddMemberModalVisible(false);
    }
    const filteredContacts = contacts.length > 0
    ? contacts.filter((contact) => {
        const isAlreadyAdded = group?.members.some(m => m.id === contact.id);
        return (
            contact.name?.toLowerCase()?.includes(search?.toLowerCase()) &&
            !isAlreadyAdded
        );
        })
    : [];

    const handleAddManualMember = ()=>{
        handleAddMember();
        handleClose();
        return;
    };

    return (
        <CustomModal 
            visible={isAddMemberModalVisible} 
            dismiss={handleClose}
            modalContentStyle={styles.modalContentStyle}
            modalOverlayStyle={styles.modalOverlayStyle}
        >
            <View style={{flexDirection:'row', width:'100%', justifyContent:'space-between', alignItems:'center'}}>
                <Text style={styles.label}>Add Members</Text>
                <Pressable style={styles.closeButton} onPress={handleClose}>
                    <Text>Close</Text>
                </Pressable>
            </View>
            <TextInput
                style={styles.input}
                placeholder="Search contacts"
                value={search}
                onChangeText={setSearch}
            />
            <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                style={{height:150, backgroundColor:"red"}}
                renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactItem} onPress={() => {
                        addContactAsMember(item)
                        handleClose();
                        return;
                    }}
                >
                    <Text>{item.name}</Text>
                </TouchableOpacity>
                )}
            />
            <TextInput
                style={styles.input}
                placeholder="Add member by name"
                value={newMemberName}
                onChangeText={setNewMemberName}
            />
            <Pressable onPress={handleAddManualMember}>
                <Text>Add Member</Text>
            </Pressable>
        </CustomModal>
    );
}

const styles = StyleSheet.create({
    modalOverlayStyle:{
        width:width,
        height:height,
        backgroundColor:"rgba(0,0,0,0.5)",
        justifyContent:'center',
        alignItems:'center',
        paddingHorizontal:22
    },
    modalContentStyle:{
        backgroundColor:'#fff',
        borderRadius:22,
        padding:12
    },
    closeButton:{
        backgroundColor:"pink",
        paddingVertical:8,
        paddingHorizontal:22,
        borderRadius:22,
    },
    input: {
      borderWidth: 1,
      borderColor: '#aaa',
      borderRadius: 8,
      padding: 10,
      marginTop: 16,
      marginBottom: 8,
    },
    label: { 
        fontSize: 16, 
        fontWeight: 'bold',
    },
    contactItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
})

export default AddMemberModal;
