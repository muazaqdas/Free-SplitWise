import { create } from 'zustand';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

interface PersonalUiState {
  // Month selected on the category-breakdown and monthly-budget screens.
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

// UI-only state (CLAUDE.md Section 2: Zustand never mirrors persisted data —
// SQLite via /repositories and /services is the source of truth).
export const usePersonalUiStore = create<PersonalUiState>((set) => ({
  selectedMonth: currentMonth(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
}));
