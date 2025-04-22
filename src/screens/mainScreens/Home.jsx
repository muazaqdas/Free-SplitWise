import React, { useContext } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View, FlatList, TouchableOpacity, Button, } from 'react-native';
import AuthContext from '../../store/context/AuthContext';
import GroupContext from '../../store/context/GroupContext';
import { COLOR } from '../../theme';

const {width, height} = Dimensions.get('screen');

const Home = ({navigation}) => {
    const { signOut } = useContext(AuthContext);
    const { groups } = useContext(GroupContext);
    return (
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                style={{ backgroundColor: COLOR.tertiary }}
                contentContainerStyle={{ gap:6}}
                ListHeaderComponentStyle={{ backgroundColor: COLOR.tertiary,}}
                ListFooterComponentStyle={{ backgroundColor: COLOR.tertiary, paddingHorizontal:12}}
                renderItem={({ item }) => (
                <View style={{paddingHorizontal:12}}>
                    <TouchableOpacity
                        style={styles.groupItem}
                        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
                    >
                        <Text style={styles.groupName}>{item.name}</Text>
                        <Text style={styles.memberCount}>{item.members.length} members</Text>
                    </TouchableOpacity>
                </View>
                )}
                ListHeaderComponent={
                    <View style={styles.container}>
                        <Image style={styles.image} source={require("../../../assets/dino-2.png")}/>
                        <View style={styles.innerContainer}>
                            <Button title="Create New Group" onPress={() => navigation.navigate('CreateGroup')} />
                            <Text style={styles.title}>Your Groups</Text>
                        </View>
                    </View>
                }
                ListFooterComponent={<Pressable style={styles.signOutButton} onPress={signOut}>
                <Text style={styles.signOutButtonText}>
                    Sign Out
                </Text>
            </Pressable>}
            />

    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        justifyContent:"center",
        alignItems:"center",
        paddingHorizontal:16,
        paddingVertical:22,
        paddingHorizontal:12
    },
    image:{
        height: width*0.6,
        aspectRatio:1,
    },
    signOutButton:{
        paddingHorizontal:22,
        paddingVertical:10,
        backgroundColor:"teal",
        borderRadius:22,
        alignSelf:'center',
    },
    signOutButtonText:{
        fontSize:18,
        color:'#fff',
        fontWeight:'700',
    },
    innerContainer: { padding: 16 },
    title: { 
        fontSize: 20, 
        fontWeight: 'bold',
        textAlign:"center",
    },
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
