"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


interface DayEntry {
  date: string;
  clockIn: string | null;
  pauseStart: string | null;
  pauseEnd: string | null;
  clockOut: string | null;
  morningHours: number;
  afternoonHours: number;
  totalHours: number;
}

interface EntriesResponse {
  entries: DayEntry[];
  summary: {
    totalHoursThisWeek: number;
    totalHoursThisMonth: number;
  };
}

type FilterRange = "7" | "30" | "custom";

function formatTime(iso: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getDateRange(range: FilterRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from: string;

  switch (range) {
    case "7": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
      break;
    }
    case "30": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      from = d.toISOString().slice(0, 10);
      break;
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      from = d.toISOString().slice(0, 10);
    }
  }

  return { from, to };
}

export default function HistoryPage() {
  const [data, setData] = useState<EntriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRange, setFilterRange] = useState<FilterRange>("30");

  useEffect(() => {
    async function fetchEntries() {
      setIsLoading(true);
      setError(null);
      try {
        const { from, to } = getDateRange(filterRange);
        const res = await fetch(`/api/entries?from=${from}&to=${to}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al cargar registros");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntries();
  }, [filterRange]);

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mi Historial</h1>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Esta semana
                </p>
                <p className="text-2xl font-bold mt-1">
                  {data.summary.totalHoursThisWeek.toFixed(1)}h
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Este mes
                </p>
                <p className="text-2xl font-bold mt-1">
                  {data.summary.totalHoursThisMonth.toFixed(1)}h
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filterRange === "7" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterRange("7")}
          >
            Últimos 7 días
          </Button>
          <Button
            variant={filterRange === "30" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterRange("30")}
          >
            Últimos 30 días
          </Button>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setFilterRange(filterRange)}
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && data && data.entries.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-muted-foreground font-medium">
                No hay registros aún
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tus marcas de asistencia aparecerán aquí
              </p>
            </CardContent>
          </Card>
        )}

        {/* Entries grouped by date */}
        {!isLoading && !error && data && data.entries.length > 0 && (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <Card key={entry.date}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {formatDate(entry.date)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entrada:</span>
                      <span className="ml-2 font-mono">
                        {formatTime(entry.clockIn)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Salida:</span>
                      <span className="ml-2 font-mono">
                        {formatTime(entry.clockOut)}
                      </span>
                    </div>
                    {entry.pauseStart && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Almuerzo:</span>
                          <span className="ml-2 font-mono">
                            {formatTime(entry.pauseStart)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Regreso:</span>
                          <span className="ml-2 font-mono">
                            {formatTime(entry.pauseEnd)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hours breakdown */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {entry.morningHours > 0 && (
                        <span>Mañana: {entry.morningHours.toFixed(1)}h</span>
                      )}
                      {entry.afternoonHours > 0 && (
                        <span>Tarde: {entry.afternoonHours.toFixed(1)}h</span>
                      )}
                    </div>
                    <span className="text-sm font-bold">
                      {entry.totalHours.toFixed(1)}h
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
