"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { reportsApi } from "@/lib/api";
import {
    Download,
    FileSpreadsheet,
    Calendar as CalendarIcon,
    CheckCircle2,
    Loader2,
    Info,
    ChevronDown,
} from "lucide-react";

export default function ExportReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [options, setOptions] = useState({
        includePresent: true,
        includeLate: true,
        includeAbsent: true,
        includeTimes: true,
        includeBreaks: true,
    });

    const handleExport = async (customStart = null, customEnd = null) => {
        setLoading(true);

        try {
            const start = customStart || startDate;
            const end = customEnd || endDate;

            const formattedStart = format(start, "yyyy-MM-dd");
            const formattedEnd = format(end, "yyyy-MM-dd");

            const blob = await reportsApi.exportToExcel({
                start_date: formattedStart,
                end_date: formattedEnd,
                ...options
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_report_${formattedStart}_to_${formattedEnd}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast({
                title: "Export successful",
                description: `Report exported for ${format(start, "MMM d")} - ${format(end, "MMM d")}`,
                variant: "success",
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Export failed",
                description: "Failed to generate export file. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQuickExport = (type) => {
        const now = new Date();
        let start, end;

        switch (type) {
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            case 'all_time':
                start = new Date(2020, 0, 1); // Earliest possible
                end = now;
                break;
            default:
                return;
        }
        handleExport(start, end);
    };

    return (
        <DashboardLayout title="Export to Excel">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Export to Excel</h1>
                    <p className="text-muted-foreground">
                        Generate and download attendance reports in Excel format
                    </p>
                </div>

                {/* Export Options Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Export Settings
                        </CardTitle>
                        <CardDescription>
                            Configure your export options
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Date Range */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 px-3 justify-between font-normal">
                                            <div className="flex items-center">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {format(startDate, "PPP")}
                                            </div>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" side="bottom" sideOffset={4} avoidCollisions={false}>
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={(d) => d && setStartDate(d)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 px-3 justify-between font-normal">
                                            <div className="flex items-center">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {format(endDate, "PPP")}
                                            </div>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" side="bottom" sideOffset={4} avoidCollisions={false}>
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={(d) => d && setEndDate(d)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Include Options */}
                        <div className="space-y-4">
                            <Label>Include in Export</Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="present"
                                        checked={options.includePresent}
                                        onCheckedChange={(checked) =>
                                            setOptions((prev) => ({ ...prev, includePresent: checked }))
                                        }
                                    />
                                    <label htmlFor="present" className="text-sm font-medium cursor-pointer">
                                        Present Records
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="late"
                                        checked={options.includeLate}
                                        onCheckedChange={(checked) =>
                                            setOptions((prev) => ({ ...prev, includeLate: checked }))
                                        }
                                    />
                                    <label htmlFor="late" className="text-sm font-medium cursor-pointer">
                                        Late Records
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="absent"
                                        checked={options.includeAbsent}
                                        onCheckedChange={(checked) =>
                                            setOptions((prev) => ({ ...prev, includeAbsent: checked }))
                                        }
                                    />
                                    <label htmlFor="absent" className="text-sm font-medium cursor-pointer">
                                        Absent Records
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="times"
                                        checked={options.includeTimes}
                                        onCheckedChange={(checked) =>
                                            setOptions((prev) => ({ ...prev, includeTimes: checked }))
                                        }
                                    />
                                    <label htmlFor="times" className="text-sm font-medium cursor-pointer">
                                        Time In/Out
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="breaks"
                                        checked={options.includeBreaks}
                                        onCheckedChange={(checked) =>
                                            setOptions((prev) => ({ ...prev, includeBreaks: checked }))
                                        }
                                    />
                                    <label htmlFor="breaks" className="text-sm font-medium cursor-pointer">
                                        Break Times
                                    </label>
                                </div>
                            </div>
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                The exported file will include Employee ID, Name, Date, Schedule, and all selected data columns.
                            </AlertDescription>
                        </Alert>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => handleExport()}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export to Excel
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Quick Export Options */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Export</CardTitle>
                        <CardDescription>
                            Common export presets for faster access
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleQuickExport('this_month')}>
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div className="text-left">
                                        <div className="font-medium">This Month</div>
                                        <div className="text-xs text-muted-foreground">
                                            Export current month's data
                                        </div>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleQuickExport('last_month')}>
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="text-left">
                                        <div className="font-medium">Last Month</div>
                                        <div className="text-xs text-muted-foreground">
                                            Export previous month's data
                                        </div>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleQuickExport('this_year')}>
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-purple-600 mt-0.5" />
                                    <div className="text-left">
                                        <div className="font-medium">This Year</div>
                                        <div className="text-xs text-muted-foreground">
                                            Export current year's data
                                        </div>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleQuickExport('all_time')}>
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-orange-600 mt-0.5" />
                                    <div className="text-left">
                                        <div className="font-medium">All Time</div>
                                        <div className="text-xs text-muted-foreground">
                                            Export complete history
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
