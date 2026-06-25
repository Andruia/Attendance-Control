"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { LeaveRequestForm } from "@/components/leave/LeaveRequestForm";
import { LeaveRequestList } from "@/components/leave/LeaveRequestList";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";

interface LeaveType {
  id: string;
  name: string;
  color: string;
  daysPerYear: number | null;
}

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

export default function EmployeeLeavePage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesResponse, requestsResponse] = await Promise.all([
        fetch("/api/leave-types"),
        fetch("/api/leave-requests"),
      ]);

      if (typesResponse.ok) {
        const types = await typesResponse.json();
        setLeaveTypes(types);
      }

      if (requestsResponse.ok) {
        const requests = await requestsResponse.json();
        setLeaveRequests(requests);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (data: {
    leaveTypeId: string | null;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    const response = await fetch("/api/leave-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al crear la solicitud");
    }

    // Refresh data
    await fetchData();
  };

  // Calculate balances (simplified - in real app would need to count approved days per type)
  const currentYear = new Date().getFullYear();
  const balances = leaveTypes.map((type) => {
    const approvedDays = leaveRequests
      .filter(
        (r) =>
          r.leaveTypeId === type.id &&
          r.status === "approved" &&
          new Date(r.startDate).getFullYear() === currentYear,
      )
      .reduce((total, r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return total + diffDays;
      }, 0);

    return {
      leaveTypeId: type.id,
      usedDays: approvedDays,
    };
  });

  if (isLoading) {
    return (
      <>
        <NavBar />
        <main className="container mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Mis Permisos</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LeaveRequestForm onSubmit={handleSubmitRequest} />
            <LeaveRequestList requests={leaveRequests} />
          </div>

          <div>
            <LeaveBalanceCard
              leaveTypes={leaveTypes}
              balances={balances}
              currentYear={currentYear}
            />
          </div>
        </div>
      </main>
    </>
  );
}