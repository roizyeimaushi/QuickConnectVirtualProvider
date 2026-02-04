"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DataManagementPage() {
    const { settings, loading, saving, updateSettings } = useSettings();
    const [retentionPolicy, setRetentionPolicy] = useState("1year");
    const [backingUp, setBackingUp] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [clearLogsDialogOpen, setClearLogsDialogOpen] = useState(false);
    const { toast } = useToast();
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);

    // Initialize retentionPolicy ONLY once when settings first load
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0 && settings.retention_policy && !isInitialized.current) {
            isInitialized.current = true;
            setRetentionPolicy(settings.retention_policy);
            setIsReady(true);
        }
    }, [settings]);

    const handleSavePolicy = () => {
        updateSettings({ retention_policy: retentionPolicy });
    };

    const handleBackup = async () => {
        try {
            setBackingUp(true);
            const blob = await settingsApi.backup();

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup-${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            toast({
                title: "Success",
                description: "Database backup started",
            });
        } catch (error) {
            console.error("Backup failed", error);
            toast({
                title: "Error",
                description: "Failed to generate backup",
                variant: "destructive",
            });
        } finally {
            setBackingUp(false);
        }
    };

    const executeClearData = async () => {
        try {
            setClearing(true);
            await settingsApi.clearData();
            toast({
                title: "Success",
                description: "Old records cleared successfully",
            });
        } catch (error) {
            console.error("Clear data failed", error);
            toast({
                title: "Error",
                description: "Failed to clear data",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
            setClearDialogOpen(false);
        }
    };

    const executeClearLogs = async () => {
        try {
            await settingsApi.clearLogs();
            toast({
                title: "Success",
                description: "Logs cleared successfully."
            });
        } catch (error) {
            console.error("Clear logs failed", error);
            toast({
                title: "Error",
                description: "Failed to clear logs.",
                variant: "destructive"
            });
        } finally {
            setClearLogsDialogOpen(false);
        }
    };

    if (loading || !isReady) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-0">
                <h3 className="text-lg font-medium">Data Management</h3>
                <p className="text-sm text-muted-foreground">
                    Configure backups and data retention policies.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Database & Backup</CardTitle>
                    <CardDescription>
                        Create backups and schedule maintenance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg bg-secondary/10">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Database className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-medium">Export Database</h4>
                                <p className="text-sm text-muted-foreground">Download a complete JSON backup of the system.</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleBackup} loading={backingUp} className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Backup Now
                        </Button>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label>Data Retention Policy</Label>
                        <div className="grid gap-4 md:grid-cols-2 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="retention" className="font-normal text-sm">Keep attendance records for:</Label>
                                <Select
                                    value={retentionPolicy}
                                    onValueChange={setRetentionPolicy}
                                >
                                    <SelectTrigger id="retention">
                                        <SelectValue placeholder="Select period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="6months">6 Months</SelectItem>
                                        <SelectItem value="1year">1 Year</SelectItem>
                                        <SelectItem value="3years">3 Years</SelectItem>
                                        <SelectItem value="forever">Forever</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSavePolicy} loading={saving}>
                                Save Policy
                            </Button>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Restore System</CardTitle>
                    <CardDescription>
                        Upload a backup file to restore system settings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Input type="file" accept=".json" onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                                const fd = new FormData();
                                fd.append('file', file);
                                await settingsApi.restore(fd);
                                toast({ title: "Success", description: "System restored successfully." });
                            } catch (err) {
                                console.error(err);
                                toast({ title: "Error", description: "Restore failed.", variant: "destructive" });
                            }
                        }} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive text-lg sm:text-xl">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border p-4 rounded-lg">
                        <div>
                            <h4 className="font-bold">Clear Audit Logs</h4>
                            <p className="text-sm text-muted-foreground">Permanently remove all activity logs.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setClearLogsDialogOpen(true)}>Clear Logs</Button>
                    </div>

                    <div className="flex justify-between items-center border p-4 rounded-lg">
                        <div>
                            <h4 className="font-bold">Reset System Data</h4>
                            <p className="text-sm text-muted-foreground">Permanently delete all attendance records.</p>
                        </div>
                        <Button variant="destructive" onClick={() => setClearDialogOpen(true)}>
                            Reset Data
                        </Button>
                    </div>
                </CardContent>
            </Card>


            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset System Data</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete all attendance records and reset system data?
                            <br /><br />
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeClearData}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Reset Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={clearLogsDialogOpen} onOpenChange={setClearLogsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Audit Logs</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete all system audit logs?
                            <br /><br />
                            This action cannot be undone and will remove the history of all user actions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeClearLogs}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Clear Logs
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
