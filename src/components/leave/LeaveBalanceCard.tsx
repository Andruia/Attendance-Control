"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaveType {
  id: string;
  name: string;
  color: string;
  daysPerYear: number | null;
}

interface LeaveBalance {
  leaveTypeId: string;
  usedDays: number;
}

interface LeaveBalanceCardProps {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  currentYear: number;
}

export function LeaveBalanceCard({
  leaveTypes,
  balances,
  currentYear,
}: LeaveBalanceCardProps) {
  const getBalance = (leaveTypeId: string) => {
    return balances.find((b) => b.leaveTypeId === leaveTypeId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance de Permisos {currentYear}</CardTitle>
      </CardHeader>
      <CardContent>
        {leaveTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay tipos de permisos configurados
          </p>
        ) : (
          <div className="space-y-4">
            {leaveTypes.map((type) => {
              const balance = getBalance(type.id);
              const usedDays = balance?.usedDays || 0;
              const totalDays = type.daysPerYear;
              const remainingDays = totalDays ? totalDays - usedDays : null;
              const percentage = totalDays ? (usedDays / totalDays) * 100 : 0;

              return (
                <div key={type.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {totalDays ? (
                        <>
                          {remainingDays}/{totalDays} días
                        </>
                      ) : (
                        "Ilimitado"
                      )}
                    </span>
                  </div>

                  {totalDays && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: type.color,
                        }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usados: {usedDays}</span>
                    {remainingDays !== null && (
                      <span>Disponibles: {remainingDays}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}