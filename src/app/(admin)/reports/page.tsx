"use client";

import { useState } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportReport, type ExportFormat, type ExportRow } from "@/lib/export/exportService";

export default function ReportsPage() {
  const [dateStart, setDateStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          format,
          dateRange: { start: dateStart, end: dateEnd },
        }),
      });

      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      exportReport(data.rows as ExportRow[], {
        format,
        dateRange: { start: dateStart, end: dateEnd },
      });
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Reports & Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleExport("csv")} disabled={isLoading} variant="outline">
                {isLoading ? "Processing..." : "Export CSV"}
              </Button>
              <Button onClick={() => handleExport("xlsx")} disabled={isLoading} variant="outline">
                {isLoading ? "Processing..." : "Export Excel"}
              </Button>
              <Button onClick={() => handleExport("pdf")} disabled={isLoading} variant="outline">
                {isLoading ? "Processing..." : "Export PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
