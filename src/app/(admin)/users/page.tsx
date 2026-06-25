"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  departmentId?: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

type FormData = {
  name: string;
  email: string;
  role: "employee" | "supervisor" | "admin";
  departmentId: string;
  pin: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  role: "employee",
  departmentId: "",
  pin: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch("/api/employees", { credentials: "include" }),
        fetch("/api/departments", { credentials: "include" }),
      ]);

      if (!usersRes.ok) throw new Error("Error al cargar usuarios");
      const usersData = await usersRes.json();
      setUsers(usersData);

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(user: User) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email || "",
      role: user.role as FormData["role"],
      departmentId: user.departmentId || "",
      pin: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }

    // Validate PIN on create (required), on edit only if provided
    if (!editingUser && !/^\d{4}$/.test(formData.pin)) {
      setFormError("El PIN debe ser exactamente 4 dígitos");
      return;
    }
    if (editingUser && formData.pin && !/^\d{4}$/.test(formData.pin)) {
      setFormError("El PIN debe ser exactamente 4 dígitos");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingUser) {
        // Update existing user
        const body: Record<string, unknown> = {
          name: formData.name.trim(),
          role: formData.role,
        };
        if (formData.email.trim()) body.email = formData.email.trim();
        if (formData.departmentId) body.departmentId = formData.departmentId;
        if (formData.pin) body.pin = formData.pin;

        const res = await fetch(`/api/employees/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al actualizar");
        }

        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: formData.name.trim(),
                  email: formData.email.trim() || undefined,
                  role: formData.role,
                  departmentId: formData.departmentId || undefined,
                }
              : u,
          ),
        );
      } else {
        // Create new user
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            role: formData.role,
            departmentId: formData.departmentId || undefined,
            pin: formData.pin,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al crear");
        }

        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/employees/${deletingUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsDeleting(false);
    }
  }

  function getDepartmentName(id?: string): string {
    if (!id) return "";
    return departments.find((d) => d.id === id)?.name ?? "";
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    employee: "Empleado",
  };

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Gestión de Usuarios</h1>
          <Button size="sm" onClick={openCreateForm}>
            + Nuevo Usuario
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadData}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* User List */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.name}</p>
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "default"
                              : user.role === "supervisor"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {roleLabels[user.role] ?? user.role}
                        </Badge>
                      </div>
                      {user.email && (
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                      {user.departmentId && (
                        <p className="text-xs text-muted-foreground">
                          {getDepartmentName(user.departmentId)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(user)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingUser(user)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-muted-foreground">No hay usuarios registrados</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsFormOpen(false)}
          />
          {/* Modal */}
          <Card className="relative z-10 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rol *</label>
                <Select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: e.target.value as FormData["role"],
                    }))
                  }
                >
                  <option value="employee">Empleado</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
                    }))
                  }
                >
                  <option value="">Sin departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  PIN {editingUser ? "(dejar vacío para no cambiar)" : "*"}
                </label>
                <Input
                  type="password"
                  placeholder="4 dígitos"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setFormData((prev) => ({ ...prev, pin: val }));
                  }}
                  pattern="\d{4}"
                  inputMode="numeric"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : editingUser ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setDeletingUser(null)}
          />
          <Card className="relative z-10 w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle>Eliminar Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas eliminar a{" "}
                <strong>{deletingUser.name}</strong>? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
