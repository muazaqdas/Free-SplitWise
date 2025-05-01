import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from '@expo/vector-icons'; // Top of file

const CustomHeader = ({ onBackPress, title, onAddMemberPress }) => {
    return (
      <View style={styles.header}>
        <Pressable onPress={onBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Pressable onPress={onAddMemberPress} style={styles.headerButton}>
          <Ionicons name="person-add" size={24} color="black" />
        </Pressable>
      </View>
    );
  };

  const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
})

  export default CustomHeader;