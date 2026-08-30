import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Single source of truth for which icon represents each top-level page
// (RootStackParamList route names). Referenced by HomeScreen's entry
// buttons and by HeaderHomeButton's "back to Home" affordance on nested
// stacks — change an icon here and it updates everywhere at once.
export const PAGE_ICONS = {
  Home: 'home-outline',
  Personal: 'wallet-outline', // shown in the UI as "Personal Budget" / "Accounts"
  Groups: 'people-outline',
} as const satisfies Record<string, IoniconName>;

export type PageName = keyof typeof PAGE_ICONS;
