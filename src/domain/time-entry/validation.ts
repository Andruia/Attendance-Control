import { z } from "zod";

export const clockActionSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["clock_in", "pause_start", "pause_end", "clock_out"]),
  deviceTs: z.string().datetime({ message: "deviceTs must be an ISO datetime string" }),
});

export const syncBatchSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        employeeId: z.string().uuid(),
        type: z.enum(["clock_in", "pause_start", "pause_end", "clock_out"]),
        deviceTs: z.string().datetime(),
        syncBatchId: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type ClockActionInput = z.infer<typeof clockActionSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
