import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const NoTransactions = () => (
    <View style={styles.noTransactionsContainer}>
      <Ionicons name="receipt-outline" size={64} color="gray" />
      <Text style={styles.noTransactionsText}>No transactions yet.</Text>
    </View>
  );

  const styles = StyleSheet.create({
    noTransactionsContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    noTransactionsText: {
        marginTop: 10,
        fontSize: 16,
        color: 'gray',
    },
  })
  export default NoTransactions;