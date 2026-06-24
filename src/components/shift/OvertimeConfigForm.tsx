"use client";

import { useEffect } from "react";
import { useOvertimeStore } from "@/lib/stores/overtimeStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function OvertimeConfigForm() {
  const { config, isLoading, error, fetchConfig, updateConfig, setConfig } =
    useOvertimeStore();

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overtime Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading configuration...</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No overtime configuration found. Default values will be used.
              </p>
              <Button
                onClick={() =>
                  setConfig({
                    companyId: "",
                    dailyThresholdMinutes: 480,
                    weeklyThresholdMinutes: 2880,
                    roundingMinutes: 15,
                    roundingStrategy: "nearest",
                    multiplier1_25xMinutes: 480,
                    multiplier1_5xHours: 0,
                    multiplier2xWeekends: false,
                  })
                }
                variant="outline"
                size="sm"
              >
                Set Defaults
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleChange = (field: string, value: string | number | boolean) => {
    setConfig({ ...config, [field]: value });
  };

  const handleSave = async () => {
    await updateConfig(config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overtime Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Daily Threshold (minutes)</label>
            <Input
              type="number"
              value={config.dailyThresholdMinutes}
              onChange={(e) => handleChange("dailyThresholdMinutes", parseInt(e.target.value) || 0)}
              min={0}
              max={1440}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Weekly Threshold (minutes)</label>
            <Input
              type="number"
              value={config.weeklyThresholdMinutes}
              onChange={(e) => handleChange("weeklyThresholdMinutes", parseInt(e.target.value) || 0)}
              min={0}
              max={10080}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Rounding (minutes)</label>
            <Input
              type="number"
              value={config.roundingMinutes}
              onChange={(e) => handleChange("roundingMinutes", parseInt(e.target.value) || 1)}
              min={1}
              max={60}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Rounding Strategy</label>
            <Select
              value={config.roundingStrategy}
              onChange={(e) => handleChange("roundingStrategy", e.target.value)}
            >
              <option value="nearest">Nearest</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">1.25x Threshold (min)</label>
            <Input
              type="number"
              value={config.multiplier1_25xMinutes}
              onChange={(e) => handleChange("multiplier1_25xMinutes", parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium">1.5x Threshold (hours)</label>
            <Input
              type="number"
              value={config.multiplier1_5xHours}
              onChange={(e) => handleChange("multiplier1_5xHours", parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="weekend2x"
            checked={config.multiplier2xWeekends}
            onChange={(e) => handleChange("multiplier2xWeekends", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="weekend2x" className="text-sm font-medium">
            2x Multiplier on Weekends
          </label>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
}
