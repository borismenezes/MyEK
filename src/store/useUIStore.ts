import { create } from 'zustand';

/**
 * Lightweight cross-screen UI state. Lifted out of individual screens
 * when the same surface needs to be openable from more than one trigger
 * — currently the Employee ID sheet (tap on a profile photo *and* shake
 * gesture detected at app root).
 *
 * Kept deliberately small. Per-screen UI state should still live in the
 * screen; only promote to this store when more than one caller needs to
 * drive the same surface.
 */
interface UIStoreState {
  idSheetVisible: boolean;
  setIdSheetVisible(visible: boolean): void;
}

export const useUIStore = create<UIStoreState>(set => ({
  idSheetVisible: false,
  setIdSheetVisible(visible) {
    set({ idSheetVisible: visible });
  },
}));
