"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { LeaveRequestList } from "@/components/leave/LeaveRequestList";
import { LeaveCalendar } from "@/components/leave/LeaveCalendar";

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

export default function SupervisorLeaveApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "calendar">("pending");

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch("/api/leave-requests");
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (response.ok) {
        await fetchLeaveRequests();
      }
    } catch (err) {
      console.error("Error approving request:", err);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "rejected", rejectionReason: reason }),
      });

      if (response.ok) {
        await fetchLeaveRequests();
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  if (isLoading) {
    return (
      <>
        <NavBar />
        <main className="container mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
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
        <h1 className="text-2xl font-bold">Aprobaciones de Permisos</h1>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Pendientes
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "calendar"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            Calendario
          </button>
        </div>

        {activeTab === "pending" ? (
          <LeaveRequestList
            requests={leaveRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
            filterStatus="pending"
          />
        ) : (
          <LeaveCalendar requests={leaveRequests} />
        )}
      </main>
    </>
  );
}