import { describe, it, expect } from "vitest";
import { calculateOvertime } from "./calculator";
import type { OvertimeConfig, TimeEntryBatch } from "./config";

const defaultConfig: OvertimeConfig = {
  dailyThresholdMinutes: 480, // 8h
  weeklyThresholdMinutes: 2880, // 48h
  roundingMinutes: 15,
  roundingStrategy: "nearest",
  multiplier1_25xMinutes: 480, // 1.25x starts after 8h
  multiplier1_5xHours: 0,
  multiplier2xWeekends: false,
};

function createBatch(
  params: Partial<TimeEntryBatch> & {
    start: string; // "HH:mm"
    end: string;
    breakStart?: string;
    breakEnd?: string;
  },
): TimeEntryBatch {
  const today = new Date("2025-01-15"); // Wednesday
  const [sh, sm] = params.start.split(":").map(Number);
  const [eh, em] = params.end.split(":").map(Number);

  return {
    date: today,
    clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm),
    clockOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em),
    pauses: params.breakStart && params.breakEnd
      ? [
          {
            start: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              ...params.breakStart.split(":").map(Number),
            ),
            end: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              ...params.breakEnd.split(":").map(Number),
            ),
          },
        ]
      : [],
    isWeekend: params.isWeekend ?? false,
  };
}

describe("calculateOvertime", () => {
  it("returns zero overtime for standard 8h shift", () => {
    const batch = createBatch({ start: "09:00", end: "17:00" });
    const result = calculateOvertime(batch, defaultConfig);

    expect(result.totalMinutes).toBe(480);
    expect(result.regularMinutes).toBe(480);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimeTiers).toHaveLength(0);
  });

  it("calculates overtime beyond 8h threshold", () => {
    const batch = createBatch({ start: "09:00", end: "18:00" }); // 9h gross, no break
    const result = calculateOvertime(batch, defaultConfig);

    expect(result.totalMinutes).toBe(540); // 9h after rounding
    expect(result.regularMinutes).toBe(480); // 8h regular
    expect(result.overtimeMinutes).toBe(60); // 1h overtime
    expect(result.overtimeTiers).toHaveLength(1);
    expect(result.overtimeTiers[0]?.label).toBe("1.25x");
    expect(result.overtimeTiers[0]?.minutes).toBe(60);
  });

  it("subtracts break time from gross hours", () => {
    const batch = createBatch({
      start: "09:00",
      end: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    }); // 9h gross - 1h break = 8h net
    const result = calculateOvertime(batch, defaultConfig);

    expect(result.totalMinutes).toBe(480); // 8h after break + rounding
    expect(result.overtimeMinutes).toBe(0);
  });

  it("handles negative net minutes as zero", () => {
    const batch = createBatch({
      start: "09:00",
      end: "10:00",
      breakStart: "09:30",
      breakEnd: "10:30",
    }); // 1h gross - 1h break = 0 net
    const result = calculateOvertime(batch, defaultConfig);

    expect(result.totalMinutes).toBe(0);
    expect(result.regularMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
  });

  describe("rounding strategies", () => {
    it("rounds nearest 15min up", () => {
      const config = { ...defaultConfig, roundingMinutes: 15, roundingStrategy: "nearest" as const };
      const batch = createBatch({ start: "09:00", end: "17:07" }); // 7 min → nearest 15 = 0
      const result = calculateOvertime(batch, config);

      expect(result.totalMinutes).toBe(480);
    });

    it("rounds up to next 15min increment", () => {
      const config = { ...defaultConfig, roundingMinutes: 15, roundingStrategy: "up" as const };
      const batch = createBatch({ start: "09:00", end: "17:05" }); // 5 min → up to 15
      const result = calculateOvertime(batch, config);

      expect(result.totalMinutes).toBe(495); // 8h + 15min
    });

    it("rounds down to previous 15min increment", () => {
      const config = { ...defaultConfig, roundingMinutes: 15, roundingStrategy: "down" as const };
      const batch = createBatch({ start: "09:00", end: "17:14" }); // 14 min → down to 0
      const result = calculateOvertime(batch, config);

      expect(result.totalMinutes).toBe(480);
    });
  });

  describe("weekend multiplier", () => {
    it("applies 2x multiplier on weekends when configured", () => {
      const config: OvertimeConfig = {
        ...defaultConfig,
        multiplier2xWeekends: true,
        dailyThresholdMinutes: 0, // Everything is overtime on weekend
      };

      const batch = createBatch({
        start: "09:00",
        end: "13:00",
        isWeekend: true,
      });

      const result = calculateOvertime(batch, config);

      expect(result.overtimeMinutes).toBe(240);
      expect(result.overtimeTiers[0]?.multiplier).toBe(2.0);
    });
  });
});
