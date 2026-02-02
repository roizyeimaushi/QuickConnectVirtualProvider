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
import { ScrollArea } from "@/components/ui/scroll-area";

export function DateTimePicker({ value, onChange, placeholder = "Pick a date" }) {
    const [date, setDate] = React.useState(value ? new Date(value) : undefined);
    // Parse initial time
    const initialDate = value ? new Date(value) : null;
    const [selectedHour, setSelectedHour] = React.useState(initialDate ? initialDate.getHours() : 0);
    const [selectedMinute, setSelectedMinute] = React.useState(initialDate ? initialDate.getMinutes() : 0);

    // Sync internal state with external value prop
    React.useEffect(() => {
        if (value) {
            const d = new Date(value);
            setDate(d);
            setSelectedHour(d.getHours());
            setSelectedMinute(d.getMinutes());
        }
    }, [value]);

    const handleDateSelect = (selectedDate) => {
        if (!selectedDate) {
            setDate(undefined);
            onChange(null);
            return;
        }
        setDate(selectedDate);
        updateDateTime(selectedDate, selectedHour, selectedMinute);
    };

    const handleTimeChange = (type, val) => {
        let newHour = selectedHour;
        let newMinute = selectedMinute;

        if (type === "hour") {
            setSelectedHour(val);
            newHour = val;
        } else {
            setSelectedMinute(val);
            newMinute = val;
        }

        if (date) {
            updateDateTime(date, newHour, newMinute);
        }
    };

    const updateDateTime = (selectedDate, hour, minute) => {
        if (!selectedDate) return;

        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(hour);
        newDateTime.setMinutes(minute);

        // Pass ISO string back to parent
        onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

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
                            <span>
                                {format(date, "yyyy-MM-dd")}
                                <span className="text-muted-foreground mx-1">at</span>
                                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                            </span>
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </span>
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
            <PopoverContent className="w-auto p-0 flex flex-col md:flex-row" align="start">
                <div className="border-b md:border-b-0 md:border-r border-border">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </div>
                <div className="flex divide-x border-border h-[300px] w-full">
                    {/* Hours Column */}
                    <ScrollArea className="w-20 md:w-24">
                        <div className="flex flex-col p-2 gap-1">
                            <div className="text-xs font-medium text-center text-muted-foreground mb-2">Hours</div>
                            {hours.map((hour) => (
                                <Button
                                    key={hour}
                                    variant={selectedHour === hour ? "default" : "ghost"}
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleTimeChange("hour", hour)}
                                >
                                    {hour.toString().padStart(2, '0')}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Minutes Column */}
                    <ScrollArea className="w-20 md:w-24">
                        <div className="flex flex-col p-2 gap-1">
                            <div className="text-xs font-medium text-center text-muted-foreground mb-2">Minutes</div>
                            {minutes.map((minute) => (
                                <Button
                                    key={minute}
                                    variant={selectedMinute === minute ? "default" : "ghost"}
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleTimeChange("minute", minute)}
                                >
                                    {minute.toString().padStart(2, '0')}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
}
