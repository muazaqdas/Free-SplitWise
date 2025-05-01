import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { COLOR } from '../../theme';

const { width, height } = Dimensions.get('window');

const CustomModal = ({ 
  children, 
  visible, 
  dismiss, 
  transparent=true, 
  modalContentStyle, 
  modalOverlayStyle, 
  isOutsideTouchCloseDisabled = false 
}) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible, translateY]);

  if (!isVisible) return null;

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback 
        onPress={() => {
          if(!isOutsideTouchCloseDisabled) dismiss();
          else console.log("Modal outside disabled");
        }}
      >
        <View style={[styles.modalOverlay, modalOverlayStyle && StyleSheet.flatten(modalOverlayStyle)]}>
          <KeyboardAvoidingView 
            // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            // keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // You can tweak this
            style={styles.keyboardAvoidingView}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalContent,
                  { transform: [{ translateY }] },
                  modalContentStyle && StyleSheet.flatten(modalContentStyle),
                ]}
              >
                {children}
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};


const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    width: '100%',
    backgroundColor:COLOR.white,
  },
});

export default CustomModal;
