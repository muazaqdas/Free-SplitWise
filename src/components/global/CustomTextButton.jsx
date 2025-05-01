import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR } from '../../theme';

const CustomTextButton = ({
    outerContainerStyle,
    textStyle,
    buttonText='',
    onPress,
    scale = 0.96,
}) => {
    return (
        <Pressable onPress={onPress} style={({pressed}) => [ pressed && { transform: [{ scale: scale }] }, StyleSheet.flatten(outerContainerStyle), styles.outerContainerStyle]}>
            <Text style={[styles.textStyle, StyleSheet.flatten(textStyle)]}>{buttonText}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    outerContainerStyle:{
        borderRadius:22,
        padding:10,
        justifyContent:'center',
        alignItems:"center",
    },
    textStyle:{
        fontSize:18,
        lineHeight:20,
        fontWeight:700,
        textAlign:'center',
        color: COLOR.primaryText,
    }
})

export default CustomTextButton;
