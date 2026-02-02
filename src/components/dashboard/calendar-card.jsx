"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

export function CalendarCard({ className, ...props }) {
    const [date, setDate] = React.useState(new Date());

    return (
        <div className="flex items-center justify-center p-4 w-full">
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
                        {...props}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
