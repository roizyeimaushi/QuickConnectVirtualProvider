"use client";

import * as React from "react";
import Calendar from "react-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-calendar/dist/Calendar.css"; // Import default styles

function CalendarComponent({
  className,
  classNames,
  showOutsideDays = true,
  mode = "single", // "single" | "range"
  selected,
  onSelect,
  ...props
}) {
  // Handle change event - single click always triggers selection
  const onChange = (val) => {
    if (onSelect) {
      if (mode === "range") {
        // Single click selects that date as both start and end
        // This makes the filter apply immediately with one tap
        if (val instanceof Date) {
          onSelect({ from: val, to: val });
        }
      } else if (mode === "single") {
        onSelect(val);
      } else {
        onSelect(val);
      }
    }
  };

  // Handle value for display - highlight selected date(s)
  let calendarValue = selected;
  if (mode === "range") {
    if (selected?.from) {
      // If same date, just show single date selected
      if (selected.to && selected.from.getTime() === selected.to.getTime()) {
        calendarValue = selected.from;
      } else {
        calendarValue = [selected.from, selected.to || selected.from];
      }
    } else {
      calendarValue = null;
    }
  }

  return (
    <div className={cn("p-3 bg-white rounded-lg shadow-sm border", className)}>
      <Calendar
        onChange={onChange}
        value={calendarValue}
        selectRange={false}
        className="react-calendar-custom"
        activeStartDate={props.month}
        onActiveStartDateChange={({ activeStartDate }) => {
          if (props.onMonthChange) props.onMonthChange(activeStartDate);
        }}
        {...props}
      />
    </div>
  );
}

CalendarComponent.displayName = "Calendar";

export { CalendarComponent as Calendar };
