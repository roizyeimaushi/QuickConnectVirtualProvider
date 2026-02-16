"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getHoliday } from "@/lib/holidays";

export function CalendarCard({ className, ...props }) {
    const [date, setDate] = React.useState(new Date());

    return (
        <div className={cn("flex items-center justify-center p-4 w-full", className)}>
            <Card className="w-auto shadow-lg rounded-xl overflow-hidden bg-background">
                <CardContent className="p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border p-4"
                        showOutsideDays={false}
                        classNames={{
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-accent/50 text-accent-foreground font-semibold",
                            caption: "flex justify-center items-center pt-1 relative mb-4",
                            caption_label: "text-sm font-semibold capitalize",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-input rounded-md flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                        }}
                        tileClassName={({ date, view }) => {
                            if (view === 'month') {
                                const holiday = getHoliday(date);
                                if (holiday) {
                                    return cn(
                                        "font-medium relative",
                                        holiday.type === 'regular' 
                                            ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" 
                                            : "bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                                    );
                                }
                            }
                        }}
                        tileContent={({ date, view }) => {
                            if (view === 'month') {
                                const holiday = getHoliday(date);
                                if (holiday) {
                                    return (
                                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                                            <div className="h-1 w-1 rounded-full bg-current opacity-50" title={holiday.name} />
                                        </div>
                                    );
                                }
                            }
                        }}
                        {...props}
                    />
                    <div className="p-4 border-t bg-muted/20 text-center text-sm min-h-[3rem] flex items-center justify-center">
                        {date && getHoliday(date) ? (
                            <span className={cn(
                                "font-medium",
                                getHoliday(date).type === 'regular' ? "text-red-600" : "text-orange-600"
                            )}>
                                🎉 {getHoliday(date).name}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {date ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : "Select a date"}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
