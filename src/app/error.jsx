"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }) {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            console.error("App error boundary:", error);
        }
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Something went wrong</CardTitle>
                    </div>
                    <CardDescription>
                        An unexpected error occurred. You can try again or return to the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {process.env.NODE_ENV === "development" && error?.message && (
                        <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded break-all">
                            {error.message}
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button onClick={reset} variant="default">
                        Try again
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/dashboard">Go to dashboard</a>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
