"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { attendanceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function EditRecordDialog({ record, open, onOpenChange, onSuccess }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        status: record?.status || "pending",
        time_in: record?.time_in ? format(new Date(record.time_in), "yyyy-MM-dd'T'HH:mm") : "",
        time_out: record?.time_out ? format(new Date(record.time_out), "yyyy-MM-dd'T'HH:mm") : "",
        break_start: record?.break_start ? format(new Date(record.break_start), "yyyy-MM-dd'T'HH:mm") : "",
        break_end: record?.break_end ? format(new Date(record.break_end), "yyyy-MM-dd'T'HH:mm") : "",
        excuse_reason: record?.excuse_reason || "",
        correction_type: "Time In Correction",
        reason: "",
    });

    const [totals, setTotals] = useState({ hours: 0, overtime: 0, autoStatus: "pending" });

    // CRITICAL FIX: Reset form when record changes
    useEffect(() => {
        if (record) {
            setFormData({
                status: record.status || "pending",
                time_in: record.time_in ? format(new Date(record.time_in), "yyyy-MM-dd'T'HH:mm") : "",
                time_out: record.time_out ? format(new Date(record.time_out), "yyyy-MM-dd'T'HH:mm") : "",
                break_start: record.break_start ? format(new Date(record.break_start), "yyyy-MM-dd'T'HH:mm") : "",
                break_end: record.break_end ? format(new Date(record.break_end), "yyyy-MM-dd'T'HH:mm") : "",
                excuse_reason: record.excuse_reason || "",
                correction_type: "Time In Correction",
                reason: "",
            });
        }
    }, [record, open]);

    // Auto-calculate totals and status
    useEffect(() => {
        if (!formData.time_in) {
            setTotals({ hours: 0, overtime: 0, autoStatus: formData.status === 'excused' ? 'excused' : 'absent' });
            return;
        }

        const tIn = new Date(formData.time_in);
        const tOut = formData.time_out ? new Date(formData.time_out) : null;
        const bStart = formData.break_start ? new Date(formData.break_start) : null;
        const bEnd = formData.break_end ? new Date(formData.break_end) : null;

        let diffMs = tOut ? (tOut - tIn) : 0;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Overnight

        let breakMs = (bStart && bEnd) ? (bEnd - bStart) : 0;
        if (breakMs < 0) breakMs += 24 * 60 * 60 * 1000;

        const totalMinutes = Math.max(0, (diffMs - breakMs) / (1000 * 60));
        const hours = (totalMinutes / 60).toFixed(2);

        // Simple OT calc (anything > 8h for example - can be adjusted)
        const overtime = Math.max(0, parseFloat(hours) - 8).toFixed(2);

        // Determine status
        let autoStatus = "present";
        if (record?.session?.schedule?.time_in) {
            const [h, m] = record.session.schedule.time_in.split(':').map(Number);
            const refTime = new Date(tIn);
            refTime.setHours(h, m, 0);
            if (tIn > refTime) autoStatus = "late";
        }
        if (formData.status === 'excused') autoStatus = 'excused';

        setTotals({ hours, overtime, autoStatus });

        // Auto-update internal status if not locked to excused
        if (formData.status !== 'excused' && formData.status !== 'absent') {
            setFormData(prev => ({ ...prev, status: autoStatus }));
        }
    }, [formData.time_in, formData.time_out, formData.break_start, formData.break_end, formData.status, record]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const payload = {
                ...formData,
                time_in: formData.time_in || null,
                time_out: formData.time_out || null,
                break_start: formData.break_start || null,
                break_end: formData.break_end || null,
            };

            const isVirtual = typeof record.id === 'string' && record.id.startsWith('virtual_');

            if (isVirtual) {
                payload.user_id = record.user_id;
                payload.session_id = record.session_id;
                payload.attendance_date = record.attendance_date;
                await attendanceApi.create(payload);
            } else {
                await attendanceApi.update(record.id, payload);
            }

            toast({
                title: "Success",
                description: "Attendance record updated successfully",
                variant: "success",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Update failed:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save record",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 text-left">
                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">Edit Attendance Record</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Professional correction tool for employee attendance.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Header: Status and Employee */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 shadow-sm">
                                <AvatarImage src={record?.user?.avatar} alt={record?.user?.first_name || "Employee"} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                    {record?.user?.first_name ? record.user.first_name.charAt(0) : (record?.user?.name?.charAt(0) || "U")}
                                    {record?.user?.last_name ? record.user.last_name.charAt(0) : ""}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <p className="font-bold text-base sm:text-lg leading-tight truncate">
                                    {record?.user?.first_name ? `${record.user.first_name} ${record.user.last_name}` : (record?.user?.name || "Unknown User")}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold flex flex-wrap gap-1 items-center">
                                    <span className="bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                                        ID: {record?.user?.employee_id || "N/A"}
                                    </span>
                                    <span className="hidden sm:inline-block opacity-40">•</span>
                                    <span className="opacity-80">
                                        {record?.attendance_date ? format(new Date(record.attendance_date), "MMM d, yyyy") : ""}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Status</p>
                            <Badge variant="outline" className={`capitalize ${totals.autoStatus === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                totals.autoStatus === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    totals.autoStatus === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                {totals.autoStatus}
                            </Badge>
                        </div>
                    </div>

                    {/* Time Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="time_in" className="text-xs font-bold uppercase text-muted-foreground">Time In</Label>
                            <DateTimePicker
                                value={formData.time_in}
                                onChange={(val) => setFormData({ ...formData, time_in: val })}
                                placeholder="Pick time in"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time_out" className="text-xs font-bold uppercase text-muted-foreground">Time Out</Label>
                            <DateTimePicker
                                value={formData.time_out}
                                onChange={(val) => setFormData({ ...formData, time_out: val })}
                                placeholder="Pick time out"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="break_start" className="text-xs font-bold uppercase text-muted-foreground">Break Start</Label>
                            <DateTimePicker
                                value={formData.break_start}
                                onChange={(val) => setFormData({ ...formData, break_start: val })}
                                placeholder="Pick break start"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="break_end" className="text-xs font-bold uppercase text-muted-foreground">Break End</Label>
                            <DateTimePicker
                                value={formData.break_end}
                                onChange={(val) => setFormData({ ...formData, break_end: val })}
                                placeholder="Pick break end"
                            />
                        </div>
                    </div>

                    {/* Calculated Totals */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div>
                            <p className="text-[10px] font-bold text-primary uppercase">Total Worked</p>
                            <p className="text-2xl font-mono font-bold text-primary">{totals.hours}h</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-primary uppercase">Overtime (Est.)</p>
                            <p className="text-2xl font-mono font-bold text-primary">{totals.overtime}h</p>
                        </div>
                    </div>

                    {/* Correction Details */}
                    <div className="space-y-4 pt-2 border-t">
                        <div className="grid gap-2">
                            <Label htmlFor="correction_type">Correction Type</Label>
                            <Select
                                id="correction_type"
                                value={formData.correction_type}
                                onValueChange={(val) => {
                                    setFormData({
                                        ...formData,
                                        correction_type: val,
                                        status: val === 'Excused day' ? 'excused' : formData.status
                                    })
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Time In Correction">Time In Correction</SelectItem>
                                    <SelectItem value="Time Out Correction">Time Out Correction</SelectItem>
                                    <SelectItem value="Break Correction">Break Correction</SelectItem>
                                    <SelectItem value="Status Correction">Status Correction</SelectItem>
                                    <SelectItem value="Missed Check-in">Missed Check-in</SelectItem>
                                    <SelectItem value="Missed Check-out">Missed Check-out</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason" className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                                Reason for Correction
                                <span className="text-[10px] lowercase font-normal text-red-500">Required (min 5 chars)</span>
                            </Label>
                            <Textarea
                                id="reason"
                                placeholder="Please explain why this correction is being made..."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="resize-none h-20"
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4 gap-3 sm:gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 sm:h-10 order-2 sm:order-1 flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="px-8 h-11 sm:h-10 order-1 sm:order-2 flex-1 sm:flex-none">
                            {loading ? "Saving..." : "Apply Correction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
