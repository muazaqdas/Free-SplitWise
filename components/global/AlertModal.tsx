import { useEffect } from 'react';
import { BackHandler, Modal, Pressable, Text, View } from 'react-native';
import { useAlertStore, type AlertButton } from '../../store/alertStore';

// Mount once at the app root. Renders whatever store/alertStore.ts's
// showAlert() puts in the store, so it stays visually consistent across
// iOS/Android instead of falling back to the native Alert.alert per platform.
export default function AlertModal() {
  const { visible, title, message, buttons, hide } = useAlertStore();

  useEffect(() => {
    if (!visible) return;
    // Mirrors Alert.alert's default Android behavior: back button dismisses
    // without running a button's onPress.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      hide();
      return true;
    });
    return () => subscription.remove();
  }, [visible, hide]);

  function handlePress(button: AlertButton) {
    hide();
    button.onPress?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/40 px-8">
        <View className="w-full max-w-sm rounded-2xl bg-white px-5 py-4">
          <Text className="text-lg font-semibold text-slate-900">{title}</Text>
          {message ? <Text className="mt-2 text-base text-slate-600">{message}</Text> : null}
          <View className="mt-5 flex-row justify-end gap-2">
            {buttons.map((button, index) => (
              <Pressable
                key={index}
                onPress={() => handlePress(button)}
                className="rounded-full px-4 py-2.5 active:scale-95"
              >
                <Text
                  className={`text-base font-semibold ${
                    button.style === 'destructive'
                      ? 'text-red-600'
                      : button.style === 'cancel'
                        ? 'text-slate-500'
                        : 'text-slate-900'
                  }`}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
