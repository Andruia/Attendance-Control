import Dexie, { type Table } from "dexie";
import type { TimeEntryType } from "@/domain/time-entry/types";

export interface PendingTimeEntry {
  id?: string;
  employeeId: string;
  type: TimeEntryType;
  deviceTs: string; // ISO string
  syncBatchId?: string;
  createdAt: string; // ISO string
  synced: boolean;
}

export interface EmployeeCache {
  id: string;
  name: string;
  email?: string;
  role: "employee" | "supervisor" | "admin";
  departmentId?: string;
  pinHash?: string; // Cached for offline PIN verification
  lastUpdated: string; // ISO string
}

export interface SyncMetadataStore {
  id?: number;
  lastSyncAt: string | null;
  deviceId: string;
  pendingCount: number;
}

export class AttendanceDB extends Dexie {
  pendingEntries!: Table<PendingTimeEntry, string>;
  employeeCache!: Table<EmployeeCache, string>;
  syncMeta!: Table<SyncMetadataStore, number>;

  constructor() {
    super("AttendanceDB");

    this.version(1).stores({
      pendingEntries: "id, employeeId, type, synced, createdAt",
      employeeCache: "id, role, departmentId",
      syncMeta: "++id",
    });
  }
}

export const attendanceDB = new AttendanceDB();

/**
 * Add a pending time entry to the local queue.
 */
export async function addPendingEntry(entry: PendingTimeEntry): Promise<string> {
  const id = entry.id ?? crypto.randomUUID();
  await attendanceDB.pendingEntries.put({
    ...entry,
    id,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    synced: false,
  });
  return id;
}

/**
 * Get all unsynced pending entries.
 */
export async function getUnsyncedEntries(): Promise<PendingTimeEntry[]> {
  return attendanceDB.pendingEntries
    .where("synced")
    .equals(0)
    .toArray();
}

/**
 * Mark entries as synced after successful sync.
 */
export async function markSynced(batchId: string): Promise<void> {
  const entries = await attendanceDB.pendingEntries
    .where("syncBatchId")
    .equals(batchId)
    .toArray();

  await Promise.all(
    entries.map((entry) =>
      attendanceDB.pendingEntries.update(entry.id!, { synced: true }),
    ),
  );
}

/**
 * Cache employee data for offline use.
 */
export async function cacheEmployee(employee: EmployeeCache): Promise<void> {
  await attendanceDB.employeeCache.put(employee);
}

/**
 * Get an employee from local cache (offline PIN verification).
 */
export async function getCachedEmployee(id: string): Promise<EmployeeCache | undefined> {
  return attendanceDB.employeeCache.get(id);
}

/**
 * Update sync metadata.
 */
export async function updateSyncMeta(meta: Partial<SyncMetadataStore>): Promise<void> {
  const existing = await attendanceDB.syncMeta.toArray();
  if (existing.length > 0) {
    await attendanceDB.syncMeta.update(existing[0].id!, meta);
  } else {
    await attendanceDB.syncMeta.add(meta as SyncMetadataStore);
  }
}

/**
 * Get sync metadata.
 */
export async function getSyncMeta(): Promise<SyncMetadataStore | undefined> {
  const items = await attendanceDB.syncMeta.toArray();
  return items[0];
}
