"use client";

import { useState, useEffect, useCallback } from "react";
import { useClockStore, ClockStatus } from "@/lib/stores/clockStore";
import { useAuthStore } from "@/lib/stores/authStore";

interface ClockDashboardProps {
  onClockAction: (action: "clock_in" | "pause_start" | "pause_end" | "clock_out") => Promise<void>;
  onLogout: () => void;
}

export function ClockDashboard({ onClockAction, onLogout }: ClockDashboardProps) {
  const { status, clockInTime, breakStartTime, isLoading, error } = useClockStore();
  const { name, role } = useAuthStore();
  const [workedTime, setWorkedTime] = useState("00:00:00");

  // Calculate worked time
  useEffect(() => {
    if (status === "clocked_in" && clockInTime) {
      const calculateWorkedTime = () => {
        const start = new Date(clockInTime);
        const now = new Date();
        const diff = now.getTime() - start.getTime();

        // Note: We don't subtract break time in the display
        // The break time is tracked separately
        const totalMs = diff;
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      };

      setWorkedTime(calculateWorkedTime());
      const timer = setInterval(calculateWorkedTime, 1000);
      return () => clearInterval(timer);
    }
  }, [status, clockInTime, breakStartTime]);

  const getStatusConfig = (status: ClockStatus) => {
    switch (status) {
      case "clocked_in":
        return {
          label: "Jornada Iniciada",
          icon: "🟢",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
        };
      case "on_break":
        return {
          label: "En Pausa",
          icon: "🟡",
          bgColor: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
        };
      case "clocked_out":
        return {
          label: "Jornada Finalizada",
          icon: "⚪",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
        };
      default:
        return {
          label: "Sin Registrar",
          icon: "⚪",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAction = useCallback(
    async (action: "clock_in" | "pause_start" | "pause_end" | "clock_out") => {
      await onClockAction(action);
    },
    [onClockAction]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Hola, {name}</h1>
          <p className="text-gray-500 capitalize">Rol: {role}</p>
        </div>

        {/* Status Card */}
        <div
          className={`${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-2xl p-6 text-center transition-all duration-300`}
        >
          <div className="text-4xl mb-2">{statusConfig.icon}</div>
          <h2 className={`text-xl font-semibold ${statusConfig.textColor}`}>
            {statusConfig.label}
          </h2>

          {status === "clocked_in" && clockInTime && (
            <div className="mt-4 space-y-1">
              <p className="text-sm text-gray-600">
                Hora de entrada: {formatTime(clockInTime)}
              </p>
              <p className="text-2xl font-mono font-bold text-gray-800">
                {workedTime}
              </p>
              <p className="text-xs text-gray-500">Tiempo trabajado</p>
            </div>
          )}

          {status === "on_break" && breakStartTime && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Pausa desde: {formatTime(breakStartTime)}
              </p>
            </div>
          )}

          {status === "clocked_out" && (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold text-gray-700">¡Buen trabajo hoy! 💪</p>
              <p className="text-sm text-gray-500 italic">
                Cada día que registrás tu esfuerzo, construyés algo más grande. ¡Nos vemos mañana!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === "idle" && (
            <button
              onClick={() => handleAction("clock_in")}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                "Iniciar Jornada"
              )}
            </button>
          )}

          {status === "clocked_in" && (
            <>
              <button
                onClick={() => handleAction("pause_start")}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? "Procesando..." : "Iniciar Pausa"}
              </button>
              <button
                onClick={() => handleAction("clock_out")}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? "Procesando..." : "Finalizar Jornada"}
              </button>
            </>
          )}

          {status === "on_break" && (
            <>
              <button
                onClick={() => handleAction("pause_end")}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? "Procesando..." : "Reanudar"}
              </button>
              <button
                onClick={() => handleAction("clock_out")}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? "Procesando..." : "Finalizar Jornada"}
              </button>
            </>
          )}

          {status === "clocked_out" && (
            <button
              onClick={() => handleAction("clock_in")}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? "Procesando..." : "Iniciar Nueva Jornada"}
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}