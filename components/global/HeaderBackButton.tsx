import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderBackButtonProps {
  onPress?: () => void;
}

// Replaces native-stack's default back chevron (OS blue tint, larger glyph)
// with one matching the app's own icon sizing/color (see HeaderHomeButton).
export default function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  return (
    <Pressable onPress={onPress} className="items-center justify-center rounded-full px-2 py-2.5 active:scale-95">
      <Ionicons name="chevron-back" size={22} color="#2B2416" />
    </Pressable>
  );
}
