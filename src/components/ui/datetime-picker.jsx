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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
                    <span className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? (
                            <span>
                                {format(date, "yyyy-MM-dd")} <span className="text-muted-foreground">at</span> {format(date, "HH:mm")}
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
            <PopoverContent
                className="w-auto p-0 max-h-[80vh] overflow-auto"
                align="start"
                sideOffset={4}
            >
                <div className="flex flex-col md:flex-row">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="border-b md:border-b-0 md:border-r border-border"
                    />
                    <div className="p-3 flex flex-col gap-2 min-w-[120px]">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Time (24h)</span>
                        </div>
                        <div className="flex flex-row gap-2 items-end">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground uppercase text-center">Hour</span>
                                <Select
                                    value={time.split(':')[0]}
                                    onValueChange={(val) => handleTimeChange('hour', val)}
                                >
                                    <SelectTrigger className="w-[60px] h-9">
                                        <SelectValue placeholder="Hr" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px]">
                                        {hours24.map((h) => (
                                            <SelectItem key={h} value={h.toString()}>
                                                {h.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground uppercase text-center">Min</span>
                                <Select
                                    value={parseInt(time.split(':')[1]).toString()}
                                    onValueChange={(val) => handleTimeChange('minute', val)}
                                >
                                    <SelectTrigger className="w-[60px] h-9">
                                        <SelectValue placeholder="Min" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px]">
                                        {minutes.map((m) => (
                                            <SelectItem key={m} value={m.toString()}>
                                                {m.toString().padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
