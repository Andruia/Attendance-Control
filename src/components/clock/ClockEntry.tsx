"use client";

import { useState, useCallback, useEffect } from "react";
import { useClockStore } from "@/lib/stores/clockStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { addPendingEntry } from "@/lib/offline/dexie";
import { syncManager } from "@/lib/offline/syncManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ClockEntry() {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const { status, isLoading, clockInTime, breakStartTime, error, clockIn, startBreak, endBreak, clockOut, setLoading, setError } = useClockStore();
  const { isAuthenticated, employeeId, name, role, login, logout } = useAuthStore();

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

  const handlePINSubmit = useCallback(async () => {
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setPinError("PIN must be 4-6 digits");
      return;
    }
    setPinError(null);
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
      setPin("");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  }, [pin, login, setLoading]);

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

  // PIN login screen
  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Clock In</CardTitle>
          <CardDescription>Enter your PIN to start</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="4-6 digit PIN"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePINSubmit()}
              autoFocus
              className="text-center text-2xl tracking-widest"
            />
            {pinError && <p className="mt-1 text-sm text-destructive">{pinError}</p>}
          </div>
          <Button
            onClick={handlePINSubmit}
            disabled={isLoading || pin.length < 4}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Verifying..." : "Verify PIN"}
          </Button>
          {!isOnline && (
            <Badge variant="warning" className="w-full justify-center">
              Offline Mode — Actions will sync when online
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  // Clock action screen
  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Hello, {name}</CardTitle>
          <div className="flex items-center gap-2">
            {!isOnline && <Badge variant="warning">Offline</Badge>}
            {pendingCount > 0 && (
              <Badge variant="outline">{pendingCount} pending</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Role: {role}
          {!isOnline && " — Offline mode"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "idle" && (
          <Button
            onClick={() => performClockAction("clock_in")}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Processing..." : "Clock In"}
          </Button>
        )}

        {status === "clocked_in" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
              <p className="text-lg font-semibold">Clocked In</p>
              {clockInTime && (
                <p className="text-sm">{new Date(clockInTime).toLocaleTimeString()}</p>
              )}
            </div>
            <Button
              onClick={() => performClockAction("pause_start")}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              {isLoading ? "Processing..." : "Start Break"}
            </Button>
            <Button
              onClick={() => performClockAction("clock_out")}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              {isLoading ? "Processing..." : "Clock Out"}
            </Button>
          </div>
        )}

        {status === "on_break" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-yellow-50 p-4 text-center text-yellow-700">
              <p className="text-lg font-semibold">On Break</p>
              {breakStartTime && (
                <p className="text-sm">Since {new Date(breakStartTime).toLocaleTimeString()}</p>
              )}
            </div>
            <Button
              onClick={() => performClockAction("pause_end")}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              {isLoading ? "Processing..." : "Resume"}
            </Button>
          </div>
        )}

        {status === "clocked_out" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-700">
              <p className="text-lg font-semibold">Session Complete</p>
              <p className="text-sm">You have clocked out</p>
            </div>
            <Button
              onClick={() => performClockAction("clock_in")}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Clock In Again"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={() => {
            logout();
            useClockStore.getState().reset();
          }}
          variant="ghost"
          className="w-full"
        >
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}
