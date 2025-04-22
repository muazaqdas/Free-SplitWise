import React, { useContext } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View, FlatList, TouchableOpacity, Button, } from 'react-native';
import AuthContext from '../../store/context/AuthContext';
import GroupContext from '../../store/context/GroupContext';

const {width, height} = Dimensions.get('screen');

const Home = ({navigation}) => {
    const { signOut } = useContext(AuthContext);
    const { groups } = useContext(GroupContext);
    return (
        <View style={styles.container}>
            <Text>Home Screen</Text>
            <Image style={styles.image} source={require("../../../assets/dino-2.png")}/>
            <View style={styles.innerContainer}>
                <Button title="Create New Group" onPress={() => navigation.navigate('CreateGroup')} />
                <Text style={styles.title}>Your Groups</Text>
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.groupItem}
                        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
                    >
                        <Text style={styles.groupName}>{item.name}</Text>
                        <Text style={styles.memberCount}>{item.members.length} members</Text>
                    </TouchableOpacity>
                    )}
                />
            </View>
            <Pressable style={styles.signOutButton} onPress={signOut}>
                <Text style={styles.signOutButtonText}>
                    Sign Out
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        justifyContent:"center",
        alignItems:"center",
        paddingHorizontal:16,
    },
    image:{
        height: width*0.6,
        aspectRatio:1,
    },
    signOutButton:{
        paddingHorizontal:22,
        paddingVertical:10,
        backgroundColor:"teal",
        borderRadius:22
    },
    signOutButtonText:{
        fontSize:18,
        color:'#fff',
        fontWeight:'700',
    },
    innerContainer: { padding: 16 },
    title: { fontSize: 20, fontWeight: 'bold', marginVertical: 16 },
    groupItem: {
      padding: 16,
      backgroundColor: '#f1f1f1',
      borderRadius: 10,
      marginBottom: 12,
    },
    groupName: { fontSize: 18 },
    memberCount: { fontSize: 14, color: 'gray' },
})

export default Home;
