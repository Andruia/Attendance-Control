"use client";

import { useState, useEffect } from "react";
import { useShiftStore } from "@/lib/stores/shiftStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function ShiftEditor() {
  const { shifts, isLoading, error, fetchShifts, addShift, updateShift, removeShift, setError } = useShiftStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "",
    breakEnd: "",
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  useEffect(() => {
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "",
      breakEnd: "",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    });
    setIsCreating(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.name) {
      setError("Shift name is required");
      return;
    }

    const payload = {
      ...form,
      breakStart: form.breakStart || null,
      breakEnd: form.breakEnd || null,
    };

    try {
      const res = editId
        ? await fetch(`/api/shifts/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          })
        : await fetch("/api/shifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save shift");
      }

      const saved = await res.json();
      if (editId) {
        updateShift(editId, saved);
      } else {
        addShift(saved);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shift");
    }
  };

  const handleEdit = (shift: (typeof shifts)[0]) => {
    setForm({
      name: shift.name,
      startTime: shift.startTime.slice(0, 5),
      endTime: shift.endTime.slice(0, 5),
      breakStart: shift.breakStart?.slice(0, 5) ?? "",
      breakEnd: shift.breakEnd?.slice(0, 5) ?? "",
      monday: shift.monday,
      tuesday: shift.tuesday,
      wednesday: shift.wednesday,
      thursday: shift.thursday,
      friday: shift.friday,
      saturday: shift.saturday,
      sunday: shift.sunday,
    });
    setEditId(shift.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete shift");
      removeShift(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete shift");
    }
  };

  const dayLabel = (day: string) => day.charAt(0).toUpperCase() + day.slice(1, 3);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Shift Templates</CardTitle>
          <Button onClick={() => setIsCreating(!isCreating)} variant="outline" size="sm">
            {isCreating ? "Cancel" : "New Shift"}
          </Button>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <div className="mb-6 space-y-4 rounded-lg border p-4">
              <div>
                <label className="text-sm font-medium">Shift Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Morning Shift"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Break Start (optional)</label>
                  <Input
                    type="time"
                    value={form.breakStart}
                    onChange={(e) => setForm({ ...form, breakStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Break End (optional)</label>
                  <Input
                    type="time"
                    value={form.breakEnd}
                    onChange={(e) => setForm({ ...form, breakEnd: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Active Days</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setForm({ ...form, [day]: !form[day] })}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        form[day]
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {dayLabel(day)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isLoading}>
                  {editId ? "Update" : "Create"}
                </Button>
                <Button onClick={resetForm} variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {shifts.length === 0 && !isLoading ? (
            <p className="py-8 text-center text-muted-foreground">
              No shifts configured. Create your first shift template.
            </p>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{shift.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                      {shift.breakStart && (
                        <> · Break: {shift.breakStart.slice(0, 5)}-{shift.breakEnd?.slice(0, 5)}</>
                      )}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {DAYS.map((day) => (
                        <span
                          key={day}
                          className={`inline-block h-5 w-5 rounded text-center text-[10px] leading-5 ${
                            shift[day]
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {dayLabel(day)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(shift)} variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button onClick={() => handleDelete(shift.id)} variant="ghost" size="sm" className="text-destructive">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
