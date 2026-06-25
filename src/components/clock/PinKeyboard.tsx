"use client";

import { useState, useCallback, useEffect } from "react";

interface PinKeyboardProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function PinKeyboard({
  length = 4,
  onComplete,
  disabled = false,
  error = false,
}: PinKeyboardProps) {
  const [pin, setPin] = useState<string>("");
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Clear pin when error state changes to true
  useEffect(() => {
    if (error) {
      setPin("");
    }
  }, [error]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (disabled) return;

      setPressedKey(key);
      setTimeout(() => setPressedKey(null), 100);

      if (key === "backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (key === "confirm") {
        if (pin.length === length) {
          onComplete(pin);
        }
      } else if (/^\d$/.test(key) && pin.length < length) {
        const newPin = pin + key;
        setPin(newPin);
        
        // Auto-submit when PIN length is reached
        if (newPin.length === length) {
          setTimeout(() => onComplete(newPin), 150);
        }
      }
    },
    [pin, length, onComplete, disabled]
  );

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeyPress("backspace");
      } else if (e.key === "Enter" && pin.length === length) {
        handleKeyPress("confirm");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, pin.length, length, disabled]);

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["backspace", "0", "confirm"],
  ];

  const getKeyStyle = (key: string) => {
    const baseStyle =
      "flex items-center justify-center rounded-xl text-2xl font-semibold transition-all duration-100 select-none";

    if (key === "backspace") {
      return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300`;
    }

    if (key === "confirm") {
      const canConfirm = pin.length === length && !disabled;
      return `${baseStyle} ${
        canConfirm
          ? "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
          : "bg-gray-100 text-gray-400"
      }`;
    }

    // Number keys
    const isPressed = pressedKey === key;
    return `${baseStyle} bg-white text-gray-900 shadow-md hover:shadow-lg active:shadow-sm ${
      isPressed ? "scale-95 bg-blue-50" : ""
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN Dots Indicator */}
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length
                ? error
                  ? "bg-red-500 scale-110"
                  : "bg-blue-500 scale-110"
                : "bg-gray-200"
            } ${error ? "animate-shake" : ""}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            disabled={disabled}
            className={`h-16 w-16 md:h-20 md:w-20 ${getKeyStyle(key)}`}
            aria-label={
              key === "backspace"
                ? "Borrar"
                : key === "confirm"
                ? "Confirmar"
                : `Tecla ${key}`}
          >
            {key === "backspace" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                />
              </svg>
            ) : key === "confirm" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {disabled && (
        <div className="flex items-center gap-2 text-gray-500">
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
          <span>Verificando...</span>
        </div>
      )}
    </div>
  );
}