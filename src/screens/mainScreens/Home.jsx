import React, { useContext } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AuthContext from '../../store/context/AuthContext';

const {width, height} = Dimensions.get('screen');

const Home = () => {
    const { signOut } = useContext(AuthContext);
    return (
        <View style={styles.container}>
            <Text>Home Screen</Text>
            <Image style={styles.image} source={require("../../../assets/dino-2.png")}/>
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
    }
})

export default Home;
