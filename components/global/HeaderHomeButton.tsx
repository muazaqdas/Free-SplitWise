import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PAGE_ICONS } from './navIcons';

interface HeaderHomeButtonProps {
  onPress?: () => void;
}

// Root stack renders with headerShown: false (App.tsx), so navigating from a
// nested stack's root screen (GroupsList, Accounts) back up to Home gets no
// native back button — this stands in for one.
export default function HeaderHomeButton({ onPress }: HeaderHomeButtonProps) {
  return (
    <Pressable onPress={onPress} className="items-center justify-center rounded-full px-2 py-2.5 active:scale-95">
      <Ionicons name={PAGE_ICONS.Home} size={22} color="#0f172a" />
    </Pressable>
  );
}
