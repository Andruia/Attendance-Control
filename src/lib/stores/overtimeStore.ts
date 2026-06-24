import { create } from "zustand";

interface OvertimeConfig {
  companyId: string;
  dailyThresholdMinutes: number;
  weeklyThresholdMinutes: number;
  roundingMinutes: number;
  roundingStrategy: "nearest" | "up" | "down";
  multiplier1_25xMinutes: number;
  multiplier1_5xHours: number;
  multiplier2xWeekends: boolean;
}

interface OvertimeState {
  config: OvertimeConfig | null;
  isLoading: boolean;
  error: string | null;

  setConfig: (config: OvertimeConfig) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchConfig: () => Promise<void>;
  updateConfig: (data: Partial<OvertimeConfig>) => Promise<void>;
}

export const useOvertimeStore = create<OvertimeState>()((set) => ({
  config: null,
  isLoading: false,
  error: null,

  setConfig: (config) => set({ config, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/overtime/config", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch overtime config");
      const config = await res.json();
      set({ config, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch config",
        isLoading: false,
      });
    }
  },

  updateConfig: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/overtime/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update overtime config");
      const config = await res.json();
      set({ config, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update config",
        isLoading: false,
      });
    }
  },
}));
