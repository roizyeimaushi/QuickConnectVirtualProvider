import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Pattern 1: Overview Card Skeleton
 * Used for: Dashboard stats, summary tiles
 * Structure: Icon placeholder + Label + Value
 */
export const StatsCardSkeleton = ({ count = 4 }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(count)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-none shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                    <Skeleton className="h-12 w-12 rounded-lg bg-slate-200/50" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-24' : 'w-20'} bg-slate-100/60`} />
                        <Skeleton className={`h-8 ${i % 2 === 0 ? 'w-16' : 'w-12'} bg-slate-200/60`} />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);

/**
 * Pattern 2: Data Table Skeleton
 * Used for: Employee list, Audit logs, Attendance history
 * Structure: Columnar row layout with index-based width variations
 */
export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* Header Shadow */}
        <div className="bg-muted/30 p-4 border-b">
            <div className={`grid grid-cols-${cols} gap-4`}>
                {[...Array(cols)].map((_, i) => (
                    <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? 'w-20' : 'w-16'} bg-slate-200/40`} />
                ))}
            </div>
        </div>
        {/* Body Rows */}
        <div className="divide-y divide-border">
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} className="p-4 bg-white dark:bg-card">
                    <div className={`grid grid-cols-${cols} gap-4 items-center`}>
                        {[...Array(cols)].map((_, colIndex) => {
                            // Column specific variations
                            if (colIndex === 0) { // Usually Name/Primary column
                                return (
                                    <div key={colIndex} className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full bg-slate-200/60 flex-shrink-0" />
                                        <Skeleton className={`h-4 ${rowIndex % 3 === 0 ? 'w-32' : rowIndex % 3 === 1 ? 'w-24' : 'w-28'} bg-slate-100/60`} />
                                    </div>
                                );
                            }
                            if (colIndex === cols - 1) { // Usually Actions
                                return (
                                    <div key={colIndex} className="flex justify-center">
                                        <Skeleton className="h-8 w-8 rounded-md bg-slate-100/40" />
                                    </div>
                                );
                            }
                            // Generic data columns
                            return (
                                <Skeleton
                                    key={colIndex}
                                    className={`h-4 ${(rowIndex + colIndex) % 4 === 0 ? 'w-full' :
                                            (rowIndex + colIndex) % 4 === 1 ? 'w-[80%]' :
                                                (rowIndex + colIndex) % 4 === 2 ? 'w-[90%]' : 'w-[70%]'
                                        } bg-slate-100/40 mx-auto`}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/**
 * Pattern 3: Mobile Card Skeleton
 * Used for: Responsive record lists
 * Structure: Stacked hierarchical info segments
 */
export const MobileCardSkeleton = ({ count = 3 }) => (
    <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
            <Card key={i} className="p-4 space-y-4 border-none shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full bg-slate-200/60" />
                        <div className="space-y-2">
                            <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-32' : 'w-28'} bg-slate-200/50`} />
                            <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-24' : 'w-20'} bg-slate-100/40`} />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full bg-slate-200/40" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Skeleton className="h-12 w-full rounded-lg bg-slate-100/30" />
                    <Skeleton className="h-12 w-full rounded-lg bg-slate-100/30" />
                </div>
                <Skeleton className={`h-10 w-full rounded-lg ${i % 2 === 0 ? 'opacity-100' : 'opacity-80'} bg-slate-100/50`} />
            </Card>
        ))}
    </div>
);

/**
 * Pattern 4: Profile & Detail Header Skeleton
 * Used for: Individual employee report, profile views
 * Structure: Large avatar + Name/Title + Actions
 */
export const DetailHeaderSkeleton = () => (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-8 border-b">
        <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-slate-200/60 shadow-inner" />
        <div className="flex-1 space-y-4 text-center md:text-left pt-2">
            <div className="space-y-2">
                <Skeleton className="h-10 w-64 md:w-80 bg-slate-200/70" />
                <Skeleton className="h-5 w-48 md:w-60 bg-slate-100/60" />
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Skeleton className="h-9 w-28 rounded-full bg-slate-100/40" />
                <Skeleton className="h-9 w-32 rounded-full bg-slate-100/40" />
                <Skeleton className="h-9 w-24 rounded-full bg-slate-100/40" />
            </div>
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-xl bg-slate-200/40" />
            <Skeleton className="h-10 w-32 rounded-xl bg-slate-200/60" />
        </div>
    </div>
);

/**
 * Pattern 5: Control Bar (Search & Filter) Skeleton
 * Used for: Top of list pages
 * Structure: Horizontal input group
 */
export const ControlBarSkeleton = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Skeleton className="h-10 flex-1 min-w-[200px] bg-slate-200/40" />
        <div className="flex gap-2">
            <Skeleton className="h-10 w-[140px] bg-slate-100/50" />
            <Skeleton className="h-10 w-[140px] bg-slate-100/50" />
            <Skeleton className="h-10 w-10 bg-slate-200/40" />
        </div>
    </div>
);
