import { create } from "zustand";

export type ClockStatus = "idle" | "clocked_in" | "on_break" | "clocked_out";

interface ClockState {
  status: ClockStatus;
  currentEntryId: string | null;
  clockInTime: string | null; // ISO string
  breakStartTime: string | null; // ISO string
  isLoading: boolean;
  error: string | null;

  setStatus: (status: ClockStatus) => void;
  clockIn: (entryId: string) => void;
  startBreak: () => void;
  endBreak: () => void;
  clockOut: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useClockStore = create<ClockState>()((set) => ({
  status: "idle",
  currentEntryId: null,
  clockInTime: null,
  breakStartTime: null,
  isLoading: false,
  error: null,

  setStatus: (status) => set({ status }),

  clockIn: (entryId) =>
    set({
      status: "clocked_in",
      currentEntryId: entryId,
      clockInTime: new Date().toISOString(),
      breakStartTime: null,
      isLoading: false,
      error: null,
    }),

  startBreak: () =>
    set({
      status: "on_break",
      breakStartTime: new Date().toISOString(),
      isLoading: false,
      error: null,
    }),

  endBreak: () =>
    set({
      status: "clocked_in",
      breakStartTime: null,
      isLoading: false,
      error: null,
    }),

  clockOut: () =>
    set({
      status: "clocked_out",
      currentEntryId: null,
      clockInTime: null,
      breakStartTime: null,
      isLoading: false,
      error: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      status: "idle",
      currentEntryId: null,
      clockInTime: null,
      breakStartTime: null,
      isLoading: false,
      error: null,
    }),
}));
