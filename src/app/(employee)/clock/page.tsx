"use client";

import { ClockEntry } from "@/components/clock/ClockEntry";
import { NavBar } from "@/components/layout/NavBar";

export default function ClockPage() {
  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4">
        <ClockEntry />
      </main>
    </>
  );
}
