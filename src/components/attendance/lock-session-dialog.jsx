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

    const [emergencyType, setEmergencyType] = useState("");

    const handleTypeChange = (val) => {
        const isException = val === 'Emergency' || val === 'Holiday';
        setFormData({
            ...formData,
            session_type: val,
            // If it's an emergency or holiday, we usually don't require attendance (excused)
            attendance_required: isException ? false : true
        });
        if (val !== 'Emergency') setEmergencyType("");
    };

    const handleEmergencySelect = (val) => {
        setEmergencyType(val);
        setFormData({ ...formData, completion_reason: val });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onConfirm(formData);
        } finally {
            setLoading(false);
        }
    };

    const emergencyScenarios = [
        "Severe Rainfall / Bagyo",
        "Flooding",
        "Typhoon / Hurricane",
        "Volcanic Eruption",
        "Earthquake",
        "Tsunami Warning",
        "Heavy Snow / Blizzard",
        "Severe Storm / Thunderstorm",
        "Strong Wind / Sandstorm",
        "Landslide / Mudslide"
    ];

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
                        {/* Session Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="session_type">Session Type</Label>
                            <Select
                                value={formData.session_type}
                                onValueChange={handleTypeChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal">Normal Day</SelectItem>
                                    <SelectItem value="Emergency">Emergency / Disaster</SelectItem>
                                    <SelectItem value="Holiday">Holiday</SelectItem>
                                    <SelectItem value="Maintenance">System Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Emergency Quick Selection */}
                        {formData.session_type === 'Emergency' && (
                            <div className="grid gap-2 animate-in slide-in-from-top-2">
                                <Label htmlFor="emergency_type">Emergency Category</Label>
                                <Select
                                    value={emergencyType}
                                    onValueChange={handleEmergencySelect}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select scenario..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {emergencyScenarios.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Attendance Required Toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                            <div className="space-y-0.5">
                                <Label htmlFor="attendance_required" className="text-base">
                                    Attendance Required
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {formData.attendance_required
                                        ? "Missing employees will be marked ABSENT."
                                        : "Missing employees will be EXCUSED."}
                                </p>
                            </div>
                            <Switch
                                id="attendance_required"
                                checked={formData.attendance_required}
                                onCheckedChange={(checked) => setFormData({ ...formData, attendance_required: checked })}
                            />
                        </div>



                        {/* Summary/Recommendation */}
                        {!formData.attendance_required && formData.session_type !== 'Normal' && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                                <p className="text-xs text-amber-800 dark:text-amber-400">
                                    <strong>Recommendation:</strong> Since attendance is NOT required, all pending employees will be automatically marked as <strong>Excused</strong> with the reason "{formData.completion_reason || 'Disaster/Holiday Suspension'}".
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 sm:py-2 order-1 sm:order-2"
                        >
                            {loading ? "Locking..." : "Finalize & Lock Session"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full sm:w-auto py-6 sm:py-2 order-2 sm:order-1"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
