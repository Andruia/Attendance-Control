export type RoundingStrategy = "nearest" | "up" | "down";

export interface OvertimeConfig {
  dailyThresholdMinutes: number;
  weeklyThresholdMinutes: number;
  roundingMinutes: number;
  roundingStrategy: RoundingStrategy;
  multiplier1_25xMinutes: number;
  multiplier1_5xHours: number;
  multiplier2xWeekends: boolean;
}

export interface OvertimeResult {
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  overtimeTiers: OvertimeTier[];
}

export interface OvertimeTier {
  label: string;
  minutes: number;
  multiplier: number;
}

export interface TimeEntryBatch {
  date: Date;
  clockIn: Date;
  clockOut: Date;
  pauses: Array<{ start: Date; end: Date }>;
  isWeekend: boolean;
}
