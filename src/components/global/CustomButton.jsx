import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR } from '../../theme';

const CustomButton = ({
    leftComponent,
    rightComponent,
    outerContainerStyle,
    innerContainerStyle,
    textStyle,
    buttonText='',
    onPress,
    scale = 0.96,
}) => {
    return (
        <Pressable onPress={onPress} style={({pressed}) => [ pressed && { transform: [{ scale: scale }] }, StyleSheet.flatten(outerContainerStyle), styles.outerContainerStyle]}>
            <View style={[StyleSheet.flatten(innerContainerStyle), styles.innerContainerStyle]}>
                {leftComponent}
                <Text style={[StyleSheet.flatten(textStyle), styles.textStyle]}>
                    {buttonText}
                </Text>
                {rightComponent}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    outerContainerStyle:{
        borderRadius:22,
        backgroundColor: COLOR.primaryText,
        padding:10,
    },
    innerContainerStyle:{
        borderRadius:22,
    },
    textStyle:{
        fontSize:18,
        lineHeight:20,
        fontWeight:500,
        color: COLOR.white,
        textAlign:'center',
    }
})

export default CustomButton;
