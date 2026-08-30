import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  show: (title: string, message?: string, buttons?: AlertButton[]) => void;
  hide: () => void;
}

// UI-only state (CLAUDE.md Section 2: Zustand never mirrors persisted data).
// Drives the single <AlertModal /> mounted at the app root in place of
// RN's Alert.alert, so alerts render with consistent styling on iOS/Android.
export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: undefined,
  buttons: [],
  show: (title, message, buttons) =>
    set({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    }),
  hide: () => set({ visible: false }),
}));

// Drop-in replacement for Alert.alert(title, message?, buttons?).
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  useAlertStore.getState().show(title, message, buttons);
}
