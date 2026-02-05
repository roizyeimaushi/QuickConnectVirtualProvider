"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function DateTimePicker({ value, onChange, placeholder = "Pick a date" }) {
    const [date, setDate] = React.useState(value ? new Date(value) : undefined);
    const [time, setTime] = React.useState(
        value ? format(new Date(value), "HH:mm") : "00:00"
    );
    const [showTimePicker, setShowTimePicker] = React.useState(false);

    // Sync internal state with external value prop
    React.useEffect(() => {
        if (value) {
            const d = new Date(value);
            setDate(d);
            setTime(format(d, "HH:mm"));
        } else {
            setDate(undefined);
            setTime("00:00");
        }
    }, [value]);

    const handleDateSelect = (selectedDate) => {
        if (!selectedDate) {
            setDate(undefined);
            onChange(null);
            return;
        }

        setDate(selectedDate);
        updateDateTime(selectedDate, time);
    };

    const handleTimeChange = (type, val) => {
        const [currentH, currentM] = time.split(':').map(Number);
        let newH = currentH;
        let newM = currentM;

        if (type === 'hour') {
            newH = parseInt(val);
        } else if (type === 'minute') {
            newM = parseInt(val);
        }

        const newTimeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
        setTime(newTimeStr);
        if (date) {
            updateDateTime(date, newTimeStr);
        }
    };

    // 24-hour format: 0-23
    const hours24 = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    const updateDateTime = (selectedDate, selectedTime) => {
        if (!selectedDate || !selectedTime) return;

        const [hours, minutes] = selectedTime.split(":").map(Number);
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(hours);
        newDateTime.setMinutes(minutes);

        // Pass ISO string back to parent
        // Format: YYYY-MM-DDTHH:mm
        onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-between text-left font-normal h-10 px-3",
                        !date && "text-muted-foreground"
                    )}
                >
                    <span className="flex items-center truncate">
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {date ? (
                            <span className="truncate">
                                {format(date, "MMM d")} <span className="text-muted-foreground">@</span> {time}
                            </span>
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="start"
                sideOffset={4}
                side="bottom"
            >
                <div className="flex flex-col">
                    {/* Compact Calendar - Fixed size */}
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="border-b border-border p-2"
                    />

                    {/* Time Picker - Inline scrollable */}
                    <div className="p-3 border-t border-border bg-muted/30">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Time (24h)</span>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Hour Dropdown */}
                                <div className="relative">
                                    <select
                                        value={time.split(':')[0]}
                                        onChange={(e) => handleTimeChange('hour', e.target.value)}
                                        className="appearance-none bg-background border border-input rounded-md px-3 py-1.5 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                                    >
                                        {hours24.map((h) => (
                                            <option key={h} value={h.toString().padStart(2, '0')}>
                                                {h.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50 pointer-events-none" />
                                </div>

                                <span className="text-lg font-bold text-muted-foreground">:</span>

                                {/* Minute Dropdown */}
                                <div className="relative">
                                    <select
                                        value={time.split(':')[1]}
                                        onChange={(e) => handleTimeChange('minute', e.target.value)}
                                        className="appearance-none bg-background border border-input rounded-md px-3 py-1.5 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                                    >
                                        {minutes.map((m) => (
                                            <option key={m} value={m.toString().padStart(2, '0')}>
                                                {m.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

