export type TimeEntryType = "clock_in" | "pause_start" | "pause_end" | "clock_out";

export interface TimeEntry {
  id?: string;
  employeeId: string;
  type: TimeEntryType;
  deviceTs: Date;
  serverTs?: Date | null;
  isPending?: boolean;
  driftMinutes?: number | null;
  syncBatchId?: string | null;
  createdAt?: Date;
}

export interface ClockActionRequest {
  employeeId: string;
  type: TimeEntryType;
  deviceTs: string;  // ISO string from client
}

export interface ClockActionResponse {
  id: string;
  type: TimeEntryType;
  serverTs: string;
  status: "ok" | "conflict" | "error";
}
