"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export function DateTimePicker({ value, onChange, placeholder = "Pick a date" }) {
    const [date, setDate] = React.useState(value ? new Date(value) : undefined);
    const [time, setTime] = React.useState(
        value ? format(new Date(value), "HH:mm") : "00:00"
    );

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

    const handleTimeChange = (e) => {
        const newTime = e.target.value;
        setTime(newTime);
        if (date) {
            updateDateTime(date, newTime);
        }
    };

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
                    <span className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? (
                            // Force 24h format display here
                            <span>
                                {format(date, "yyyy-MM-dd")} <span className="text-muted-foreground">at</span> {time}
                            </span>
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </span>
                    {/* Consistent Chevron Down Style */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 opacity-50"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="time"
                            value={time}
                            onChange={handleTimeChange}
                            className="w-full"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
