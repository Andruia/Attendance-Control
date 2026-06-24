import { create } from "zustand";

interface PwaState {
  /** Whether the page has loaded with a newer SW waiting to activate */
  updateAvailable: boolean;
  /** The waiting ServiceWorker registration, if any */
  waitingRegistration: ServiceWorkerRegistration | null;
  /** Whether the app can be installed as a PWA */
  canInstall: boolean;
  /** The beforeinstallprompt event, captured for later use */
  installPrompt: Event | null;

  setUpdateAvailable: (registration: ServiceWorkerRegistration) => void;
  clearUpdate: () => void;
  setCanInstall: (prompt: Event) => void;
  clearInstallPrompt: () => void;
}

export const usePwaStore = create<PwaState>()((set) => ({
  updateAvailable: false,
  waitingRegistration: null,
  canInstall: false,
  installPrompt: null,

  setUpdateAvailable: (registration) =>
    set({
      updateAvailable: true,
      waitingRegistration: registration,
    }),

  clearUpdate: () =>
    set({
      updateAvailable: false,
      waitingRegistration: null,
    }),

  setCanInstall: (prompt) =>
    set({
      canInstall: true,
      installPrompt: prompt,
    }),

  clearInstallPrompt: () =>
    set({
      canInstall: false,
      installPrompt: null,
    }),
}));
