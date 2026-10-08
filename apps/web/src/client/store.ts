'use client';
import type { TierOverride } from '@vscar/ui/visual-tier';
import { create } from 'zustand';

/**
 * Estado EFÍMERO de UI (Zustand). El escenario NO vive aquí: su fuente de verdad es la URL.
 */
interface UiState {
  sheetOpen: boolean;
  activeChapter?: string;
  /** Override de tier solo en desarrollo (`?tier=`). */
  tierOverride: TierOverride;
  openSheet: () => void;
  setSheetOpen: (open: boolean) => void;
  setActiveChapter: (id: string) => void;
  setTierOverride: (t: TierOverride) => void;
}

export const useUi = create<UiState>((set) => ({
  sheetOpen: false,
  tierOverride: 'AUTO',
  openSheet: () => set({ sheetOpen: true }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
  setTierOverride: (tierOverride) => set({ tierOverride }),
}));
