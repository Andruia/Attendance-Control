"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

interface LeaveType {
  id: string;
  name: string;
  color: string;
}

interface LeaveRequestFormProps {
  onSubmit: (data: {
    leaveTypeId: string | null;
    startDate: string;
    endDate: string;
    reason: string;
  }) => Promise<void>;
}

export function LeaveRequestForm({ onSubmit }: LeaveRequestFormProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch("/api/leave-types");
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data);
      }
    } catch (err) {
      console.error("Error fetching leave types:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError("Las fechas de inicio y fin son requeridas");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("La fecha de inicio debe ser anterior o igual a la fecha de fin");
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        leaveTypeId: selectedLeaveType || null,
        startDate,
        endDate,
        reason,
      });
      // Reset form
      setSelectedLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar Permiso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Permiso</label>
            <Select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
            >
              <option value="">Seleccionar tipo...</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              placeholder="Describa el motivo de su solicitud..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Enviando..." : "Enviar Solicitud"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}