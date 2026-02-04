"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/constants";
import { Plus, Trash2, Save, ArrowLeft, Briefcase, GripVertical } from "lucide-react";

export default function PositionsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [positions, setPositions] = useState([]);
    const [newPosition, setNewPosition] = useState("");

    // Fetch current positions from settings
    useEffect(() => {
        const fetchPositions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/settings`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const settings = await response.json();
                    if (settings.positions) {
                        try {
                            const parsed = JSON.parse(settings.positions);
                            setPositions(Array.isArray(parsed) ? parsed : []);
                        } catch {
                            setPositions(settings.positions.split(",").map(p => p.trim()).filter(Boolean));
                        }
                    } else {
                        setPositions([
                            "Sales Agent",
                            "Team Lead",
                            "Web Developer",
                            "Quality Assurance",
                            "IT Support"
                        ]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch positions:", error);
                toast({
                    title: "Error",
                    description: "Failed to load positions",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPositions();
    }, [toast]);

    const handleAddPosition = () => {
        const trimmed = newPosition.trim();
        if (!trimmed) {
            toast({
                title: "Error",
                description: "Position name cannot be empty",
                variant: "destructive",
            });
            return;
        }

        if (positions.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
            toast({
                title: "Error",
                description: "This position already exists",
                variant: "destructive",
            });
            return;
        }

        setPositions([...positions, trimmed]);
        setNewPosition("");
        toast({
            title: "Added",
            description: `"${trimmed}" added. Don't forget to save!`,
        });
    };

    const handleRemovePosition = (index) => {
        const removed = positions[index];
        setPositions(positions.filter((_, i) => i !== index));
        toast({
            title: "Removed",
            description: `"${removed}" removed. Don't forget to save!`,
        });
    };

    const handleSave = async () => {
        if (positions.length === 0) {
            toast({
                title: "Error",
                description: "You must have at least one position",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    positions: JSON.stringify(positions),
                }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Positions saved successfully",
                });
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error("Failed to save positions:", error);
            toast({
                title: "Error",
                description: "Failed to save positions",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DashboardLayout title="Manage Positions">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/employees")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Briefcase className="h-6 w-6 text-primary" />
                                Manage Positions
                            </h1>
                            <p className="text-muted-foreground">
                                Add, edit, or remove employee positions
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>

                {/* Add New Position Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Add New Position</CardTitle>
                        <CardDescription>
                            Create a new position that can be assigned to employees
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="newPosition" className="sr-only">
                                    Position Name
                                </Label>
                                <Input
                                    id="newPosition"
                                    placeholder="Enter position name (e.g., Senior Developer)"
                                    value={newPosition}
                                    onChange={(e) => setNewPosition(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddPosition();
                                        }
                                    }}
                                />
                            </div>
                            <Button onClick={handleAddPosition}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Position
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Existing Positions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Current Positions ({positions.length})</CardTitle>
                        <CardDescription>
                            These positions are available when creating or editing employees
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Loading positions...
                            </div>
                        ) : positions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No positions defined yet.</p>
                                <p className="text-sm">Add your first position above.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {positions.map((position, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                            <span className="font-medium">{position}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemovePosition(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info Note */}
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border">
                    <p>
                        <strong>Note:</strong> Removing a position will not affect employees who already have that position assigned.
                        You can still update their position to a new one when editing their profile.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
