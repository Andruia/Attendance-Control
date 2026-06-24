import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  employeeId: string | null;
  name: string | null;
  role: "employee" | "supervisor" | "admin" | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (employeeId: string, name: string, role: "employee" | "supervisor" | "admin") => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      employeeId: null,
      name: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,

      login: (employeeId, name, role) =>
        set({
          employeeId,
          name,
          role,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          employeeId: null,
          name: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        employeeId: state.employeeId,
        name: state.name,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
