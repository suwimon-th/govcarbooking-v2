"use strict";
import React, { useMemo } from "react";

interface TimePicker24Props {
    value: string; // "HH:mm" or ""
    onChange: (val: string) => void;
    className?: string; // To match existing styles
    placeholder?: string;
    disabled?: boolean;
}

export default function TimePicker24({ value, onChange, className, disabled }: TimePicker24Props) {
    // Parse current value
    const [hour, minute] = useMemo(() => {
        if (!value) return ["", ""];
        return value.split(":");
    }, [value]);

    // Generate Hours 00-23
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    // Generate Minutes 00-59
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

    const handleHourChange = (newHour: string) => {
        if (!newHour) {
            if (minute) onChange(`00:${minute}`); // Default to 00 if minute selected
            else onChange(""); // Clear if both empty
            return;
        }
        const currentMinute = minute || "00";
        onChange(`${newHour}:${currentMinute}`);
    };

    const handleMinuteChange = (newMinute: string) => {
        if (!newMinute) {
            if (hour) onChange(`${hour}:00`); // Default to 00 if hour selected
            else onChange("");
            return;
        }
        const currentHour = hour || "00";
        onChange(`${currentHour}:${newMinute}`);
    };

    return (
        <div className={`flex items-center gap-2 ${className} !p-0 !border-none !bg-transparent`}>
            {/* Hour Select */}
            <div className="relative flex-1">
                <select
                    value={hour}
                    onChange={(e) => handleHourChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full appearance-none bg-gray-50/50 border border-gray-200 text-gray-900 text-center rounded-xl py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all ${!hour ? "text-gray-400" : ""
                        }`}
                >
                    <option value="" disabled>ชม.</option>
                    {hours.map((h) => (
                        <option key={h} value={h}>
                            {h}
                        </option>
                    ))}
                </select>
            </div>

            <span className="text-gray-400 font-bold">:</span>

            {/* Minute Select */}
            <div className="relative flex-1">
                <select
                    value={minute}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full appearance-none bg-gray-50/50 border border-gray-200 text-gray-900 text-center rounded-xl py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all ${!minute ? "text-gray-400" : ""
                        }`}
                >
                    <option value="" disabled>นาที</option>
                    {minutes.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
