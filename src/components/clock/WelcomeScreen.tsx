"use client";

import { useState, useEffect, useCallback } from "react";

interface WelcomeScreenProps {
  companyName?: string;
  onContinue: () => void;
  autoAdvanceMs?: number;
}

export function WelcomeScreen({
  companyName = "Mi Clínica Salud",
  onContinue,
  autoAdvanceMs = 3000,
}: WelcomeScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isExiting, setIsExiting] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onContinue, 300); // Wait for exit animation
    }, autoAdvanceMs);

    return () => clearTimeout(timer);
  }, [autoAdvanceMs, onContinue]);

  const handleTap = useCallback(() => {
    setIsExiting(true);
    setTimeout(onContinue, 300);
  }, [onContinue]);

  const getSystemMessage = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return { text: "¡Buenos días!", emoji: "☀️", cta: "Comenzá tu jornada" };
    } else if (hour >= 12 && hour < 18) {
      return { text: "¡Buenas tardes!", emoji: "🌤️", cta: "Registrá tu turno" };
    } else {
      return { text: "¡Buenas noches!", emoji: "🌙", cta: "Finalizá tu jornada" };
    }
  };

  const systemMessage = getSystemMessage();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      onClick={handleTap}
      className={`fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 cursor-pointer transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center space-y-6 px-4 animate-fade-in">
        {/* Emoji */}
        <div className="text-6xl mb-4">{systemMessage.emoji}</div>

        {/* System Greeting (not personalized) */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          {systemMessage.text}
        </h1>

        {/* Company Name */}
        <p className="text-xl text-gray-600 font-medium">{companyName}</p>

        {/* Date and Time */}
        <div className="space-y-1">
          <p className="text-lg text-gray-500 capitalize">
            {formatDate(currentTime)}
          </p>
          <p className="text-3xl font-mono text-gray-700 font-semibold">
            {formatTime(currentTime)}
          </p>
        </div>

        {/* CTA Message */}
        <div className="mt-8 space-y-2">
          <p className="text-lg text-blue-600 font-semibold">
            {systemMessage.cta}
          </p>
          <p className="text-sm text-gray-400">
            Ingresá tu PIN para registrar tu asistencia
          </p>
        </div>

        {/* Continue Prompt */}
        <div className="mt-12 animate-pulse">
          <p className="text-gray-400 text-sm">Toca para comenzar</p>
          <div className="mt-2 flex justify-center">
            <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}