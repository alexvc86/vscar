'use client';
import type { TierOverride } from '@vscar/ui/visual-tier';
import { create } from 'zustand';

/**
 * Estado EFÍMERO de UI (Zustand). El escenario NO vive aquí: su fuente de verdad es la URL.
 */
interface UiState {
  sheetOpen: boolean;
  /** Selector de vehículo abierto para el lado A o B (página de comparación). */
  pickerSide?: 'a' | 'b' | undefined;
  activeChapter?: string;
  /** Override de tier solo en desarrollo (`?tier=`). */
  tierOverride: TierOverride;
  openSheet: () => void;
  setSheetOpen: (open: boolean) => void;
  openPicker: (side: 'a' | 'b') => void;
  closePicker: () => void;
  setActiveChapter: (id: string) => void;
  setTierOverride: (t: TierOverride) => void;
}

export const useUi = create<UiState>((set) => ({
  sheetOpen: false,
  tierOverride: 'AUTO',
  openSheet: () => set({ sheetOpen: true }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
  openPicker: (pickerSide) => set({ pickerSide }),
  closePicker: () => set({ pickerSide: undefined }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
  setTierOverride: (tierOverride) => set({ tierOverride }),
}));
