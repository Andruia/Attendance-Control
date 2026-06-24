-- Migration 0001: Add overtime_configs table

CREATE TABLE IF NOT EXISTS overtime_configs (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  daily_threshold_minutes INT NOT NULL DEFAULT 480,
  weekly_threshold_minutes INT NOT NULL DEFAULT 2880,
  rounding_minutes INT NOT NULL DEFAULT 15,
  rounding_strategy TEXT NOT NULL CHECK (rounding_strategy IN ('nearest','up','down')) DEFAULT 'nearest',
  multiplier_1_25x_minutes INT NOT NULL DEFAULT 480,
  multiplier_1_5x_hours INT NOT NULL DEFAULT 0,
  multiplier_2x_weekends BOOLEAN NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overtime_configs_company ON overtime_configs(company_id);
