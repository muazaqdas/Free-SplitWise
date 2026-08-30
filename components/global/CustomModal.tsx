import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface CustomModalProps {
  children: ReactNode;
  visible: boolean;
  dismiss: () => void;
  overlayClassName?: string;
  contentClassName?: string;
  isOutsideTouchCloseDisabled?: boolean;
}

export default function CustomModal({
  children,
  visible,
  dismiss,
  overlayClassName = '',
  contentClassName = '',
  isOutsideTouchCloseDisabled = false,
}: CustomModalProps) {
  const translateY = useRef(new Animated.Value(height)).current;
  const [isVisible, setIsVisible] = useState(visible);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: height, duration: 300, useNativeDriver: true }).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible, translateY]);

  if (!isVisible) return null;

  return (
    <View className="absolute inset-0" style={{ zIndex: 999, elevation: 999 }}>
      <TouchableWithoutFeedback onPress={() => !isOutsideTouchCloseDisabled && dismiss()}>
        <View className={`flex-1 justify-end ${overlayClassName}`}>
          <KeyboardAvoidingView className="w-full">
            <TouchableWithoutFeedback>
              <Animated.View
                className={`w-full bg-white ${contentClassName}`}
                style={{ transform: [{ translateY }], marginBottom: insets.bottom }}
              >
                {children}
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}
