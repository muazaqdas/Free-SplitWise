import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, Button, Pressable, Alert, StyleSheet, Dimensions, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import Entypo from '@expo/vector-icons/Entypo';
import CustomModal from '../global/CustomModal';
import Transaction from '../../models/Transaction';
import uuid from 'react-native-uuid';
import CustomTextButton from '../global/CustomTextButton';
import PaidByModal from './PaidByModal';
import SplitModal from './SplitModal';
import DateTimeModal from './DateTimeModal';
import NoteModal from './NoteModal';
import RenderIfElse from '../global/RenderIfElse';
import { COLOR } from '../../theme';
const {width, height} = Dimensions.get('screen');
const PADDING_HORIZONTAL = 12;
const MAIN_CONTENT_CONTAINER_WIDTH = width - PADDING_HORIZONTAL*2;
const INPUT_CONTAINER_WIDTH = MAIN_CONTENT_CONTAINER_WIDTH * 0.8;
const INPUT_CONTAINER_GAP = 12;
const ICON_SIZE = 24;
const INPUT_WIDTH = INPUT_CONTAINER_WIDTH - ICON_SIZE - INPUT_CONTAINER_GAP - 20*2;
export default function TransactionModal({
  visible,
  dismiss,
  group,
  addTransaction
}) {

  const [isPaidByModalVisible, setPaidByModalVisible] = useState(false);
  const [isSplitModalVisible, setSplitModalVisible] = useState(false);
  const [isDateTimeModalVisible, setDateTimeModalVisible] = useState(false);
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);

  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [note, setNote] = useState('');


  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  // const [paidBy, setPaidBy] = useState(group?.members[0]?.id || '');
  const [paidByContributions, setPaidByContributions] = useState([]);
  const [isEqualSplit, setIsEqualSplit] = useState(true);
  const [involvedMembers, setInvolvedMembers] = useState(group.members.map(m => m.id));
  const [memberShares, setMemberShares] = useState({});

  const [isFocused, setIsFocused] = useState({
    description: false,
    amount: false,
  });


  const descInputRef = useRef(null);


  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setDesc('');
      setAmount('');
      // setPaidBy(group?.members[0]?.id || '');
      setPaidByContributions([{ id: group?.members[0]?.id || '', amount: 0 }]);
      setIsEqualSplit(true);
      setInvolvedMembers(group.members.map(m => m.id));
      setMemberShares({});
      setSelectedDateTime(new Date());
      setNote('');

      setTimeout(() => {
        descInputRef.current?.focus();
      }, 100); // slight delay to ensure input is mounted

    }
  }, [visible]);

  const handleCreateTransaction = () => {
    const amt = parseFloat(amount);
    if (!desc || isNaN(amt) || amt <= 0) return;

    const totalPaid = paidByContributions.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
    if (Math.abs(totalPaid - amt) > 0.01) {
      Alert.alert("Amount mismatch", "Total paid doesn't equal the transaction amount");
      return;
    }

    let splits = [];
    if (isEqualSplit) {
      const share = +(amt / involvedMembers.length).toFixed(2);
      splits = involvedMembers.map(id => ({ personId: id, amount: share }));
    } else {
      const totalShare = involvedMembers.reduce((acc, id) => acc + (memberShares[id] || 0), 0);
      if (Math.abs(totalShare - amt) > 0.01) {
        Alert.alert("Amount mismatch", "Total split doesn't equal the amount");
        return;
      }
      splits = involvedMembers.map(id => ({
        personId: id,
        amount: +(memberShares[id] || 0).toFixed(2)
      }));
    }

    const tx = new Transaction({
      id: uuid.v4(),
      description: desc,
      amount: amt,
      // paidBy,
      paidBy: paidByContributions,
      splits
    });

    console.log("transaction:", tx);
    addTransaction(group.id, tx);
    dismiss();
  };
  
  return (
    <CustomModal
      visible={visible}
      dismiss={dismiss}
      modalContentStyle={styles.modalContentStyle}
    >
      <KeyboardAvoidingView  
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{flex:1, justifyContent:'space-between' }}>
            <View style={styles.headerContainer}>
              <Pressable onPress={dismiss} style={styles.headerLeft}>
                <Entypo name="cross" size={24} color="black" />
              </Pressable>
              <Text style={styles.headerTitle}>Add an expense</Text>
              <CustomTextButton 
                outerContainerStyle={styles.headerRight}
                buttonText='Save'
                onPress={handleCreateTransaction}
              />
            </View>

            <View>
              <View style={styles.mainContentContainer}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="subtitles" size={ICON_SIZE} color="black" />
                  <TextInput 
                    ref={descInputRef} 
                    placeholder="Description" 
                    placeholderTextColor={isFocused.description && COLOR.primary}
                    value={desc} 
                    onChangeText={setDesc} 
                    style={[styles.input, isFocused.description && styles.inputFocused]}
                    onFocus={() => setIsFocused((prev)=> ({...prev, description:true }))}
                    onBlur={() => setIsFocused((prev)=> ({...prev, description:false }))}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <View style={{alignItems:'center', textAlign:'center', justifyContent:'center', width: ICON_SIZE, height:ICON_SIZE}}>
                    <FontAwesome name="rupee" size={ICON_SIZE} color="black" />
                  </View>
                  <TextInput 
                    placeholder="Amount" 
                    placeholderTextColor={isFocused.amount && COLOR.primary}
                    value={amount} 
                    onChangeText={setAmount} 
                    keyboardType="numeric" 
                    style={[styles.input, isFocused.amount && styles.inputFocused]}
                    onFocus={() => setIsFocused((prev)=> ({...prev, amount:true }))}
                    onBlur={() => setIsFocused((prev)=> ({...prev, amount:false }))}
                  />
                </View>
              </View>

              <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-evenly'}}>
                <Pressable onPress={() => setPaidByModalVisible(true)} style={styles.selectorButton}>
                  <RenderIfElse
                    condition={Array.isArray(paidByContributions) && paidByContributions?.length>1}
                    ifTrue={
                    <>
                    <Text style={styles.selectorButtonText}>
                      Paid by: {paidByContributions.length} people
                    </Text>
                    {/* <Text style={styles.selectorButtonText}>
                      Paid by: {paidByContributions.map(p => {
                        const name = group.members.find(m => m.id === p.id)?.name;
                        return `${name} (${p.amount})`;
                      }).join(', ')}
                    </Text> */}
                    </>
                    }
                    ifFalse={
                      <Text style={styles.selectorButtonText}>
                      Paid by: {group.members.find(m => m.id == paidByContributions[0]?.id)?.name}
                      </Text>
                    }
                  />
                </Pressable>

                <Pressable onPress={() => setSplitModalVisible(true)} style={styles.selectorButton}>
                  <Text style={styles.selectorButtonText}>Split: {isEqualSplit ? 'Equally' : 'Unequally'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Fixed Bottom Buttons */}
            <View style={styles.bottomActionContainer}>
              <Pressable onPress={() => setDateTimeModalVisible(true)} style={styles.footerButton}>
                <Text style={styles.footerButtonText}>
                  {selectedDateTime.toDateString()} • {selectedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
              <Pressable onPress={() => setNoteModalVisible(true)} style={styles.footerButton}>
                <Text style={styles.footerButtonText}>{note ? 'Edit Note' : 'Add Note'}</Text>
              </Pressable>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <PaidByModal
        visible={isPaidByModalVisible}
        dismiss={() => setPaidByModalVisible(false)}
        members={group.members}
        selectedContributions={paidByContributions}
        transactionAmount={parseFloat(amount) || 0}
        onConfirm={(updatedContributions) => setPaidByContributions(updatedContributions)}
      />

      <SplitModal
        visible={isSplitModalVisible}
        dismiss={() => setSplitModalVisible(false)}
        members={group.members}
        defaultSplitType={isEqualSplit ? 'equal' : 'unequal'}
        defaultInvolved={involvedMembers}
        defaultShares={memberShares}
        onConfirm={({ splitType, involvedMembers, shares }) => {
          setIsEqualSplit(splitType === 'equal');
          setInvolvedMembers(involvedMembers);
          setMemberShares(shares);
        }}
        totalAmount={parseFloat(amount) || 0}
      />
      <DateTimeModal
        visible={isDateTimeModalVisible}
        initialDate={selectedDateTime}
        onClose={() => setDateTimeModalVisible(false)}
        onDone={(newDate) => {
          setSelectedDateTime(newDate);
          setDateTimeModalVisible(false);
        }}
      />
      <NoteModal
        visible={isNoteModalVisible}
        initialNote={note}
        onClose={() => setNoteModalVisible(false)}
        onDone={(newNote) => {
          setNote(newNote);
          setNoteModalVisible(false);
        }}
      />
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
    marginBottom: 12,
  },
  headerLeft: {
    position: 'absolute',
    left: 0,
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  modalContentStyle:{ 
    backgroundColor: "#fff", 
    paddingHorizontal: PADDING_HORIZONTAL, 
    paddingTop: Constants.statusBarHeight+10,
    borderRadius: 22,
    width: width,
    minHeight: height,
    justifyContent:'flex-start',
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign:'center',
  },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  input: {
    borderBottomWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    width: INPUT_WIDTH,  
  },
  inputFocused: {
    borderColor: COLOR.primary, // or any focus color
    color: COLOR.primaryText,
  },
  inputContainer:{
    flexDirection:'row',
    alignItems:"center",
    gap:INPUT_CONTAINER_GAP,
    width:"80%",
  },
  mainContentContainer:{
    width: MAIN_CONTENT_CONTAINER_WIDTH,
    justifyContent:'center',
    alignItems:'center',
    paddingVertical:22,
    paddingHorizontal:18
  },

  selectorButton: {
    width: MAIN_CONTENT_CONTAINER_WIDTH/2 - 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginVertical: 6,
    alignSelf: 'center',
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign:'center',
  },


  bottomActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
  },
  footerButtonText: {
    fontSize: 14,
    color: '#333',
  },
});
