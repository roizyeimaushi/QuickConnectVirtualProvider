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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { breakApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DateTimePicker } from "@/components/ui/datetime-picker";

export function EditBreakDialog({ record, open, onOpenChange, onSuccess }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        break_type: "Coffee",
        break_start: "",
        break_end: "",
    });

    useEffect(() => {
        if (record) {
            // Clean type label "Coffee Break" -> "Coffee"
            let type = record.type || record.break_type;
            if (type && type.includes(" ")) type = type.split(" ")[0];

            setFormData({
                break_type: type || "Coffee",
                break_start: record.break_start ? format(new Date(record.break_start), "yyyy-MM-dd'T'HH:mm") : "",
                break_end: record.break_end ? format(new Date(record.break_end), "yyyy-MM-dd'T'HH:mm") : "",
            });
        }
    }, [record]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const payload = {
                break_type: formData.break_type,
                break_start: formData.break_start,
                break_end: formData.break_end || null,
            };

            await breakApi.update(record.id, payload);

            toast({
                title: "Success",
                description: "Break record updated successfully",
                variant: "success",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Update failed:", error);
            toast({
                title: "Error",
                description: "Failed to update break record",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Break Record</DialogTitle>
                    <DialogDescription>
                        Modify break details. Duration will be recalculated automatically.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="break_type">Break Type</Label>
                        <Select
                            value={formData.break_type}
                            onValueChange={(val) => setFormData({ ...formData, break_type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Coffee">Coffee Break</SelectItem>
                                <SelectItem value="Meal">Meal Break</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="break_start">Start Time</Label>
                        <DateTimePicker
                            value={formData.break_start}
                            onChange={(val) => setFormData({ ...formData, break_start: val })}
                            placeholder="Pick start time"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="break_end">End Time</Label>
                        <DateTimePicker
                            value={formData.break_end}
                            onChange={(val) => setFormData({ ...formData, break_end: val })}
                            placeholder="Pick end time (optional)"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
