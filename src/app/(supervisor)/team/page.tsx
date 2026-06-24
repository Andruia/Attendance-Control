"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportReport, type ExportFormat, type ExportRow } from "@/lib/export/exportService";

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  departmentId?: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleExport = async (format: ExportFormat) => {
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          format,
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            end: new Date().toISOString().slice(0, 10),
          },
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();
      // Trigger client-side export from server data
      exportReport(data.rows as ExportRow[], {
        format,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          end: new Date().toISOString().slice(0, 10),
        },
      });
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Overview</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => handleExport("csv")} variant="outline" size="sm">
                Export CSV
              </Button>
              <Button onClick={() => handleExport("xlsx")} variant="outline" size="sm">
                Export Excel
              </Button>
              <Button onClick={() => handleExport("pdf")} variant="outline" size="sm">
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading team data...</p>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground">No team members found.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        member.role === "admin"
                          ? "default"
                          : member.role === "supervisor"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
