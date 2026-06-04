import { create } from 'zustand';
import { stores } from '@utils/storage';
import type { ThemeMode } from '@/types';

interface ThemeStoreState {
  mode: ThemeMode;
  setMode(mode: ThemeMode): void;
}

const KEY = 'theme.mode';

// Default to 'light' for first-launch users. Once they explicitly pick a
// mode in MoreScreen the persisted value takes over, so the default only
// affects users who never toggled it.
const persisted = (stores.prefs.getString(KEY) as ThemeMode | null) ?? 'light';

export const useThemeStore = create<ThemeStoreState>(set => ({
  mode: persisted,
  setMode(mode) {
    stores.prefs.setString(KEY, mode);
    set({ mode });
  },
}));
