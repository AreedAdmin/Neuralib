import { create } from "zustand";

type FocusModeStore = {
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
};

export const useFocusMode = create<FocusModeStore>((set) => ({
  on: false,
  setOn: (on) => set({ on }),
  toggle: () => set((s) => ({ on: !s.on })),
}));
