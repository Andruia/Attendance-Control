"use client";

import { useState, useEffect } from "react";
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
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName: string | null;
  leaveTypeName: string | null;
  leaveTypeColor: string | null;
}

interface LeaveRequestListProps {
  requests: LeaveRequest[];
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  showActions?: boolean;
  filterStatus?: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function LeaveRequestList({
  requests,
  onApprove,
  onReject,
  showActions = false,
  filterStatus,
}: LeaveRequestListProps) {
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (filterStatus) {
      setFilteredRequests(requests.filter((r) => r.status === filterStatus));
    } else {
      setFilteredRequests(requests);
    }
  }, [requests, filterStatus]);

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      return;
    }
    if (onReject) {
      await onReject(id, rejectReason);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de Permiso</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay solicitudes para mostrar
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {request.leaveTypeName && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: request.leaveTypeColor || "#3b82f6" }}
                        />
                      )}
                      <span className="font-medium">
                        {request.leaveTypeName || "Sin tipo"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.employeeName}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>

                <div className="text-sm">
                  <p>
                    <span className="font-medium">Período:</span>{" "}
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </p>
                  {request.reason && (
                    <p className="mt-1">
                      <span className="font-medium">Motivo:</span> {request.reason}
                    </p>
                  )}
                  {request.rejectionReason && (
                    <p className="mt-1 text-red-600">
                      <span className="font-medium">Motivo de rechazo:</span>{" "}
                      {request.rejectionReason}
                    </p>
                  )}
                </div>

                {showActions && request.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    {onApprove && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => onApprove(request.id)}
                      >
                        Aprobar
                      </Button>
                    )}
                    {onReject && (
                      <>
                        {rejectingId === request.id ? (
                          <div className="flex gap-2 flex-1">
                            <input
                              type="text"
                              className="flex-1 px-3 py-1 border rounded text-sm"
                              placeholder="Motivo del rechazo..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600"
                              onClick={() => handleReject(request.id)}
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => setRejectingId(request.id)}
                          >
                            Rechazar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}