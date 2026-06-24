"use client";

import { useEffect } from "react";
import { usePwaStore } from "@/lib/stores/pwaStore";

/**
 * PwaRegister handles service worker registration and lifecycle.
 *
 * It runs once on mount and exposes update-available state via Zustand so
 * any component can prompt the user to refresh when a new SW is waiting.
 *
 * This component does NOT render any UI — it's a side-effect-only wrapper.
 * Place it once in the root layout.
 */
export function PwaRegister() {
  const setUpdateAvailable = usePwaStore((s) => s.setUpdateAvailable);
  const setCanInstall = usePwaStore((s) => s.setCanInstall);

  useEffect(() => {
    // ── Service Worker Registration ──────────────────────────────────────
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/worker.js")
      .then((registration) => {
        console.log("[PWA] SW registered:", registration.scope);

        // A new SW is already waiting to activate
        if (registration.waiting) {
          setUpdateAvailable(registration);
        }

        // Detect updates when a new SW takes over
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content is available — prompt the user
              setUpdateAvailable(registration);
            }
          });
        });
      })
      .catch((err) => {
        console.error("[PWA] SW registration failed:", err);
      });

    // Re-check for waiting updates after controller change
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] New SW activated");
    });

    // ── Install Prompt (beforeinstallprompt) ──────────────────────────────
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setCanInstall(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [setUpdateAvailable, setCanInstall]);

  // This component renders nothing — side effects only
  return null;
}
