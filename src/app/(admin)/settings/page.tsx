"use client";

import { NavBar } from "@/components/layout/NavBar";
import { ShiftEditor } from "@/components/shift/ShiftEditor";
import { OvertimeConfigForm } from "@/components/shift/OvertimeConfigForm";

export default function SettingsPage() {
  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 space-y-6">
        <ShiftEditor />
        <OvertimeConfigForm />
      </main>
    </>
  );
}
