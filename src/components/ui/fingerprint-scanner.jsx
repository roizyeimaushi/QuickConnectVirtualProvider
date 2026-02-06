import { Fingerprint, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FingerprintScanner({
    isScanning = false,
    isSuccess = false,
    onScan,
    disabled = false,
    color = "emerald", // "emerald" for Time In, "purple" for Time Out
    label = "Tap to Scan"
}) {
    const isEmerald = color === "emerald";

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative group p-4 border-2 border-transparent hover:border-white/5 rounded-2xl transition-all duration-500">
                {/* Corner Lines (Animated Frame) */}
                <div className={cn(
                    "scanner-corner top-0 left-0 border-t-4 border-l-4 transition-all duration-500",
                    isEmerald ? "border-emerald-500" : "border-purple-500",
                    isScanning && "scale-110",
                    isSuccess && "opacity-0 scale-90"
                )} />
                <div className={cn(
                    "scanner-corner top-0 right-0 border-t-4 border-r-4 transition-all duration-500",
                    isEmerald ? "border-emerald-500" : "border-purple-500",
                    isScanning && "scale-110",
                    isSuccess && "opacity-0 scale-90"
                )} />
                <div className={cn(
                    "scanner-corner bottom-0 left-0 border-b-4 border-l-4 transition-all duration-500",
                    isEmerald ? "border-emerald-500" : "border-purple-500",
                    isScanning && "scale-110",
                    isSuccess && "opacity-0 scale-90"
                )} />
                <div className={cn(
                    "scanner-corner bottom-0 right-0 border-b-4 border-r-4 transition-all duration-500",
                    isEmerald ? "border-emerald-500" : "border-purple-500",
                    isScanning && "scale-110",
                    isSuccess && "opacity-0 scale-90"
                )} />

                {/* Main Scanner Body */}
                <button
                    onClick={onScan}
                    disabled={disabled || isScanning || isSuccess}
                    className={cn(
                        "relative w-44 h-44 flex flex-col items-center justify-center rounded-2xl overflow-hidden transition-all duration-500",
                        "bg-[#0a0f0d] border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                        isEmerald
                            ? "border-emerald-500/30 group-hover:border-emerald-500/60"
                            : "border-purple-500/30 group-hover:border-purple-500/60",
                        isScanning && (isEmerald ? "animate-scanner-pulse border-emerald-500" : "animate-scanner-pulse-purple border-purple-500"),
                        isSuccess && (isEmerald ? "border-emerald-500 bg-emerald-500/10" : "border-purple-500 bg-purple-500/10"),
                        (disabled && !isScanning && !isSuccess) ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer group-hover:scale-[1.02] active:scale-[0.95]"
                    )}
                >
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />

                    {/* Scanning Animation Components */}
                    {isScanning && !isSuccess && (
                        <>
                            {/* Moving Scan Line */}
                            <div className={cn(
                                "absolute left-0 right-0 h-1.5 z-20 shadow-[0_0_20px_rgba(34,197,94,1)] animate-scan-line",
                                isEmerald ? "bg-emerald-400" : "bg-purple-400 shadow-[0_0_20px_rgba(124,58,237,1)]"
                            )} />

                            {/* Scanning Progress Surface */}
                            <div className={cn(
                                "absolute inset-0 opacity-20 animate-pulse",
                                isEmerald ? "bg-emerald-500" : "bg-purple-500"
                            )} />
                        </>
                    )}

                    {/* Content: Fingerprint or Success Icon */}
                    <div className="relative z-10 flex items-center justify-center transition-all duration-500">
                        {isSuccess ? (
                            <div className="animate-in zoom-in duration-500">
                                <CheckCircle2 className={cn(
                                    "w-24 h-24 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]",
                                    isEmerald ? "text-emerald-500" : "text-purple-500 drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]"
                                )} />
                            </div>
                        ) : (
                            <Fingerprint className={cn(
                                "w-24 h-24 transition-all duration-500",
                                isEmerald ? "text-emerald-500" : "text-purple-500",
                                isScanning ? "opacity-100 scale-110" : "opacity-70 group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]",
                                isEmerald === false && "group-hover:drop-shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                            )} />
                        )}
                    </div>

                    {/* Scanning Text Overlay */}
                    {isScanning && (
                        <div className="absolute bottom-4 left-0 right-0 text-center animate-pulse">
                            <span className={cn(
                                "text-[10px] uppercase tracking-[0.2em] font-bold",
                                isEmerald ? "text-emerald-400" : "text-purple-400"
                            )}>
                                Scanning...
                            </span>
                        </div>
                    )}
                </button>
            </div>

            {/* Status Text Label */}
            <div className="text-center space-y-2">
                <p className={cn(
                    "text-xl font-bold tracking-tight transition-colors duration-500",
                    isSuccess
                        ? (isEmerald ? "text-emerald-600" : "text-purple-600")
                        : "text-foreground"
                )}>
                    {isScanning ? "Processing Biometrics..." : isSuccess ? "Identity Verified" : label}
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                    {isSuccess
                        ? "Authentication complete. Recording session details..."
                        : "Place your finger on the sensor and hold to record your status."}
                </p>
            </div>
        </div>
    );
}
