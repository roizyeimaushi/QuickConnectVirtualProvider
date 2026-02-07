import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function PageSkeleton({ cardCount = 4, hasHeader = true }) {
    return (
        <div className="space-y-6 animate-pulse p-1">
            {/* Header Skeleton */}
            {hasHeader && (
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-16 w-16 rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 bg-slate-200/60 dark:bg-slate-800/60 rounded" />
                        <Skeleton className="h-4 w-32 bg-slate-100/60 dark:bg-slate-900/60 rounded" />
                    </div>
                </div>
            )}

            {/* Stats Cards Skeleton */}
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cardCount}`}>
                {[...Array(cardCount)].map((_, i) => (
                    <Card key={i} className="border-muted/40 shadow-none">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-24 bg-slate-100/40 dark:bg-slate-900/40 rounded" />
                                <Skeleton className="h-8 w-16 bg-slate-200/40 dark:bg-slate-800/40 rounded" />
                                <Skeleton className="h-3 w-32 bg-slate-100/30 dark:bg-slate-900/30 rounded" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Large Content Block Skeleton */}
            <Card className="border-muted/40 shadow-none">
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-1/4 bg-slate-100/40 dark:bg-slate-900/40 rounded mb-6" />
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between py-4 border-b border-muted/20 last:border-0">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full bg-slate-100/30 dark:bg-slate-900/30" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 bg-slate-100/40 dark:bg-slate-900/40" />
                                        <Skeleton className="h-3 w-20 bg-slate-100/30 dark:bg-slate-900/30" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-20 bg-slate-100/40 dark:bg-slate-900/40 rounded-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
