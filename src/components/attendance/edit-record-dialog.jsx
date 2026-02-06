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
        correction_type: "Missing time-in",
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
                correction_type: "Missing time-in",
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
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-xl">Edit Attendance Record</DialogTitle>
                    <DialogDescription>
                        Professional correction tool for employee attendance.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Header: Status and Employee */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {record?.user?.name?.charAt(0) || "U"}
                            </div>
                            <div>
                                <p className="font-bold">{record?.user?.name || "Employee"}</p>
                                <p className="text-xs text-muted-foreground">{record?.attendance_date ? format(new Date(record.attendance_date), "MMMM d, yyyy") : ""}</p>
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
                                    <SelectItem value="Missing time-in">Missing time-in</SelectItem>
                                    <SelectItem value="Wrong time-out">Wrong time-out</SelectItem>
                                    <SelectItem value="Excused day">Mark as Excused</SelectItem>
                                    <SelectItem value="System error">System Error / Glitch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="px-8">
                            {loading ? "Saving..." : "Apply Correction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
