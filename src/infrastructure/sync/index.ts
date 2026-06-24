/**
 * Server-side sync conflict resolution.
 *
 * Strategy: Last-write-wins on employee data.
 * For time entries: device timestamp is authoritative for the entry,
 * server timestamp is authoritative for "when server received it".
 * Drift > 5min is flagged for manual review.
 */

export interface SyncConflict {
  entryId: string;
  employeeId: string;
  deviceTs: string;
  serverTs: string | null;
  type: "clock_in" | "pause_start" | "pause_end" | "clock_out";
  driftMinutes: number;
  resolution: "accept_device" | "accept_server" | "flag_review";
}

/**
 * Resolve a single sync conflict based on drift.
 * - Drift <= 5 min: accept device timestamp (normal sync)
 * - Drift > 5 min: flag for supervisor review
 */
export function resolveSyncConflict(params: {
  deviceTs: Date;
  serverTs: Date;
  existingServerTs?: Date | null;
}): SyncConflict["resolution"] {
  const driftMinutes = Math.round(
    (params.serverTs.getTime() - params.deviceTs.getTime()) / 60000,
  );

  if (Math.abs(driftMinutes) <= 5) {
    return "accept_device";
  }

  // If we already have a server timestamp, it's a duplicate
  if (params.existingServerTs) {
    return "accept_server";
  }

  return "flag_review";
}
