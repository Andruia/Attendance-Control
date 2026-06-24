"use client";

import { NavBar } from "@/components/layout/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your attendance records will appear here.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
