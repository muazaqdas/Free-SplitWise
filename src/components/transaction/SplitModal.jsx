
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, FlatList, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import CustomModal from '../global/CustomModal';
import Entypo from '@expo/vector-icons/Entypo';
import { CONSTANT } from '../../utils/constants';

const {width, height} = Dimensions.get('screen');

export default function SplitModal({
  visible,
  dismiss,
  members,
  defaultSplitType = CONSTANT.SPLIT_TYPE.EQUAL,
  defaultInvolved = [],
  defaultShares = {},
  onConfirm,
  totalAmount
}) {
  const [splitType, setSplitType] = useState(defaultSplitType); // 'equal' | 'unequal'
  const [involved, setInvolved] = useState([]);
  const [shares, setShares] = useState({});

  useEffect(() => {
    if (visible) {
      setSplitType(defaultSplitType);
      setInvolved(defaultInvolved);
      setShares(defaultShares);
    }
  }, [visible]);

  const toggleMember = (id) => {
    if (involved.includes(id)) {
      setInvolved(involved.filter(i => i !== id));
      setShares(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } else {
      setInvolved([...involved, id]);
    }
  };

  const handleConfirm = () => {
    const totalEntered = Object.values(shares).reduce((a, b) => a + b, 0);
  
    if (splitType === CONSTANT.SPLIT_TYPE.UNEQUAL && totalEntered !== totalAmount) {
      alert('Total shares must equal the transaction amount.');
      return;
    }
  
    if (splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE && totalEntered !== 100) {
      alert('Total percentages must equal 100%.');
      return;
    }
  
    // Filter involved members based on valid shares for unequal and percentage
    const finalInvolved =
      splitType === CONSTANT.SPLIT_TYPE.EQUAL
        ? involved
        : Object.entries(shares)
            .filter(([_, val]) => val > 0)
            .map(([id]) => id);
  
    const filteredShares =
      splitType === CONSTANT.SPLIT_TYPE.EQUAL
        ? {}
        : Object.fromEntries(
            Object.entries(shares).filter(([_, val]) => val > 0)
          );
  
    const data = {
      splitType,
      involvedMembers: finalInvolved,
      shares: filteredShares,
    };
  console.log("confirm", data);
    onConfirm(data);
    dismiss();
  };
  

  return (
    <CustomModal visible={visible} dismiss={dismiss} modalContentStyle={styles.modalContent}>
      <View style={styles.header}>
        <Pressable onPress={dismiss}>
          <Entypo name="cross" size={24} color="black" />
        </Pressable>
        <Text style={styles.title}>Split Between</Text>
        <Pressable onPress={handleConfirm}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setSplitType(CONSTANT.SPLIT_TYPE.EQUAL)}
          style={[styles.toggleBtn, splitType === CONSTANT.SPLIT_TYPE.EQUAL && styles.toggleSelected]}
        >
          <Text style={[styles.toggleText, splitType === CONSTANT.SPLIT_TYPE.EQUAL && styles.toggleSelectedText]}>
            Equal
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSplitType(CONSTANT.SPLIT_TYPE.UNEQUAL)}
          style={[styles.toggleBtn, splitType === CONSTANT.SPLIT_TYPE.UNEQUAL && styles.toggleSelected]}
        >
          <Text style={[styles.toggleText, splitType === CONSTANT.SPLIT_TYPE.UNEQUAL && styles.toggleSelectedText]}>
            Unequal
          </Text>
        </Pressable>
        <Pressable
            onPress={() => setSplitType(CONSTANT.SPLIT_TYPE.PERCENTAGE)}
            style={[styles.toggleBtn, splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE && styles.toggleSelected]}
            >
            <Text style={[styles.toggleText, splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE && styles.toggleSelectedText]}>
                Percentage
            </Text>
        </Pressable>

      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => {
          const isChecked = involved.includes(item.id);
          return (
            <View style={styles.memberRow}>
              <Pressable
                onPress={() => toggleMember(item.id)}
                style={[
                  styles.checkbox,
                  isChecked && styles.checkboxChecked
                ]}
              >
                {isChecked && <Entypo name="check" size={16} color="white" />}
              </Pressable>
              <Text style={styles.memberName}>{item.name}</Text>
              {(splitType === CONSTANT.SPLIT_TYPE.UNEQUAL || splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE) && isChecked && (
                <TextInput
                    style={styles.input}
                    placeholder={splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE ? "%" : "₹"}
                    keyboardType="numeric"
                    value={shares[item.id]?.toString() || ''}
                    onChangeText={(val) =>
                    setShares((prev) => ({
                        ...prev,
                        [item.id]: parseFloat(val) || 0
                    }))
                    }
                />
                )}
            </View>
          );
        }}
      />
      <View style={{ marginTop: 20 }}>
        {splitType === CONSTANT.SPLIT_TYPE.EQUAL && (
            <>
            <Text style={{ fontWeight: 'bold' }}>
                Each will pay ₹{(totalAmount / involved.length).toFixed(2)} out of ₹{totalAmount}
            </Text>
            <Pressable
                onPress={() => {
                if (involved.length === members.length) {
                    setInvolved([]);
                } else {
                    setInvolved(members.map(m => m.id));
                }
                }}
            >
                <Text style={{ color: 'green', marginTop: 4 }}>
                {involved.length === members.length ? 'Deselect All' : 'Select All'}
                </Text>
            </Pressable>
            </>
        )}

        {splitType === CONSTANT.SPLIT_TYPE.UNEQUAL && (
            <>
            <Text style={{ fontWeight: 'bold' }}>
                Entered ₹{Object.values(shares).reduce((a, b) => a + b, 0)} / ₹{totalAmount}
            </Text>
            <Text style={{ color: 'red' }}>
                ₹{totalAmount - Object.values(shares).reduce((a, b) => a + b, 0)} left to distribute
            </Text>
            </>
        )}

        {splitType === CONSTANT.SPLIT_TYPE.PERCENTAGE && (
            <>
            <Text style={{ fontWeight: 'bold' }}>
                Entered {Object.values(shares).reduce((a, b) => a + b, 0)}% / 100%
            </Text>
            <Text style={{ color: 'red' }}>
                {100 - Object.values(shares).reduce((a, b) => a + b, 0)}% left to assign
            </Text>
            </>
        )}
        </View>

    </CustomModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    minHeight: '50%', 
    width: width,
    minHeight: height,
    paddingTop: Constants.statusBarHeight+10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  done: {
    color: 'green',
    fontWeight: '600',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
  },
  toggleSelected: {
    backgroundColor: '#defee6',
    borderColor: 'green',
  },
  toggleText: {
    fontSize: 14,
  },
  toggleSelectedText: {
    fontWeight: '600',
    color: 'green',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'green',
    borderColor: 'green',
  },
  memberName: {
    flex: 1,
    fontSize: 16,
  },
  input: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 6,
    textAlign: 'right',
  },
});
