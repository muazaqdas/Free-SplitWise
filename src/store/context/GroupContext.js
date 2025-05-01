import React, { createContext, useReducer } from 'react';
import Group from '../../models/Group';

const GroupContext = createContext();

const initialState = {
  groups: []
};

function groupReducer(state, action) {
  switch (action.type) {
    case 'ADD_GROUP':
      return {
        ...state,
        groups: [...state.groups, action.payload]
      };
    case 'REMOVE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(g => g.id !== action.payload)
      };
    case 'ADD_MEMBER':
    return {
        ...state,
        groups: state.groups.map(group =>
        group.id === action.payload.groupId
            ? { ...group, members: [...group.members, action.payload.member] }
            : group
        )
    };
    
    case 'REMOVE_MEMBER':
    return {
        ...state,
        groups: state.groups.map(group =>
        group.id === action.payload.groupId
            ? {
                ...group,
                members: group.members.filter(member => member.id !== action.payload.memberId)
            }
            : group
        )
    };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        groups: state.groups.map(group => {
          if(group.id === action.payload.groupId){
            const updatedTransactions = action.payload.isEditing
            ?  group.transactions.map(tx => tx.id === action.payload.transaction.id ? action.payload.transaction : tx)
            : [...group?.transactions || [], action.payload.transaction];
            
            return { ...group, transactions: updatedTransactions };
          }
            return group;
        })
      };

    case 'REMOVE_TRANSACTION':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? {
                ...group,
                transactions: (group.transactions || []).filter(t => t.id !== action.payload.transactionId)
              }
            : group
        )
      };

    default:
      return state;
  }
}

export const GroupProvider = ({ children }) => {
  const [state, dispatch] = useReducer(groupReducer, initialState);

// Group
  const addGroup = (group) => {
    console.log("addGroup:", group);
    dispatch({ type: 'ADD_GROUP', payload: group });
  };

  const removeGroup = (groupId) => {
    dispatch({ type: 'REMOVE_GROUP', payload: groupId });
  };

// Group Member
  const addMember = (groupId, member) => {
    dispatch({ type: 'ADD_MEMBER', payload: { groupId, member } });
  };
  
  const removeMember = (groupId, memberId) => {
    dispatch({ type: 'REMOVE_MEMBER', payload: { groupId, memberId } });
  };

// Transaction
  const addTransaction = (groupId, transaction, isEditing = false) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: { groupId, transaction, isEditing } });
  };
  
  const removeTransaction = (groupId, transactionId) => {
    dispatch({ type: 'REMOVE_TRANSACTION', payload: { groupId, transactionId } });
  };
  

  return (
    <GroupContext.Provider value={{ 
        groups: state.groups, 
        addGroup, 
        removeGroup, 
        addMember,
        removeMember, 
        addTransaction, 
        removeTransaction 
      }}>
      {children}
    </GroupContext.Provider>
  );
};

export default GroupContext;
