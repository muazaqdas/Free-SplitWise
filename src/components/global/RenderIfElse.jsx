import React from 'react';
import { StyleSheet, View } from 'react-native';

const RenderIfElse = ({ condition, ifTrue, ifFalse }) => {
    ifTrue = ifTrue || <React.Fragment/>
    ifFalse= ifFalse || <React.Fragment/>
  return (
    <>
      {condition ? ifTrue : ifFalse}
    </>
  );
};

const styles = StyleSheet.create({})

export default RenderIfElse;
