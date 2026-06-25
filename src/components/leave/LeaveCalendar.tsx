"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  employeeName: string | null;
  leaveTypeName: string | null;
  leaveTypeColor: string | null;
}

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function LeaveCalendar({
  requests,
  selectedDate,
  onDateSelect,
}: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(selectedDate || null);

  const approvedRequests = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests],
  );

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const getLeavesForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split("T")[0];

    return approvedRequests.filter((request) => {
      const start = request.startDate;
      const end = request.endDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDay(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDay) return false;
    return (
      day === selectedDay.getDate() &&
      currentMonth.getMonth() === selectedDay.getMonth() &&
      currentMonth.getFullYear() === selectedDay.getFullYear()
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            ←
          </Button>
          <CardTitle className="text-lg">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const leaves = getLeavesForDay(day);

            return (
              <div
                key={day}
                className={`h-10 border rounded p-1 cursor-pointer hover:bg-accent transition-colors ${
                  isToday(day) ? "border-primary" : ""
                } ${isSelected(day) ? "bg-primary/10" : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="text-xs font-medium">{day}</div>
                {leaves.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {leaves.slice(0, 3).map((leave) => (
                      <div
                        key={leave.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: leave.leaveTypeColor || "#3b82f6",
                        }}
                        title={`${leave.employeeName} - ${leave.leaveTypeName}`}
                      />
                    ))}
                    {leaves.length > 3 && (
                      <span className="text-[8px]">+{leaves.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">
              {selectedDay.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h4>
            {getLeavesForDay(selectedDay.getDate()).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay permisos aprobados para este día
              </p>
            ) : (
              <div className="space-y-2">
                {getLeavesForDay(selectedDay.getDate()).map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: leave.leaveTypeColor || "#3b82f6",
                      }}
                    />
                    <span className="font-medium">{leave.employeeName}</span>
                    <span className="text-muted-foreground">
                      - {leave.leaveTypeName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}