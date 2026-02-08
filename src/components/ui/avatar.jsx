"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { getAvatarUrl } from "@/lib/constants"

function Avatar({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 rounded-full", className)}
      {...props} />
  );
}



function AvatarImage({
  className,
  src,
  ...props
}) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      src={getAvatarUrl(src)}
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props} />
  );
}

function AvatarFallback({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full overflow-hidden",
        className
      )}
      {...props} />
  );
}

function AvatarBadge({
  className,
  ...props
}) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-[2px] bottom-[2px] z-10 flex size-2.5 rounded-full border-2 border-background",
        className
      )}
      {...props} />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge }
