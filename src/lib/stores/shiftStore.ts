import { create } from "zustand";

interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface ShiftState {
  shifts: ShiftDefinition[];
  isLoading: boolean;
  error: string | null;

  setShifts: (shifts: ShiftDefinition[]) => void;
  addShift: (shift: ShiftDefinition) => void;
  updateShift: (id: string, data: Partial<ShiftDefinition>) => void;
  removeShift: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchShifts: () => Promise<void>;
}

export const useShiftStore = create<ShiftState>()((set) => ({
  shifts: [],
  isLoading: false,
  error: null,

  setShifts: (shifts) => set({ shifts, isLoading: false }),

  addShift: (shift) =>
    set((state) => ({ shifts: [...state.shifts, shift] })),

  updateShift: (id, data) =>
    set((state) => ({
      shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  removeShift: (id) =>
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  fetchShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/shifts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const shifts = await res.json();
      set({ shifts, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch shifts",
        isLoading: false,
      });
    }
  },
}));
