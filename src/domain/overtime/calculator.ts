import type { OvertimeConfig, OvertimeResult, OvertimeTier, TimeEntryBatch } from "./config";

/**
 * Pure function: calculates overtime from a time entry batch and config.
 * Runs identically on server and client.
 */
export function calculateOvertime(
  batch: TimeEntryBatch,
  config: OvertimeConfig,
): OvertimeResult {
  const grossMinutes = minutesBetween(batch.clockIn, batch.clockOut);
  const breakMinutes = batch.pauses.reduce(
    (total, p) => total + minutesBetween(p.start, p.end),
    0,
  );
  const netMinutes = Math.max(0, grossMinutes - breakMinutes);
  const roundedMinutes = applyRounding(netMinutes, config.roundingMinutes, config.roundingStrategy);

  const isWeekend = batch.isWeekend;
  const threshold = config.dailyThresholdMinutes;

  let regularMinutes: number;
  let overtimeMinutes: number;

  if (roundedMinutes <= threshold) {
    regularMinutes = roundedMinutes;
    overtimeMinutes = 0;
  } else {
    regularMinutes = threshold;
    overtimeMinutes = roundedMinutes - threshold;
  }

  const tiers: OvertimeTier[] = [];

  if (overtimeMinutes > 0) {
    // On weekends with 2x config, all overtime uses 2x multiplier
    if (isWeekend && config.multiplier2xWeekends) {
      tiers.push({ label: "2x", minutes: overtimeMinutes, multiplier: 2.0 });
    } else {
      // Tier 1: 1.25x for first X minutes over threshold
      const tier1Cap = config.multiplier1_25xMinutes;
      if (tier1Cap > 0 && overtimeMinutes > 0) {
        const tier1Minutes = Math.min(overtimeMinutes, tier1Cap);
        tiers.push({ label: "1.25x", minutes: tier1Minutes, multiplier: 1.25 });
      }

      // Tier 2: 1.5x beyond that
      const remainingAfterTier1 = overtimeMinutes - (tiers[0]?.minutes ?? 0);
      if (remainingAfterTier1 > 0 && config.multiplier1_5xHours > 0) {
        const tier2Cap = config.multiplier1_5xHours * 60;
        const tier2Minutes = Math.min(remainingAfterTier1, tier2Cap);
        tiers.push({ label: "1.5x", minutes: tier2Minutes, multiplier: 1.5 });
      }

      // Remaining after tier 2 (if any)
      const remainingAfterTier2 =
        overtimeMinutes - tiers.reduce((s, t) => s + t.minutes, 0);
      if (remainingAfterTier2 > 0) {
        tiers.push({
          label: "1.5x",
          minutes: remainingAfterTier2,
          multiplier: 1.5,
        });
      }
    }
  }

  return {
    totalMinutes: roundedMinutes,
    regularMinutes,
    overtimeMinutes,
    overtimeTiers: tiers,
  };
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function applyRounding(
  minutes: number,
  roundingMinutes: number,
  strategy: "nearest" | "up" | "down",
): number {
  if (roundingMinutes <= 0) return minutes;

  switch (strategy) {
    case "nearest":
      return Math.round(minutes / roundingMinutes) * roundingMinutes;
    case "up":
      return Math.ceil(minutes / roundingMinutes) * roundingMinutes;
    case "down":
      return Math.floor(minutes / roundingMinutes) * roundingMinutes;
    default:
      return minutes;
  }
}
