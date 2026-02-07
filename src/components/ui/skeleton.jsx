import { cn } from "@/lib/utils"

function Skeleton({
    className,
    variant = "shimmer",
    ...props
}) {
    return (
        <div
            className={cn(
                "rounded-md overflow-hidden",
                variant === "shimmer" && "animate-shimmer",
                variant === "pulse" && "animate-pulse bg-muted",
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
export default Skeleton
