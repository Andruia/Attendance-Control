"use client";

import { useState, useCallback, useEffect } from "react";
import { useClockStore } from "@/lib/stores/clockStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { addPendingEntry } from "@/lib/offline/dexie";
import { syncManager } from "@/lib/offline/syncManager";
import { Badge } from "@/components/ui/badge";
import { WelcomeScreen } from "./WelcomeScreen";
import { PinKeyboard } from "./PinKeyboard";
import { ClockDashboard } from "./ClockDashboard";

type ViewMode = "welcome" | "pin_entry" | "clock_action";

export function ClockEntry() {
  const [viewMode, setViewMode] = useState<ViewMode>("welcome");
  const [pinError, setPinError] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const { isLoading, clockIn, startBreak, endBreak, clockOut, setLoading, setError } = useClockStore();
  const { isAuthenticated, employeeId, login, logout } = useAuthStore();

  // Track online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track pending count
  useEffect(() => {
    const updatePending = async () => {
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update view mode based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      setViewMode("clock_action");
    }
  }, [isAuthenticated]);

  const handlePINComplete = useCallback(async (pin: string) => {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setPinError(true);
      return;
    }
    setPinError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Invalid PIN");
      }

      const data = await res.json();
      login(data.employeeId, data.name, data.role);
    } catch {
      setPinError(true);
      setLoading(false);
    }
  }, [login, setLoading]);

  const queueOfflineAction = useCallback(
    async (empId: string, action: string, ts: string) => {
      await addPendingEntry({
        employeeId: empId,
        type: action as "clock_in" | "pause_start" | "pause_end" | "clock_out",
        deviceTs: ts,
        synced: false,
        createdAt: new Date().toISOString(),
      });

      // Update local state optimistically
      if (action === "clock_in") clockIn("pending");
      else if (action === "pause_start") startBreak();
      else if (action === "pause_end") endBreak();
      else if (action === "clock_out") clockOut();
    },
    [clockIn, startBreak, endBreak, clockOut],
  );

  const performClockAction = useCallback(
    async (action: "clock_in" | "pause_start" | "pause_end" | "clock_out") => {
      if (!employeeId) return;
      setLoading(true);
      setError(null);

      const deviceTs = new Date().toISOString();

      if (navigator.onLine) {
        try {
          const res = await fetch("/api/clock/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ employeeId, type: action, deviceTs }),
          });

          if (!res.ok) throw new Error("Failed to record clock action");

          const data = await res.json();
          if (action === "clock_in") clockIn(data.id);
          else if (action === "pause_start") startBreak();
          else if (action === "pause_end") endBreak();
          else if (action === "clock_out") clockOut();
        } catch {
          // Fallback: queue offline
          await queueOfflineAction(employeeId, action, deviceTs);
        }
      } else {
        await queueOfflineAction(employeeId, action, deviceTs);
      }

      setLoading(false);
    },
    [employeeId, clockIn, startBreak, endBreak, clockOut, setLoading, setError, queueOfflineAction],
  );

  const handleLogout = useCallback(() => {
    logout();
    useClockStore.getState().reset();
    setViewMode("welcome");
  }, [logout]);

  // Welcome Screen
  if (viewMode === "welcome" && !isAuthenticated) {
    return <WelcomeScreen onContinue={() => setViewMode("pin_entry")} />;
  }

  // PIN Entry Screen
  if (viewMode === "pin_entry" && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Ingresá tu PIN</h1>
            <p className="text-gray-500">4 dígitos para registrar tu asistencia</p>
          </div>

          {/* PIN Keyboard */}
          <PinKeyboard
            length={4}
            onComplete={handlePINComplete}
            disabled={isLoading}
            error={pinError}
          />

          {/* Error Message */}
          {pinError && (
            <div className="text-center">
              <p className="text-red-500 text-sm">PIN inválido. Intente nuevamente.</p>
            </div>
          )}

          {/* Offline Badge */}
          {!isOnline && (
            <Badge variant="warning" className="w-full justify-center">
              Modo Offline — Las acciones se sincronizarán cuando haya conexión
            </Badge>
          )}

          {/* Back Button */}
          <button
            onClick={() => setViewMode("welcome")}
            className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Clock Action Screen
  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Offline/Pending Indicators */}
        {(!isOnline || pendingCount > 0) && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            {!isOnline && <Badge variant="warning">Offline</Badge>}
            {pendingCount > 0 && (
              <Badge variant="outline">{pendingCount} pending</Badge>
            )}
          </div>
        )}

        <ClockDashboard onClockAction={performClockAction} onLogout={handleLogout} />
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
}
