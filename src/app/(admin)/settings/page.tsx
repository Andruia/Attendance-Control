"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { ShiftEditor } from "@/components/shift/ShiftEditor";
import { OvertimeConfigForm } from "@/components/shift/OvertimeConfigForm";
import { RolePermissionsPanel } from "@/components/admin/RolePermissionsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LeaveType {
  id: string;
  name: string;
  color: string;
  daysPerYear: number | null;
  isPaid: boolean;
  requiresApproval: boolean;
}

interface RolePermission {
  id: string;
  role: string;
  canViewTeam: boolean;
  canApproveLeave: boolean;
  canManageUsers: boolean;
  canManageShifts: boolean;
  canManageOvertime: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
}

function LeaveTypesManager() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState({
    name: "",
    color: "#3b82f6",
    daysPerYear: "",
    isPaid: true,
    requiresApproval: true,
  });

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newType.name.trim()) return;

    try {
      const response = await fetch("/api/leave-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newType.name,
          color: newType.color,
          daysPerYear: newType.daysPerYear ? parseInt(newType.daysPerYear) : null,
          isPaid: newType.isPaid,
          requiresApproval: newType.requiresApproval,
        }),
      });

      if (response.ok) {
        setNewType({
          name: "",
          color: "#3b82f6",
          daysPerYear: "",
          isPaid: true,
          requiresApproval: true,
        });
        setIsAdding(false);
        await fetchLeaveTypes();
      }
    } catch (err) {
      console.error("Error adding leave type:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este tipo de permiso?")) return;

    try {
      const response = await fetch(`/api/leave-types/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchLeaveTypes();
      }
    } catch (err) {
      console.error("Error deleting leave type:", err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Permiso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tipos de Permiso</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? "Cancelar" : "Agregar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <Input
              placeholder="Nombre del tipo de permiso"
              value={newType.name}
              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Color</label>
                <input
                  type="color"
                  className="w-full h-10 mt-1"
                  value={newType.color}
                  onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Días por año</label>
                <Input
                  type="number"
                  placeholder="Ilimitado"
                  value={newType.daysPerYear}
                  onChange={(e) => setNewType({ ...newType, daysPerYear: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newType.isPaid}
                  onChange={(e) => setNewType({ ...newType, isPaid: e.target.checked })}
                />
                <span className="text-sm">Remunerado</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newType.requiresApproval}
                  onChange={(e) =>
                    setNewType({ ...newType, requiresApproval: e.target.checked })
                  }
                />
                <span className="text-sm">Requiere aprobación</span>
              </label>
            </div>
            <Button onClick={handleAdd} className="w-full">
              Guardar
            </Button>
          </div>
        )}

        {leaveTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay tipos de permisos configurados
          </p>
        ) : (
          <div className="space-y-2">
            {leaveTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {type.daysPerYear ? `${type.daysPerYear} días/año` : "Ilimitado"}{" "}
                      • {type.isPaid ? "Remunerado" : "No remunerado"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(type.id)}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const handleSavePermissions = async (permissions: RolePermission[]) => {
    for (const perm of permissions) {
      await fetch("/api/role-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(perm),
      });
    }
  };

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 space-y-6">
        <ShiftEditor />
        <OvertimeConfigForm />
        <LeaveTypesManager />
        <RolePermissionsPanel onSave={handleSavePermissions} />
      </main>
    </>
  );
}
