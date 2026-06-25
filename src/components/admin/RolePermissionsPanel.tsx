"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

interface RolePermissionsPanelProps {
  onSave: (permissions: RolePermission[]) => Promise<void>;
}

const permissionLabels: Record<string, string> = {
  canViewTeam: "Ver Equipo",
  canApproveLeave: "Aprobar Permisos",
  canManageUsers: "Gestionar Usuarios",
  canManageShifts: "Gestionar Turnos",
  canManageOvertime: "Gestionar Horas Extra",
  canViewReports: "Ver Reportes",
  canExportReports: "Exportar Reportes",
};

const roleLabels: Record<string, string> = {
  employee: "Empleado",
  supervisor: "Supervisor",
  admin: "Administrador",
};

export function RolePermissionsPanel({ onSave }: RolePermissionsPanelProps) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/role-permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (role: string, permission: string) => {
    setPermissions((prev) => {
      const existing = prev.find((p) => p.role === role);
      if (existing) {
        return prev.map((p) =>
          p.role === role ? { ...p, [permission]: !p[permission as keyof RolePermission] } : p,
        );
      } else {
        // Create new permission entry for this role
        const newPermission: RolePermission = {
          id: "",
          role,
          canViewTeam: false,
          canApproveLeave: false,
          canManageUsers: false,
          canManageShifts: false,
          canManageOvertime: false,
          canViewReports: false,
          canExportReports: false,
          [permission]: true,
        };
        return [...prev, newPermission];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(permissions);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permisos por Rol</CardTitle>
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
        <CardTitle>Permisos por Rol</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {["employee", "supervisor", "admin"].map((role) => {
            const rolePerm = permissions.find((p) => p.role === role);
            return (
              <div key={role} className="space-y-3">
                <h3 className="font-medium text-lg">{roleLabels[role]}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={
                          rolePerm
                            ? rolePerm[key as keyof RolePermission] as boolean
                            : false
                        }
                        onChange={() => togglePermission(role, key)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Guardando..." : "Guardar Permisos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}