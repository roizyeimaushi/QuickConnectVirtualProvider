"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Lock } from "lucide-react";

export function LockSessionDialog({ session, open, onOpenChange, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        attendance_required: true,
        session_type: "Normal",
        completion_reason: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onConfirm(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-amber-500" />
                            Lock Attendance Session
                        </DialogTitle>
                        <DialogDescription>
                            Finalize attendance for this session. This will freeze all records and apply the selected context.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Attendance Required Toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="attendance_required" className="text-base">
                                    Attendance Required
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Should missing employees be penalized?
                                </p>
                            </div>
                            <Switch
                                id="attendance_required"
                                checked={formData.attendance_required}
                                onCheckedChange={(checked) => setFormData({ ...formData, attendance_required: checked })}
                            />
                        </div>

                        {/* Session Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="session_type">Session Type</Label>
                            <Select
                                value={formData.session_type}
                                onValueChange={(val) => setFormData({ ...formData, session_type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal">Normal Day</SelectItem>
                                    <SelectItem value="Emergency">Emergency (Bagyo/Rainfall)</SelectItem>
                                    <SelectItem value="Holiday">Holiday</SelectItem>
                                    <SelectItem value="Maintenance">System Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reason / Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="completion_reason">
                                {formData.session_type === 'Normal' ? 'Completion Notes' : 'Reason for Exception'}
                            </Label>
                            <Input
                                id="completion_reason"
                                placeholder={formData.session_type === 'Emergency' ? 'e.g. Severe Rainfall - Signal No. 2' : 'Optional notes...'}
                                value={formData.completion_reason}
                                onChange={(e) => setFormData({ ...formData, completion_reason: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                            {loading ? "Locking..." : "Finalize & Lock Session"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
