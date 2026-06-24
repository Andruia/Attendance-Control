/**
 * Client-side sync manager.
 *
 * Triggers sync on:
 * - Browser online event (reconnect)
 * - App focus (visibility change)
 * - Manual trigger from UI
 *
 * Uses the Background Sync API when available,
 * falls back to sync-on-focus otherwise.
 */

import { getUnsyncedEntries, markSynced, updateSyncMeta } from "./dexie";

export type SyncStatus = "idle" | "syncing" | "completed" | "error";

type SyncCallback = (status: SyncStatus, error?: string) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: Set<SyncCallback> = new Set();
  private initialized = false;

  /**
   * Initialize the sync manager: register event listeners.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Sync on reconnect
    window.addEventListener("online", () => {
      console.log("[SyncManager] Online detected — triggering sync");
      this.sync();
    });

    // Sync on app focus (fallback for browsers without Background Sync)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log("[SyncManager] App focused — triggering sync");
        this.sync();
      }
    });

    // Register background sync if available
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-time-entries").catch((err: unknown) => {
          console.warn("[SyncManager] Background Sync registration failed:", err);
        });
      });
    }

    // Initial sync on load
    setTimeout(() => this.sync(), 2000);
  }

  /**
   * Trigger a sync cycle.
   */
  async sync(): Promise<SyncStatus> {
    if (this.isSyncing) return "syncing";
    if (!navigator.onLine) {
      this.notifyListeners("idle");
      return "idle";
    }

    this.isSyncing = true;
    this.notifyListeners("syncing");

    try {
      const pendingEntries = await getUnsyncedEntries();

      if (pendingEntries.length === 0) {
        this.isSyncing = false;
        this.notifyListeners("completed");
        return "completed";
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          entries: pendingEntries.map((e) => ({
            id: e.id,
            employeeId: e.employeeId,
            type: e.type,
            deviceTs: e.deviceTs,
            syncBatchId: e.syncBatchId,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `Sync failed with status ${response.status}`);
      }

      const result = await response.json();

      // Mark synced entries
      if (result.batchId) {
        await markSynced(result.batchId);
      }

      // Update sync metadata
      await updateSyncMeta({
        lastSyncAt: result.serverTime,
        pendingCount: 0,
      });

      this.isSyncing = false;
      this.notifyListeners("completed");
      return "completed";
    } catch (error) {
      console.error("[SyncManager] Sync error:", error);
      this.isSyncing = false;
      const msg = error instanceof Error ? error.message : "Unknown sync error";
      this.notifyListeners("error", msg);
      return "error";
    }
  }

  /**
   * Get number of pending (unsynced) entries.
   */
  async getPendingCount(): Promise<number> {
    const entries = await getUnsyncedEntries();
    return entries.length;
  }

  /**
   * Listen to sync status changes.
   */
  onStatusChange(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(status: SyncStatus, error?: string): void {
    this.listeners.forEach((cb) => {
      try {
        cb(status, error);
      } catch (e) {
        console.error("[SyncManager] Listener error:", e);
      }
    });
  }
}

export const syncManager = new SyncManager();
