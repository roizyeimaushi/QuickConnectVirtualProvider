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
        status: record?.status || "present",
        time_in: record?.time_in ? format(new Date(record.time_in), "yyyy-MM-dd'T'HH:mm") : "",
        time_out: record?.time_out ? format(new Date(record.time_out), "yyyy-MM-dd'T'HH:mm") : "",
        break_start: record?.break_start ? format(new Date(record.break_start), "yyyy-MM-dd'T'HH:mm") : "",
        break_end: record?.break_end ? format(new Date(record.break_end), "yyyy-MM-dd'T'HH:mm") : "",
        reason: "",
    });

    // CRITICAL FIX: Reset form when record changes
    useEffect(() => {
        if (record) {
            setFormData({
                status: record.status || "present",
                time_in: record.time_in ? format(new Date(record.time_in), "yyyy-MM-dd'T'HH:mm") : "",
                time_out: record.time_out ? format(new Date(record.time_out), "yyyy-MM-dd'T'HH:mm") : "",
                break_start: record.break_start ? format(new Date(record.break_start), "yyyy-MM-dd'T'HH:mm") : "",
                break_end: record.break_end ? format(new Date(record.break_end), "yyyy-MM-dd'T'HH:mm") : "",
                reason: "",
            });
        }
    }, [record, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.reason || formData.reason.length < 5) {
            toast({
                title: "Validation Error",
                description: "A reason is required (min 5 chars) for audit logging.",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...formData,
                // Ensure empty strings are null
                time_in: formData.time_in || null,
                time_out: formData.time_out || null,
                break_start: formData.break_start || null,
                break_end: formData.break_end || null,
            };

            // Check if this is a "Virtual" record (placeholder for missing attendance)
            // Virtual IDs format: "virtual_{USER_ID}"
            const isVirtual = typeof record.id === 'string' && record.id.startsWith('virtual_');

            if (isVirtual) {
                // For virtual records, we must CREATE a new record
                payload.user_id = record.user_id; // Extracted from session.records mapping
                payload.session_id = record.session_id;
                payload.attendance_date = record.attendance_date;

                await attendanceApi.create(payload);
            } else {
                // Normal update
                await attendanceApi.update(record.id, payload);
            }

            toast({
                title: "Success",
                description: `Attendance record ${isVirtual ? 'created' : 'updated'} successfully`,
                variant: "success",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Update failed:", error);

            // Handle duplicate error specifically
            if (error.error_code === 'DUPLICATE_RECORD') {
                toast({
                    title: "Duplicate Record",
                    description: "A record already exists for this user. Please refresh.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to save record",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full">
                <DialogHeader>
                    <DialogTitle>Edit Attendance Record</DialogTitle>
                    <DialogDescription>
                        Modify attendance details. All changes are logged.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 py-2">
                    {/* ... form fields ... */}
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(val) => setFormData({ ...formData, status: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="excused">Excused</SelectItem>
                                <SelectItem value="left_early">Left Early</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="time_in">Time In</Label>
                            <DateTimePicker
                                value={formData.time_in}
                                onChange={(val) => setFormData({ ...formData, time_in: val })}
                                placeholder="Pick time in"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time_out">Time Out</Label>
                            <DateTimePicker
                                value={formData.time_out}
                                onChange={(val) => setFormData({ ...formData, time_out: val })}
                                placeholder="Pick time out"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="break_start">Break Start</Label>
                            <DateTimePicker
                                value={formData.break_start}
                                onChange={(val) => setFormData({ ...formData, break_start: val })}
                                placeholder="Pick break start"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="break_end">Break End</Label>
                            <DateTimePicker
                                value={formData.break_end}
                                onChange={(val) => setFormData({ ...formData, break_end: val })}
                                placeholder="Pick break end"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason for Correction <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why you are modifying this record..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            required
                        />
                    </div>

                    <DialogFooter className="sm:justify-center gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
